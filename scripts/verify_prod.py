"""Validação de produção do CHUTE contra as URLs públicas.

Uso:
    python3 scripts/verify_prod.py https://chute-api-XXXX.onrender.com [https://chute-live-shots.vercel.app]

Roda: health, CORS preflight para o web app, fixtures, quiz replay completo
(5 respostas → ranking), fluxo preditivo (5 respostas → progress resolvido)
e o desafio de wallet (sem transação — a ancoragem devnet é manual, via Phantom).
Sai com código 0 apenas se tudo passar.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
import uuid

PASSES: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if not condition:
        print(f"✗ FAIL — {label} {detail}")
        sys.exit(1)
    PASSES.append(label)
    print(f"✓ {label}{f' — {detail}' if detail else ''}")


def call(base: str, method: str, path: str, body: dict | None = None, headers: dict | None = None) -> tuple[int, dict, dict]:
    req = urllib.request.Request(
        base + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.load(resp), dict(resp.headers)
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read() or b"{}"), dict(exc.headers)


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    api = sys.argv[1].rstrip("/")
    web = (sys.argv[2] if len(sys.argv) > 2 else "https://chute-live-shots.vercel.app").rstrip("/")
    participant = f"prod-{uuid.uuid4().hex[:8]}"

    status, body, _ = call(api, "GET", "/health")
    check("API /health em produção", status == 200 and body.get("ok"), api)

    # Preflight CORS como o browser do web app faria
    req = urllib.request.Request(f"{api}/api/fixtures", method="OPTIONS", headers={
        "Origin": web, "Access-Control-Request-Method": "GET"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        allow = resp.headers.get("access-control-allow-origin", "")
    check("CORS libera o web app", allow in (web, "*"), f"allow-origin={allow or '(vazio)'}")

    with urllib.request.urlopen(urllib.request.Request(web), timeout=30) as resp:
        html = resp.read(4096).decode(errors="ignore")
        check("Web app responde com HTML", resp.status == 200 and "<" in html)

    status, fixtures, _ = call(api, "GET", "/api/fixtures")
    check("Fixtures em produção", status == 200 and fixtures.get("fixtures") is not None)

    status, quiz_meta, _ = call(api, "GET", "/api/quizzes/argentina-spain")
    check("Quiz replay com content hash", status == 200 and quiz_meta["content_hash"].startswith("sha256:"))

    status, current, _ = call(api, "GET", f"/api/quizzes/argentina-spain/current?participant_id={participant}&tier=chutes")
    check("Quiz replay abre", status == 200 and current.get("question"))
    answered = 0
    while answered < 5:
        question = current.get("question") or current.get("next_question")
        status, current, _ = call(api, "POST", "/api/quizzes/argentina-spain/answers?tier=chutes", {
            "participant_id": participant, "question_id": question["id"],
            "answer": question["options"][0]["value"], "request_id": str(uuid.uuid4())})
        check(f"Resposta replay {answered + 1}/5", status == 200)
        answered = current["answered"]
    status, ranking, _ = call(api, "GET", "/api/quizzes/argentina-spain/ranking?tier=chutes")
    mine = next((r for r in ranking.get("ranking", []) if r["participant_id"] == participant), None)
    check("Ranking em produção", mine is not None, f"score={mine['score']}")

    status, preview, _ = call(api, "GET", "/api/predictions/argentina-spain/Argentina/chutes")
    check("Preview preditivo em produção não vaza perguntas", status == 200 and "questions" not in preview)
    status, pred, _ = call(api, "POST", "/api/predictions/argentina-spain/Argentina/chutes/start", {"participant_id": participant})
    check("Quiz preditivo inicia em produção", status == 200 and pred["current_question"]["id"] == "q1")
    current_question = pred["current_question"]
    for i in range(pred["total"]):
        status, body, _ = call(api, "POST", f"/api/predictions/{pred['quiz_id']}/answer", {
            "participant_id": participant, "question_id": current_question["id"],
            "answer": current_question["options"][0]["value"], "request_id": str(uuid.uuid4())})
        check(f"Resposta preditiva {i + 1}/5", status == 200 and body["accepted"])
        current_question = body.get("next_question")
    status, progress, _ = call(api, "GET", f"/api/predictions/{pred['quiz_id']}/progress?participant_id={participant}")
    check("Preditivo resolve em produção", status == 200 and progress["status"] == "scoring"
          and len(progress["breakdown"]) == 5,
          f"snapshot={progress.get('snapshot_id')}")

    status, challenge, _ = call(api, "POST", "/api/wallet/challenge",
                                {"public_key": "1" * 44})
    check("Wallet challenge em produção", status == 200 and "Nonce" in challenge["message"])

    print(f"\n{len(PASSES)} validações de produção passaram.")
    print("Pendente manual: ancoragem Memo real na devnet via Phantom no web app (guardar link do Explorer).")


if __name__ == "__main__":
    main()
