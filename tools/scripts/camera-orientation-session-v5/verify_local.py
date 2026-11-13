"""Finite local-only check recorder. No phone client or new dependencies."""
from pathlib import Path
import ast
import json
import shutil
import subprocess
import sys
import time
import controller_v5 as c
import main_session as m


def main():
    name = sys.argv[1]
    directory = Path(__file__).resolve().parent
    checks = {
        'host-v5': [sys.executable, '-B', '-m', 'unittest', 'discover', '-s', str(directory), '-p', 'test_*.py', '-v'],
        'frozen-v4': [sys.executable, '-B', '-m', 'unittest', 'discover', '-s', str(c.V4.parent), '-p', 'test_*.py', '-v'],
        'panel': [shutil.which('node'), str(m.ROOT / 'node_modules/jest/bin/jest.js'), '--config',
            str(directory / 'jest-session.config.cjs'), '--runInBand', '--json', '--outputFile', str(m.PREP / 'jest-results.json')],
    }
    c.require(name in checks, 'FIXED_LOCAL_CHECK_REQUIRED')
    target = m.PREP / (name + '-checks.json')
    c.require(not target.exists(), 'CHECK_RECEIPT_ALREADY_EXISTS')
    start = time.monotonic()
    result = subprocess.run(checks[name], cwd=m.ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
    receipt = dict(command=checks[name], cwd=str(m.ROOT), exitCode=result.returncode,
        seconds=time.monotonic()-start, stdout=result.stdout, stderr=result.stderr,
        scope='LOCAL_SYNTHETIC_OR_EXISTING_PANEL_ONLY_NO_PHONE')
    c.v4.exclusive(target, c.canonical(receipt))
    print(json.dumps(dict(check=name,exitCode=result.returncode,seconds=receipt['seconds'],receipt=str(target))))
    sys.exit(result.returncode)


if __name__ == '__main__': main()
