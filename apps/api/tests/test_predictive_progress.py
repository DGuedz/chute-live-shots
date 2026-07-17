"""Regressões do fluxo preditivo: parse do quiz_id com alias hifenizado e
resolução do progress contra o snapshot TxLINE seedado."""
import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _answer_all(quiz: dict, participant: str) -> None:
    for question in quiz["questions"]:
        response = client.post(
            f"/api/predictions/{quiz['quiz_id']}/answer",
            json={
                "participant_id": participant,
                "question_id": question["id"],
                "answer": question["options"][0]["value"],
                "request_id": str(uuid.uuid4()),
            },
        )
        assert response.status_code == 200, response.text
        assert response.json()["accepted"] is True


def test_predictive_progress_resolves_hyphenated_fixture_alias():
    participant = f"pytest-{uuid.uuid4().hex[:8]}"
    quiz = client.get("/api/predictions/argentina-spain/Argentina/chutes").json()
    assert quiz["quiz_id"] == "pred-argentina-spain-Argentina-chutes"
    assert len(quiz["questions"]) == 5

    _answer_all(quiz, participant)

    progress = client.get(
        f"/api/predictions/{quiz['quiz_id']}/progress?participant_id={participant}"
    ).json()
    assert progress["status"] == "scoring", progress
    assert len(progress["breakdown"]) == 5
    # Identidade do snapshot exposta para o memo on-chain CHUTE-PRED|fixture|snapshot|hash|...
    assert progress["fixture_id"] == "argentina-spain"
    assert progress["snapshot_id"]
    assert progress["content_hash"].startswith("sha256:")


def test_predictive_progress_before_answers_reports_pending_not_error():
    quiz = client.get("/api/predictions/argentina-spain/Spain/escanteios").json()
    progress = client.get(
        f"/api/predictions/{quiz['quiz_id']}/progress?participant_id=pytest-nobody"
    ).json()
    assert progress["status"] == "no_answers"


def test_predictive_progress_rejects_malformed_quiz_id():
    assert client.get("/api/predictions/pred-broken/progress").status_code == 409
