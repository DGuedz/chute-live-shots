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


def _count_options(values: list[int], mean: float) -> list[dict[str, Any]]:
    """Normalized Poisson prior over the offered counts, with real odd/risk per option
    (mesma régua de _numeric_options; nunca odd fixa)."""
    weights = {v: _poisson_pmf(v, mean) for v in values}
    total = sum(weights.values()) or 1.0
    options = []
    for v in values:
        prob = round(weights[v] / total, 3) or 0.001
        risk, mult = _risk_tier(prob)
        options.append({"value": v, "label": str(v), "probability": prob, "odd": round(1 / prob, 2), "risk": risk, "reward_multiplier": mult})
    return options


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
    "gols": {"label": "Gols", "stat_field": "Goals", "description": "Placar real — quantos gols cada seleção faz na final."},
    "escanteios": {"label": "Escanteios", "stat_field": "Corners", "description": "Pressão e bolas na área — volume de escanteios por equipe."},
    "cartoes": {"label": "Cartões", "stat_field": "YellowCards", "description": "Disciplina e intensidade — amarelos e vermelhos por equipe."},
}


def tier_available(snapshot: dict[str, Any], tier: str) -> bool:
    field = TIERS[tier]["stat_field"]
    score = snapshot["score"]["score"]
    return any(field in score.get(side, {}).get("Total", {}) for side in ("Participant1", "Participant2"))


def _tier_questions(tier: str, teams: list[str], o: dict[str, int], snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    proof_q = {"id": "q5", "kind": "proof_sequence", "answer_type": "numeric", "prompt": "Qual sequência do score está ancorada na prova on-chain?", "options": _numeric_options(int(snapshot["score"]["sequence"]), None), "stat_basis": "TxLINE stat-validation proof sequence"}
    if tier == "gols":
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
    if tier == "cartoes":
        return [
            {"id": "q1", "kind": "total_yellow_cards", "answer_type": "numeric", "prompt": "Quantos cartões amarelos no total?", "options": _numeric_options(o["total_yellow_cards"], PRIORS["total_yellow_cards"]), "stat_basis": "TxLINE score snapshot: YellowCards/Total"},
            {"id": "q2", "kind": "home_yellow_cards", "answer_type": "numeric", "prompt": f"Quantos amarelos recebeu {teams[0]}?", "options": _numeric_options(o["home_yellow_cards"], PRIORS["home_yellow_cards"]), "stat_basis": "TxLINE score snapshot: YellowCards/Participant1"},
            {"id": "q3", "kind": "away_yellow_cards", "answer_type": "numeric", "prompt": f"Quantos amarelos recebeu {teams[1]}?", "options": _numeric_options(o["away_yellow_cards"], PRIORS["away_yellow_cards"]), "stat_basis": "TxLINE score snapshot: YellowCards/Participant2"},
            {"id": "q4", "kind": "cards_majority", "answer_type": "categorical", "prompt": "Qual lado foi mais indisciplinado (mais amarelos)?", "options": _categorical_options([(teams[0], 0.36), (teams[1], 0.36), ("Empate com cartões", 0.20), ("Empate sem cartões", 0.08)]), "stat_basis": "TxLINE score snapshot: YellowCards por participante"},
            proof_q,
        ]
    raise RuntimeError(f"UNKNOWN_TIER: {tier}")


def build_quiz_from_snapshot(snapshot: dict[str, Any] | None = None, tier: str = "gols") -> dict[str, Any]:
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


def _pt_team(team: str) -> str:
	"""Nome da equipe em PT-BR para prompts; a chave TxLINE segue nos values/meta."""
	return {"Spain": "Espanha", "Argentina": "Argentina"}.get(team, team)


def _opponent_of(team_name: str, stats: dict[str, Any]) -> str:
	others = [t for t in stats.get("teams", {}) if t != team_name]
	return others[0] if others else team_name


def _poisson_tail(k_min: int, lam: float) -> float:
	"""P(X >= k_min) para X ~ Poisson(lam) — cauda real, nunca percentual inventado."""
	return max(0.001, 1 - sum(_poisson_pmf(i, lam) for i in range(k_min)))


def _poisson_cdf(k_max: int, lam: float) -> float:
	"""P(X < k_max) para X ~ Poisson(lam)."""
	return max(0.001, sum(_poisson_pmf(i, lam) for i in range(k_max)))


def _yes_no_options(prob_yes: float) -> list[dict[str, Any]]:
	prob_yes = min(0.97, max(0.03, prob_yes))
	out = []
	for value, prob in (("Sim", prob_yes), ("Não", 1 - prob_yes)):
		risk, mult = _risk_tier(prob)
		out.append({"value": value, "label": value, "probability": round(prob, 3), "odd": round(1 / prob, 2), "risk": risk, "reward_multiplier": mult})
	return out


def _duel_probabilities(mean_a: float, mean_b: float, cap: int = 14) -> dict[str, float]:
	"""Partição exata do duelo entre A e B (Poisson independentes, mesma unidade estatística):
	A vence · B vence · empate exato · dobradinha (alguém faz ≥2× o rival, com o menor ≥3).
	As quatro fatias cobrem todo o espaço; a dobradinha e o empate exato são as zebras."""
	p = {"A": 0.0, "B": 0.0, "EMPATE": 0.0, "DOBRADINHA": 0.0}
	for a in range(cap + 1):
		pa = _poisson_pmf(a, mean_a)
		for b in range(cap + 1):
			w = pa * _poisson_pmf(b, mean_b)
			if a == b:
				p["EMPATE"] += w
			elif min(a, b) >= 3 and max(a, b) >= 2 * min(a, b):
				p["DOBRADINHA"] += w
			elif a > b:
				p["A"] += w
			else:
				p["B"] += w
	total = sum(p.values()) or 1.0
	return {k: v / total for k, v in p.items()}


def _duel_option(value: str, label: str, prob: float, zebra: bool) -> dict[str, Any]:
	prob = max(prob, 0.001)
	risk, mult = ("ZEBRA", 3.5) if zebra else _risk_tier(prob)
	return {"value": value, "label": label, "probability": round(prob, 3), "odd": round(1 / prob, 2), "risk": risk, "reward_multiplier": mult}


def _numeric_prompt_options(mean: float) -> list[dict[str, Any]]:
	"""4 opções inteiras plausíveis ao redor da média real, cada uma com odd/risco reais."""
	center = round(mean)
	values = sorted({max(0, center - 1), center, center + 1, max(0, center + 2)})[:4]
	while len(values) < 4:
		values.append(values[-1] + 1)
	return _count_options(values, mean)


# ===== GOLS — tier principal. Placar real (código 1/2 no wire TxLINE) =====

def _build_predictive_questions_gols(team_name: str, stats: dict[str, Any]) -> list[dict[str, Any]]:
	"""5 perguntas: 2 da sua equipe, 2 do rival, 1 mista — 3 de odd normal + 2 zebra."""
	opponent = _opponent_of(team_name, stats)
	mean_own = _get_team_predictions(team_name, stats).get("goals", 2.0)
	mean_rival = _get_team_predictions(opponent, stats).get("goals", 2.0)
	label_own, label_rival = _pt_team(team_name), _pt_team(opponent)

	questions = [
		{
			"id": "q1", "kind": "team_goals", "answer_type": "numeric",
			"prompt": f"Quantos gols {label_own} vai fazer?",
			"options": _numeric_prompt_options(mean_own),
			"stat_basis": f"TxLINE histórico {label_own}: {mean_own:.2f} gols/jogo nesta Copa",
			"meta": {"team": team_name, "opponent": opponent}, "payoff_multiplier": 1.0,
		},
		{
			"id": "q2", "kind": "team_goals_blowout", "answer_type": "categorical",
			"prompt": f"{label_own} vai marcar 4 gols ou mais nessa final?",
			"options": _yes_no_options(_poisson_tail(4, mean_own)),
			"stat_basis": f"TxLINE: cauda de Poisson sobre {mean_own:.2f} gols/jogo — evento raro, real",
			"meta": {"team": team_name, "opponent": opponent}, "payoff_multiplier": 3.5,
		},
		{
			"id": "q3", "kind": "rival_goals", "answer_type": "numeric",
			"prompt": f"E o rival: quantos gols {label_rival} vai fazer?",
			"options": _numeric_prompt_options(mean_rival),
			"stat_basis": f"TxLINE histórico {label_rival}: {mean_rival:.2f} gols/jogo nesta Copa",
			"meta": {"team": opponent, "opponent": team_name}, "payoff_multiplier": 1.0,
		},
		{
			"id": "q4", "kind": "rival_goals_blank", "answer_type": "categorical",
			"prompt": f"{label_rival} vai sair sem marcar (rede intacta do rival)?",
			"options": _yes_no_options(_poisson_cdf(1, mean_rival)),
			"stat_basis": f"TxLINE: P(0 gols) sobre {mean_rival:.2f} gols/jogo do {label_rival}",
			"meta": {"team": opponent, "opponent": team_name}, "payoff_multiplier": 3.5,
		},
	]
	duel = _duel_probabilities(mean_own, mean_rival)
	questions.append({
		"id": "q5", "kind": "goals_duel", "answer_type": "categorical",
		"prompt": f"O duelo: quem faz mais gols, {label_own} ou {label_rival}?",
		"options": [
			_duel_option(team_name, f"{label_own} faz mais gols", duel["A"], False),
			_duel_option(opponent, f"{label_rival} faz mais gols", duel["B"], False),
			_duel_option("Empate", "Empate no número de gols", duel["EMPATE"], True),
			_duel_option("Dobradinha", "Um dos dois goleia o outro (2× ou mais)", duel["DOBRADINHA"], True),
		],
		"stat_basis": f"TxLINE: Poisson conjunto {label_own} {mean_own:.2f} × {label_rival} {mean_rival:.2f} gols/jogo",
		"meta": {"team": team_name, "opponent": opponent}, "payoff_multiplier": 3.5,
	})
	return questions


# ===== ESCANTEIOS — código 7/8 no wire TxLINE, resolve real =====

def _build_predictive_questions_escanteios(team_name: str, stats: dict[str, Any]) -> list[dict[str, Any]]:
	opponent = _opponent_of(team_name, stats)
	mean_own = _get_team_predictions(team_name, stats).get("corners_for", 6.0)
	mean_rival = _get_team_predictions(opponent, stats).get("corners_for", 6.0)
	label_own, label_rival = _pt_team(team_name), _pt_team(opponent)

	questions = [
		{
			"id": "q1", "kind": "team_corners", "answer_type": "numeric",
			"prompt": f"Quantos escanteios {label_own} vai cobrar?",
			"options": _numeric_prompt_options(mean_own),
			"stat_basis": f"TxLINE histórico {label_own}: {mean_own:.2f} escanteios/jogo nesta Copa",
			"meta": {"team": team_name, "opponent": opponent}, "payoff_multiplier": 1.0,
		},
		{
			"id": "q2", "kind": "team_corners_flood", "answer_type": "categorical",
			"prompt": f"{label_own} vai cobrar 10 escanteios ou mais?",
			"options": _yes_no_options(_poisson_tail(10, mean_own)),
			"stat_basis": f"TxLINE: cauda de Poisson sobre {mean_own:.2f} escanteios/jogo",
			"meta": {"team": team_name, "opponent": opponent}, "payoff_multiplier": 3.5,
		},
		{
			"id": "q3", "kind": "rival_corners", "answer_type": "numeric",
			"prompt": f"E o rival: quantos escanteios {label_rival} vai cobrar?",
			"options": _numeric_prompt_options(mean_rival),
			"stat_basis": f"TxLINE histórico {label_rival}: {mean_rival:.2f} escanteios/jogo nesta Copa",
			"meta": {"team": opponent, "opponent": team_name}, "payoff_multiplier": 1.0,
		},
		{
			"id": "q4", "kind": "rival_corners_dry", "answer_type": "categorical",
			"prompt": f"{label_rival} vai cobrar menos de 2 escanteios?",
			"options": _yes_no_options(_poisson_cdf(2, mean_rival)),
			"stat_basis": f"TxLINE: P(<2 escanteios) sobre {mean_rival:.2f} escanteios/jogo do {label_rival}",
			"meta": {"team": opponent, "opponent": team_name}, "payoff_multiplier": 3.5,
		},
	]
	duel = _duel_probabilities(mean_own, mean_rival)
	questions.append({
		"id": "q5", "kind": "corners_duel", "answer_type": "categorical",
		"prompt": f"O duelo: quem cobra mais escanteios, {label_own} ou {label_rival}?",
		"options": [
			_duel_option(team_name, f"{label_own} cobra mais escanteios", duel["A"], False),
			_duel_option(opponent, f"{label_rival} cobra mais escanteios", duel["B"], False),
			_duel_option("Empate", "Empate no número de escanteios", duel["EMPATE"], True),
			_duel_option("Dobradinha", "Um dos dois dobra o outro (2× ou mais)", duel["DOBRADINHA"], True),
		],
		"stat_basis": f"TxLINE: Poisson conjunto {label_own} {mean_own:.2f} × {label_rival} {mean_rival:.2f} escanteios/jogo",
		"meta": {"team": team_name, "opponent": opponent}, "payoff_multiplier": 3.5,
	})
	return questions


# ===== CARTÕES — amarelo (3/4) e vermelho (5/6) no wire TxLINE; "faltas" saiu (não existe no feed) =====

def _build_predictive_questions_cartoes(team_name: str, stats: dict[str, Any]) -> list[dict[str, Any]]:
	opponent = _opponent_of(team_name, stats)
	yellow_own = _get_team_predictions(team_name, stats).get("yellow_cards", 1.0)
	yellow_rival = _get_team_predictions(opponent, stats).get("yellow_cards", 1.0)
	red_own = _get_team_predictions(team_name, stats).get("red_cards", 0.05)
	red_rival = _get_team_predictions(opponent, stats).get("red_cards", 0.05)
	label_own, label_rival = _pt_team(team_name), _pt_team(opponent)

	questions = [
		{
			"id": "q1", "kind": "team_yellow_cards", "answer_type": "numeric",
			"prompt": f"Quantos cartões amarelos {label_own} vai receber?",
			"options": _numeric_prompt_options(yellow_own),
			"stat_basis": f"TxLINE histórico {label_own}: {yellow_own:.2f} amarelos/jogo nesta Copa",
			"meta": {"team": team_name, "opponent": opponent}, "payoff_multiplier": 1.0,
		},
		{
			"id": "q2", "kind": "team_red_card", "answer_type": "categorical",
			"prompt": f"{label_own} vai receber cartão vermelho?",
			"options": _yes_no_options(red_own),
			"stat_basis": f"TxLINE histórico {label_own}: {red_own:.2f} vermelhos/jogo (evento raro, piso realista aplicado)",
			"meta": {"team": team_name, "opponent": opponent}, "payoff_multiplier": 3.5,
		},
		{
			"id": "q3", "kind": "rival_yellow_cards", "answer_type": "numeric",
			"prompt": f"E o rival: quantos cartões amarelos {label_rival} vai receber?",
			"options": _numeric_prompt_options(yellow_rival),
			"stat_basis": f"TxLINE histórico {label_rival}: {yellow_rival:.2f} amarelos/jogo nesta Copa",
			"meta": {"team": opponent, "opponent": team_name}, "payoff_multiplier": 1.0,
		},
		{
			"id": "q4", "kind": "rival_red_card", "answer_type": "categorical",
			"prompt": f"{label_rival} vai receber cartão vermelho?",
			"options": _yes_no_options(red_rival),
			"stat_basis": f"TxLINE histórico {label_rival}: {red_rival:.2f} vermelhos/jogo (evento raro, piso realista aplicado)",
			"meta": {"team": opponent, "opponent": team_name}, "payoff_multiplier": 3.5,
		},
	]
	weight_own, weight_rival = yellow_own + 2 * red_own, yellow_rival + 2 * red_rival
	duel = _duel_probabilities(weight_own, weight_rival)
	questions.append({
		"id": "q5", "kind": "cards_duel", "answer_type": "categorical",
		"prompt": f"O duelo da disciplina: quem se complica mais, {label_own} ou {label_rival}?",
		"options": [
			_duel_option(team_name, f"{label_own} é mais indisciplinado", duel["A"], False),
			_duel_option(opponent, f"{label_rival} é mais indisciplinado", duel["B"], False),
			_duel_option("Empate", "Empate na disciplina (peso amarelo+vermelho)", duel["EMPATE"], True),
			_duel_option("Dobradinha", "Um dos dois se complica muito mais (2× ou mais)", duel["DOBRADINHA"], True),
		],
		"stat_basis": f"TxLINE: peso amarelo+2×vermelho — {label_own} {weight_own:.2f} × {label_rival} {weight_rival:.2f}",
		"meta": {"team": team_name, "opponent": opponent}, "payoff_multiplier": 3.5,
	})
	return questions


def build_predictive_quiz(fixture_id: str, team_name: str, tier: str = "gols") -> dict[str, Any]:
	"""Build a predictive quiz (not replay-based) for a specific team and tier.

	Predictive quizzes test what the fan thinks WILL HAPPEN based on historical data.
	Answers are frozen at quiz start; they're resolved as TxLINE events arrive during the match.
	Tiers (gols/escanteios/cartoes) resolvem contra códigos numéricos reais do feed TxLINE
	(1/2=gols, 3/4=amarelo, 5/6=vermelho, 7/8=escanteios) — "faltas" e "chutes no alvo" saíram
	porque o feed gratuito da Copa não reporta esses campos.
	"""
	stats = _load_player_stats()

	if tier == "cartoes":
		questions = _build_predictive_questions_cartoes(team_name, stats)
	elif tier == "escanteios":
		questions = _build_predictive_questions_escanteios(team_name, stats)
	elif tier == "gols":
		questions = _build_predictive_questions_gols(team_name, stats)
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
