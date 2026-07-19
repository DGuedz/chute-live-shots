from __future__ import annotations

import os
import json
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(os.getenv("CHUTE_DB_PATH") or Path(__file__).resolve().parents[3] / "data" / "chute.db")

def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db

def init_db() -> None:
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS wallet_sessions (public_key TEXT PRIMARY KEY, network TEXT NOT NULL, connected_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS quiz_answers (id INTEGER PRIMARY KEY AUTOINCREMENT, participant_id TEXT NOT NULL, quiz_id TEXT NOT NULL, question_id TEXT NOT NULL, answer TEXT NOT NULL, request_id TEXT NOT NULL UNIQUE, submitted_at TEXT NOT NULL, UNIQUE(participant_id, quiz_id, question_id));
        CREATE INDEX IF NOT EXISTS idx_quiz_answers_participant ON quiz_answers(participant_id, quiz_id, id);
        CREATE TABLE IF NOT EXISTS fixtures (
          fixture_id TEXT PRIMARY KEY,
          competition_id TEXT,
          home_team TEXT NOT NULL,
          away_team TEXT NOT NULL,
          start_time TEXT,
          game_state TEXT,
          network TEXT NOT NULL,
          source_timestamp TEXT,
          raw_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_fixtures_start_time ON fixtures(start_time);
        CREATE TABLE IF NOT EXISTS match_snapshots (
          snapshot_id TEXT PRIMARY KEY,
          fixture_id TEXT NOT NULL,
          snapshot_type TEXT NOT NULL,
          sequence TEXT,
          network TEXT NOT NULL,
          source_timestamp TEXT,
          data_status TEXT NOT NULL,
          proof_refs_json TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          content_hash TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY(fixture_id) REFERENCES fixtures(fixture_id)
        );
        CREATE INDEX IF NOT EXISTS idx_match_snapshots_fixture ON match_snapshots(fixture_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS quiz_sessions (
          participant_id TEXT NOT NULL,
          quiz_id TEXT NOT NULL,
          fixture_id TEXT NOT NULL,
          snapshot_id TEXT NOT NULL,
          content_hash TEXT NOT NULL,
          source_timestamp TEXT,
          locked_at TEXT NOT NULL,
          PRIMARY KEY(participant_id, quiz_id)
        );
        CREATE TABLE IF NOT EXISTS predictive_quiz_sessions (
          participant_id TEXT NOT NULL,
          quiz_id TEXT NOT NULL,
          fixture_id TEXT NOT NULL,
          team TEXT NOT NULL,
          tier TEXT NOT NULL,
          title TEXT NOT NULL,
          questions_json TEXT NOT NULL,
          total INTEGER NOT NULL,
          locked_at TEXT NOT NULL,
          PRIMARY KEY(participant_id, quiz_id)
        );
        CREATE TABLE IF NOT EXISTS wallet_challenges (
          public_key TEXT PRIMARY KEY,
          nonce TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        """)

def set_state(key: str, value: str) -> None:
    with connect() as db:
        db.execute("INSERT INTO app_state(key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')", (key, value))

def get_state(key: str) -> str | None:
    with connect() as db:
        row = db.execute("SELECT value FROM app_state WHERE key=?", (key,)).fetchone()
    return row["value"] if row else None

def save_wallet(public_key: str, network: str = "devnet") -> None:
    with connect() as db:
        db.execute("INSERT INTO wallet_sessions(public_key, network, connected_at, last_seen_at) VALUES (?, ?, datetime('now'), datetime('now')) ON CONFLICT(public_key) DO UPDATE SET last_seen_at=datetime('now'), network=excluded.network", (public_key, network))

def load_answers(participant_id: str, quiz_id: str) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT question_id, answer, request_id FROM quiz_answers WHERE participant_id=? AND quiz_id=? ORDER BY id", (participant_id, quiz_id)).fetchall()
    return [{"question_id": r["question_id"], "answer": _decode(r["answer"]), "request_id": r["request_id"]} for r in rows]

def save_answer(participant_id: str, quiz_id: str, question_id: str, answer: Any, request_id: str) -> None:
    with connect() as db:
        db.execute("INSERT INTO quiz_answers(participant_id, quiz_id, question_id, answer, request_id, submitted_at) VALUES (?, ?, ?, ?, ?, datetime('now'))", (participant_id, quiz_id, question_id, str(answer), request_id))

def request_exists(request_id: str) -> bool:
    with connect() as db:
        return db.execute("SELECT 1 FROM quiz_answers WHERE request_id=?", (request_id,)).fetchone() is not None

def upsert_fixture(payload: dict[str, Any], network: str, source_timestamp: str | None = None) -> dict[str, Any]:
    fixture_id = str(payload.get("FixtureId") or payload.get("fixtureId") or payload.get("id") or "")
    home_team = payload.get("Participant1") or payload.get("participant1") or payload.get("homeTeam")
    away_team = payload.get("Participant2") or payload.get("participant2") or payload.get("awayTeam")
    if not fixture_id or not home_team or not away_team:
        raise ValueError("INVALID_FIXTURE_PAYLOAD")
    record = {
        "fixture_id": fixture_id,
        "competition_id": str(payload.get("CompetitionId") or payload.get("competitionId") or "") or None,
        "home_team": home_team,
        "away_team": away_team,
        "start_time": payload.get("StartTime") or payload.get("startTime"),
        "game_state": str(payload.get("GameState") or payload.get("gameState") or "") or None,
        "network": network,
        "source_timestamp": source_timestamp or payload.get("Ts") or payload.get("timestamp"),
        "raw_json": json.dumps(payload, separators=(",", ":")),
    }
    with connect() as db:
        db.execute("""INSERT INTO fixtures(fixture_id, competition_id, home_team, away_team, start_time, game_state, network, source_timestamp, raw_json, updated_at)
        VALUES (:fixture_id, :competition_id, :home_team, :away_team, :start_time, :game_state, :network, :source_timestamp, :raw_json, datetime('now'))
        ON CONFLICT(fixture_id) DO UPDATE SET competition_id=excluded.competition_id, home_team=excluded.home_team, away_team=excluded.away_team, start_time=excluded.start_time, game_state=excluded.game_state, network=excluded.network, source_timestamp=excluded.source_timestamp, raw_json=excluded.raw_json, updated_at=datetime('now')""", record)
    return record

def save_snapshot(snapshot_id: str, fixture_id: str, snapshot_type: str, payload: dict[str, Any], network: str, data_status: str, source_timestamp: str | None = None, sequence: str | None = None, proof_refs: list[str] | None = None, content_hash: str | None = None) -> None:
    with connect() as db:
        db.execute("""INSERT INTO match_snapshots(snapshot_id, fixture_id, snapshot_type, sequence, network, source_timestamp, data_status, proof_refs_json, payload_json, content_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(snapshot_id) DO UPDATE SET payload_json=excluded.payload_json, source_timestamp=excluded.source_timestamp, data_status=excluded.data_status, proof_refs_json=excluded.proof_refs_json, content_hash=excluded.content_hash""",
                   (snapshot_id, fixture_id, snapshot_type, sequence, network, source_timestamp, data_status, json.dumps(proof_refs or []), json.dumps(payload, separators=(",", ":")), content_hash))

def list_fixtures(limit: int = 50) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("""SELECT f.fixture_id, f.competition_id, f.home_team, f.away_team, f.start_time, f.game_state, f.network, f.source_timestamp, f.updated_at,
        (SELECT s.data_status FROM match_snapshots s WHERE s.fixture_id=f.fixture_id ORDER BY s.created_at DESC LIMIT 1) AS snapshot_status
        FROM fixtures f ORDER BY f.start_time DESC LIMIT ?""", (limit,)).fetchall()
    return [dict(row) for row in rows]

def find_fixture_by_teams(home_team: str, away_team: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute(
            """SELECT fixture_id, competition_id, home_team, away_team, start_time, game_state, network, source_timestamp, updated_at
            FROM fixtures
            WHERE home_team=? AND away_team=?
            ORDER BY start_time DESC, updated_at DESC
            LIMIT 1""",
            (home_team, away_team),
        ).fetchone()
    return dict(row) if row else None

def get_fixture(fixture_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute(
            """SELECT fixture_id, competition_id, home_team, away_team, start_time, game_state, network, source_timestamp, updated_at
            FROM fixtures WHERE fixture_id=?""",
            (str(fixture_id),),
        ).fetchone()
    return dict(row) if row else None

def latest_snapshot(fixture_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT * FROM match_snapshots WHERE fixture_id=? ORDER BY created_at DESC LIMIT 1", (str(fixture_id),)).fetchone()
    if not row:
        return None
    result = dict(row)
    result["proof_refs"] = json.loads(result.pop("proof_refs_json"))
    result["payload"] = json.loads(result.pop("payload_json"))
    return result

def get_snapshot(snapshot_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT * FROM match_snapshots WHERE snapshot_id=?", (snapshot_id,)).fetchone()
    if not row:
        return None
    result = dict(row)
    result["proof_refs"] = json.loads(result.pop("proof_refs_json"))
    result["payload"] = json.loads(result.pop("payload_json"))
    return result

def snapshot_exists(snapshot_id: str) -> bool:
    with connect() as db:
        return db.execute("SELECT 1 FROM match_snapshots WHERE snapshot_id=?", (snapshot_id,)).fetchone() is not None

def lock_quiz_session(participant_id: str, quiz_id: str, fixture_id: str, snapshot_id: str, content_hash: str, source_timestamp: str | None) -> dict[str, Any]:
    """Atomic, idempotent freeze of the snapshot a participant plays against."""
    with connect() as db:
        db.execute("""INSERT INTO quiz_sessions(participant_id, quiz_id, fixture_id, snapshot_id, content_hash, source_timestamp, locked_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(participant_id, quiz_id) DO NOTHING""",
                   (participant_id, quiz_id, str(fixture_id), snapshot_id, content_hash, source_timestamp))
        row = db.execute("SELECT * FROM quiz_sessions WHERE participant_id=? AND quiz_id=?", (participant_id, quiz_id)).fetchone()
    return dict(row)

def get_quiz_session(participant_id: str, quiz_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT * FROM quiz_sessions WHERE participant_id=? AND quiz_id=?", (participant_id, quiz_id)).fetchone()
    return dict(row) if row else None

def lock_predictive_quiz_session(participant_id: str, quiz: dict[str, Any]) -> dict[str, Any]:
    with connect() as db:
        db.execute(
            """INSERT INTO predictive_quiz_sessions(participant_id, quiz_id, fixture_id, team, tier, title, questions_json, total, locked_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(participant_id, quiz_id) DO NOTHING""",
            (
                participant_id,
                quiz["quiz_id"],
                str(quiz["fixture_id"]),
                quiz["team"],
                quiz["tier"],
                quiz["title"],
                json.dumps(quiz["questions"], separators=(",", ":")),
                len(quiz["questions"]),
            ),
        )
        row = db.execute(
            "SELECT * FROM predictive_quiz_sessions WHERE participant_id=? AND quiz_id=?",
            (participant_id, quiz["quiz_id"]),
        ).fetchone()
    result = dict(row)
    result["questions"] = json.loads(result.pop("questions_json"))
    return result

def get_predictive_quiz_session(participant_id: str, quiz_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute(
            "SELECT * FROM predictive_quiz_sessions WHERE participant_id=? AND quiz_id=?",
            (participant_id, quiz_id),
        ).fetchone()
    if not row:
        return None
    result = dict(row)
    result["questions"] = json.loads(result.pop("questions_json"))
    return result

def list_participants(quiz_id: str) -> list[str]:
    with connect() as db:
        rows = db.execute("SELECT DISTINCT participant_id FROM quiz_answers WHERE quiz_id=?", (quiz_id,)).fetchall()
    return [r["participant_id"] for r in rows]

def first_answer_time(participant_id: str, quiz_id: str) -> str:
    with connect() as db:
        row = db.execute("SELECT MIN(submitted_at) AS t FROM quiz_answers WHERE participant_id=? AND quiz_id=?", (participant_id, quiz_id)).fetchone()
    return row["t"] or "9999-12-31T23:59:59"

def save_challenge(public_key: str, nonce: str) -> None:
    with connect() as db:
        db.execute("INSERT INTO wallet_challenges(public_key, nonce, created_at) VALUES (?, ?, datetime('now')) ON CONFLICT(public_key) DO UPDATE SET nonce=excluded.nonce, created_at=datetime('now')", (public_key, nonce))

def pop_challenge(public_key: str, max_age_seconds: int = 300) -> str | None:
    """Return and consume a fresh nonce for a public key; None if absent or stale."""
    with connect() as db:
        row = db.execute("SELECT nonce, created_at FROM wallet_challenges WHERE public_key=? AND created_at >= datetime('now', ?)", (public_key, f"-{max_age_seconds} seconds")).fetchone()
        db.execute("DELETE FROM wallet_challenges WHERE public_key=?", (public_key,))
    return row["nonce"] if row else None

def _decode(value: str) -> Any:
    try: return int(value)
    except ValueError: return value
