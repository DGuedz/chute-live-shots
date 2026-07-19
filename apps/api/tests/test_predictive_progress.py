"""Regressões do fluxo preditivo: parse do quiz_id com alias hifenizado e
resolução do progress contra o snapshot TxLINE seedado."""
import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.storage import save_snapshot, upsert_fixture

client = TestClient(app)


def _seed_live_fixture_snapshot() -> None:
    upsert_fixture(
        {
            "FixtureId": 18257739,
            "CompetitionId": 72,
            "Participant1": "Spain",
            "Participant2": "Argentina",
            "StartTime": 1784487600000,
            "GameState": 2,
        },
        "devnet",
        "2026-07-18T16:48:37.703Z",
    )
    save_snapshot(
        snapshot_id="txline-live-18257739-1",
        fixture_id="18257739",
        snapshot_type="score",
        payload={
            # Formato real do wire TxLINE: códigos numéricos, não nomes de campo.
            # 1/2=gols 3/4=amarelo 5/6=vermelho 7/8=escanteios (Participant1=Spain/P2=Argentina).
            "score": {"stats": {"1": 2, "2": 1, "3": 1, "4": 2, "7": 6, "8": 3}, "events": []},
            "validation": {"proofRefs": ["proof-live-18257739"], "onChainValidation": {"method": "validateStatV2.view"}},
        },
        network="devnet",
        data_status="txline_live",
        source_timestamp="2026-07-18T16:48:37.703Z",
        sequence="1",
        proof_refs=["proof-live-18257739"],
        content_hash="sha256:test-live-18257739",
    )


def _answer_all(quiz: dict, participant: str) -> None:
    current_question = quiz["current_question"]
    while current_question:
        response = client.post(
            f"/api/predictions/{quiz['quiz_id']}/answer",
            json={
                "participant_id": participant,
                "question_id": current_question["id"],
                "answer": current_question["options"][0]["value"],
                "request_id": str(uuid.uuid4()),
            },
        )
        assert response.status_code == 200, response.text
        assert response.json()["accepted"] is True
        current_question = response.json().get("next_question")


def test_predictive_progress_resolves_hyphenated_fixture_alias():
    _seed_live_fixture_snapshot()
    participant = f"pytest-{uuid.uuid4().hex[:8]}"
    preview = client.get("/api/predictions/argentina-spain/Argentina/gols").json()
    assert preview["status"] == "preview"
    assert preview["quiz_id"] == "pred-argentina-spain-Argentina-gols"
    quiz = client.post(
        "/api/predictions/argentina-spain/Argentina/gols/start",
        json={"participant_id": participant},
    ).json()
    assert quiz["quiz_id"] == "pred-argentina-spain-Argentina-gols"
    assert quiz["current_question"]["id"] == "q1"
    assert quiz["total"] == 5

    _answer_all(quiz, participant)

    progress = client.get(
        f"/api/predictions/{quiz['quiz_id']}/progress?participant_id={participant}"
    ).json()
    assert progress["status"] == "scoring", progress
    assert len(progress["breakdown"]) == 5
    # Identidade do snapshot exposta para o memo on-chain CHUTE-PRED|fixture|snapshot|hash|...
    assert progress["fixture_id"] == "argentina-spain"
    assert progress["resolved_fixture_id"] == "18257739"
    assert progress["snapshot_id"]
    assert progress["content_hash"].startswith("sha256:")
    assert progress["proof_refs"] == ["proof-live-18257739"]
    assert progress["on_chain_validation"]["method"] == "validateStatV2.view"


def test_predictive_progress_before_answers_reports_pending_not_error():
    _seed_live_fixture_snapshot()
    quiz = client.post(
        "/api/predictions/argentina-spain/Spain/escanteios/start",
        json={"participant_id": "pytest-nobody"},
    ).json()
    progress = client.get(
        f"/api/predictions/{quiz['quiz_id']}/progress?participant_id=pytest-nobody"
    ).json()
    assert progress["status"] == "no_answers"


def test_predictive_progress_rejects_malformed_quiz_id():
    assert client.get("/api/predictions/pred-broken/progress").status_code == 409


def test_predictive_resume_rehydrates_open_quiz_without_exposing_future_questions():
    participant = f"pytest-resume-{uuid.uuid4().hex[:8]}"
    preview = client.get("/api/predictions/argentina-spain/Argentina/gols").json()
    assert "questions" not in preview
    quiz = client.post(
        "/api/predictions/argentina-spain/Argentina/gols/start",
        json={"participant_id": participant},
    ).json()

    initial = client.get(f"/api/predictions/{quiz['quiz_id']}/resume?participant_id={participant}")
    assert initial.status_code == 200, initial.text
    payload = initial.json()
    assert payload["status"] == "open"
    assert payload["answered"] == 0
    assert payload["current_question"]["id"] == "q1"
    assert "questions" not in payload

    answered = client.post(
        f"/api/predictions/{quiz['quiz_id']}/answer",
        json={
            "participant_id": participant,
            "question_id": "q1",
            "answer": payload["current_question"]["options"][0]["value"],
            "request_id": str(uuid.uuid4()),
        },
    )
    assert answered.status_code == 200, answered.text
    assert answered.json()["next_question"]["id"] == "q2"

    resumed = client.get(
        f"/api/predictions/{quiz['quiz_id']}/resume?participant_id={participant}"
    ).json()
    assert resumed["status"] == "open"
    assert resumed["answered"] == 1
    assert resumed["answer_refs"] == ["q1"]
    assert resumed["current_question"]["id"] == "q2"


def test_predictive_answer_rejects_skipped_question_order():
    participant = f"pytest-order-{uuid.uuid4().hex[:8]}"
    quiz = client.post(
        "/api/predictions/argentina-spain/Spain/escanteios/start",
        json={"participant_id": participant},
    ).json()
    response = client.post(
        f"/api/predictions/{quiz['quiz_id']}/answer",
        json={
            "participant_id": participant,
            "question_id": "q2",
            "answer": quiz["current_question"]["options"][0]["value"],
            "request_id": str(uuid.uuid4()),
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "unexpected_question_id"
