from fastapi.testclient import TestClient

from app import main


client = TestClient(main.app)


def test_rpc_proxy_blocks_unknown_method():
    response = client.post('/api/solana/rpc', json={'jsonrpc': '2.0', 'id': 1, 'method': 'getProgramAccounts'})
    assert response.status_code == 403
    assert response.json()['detail']['error'] == 'RPC_METHOD_BLOCKED'


def test_rpc_proxy_forwards_health_without_leaking_url(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {'jsonrpc': '2.0', 'id': 1, 'result': 'ok'}

    monkeypatch.setenv('SOLANA_RPC_URL', 'https://devnet.helius-rpc.com/?api-key=secret')
    monkeypatch.setattr(main.httpx, 'post', lambda *args, **kwargs: Response())
    response = client.post('/api/solana/rpc', json={'jsonrpc': '2.0', 'id': 1, 'method': 'getHealth'})
    assert response.status_code == 200
    assert response.json()['result'] == 'ok'
    assert 'secret' not in response.text


def test_rpc_proxy_mainnet_without_key_stays_fail_closed(monkeypatch):
    monkeypatch.delenv('SOLANA_MAINNET_RPC_URL', raising=False)
    monkeypatch.delenv('HELIUS_API_KEY', raising=False)
    response = client.post('/api/solana/rpc?network=mainnet', json={'jsonrpc': '2.0', 'id': 1, 'method': 'getHealth'})
    assert response.status_code == 503
    assert response.json()['detail']['error'] == 'HELIUS_MAINNET_RPC_MISSING'


def test_rpc_proxy_mainnet_forwards_without_leaking_url(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {'jsonrpc': '2.0', 'id': 1, 'result': 'ok'}

    monkeypatch.setenv('SOLANA_MAINNET_RPC_URL', 'https://mainnet.helius-rpc.com/?api-key=secret-main')
    monkeypatch.setattr(main.httpx, 'post', lambda *args, **kwargs: Response())
    response = client.post('/api/solana/rpc?network=mainnet', json={'jsonrpc': '2.0', 'id': 1, 'method': 'getHealth'})
    assert response.status_code == 200
    assert response.json()['result'] == 'ok'
    assert 'secret-main' not in response.text


def test_solana_status_reports_requested_network(monkeypatch):
    monkeypatch.delenv('SOLANA_MAINNET_RPC_URL', raising=False)
    monkeypatch.delenv('HELIUS_API_KEY', raising=False)
    response = client.get('/api/solana/status?network=mainnet')
    assert response.status_code == 200
    body = response.json()
    assert body['network'] == 'mainnet'
    assert body['rpc_status'] == 'missing'
