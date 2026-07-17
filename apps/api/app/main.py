from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time
import httpx
from datetime import datetime, timezone
from typing import Literal, Optional, Any, Union
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from . import quiz_engine, snapshot_builder
from .quiz_engine import build_quiz_from_snapshot, score_answers, build_predictive_quiz
from .storage import (
    first_answer_time,
    get_quiz_session,
    get_snapshot,
    init_db,
    latest_snapshot,
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
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in os.getenv("CHUTE_CORS_ORIGINS", _default_cors).split(",") if o.strip()], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
DRY_RUN = os.getenv("CHUTE_DRY_RUN", "true").lower() == "true"
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TXLINE_WORKER_URL = os.getenv("TXLINE_WORKER_URL", "http://127.0.0.1:8100")
seen_requests: set[str] = set()
init_db()
# Seed the reproducible replay envelope into SQLite so the whole quiz pipeline reads from
# the database (fixtures -> match_snapshots -> quiz), never from a static-file special case.
snapshot_builder.seed_replay_snapshot()


class PositionRequest(BaseModel):
    market_id: str = "shots-on-target-10m"
    action: Literal["yes", "no"]
    amount: int = Field(default=0, ge=0)
    wallet: Optional[str] = None
    request_id: str = Field(default_factory=lambda: str(uuid4()))


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


def current_market() -> dict:
    return {
        "id": "shots-on-target-10m",
        "event_id": "demo-brazil-match",
        "question": "Brasil terá pelo menos 2 finalizações nos próximos 10 minutos?",
        "line": 2,
        "window": "30:00 — 40:00",
        "status": "open",
        "source": "txline-mock",
        "source_timestamp": datetime.now(timezone.utc).isoformat(),
        "network": "devnet",
    }


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "chute-api", "dry_run": DRY_RUN}


@app.get("/api/solana/status")
def solana_status() -> dict:
    """Public, non-secret network metadata for the wallet UI."""
    return {
        "network": "devnet",
        "rpc_status": "configured",
        "program_id": "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
        "dry_run": DRY_RUN,
        "settlement_status": "approval_required",
    }


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


@app.get("/api/markets/active")
def active_market() -> dict:
    return current_market()


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


@app.get("/api/fixtures/{fixture_id}/insights")
def fixture_insights(fixture_id: str) -> dict:
    """Pre-match reading panel: curated editorial stats (clearly labeled, never TxLINE) plus
    the honest availability of each tier given the fixture's persisted snapshot."""
    import json as _json
    resolved = snapshot_builder.resolve_fixture_id(fixture_id)
    editorial: dict[str, Any] = {}
    try:
        with open(EDITORIAL_STATS_PATH) as fh:
            editorial = _json.load(fh)
    except FileNotFoundError:
        pass
    fixture_editorial = editorial.get("fixtures", {}).get(str(resolved))
    row = latest_snapshot(resolved)
    tiers = []
    for tier_id, tier_meta in quiz_engine.TIERS.items():
        available = False
        if row:
            try:
                envelope = snapshot_builder.envelope_from_snapshot_row(row)
                available = quiz_engine.tier_available(envelope, tier_id)
            except snapshot_builder.MissingData:
                available = False
        tiers.append({"id": tier_id, "label": tier_meta["label"], "description": tier_meta["description"], "available": available,
                      "hint": (fixture_editorial or {}).get("tier_hints", {}).get(tier_id)})
    if not fixture_editorial and not row:
        raise HTTPException(404, {"data_status": "MISSING_DATA", "error": "NO_INSIGHTS", "fixture_id": resolved})
    return {
        "fixture_id": resolved,
        "data_status": "editorial_curated" if fixture_editorial else "txline_snapshot",
        "disclaimer": editorial.get("disclaimer"),
        "sources": editorial.get("sources", []),
        "tournament": editorial.get("tournament"),
        "editorial": fixture_editorial,
        "tiers": tiers,
        "has_snapshot": bool(row),
    }


@app.get("/api/fixtures/{fixture_id}/snapshot")
def persisted_fixture_snapshot(fixture_id: str) -> dict:
    snapshot = latest_snapshot(fixture_id)
    if not snapshot:
        raise HTTPException(404, {"data_status": "MISSING_DATA", "error": "SNAPSHOT_NOT_FOUND"})
    return snapshot


@app.get("/api/predictions/{fixture_id}/{team}/{tier}")
def predictive_quiz(fixture_id: str, team: str, tier: str = "faltas") -> dict:
    """Get a predictive quiz (5 questions: 3 easy + 2 zebra) for a team/tier.

    Predictions are based on historical Copa 2026 stats. Answers frozen at participant start;
    resolved against TxLINE events as the match progresses.
    """
    try:
        quiz = build_predictive_quiz(fixture_id, team, tier)
        return quiz
    except Exception as exc:
        raise HTTPException(409, {"data_status": "MISSING_DATA", "error": str(exc)}) from exc


class PredictiveAnswerRequest(BaseModel):
    participant_id: str = "demo-telegram-user"
    question_id: str
    answer: Union[str, int]
    request_id: str = Field(default_factory=lambda: str(uuid4()))


@app.post("/api/predictions/{quiz_id}/answer")
def answer_predictive_question(quiz_id: str, payload: PredictiveAnswerRequest) -> dict:
    """Answer a predictive question. Answers are frozen; compared against TxLINE events later."""
    if payload.request_id in seen_requests or request_exists(payload.request_id):
        raise HTTPException(409, "request_id already processed")
    if not quiz_id.startswith("pred-"):
        raise HTTPException(409, "quiz_id must be predictive (pred-*)")
    seen_requests.add(payload.request_id)
    # Store answer — will be resolved when TxLINE events arrive
    save_answer(payload.participant_id, quiz_id, payload.question_id, payload.answer, payload.request_id)
    return {"accepted": True, "quiz_id": quiz_id, "question_id": payload.question_id, "answer": payload.answer}


@app.get("/api/predictions/{quiz_id}/progress")
def predictive_quiz_progress(quiz_id: str, participant_id: str = "demo-telegram-user") -> dict:
    """Get real-time progress on a predictive quiz.

    Shows which questions have been resolved by TxLINE events and current score.
    As the match progresses, this endpoint updates with new resolutions.
    """
    if not quiz_id.startswith("pred-"):
        raise HTTPException(409, "quiz_id must be predictive (pred-*)")

    try:
        # Parse quiz_id: pred-{fixture_id}-{team}-{tier}. O fixture_id pode conter
        # hífens (ex.: argentina-spain), então team/tier saem pela direita.
        parts = quiz_id[len("pred-"):].rsplit("-", 2)
        if len(parts) < 3 or not all(parts):
            raise HTTPException(409, "malformed_quiz_id")
        fixture_id, team, tier = parts

        # Get latest snapshot for this fixture (contains TxLINE events); aliases like
        # "argentina-spain" resolve to the numeric TxLINE fixture id.
        resolved_fixture = snapshot_builder.resolve_fixture_id(fixture_id)
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

        # Score answers against current snapshot
        from . import prediction_resolver
        result = prediction_resolver.score_prediction_quiz(quiz_id, tier, answers, snapshot_data)

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
            "snapshot_id": snapshot_row.get("snapshot_id") if isinstance(snapshot_row, dict) else None,
            "content_hash": snapshot_row.get("content_hash") if isinstance(snapshot_row, dict) else None,
            "timestamp": snapshot_row.get("source_timestamp") if isinstance(snapshot_row, dict) else None
        }
    except Exception as exc:
        raise HTTPException(409, {"error": str(exc), "quiz_id": quiz_id}) from exc


def _quiz_for_fixture(fixture_id: str, tier: str = "chutes") -> tuple[dict, dict]:
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


def _frozen_quiz(participant_id: str, fixture_id: str, tier: str = "chutes") -> tuple[dict, dict, dict]:
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
def fixture_quiz(fixture_id: str, tier: str = "chutes") -> dict:
    _, quiz = _quiz_for_fixture(fixture_id, tier)
    return quiz


class QuizAnswerRequest(BaseModel):
    participant_id: str = "demo-telegram-user"
    question_id: str
    answer: Union[str, int]
    request_id: str = Field(default_factory=lambda: str(uuid4()))


@app.get("/api/quizzes/{fixture_id}/current")
def current_quiz_question(fixture_id: str, participant_id: str = "demo-telegram-user", tier: str = "chutes") -> dict:
    session, envelope, quiz = _frozen_quiz(participant_id, fixture_id, tier)
    answers = load_answers(participant_id, quiz["quiz_id"])
    base = {"quiz_id": quiz["quiz_id"], "snapshot_id": session["snapshot_id"], "content_hash": session["content_hash"], "locked_at": session["locked_at"], "answered": len(answers), "total": len(quiz["questions"])}
    if len(answers) >= len(quiz["questions"]):
        return {"status": "complete", **base, "score": score_answers(quiz, answers, envelope)}
    return {"status": "open", **base, "question": quiz["questions"][len(answers)]}


@app.post("/api/quizzes/{fixture_id}/answers")
def answer_quiz_question(fixture_id: str, payload: QuizAnswerRequest, tier: str = "chutes") -> dict:
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
def quiz_ranking(fixture_id: str, tier: str = "chutes") -> dict:
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


@app.post("/api/positions")
def open_position(payload: PositionRequest, x_telegram_init_data: str = Header(default="")) -> dict:
    if payload.request_id in seen_requests:
        raise HTTPException(409, "request_id already processed")
    if not DRY_RUN and not x_telegram_init_data:
        raise HTTPException(401, "Telegram session required")
    market = current_market()
    if payload.market_id != market["id"] or market["status"] != "open":
        raise HTTPException(409, "market is not open")
    seen_requests.add(payload.request_id)
    decision = {"result": "ALLOW", "decision_id": f"chute-{uuid4()}", "policy_version": "chute-policy-v1", "risk_score": 0}
    return {
        "position_id": f"position-{uuid4()}",
        "request_id": payload.request_id,
        "status": "open",
        "policy_decision": decision,
        "market": market,
        "proof": {"network": "devnet", "eventId": market["event_id"], "marketId": market["id"], "policyResult": decision["result"], "requestId": payload.request_id, "txlineProofRef": None, "transactionSignature": None, "settlementId": None, "status": "pending_txline_validation"},
    }
