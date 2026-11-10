#!/bin/sh
# Fake `claude` for tests. FAKE_STATE dir holds "loggedin" when logged in.
case "$1 $2" in
  "auth status") if [ -f "$FAKE_STATE/loggedin" ]; then echo '{"loggedIn":true}'; exit 0; else echo '{"loggedIn":false}'; exit 1; fi ;;
  "auth login")
    echo "Opening browser to sign in…"
    echo "If the browser didn't open, visit: https://claude.com/cai/oauth/authorize?code=true&state=abc"
    printf "Paste code here if prompted > "
    read code
    if [ "$code" = "good-code" ]; then touch "$FAKE_STATE/loggedin"; echo "Login successful"; exit 0; fi
    echo "Invalid code"; exit 1 ;;
esac
if [ "$1" = "remote-control" ]; then
  echo "rc-start $*" >> "$FAKE_STATE/rc.log"
  if [ -n "$FAKE_RC_ASK" ] && [ ! -f "$FAKE_STATE/consented" ]; then
    printf "Enable Remote Control? (y/n) "
    read ans
    case "$ans" in y*) touch "$FAKE_STATE/consented"; echo "consent:$ans" >> "$FAKE_STATE/rc.log" ;; *) echo "refused" >> "$FAKE_STATE/rc.log"; exit 1 ;; esac
  fi
  echo "Remote Control ready"
  sleep "${FAKE_RC_SECONDS:-1}"
  exit 1
fi
exit 2
