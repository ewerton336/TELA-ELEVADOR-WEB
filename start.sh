#!/bin/sh
# Ensure data directory exists for SQLite database
mkdir -p /app/data

# Start the API + RSS proxy server in background
cd /app && node rss-proxy.cjs &

# Start nginx in foreground
nginx -g "daemon off;"
