#!/usr/bin/env python3
"""Deterministic semantic router for CHUTE Quiz Engine tasks.

It emits a route contract; the agent/runtime invokes the selected local skill.
No external action is performed by this hook.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROUTER = ROOT / ".agent" / "semantic-router.json"


def route(task: str) -> dict:
    config = json.loads(ROUTER.read_text())
    normalized = task.casefold()
    scored = []
    for index, item in enumerate(config["routes"]):
        matches = [pattern for pattern in item["patterns"] if pattern.casefold() in normalized]
        scored.append((len(matches), -index, item, matches))
    scored.sort(reverse=True, key=lambda row: (row[0], row[1]))
    score, _, selected, matches = scored[0]
    if score == 0:
        selected = {"skill": config["default_skill"], "contract": "quiz-engine-orchestration"}
        matches = []
    requires_evidence = selected["skill"] in config["guards"]["requires_evidence_for"]
    requires_dry_run = selected["skill"] in config["guards"]["requires_dry_run_for"]
    return {
        "hook": "chute.semantic_skill_hook",
        "skill": selected["skill"],
        "contract": selected["contract"],
        "confidence": round(min(1.0, score / 3), 2) if score else 0,
        "matched_patterns": matches,
        "requires_evidence": requires_evidence,
        "dry_run_required": requires_dry_run,
        "next_action": f"Load .agent/skills/{selected['skill']}/SKILL.md and apply its contract.",
    }


def main() -> int:
    task = " ".join(sys.argv[1:]).strip()
    if not task:
        print(json.dumps({"error": "TASK_REQUIRED"}, ensure_ascii=False))
        return 2
    print(json.dumps(route(task), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
