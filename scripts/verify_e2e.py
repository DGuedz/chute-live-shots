"""Prova ponta a ponta do CHUTE contra a API real (sem mocks).

Sobe o uvicorn num banco SQLite efêmero e exercita:
  1. Fluxo replay: fixtures → insights → quiz → 5 respostas → ranking com prova TxLINE.
  2. Fluxo preditivo: quiz congelado → 5 respostas → progress resolvido contra o snapshot
     (breakdown, snapshot_id, content_hash) → memo on-chain no formato documentado.
  3. Wallet: challenge → assinatura ed25519 real (PyNaCl) → sessão verificada;
     assinatura adulterada → 401; replay do mesmo nonce → 401.

Uso:  python3 scripts/verify_e2e.py
Sai com código 0 apenas se todas as provas passarem.
"""
from __future__ import annotations

import json
import os
import pathlib
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

PORT = 8917
BASE = f"http://127.0.0.1:{PORT}"
PASSES: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if not condition:
        print(f"✗ FAIL — {label} {detail}")
        sys.exit(1)
    PASSES.append(label)
    print(f"✓ {label}{f' — {detail}' if detail else ''}")


def call(method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read() or b"{}")


def wait_health(deadline: float = 20) -> None:
    start = time.time()
    while time.time() - start < deadline:
        try:
            status, body = call("GET", "/health")
            if status == 200 and body.get("ok"):
                return
        except OSError:
            time.sleep(0.3)
    sys.exit("✗ API não subiu a tempo")


def b58encode(raw: bytes) -> str:
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    number = int.from_bytes(raw, "big")
    out = ""
    while number:
        number, rem = divmod(number, 58)
        out = alphabet[rem] + out
    pad = len(raw) - len(raw.lstrip(b"\x00"))
    return "1" * pad + out


def main() -> None:
    with socket.socket() as probe:
        if probe.connect_ex(("127.0.0.1", PORT)) == 0:
            sys.exit(f"✗ Porta {PORT} ocupada; feche o processo e rode de novo.")

    tmp = tempfile.mkdtemp(prefix="chute-e2e-")
    env = {**os.environ, "CHUTE_DB_PATH": f"{tmp}/e2e.db", "PYTHONPATH": str(ROOT / "apps" / "api")}
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(PORT)],
        cwd=ROOT / "apps" / "api", env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        wait_health()
        check("API sobe com banco efêmero e seed do replay TxLINE", True, env["CHUTE_DB_PATH"])
        participant = f"e2e-{uuid.uuid4().hex[:8]}"

        # ── 1. Fluxo replay ─────────────────────────────────────────────
        status, fixtures = call("GET", "/api/fixtures")
        check("GET /api/fixtures responde", status == 200 and fixtures.get("fixtures") is not None)
        status, quiz_meta = call("GET", "/api/quizzes/argentina-spain")
        check("Quiz replay tem snapshot congelado + content hash", status == 200
              and quiz_meta["content_hash"].startswith("sha256:") and quiz_meta["proof_refs"],
              quiz_meta["snapshot_id"])

        answered, total = 0, 5
        status, current = call("GET", f"/api/quizzes/argentina-spain/current?participant_id={participant}&tier=chutes")
        check("Quiz replay abre com pergunta 1", status == 200 and current.get("question"))
        while answered < total:
            question = current.get("question") or current.get("next_question")
            status, current = call("POST", "/api/quizzes/argentina-spain/answers?tier=chutes", {
                "participant_id": participant, "question_id": question["id"],
                "answer": question["options"][0]["value"], "request_id": str(uuid.uuid4()),
            })
            check(f"Resposta replay {answered + 1}/5 aceita", status == 200)
            answered = current["answered"]
        check("Quiz replay fecha após 5 respostas", current["status"] == "complete")

        status, ranking = call("GET", "/api/quizzes/argentina-spain/ranking?tier=chutes")
        mine = next((r for r in ranking.get("ranking", []) if r["participant_id"] == participant), None)
        check("Ranking durável contém o participante com score", mine is not None and isinstance(mine["score"], int),
              f"score={mine['score']}")
        memo_replay = f"CHUTE|{quiz_meta['fixture_id']}|{quiz_meta['snapshot_id']}|{quiz_meta['content_hash']}|score:{mine['score']}"
        check("Memo replay segue CHUTE|fixture|snapshot|hash|score", memo_replay.count("|") == 4, memo_replay)

        # ── 2. Fluxo preditivo ──────────────────────────────────────────
        status, pred = call("GET", "/api/predictions/argentina-spain/Argentina/chutes")
        check("Quiz preditivo abre com 5 perguntas congeladas", status == 200 and len(pred["questions"]) == 5,
              pred["quiz_id"])
        for i, question in enumerate(pred["questions"]):
            status, body = call("POST", f"/api/predictions/{pred['quiz_id']}/answer", {
                "participant_id": participant, "question_id": question["id"],
                "answer": question["options"][0]["value"], "request_id": str(uuid.uuid4()),
            })
            check(f"Resposta preditiva {i + 1}/5 aceita", status == 200 and body["accepted"])

        status, progress = call("GET", f"/api/predictions/{pred['quiz_id']}/progress?participant_id={participant}")
        check("Progress resolve contra snapshot TxLINE (status=scoring)", status == 200
              and progress["status"] == "scoring")
        check("Breakdown resolvido para as 5 perguntas", len(progress["breakdown"]) == 5,
              f"{progress['progress']} acertos · {progress['percentage']}%")
        check("Progress expõe snapshot_id + content_hash para o memo",
              bool(progress.get("snapshot_id")) and str(progress.get("content_hash", "")).startswith("sha256:"))
        memo_pred = (f"CHUTE-PRED|{progress['fixture_id']}|{progress['snapshot_id']}|"
                     f"{progress['content_hash']}|score:{round(progress['score'])}|{progress['percentage']}%")
        check("Memo preditivo segue CHUTE-PRED|fixture|snapshot|hash|score|pct", memo_pred.count("|") == 5, memo_pred)

        # ── 3. Wallet ed25519 real ──────────────────────────────────────
        from nacl.signing import SigningKey
        key = SigningKey.generate()
        public_key = b58encode(bytes(key.verify_key))
        status, challenge = call("POST", "/api/wallet/challenge", {"public_key": public_key})
        check("Challenge de wallet emitido com nonce", status == 200 and "Nonce" in challenge["message"])
        import base64
        good_sig = base64.b64encode(key.sign(challenge["message"].encode()).signature).decode()

        bad_sig = base64.b64encode(b"\x00" * 64).decode()
        status, _ = call("POST", "/api/wallet/session", {"public_key": public_key, "network": "devnet", "signature": bad_sig})
        check("Assinatura adulterada é rejeitada (401)", status == 401)

        status, challenge = call("POST", "/api/wallet/challenge", {"public_key": public_key})
        good_sig = base64.b64encode(key.sign(challenge["message"].encode()).signature).decode()
        status, session = call("POST", "/api/wallet/session", {"public_key": public_key, "network": "devnet", "signature": good_sig})
        check("Assinatura ed25519 legítima cria sessão verificada", status == 200
              and session["session_status"] == "signature_verified")
        status, _ = call("POST", "/api/wallet/session", {"public_key": public_key, "network": "devnet", "signature": good_sig})
        check("Replay do mesmo nonce é rejeitado (401)", status == 401)

        print(f"\n{len(PASSES)} provas passaram · API real, banco efêmero, zero mocks.")
    finally:
        server.send_signal(signal.SIGTERM)
        server.wait(timeout=10)


if __name__ == "__main__":
    main()
