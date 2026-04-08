#!/bin/sh
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "/Volumes/2Work 1-Drive/Claud/content-pricing-calc"
exec /usr/local/bin/node /usr/local/bin/npm run dev -- --port 5173 --host
