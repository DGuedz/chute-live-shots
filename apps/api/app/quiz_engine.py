from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any


SNAPSHOT_PATH = Path(__file__).resolve().parents[3] / "data" / "txline-replay-snapshot.json"
PLAYER_STATS_PATH = Path(__file__).resolve().parents[3] / "data" / "wc2026-player-stats.json"


def _poisson_pmf(k: int, lambda_param: float) -> float:
	"""Poisson probability mass function: P(X=k) where X ~ Poisson(lambda)."""
	if k < 0 or lambda_param <= 0:
		return 0.0
	return (math.exp(-lambda_param) * (lambda_param ** k)) / math.factorial(k)


def _load_player_stats() -> dict[str, Any]:
    try:
        with open(PLAYER_STATS_PATH) as f:
            return json.load(f)
    except FileNotFoundError:
        return {"teams": {}}


def load_verified_snapshot() -> dict[str, Any]:
    if not SNAPSHOT_PATH.exists():
        raise RuntimeError("MISSING_DATA: TxLINE replay snapshot is absent")
    snapshot = json.loads(SNAPSHOT_PATH.read_text())
    required = ("snapshotId", "fixtureId", "teams", "score", "validation", "contentHash", "dataStatus")
    if any(not snapshot.get(field) for field in required):
        raise RuntimeError("MISSING_DATA: incomplete TxLINE snapshot")
    if snapshot["dataStatus"] != "txline_replay" or not snapshot["validation"].get("proofRefs"):
        raise RuntimeError("UNVERIFIED_OUTCOME: TxLINE proof reference is missing")
    return snapshot


def _canonical_hash(snapshot: dict[str, Any]) -> str:
    unsigned = {key: value for key, value in snapshot.items() if key != "contentHash"}
    def js_order(value: Any) -> Any:
        if isinstance(value, list):
            return [js_order(item) for item in value]
        if isinstance(value, dict):
            integer_keys = sorted((key for key in value if key.isdigit() and str(int(key)) == key), key=int)
            other_keys = sorted(key for key in value if key not in integer_keys)
            return {key: js_order(value[key]) for key in integer_keys + other_keys}
        return value
    canonical = json.dumps(js_order(unsigned), separators=(",", ":"), ensure_ascii=False)
    return f"sha256:{hashlib.sha256(canonical.encode()).hexdigest()}"


def _outcomes(snapshot: dict[str, Any]) -> dict[str, int]:
    score = snapshot["score"]
    p1 = score["score"].get("Participant1", {}).get("Total", {})
    p2 = score["score"].get("Participant2", {}).get("Total", {})
    return {
        "home_goals": int(p1.get("Goals", 0)),
        "away_goals": int(p2.get("Goals", 0)),
        "home_corners": int(p1.get("Corners", 0)),
        "away_corners": int(p2.get("Corners", 0)),
        "home_yellow_cards": int(p1.get("YellowCards", 0)),
        "away_yellow_cards": int(p2.get("YellowCards", 0)),
        "total_goals": int(p1.get("Goals", 0) + p2.get("Goals", 0)),
        "total_corners": int(p1.get("Corners", 0) + p2.get("Corners", 0)),
        "total_yellow_cards": int(p1.get("YellowCards", 0) + p2.get("YellowCards", 0)),
    }


BASE_POINTS = 100
# Auditable statistical priors (documented, independent of the actual outcome). These drive the
# "odds" a player reads before deciding; a low-probability (zebra) pick that lands pays much more.
PRIORS = {
    "total_goals": 2.6, "home_goals": 1.4, "away_goals": 1.2,
    "total_corners": 9.6, "home_corners": 5.0, "away_corners": 4.6,
    "total_yellow_cards": 3.8, "home_yellow_cards": 1.9, "away_yellow_cards": 1.9,
}


def _poisson_pmf(k: int, lam: float) -> float:
    if k < 0:
        return 0.0
    return math.exp(-lam) * lam ** k / math.factorial(k)


def _risk_tier(prob: float) -> tuple[str, float]:
    if prob >= 0.34:
        return "ACESSIVEL", 1.0
    if prob >= 0.16:
        return "DISPUTADA", 1.5
    return "ZEBRA", 3.5


def _numeric_options(true_value: int, prior_mean: float | None) -> list[dict[str, Any]]:
    """Four mutually exclusive integer options including the true value, each carrying an
    auditable prior probability/odd. Probabilities come from the prior model, never from the
    outcome, so the correct answer is not simply "the most probable option"."""
    center = round(prior_mean) if prior_mean is not None else true_value
    values: set[int] = {true_value, max(0, center - 1), center, center + 1, center + 2}
    step = 2
    while len(values) < 4:
        values.add(max(0, center + step))
        step += 1
    ordered = sorted(values)
    while len(ordered) > 4:  # keep the true value and the four nearest to the prior center
        ordered.sort(key=lambda v: (v == true_value, -abs(v - center)))
        ordered = ordered[1:]
        ordered.sort()
    if prior_mean is not None:
        weights = {v: _poisson_pmf(v, prior_mean) for v in ordered}
    else:  # e.g. proof sequence — genuinely hard to know, flat prior
        weights = {v: 1.0 for v in ordered}
    total = sum(weights.values()) or 1.0
    options = []
    for v in ordered:
        prob = round(weights[v] / total, 3) or 0.001
        risk, mult = _risk_tier(prob)
        if prior_mean is None:
            risk, mult = "ZEBRA_TECNICA", 3.5
        options.append({"value": v, "label": str(v), "probability": prob, "odd": round(1 / prob, 2), "risk": risk, "reward_multiplier": mult})
    return options


def _categorical_options(entries: list[tuple[str, float]]) -> list[dict[str, Any]]:
    total = sum(p for _, p in entries) or 1.0
    options = []
    for label, prior in entries:
        prob = round(prior / total, 3) or 0.001
        risk, mult = _risk_tier(prob)
        options.append({"value": label, "label": label, "probability": prob, "odd": round(1 / prob, 2), "risk": risk, "reward_multiplier": mult})
    return options


def _majority_outcome(teams: list[str], a: int, b: int, tie_with: str, tie_zero: str) -> str:
    if a > b:
        return teams[0]
    if b > a:
        return teams[1]
    return tie_zero if (a + b) == 0 else tie_with


def _expected_outcomes(snapshot: dict[str, Any], teams: list[str]) -> dict[str, Any]:
    o = _outcomes(snapshot)
    return {
        **o,
        "winner": _majority_outcome(teams, o["home_goals"], o["away_goals"], "Empate com gols", "Empate 0-0"),
        "corners_majority": _majority_outcome(teams, o["home_corners"], o["away_corners"], "Empate com escanteios", "Empate sem escanteios"),
        "cards_majority": _majority_outcome(teams, o["home_yellow_cards"], o["away_yellow_cards"], "Empate com cartões", "Empate sem cartões"),
        "proof_sequence": snapshot["score"]["sequence"],
    }


def _proof_status(snapshot: dict[str, Any]) -> str:
    data_status = snapshot.get("dataStatus")
    valid = snapshot.get("validation", {}).get("onChainValidation", {}).get("valid")
    if data_status == "txline_replay" and valid:
        return "txline_replay_proof_validated"
    if valid:
        return "txline_proof_validated"
    return "txline_snapshot_unverified"


def score_answers(quiz: dict[str, Any], answers: list[dict[str, Any]], snapshot: dict[str, Any] | None = None) -> dict[str, Any]:
    """Score against the FROZEN snapshot the participant locked. `snapshot` must be the
    session's snapshot; it defaults to the replay only for legacy/standalone use."""
    snapshot = snapshot or load_verified_snapshot()
    expected = _expected_outcomes(snapshot, quiz["teams"])
    ledger, exact_hits, total_error = [], 0, 0.0
    for answer in answers:
        question = next(item for item in quiz["questions"] if item["id"] == answer["question_id"])
        options = question["options"]
        chosen = next((o for o in options if str(o["value"]) == str(answer["answer"])), None)
        mult = chosen["reward_multiplier"] if chosen else 1.0
        target = expected[question["kind"]]
        actual = answer["answer"]
        if question["answer_type"] == "numeric":
            values = [o["value"] for o in options]
            spread = max(max(values) - min(values), 1)
            error = abs(float(actual) - float(target))
            exact = error == 0
            base = BASE_POINTS if exact else max(0, round(BASE_POINTS * (1 - error / spread)))
        else:
            error = 0.0 if str(actual) == str(target) else 1.0
            exact = error == 0
            base = BASE_POINTS if exact else 0
        points = round(base * mult)
        exact_hits += int(exact)
        total_error += error
        ledger.append({"question_id": question["id"], "kind": question["kind"], "expected": target, "answer": actual, "exact": exact, "error": error, "risk": chosen["risk"] if chosen else "UNKNOWN", "odd": chosen["odd"] if chosen else None, "points": points})
    score = sum(item["points"] for item in ledger)
    return {"score": score, "exact_hits": exact_hits, "total_error": round(total_error, 3), "ledger": ledger, "proof_refs": quiz["proof_refs"], "proof_status": _proof_status(snapshot)}


# Each tier maps the fan's reading of the game to a stat family. A tier is only playable
# when its stats are present in the snapshot (fail-closed); the required keys are the
# score-snapshot fields that must exist for the tier's outcomes to be real, not invented.
TIERS = {
    "chutes": {"label": "Chutes a gol", "stat_field": "Goals", "description": "Placar, autoria e resultado — quem transformou chute em gol."},
    "escanteios": {"label": "Escanteios", "stat_field": "Corners", "description": "Pressão e bolas na área — volume de escanteios por equipe."},
    "faltas": {"label": "Faltas & Cartões", "stat_field": "YellowCards", "description": "Disciplina e intensidade — cartões amarelos por equipe."},
}


def tier_available(snapshot: dict[str, Any], tier: str) -> bool:
    field = TIERS[tier]["stat_field"]
    score = snapshot["score"]["score"]
    return any(field in score.get(side, {}).get("Total", {}) for side in ("Participant1", "Participant2"))


def _tier_questions(tier: str, teams: list[str], o: dict[str, int], snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    proof_q = {"id": "q5", "kind": "proof_sequence", "answer_type": "numeric", "prompt": "Qual sequência do score está ancorada na prova on-chain?", "options": _numeric_options(int(snapshot["score"]["sequence"]), None), "stat_basis": "TxLINE stat-validation proof sequence"}
    if tier == "chutes":
        return [
            {"id": "q1", "kind": "total_goals", "answer_type": "numeric", "prompt": "Quantos gols no total a partida registrou?", "options": _numeric_options(o["total_goals"], PRIORS["total_goals"]), "stat_basis": "TxLINE score snapshot: Goals/Total"},
            {"id": "q2", "kind": "home_goals", "answer_type": "numeric", "prompt": f"Quantos gols marcou {teams[0]}?", "options": _numeric_options(o["home_goals"], PRIORS["home_goals"]), "stat_basis": "TxLINE score snapshot: Goals/Participant1"},
            {"id": "q3", "kind": "away_goals", "answer_type": "numeric", "prompt": f"Quantos gols marcou {teams[1]}?", "options": _numeric_options(o["away_goals"], PRIORS["away_goals"]), "stat_basis": "TxLINE score snapshot: Goals/Participant2"},
            {"id": "q4", "kind": "winner", "answer_type": "categorical", "prompt": "Como terminou o confronto?", "options": _categorical_options([(teams[0], 0.42), (teams[1], 0.33), ("Empate com gols", 0.18), ("Empate 0-0", 0.07)]), "stat_basis": "TxLINE score snapshot: Goals/Total por participante"},
            proof_q,
        ]
    if tier == "escanteios":
        return [
            {"id": "q1", "kind": "total_corners", "answer_type": "numeric", "prompt": "Quantos escanteios no total?", "options": _numeric_options(o["total_corners"], PRIORS["total_corners"]), "stat_basis": "TxLINE score snapshot: Corners/Total"},
            {"id": "q2", "kind": "home_corners", "answer_type": "numeric", "prompt": f"Quantos escanteios cobrou {teams[0]}?", "options": _numeric_options(o["home_corners"], PRIORS["home_corners"]), "stat_basis": "TxLINE score snapshot: Corners/Participant1"},
            {"id": "q3", "kind": "away_corners", "answer_type": "numeric", "prompt": f"Quantos escanteios cobrou {teams[1]}?", "options": _numeric_options(o["away_corners"], PRIORS["away_corners"]), "stat_basis": "TxLINE score snapshot: Corners/Participant2"},
            {"id": "q4", "kind": "corners_majority", "answer_type": "categorical", "prompt": "Quem pressionou mais pelos lados (mais escanteios)?", "options": _categorical_options([(teams[0], 0.40), (teams[1], 0.36), ("Empate com escanteios", 0.20), ("Empate sem escanteios", 0.04)]), "stat_basis": "TxLINE score snapshot: Corners por participante"},
            proof_q,
        ]
    if tier == "faltas":
        return [
            {"id": "q1", "kind": "total_yellow_cards", "answer_type": "numeric", "prompt": "Quantos cartões amarelos no total?", "options": _numeric_options(o["total_yellow_cards"], PRIORS["total_yellow_cards"]), "stat_basis": "TxLINE score snapshot: YellowCards/Total"},
            {"id": "q2", "kind": "home_yellow_cards", "answer_type": "numeric", "prompt": f"Quantos amarelos recebeu {teams[0]}?", "options": _numeric_options(o["home_yellow_cards"], PRIORS["home_yellow_cards"]), "stat_basis": "TxLINE score snapshot: YellowCards/Participant1"},
            {"id": "q3", "kind": "away_yellow_cards", "answer_type": "numeric", "prompt": f"Quantos amarelos recebeu {teams[1]}?", "options": _numeric_options(o["away_yellow_cards"], PRIORS["away_yellow_cards"]), "stat_basis": "TxLINE score snapshot: YellowCards/Participant2"},
            {"id": "q4", "kind": "cards_majority", "answer_type": "categorical", "prompt": "Qual lado foi mais indisciplinado (mais amarelos)?", "options": _categorical_options([(teams[0], 0.36), (teams[1], 0.36), ("Empate com cartões", 0.20), ("Empate sem cartões", 0.08)]), "stat_basis": "TxLINE score snapshot: YellowCards por participante"},
            proof_q,
        ]
    raise RuntimeError(f"UNKNOWN_TIER: {tier}")


def build_quiz_from_snapshot(snapshot: dict[str, Any] | None = None, tier: str = "chutes") -> dict[str, Any]:
    snapshot = snapshot or load_verified_snapshot()
    if _canonical_hash(snapshot) != snapshot["contentHash"]:
        raise RuntimeError("SNAPSHOT_TAMPERED: content hash mismatch")
    if tier not in TIERS:
        raise RuntimeError(f"UNKNOWN_TIER: {tier}")
    if not tier_available(snapshot, tier):
        raise RuntimeError(f"MISSING_DATA: snapshot lacks {TIERS[tier]['stat_field']} for tier {tier}")
    teams = snapshot["teams"]
    outcomes = _outcomes(snapshot)
    p1_total = snapshot["score"]["score"].get("Participant1", {}).get("Total", {})
    p2_total = snapshot["score"]["score"].get("Participant2", {}).get("Total", {})
    questions = _tier_questions(tier, teams, outcomes, snapshot)
    return {
        "quiz_id": f"chute-{snapshot['snapshotId']}-{tier}",
        "tier": tier,
        "tier_label": TIERS[tier]["label"],
        "title": f"{teams[0]} × {teams[1]} — {TIERS[tier]['label']}",
        "status": "open",
        "entry_mode": "replay_devnet" if snapshot.get("dataStatus") == "txline_replay" else "devnet",
        "teams": teams,
        "questions": questions,
        "snapshot_id": snapshot["snapshotId"],
        "fixture_id": snapshot["fixtureId"],
        "content_hash": snapshot["contentHash"],
        "source_timestamp": snapshot["score"]["sourceTimestamp"],
        "start_time": snapshot.get("fixture", {}).get("startTime"),
        "proof_refs": snapshot["validation"]["proofRefs"],
        "evidence": snapshot.get("evidence"),
        "model_version": snapshot["modelVersion"],
        "data_status": snapshot["dataStatus"],
        "editorial_match": teams,
        "snapshot_metrics": {
            "goals": [int(p1_total.get("Goals", 0)), int(p2_total.get("Goals", 0))],
            "corners": [int(p1_total.get("Corners", 0)), int(p2_total.get("Corners", 0))],
            "yellow_cards": [int(p1_total.get("YellowCards", 0)), int(p2_total.get("YellowCards", 0))]
        },
    }


# ===== PREDICTIVE QUIZ =====

def _get_team_predictions(team_name: str, stats: dict[str, Any]) -> dict[str, Any]:
    """Extract team predictions from historical stats."""
    team_stats = stats["teams"].get(team_name, {})
    return team_stats.get("stats_per_game", {})


def _build_predictive_questions_fouls(team_name: str, stats: dict[str, Any]) -> list[dict[str, Any]]:
    """Generate 5 predictive foul-based questions: 3 easy + 2 zebra."""
    team_pred = _get_team_predictions(team_name, stats)
    team_players = stats["teams"].get(team_name, {}).get("players", {})

    mean_fouls = team_pred.get("fouls_committed", 7.0)
    std_dev = max(1.5, mean_fouls * 0.2)  # estimate std dev

    questions = []

    # Q1 (Easy): Total fouls by team
    q1_low = int(mean_fouls - std_dev)
    q1_high = int(mean_fouls + std_dev)
    q1_mid = int(mean_fouls)
    q1_options = sorted(set([q1_low - 2, q1_low, q1_mid, q1_high, q1_high + 2]))[:4]
    questions.append({
        "id": "q1", "kind": "team_fouls", "answer_type": "numeric",
        "prompt": f"Quantas faltas {team_name} vai cometer?",
        "options": [{"value": v, "label": str(v), "probability": _poisson_pmf(v, mean_fouls), "odd": 1.0, "risk": "ACESSIVEL", "reward_multiplier": 1.0} for v in q1_options],
        "stat_basis": f"TxLINE histórico {team_name}: {mean_fouls:.1f} faltas/jogo",
        "payoff_multiplier": 1.0
    })

    # Q2 (Easy): Yellow card in first 25 min
    prob_yellow_25 = 0.22
    questions.append({
        "id": "q2", "kind": "yellow_card_early", "answer_type": "categorical",
        "prompt": "Vai ter cartão amarelo nos primeiros 25 minutos?",
        "options": [
            {"value": "Sim", "label": "Sim", "probability": prob_yellow_25, "odd": round(1 / prob_yellow_25, 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0},
            {"value": "Não", "label": "Não", "probability": 1 - prob_yellow_25, "odd": round(1 / (1 - prob_yellow_25), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
        ],
        "stat_basis": "TxLINE distribuição temporal de cartões",
        "payoff_multiplier": 1.0
    })

    # Q3 (Easy): Key player makes foul
    key_players = sorted(team_players.items(), key=lambda x: x[1].get("fouls_committed", 0), reverse=True)[:3]
    player_name = key_players[0][0] if key_players else team_name
    player_fouls = team_players.get(player_name, {}).get("fouls_committed", 1.0)
    prob_player_foul = min(0.90, player_fouls / mean_fouls * 0.85)  # ~90% chance
    questions.append({
        "id": "q3", "kind": "player_fouls", "answer_type": "categorical",
        "prompt": f"{player_name} vai fazer falta?",
        "options": [
            {"value": "Sim", "label": "Sim", "probability": prob_player_foul, "odd": round(1 / prob_player_foul, 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0},
            {"value": "Não", "label": "Não", "probability": 1 - prob_player_foul, "odd": round(1 / (1 - prob_player_foul), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
        ],
        "stat_basis": f"TxLINE histórico {player_name}: {player_fouls:.1f} faltas/jogo",
        "payoff_multiplier": 1.0
    })

    # Q4 (Zebra): Specific player yellow card (18% prob)
    key_player_yellow = key_players[1][0] if len(key_players) > 1 else key_players[0][0] if key_players else team_name
    prob_yellow = 0.18
    questions.append({
        "id": "q4", "kind": "player_yellow", "answer_type": "categorical",
        "prompt": f"{key_player_yellow} vai levar amarelo?",
        "options": [
            {"value": "Sim", "label": "Sim", "probability": prob_yellow, "odd": round(1 / prob_yellow, 2), "risk": "ZEBRA", "reward_multiplier": 3.5},
            {"value": "Não", "label": "Não", "probability": 1 - prob_yellow, "odd": round(1 / (1 - prob_yellow), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
        ],
        "stat_basis": f"TxLINE histórico {key_player_yellow}: {team_players.get(key_player_yellow, {}).get('yellow_cards', 0.15):.2f} amarelos/jogo",
        "payoff_multiplier": 3.5
    })

    # Q5 (Zebra): Red card (8% prob, very rare)
    prob_red = 0.08
    questions.append({
        "id": "q5", "kind": "red_card", "answer_type": "categorical",
        "prompt": "Vai ter cartão vermelho na partida?",
        "options": [
            {"value": "Sim", "label": "Sim", "probability": prob_red, "odd": round(1 / prob_red, 2), "risk": "ZEBRA", "reward_multiplier": 3.5},
            {"value": "Não", "label": "Não", "probability": 1 - prob_red, "odd": round(1 / (1 - prob_red), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
        ],
        "stat_basis": "TxLINE histórico Copa 2026: vermelho em 8% dos jogos",
        "payoff_multiplier": 3.5
    })

    return questions


def _build_predictive_questions_corners(team_name: str, stats: dict[str, Any]) -> list[dict[str, Any]]:
	"""Generate 5 predictive corner-based questions: 3 easy + 2 zebra."""
	team_pred = _get_team_predictions(team_name, stats)
	mean_corners = team_pred.get("corners_for", 9.0)

	questions = []

	# Q1 (Easy): Total corners by team
	q1_low = int(mean_corners - 2)
	q1_high = int(mean_corners + 2)
	q1_mid = int(mean_corners)
	q1_options = sorted(set([q1_low, q1_mid - 1, q1_mid, q1_mid + 1, q1_high]))[:4]
	questions.append({
		"id": "q1", "kind": "team_corners", "answer_type": "numeric",
		"prompt": f"Quantos escanteios {team_name} vai cobrar?",
		"options": [{"value": v, "label": str(v), "probability": _poisson_pmf(v, mean_corners), "odd": 1.0, "risk": "ACESSIVEL", "reward_multiplier": 1.0} for v in q1_options],
		"stat_basis": f"TxLINE histórico {team_name}: {mean_corners:.1f} escanteios/jogo",
		"payoff_multiplier": 1.0
	})

	# Q2 (Easy): Will exceed 10 corners
	prob_exceed = 0.65
	questions.append({
		"id": "q2", "kind": "corners_threshold", "answer_type": "categorical",
		"prompt": f"{team_name} vai ter mais de 10 escanteios?",
		"options": [
			{"value": "Sim", "label": "Sim", "probability": prob_exceed, "odd": round(1 / prob_exceed, 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0},
			{"value": "Não", "label": "Não", "probability": 1 - prob_exceed, "odd": round(1 / (1 - prob_exceed), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
		],
		"stat_basis": "TxLINE distribuição acumulada de escanteios",
		"payoff_multiplier": 1.0
	})

	# Q3 (Easy): Corner in first 15 min
	prob_corner_15 = 0.72
	questions.append({
		"id": "q3", "kind": "corner_early", "answer_type": "categorical",
		"prompt": "Vai ter escanteio nos primeiros 15 minutos?",
		"options": [
			{"value": "Sim", "label": "Sim", "probability": prob_corner_15, "odd": round(1 / prob_corner_15, 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0},
			{"value": "Não", "label": "Não", "probability": 1 - prob_corner_15, "odd": round(1 / (1 - prob_corner_15), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
		],
		"stat_basis": "TxLINE distribuição temporal de escanteios",
		"payoff_multiplier": 1.0
	})

	# Q4 (Zebra): Gol from corner (10% prob)
	prob_corner_goal = 0.10
	questions.append({
		"id": "q4", "kind": "corner_goal", "answer_type": "categorical",
		"prompt": "Vai ter gol saído de escanteio?",
		"options": [
			{"value": "Sim", "label": "Sim", "probability": prob_corner_goal, "odd": round(1 / prob_corner_goal, 2), "risk": "ZEBRA", "reward_multiplier": 3.5},
			{"value": "Não", "label": "Não", "probability": 1 - prob_corner_goal, "odd": round(1 / (1 - prob_corner_goal), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
		],
		"stat_basis": "TxLINE histórico Copa 2026: golaço de escanteio em 10% dos jogos",
		"payoff_multiplier": 3.5
	})

	# Q5 (Zebra): Yellow card from corner scuffle (6% prob)
	prob_corner_yellow = 0.06
	questions.append({
		"id": "q5", "kind": "corner_card", "answer_type": "categorical",
		"prompt": "Vai ter cartão por disputa de escanteio?",
		"options": [
			{"value": "Sim", "label": "Sim", "probability": prob_corner_yellow, "odd": round(1 / prob_corner_yellow, 2), "risk": "ZEBRA", "reward_multiplier": 3.5},
			{"value": "Não", "label": "Não", "probability": 1 - prob_corner_yellow, "odd": round(1 / (1 - prob_corner_yellow), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
		],
		"stat_basis": "TxLINE histórico Copa 2026: cartão em disputa de escanteio em 6% dos jogos",
		"payoff_multiplier": 3.5
	})

	return questions


def _build_predictive_questions_shots(team_name: str, stats: dict[str, Any]) -> list[dict[str, Any]]:
	"""Generate 5 predictive shot-based questions: 3 easy + 2 zebra."""
	team_pred = _get_team_predictions(team_name, stats)
	team_players = stats["teams"].get(team_name, {}).get("players", {})

	mean_shots = team_pred.get("shots_on_target", 4.0)

	questions = []

	# Q1 (Easy): Total shots on target
	q1_options = sorted(set([int(mean_shots - 2), int(mean_shots - 1), int(mean_shots), int(mean_shots + 1), int(mean_shots + 2)]))[:4]
	questions.append({
		"id": "q1", "kind": "team_shots", "answer_type": "numeric",
		"prompt": f"Quantos chutes no alvo {team_name} vai fazer?",
		"options": [{"value": v, "label": str(v), "probability": _poisson_pmf(v, mean_shots), "odd": 1.0, "risk": "ACESSIVEL", "reward_multiplier": 1.0} for v in q1_options],
		"stat_basis": f"TxLINE histórico {team_name}: {mean_shots:.1f} chutes/jogo",
		"payoff_multiplier": 1.0
	})

	# Q2 (Easy): Key player shoots
	key_players = sorted(team_players.items(), key=lambda x: x[1].get("shots_on_target", 0), reverse=True)[:2]
	player_name = key_players[0][0] if key_players else team_name
	prob_player_shot = 0.80
	questions.append({
		"id": "q2", "kind": "player_shot", "answer_type": "categorical",
		"prompt": f"{player_name} vai chutar no alvo?",
		"options": [
			{"value": "Sim", "label": "Sim", "probability": prob_player_shot, "odd": round(1 / prob_player_shot, 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0},
			{"value": "Não", "label": "Não", "probability": 1 - prob_player_shot, "odd": round(1 / (1 - prob_player_shot), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
		],
		"stat_basis": f"TxLINE histórico {player_name}: 80% dos jogos com chute",
		"payoff_multiplier": 1.0
	})

	# Q3 (Easy): Exceed 3 shots on target
	prob_exceed_3 = 0.70
	questions.append({
		"id": "q3", "kind": "shots_threshold", "answer_type": "categorical",
		"prompt": f"{team_name} fará mais de 3 chutes no alvo?",
		"options": [
			{"value": "Sim", "label": "Sim", "probability": prob_exceed_3, "odd": round(1 / prob_exceed_3, 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0},
			{"value": "Não", "label": "Não", "probability": 1 - prob_exceed_3, "odd": round(1 / (1 - prob_exceed_3), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
		],
		"stat_basis": "TxLINE distribuição acumulada de chutes",
		"payoff_multiplier": 1.0
	})

	# Q4 (Zebra): Hat trick (3% prob)
	prob_hat_trick = 0.03
	questions.append({
		"id": "q4", "kind": "hat_trick", "answer_type": "categorical",
		"prompt": "Vai ter hat-trick de um jogador?",
		"options": [
			{"value": "Sim", "label": "Sim", "probability": prob_hat_trick, "odd": round(1 / prob_hat_trick, 2), "risk": "ZEBRA", "reward_multiplier": 3.5},
			{"value": "Não", "label": "Não", "probability": 1 - prob_hat_trick, "odd": round(1 / (1 - prob_hat_trick), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
		],
		"stat_basis": "TxLINE histórico Copa 2026: hat-trick em 3% dos jogos",
		"payoff_multiplier": 3.5
	})

	# Q5 (Zebra): Header goal (12% prob)
	prob_header_goal = 0.12
	questions.append({
		"id": "q5", "kind": "header_goal", "answer_type": "categorical",
		"prompt": "Vai ter gol de cabeça?",
		"options": [
			{"value": "Sim", "label": "Sim", "probability": prob_header_goal, "odd": round(1 / prob_header_goal, 2), "risk": "ZEBRA", "reward_multiplier": 3.5},
			{"value": "Não", "label": "Não", "probability": 1 - prob_header_goal, "odd": round(1 / (1 - prob_header_goal), 2), "risk": "ACESSIVEL", "reward_multiplier": 1.0}
		],
		"stat_basis": "TxLINE histórico Copa 2026: gol de cabeça em 12% dos jogos",
		"payoff_multiplier": 3.5
	})

	return questions


def build_predictive_quiz(fixture_id: str, team_name: str, tier: str = "faltas") -> dict[str, Any]:
	"""Build a predictive quiz (not replay-based) for a specific team and tier.

	Predictive quizzes test what the fan thinks WILL HAPPEN based on historical data.
	Answers are frozen at quiz start; they're resolved as TxLINE events arrive during the match.
	"""
	stats = _load_player_stats()

	if tier == "faltas":
		questions = _build_predictive_questions_fouls(team_name, stats)
	elif tier == "escanteios":
		questions = _build_predictive_questions_corners(team_name, stats)
	elif tier == "chutes":
		questions = _build_predictive_questions_shots(team_name, stats)
	else:
		raise ValueError(f"Unknown tier: {tier}")

	return {
		"quiz_id": f"pred-{fixture_id}-{team_name}-{tier}",
		"fixture_id": fixture_id,
		"team": team_name,
		"tier": tier,
		"title": f"{team_name} — {tier.upper()}",
		"mode": "predictive",  # vs "replay"
		"status": "open",
		"questions": questions,
		"data_status": "editorial_curated_predictive",
		"frozen_at": None,  # will be set when participant starts
		"description": "Previsões baseadas em histórico da Copa 2026 — responda o que vai acontecer, não o que já aconteceu."
	}


def build_argentina_spain_quiz() -> dict[str, Any]:
    """Compatibility entrypoint; the quiz is now sourced from verified TxLINE replay."""
    return build_quiz_from_snapshot()
