"""Resolve predictive quiz questions against o feed real da TxLINE.

O wire real (mainnet, SL12) reporta estatísticas por CÓDIGO NUMÉRICO, não por nome:
  1/2 = gols (Participant1/2) · 3/4 = amarelo · 5/6 = vermelho · 7/8 = escanteios
(prefixo de período: 0=jogo todo, 1000=1ºT, 3000=2ºT, 7000=total do tempo extra — não usado aqui).
Isso é o que a TxODDS documenta para o tier gratuito da Copa; não existem faltas nem chutes
no alvo nesse feed, por isso os tiers do CHUTE são gols/escanteios/cartões.
"""

from __future__ import annotations

from typing import Any

_STAT_BASE = {"goals": 1, "yellow": 3, "red": 5, "corners": 7}


def _participant_index(team_name: str | None, home_team: str | None, away_team: str | None) -> int | None:
	"""Mapeia o nome da seleção para Participant1 (home) ou Participant2 (away) no wire real.
	Sem o fixture persistido não há como saber com segurança — falha explícita, nunca adivinha."""
	if not team_name:
		return None
	if team_name == home_team:
		return 1
	if team_name == away_team:
		return 2
	return None


def _real_stat(stats: dict[str, Any], family: str, participant: int) -> int:
	"""Lê o código numérico real (ex.: '1', '8') do payload cru da TxLINE."""
	code = str(_STAT_BASE[family] + (0 if participant == 1 else 1))
	try:
		return int(stats.get(code, 0) or 0)
	except (TypeError, ValueError):
		return 0


def _latest_stats(txline_score: dict[str, Any]) -> dict[str, Any]:
	"""O payload persistido pode ser um evento único ou uma lista de eventos (snapshot bruto
	da TxLINE); pegamos sempre o mais recente, igual ao worker faz para decidir o estado atual."""
	score_data = txline_score.get("score", txline_score)
	if isinstance(score_data, list):
		score_data = score_data[-1] if score_data else {}
	stats = score_data.get("Stats") or score_data.get("stats") or {}
	return stats if isinstance(stats, dict) else {}


def resolve_gols_question(question_id: str, answer: Any, txline_score: dict[str, Any], question: dict[str, Any] | None, home_team: str | None, away_team: str | None) -> dict[str, Any]:
	stats = _latest_stats(txline_score)
	meta = (question or {}).get("meta", {})

	if question_id in ("q1", "q3"):
		participant = _participant_index(meta.get("team"), home_team, away_team)
		if participant is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		actual = _real_stat(stats, "goals", participant)
		return {"resolved": True, "correct": int(answer) == actual, "actual": actual, "expected": answer}

	if question_id == "q2":  # goleada solo (própria equipe, >=4 gols)
		participant = _participant_index(meta.get("team"), home_team, away_team)
		if participant is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		actual = _real_stat(stats, "goals", participant)
		hit = actual >= 4
		return {"resolved": True, "correct": (answer == "Sim") == hit, "actual": "Sim" if hit else "Não"}

	if question_id == "q4":  # rival sem marcar
		participant = _participant_index(meta.get("team"), home_team, away_team)
		if participant is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		actual = _real_stat(stats, "goals", participant)
		hit = actual == 0
		return {"resolved": True, "correct": (answer == "Sim") == hit, "actual": "Sim" if hit else "Não"}

	if question_id == "q5":  # duelo de gols
		p_own = _participant_index(meta.get("team"), home_team, away_team)
		p_rival = _participant_index(meta.get("opponent"), home_team, away_team)
		if p_own is None or p_rival is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		own_goals = _real_stat(stats, "goals", p_own)
		rival_goals = _real_stat(stats, "goals", p_rival)
		outcome = _duel_outcome(own_goals, rival_goals, meta.get("team"), meta.get("opponent"))
		correct = answer == outcome
		payoff = 3.5 if correct and outcome in ("Empate", "Dobradinha") else (1.0 if correct else 0.0)
		return {"resolved": True, "correct": correct, "actual": outcome, "payoff": payoff}

	return {"resolved": False, "error": "unknown_question"}


def resolve_escanteios_question(question_id: str, answer: Any, txline_score: dict[str, Any], question: dict[str, Any] | None, home_team: str | None, away_team: str | None) -> dict[str, Any]:
	stats = _latest_stats(txline_score)
	meta = (question or {}).get("meta", {})

	if question_id in ("q1", "q3"):
		participant = _participant_index(meta.get("team"), home_team, away_team)
		if participant is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		actual = _real_stat(stats, "corners", participant)
		return {"resolved": True, "correct": int(answer) == actual, "actual": actual, "expected": answer}

	if question_id == "q2":  # 10 ou mais escanteios
		participant = _participant_index(meta.get("team"), home_team, away_team)
		if participant is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		actual = _real_stat(stats, "corners", participant)
		hit = actual >= 10
		return {"resolved": True, "correct": (answer == "Sim") == hit, "actual": "Sim" if hit else "Não"}

	if question_id == "q4":  # rival com menos de 2 escanteios
		participant = _participant_index(meta.get("team"), home_team, away_team)
		if participant is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		actual = _real_stat(stats, "corners", participant)
		hit = actual < 2
		return {"resolved": True, "correct": (answer == "Sim") == hit, "actual": "Sim" if hit else "Não"}

	if question_id == "q5":  # duelo de escanteios
		p_own = _participant_index(meta.get("team"), home_team, away_team)
		p_rival = _participant_index(meta.get("opponent"), home_team, away_team)
		if p_own is None or p_rival is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		own = _real_stat(stats, "corners", p_own)
		rival = _real_stat(stats, "corners", p_rival)
		outcome = _duel_outcome(own, rival, meta.get("team"), meta.get("opponent"))
		correct = answer == outcome
		payoff = 3.5 if correct and outcome in ("Empate", "Dobradinha") else (1.0 if correct else 0.0)
		return {"resolved": True, "correct": correct, "actual": outcome, "payoff": payoff}

	return {"resolved": False, "error": "unknown_question"}


def resolve_cartoes_question(question_id: str, answer: Any, txline_score: dict[str, Any], question: dict[str, Any] | None, home_team: str | None, away_team: str | None) -> dict[str, Any]:
	stats = _latest_stats(txline_score)
	meta = (question or {}).get("meta", {})

	if question_id in ("q1", "q3"):
		participant = _participant_index(meta.get("team"), home_team, away_team)
		if participant is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		actual = _real_stat(stats, "yellow", participant)
		return {"resolved": True, "correct": int(answer) == actual, "actual": actual, "expected": answer}

	if question_id in ("q2", "q4"):  # cartão vermelho (própria equipe ou rival, conforme meta)
		participant = _participant_index(meta.get("team"), home_team, away_team)
		if participant is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		actual = _real_stat(stats, "red", participant)
		hit = actual > 0
		return {"resolved": True, "correct": (answer == "Sim") == hit, "actual": "Sim" if hit else "Não"}

	if question_id == "q5":  # duelo de disciplina (amarelo + 2×vermelho)
		p_own = _participant_index(meta.get("team"), home_team, away_team)
		p_rival = _participant_index(meta.get("opponent"), home_team, away_team)
		if p_own is None or p_rival is None:
			return {"resolved": False, "error": "MISSING_FIXTURE_MAPPING"}
		own = _real_stat(stats, "yellow", p_own) + 2 * _real_stat(stats, "red", p_own)
		rival = _real_stat(stats, "yellow", p_rival) + 2 * _real_stat(stats, "red", p_rival)
		outcome = _duel_outcome(own, rival, meta.get("team"), meta.get("opponent"))
		correct = answer == outcome
		payoff = 3.5 if correct and outcome in ("Empate", "Dobradinha") else (1.0 if correct else 0.0)
		return {"resolved": True, "correct": correct, "actual": outcome, "payoff": payoff}

	return {"resolved": False, "error": "unknown_question"}


def _duel_outcome(own: int, rival: int, own_name: str | None, rival_name: str | None) -> str:
	if own == rival:
		return "Empate"
	if min(own, rival) >= 3 and max(own, rival) >= 2 * min(own, rival):
		return "Dobradinha"
	return own_name if own > rival else rival_name


def resolve_prediction_answer(quiz_id: str, tier: str, question_id: str, answer: Any, txline_score: dict[str, Any], question: dict[str, Any] | None = None, home_team: str | None = None, away_team: str | None = None) -> dict[str, Any]:
	"""Resolve uma predição contra o placar real da TxLINE.

	Returns: {resolved, correct, actual, payoff (optional), ...}
	"""
	if tier == "cartoes":
		return resolve_cartoes_question(question_id, answer, txline_score, question, home_team, away_team)
	elif tier == "escanteios":
		return resolve_escanteios_question(question_id, answer, txline_score, question, home_team, away_team)
	elif tier == "gols":
		return resolve_gols_question(question_id, answer, txline_score, question, home_team, away_team)
	else:
		return {"resolved": False, "error": f"unknown_tier: {tier}"}


def score_prediction_quiz(
	quiz_id: str, tier: str, participant_answers: list[dict[str, Any]], txline_score: dict[str, Any],
	questions_by_id: dict[str, dict[str, Any]] | None = None,
	home_team: str | None = None, away_team: str | None = None,
) -> dict[str, Any]:
	"""Score a complete predictive quiz against TxLINE events.

	participant_answers: list of {question_id, answer}
	Returns: {score, correct_count, total, breakdown: [{question_id, correct, payoff}, ...]}
	"""
	score = 0
	correct_count = 0
	breakdown = []

	for ans in participant_answers:
		question_id = ans["question_id"]
		answer = ans["answer"]
		question = (questions_by_id or {}).get(question_id)
		resolution = resolve_prediction_answer(quiz_id, tier, question_id, answer, txline_score, question, home_team, away_team)

		if resolution.get("resolved"):
			is_correct = resolution.get("correct", False)
			payoff = resolution.get("payoff", 1.0 if is_correct else 0.0)
			score += int(payoff * 100)  # Convert to points (1.0 = 100pts, 3.5 = 350pts)
			if is_correct:
				correct_count += 1
			breakdown.append({
				"question_id": question_id,
				"correct": is_correct,
				"payoff": payoff,
				"expected": ans.get("answer"),
				"actual": resolution.get("actual")
			})
		else:
			breakdown.append({
				"question_id": question_id,
				"correct": False,
				"payoff": 0.0,
				"error": resolution.get("error")
			})

	return {
		"score": score,
		"correct_count": correct_count,
		"total": len(participant_answers),
		"percentage": round((correct_count / len(participant_answers) * 100) if participant_answers else 0, 1),
		"breakdown": breakdown
	}
