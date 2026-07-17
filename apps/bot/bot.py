"""CHUTE Telegram bot — /start abre o Mini App.

Long-polling via stdlib (sem dependências). Uso:

    TELEGRAM_BOT_TOKEN=123:abc WEBAPP_URL=https://chute.example.com python apps/bot/bot.py

O WEBAPP_URL precisa ser HTTPS para o botão web_app funcionar no Telegram.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")
API = f"https://api.telegram.org/bot{BOT_TOKEN}"

START_TEXT = (
    "⚽ *CHUTE · LIVE SHOTS*\n\n"
    "Leia os sinais do jogo, faça seus 5 chutes e prove sua leitura no ranking.\n"
    "Dados verificados via TxLINE · Solana devnet.\n\n"
    "Toque no botão abaixo para entrar no matchday."
)
HELP_TEXT = (
    "Comandos:\n"
    "/start — abrir o CHUTE Mini App\n"
    "/help — esta mensagem\n\n"
    "Cada tier gera 5 perguntas com probabilidade e odd auditáveis. "
    "Modo atual: devnet/paper, sem valor real."
)


def call(method: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"{API}/{method}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=65) as resp:
        return json.load(resp)


def start_keyboard() -> dict:
    if WEBAPP_URL.startswith("https://"):
        button = {"text": "🎯 Jogar o matchday", "web_app": {"url": WEBAPP_URL}}
    else:
        # Fallback para dev local: link normal (web_app exige HTTPS).
        button = {"text": "🎯 Abrir CHUTE", "url": WEBAPP_URL or "https://t.me/chute_app"}
    return {"inline_keyboard": [[button]]}


def handle_update(update: dict) -> None:
    message = update.get("message") or {}
    text = (message.get("text") or "").strip()
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    if not chat_id or not text:
        return
    if text.startswith("/start"):
        call("sendMessage", {
            "chat_id": chat_id,
            "text": START_TEXT,
            "parse_mode": "Markdown",
            "reply_markup": start_keyboard(),
        })
    elif text.startswith("/help"):
        call("sendMessage", {"chat_id": chat_id, "text": HELP_TEXT})


def main() -> None:
    if not BOT_TOKEN:
        sys.exit("TELEGRAM_BOT_TOKEN não configurado.")
    if not WEBAPP_URL:
        print("Aviso: WEBAPP_URL vazio — o botão vai apontar para o canal padrão.")
    print("CHUTE bot: long polling iniciado.")
    offset = 0
    while True:
        try:
            batch = call("getUpdates", {"timeout": 50, "offset": offset, "allowed_updates": ["message"]})
            for update in batch.get("result", []):
                offset = update["update_id"] + 1
                try:
                    handle_update(update)
                except urllib.error.URLError as exc:
                    print(f"Falha ao responder update {update['update_id']}: {exc}")
        except (urllib.error.URLError, TimeoutError) as exc:
            print(f"Polling falhou ({exc}); tentando de novo em 3s.")
            time.sleep(3)
        except KeyboardInterrupt:
            print("Encerrando bot.")
            return


if __name__ == "__main__":
    main()
