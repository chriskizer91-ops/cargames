#!/bin/sh
# Builds dist/mini-dirt-run-open-world.html from base/ and src/ (see build.py).
set -e
cd "$(dirname "$0")"
python3 build.py
