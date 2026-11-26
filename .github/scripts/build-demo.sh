#!/usr/bin/env bash
#
# Makes the app the suite runs on, with the official create flow, and builds it with the Node adapter,
# in a Node.js container (nothing runs on the machine): `sv create --template demo --types ts
# --add sveltekit-adapter=adapter:node`, then `npm run build`, into demo/ beside .github/.
#
#   NODE_IMAGE   the image it runs in (default: Node.js 24 on Debian bookworm, slim, pinned by its digest)
#   SV_VERSION   the release of the create tool (default 1.7.1)
#   DEMO_DIR     where the app goes (default: demo/, beside .github/)
#
# The demo is the create tool's own (MIT): it is made here at each build, and nothing of it is kept in
# this repository.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
NODE_IMAGE="${NODE_IMAGE:-node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530}"
SV_VERSION="${SV_VERSION:-1.7.1}"
DEMO_DIR="${DEMO_DIR:-$ROOT/demo}"

if [ -e "$DEMO_DIR" ]; then
  echo "$DEMO_DIR is there already: remove it to make the demo again." >&2
  exit 1
fi
parent="$(dirname "$DEMO_DIR")"
name="$(basename "$DEMO_DIR")"
mkdir -p "$parent"

docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e npm_config_cache=/tmp/.npm -e npm_config_update_notifier=false \
  -v "$parent:/work" -w /work "$NODE_IMAGE" bash -c "
    npx --yes sv@${SV_VERSION} create --template demo --types ts --add sveltekit-adapter='adapter:node' --install npm --no-dir-check ${name} \
    && cd ${name} && npm run build \
    && node -e \"for (const p of ['@sveltejs/kit', 'svelte', 'vite', '@sveltejs/adapter-node']) console.log(p, require('./node_modules/' + p + '/package.json').version)\"
  " < /dev/null

echo "Built the demo into $DEMO_DIR/build"
