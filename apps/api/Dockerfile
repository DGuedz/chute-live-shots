FROM python:3.12-slim

WORKDIR /srv/chute

COPY apps/api/requirements.txt apps/api/requirements.txt
RUN pip install --no-cache-dir -r apps/api/requirements.txt

COPY apps/api apps/api
# Replay snapshot + editorial data seeded into SQLite on startup
COPY data data
COPY scripts scripts

ENV CHUTE_DB_PATH=/srv/chute/data/chute.db
EXPOSE 8000

WORKDIR /srv/chute/apps/api
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
