"""Bridge between persisted TxLINE data and the canonical CHUTE quiz snapshot envelope.

The quiz engine consumes an enriched envelope (snapshotId, teams, score, validation,
contentHash, dataStatus, ...). TxLINE score payloads persisted by the worker are raw and
shaped differently. This module produces the canonical envelope from persisted rows, and
seeds the reproducible replay snapshot into the database so the quiz reads uniformly from
`match_snapshots` instead of a static file.

Fail-closed: if the required score evidence is absent, we return MISSING_DATA rather than
inventing an outcome.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .quiz_engine import SNAPSHOT_PATH, _canonical_hash
from . import storage


class MissingData(RuntimeError):
    """Raised when a fixture has no verifiable snapshot to build a quiz from."""


def _is_full_envelope(payload: dict[str, Any]) -> bool:
    return all(payload.get(field) for field in ("snapshotId", "fixtureId", "teams", "score", "validation", "contentHash", "dataStatus"))


def envelope_from_snapshot_row(snapshot_row: dict[str, Any]) -> dict[str, Any]:
    """Return the canonical CHUTE envelope for a persisted snapshot row.

    Today only fully-enriched envelopes (e.g. the seeded replay) are playable. Raw TxLINE
    score payloads without the enriched contract are treated as MISSING_DATA — we never
    fabricate outcomes from partial data.
    """
    payload = snapshot_row.get("payload") or {}
    if _is_full_envelope(payload):
        return payload
    raise MissingData("SNAPSHOT_NOT_PLAYABLE: persisted snapshot lacks a verified CHUTE envelope")


def load_replay_envelope() -> dict[str, Any]:
    if not SNAPSHOT_PATH.exists():
        raise MissingData("MISSING_DATA: TxLINE replay snapshot file is absent")
    return json.loads(Path(SNAPSHOT_PATH).read_text())


def seed_replay_snapshot() -> str | None:
    """Idempotently persist the reproducible replay fixture + snapshot into the DB.

    Returns the fixture_id that was seeded, or None if the replay file is unavailable.
    This makes the guaranteed-demo replay a genuine DB-sourced fixture rather than a
    static-file special case, so the whole pipeline (list -> snapshot -> quiz -> proof)
    flows through SQLite.
    """
    try:
        envelope = load_replay_envelope()
    except MissingData:
        return None
    # Verify integrity before trusting the file as a seed source.
    if _canonical_hash(envelope) != envelope.get("contentHash"):
        raise MissingData("SNAPSHOT_TAMPERED: replay content hash mismatch during seed")
    fixture_id = str(envelope["fixtureId"])
    snapshot_id = envelope["snapshotId"]
    if storage.snapshot_exists(snapshot_id):
        return fixture_id
    fixture = envelope.get("fixture", {})
    storage.upsert_fixture({
        "FixtureId": fixture_id,
        "CompetitionId": fixture.get("competitionId"),
        "Participant1": envelope["teams"][0],
        "Participant2": envelope["teams"][1],
        "StartTime": fixture.get("startTime"),
        "GameState": 4,
    }, envelope.get("network", "devnet"), envelope["score"].get("sourceTimestamp"))
    storage.save_snapshot(
        snapshot_id=snapshot_id,
        fixture_id=fixture_id,
        snapshot_type="replay",
        payload=envelope,
        network=envelope.get("network", "devnet"),
        data_status=envelope.get("dataStatus", "txline_replay"),
        source_timestamp=envelope["score"].get("sourceTimestamp"),
        sequence=str(envelope["score"].get("sequence")),
        proof_refs=envelope["validation"].get("proofRefs", []),
        content_hash=envelope["contentHash"],
    )
    return fixture_id


# Alias fixture ids that the web/legacy clients may request for the guaranteed replay.
REPLAY_ALIASES = {"argentina-spain", "replay", "demo"}
PREDICTIVE_LIVE_ALIASES = {
    "argentina-spain": ("Spain", "Argentina"),
}


def resolve_fixture_id(fixture_id: str) -> str:
    """Map legacy/alias quiz ids to the seeded replay fixture id."""
    if fixture_id in REPLAY_ALIASES:
        envelope = load_replay_envelope()
        return str(envelope["fixtureId"])
    return fixture_id


def resolve_predictive_fixture_id(fixture_id: str) -> str:
    """Resolve editorial fixture aliases to the live TxLINE fixture when available.

    Predictive progress must never silently fall back to the replay fixture; if the
    live match is not present in TxLINE yet, the caller should remain fail-closed.
    """
    teams = PREDICTIVE_LIVE_ALIASES.get(fixture_id)
    if not teams:
        return fixture_id
    live_fixture = storage.find_fixture_by_teams(*teams)
    return str(live_fixture["fixture_id"]) if live_fixture else fixture_id


def resolve_editorial_alias(fixture_id: str) -> str:
    """Map a live TxLINE fixture id back to its editorial alias (ex.: 18257739 → argentina-spain).

    A leitura editorial é curada por slug textual; quando o cliente navega pelo id numérico
    do fixture live, reconciliamos via os times persistidos pela TxLINE.
    """
    for alias in PREDICTIVE_LIVE_ALIASES:
        if resolve_predictive_fixture_id(alias) == str(fixture_id):
            return alias
    return fixture_id
