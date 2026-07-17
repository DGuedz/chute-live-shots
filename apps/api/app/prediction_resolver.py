"""Resolve predictive quiz questions against TxLINE event stream."""

from typing import Any
from . import storage, quiz_engine


def resolve_fouls_question(question_id: str, answer: Any, txline_score: dict[str, Any]) -> dict[str, Any]:
	"""Compare foul prediction against TxLINE score data.

	question_id patterns:
	- q1: team_fouls (numeric) — compare total foul count
	- q2: yellow_card_early (categorical) — check if yellow in first 25 min
	- q3: player_fouls (categorical) — check if player made foul
	- q4: player_yellow (categorical/zebra) — check if specific player got yellow
	- q5: red_card (categorical/zebra) — check if any red card
	"""
	score_data = txline_score.get("score", {})
	stats = score_data.get("stats", {})

	if question_id == "q1":
		# Numeric comparison: total fouls by team
		actual_fouls = stats.get("fouls_committed", 0)
		correct = int(answer) == actual_fouls
		return {"resolved": True, "correct": correct, "actual": actual_fouls, "expected": answer}

	elif question_id == "q2":
		# Yellow in first 25 min
		events = score_data.get("events", [])
		yellow_before_25 = any(e.get("type") == "yellow_card" and e.get("minute", 90) <= 25 for e in events)
		correct = (answer == "Sim") == yellow_before_25
		return {"resolved": True, "correct": correct, "actual": "Sim" if yellow_before_25 else "Não"}

	elif question_id == "q3":
		# Player made foul (simplified: check if any foul recorded)
		events = score_data.get("events", [])
		player_name = "De Paul"  # Hardcoded for MVP; would come from question meta
		player_fouls = sum(1 for e in events if e.get("type") == "foul" and e.get("player") == player_name)
		correct = (answer == "Sim") == (player_fouls > 0)
		return {"resolved": True, "correct": correct, "actual": "Sim" if player_fouls > 0 else "Não"}

	elif question_id == "q4":
		# Specific player yellow card (zebra)
		events = score_data.get("events", [])
		player_name = "Messi"  # Hardcoded for MVP
		player_yellow = sum(1 for e in events if e.get("type") == "yellow_card" and e.get("player") == player_name)
		correct = (answer == "Sim") == (player_yellow > 0)
		return {"resolved": True, "correct": correct, "actual": "Sim" if player_yellow > 0 else "Não", "payoff": 3.5 if correct else 0}

	elif question_id == "q5":
		# Red card (zebra) — rare event
		events = score_data.get("events", [])
		any_red = any(e.get("type") == "red_card" for e in events)
		correct = (answer == "Sim") == any_red
		return {"resolved": True, "correct": correct, "actual": "Sim" if any_red else "Não", "payoff": 3.5 if correct else 0}

	return {"resolved": False, "error": "unknown_question"}


def resolve_corners_question(question_id: str, answer: Any, txline_score: dict[str, Any]) -> dict[str, Any]:
	"""Compare corner prediction against TxLINE score data."""
	score_data = txline_score.get("score", {})
	stats = score_data.get("stats", {})

	if question_id == "q1":
		# Total corners by team
		actual_corners = stats.get("corners_for", 0)
		correct = int(answer) == actual_corners
		return {"resolved": True, "correct": correct, "actual": actual_corners, "expected": answer}

	elif question_id == "q2":
		# More than 10 corners
		actual_corners = stats.get("corners_for", 0)
		correct = (answer == "Sim") == (actual_corners > 10)
		return {"resolved": True, "correct": correct, "actual": "Sim" if actual_corners > 10 else "Não"}

	elif question_id == "q3":
		# Corner in first 15 min
		events = score_data.get("events", [])
		corner_early = any(e.get("type") == "corner" and e.get("minute", 90) <= 15 for e in events)
		correct = (answer == "Sim") == corner_early
		return {"resolved": True, "correct": correct, "actual": "Sim" if corner_early else "Não"}

	elif question_id == "q4":
		# Goal from corner (zebra)
		events = score_data.get("events", [])
		corner_goal = any(e.get("type") == "goal" and e.get("assist_type") == "corner" for e in events)
		correct = (answer == "Sim") == corner_goal
		return {"resolved": True, "correct": correct, "actual": "Sim" if corner_goal else "Não", "payoff": 3.5 if correct else 0}

	elif question_id == "q5":
		# Yellow/red from corner scuffle (zebra)
		events = score_data.get("events", [])
		card_from_corner = any(e.get("type") in ("yellow_card", "red_card") and e.get("reason") == "corner_dispute" for e in events)
		correct = (answer == "Sim") == card_from_corner
		return {"resolved": True, "correct": correct, "actual": "Sim" if card_from_corner else "Não", "payoff": 3.5 if correct else 0}

	return {"resolved": False, "error": "unknown_question"}


def resolve_shots_question(question_id: str, answer: Any, txline_score: dict[str, Any]) -> dict[str, Any]:
	"""Compare shot prediction against TxLINE score data."""
	score_data = txline_score.get("score", {})
	stats = score_data.get("stats", {})

	if question_id == "q1":
		# Total shots on target
		actual_shots = stats.get("shots_on_target", 0)
		correct = int(answer) == actual_shots
		return {"resolved": True, "correct": correct, "actual": actual_shots, "expected": answer}

	elif question_id == "q2":
		# Player shoots on target (easy)
		events = score_data.get("events", [])
		player_name = "Messi"  # Hardcoded for MVP
		player_shots = sum(1 for e in events if e.get("type") == "shot_on_target" and e.get("player") == player_name)
		correct = (answer == "Sim") == (player_shots > 0)
		return {"resolved": True, "correct": correct, "actual": "Sim" if player_shots > 0 else "Não"}

	elif question_id == "q3":
		# More than 3 shots on target (easy)
		actual_shots = stats.get("shots_on_target", 0)
		correct = (answer == "Sim") == (actual_shots > 3)
		return {"resolved": True, "correct": correct, "actual": "Sim" if actual_shots > 3 else "Não"}

	elif question_id == "q4":
		# Hat trick (zebra)
		events = score_data.get("events", [])
		goals_by_player = {}
		for e in events:
			if e.get("type") == "goal":
				player = e.get("player", "unknown")
				goals_by_player[player] = goals_by_player.get(player, 0) + 1
		hat_trick = any(g >= 3 for g in goals_by_player.values())
		correct = (answer == "Sim") == hat_trick
		return {"resolved": True, "correct": correct, "actual": "Sim" if hat_trick else "Não", "payoff": 3.5 if correct else 0}

	elif question_id == "q5":
		# Header goal (zebra)
		events = score_data.get("events", [])
		header_goal = any(e.get("type") == "goal" and e.get("shot_type") == "header" for e in events)
		correct = (answer == "Sim") == header_goal
		return {"resolved": True, "correct": correct, "actual": "Sim" if header_goal else "Não", "payoff": 3.5 if correct else 0}

	return {"resolved": False, "error": "unknown_question"}


def resolve_prediction_answer(quiz_id: str, tier: str, question_id: str, answer: Any, txline_score: dict[str, Any]) -> dict[str, Any]:
	"""Resolve a single prediction against TxLINE score.

	Returns: {resolved, correct, actual, payoff (optional), ...}
	"""
	if tier == "faltas":
		return resolve_fouls_question(question_id, answer, txline_score)
	elif tier == "escanteios":
		return resolve_corners_question(question_id, answer, txline_score)
	elif tier == "chutes":
		return resolve_shots_question(question_id, answer, txline_score)
	else:
		return {"resolved": False, "error": f"unknown_tier: {tier}"}


def score_prediction_quiz(quiz_id: str, tier: str, participant_answers: list[dict[str, Any]], txline_score: dict[str, Any]) -> dict[str, Any]:
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
		resolution = resolve_prediction_answer(quiz_id, tier, question_id, answer, txline_score)

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
