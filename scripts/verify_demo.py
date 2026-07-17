"""Offline smoke check for the deterministic TxLINE replay demo."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "apps" / "api"))
from app.quiz_engine import build_argentina_spain_quiz, score_answers

quiz = build_argentina_spain_quiz()
answers = [{"question_id": q["id"], "answer": q["options"][0]["value"]} for q in quiz["questions"]]
result = score_answers(quiz, answers)
assert quiz["data_status"] == "txline_replay"
assert quiz["content_hash"].startswith("sha256:")
assert quiz["proof_refs"]
assert len(result["ledger"]) == 5
print({"snapshot_id": quiz["snapshot_id"], "fixture_id": quiz["fixture_id"], "score": result["score"], "proof_status": result["proof_status"]})
