#!/usr/bin/env bash
#
# Serves the built demo (demo/build) with the Node adapter's own server, in a Node.js container, on
# 127.0.0.1:<port> (3000 by default). ORIGIN is the address the browser opens: the app checks a form's
# action against it.
#
#   bash .github/scripts/serve-demo.sh [port]

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
NODE_IMAGE="${NODE_IMAGE:-node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530}"
DEMO_DIR="${DEMO_DIR:-$ROOT/demo}"
PORT="${1:-3000}"

exec docker run --rm --name "svelte-steps-demo-${PORT}" -u "$(id -u):$(id -g)" -e PORT=3000 -e ORIGIN="http://127.0.0.1:${PORT}" \
  -p "127.0.0.1:${PORT}:3000" -v "$DEMO_DIR:/app:ro" -w /app "$NODE_IMAGE" node build < /dev/null
