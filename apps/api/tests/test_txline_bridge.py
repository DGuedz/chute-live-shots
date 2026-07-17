from fastapi.testclient import TestClient
from app import main

client = TestClient(main.app)


def test_txline_status_is_fail_closed_without_worker(monkeypatch):
    monkeypatch.setattr(main, 'TXLINE_WORKER_URL', 'http://127.0.0.1:18100')
    response = client.get('/api/txline/status')
    body = response.json()
    assert 'configured' in body
    assert body['data_status'] in {'MISSING_DATA', None}
