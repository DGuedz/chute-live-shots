import os
import tempfile

# Ephemeral database per test run: must be set before app.main is imported anywhere.
_db = tempfile.NamedTemporaryFile(prefix="chute-test-", suffix=".db", delete=False)
os.environ["CHUTE_DB_PATH"] = _db.name
