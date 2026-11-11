"""Runs the Streamlit wrapper headlessly and fails on any exception or st.error."""
import sys
from pathlib import Path

from streamlit.testing.v1 import AppTest

app = AppTest.from_file(str(Path(__file__).parent.parent / "app.py"), default_timeout=60).run()
problems = [e.value for e in app.exception] + [e.value for e in app.error]
if problems:
    sys.exit(f"app.py failed: {problems}")
print("app.py renders cleanly")
