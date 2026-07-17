import json
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).with_name("semantic_skill_hook.py")


def run(task: str) -> dict:
    output = subprocess.check_output([sys.executable, str(SCRIPT), task], text=True)
    return json.loads(output)


def test_routes_stats_to_curator():
    assert run("analise as estatísticas TxLINE de posse e xG")['skill'] == 'txline-stat-curator'


def test_routes_score_to_score_engine():
    assert run("calcule pontuação por exatidão e proximidade")['skill'] == 'quiz-score-engine'


def test_routes_onchain_to_settler():
    assert run("validar prova onchain e settlement Solana")['skill'] == 'txline-solana-proof-settler'


def test_routes_broad_task_to_orchestrator():
    assert run("integrar tudo para a submissão do hackathon")['skill'] == 'chute-quiz-orchestrator'
