from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS_DIR = ROOT / ".agent" / "skills"
CONTRACTS_DIR = ROOT / ".agent" / "contracts"
ROUTER = ROOT / ".agent" / "semantic-router.json"
HOOK = ROOT / "scripts" / "semantic_skill_hook.py"

SKILLS = {
    "txline-market-depth-miner": {
        "contract": "txline-market-depth-miner.json",
        "phrases": ["proof coverage", "market depth"],
    },
    "txodds-historical-prior-analyst": {
        "contract": "txodds-historical-prior-analyst.json",
        "phrases": ["historical priors", "zebra"],
    },
    "community-quiz-market-maker": {
        "contract": "community-quiz-market-maker.json",
        "phrases": ["creator", "mint"],
    },
}


def parse_frontmatter(path: Path) -> dict[str, str]:
    content = path.read_text()
    match = re.match(r"---\n(.*?)\n---\n", content, re.DOTALL)
    assert match, f"frontmatter ausente em {path}"
    result: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        result[key.strip()] = value.strip().strip('"')
    return result


def route(task: str) -> dict:
    output = subprocess.check_output([sys.executable, str(HOOK), task], text=True, cwd=ROOT)
    return json.loads(output)


def test_router_registers_new_skills():
    router = json.loads(ROUTER.read_text())
    routes = {item["skill"]: item for item in router["routes"]}
    for skill in SKILLS:
        assert skill in routes


def test_skill_files_have_required_frontmatter_and_usage_triggers():
    for skill, meta in SKILLS.items():
        skill_path = SKILLS_DIR / skill / "SKILL.md"
        frontmatter = parse_frontmatter(skill_path)
        assert frontmatter["name"] == skill
        description = frontmatter["description"].lower()
        assert "invoke when" in description
        for phrase in meta["phrases"]:
            assert phrase.lower() in skill_path.read_text().lower()


def test_contracts_have_core_fields_and_safe_controls():
    for skill, meta in SKILLS.items():
        contract_path = CONTRACTS_DIR / meta["contract"]
        contract = json.loads(contract_path.read_text())
        assert contract["objective"]
        assert contract["description"]
        assert "confidence_score" in contract["outputs"]["required"]
        assert "blocked_actions" in contract["outputs"]["required"]
        assert contract["evidence_required"] is True


def test_creator_flow_contract_requires_wallet_and_human_gate():
    contract = json.loads((CONTRACTS_DIR / "community-quiz-market-maker.json").read_text())
    assert contract["requires_human_approval"] is True
    assert "write_solana_only_after_approval" in contract["required_permissions"]
    assert "minting a creator quiz" in contract["human_approval_required_for"]


def test_orchestrator_contract_lists_new_child_skills():
    contract = json.loads((CONTRACTS_DIR / "chute-market-intelligence-orchestrator.json").read_text())
    required_children = contract["example_json"]["output"]["required_child_skills"]
    assert "txline-market-depth-miner" in required_children
    assert "txodds-historical-prior-analyst" in required_children
    assert "community-quiz-market-maker" in required_children


def test_router_dogfoods_new_skill_intents():
    assert route("mapeie a profundidade de mercado e statkeys com proof coverage")["skill"] == "txline-market-depth-miner"
    assert route("analise os historical priors do TxOdds, volatilidade e zebra")["skill"] == "txodds-historical-prior-analyst"
    assert route("um creator quer mintar um quiz da comunidade com fee split")["skill"] == "community-quiz-market-maker"
