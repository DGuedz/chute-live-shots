from app.quiz_engine import build_argentina_spain_quiz


def test_quiz_is_built_from_team_statistics():
    quiz = build_argentina_spain_quiz()
    assert quiz["quiz_id"].startswith("chute-txline-replay-")
    assert len(quiz["questions"]) == 5
    assert quiz["data_status"] == "txline_replay"
    assert quiz["content_hash"].startswith("sha256:")
    assert quiz["proof_refs"]
