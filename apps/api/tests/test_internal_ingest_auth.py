from fastapi.testclient import TestClient

from app import main

client = TestClient(main.app)

FIXTURE = {"FixtureId": 999001, "Participant1": "Team A", "Participant2": "Team B", "StartTime": 0, "GameState": 1}


def test_ingest_open_when_no_service_token_configured(monkeypatch):
    monkeypatch.setattr(main, "SERVICE_TOKEN", "")
    response = client.post("/internal/txline/fixtures", json={"fixtures": [FIXTURE]})
    assert response.status_code == 200


def test_ingest_requires_service_token_when_configured(monkeypatch):
    monkeypatch.setattr(main, "SERVICE_TOKEN", "segredo-local")
    denied = client.post("/internal/txline/fixtures", json={"fixtures": [FIXTURE]})
    assert denied.status_code == 401
    wrong = client.post("/internal/txline/fixtures", json={"fixtures": [FIXTURE]}, headers={"X-Chute-Service-Token": "errado"})
    assert wrong.status_code == 401
    allowed = client.post("/internal/txline/fixtures", json={"fixtures": [FIXTURE]}, headers={"X-Chute-Service-Token": "segredo-local"})
    assert allowed.status_code == 200
