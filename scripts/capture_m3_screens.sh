#!/usr/bin/env bash
set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FLAGS="--headless=new --disable-gpu --disable-background-networking --disable-sync --no-default-browser-check --no-first-run --run-all-compositor-stages-before-draw --virtual-time-budget=3000"

mkdir -p docs/screens/m3

# Start Vite preview server in background if not already running
PORT=4173
if ! lsof -i :$PORT >/dev/null 2>&1; then
  echo "Starting vite preview server on port $PORT..."
  npm run preview -- --port $PORT > /tmp/vite_preview_m3.log 2>&1 &
  PREVIEW_PID=$!
  sleep 2
else
  PREVIEW_PID=""
fi

capture() {
  local url="$1"
  local size="$2"
  local out="$3"
  local udir=$(mktemp -d /tmp/chrome_ss_m3_XXXXXX)
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

# 1. Workout Session Mode (Mobile 390x844)
capture "http://localhost:4173/dev/workout-session" "390,844" "docs/screens/m3/workout_mode_session.png"

# 2. Workouts Overview Entry Points (Mobile 390x844)
capture "http://localhost:4173/dev/workouts" "390,844" "docs/screens/m3/workout_overview_mobile.png"

# 3. Today / Dashboard Entry Point (Mobile 390x844)
capture "http://localhost:4173/dev/today" "390,844" "docs/screens/m3/today_resume_mobile.png"

# 4. Dev UI System Showcase (Mobile 390x844)
capture "http://localhost:4173/dev/ui" "390,844" "docs/screens/m3/workout_mode_dev_ui.png"

if [ -n "$PREVIEW_PID" ]; then
  kill -9 "$PREVIEW_PID" 2>/dev/null || true
fi

echo "Screenshots successfully captured in docs/screens/m3/!"
