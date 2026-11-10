# BizAI machine

One always-on cloud computer per BizAI workshop participant, on Railway.

Claude Code runs on it in Remote Control server mode, so the participant works
from the Claude app (phone or desktop, under Code) and everything they build
lives on this machine: no local install, no token copied anywhere.

## Participant flow
1. Open GitHub and Railway accounts (browser; Railway needs the Hobby plan so the machine stays on).
2. Click the BizAI template link: Railway creates the machine with a disk at `/data`.
3. Open the machine's address, tap "connect Claude", approve, paste the one-time code.
4. Open the Claude app, Code: the machine "BizAI" is there.
5. In the chat: "connect me to GitHub and Railway". Two browser approvals, no tokens.

## Template settings (Railway)
- Source: this repo. Volume mounted at `/data`. Public HTTP networking on.
- Optional variables: `MACHINE_NAME` (shown in the Claude app), `SETUP_WINDOW_MIN` (default 60),
  `PERMISSION_MODE` (default `bypassPermissions`).

## Files
- `app/server.mjs`: setup page + Remote Control supervisor (restart with backoff, stops when logged out).
- `app/machine.md`: the guide Claude reads on the machine (copied to `/data/work/.bizai/`).
- `test/`: `npm test`, against a fake `claude`.
