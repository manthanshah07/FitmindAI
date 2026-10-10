#!/usr/bin/env bash
set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FLAGS="--headless=new --disable-gpu --disable-background-networking --disable-sync --no-default-browser-check --no-first-run --run-all-compositor-stages-before-draw --virtual-time-budget=3000"

mkdir -p docs/screens/m7

# Build and start Vite preview server
npm run build
PORT=4177
if ! lsof -i :$PORT >/dev/null 2>&1; then
  echo "Starting vite preview server on port $PORT..."
  npm run preview -- --port $PORT > /tmp/vite_preview_m7.log 2>&1 &
  PREVIEW_PID=$!
  sleep 2
else
  PREVIEW_PID=""
fi

capture() {
  local url="$1"
  local size="$2"
  local out="$3"
  local udir=$(mktemp -d /tmp/chrome_ss_m7_XXXXXX)
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

# 1. Weekly Review Tab Mobile (390x844)
capture "http://localhost:4177/dev/progress?tab=review" "390,844" "docs/screens/m7/weekly_review_mobile.png"

# 2. Weekly Review Tab Desktop (1280x800)
capture "http://localhost:4177/dev/progress?tab=review" "1280,800" "docs/screens/m7/weekly_review_desktop.png"

# 3. Forecast Tab Mobile (390x844)
capture "http://localhost:4177/dev/progress?tab=forecast" "390,844" "docs/screens/m7/forecast_mobile.png"

# 4. Forecast Tab Desktop (1280x800)
capture "http://localhost:4177/dev/progress?tab=forecast" "1280,800" "docs/screens/m7/forecast_desktop.png"

# 5. Progress Overview Mobile (390x844)
capture "http://localhost:4177/dev/progress" "390,844" "docs/screens/m7/progress_overview_mobile.png"

if [ -n "$PREVIEW_PID" ]; then
  kill -9 "$PREVIEW_PID" 2>/dev/null || true
fi

echo "All screenshots successfully captured in docs/screens/m7/!"
