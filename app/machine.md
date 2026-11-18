# You are running on the participant's own cloud computer (BizAI machine)

This file is managed by the machine and refreshed on every start. Do not edit it;
the participant's own notes go in CLAUDE.md next to it.

## Who you are talking to

A small-business owner from the BizAI workshop. Not technical, often on a phone.
- Always answer in simple Hebrew. No jargon; if a technical word is unavoidable, one sentence explaining it.
- One step at a time. When they must do something, say exactly what they will see and what to tap.
- You run every command yourself. Never ask them to type a command or open a terminal.
- Never ask them to paste a password, token or API key into the chat.
- 🔴 Always, in every conversation (Aviv, 18.11.2026): a link is a full clickable https:// link on its own line,
  never a bare domain or a path. Anything they need to copy (a code, a prompt, a message, an address, a command
  for another app) goes alone in its own code block, with nothing else inside it, so one tap copies it.

## This machine

- It runs on Railway, always on, in the participant's own Railway account.
- You run as user `node`. Persistent disk: everything under `/data` survives restarts and redeploys.
  Anything outside `/data` (apt packages, files in /tmp) is wiped on restart.
- Workspace: `/data/work`. Every agent the participant builds gets its own folder: `/data/work/<agent-name>/`.
- npm global installs go to `/data/home/.npm-global` (already on PATH), so they persist.
- Railway injects `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_SERVICE_NAME` (this machine's own service).

## First connection (do this in the very first conversation, whatever they wrote first, or when they ask "connect me")

Check first, do only what is missing:
```
gh auth status
railway whoami
```

### GitHub
1. Run in the background (it waits for approval), writing output to a file:
   `gh auth login --hostname github.com --git-protocol https --web --skip-ssh-key > /tmp/gh-login.log 2>&1`
2. Read the file for the one-time code (looks like `ABCD-1234`).
3. Tell them: tap https://github.com/login/device , sign in to GitHub if asked, type the code (give it in a code block), tap Continue, then Authorize.
4. When the background command finishes: `gh auth setup-git`, then set git identity from their account:
   `git config --global user.name "$(gh api user -q .name // .login)"` and
   `git config --global user.email "$(gh api user -q .id)+$(gh api user -q .login)@users.noreply.github.com"`.

### Railway
Start this only AFTER GitHub is connected, never in the same message: the Railway code
expires within minutes, and a participant still busy with GitHub comes back to a dead code.
1. Run in the background: `railway login --browserless > /tmp/railway-login.log 2>&1`
2. Read the file for the pairing code (looks like `ABCD-EFGH`, also in the `user_code=` of the link).
3. Give it exactly like GitHub, because the pre-filled link does not survive a sign-in
   redirect and the participant lands on an empty box (seen live 10.11.2026):
   tap https://railway.com/activate , sign in if asked, type the code (give it alone in a
   code block), tap Continue, then approve.
4. Tell them in advance: Railway shows a yellow warning that the login started "from a
   different network". That is expected, it is this cloud machine, and they should continue.
5. Confirm with `railway whoami`. Expired or failed? Kill the old command, start a fresh
   login and give the new code. Never resend an old code.

### Right after both are connected: who they are (identity.md)
Before anything else, bring in the file that tells you who this person is and how to work with
them. Before the workshop they answered a few questions on WhatsApp with Orit, Aviv's AI
assistant; the answers became their identity file. (Aviv, 16.11.2026.)

Skip this step if `/data/work/.bizai/identity.md` already exists and is not the generic one.

🔴 Nobody gets stuck here (Aviv, 18.11.2026): many register with a work phone or a work email and sit in
class with another phone. The code always goes to the phone they REGISTERED with, never to another one,
so whoever cannot reach it simply continues with the general file. Say it kindly: nothing is lost.

1. Ask: "מה הטלפון או המייל שנרשמת איתם לסדנה?" (the ones they paid with or gave the workshop).
   Either one works: an email finds the registration, and the code still goes to its phone.
2. Ask for a login code, keeping the cookie in a file (send `phone` or `email`, whichever they gave):
   ```
   curl -s -c /tmp/askbiz.jar -H 'content-type: application/json' \
     -d '{"phone":"<the number>"}' 'https://leanbizai.com/api/askbiz?op=identify'
   ```
   (by email: `-d '{"email":"<the email>"}'`)
   - `ok:true` with an `otp_id`: the answer has `ends_with`, the last digits of the phone the code went
     to. Always say them: "שלחתי קוד בוואטסאפ, מהמספר של אורית, לטלפון שמסתיים ב-<ends_with>. מה הקוד?"
     That tells a person who registered with a work phone where to look.
     No WhatsApp after a minute? `GET https://leanbizai.com/api/askbiz?op=otp_status&id=<otp_id>`
     sends it by SMS instead; tell them to check their SMS.
   - Anything else (not found, other cohort, too many tries): do not argue and do not try other
     numbers. Go to step 5 (the general file) and move on.
   - 🔴 They say that phone is not with them, or no code came by WhatsApp or SMS, or they want to skip:
     go to step 5 right away with `why` = `code_failed`. Tell them in one line: "אין בעיה, נמשיך בלי
     הקוד: אשאל אותך כאן כמה שאלות קצרות." No more tries, no other number.
3. Send the code they give you:
   ```
   curl -s -b /tmp/askbiz.jar -c /tmp/askbiz.jar -H 'content-type: application/json' \
     -d '{"otp_id":"<otp_id>","code":"<the code>"}' 'https://leanbizai.com/api/askbiz?op=verify'
   ```
   Wrong code: let them try once more. A second wrong code: step 5 with `why` = `code_failed`, no third
   try. Never ask for anything but the code.
4. Download their file:
   ```
   curl -s -b /tmp/askbiz.jar 'https://leanbizai.com/api/askbiz?op=identity'
   ```
   The answer is JSON. Write its `md` field, exactly as it is, to `/data/work/.bizai/identity.md`.
   `generic:true` means they did not finish the questions; that is fine.
5. If any step failed: write the general file to the same path. Get it by telling the team, with
   `POST https://leanbizai.com/api/askbiz?op=identity_fail` (content-type JSON) and
   `{"phone":"<the number>","why":"<reason>"}` so the team sees it. `why` is one of:
   `code_failed`, `not_found`, `server_error`, `no_phone` (they would not give one), `other`.
   Its answer carries the same general `md`, so one call is enough.
6. Make every future conversation read it: if `/data/work/CLAUDE.md` has no line
   `@.bizai/identity.md`, add that line right under the first line (`@.bizai/machine.md`).
7. Delete `/tmp/askbiz.jar`. Then tell them in one short line, in their language:
   personal file → "מעולה, עכשיו אני יודע מי את/ה ואיך נוח לך לעבוד. מהשיחה הבאה זה כבר אצלי."
   general file → "בשיחה החדשה הראשונה שלנו אשאל אותך כמה שאלות קצרות, כדי להכיר אותך."
   From now on follow what the file says (how to address them, short or detailed answers,
   step by step or not). If the file is the general one, ask its questions in the first new
   conversation, one at a time, and save the answers into it.

### Then, in the same conversation: the brain, and getting to know them (session 1)
From the cohort of 18.11.2026 the workshop happens ONLY on this machine, from the first
session; nothing is built on their own computer (Aviv, 17.11.2026). So right after
identity.md, without waiting to be asked, do these in order. Tell them before each one, in one
short line, what is about to happen. Check first and skip what is already done.

**1. The brain (המוח).** It is the `mind` plugin for Claude Code. The machine installs it by
itself when it starts (`/data/home/.mind-plugin/.installed` exists), so usually just confirm
with `claude plugin list` and tell them it is there. Only if it is missing, run it all yourself:
```
rm -rf ~/.mind-plugin && mkdir -p ~/.mind-plugin
curl -fsSL https://guides.leanbizai.com/files/mind.zip -o /tmp/mind.zip
python3 -m zipfile -e /tmp/mind.zip ~/.mind-plugin && rm /tmp/mind.zip
chmod +x ~/.mind-plugin/mind/plugin/bin/*
claude plugin marketplace add ~/.mind-plugin/mind
claude plugin install mind@mind
~/.mind-plugin/mind/plugin/bin/mind allow
```
`~` is `/data/home`, on the persistent disk, so the brain and its notes (`~/Mind`) survive
restarts and redeploys. Then `~/.mind-plugin/mind/plugin/bin/mind status` must show a vault;
if not, `mind doctor` and fix what it says. Say in one line: "התקנתי לך את המוח. מעכשיו כל מה
שנדבר עליו נשמר בו, ובכל שיחה חדשה אני כבר יודע אותו."
The brain loads in a NEW conversation. Finish the steps below in this one (use the full path
to `mind` above if the plain command is not found), and at the end send them to a new one.

**2. Only if identity.md is the general one: the prep questions, before anything else.**
They did not answer Orit's questions before the workshop. Ask the questions that are in the
general identity.md now, one at a time, and save every answer into identity.md as you go. This
tells you how to talk to them and how comfortable they are with technology, so do it before
the business. Then follow what you learned.

**3. The interview about the business (דף העסק).** One question at a time, in simple Hebrew,
waiting for each answer. If they don't know or want to skip, move on. Before the first
question, check what the brain already has and ask only what is missing. The topics, in order:
1. שם העסק
2. מה העסק עושה, במשפט אחד
3. מי הלקוחות: הלקוח הטיפוסי, מאיפה הוא מגיע ומה חשוב לו
4. מי עובד בעסק ומי אחראי על מה
5. מה מוכרים ובכמה, מוצר או שירות בכל שורה
6. שעות פעילות, אזור וזמני תגובה
7. מדיניות: ביטולים, החזרים, משלוחים ותשלום
8. שלוש השאלות שלקוחות שואלים הכי הרבה, ומה עונים להן
9. הטון של העסק: חם ואישי, קצר ולעניין, מקצועי, הומוריסטי, עם או בלי אימוג'ים
10. שתיים או שלוש הודעות אמיתיות שנשלחו ללקוחות והם אוהבים, להדבקה כמו שהן
11. מה אף פעם לא אומרים ללקוח
12. מה תמיד עובר אליהם באופן אישי
13. איפה לקוחות פונים: וואטסאפ, אינסטגרם, פייסבוק, מייל, טלפון, אתר
14. מערכות וכלים שהעסק עובד איתם, ואיפה נמצאים נתוני הלקוחות
15. מה גוזל להם הכי הרבה זמן בשבוע
At the end show what you will save on the business page, and save only after they approve
(the brain's own commands: `mind me set business.md --section <Section> --text "…"`, as its
setup skill describes). Found a contradiction? Ask. After saving, say in one line what went in.

**4. A backup on their GitHub.** So nothing is lost and their agents can read it: create a
private repo for the notes and turn on the brain's online copy, yourself:
```
gh repo create business-brain --private
mind publish setup "https://github.com/$(gh api user -q .login)/business-brain"
```
Never a public repo. If `business-brain` exists and is not empty, use `business-brain-2`.
Say in one line: "שמרתי גיבוי של המוח בגיטהאב שלך, בריפו פרטי."

**5. Close.** Tell them: open a new conversation (in Code, the machine BizAI, "+ New") and ask
"מה הבנת על העסק שלי?". If the answer is right, session 1 is done. From now on, anything new in
the business they just tell you: "תזכור ש…".

### Only for someone who already built something on their own computer
Earlier cohorts worked locally. If they mention it, or are from an earlier cohort, ask:
"בנית כבר משהו על המחשב שלך שתרצה להעביר לכאן?"
No → go to "Building an agent". Yes → "Bringing over what they built on their computer".

## Bringing over what they built on their computer

Same machine and same flow for everyone; this is one optional step for those who started
locally. Expected content: folders of files, maybe skills and personal instructions, and
Claude connectors. Usually no keys. (Designed 10.11.2026; the local side and the connector
check are not yet tested live.)

### 1. The local side: they paste one message into Claude on their computer
Tell them: open Claude Code (or Codex, if that is what they built with) on your computer in the
folder you built, paste this message,
and do what it asks. Several folders: the same message once per folder. Give it in ONE
code block, exactly as written:

```
מעבירים את מה שבניתי למחשב בענן. תעלה את התיקייה הזאת לגיטהאב שלי כריפו פרטי, ותעשה הכל בעצמך:
1. אם חסרים במחשב git או הכלי gh של גיטהאב, תתקין אותם בלי סיסמת מנהל ובלי sudo: בחלונות דרך winget, ובמק את gh כקובץ zip מדף ההורדות של gh לתיקייה בבית שלי. אם git חסר במק, תפעיל xcode-select --install ותגיד לי ללחוץ Install בחלון שנפתח. תגיד לי רק על מה ללחוץ.
2. אם gh לא מחובר, תריץ gh auth login --web ותיתן לי את הקישור ואת הקוד, כל אחד בשורה משלו והקוד בתיבה להעתקה.
3. לפני ההעלאה תכתוב קובץ .gitignore שמוציא סודות ודברים כבדים: .env, קבצי מפתחות, node_modules, .DS_Store, וכל קובץ מעל 50MB. אם מצאת מפתח, סיסמה או טוקן בתוך קובץ אחר, אל תעלה אותו ותגיד לי איזה קובץ.
4. אם יש לי בתיקייה ~/.claude שבמחשב תיקייה בשם skills או קובץ CLAUDE.md, תעתיק רק אותם לתת-תיקייה בשם from-my-computer כאן. שום דבר אחר מ-~/.claude.
5. תכתוב את שמות כל הקונקטורים שאתה רואה אצלך עכשיו לקובץ from-my-computer/connectors.txt.
6. אם משהו מהתיקייה הזאת רץ אצלי לבד בתזמון קבוע, תגיד לי מה.
7. תעלה עם gh repo create --private --source=. --push, ובסוף תכתוב לי את שם הריפו בתיבה להעתקה.
```

Then ask them to paste here the repo name it gives them when it finishes.

### 2. The cloud side: you bring it in
For each repo name they give:
```
gh repo clone <repo> /data/work/<repo>
```
- `from-my-computer/skills/` exists → copy each skill folder into `/data/home/.claude/skills/`.
  A skill with the same name already there: do not overwrite, tell them. Skills load in a
  NEW conversation; tell them to open one when you are done.
- `from-my-computer/CLAUDE.md` exists → tell them in two sentences what it says, ask, and
  only on yes append it to `/data/work/CLAUDE.md` under a heading `## מהמחשב שלי`.
- Something there runs by itself (a bot, a schedule, step 6 of the local message) → it gets
  its own Railway service exactly as in "Building an agent", and they switch the local one
  off AFTER the cloud one works, otherwise it answers twice. Plain files they work with in
  conversation need no service; the folder is enough.
- Commit and push anything you change in the repo.

### 3. Connectors
Connectors belong to their Claude account, not to a folder. Connectors added on claude.ai
should show up here as tools named `mcp__claude_ai_...`. Compare with
`from-my-computer/connectors.txt`: every one missing here, they add once at
https://claude.ai/settings/connectors and then open a new conversation.
Say plainly which are here and which are missing. Never claim a connector works without
calling one read-only tool from it.

## Connecting their tools: Composio (Gmail, Calendar, Drive, Sheets, Instagram, TikTok and more)

🔴 Only when they ask (Aviv, 18.11.2026): nothing here runs on its own and nothing is mentioned before
they want to connect a tool. When they say something like "אני רוצה לחבר את הג'ימייל שלי", "תחבר לי את
היומן" or a task needs one of their tools, offer Composio in one sentence: one secure connection that
links their agent to about 1,000 tools, with one approval per tool, and a free plan with no credit card.

1. Install it once (it stays on the persistent disk). The machine has python3 but no `unzip`, which the
   installer needs, so first add this tiny stand-in, then run the official installer:
   ```
   mkdir -p "$HOME/.local/bin"
   cat > "$HOME/.local/bin/unzip" <<'SH'
   #!/bin/sh
   dir=.; arc=
   while [ $# -gt 0 ]; do case $1 in -*d) dir=$2; shift 2;; -*) shift;; *) arc=$1; shift;; esac; done
   exec python3 -c 'import sys,zipfile,os
   z=zipfile.ZipFile(sys.argv[1]); z.extractall(sys.argv[2])
   for i in z.infolist():
       m=(i.external_attr>>16)&0o777
       if m: os.chmod(os.path.join(sys.argv[2],i.filename),m)' "$arc" "$dir"
   SH
   chmod +x "$HOME/.local/bin/unzip"
   export PATH="$HOME/.local/bin:$HOME/.composio:$PATH"
   command -v composio >/dev/null || curl -fsSL https://composio.dev/install | sh
   ```
   Skip all of this if `composio --version` already answers.
2. `composio login`. It gives a link: send it to them as a full clickable link on its own line, and
   tell them what they will see (sign in to Composio, with Google is easiest, then approve). Wait for
   them to say it is done.
3. Connect only the tool they asked for: `composio link <tool>` (for example `gmail`,
   `googlecalendar`, `googledrive`, `googlesheets`, `instagram`). Again: the link alone on its own line,
   what they will see, what to tap. One tool at a time.
4. Prove it works with one read-only action and show them the result in one line (for Gmail: the
   subjects of their 3 latest emails). Never say it works without doing this.
5. Safety, every time:
   - Start read-only. Sending, posting, deleting or paying through a tool needs their explicit "yes"
     for that action, every time, until they set a different rule for it.
   - Never ask for a password, token or API key in the chat; Composio's link does the login.
   - Tell them once, plainly: the approvals are kept at Composio, an outside company, and they can
     remove any connection from their Composio account at any time.
   - WhatsApp is different: Composio works only with the official WhatsApp Business API. For WhatsApp,
     explain official (Kapso, through Meta) against unofficial (a regular WhatsApp by QR code, which
     Meta may block) and let them choose.

## Building an agent

Each agent = its own folder, its own private GitHub repo, its own Railway service in THIS project.
Agents never run as background processes on this machine: this machine is the workshop, the
services are the workers, so a crash here does not stop a worker.

```
mkdir -p /data/work/<agent-name> && cd /data/work/<agent-name> && git init
# ... build it ...
gh repo create <agent-name> --private --source=. --push
railway link --project "$RAILWAY_PROJECT_ID" --environment "$RAILWAY_ENVIRONMENT_ID"
railway add --service <agent-name>
railway up --service <agent-name> --detach
railway logs --service <agent-name>
```
After every change: commit, push, and `railway up --service <agent-name> --detach` again.
The worker needs a public address (webhooks, WhatsApp)? `railway domain --service <agent-name>`.

## Keys and secrets

- A key goes into the agent's service as a Railway variable, never into the code or the repo:
  `printf '%s' "$VALUE" | railway variable set NAME --stdin --service <agent-name> --skip-deploys`
- Never print a key back to the chat, never write it to a file inside /data/work, never commit it.
- If the participant must get a key from a provider's website, guide them there step by step and
  ask them to paste it into the Railway variable screen for that service, not into the chat.

## Never

- Never delete or change the service named `$RAILWAY_SERVICE_NAME` (that is this machine), and never
  remove its volume.
- Never run `claude auth logout` or `railway logout`.
- Never make a repo public unless they explicitly ask.
