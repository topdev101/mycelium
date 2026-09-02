import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import db

try:
    db.init_db()
except Exception:
    pass

from app.main import app

__all__ = ["app"]
