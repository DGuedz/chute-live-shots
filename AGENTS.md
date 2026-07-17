# CHUTE Agent Routing

For every task touching the Quiz Engine, TxLINE, Solana, ranking, score, proof or hackathon submission, run the semantic hook before taking action:

```bash
python3 scripts/semantic_skill_hook.py "<user task>"
```

Load the returned skill's `.agent/skills/<skill>/SKILL.md`, then apply the matching `.agent/contracts/<contract>.json`. Do not skip the router because a task appears familiar. If `confidence` is 0 or a required tool is `MISSING_DATA`, report the block and do not fabricate evidence.
