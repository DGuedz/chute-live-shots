from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _answer_value(question):
    return question['options'][0]['value']


def test_quiz_reveals_one_question_at_a_time():
    current = client.get('/api/quizzes/argentina-spain/current?participant_id=test-sequential').json()
    assert current['answered'] == 0
    assert current['question']['id'] == 'q1'
    assert 'q2' not in current
    assert current['content_hash'].startswith('sha256:')  # session freeze exposes the locked hash
    answer = _answer_value(current['question'])
    response = client.post('/api/quizzes/argentina-spain/answers', json={'participant_id': 'test-sequential', 'question_id': 'q1', 'answer': answer, 'request_id': 'quiz-flow-1'})
    assert response.status_code == 200
    assert response.json()['answered'] == 1
    assert response.json()['next_question']['id'] == 'q2'


def test_options_carry_auditable_probability_and_odds():
    quiz = client.get('/api/quizzes/argentina-spain').json()
    for question in quiz['questions']:
        assert len(question['options']) == 4
        values = [option['value'] for option in question['options']]
        assert len(values) == len(set(values))  # mutually exclusive
        for option in question['options']:
            assert 0 < option['probability'] <= 1
            assert option['odd'] >= 1
            assert option['risk']
            assert option['reward_multiplier'] >= 1


def test_invalid_option_is_rejected():
    current = client.get('/api/quizzes/argentina-spain/current?participant_id=test-invalid').json()
    response = client.post('/api/quizzes/argentina-spain/answers', json={'participant_id': 'test-invalid', 'question_id': current['question']['id'], 'answer': 'nao-existe', 'request_id': 'quiz-invalid-1'})
    assert response.status_code == 409


def test_unknown_fixture_is_fail_closed():
    response = client.get('/api/quizzes/00000000/current?participant_id=test-missing')
    assert response.status_code == 404
    assert response.json()['detail']['data_status'] == 'MISSING_DATA'


def _play_full_quiz(participant):
    current = client.get(f'/api/quizzes/argentina-spain/current?participant_id={participant}').json()
    step = 0
    while current['status'] == 'open':
        question = current['question']
        response = client.post('/api/quizzes/argentina-spain/answers', json={'participant_id': participant, 'question_id': question['id'], 'answer': _answer_value(question), 'request_id': f'{participant}-{step}'})
        assert response.status_code == 200
        current = client.get(f'/api/quizzes/argentina-spain/current?participant_id={participant}').json()
        step += 1
    return current


def test_ranking_is_rebuilt_from_database_after_restart():
    final = _play_full_quiz('test-durable')
    assert final['status'] == 'complete'
    score_before = final['score']['score']
    # Simulate a restart: wipe every in-process cache the API keeps.
    from app import main as main_module
    main_module.seen_requests.clear()
    ranking = client.get('/api/quizzes/argentina-spain/ranking').json()
    mine = next(row for row in ranking['ranking'] if row['participant_id'] == 'test-durable')
    assert mine['score'] == score_before
    assert ranking['status'] == 'scored_from_db'


def test_ranking_orders_numerically():
    ranking = client.get('/api/quizzes/argentina-spain/ranking').json()['ranking']
    scores = [row['score'] for row in ranking if row['score'] is not None]
    assert scores == sorted(scores, reverse=True)


def test_three_tiers_are_playable_on_replay():
    for tier in ('chutes', 'escanteios', 'faltas'):
        quiz = client.get(f'/api/quizzes/argentina-spain?tier={tier}').json()
        assert quiz['tier'] == tier
        assert quiz['quiz_id'].endswith(tier)
        assert len(quiz['questions']) == 5
        assert quiz['questions'][4]['kind'] == 'proof_sequence'


def test_unknown_tier_is_rejected():
    response = client.get('/api/quizzes/argentina-spain?tier=inexistente')
    assert response.status_code == 409


def test_insights_editorial_for_final_and_availability_for_replay():
    final = client.get('/api/fixtures/18257739/insights').json()
    assert final['data_status'] == 'editorial_curated'
    assert final['has_snapshot'] is False
    assert all(t['available'] is False for t in final['tiers'])  # fail-closed: sem snapshot, sem quiz
    replay = client.get('/api/fixtures/18179551/insights').json()
    assert replay['has_snapshot'] is True
    assert all(t['available'] for t in replay['tiers'])
