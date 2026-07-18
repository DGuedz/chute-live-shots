#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOOK = ROOT / "scripts" / "semantic_skill_hook.py"
ARTIFACT_DIR = ROOT / "artifacts" / "skill-dogfood"

SCENARIOS = [
    {
        "intent": "mapeie a profundidade de mercado e proof coverage da TxLINE para abrir novos tiers",
        "expected_skill": "txline-market-depth-miner",
    },
    {
        "intent": "analise historical priors do TxOdds, volatilidade e zebra para compor quiz",
        "expected_skill": "txodds-historical-prior-analyst",
    },
    {
        "intent": "um creator quer mintar um quiz da comunidade com wallet e fee split",
        "expected_skill": "community-quiz-market-maker",
    },
]

SKILL_FILES = [
    ROOT / ".agent" / "skills" / "txline-market-depth-miner" / "SKILL.md",
    ROOT / ".agent" / "skills" / "txodds-historical-prior-analyst" / "SKILL.md",
    ROOT / ".agent" / "skills" / "community-quiz-market-maker" / "SKILL.md",
    ROOT / ".agent" / "skills" / "chute-market-intelligence-orchestrator" / "SKILL.md",
]

CONTRACT_FILES = [
    ROOT / ".agent" / "contracts" / "txline-market-depth-miner.json",
    ROOT / ".agent" / "contracts" / "txodds-historical-prior-analyst.json",
    ROOT / ".agent" / "contracts" / "community-quiz-market-maker.json",
    ROOT / ".agent" / "contracts" / "chute-market-intelligence-orchestrator.json",
]


def route(intent: str) -> dict:
    output = subprocess.check_output([sys.executable, str(HOOK), intent], text=True, cwd=ROOT)
    return json.loads(output)


def main() -> int:
    checks = []
    for path in SKILL_FILES + CONTRACT_FILES:
        checks.append({
            "kind": "file_presence",
            "target": str(path.relative_to(ROOT)),
            "status": "pass" if path.exists() else "fail",
        })

    for scenario in SCENARIOS:
        result = route(scenario["intent"])
        checks.append({
            "kind": "semantic_route",
            "intent": scenario["intent"],
            "expected_skill": scenario["expected_skill"],
            "actual_skill": result["skill"],
            "confidence": result["confidence"],
            "status": "pass" if result["skill"] == scenario["expected_skill"] else "fail",
        })

    failures = [item for item in checks if item["status"] != "pass"]
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "artifact_type": "market_intelligence_skills_dogfood",
        "status": "ok" if not failures else "fail",
        "summary": {
            "total_checks": len(checks),
            "passed": len(checks) - len(failures),
            "failed": len(failures),
        },
        "checks": checks,
        "recommended_actions": [
            "Promote the branch only if dogfood status stays ok and pytest remains green.",
            "Keep creator-quiz minting behind human approval and dry-run."
        ],
        "blocked_actions": [
            "Do not publish creator monetization as production-ready without runtime implementation.",
            "Do not claim live-proof coverage beyond the audited stat families."
        ],
    }

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    artifact_path = ARTIFACT_DIR / f"market-intelligence-skills-dogfood-{timestamp}.json"
    artifact_path.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({"artifact": str(artifact_path), **report}, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
