from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_and_market():
    assert client.get('/health').status_code == 200
    assert client.get('/api/markets/active').json()['id'] == 'shots-on-target-10m'

def test_position_is_idempotent():
    payload = {'action': 'yes', 'request_id': 'test-request-1'}
    first = client.post('/api/positions', json=payload)
    second = client.post('/api/positions', json=payload)
    assert first.status_code == 200
    assert second.status_code == 409
