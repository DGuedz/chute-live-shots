from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time
import httpx
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional, Any, Union
from uuid import uuid4
from dotenv import load_dotenv

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from . import quiz_engine, snapshot_builder
from .quiz_engine import build_quiz_from_snapshot, score_answers, build_predictive_quiz
from .storage import (
    first_answer_time,
    get_fixture,
    get_predictive_quiz_session,
    get_quiz_session,
    get_state,
    set_state,
    get_snapshot,
    init_db,
    latest_snapshot,
    lock_predictive_quiz_session,
    list_fixtures,
    list_participants,
    load_answers,
    lock_quiz_session,
    pop_challenge,
    request_exists,
    save_answer,
    save_challenge,
    save_snapshot,
    save_wallet,
    upsert_fixture,
)

app = FastAPI(title="CHUTE API", version="0.1.0")
_default_cors = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
_local_cors_regex = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$"
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in os.getenv("CHUTE_CORS_ORIGINS", _default_cors).split(",") if o.strip()], allow_origin_regex=os.getenv("CHUTE_CORS_ORIGIN_REGEX", _local_cors_regex), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
DRY_RUN = os.getenv("CHUTE_DRY_RUN", "true").lower() == "true"
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TXLINE_WORKER_URL = os.getenv("TXLINE_WORKER_URL", "http://127.0.0.1:8100")
seen_requests: set[str] = set()
init_db()
# Seed the reproducible replay envelope into SQLite so the whole quiz pipeline reads from
# the database (fixtures -> match_snapshots -> quiz), never from a static-file special case.
snapshot_builder.seed_replay_snapshot()


def validate_telegram_init_data(init_data: str, bot_token: str, max_age: int = 86400) -> dict[str, str]:
    """Validate Telegram WebApp initData using the official HMAC scheme."""
    from urllib.parse import parse_qsl

    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not configured")
    fields = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = fields.pop("hash", None)
    if not received_hash:
        raise ValueError("Telegram hash is missing")
    check = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        raise ValueError("Telegram signature is invalid")
    auth_date = int(fields.get("auth_date", "0"))
    if time.time() - auth_date > max_age:
        raise ValueError("Telegram initData is stale")
    return fields


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "chute-api", "dry_run": DRY_RUN}


def _resolve_rpc_url(network: str) -> str:
    """Resolve the Helius RPC URL for a network without ever handing the key to the browser.
    Mainnet and devnet each get their own env slot; a Helius key works on both hosts."""
    host = "mainnet" if network == "mainnet" else "devnet"
    env_key = "SOLANA_MAINNET_RPC_URL" if network == "mainnet" else "SOLANA_RPC_URL"
    configured = os.getenv(env_key, "")
    helius_key = os.getenv("HELIUS_API_KEY", "")
    if helius_key and (not configured or "PASTE_" in configured):
        return f"https://{host}.helius-rpc.com/?api-key={helius_key}"
    if f"{host}.helius-rpc.com" in configured and "PASTE_" not in configured:
        return configured
    return ""


@app.get("/api/solana/status")
def solana_status(network: Literal["devnet", "mainnet"] = "devnet") -> dict:
    """Public, non-secret network metadata for the wallet UI."""
    configured = bool(_resolve_rpc_url(network))
    return {
        "network": network,
        "rpc_status": "configured" if configured else "missing",
        "program_id": "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J" if network == "devnet" else os.getenv("TXLINE_MAINNET_PROGRAM_ID", ""),
        "dry_run": DRY_RUN,
        "settlement_status": "approval_required",
    }


_SOLANA_RPC_METHODS = {
    "getAccountInfo",
    "getBalance",
    "getBlockHeight",
    "getHealth",
    "getLatestBlockhash",
    "getSignatureStatuses",
    "sendTransaction",
    "simulateTransaction",
}


@app.post("/api/solana/rpc")
def solana_rpc_proxy(payload: dict[str, Any], network: Literal["devnet", "mainnet"] = "devnet") -> dict:
    """Narrow JSON-RPC proxy so the private Helius key never reaches the browser.
    `network` is a query param (?network=mainnet), never trusted from the JSON-RPC body."""
    method = payload.get("method")
    if method not in _SOLANA_RPC_METHODS:
        raise HTTPException(403, {"error": "RPC_METHOD_BLOCKED", "method": method})
    rpc_url = _resolve_rpc_url(network)
    if not rpc_url:
        raise HTTPException(503, {"error": f"HELIUS_{network.upper()}_RPC_MISSING"})
    try:
        response = httpx.post(rpc_url, json=payload, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        raise HTTPException(502, {"error": "HELIUS_RPC_FAILED", "detail": str(exc)}) from exc


@app.post("/api/txline/guest")
def txline_guest_session() -> dict:
    """Create a TxLINE guest session without exposing its token to the browser."""
    origin = os.getenv("TXLINE_API_ORIGIN", "https://txline-dev.txodds.com")
    try:
        response = httpx.post(f"{origin}/auth/guest/start", timeout=10)
        response.raise_for_status()
        token = response.json().get("token")
        if not token:
            raise RuntimeError("TXLINE_GUEST_TOKEN_MISSING")
        network = "mainnet" if origin == "https://txline.txodds.com" else "devnet"
        return {"ok": True, "network": network, "expires_in_days": 30}
    except Exception as exc:
        raise HTTPException(502, {"error": "TXLINE_GUEST_SESSION_FAILED", "detail": str(exc)}) from exc


class TxlineSubscriptionIn(BaseModel):
    tx_sig: str = Field(min_length=64, max_length=120)
    public_key: str = Field(min_length=32, max_length=64)


@app.post("/api/txline/subscription")
def txline_save_subscription(body: TxlineSubscriptionIn) -> dict:
    """Persist the confirmed on-chain subscribe signature for the activation flow."""
    set_state("txline_subscribe_sig", body.tx_sig)
    set_state("txline_subscribe_wallet", body.public_key)
    return {"ok": True}


@app.get("/api/txline/subscription")
def txline_get_subscription() -> dict:
    return {
        "tx_sig": get_state("txline_subscribe_sig"),
        "public_key": get_state("txline_subscribe_wallet"),
        "api_token_active": bool(get_state("txline_api_token")),
    }


@app.post("/api/txline/activate/start")
def txline_activate_start() -> dict:
    """Start activation: guest JWT + the exact message the wallet must sign.

    Message format (canonical TxLINE contract): "{txSig}:{leagues}:{jwt}" where
    leagues renders as a JS array join (empty list -> empty string)."""
    tx_sig = get_state("txline_subscribe_sig")
    if not tx_sig:
        raise HTTPException(409, {"error": "TXLINE_SUBSCRIBE_SIG_MISSING"})
    origin = os.getenv("TXLINE_API_ORIGIN", "https://txline-dev.txodds.com")
    try:
        response = httpx.post(f"{origin}/auth/guest/start", timeout=15)
        response.raise_for_status()
        jwt = response.json().get("token")
        if not jwt:
            raise RuntimeError("TXLINE_GUEST_TOKEN_MISSING")
    except Exception as exc:
        raise HTTPException(502, {"error": "TXLINE_GUEST_SESSION_FAILED", "detail": str(exc)}) from exc
    set_state("txline_pending_jwt", jwt)
    leagues: list[int] = []
    message = f"{tx_sig}:{','.join(map(str, leagues))}:{jwt}"
    return {"message": message, "tx_sig": tx_sig}


class TxlineActivateIn(BaseModel):
    wallet_signature: str = Field(min_length=16, max_length=256)


@app.post("/api/txline/activate/complete")
def txline_activate_complete(body: TxlineActivateIn) -> dict:
    """Finish activation: send the wallet signature to TxLINE and store the API token server-side."""
    tx_sig = get_state("txline_subscribe_sig")
    jwt = get_state("txline_pending_jwt")
    if not tx_sig or not jwt:
        raise HTTPException(409, {"error": "TXLINE_ACTIVATION_NOT_STARTED"})
    base = os.getenv("TXLINE_API_BASE", "https://txline-dev.txodds.com/api")
    headers = {
        "Authorization": f"Bearer {jwt}",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CHUTE/1.0",
        "Accept": "application/json",
    }
    payload_out = {"txSig": tx_sig, "walletSignature": body.wallet_signature, "leagues": []}
    # Uma única tentativa: /token/activate não é idempotente — repetir dispara o
    # lock "Activation request is already processing" no servidor TxLINE.
    try:
        response = httpx.post(f"{base}/token/activate", json=payload_out, headers=headers, timeout=30)
    except Exception as exc:
        raise HTTPException(502, {"error": "TXLINE_ACTIVATION_FAILED", "detail": str(exc)}) from exc
    set_state("txline_last_activation_response", f"HTTP {response.status_code} | {response.text[:800]}")
    if response.status_code >= 400:
        detail = response.text[:500]
        if "<html" in detail.lower() or "<!doctype" in detail.lower():
            detail = f"host TxLINE indisponível (edge retornou página HTML, HTTP {response.status_code}). Tente de novo em instantes."
        raise HTTPException(502, {"error": "TXLINE_ACTIVATION_REJECTED", "status": response.status_code, "detail": detail})
    payload = response.json()
    api_token = payload.get("apiToken") or payload.get("token") or payload.get("api_token")
    if not api_token:
        raise HTTPException(502, {"error": "TXLINE_API_TOKEN_MISSING", "detail": str(payload)[:500]})
    set_state("txline_api_token", api_token)
    set_state("txline_api_jwt", jwt)
    return {"ok": True, "api_token_active": True}


@app.get("/api/txline/status")
def txline_status() -> dict:
    try:
        response = httpx.get(f"{TXLINE_WORKER_URL}/txline/status", timeout=3)
        response.raise_for_status()
        body = response.json()
        body.setdefault("data_status", "txline_configured" if body.get("configured") else "MISSING_DATA")
        return body
    except Exception as exc:
        return {"configured": False, "data_status": "MISSING_DATA", "worker_url": TXLINE_WORKER_URL, "error": str(exc)}


@app.get("/api/txline/fixtures")
def txline_fixtures() -> dict:
    try:
        response = httpx.get(f"{TXLINE_WORKER_URL}/txline/fixtures", timeout=15)
        response.raise_for_status()
        return {"data_status": "txline_live", "payload": response.json()}
    except Exception as exc:
        raise HTTPException(502, {"data_status": "MISSING_DATA", "error": str(exc)}) from exc


class TxlineFixturesIngest(BaseModel):
    network: Literal["devnet", "mainnet"] = "devnet"
    source_timestamp: Optional[str] = None
    fixtures: list[dict[str, Any]]


class TxlineSnapshotIngest(BaseModel):
    fixture_id: str
    snapshot_type: Literal["score", "odds", "fixture"]
    snapshot: dict[str, Any]
    network: Literal["devnet", "mainnet"] = "devnet"
    source_timestamp: Optional[str] = None
    sequence: Optional[str] = None
    proof_refs: list[str] = []
    content_hash: Optional[str] = None
    data_status: str = "txline_live"


SERVICE_TOKEN = os.getenv("CHUTE_SERVICE_TOKEN", "")


def _require_service_token(header_token: str) -> None:
    """Protect ingestion routes: when CHUTE_SERVICE_TOKEN is set, callers must present it.
    Unset means local development only — set it in any shared/deployed environment."""
    if SERVICE_TOKEN and not hmac.compare_digest(SERVICE_TOKEN, header_token):
        raise HTTPException(401, "SERVICE_TOKEN_INVALID: internal ingestion requires X-Chute-Service-Token")


@app.post("/internal/txline/fixtures")
def ingest_txline_fixtures(payload: TxlineFixturesIngest, x_chute_service_token: str = Header(default="")) -> dict:
    _require_service_token(x_chute_service_token)
    persisted = [upsert_fixture(fixture, payload.network, payload.source_timestamp) for fixture in payload.fixtures]
    return {"persisted": len(persisted), "network": payload.network, "data_status": "txline_persisted"}


@app.post("/internal/txline/snapshots")
def ingest_txline_snapshot(payload: TxlineSnapshotIngest, x_chute_service_token: str = Header(default="")) -> dict:
    _require_service_token(x_chute_service_token)
    snapshot_id = f"txline-{payload.snapshot_type}-{payload.fixture_id}-{payload.sequence or payload.source_timestamp or 'latest'}"
    save_snapshot(snapshot_id, payload.fixture_id, payload.snapshot_type, payload.snapshot, payload.network, payload.data_status, payload.source_timestamp, payload.sequence, payload.proof_refs, payload.content_hash)
    return {"snapshot_id": snapshot_id, "fixture_id": payload.fixture_id, "data_status": "txline_persisted"}


@app.get("/api/fixtures")
def persisted_fixtures() -> dict:
    return {"data_status": "persisted", "fixtures": list_fixtures()}


EDITORIAL_STATS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "wc2026-editorial-stats.json")
TOURNAMENT_TABLE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "wc2026-tournament-table.json")


@app.get("/api/copa/tabela")
def copa_tournament_table() -> dict:
    """Tabela completa da Copa 2026: 48 seleções, dados reais agregados do feed TxLINE
    mainnet (SL12) — visão ampla para o torcedor pensar além da final antes de responder
    o quiz. Nunca inventado: cada linha vem de jogos com Stats confirmado no wire real."""
    import json as _json
    try:
        with open(TOURNAMENT_TABLE_PATH) as fh:
            return _json.load(fh)
    except FileNotFoundError:
        raise HTTPException(404, {"data_status": "MISSING_DATA", "error": "TOURNAMENT_TABLE_NOT_FOUND"})


@app.get("/api/fixtures/{fixture_id}/insights")
def fixture_insights(fixture_id: str) -> dict:
    """Pre-match reading panel: curated editorial stats (clearly labeled, never TxLINE) plus
    the honest availability of each tier given the fixture's persisted snapshot."""
    import json as _json
    # Leitura editorial é curada por fixture_id textual (ex.: "argentina-spain"), independente
    # de qualquer snapshot TxLINE — não resolvemos via alias de replay para não misturar times.
    editorial: dict[str, Any] = {}
    try:
        with open(EDITORIAL_STATS_PATH) as fh:
            editorial = _json.load(fh)
    except FileNotFoundError:
        pass
    fixture_editorial = editorial.get("fixtures", {}).get(str(fixture_id))
    if not fixture_editorial:
        # Final aberta pelo id numérico live (ex.: 18257739): reconcilia de volta ao slug editorial.
        fixture_editorial = editorial.get("fixtures", {}).get(snapshot_builder.resolve_editorial_alias(str(fixture_id)))
    # Disponibilidade de tier no produto preditivo depende do histórico TxOdds
    # (wc2026-player-stats.json), não de um snapshot de replay.
    try:
        predictive_stats = quiz_engine._load_player_stats()
        predictive_teams = predictive_stats.get("teams", {})
    except Exception:
        predictive_teams = {}
    tiers = []
    for tier_id, tier_meta in quiz_engine.TIERS.items():
        available = bool(predictive_teams)
        tiers.append({"id": tier_id, "label": tier_meta["label"], "description": tier_meta["description"], "available": available,
                      "hint": (fixture_editorial or {}).get("tier_hints", {}).get(tier_id)})
    if not fixture_editorial and not predictive_teams:
        raise HTTPException(404, {"data_status": "MISSING_DATA", "error": "NO_INSIGHTS", "fixture_id": fixture_id})
    return {
        "fixture_id": fixture_id,
        "data_status": "editorial_curated" if fixture_editorial else "txline_snapshot",
        "disclaimer": editorial.get("disclaimer"),
        "sources": editorial.get("sources", []),
        "tournament": editorial.get("tournament"),
        "editorial": fixture_editorial,
        "tiers": tiers,
        "has_snapshot": bool(predictive_teams),
    }


@app.get("/api/fixtures/{fixture_id}/snapshot")
def persisted_fixture_snapshot(fixture_id: str) -> dict:
    snapshot = latest_snapshot(fixture_id)
    if not snapshot:
        raise HTTPException(404, {"data_status": "MISSING_DATA", "error": "SNAPSHOT_NOT_FOUND"})
    return snapshot


@app.get("/api/predictions/{fixture_id}/{team}/{tier}")
def predictive_quiz_preview(fixture_id: str, team: str, tier: str = "gols") -> dict:
    """Return preview metadata for a predictive quiz without exposing future questions.

    Predictions are based on historical Copa 2026 stats. Answers frozen at participant start;
    resolved against TxLINE events as the match progresses.
    """
    try:
        quiz = build_predictive_quiz(fixture_id, team, tier)
        return {
            "quiz_id": quiz["quiz_id"],
            "fixture_id": quiz["fixture_id"],
            "team": quiz["team"],
            "tier": quiz["tier"],
            "title": quiz["title"],
            "mode": quiz["mode"],
            "status": "preview",
            "total": len(quiz["questions"]),
            "data_status": quiz["data_status"],
            "description": quiz["description"],
        }
    except Exception as exc:
        raise HTTPException(409, {"data_status": "MISSING_DATA", "error": str(exc)}) from exc


class PredictiveStartRequest(BaseModel):
    participant_id: str = "demo-telegram-user"


class PredictiveAnswerRequest(BaseModel):
    participant_id: str = "demo-telegram-user"
    question_id: str
    answer: Union[str, int]
    request_id: str = Field(default_factory=lambda: str(uuid4()))


def _parse_predictive_quiz_id(quiz_id: str) -> tuple[str, str, str]:
    if not quiz_id.startswith("pred-"):
        raise HTTPException(409, "quiz_id must be predictive (pred-*)")
    parts = quiz_id[len("pred-"):].rsplit("-", 2)
    if len(parts) < 3 or not all(parts):
        raise HTTPException(409, "malformed_quiz_id")
    fixture_id, team, tier = parts
    return fixture_id, team, tier


def _predictive_quiz_session(participant_id: str, quiz_id: str) -> dict[str, Any]:
    fixture_id, team, tier = _parse_predictive_quiz_id(quiz_id)
    session = get_predictive_quiz_session(participant_id, quiz_id)
    if session:
        return session
    quiz = build_predictive_quiz(fixture_id, team, tier)
    return lock_predictive_quiz_session(participant_id, quiz)


def _predictive_resume_payload(participant_id: str, session: dict[str, Any]) -> dict[str, Any]:
    answers = load_answers(participant_id, session["quiz_id"])
    answered = len(answers)
    total = session["total"]
    current_question = session["questions"][answered] if answered < total else None
    return {
        "status": "complete" if answered >= total else "open",
        "quiz_id": session["quiz_id"],
        "participant_id": participant_id,
        "fixture_id": session["fixture_id"],
        "team": session["team"],
        "tier": session["tier"],
        "title": session["title"],
        "answered": answered,
        "total": total,
        "locked_at": session["locked_at"],
        "answer_refs": [answer["question_id"] for answer in answers],
        "current_question": current_question,
    }


@app.post("/api/predictions/{fixture_id}/{team}/{tier}/start")
def predictive_quiz_start(fixture_id: str, team: str, tier: str, payload: PredictiveStartRequest) -> dict:
    try:
        quiz = build_predictive_quiz(fixture_id, team, tier)
        session = lock_predictive_quiz_session(payload.participant_id, quiz)
        return _predictive_resume_payload(payload.participant_id, session)
    except Exception as exc:
        raise HTTPException(409, {"data_status": "MISSING_DATA", "error": str(exc)}) from exc


@app.get("/api/predictions/{quiz_id}/resume")
def predictive_quiz_resume(quiz_id: str, participant_id: str = "demo-telegram-user") -> dict:
    session = _predictive_quiz_session(participant_id, quiz_id)
    return _predictive_resume_payload(participant_id, session)


@app.post("/api/predictions/{quiz_id}/answer")
def answer_predictive_question(quiz_id: str, payload: PredictiveAnswerRequest) -> dict:
    """Answer a predictive question. Answers are frozen; compared against TxLINE events later."""
    if payload.request_id in seen_requests or request_exists(payload.request_id):
        raise HTTPException(409, "request_id already processed")
    session = _predictive_quiz_session(payload.participant_id, quiz_id)
    seen_requests.add(payload.request_id)
    answers = load_answers(payload.participant_id, quiz_id)
    if len(answers) >= session["total"]:
        raise HTTPException(409, "predictive quiz already complete")
    question = session["questions"][len(answers)]
    if payload.question_id != question["id"]:
        raise HTTPException(409, "unexpected_question_id")
    allowed_answers = {option["value"] for option in question["options"]}
    if payload.answer not in allowed_answers:
        raise HTTPException(409, "invalid_answer_option")
    save_answer(payload.participant_id, quiz_id, payload.question_id, payload.answer, payload.request_id)
    answered = len(answers) + 1
    next_question = session["questions"][answered] if answered < session["total"] else None
    return {
        "accepted": True,
        "quiz_id": quiz_id,
        "question_id": payload.question_id,
        "answer": payload.answer,
        "answered": answered,
        "total": session["total"],
        "status": "complete" if answered >= session["total"] else "open",
        "next_question": next_question,
    }


@app.get("/api/predictions/{quiz_id}/progress")
def predictive_quiz_progress(quiz_id: str, participant_id: str = "demo-telegram-user") -> dict:
    """Get real-time progress on a predictive quiz.

    Shows which questions have been resolved by TxLINE events and current score.
    As the match progresses, this endpoint updates with new resolutions.
    """
    try:
        fixture_id, team, tier = _parse_predictive_quiz_id(quiz_id)

        # Predictive progress must resolve against the live TxLINE fixture, not the
        # replay alias. If the live fixture is absent, we stay fail-closed.
        resolved_fixture = snapshot_builder.resolve_predictive_fixture_id(fixture_id)
        snapshot_row = latest_snapshot(resolved_fixture)
        if not snapshot_row:
            return {"status": "snapshot_pending", "quiz_id": quiz_id, "progress": 0, "message": "Fixture not started or snapshot unavailable"}

        # Load participant's frozen answers
        answers = load_answers(participant_id, quiz_id)
        if not answers:
            return {"status": "no_answers", "quiz_id": quiz_id, "progress": 0, "message": "No answers submitted yet"}

        # Extract TxLINE score data from snapshot (latest_snapshot already decodes payload_json → payload)
        snapshot_data = snapshot_row.get("payload", {}) if isinstance(snapshot_row, dict) else {}
        if isinstance(snapshot_data, str):
            import json as _json
            snapshot_data = _json.loads(snapshot_data)
        validation = snapshot_data.get("validation", {}) if isinstance(snapshot_data, dict) else {}
        proof_refs = snapshot_row.get("proof_refs", []) if isinstance(snapshot_row, dict) else []

        # Score answers against current snapshot; the frozen quiz supplies each
        # question's meta (equipe/jogador/duelo) so resolution never hardcodes targets.
        from . import prediction_resolver
        quiz_meta = quiz_engine.build_predictive_quiz(fixture_id, team, tier)
        questions_by_id = {q["id"]: q for q in quiz_meta.get("questions", [])}
        # A resolução real precisa saber qual seleção é Participant1/2 no wire da TxLINE —
        # isso vem do fixture persistido (home_team/away_team), nunca adivinhado.
        fixture_row = get_fixture(resolved_fixture) or {}
        result = prediction_resolver.score_prediction_quiz(
            quiz_id, tier, answers, snapshot_data, questions_by_id,
            home_team=fixture_row.get("home_team"), away_team=fixture_row.get("away_team"),
        )

        return {
            "status": "scoring",
            "quiz_id": quiz_id,
            "participant_id": participant_id,
            "progress": result["correct_count"],
            "total": result["total"],
            "score": result["score"],
            "percentage": result["percentage"],
            "breakdown": result["breakdown"],
            "fixture_id": fixture_id,
            "resolved_fixture_id": resolved_fixture,
            "snapshot_id": snapshot_row.get("snapshot_id") if isinstance(snapshot_row, dict) else None,
            "content_hash": snapshot_row.get("content_hash") if isinstance(snapshot_row, dict) else None,
            "timestamp": snapshot_row.get("source_timestamp") if isinstance(snapshot_row, dict) else None,
            "proof_refs": proof_refs,
            "on_chain_validation": validation.get("onChainValidation"),
            "network": snapshot_row.get("network") if isinstance(snapshot_row, dict) else None,
            "sl_level": "SL12" if isinstance(snapshot_row, dict) and snapshot_row.get("network") == "mainnet" else "SL1",
        }
    except Exception as exc:
        raise HTTPException(409, {"error": str(exc), "quiz_id": quiz_id}) from exc


def _quiz_for_fixture(fixture_id: str, tier: str = "gols") -> tuple[dict, dict]:
    """Resolve a fixture to its (envelope, quiz) for a tier. Fail-closed on missing/unplayable data."""
    resolved = snapshot_builder.resolve_fixture_id(fixture_id)
    row = latest_snapshot(resolved)
    if not row:
        raise HTTPException(404, {"data_status": "MISSING_DATA", "error": "SNAPSHOT_NOT_FOUND", "fixture_id": resolved})
    try:
        envelope = snapshot_builder.envelope_from_snapshot_row(row)
        quiz = build_quiz_from_snapshot(envelope, tier)
    except snapshot_builder.MissingData as exc:
        raise HTTPException(409, {"data_status": "MISSING_DATA", "error": str(exc), "fixture_id": resolved}) from exc
    except RuntimeError as exc:
        raise HTTPException(409, {"data_status": "MISSING_DATA", "error": str(exc), "fixture_id": resolved}) from exc
    return envelope, quiz


def _frozen_quiz(participant_id: str, fixture_id: str, tier: str = "gols") -> tuple[dict, dict, dict]:
    """Return (session, envelope, quiz) for the participant's FROZEN snapshot.

    First call locks the current snapshot atomically (idempotent); later calls always
    rebuild from the locked snapshot_id, so the quiz and scoring never drift even if a
    newer snapshot arrives or the API restarts.
    """
    envelope, quiz = _quiz_for_fixture(fixture_id, tier)
    session = lock_quiz_session(participant_id, quiz["quiz_id"], str(quiz["fixture_id"]), quiz["snapshot_id"], quiz["content_hash"], quiz["source_timestamp"])
    if session["snapshot_id"] != quiz["snapshot_id"]:
        locked_row = get_snapshot(session["snapshot_id"])
        if not locked_row:
            raise HTTPException(409, {"data_status": "MISSING_DATA", "error": "LOCKED_SNAPSHOT_MISSING"})
        envelope = snapshot_builder.envelope_from_snapshot_row(locked_row)
        quiz = build_quiz_from_snapshot(envelope, tier)
    if session["content_hash"] != quiz["content_hash"]:
        raise HTTPException(409, {"error": "SNAPSHOT_TAMPERED", "detail": "locked content hash mismatch"})
    return session, envelope, quiz


@app.get("/api/quizzes/{fixture_id}")
def fixture_quiz(fixture_id: str, tier: str = "gols") -> dict:
    _, quiz = _quiz_for_fixture(fixture_id, tier)
    return quiz


class QuizAnswerRequest(BaseModel):
    participant_id: str = "demo-telegram-user"
    question_id: str
    answer: Union[str, int]
    request_id: str = Field(default_factory=lambda: str(uuid4()))


@app.get("/api/quizzes/{fixture_id}/current")
def current_quiz_question(fixture_id: str, participant_id: str = "demo-telegram-user", tier: str = "gols") -> dict:
    session, envelope, quiz = _frozen_quiz(participant_id, fixture_id, tier)
    answers = load_answers(participant_id, quiz["quiz_id"])
    base = {"quiz_id": quiz["quiz_id"], "snapshot_id": session["snapshot_id"], "content_hash": session["content_hash"], "locked_at": session["locked_at"], "answered": len(answers), "total": len(quiz["questions"])}
    if len(answers) >= len(quiz["questions"]):
        return {"status": "complete", **base, "score": score_answers(quiz, answers, envelope)}
    return {"status": "open", **base, "question": quiz["questions"][len(answers)]}


@app.post("/api/quizzes/{fixture_id}/answers")
def answer_quiz_question(fixture_id: str, payload: QuizAnswerRequest, tier: str = "gols") -> dict:
    if payload.request_id in seen_requests or request_exists(payload.request_id):
        raise HTTPException(409, "request_id already processed")
    session, envelope, quiz = _frozen_quiz(payload.participant_id, fixture_id, tier)
    answers = load_answers(payload.participant_id, quiz["quiz_id"])
    if len(answers) >= len(quiz["questions"]):
        raise HTTPException(409, "quiz already complete")
    question = quiz["questions"][len(answers)]
    if payload.question_id != question["id"] or str(payload.answer) not in {str(option["value"]) for option in question["options"]}:
        raise HTTPException(409, "answer does not match current question")
    seen_requests.add(payload.request_id)
    save_answer(payload.participant_id, quiz["quiz_id"], payload.question_id, payload.answer, payload.request_id)
    answers.append({"question_id": payload.question_id, "answer": payload.answer, "request_id": payload.request_id})
    state = current_quiz_question(fixture_id, payload.participant_id, tier)
    return {"accepted": True, "status": state["status"], "answered": len(answers), "total": len(quiz["questions"]), "next_question": state.get("question"), "snapshot_id": session["snapshot_id"]}


@app.get("/api/quizzes/{fixture_id}/ranking")
def quiz_ranking(fixture_id: str, tier: str = "gols") -> dict:
    """Durable ranking rebuilt from SQLite: survives API restarts, numeric ordering."""
    envelope, quiz = _quiz_for_fixture(fixture_id, tier)
    ranking = []
    for participant in list_participants(quiz["quiz_id"]):
        answers = load_answers(participant, quiz["quiz_id"])
        session = get_quiz_session(participant, quiz["quiz_id"])
        participant_envelope = envelope
        if session and session["snapshot_id"] != quiz["snapshot_id"]:
            locked_row = get_snapshot(session["snapshot_id"])
            if locked_row:
                participant_envelope = snapshot_builder.envelope_from_snapshot_row(locked_row)
        result = score_answers(quiz, answers, participant_envelope) if len(answers) == len(quiz["questions"]) else None
        ranking.append({"participant_id": participant, "answered": len(answers), "first_answer_at": first_answer_time(participant, quiz["quiz_id"]), **(result or {"score": None, "exact_hits": 0, "total_error": 0.0, "proof_status": "pending"})})
    ranking.sort(key=lambda item: (-(item["score"] if item["score"] is not None else -1), -item["exact_hits"], item["total_error"], item["first_answer_at"]))
    return {"quiz_id": quiz["quiz_id"], "snapshot_id": quiz["snapshot_id"], "status": "scored_from_db", "ranking": ranking, "data_status": quiz["data_status"], "proof_status": "attached_unsettled"}


@app.post("/api/session/telegram")
def telegram_session(x_telegram_init_data: str = Header(default="")) -> dict:
    if not x_telegram_init_data:
        if DRY_RUN:
            return {"authenticated": True, "user_id": "demo-telegram-user", "mode": "dry_run"}
        raise HTTPException(401, "X-Telegram-Init-Data is required")
    try:
        fields = validate_telegram_init_data(x_telegram_init_data, BOT_TOKEN)
    except (ValueError, TypeError) as exc:
        raise HTTPException(401, str(exc)) from exc
    return {"authenticated": True, "user_id": fields.get("user", "unknown"), "mode": "telegram"}


class WalletChallengeRequest(BaseModel):
    public_key: str = Field(min_length=32, max_length=64)


@app.post("/api/wallet/challenge")
def wallet_challenge(payload: WalletChallengeRequest) -> dict:
    nonce = f"CHUTE quer verificar sua wallet (devnet, sem transacao). Nonce: {secrets.token_urlsafe(16)}"
    save_challenge(payload.public_key, nonce)
    return {"public_key": payload.public_key, "message": nonce, "expires_in_seconds": 300}


class WalletSessionRequest(BaseModel):
    public_key: str = Field(min_length=32, max_length=64)
    network: Literal["devnet", "mainnet"] = "devnet"
    signature: str = Field(min_length=16)


def _b58decode(value: str) -> bytes:
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    number = 0
    for char in value:
        number = number * 58 + alphabet.index(char)
    raw = number.to_bytes((number.bit_length() + 7) // 8, "big")
    pad = len(value) - len(value.lstrip("1"))
    return b"\x00" * pad + raw


@app.post("/api/wallet/session")
def wallet_session(payload: WalletSessionRequest) -> dict:
    """Create a wallet session only after verifying ed25519 ownership of the public key."""
    nonce = pop_challenge(payload.public_key)
    if not nonce:
        raise HTTPException(401, "WALLET_CHALLENGE_MISSING_OR_EXPIRED: request /api/wallet/challenge first")
    try:
        from nacl.signing import VerifyKey
        from nacl.exceptions import BadSignatureError
        verify_key = VerifyKey(_b58decode(payload.public_key))
        try:
            signature = base64.b64decode(payload.signature, validate=True)
        except Exception:
            signature = _b58decode(payload.signature)
        verify_key.verify(nonce.encode(), signature)
    except BadSignatureError as exc:
        raise HTTPException(401, "WALLET_SIGNATURE_INVALID") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"WALLET_SIGNATURE_UNPROCESSABLE: {exc}") from exc
    save_wallet(payload.public_key, payload.network)
    return {"connected": True, "public_key": payload.public_key, "network": payload.network, "session_status": "signature_verified"}


