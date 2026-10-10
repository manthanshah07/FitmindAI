#!/usr/bin/env bash

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FLAGS="--headless=new --disable-gpu --disable-background-networking --disable-sync --no-default-browser-check --no-first-run --run-all-compositor-stages-before-draw --virtual-time-budget=3000"

mkdir -p docs/screens/m1

capture() {
  local url="$1"
  local size="$2"
  local out="$3"
  local udir=$(mktemp -d /tmp/chrome_ss_XXXXXX)
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

# 1. Dev UI
capture "http://localhost:4173/dev/ui" "390,844" "docs/screens/m1/dev_ui_mobile.png"
capture "http://localhost:4173/dev/ui" "1280,800" "docs/screens/m1/dev_ui_desktop.png"

# 2. Login
capture "http://localhost:4173/login" "390,844" "docs/screens/m1/login_mobile.png"
capture "http://localhost:4173/login" "1280,800" "docs/screens/m1/login_desktop.png"

# 3. Signup
capture "http://localhost:4173/signup" "390,844" "docs/screens/m1/signup_mobile.png"
capture "http://localhost:4173/signup" "1280,800" "docs/screens/m1/signup_desktop.png"

# 4. Today / Dashboard
capture "http://localhost:4173/dev/today" "390,844" "docs/screens/m1/today_mobile.png"
capture "http://localhost:4173/dev/today" "1280,800" "docs/screens/m1/today_desktop.png"

echo "All captures finished!"
