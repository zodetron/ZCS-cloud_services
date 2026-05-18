#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Check Node ────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "❌  Node.js not found. Install it from https://nodejs.org"
  exit 1
fi

# ── Install deps if node_modules missing ─────────────────────────────────────
if [ ! -d "$DIR/backend/node_modules" ]; then
  echo "📦  Installing backend dependencies..."
  npm --prefix "$DIR/backend" install
fi

if [ ! -d "$DIR/frontend/node_modules" ]; then
  echo "📦  Installing frontend dependencies..."
  npm --prefix "$DIR/frontend" install
fi

# ── Open backend in a new Terminal tab ───────────────────────────────────────
osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '$DIR/backend' && echo '🚀  Backend starting on http://localhost:4000' && npm run dev"
end tell
EOF

# ── Open frontend in a new Terminal tab ──────────────────────────────────────
osascript <<EOF
tell application "Terminal"
  activate
  tell application "System Events" to keystroke "t" using command down
  delay 0.5
  do script "cd '$DIR/frontend' && echo '🌐  Frontend starting on http://localhost:3000' && npm run dev" in front window
end tell
EOF

echo ""
echo "✅  StorageCloud is starting:"
echo "   Frontend  →  http://localhost:3000"
echo "   Backend   →  http://localhost:4000"
echo ""
echo "   (Two Terminal tabs opened — close them to stop the servers)"
