#!/bin/sh
# Runs as root only long enough to make the volume writable for the
# unprivileged user, then drops privileges. Claude Code refuses
# bypassPermissions as root, and nothing here needs root afterwards.
set -e
mkdir -p /data/home /data/work
for d in /data /data/home /data/work; do
  if [ "$(stat -c %U "$d")" != "node" ]; then chown node:node "$d"; fi
done
# First boot on a fresh volume: hand over anything root created inside.
if [ ! -f /data/home/.bizai-owned ]; then
  chown -R node:node /data/home /data/work
  touch /data/home/.bizai-owned && chown node:node /data/home/.bizai-owned
fi
# 🔴 HOME is passed explicitly: gosu resets it to the user's passwd home
# (/home/node), which is NOT on the volume. Found live 10.11.2026: the Claude
# login was written to /home/node/.claude and was gone after the first
# redeploy, while the page still said the disk was mounted.
exec gosu node env HOME=/data/home node /app/server.mjs
