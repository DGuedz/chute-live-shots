import base64

from fastapi.testclient import TestClient
from nacl.signing import SigningKey

from app.main import app, _b58decode

client = TestClient(app)

ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def _b58encode(raw: bytes) -> str:
    number = int.from_bytes(raw, "big")
    encoded = ""
    while number:
        number, rem = divmod(number, 58)
        encoded = ALPHABET[rem] + encoded
    pad = len(raw) - len(raw.lstrip(b"\x00"))
    return "1" * pad + encoded


def test_b58_roundtrip():
    raw = bytes(range(32))
    assert _b58decode(_b58encode(raw)) == raw


def test_wallet_session_requires_challenge():
    key = SigningKey.generate()
    public_key = _b58encode(bytes(key.verify_key))
    response = client.post('/api/wallet/session', json={'public_key': public_key, 'signature': base64.b64encode(b'x' * 64).decode()})
    assert response.status_code == 401


def test_wallet_session_rejects_bad_signature():
    key = SigningKey.generate()
    public_key = _b58encode(bytes(key.verify_key))
    client.post('/api/wallet/challenge', json={'public_key': public_key})
    response = client.post('/api/wallet/session', json={'public_key': public_key, 'signature': base64.b64encode(b'y' * 64).decode()})
    assert response.status_code == 401


def test_wallet_session_accepts_valid_signature():
    key = SigningKey.generate()
    public_key = _b58encode(bytes(key.verify_key))
    challenge = client.post('/api/wallet/challenge', json={'public_key': public_key}).json()
    signature = key.sign(challenge['message'].encode()).signature
    response = client.post('/api/wallet/session', json={'public_key': public_key, 'signature': base64.b64encode(signature).decode()})
    assert response.status_code == 200
    assert response.json()['session_status'] == 'signature_verified'
    # Nonce is consumed: replaying the same signature must fail.
    replay = client.post('/api/wallet/session', json={'public_key': public_key, 'signature': base64.b64encode(signature).decode()})
    assert replay.status_code == 401
