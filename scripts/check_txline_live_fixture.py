"""Check whether a live TxLINE fixture is ready for CHUTE predictive scoring.

Usage:
    python3 scripts/check_txline_live_fixture.py [api_base] [fixture_id]

Default API base: http://127.0.0.1:8000
Default fixture id: 18257739 (Spain x Argentina)

Exit codes:
    0 = live snapshot present with proof refs
    2 = blocked / pending / missing proof
    1 = transport or unexpected error
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


DEFAULT_API_BASE = "http://127.0.0.1:8000"
DEFAULT_FIXTURE_ID = "18257739"
DEFAULT_TEAMS = ["Spain", "Argentina"]


def call(base: str, path: str) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(f"{base}{path}", method="GET")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as exc:
        raw = exc.read() or b"{}"
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, {"error": raw.decode(errors="ignore")}


def as_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("payload", "fixtures", "data", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    return []


def find_fixture(items: list[dict[str, Any]], fixture_id: str) -> dict[str, Any] | None:
    for item in items:
        candidate = str(item.get("fixture_id") or item.get("FixtureId") or item.get("fixtureId") or item.get("id") or "")
        if candidate == str(fixture_id):
            return item
    return None


def latest_score_payload(snapshot_payload: Any) -> dict[str, Any]:
    if isinstance(snapshot_payload, list):
        for entry in reversed(snapshot_payload):
            if isinstance(entry, dict):
                return entry
        return {}
    if isinstance(snapshot_payload, dict):
        return snapshot_payload
    return {}


def fixture_value(fixture: dict[str, Any] | None, *keys: str) -> Any:
    if not fixture:
        return None
    for key in keys:
        if key in fixture and fixture[key] not in (None, ""):
            return fixture[key]
    return None


def compact_metrics(
    fixture: dict[str, Any] | None,
    snapshot: dict[str, Any] | None,
    poller: dict[str, Any] | None,
) -> dict[str, Any]:
    payload = latest_score_payload((snapshot or {}).get("payload"))
    raw_stats = payload.get("stats")
    score_block = payload.get("score") if isinstance(payload.get("score"), dict) else {}
    stats = raw_stats if isinstance(raw_stats, dict) else score_block.get("stats", {})
    events = score_block.get("events") if isinstance(score_block.get("events"), list) else payload.get("events", [])
    return {
        "fixture_in_txline": bool(fixture),
        "game_state": fixture_value(fixture, "game_state", "GameState", "gameState"),
        "start_time": fixture_value(fixture, "start_time", "StartTime", "startTime"),
        "snapshot_id": (snapshot or {}).get("snapshot_id", "MISSING_DATA"),
        "snapshot_data_status": (snapshot or {}).get("data_status", "MISSING_DATA"),
        "score_sequence": str(payload.get("Seq") or payload.get("sequence") or (snapshot or {}).get("sequence") or "MISSING_DATA"),
        "stats_keys_count": len(stats) if isinstance(stats, dict) else 0,
        "event_count": len(events) if isinstance(events, list) else 0,
        "poller_enabled": bool((poller or {}).get("enabled")),
        "poller_last_fixture_sync_at": (poller or {}).get("lastFixtureSyncAt"),
        "poller_last_score_sync_at": (poller or {}).get("lastScoreSyncAt"),
    }


def main() -> None:
    api_base = (sys.argv[1] if len(sys.argv) > 1 else DEFAULT_API_BASE).rstrip("/")
    fixture_id = str(sys.argv[2] if len(sys.argv) > 2 else DEFAULT_FIXTURE_ID)

    status_code, status_body = call(api_base, "/api/txline/status")
    fixtures_code, fixtures_body = call(api_base, "/api/fixtures")
    txline_code, txline_body = call(api_base, "/api/txline/fixtures")
    snapshot_code, snapshot_body = call(api_base, f"/api/fixtures/{urllib.parse.quote(fixture_id)}/snapshot")

    if status_code >= 500 or fixtures_code >= 500 or txline_code >= 500:
        result = {
            "fixture_id": fixture_id,
            "teams": DEFAULT_TEAMS,
            "metrics": "MISSING_DATA",
            "recent_form": "MISSING_DATA",
            "source_timestamp": "MISSING_DATA",
            "txline_proof_refs": [],
            "confidence_score": 0,
            "data_status": "blocked",
            "evidence_refs": ["/api/txline/status", "/api/fixtures", "/api/txline/fixtures"],
            "recommended_actions": ["Restore the worker/API bridge before trusting TxLINE live state."],
            "blocked_actions": ["Cannot curate official stats while the bridge is unavailable."],
            "errors": {
                "txline_status": status_body,
                "fixtures": fixtures_body,
                "txline_fixtures": txline_body,
            },
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(1)

    txline_fixture = find_fixture(as_list(txline_body), fixture_id)
    persisted_fixture = find_fixture(fixtures_body.get("fixtures", []), fixture_id) if isinstance(fixtures_body, dict) else None
    snapshot = snapshot_body if snapshot_code == 200 and isinstance(snapshot_body, dict) else None
    snapshot_payload = latest_score_payload((snapshot or {}).get("payload"))
    validation = snapshot_payload.get("validation", {}) if isinstance(snapshot_payload, dict) else {}
    proof_refs = (snapshot or {}).get("proof_refs") or validation.get("proofRefs") or []
    persisted_source_timestamp = persisted_fixture.get("source_timestamp") if persisted_fixture else None
    source_timestamp = ((snapshot or {}).get("source_timestamp") or persisted_source_timestamp or "MISSING_DATA")

    if snapshot and proof_refs:
        data_status = "live_snapshot_ready"
        confidence = 0.95
        recommended = ["Predictive scoring may use this fixture as TxLINE primary input."]
        blocked = []
    elif snapshot and not proof_refs:
        data_status = "live_snapshot_missing_proof"
        confidence = 0.35
        recommended = ["Inspect the worker ingest path and attach TxLINE proof refs before submission."]
        blocked = ["Do not claim on-chain validation for this live fixture yet."]
    elif txline_fixture or persisted_fixture:
        data_status = "fixture_discovered_snapshot_pending"
        confidence = 0.25
        recommended = ["Wait for the first live score snapshot or trigger a manual score sync when the match starts."]
        blocked = ["Do not resolve the predictive quiz against replay or unstamped data."]
    else:
        data_status = "FIXTURE_NOT_FOUND"
        confidence = 0
        recommended = ["Confirm the fixture id in TxLINE before publication."]
        blocked = ["Cannot curate official live stats for an unknown fixture."]

    result = {
        "fixture_id": fixture_id,
        "teams": [
            fixture_value(persisted_fixture or txline_fixture, "home_team", "Participant1", "participant1", "homeTeam") or DEFAULT_TEAMS[0],
            fixture_value(persisted_fixture or txline_fixture, "away_team", "Participant2", "participant2", "awayTeam") or DEFAULT_TEAMS[1],
        ],
        "metrics": compact_metrics(persisted_fixture or txline_fixture, snapshot, status_body.get("poller") if isinstance(status_body, dict) else None),
        "recent_form": "MISSING_DATA",
        "source_timestamp": source_timestamp,
        "txline_proof_refs": proof_refs,
        "confidence_score": confidence,
        "data_status": data_status,
        "evidence_refs": [
            f"{api_base}/api/txline/status",
            f"{api_base}/api/txline/fixtures",
            f"{api_base}/api/fixtures",
            f"{api_base}/api/fixtures/{fixture_id}/snapshot",
        ],
        "recommended_actions": recommended,
        "blocked_actions": blocked,
        "on_chain_validation": validation.get("onChainValidation") if isinstance(validation, dict) else None,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if data_status == "live_snapshot_ready" else 2)


if __name__ == "__main__":
    main()
