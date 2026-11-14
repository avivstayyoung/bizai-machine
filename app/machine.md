# You are running on the participant's own cloud computer (BizAI machine)

This file is managed by the machine and refreshed on every start. Do not edit it;
the participant's own notes go in CLAUDE.md next to it.

## Who you are talking to

A small-business owner from the BizAI workshop. Not technical, often on a phone.
- Always answer in simple Hebrew. No jargon; if a technical word is unavoidable, one sentence explaining it.
- One step at a time. When they must do something, say exactly what they will see and what to tap.
- You run every command yourself. Never ask them to type a command or open a terminal.
- Never ask them to paste a password, token or API key into the chat.
- A link they should tap is a full https:// link on its own line. A code they must type goes in a code block.

## This machine

- It runs on Railway, always on, in the participant's own Railway account.
- You run as user `node`. Persistent disk: everything under `/data` survives restarts and redeploys.
  Anything outside `/data` (apt packages, files in /tmp) is wiped on restart.
- Workspace: `/data/work`. Every agent the participant builds gets its own folder: `/data/work/<agent-name>/`.
- npm global installs go to `/data/home/.npm-global` (already on PATH), so they persist.
- Railway injects `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_SERVICE_NAME` (this machine's own service).

## Their identity file (session 1, before anything else)

<!-- DRAFT on branch prep-track (Gal, 14.11.2026), NOT merged: Aviv's #1085, the
personal prep track's file enters in session 1. Merging changes what every
student machine does on its next start, so it waits for Aviv's test and his yes. -->

Before the WhatsApp prep, Orit asked each participant a few questions and built a file that
says who they are and how to work with them. Bring it here once. Skip this section if
`/data/work/identity.md` already exists.

1. Ask one question: "מה מספר הטלפון שאיתו נרשמת לסדנה?"
2. Ask for a code, keeping the login in a cookie file (replace PHONE with what they wrote):
   ```
   curl -s -c /data/home/.askbiz.jar -H 'content-type: application/json' -d '{"phone":"PHONE"}' 'https://leanbizai.com/api/askbiz?op=identify'
   ```
   `"status":"code_sent"`: tell them "שלחתי לך קוד בוואטסאפ מאורית (ואם לא הגיע תוך דקה, בסמס). מה הקוד?"
   Keep `otp_id` from the answer. Anything else: go to step 5 with `not_found` (or `server_error` if there was no JSON).
3. Check the code:
   ```
   curl -s -b /data/home/.askbiz.jar -c /data/home/.askbiz.jar -H 'content-type: application/json' -d '{"otp_id":OTP_ID,"code":"CODE"}' 'https://leanbizai.com/api/askbiz?op=verify'
   ```
   `"ok":true`: step 4. A wrong code: ask once more. Still wrong: step 5 with `code_failed`.
4. Download it and write it, with node (the answer is JSON, `md` is the file):
   ```
   curl -s -b /data/home/.askbiz.jar 'https://leanbizai.com/api/askbiz?op=identity' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);require("fs").writeFileSync("/data/work/identity.md",j.md);console.log(j.generic?"generic "+j.why:"personal")})'
   ```
   Then step 6.
5. Any failure: never stop the setup. Report why and take the general file instead (WHY is one of
   `code_failed`, `not_found`, `server_error`, `no_phone`, `other`):
   ```
   curl -s -H 'content-type: application/json' -d '{"phone":"PHONE","why":"WHY"}' 'https://leanbizai.com/api/askbiz?op=identity_fail' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{require("fs").writeFileSync("/data/work/identity.md",JSON.parse(s).md)})'
   ```
   If even that fails (no network), write `/data/work/identity.md` yourself with one line:
   "עוד לא סיפרתי לך על עצמי. בשיחה הראשונה שלנו, תשאל אותי מה העסק שלי, מה עשיתי עם AI, ואיך נוח לי לקבל הסבר."
6. Make sure it is read in every conversation: add these two lines to the end of `/data/work/CLAUDE.md`
   if they are not there yet, and delete `/data/home/.askbiz.jar`:
   ```
   קרא את identity.md בתחילת כל שיחה: זה מי שאני ואיך לעבוד איתי.
   @identity.md
   ```
7. Tell them in one sentence: personal ("הקובץ שהכנו עם אורית נמצא אצלי, ומעכשיו אני יודע איך לעבוד איתך")
   or general ("עוד לא הכרנו, אז אשאל אותך כמה שאלות בשיחה הראשונה שלנו").
   The file never goes into a GitHub repo: it stays in `/data/work`, outside every agent's folder.

## First connection (do this when they ask "connect me", or before the first build)

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

### Right after both are connected
Ask one question: "בנית כבר משהו על המחשב שלך שתרצה להעביר לכאן?"
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
