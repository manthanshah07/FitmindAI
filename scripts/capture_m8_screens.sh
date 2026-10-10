#!/usr/bin/env bash
set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FLAGS="--headless=new --disable-gpu --disable-background-networking --disable-sync --no-default-browser-check --no-first-run --run-all-compositor-stages-before-draw --virtual-time-budget=3000"

mkdir -p docs/screens/m8

# Build and start Vite preview server
npm run build
PORT=4178
if ! lsof -i :$PORT >/dev/null 2>&1; then
  echo "Starting vite preview server on port $PORT..."
  npm run preview -- --port $PORT > /tmp/vite_preview_m8.log 2>&1 &
  PREVIEW_PID=$!
  sleep 2
else
  PREVIEW_PID=""
fi

capture() {
  local url="$1"
  local size="$2"
  local out="$3"
  local udir=$(mktemp -d /tmp/chrome_ss_m8_XXXXXX)
  echo "Capturing $url at $size -> $out"
  rm -f "$out"

  "$CHROME" $FLAGS --user-data-dir="$udir" --window-size="$size" --screenshot="$out" "$url" >/dev/null 2>&1 &
  local pid=$!

  for i in {1..12}; do
    if [ -s "$out" ]; then
      sleep 0.5
      kill -9 "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      break
    fi
    sleep 1
  done

  kill -9 "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  rm -rf "$udir"

  if [ -s "$out" ]; then
    echo "Saved $out ($(wc -c < "$out") bytes)"
  else
    echo "Failed to capture $out"
  fi
}

# 1. Coach Empty State Mobile (390x844)
capture "http://localhost:4178/dev/coach" "390,844" "docs/screens/m8/coach_empty_mobile.png"

# 2. Coach Empty State Desktop (1280x800)
capture "http://localhost:4178/dev/coach" "1280,800" "docs/screens/m8/coach_empty_desktop.png"

# 3. Coach Chat with Structured Cards Mobile (390x844)
capture "http://localhost:4178/dev/coach?mock=true" "390,844" "docs/screens/m8/coach_chat_mobile.png"

# 4. Coach Chat with Structured Cards Desktop (1280x800)
capture "http://localhost:4178/dev/coach?mock=true" "1280,800" "docs/screens/m8/coach_chat_desktop.png"

# 5. Coach Privacy Disclosure Modal Desktop (1280x800)
capture "http://localhost:4178/dev/coach?modal=privacy" "1280,800" "docs/screens/m8/coach_privacy_modal_desktop.png"

if [ -n "$PREVIEW_PID" ]; then
  kill -9 "$PREVIEW_PID" 2>/dev/null || true
fi

echo "All Milestone M8 screenshots captured successfully!"
