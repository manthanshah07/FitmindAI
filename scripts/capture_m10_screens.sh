#!/usr/bin/env bash
set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FLAGS="--headless=new --disable-gpu --disable-background-networking --disable-sync --no-default-browser-check --no-first-run --run-all-compositor-stages-before-draw --virtual-time-budget=3000"

mkdir -p docs/screens/m10

# Build and start Vite preview server
npm run build
PORT=4178
if ! lsof -i :$PORT >/dev/null 2>&1; then
  echo "Starting vite preview server on port $PORT..."
  npm run preview -- --port $PORT > /tmp/vite_preview_m10.log 2>&1 &
  PREVIEW_PID=$!
  sleep 2
else
  PREVIEW_PID=""
fi

capture() {
  local url="$1"
  local size="$2"
  local out="$3"
  local udir=$(mktemp -d /tmp/chrome_ss_m10_XXXXXX)
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

BASE="http://localhost:$PORT"

# 1. 360px Viewport Audits (Compact mobile)
capture "$BASE/dev/today" "360,780" "docs/screens/m10/today_360.png"
capture "$BASE/dev/workouts" "360,780" "docs/screens/m10/workouts_360.png"
capture "$BASE/dev/workout-session" "360,780" "docs/screens/m10/workout_session_360.png"
capture "$BASE/dev/nutrition" "360,780" "docs/screens/m10/nutrition_360.png"
capture "$BASE/dev/progress" "360,780" "docs/screens/m10/progress_360.png"

# 2. 390px Viewport Audits (Standard iPhone)
capture "$BASE/dev/today" "390,844" "docs/screens/m10/today_390.png"
capture "$BASE/dev/workouts" "390,844" "docs/screens/m10/workouts_390.png"
capture "$BASE/dev/workout-session" "390,844" "docs/screens/m10/workout_session_390.png"
capture "$BASE/dev/nutrition" "390,844" "docs/screens/m10/nutrition_390.png"
capture "$BASE/dev/progress" "390,844" "docs/screens/m10/progress_390.png"

# 3. 430px Viewport Audits (Large mobile / Max)
capture "$BASE/dev/today" "430,932" "docs/screens/m10/today_430.png"
capture "$BASE/dev/workouts" "430,932" "docs/screens/m10/workouts_430.png"
capture "$BASE/dev/workout-session" "430,932" "docs/screens/m10/workout_session_430.png"
capture "$BASE/dev/nutrition" "430,932" "docs/screens/m10/nutrition_430.png"
capture "$BASE/dev/progress" "430,932" "docs/screens/m10/progress_430.png"

if [ -n "$PREVIEW_PID" ]; then
  kill -9 "$PREVIEW_PID" 2>/dev/null || true
fi

echo "All viewport screenshots successfully captured in docs/screens/m10/!"
