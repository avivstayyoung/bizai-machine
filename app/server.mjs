// BizAI machine: the setup page and the supervisor for Claude Remote Control.
//
// What the participant sees: one page on the machine's address. Before Claude
// is connected it has one button ("connect Claude"), a link to Anthropic's
// approval screen, and a box for the one-time code that screen shows. After
// that the page only says "connected, open the Claude app", and the machine
// appears in the Claude app under Code.
//
// What runs: `claude remote-control` in server mode inside WORK_DIR, restarted
// with backoff whenever it exits (it exits by design after ~10 minutes without
// network). Login lives on the volume (HOME=/data/home), so a restart or a
// redeploy does not ask for it again.
//
// Security gap, known and written here on purpose: before Claude is connected,
// anyone who has this machine's address can connect THEIR Claude account to it.
// Two limits make that narrow: the setup window is open only for
// SETUP_WINDOW_MIN minutes after each start and only while nobody is logged in,
// and the address is a random Railway subdomain. A participant who sees the
// page say "connected" when they did not connect it should delete the service.
// Not closed because the only closing option (a setup code shown in Railway's
// Variables tab) is exactly the token-copying step this machine exists to remove.

import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8080);
const HOME = process.env.HOME || '/data/home';
const WORK_DIR = process.env.WORK_DIR || '/data/work';
const CLAUDE = process.env.CLAUDE_BIN || 'claude';
const SETUP_WINDOW_MIN = Number(process.env.SETUP_WINDOW_MIN || 60);
const PERMISSION_MODE = process.env.PERMISSION_MODE || 'bypassPermissions';
export const MACHINE_NAME = safeName(process.env.MACHINE_NAME || 'BizAI');
const STARTED_AT = Date.now();

export function safeName(s) {
  const clean = String(s).replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 40);
  return clean || 'BizAI';
}

// ---------- log ring (Railway shows stdout; the page shows the tail during setup) ----------
const ring = [];
function log(line) {
  const l = `${new Date().toISOString().slice(11, 19)} ${line}`;
  ring.push(l);
  if (ring.length > 80) ring.shift();
  console.log(l);
}
const stripAnsi = (s) => s.replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '').replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');

// ---------- Claude config seeding ----------
// Without a terminal nobody can answer the first-run dialogs, so they are
// answered here: onboarding done, WORK_DIR trusted, and the bypass-mode
// warning accepted (this is an isolated machine owned by one person).
export function seedClaudeConfig(home = HOME, work = WORK_DIR) {
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  fs.mkdirSync(work, { recursive: true });
  const cfgPath = path.join(home, '.claude.json');
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch {}
  cfg.hasCompletedOnboarding = true;
  cfg.projects = cfg.projects || {};
  cfg.projects[work] = { ...(cfg.projects[work] || {}), hasTrustDialogAccepted: true, hasCompletedProjectOnboarding: true };
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), { mode: 0o600 });

  const setPath = path.join(home, '.claude', 'settings.json');
  let set = {};
  try { set = JSON.parse(fs.readFileSync(setPath, 'utf8')); } catch {}
  set.skipDangerousModePermissionPrompt = true;
  set.skipAutoPermissionPrompt = true;
  fs.writeFileSync(setPath, JSON.stringify(set, null, 2));

  // The guide for Claude on this machine. machine.md is ours and refreshed on
  // every start; CLAUDE.md belongs to the participant and is created once.
  const guideDir = path.join(work, '.bizai');
  fs.mkdirSync(guideDir, { recursive: true });
  fs.copyFileSync(new URL('./machine.md', import.meta.url), path.join(guideDir, 'machine.md'));
  const userMd = path.join(work, 'CLAUDE.md');
  if (!fs.existsSync(userMd)) fs.writeFileSync(userMd, '@.bizai/machine.md\n\n# הערות שלי\n');
}

// ---------- auth ----------
export function authStatus() {
  const r = spawnSync(CLAUDE, ['auth', 'status', '--json'], { encoding: 'utf8', timeout: 20000, env: process.env });
  try { return JSON.parse(r.stdout); } catch { return { loggedIn: false }; }
}

let login = null; // { proc, url, nonce, out, done, ok }

export function setupWindowOpen(now = Date.now()) {
  return now - STARTED_AT < SETUP_WINDOW_MIN * 60000;
}

function startLogin() {
  if (login && !login.done) login.proc.kill('SIGKILL');
  const proc = spawn(CLAUDE, ['auth', 'login', '--claudeai'], { cwd: WORK_DIR, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  const state = { proc, url: null, nonce: crypto.randomBytes(16).toString('hex'), out: '', done: false, ok: false };
  login = state;
  const onData = (b) => {
    state.out += stripAnsi(b.toString());
    const m = state.out.match(/https:\/\/claude\.(?:com|ai)\/\S*oauth\/authorize\S+/);
    if (m && !state.url) state.url = m[0];
  };
  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);
  proc.on('exit', (code) => { state.done = true; state.ok = code === 0; log(`login exited ${code}`); });
  setTimeout(() => { if (!state.done) proc.kill('SIGKILL'); }, 15 * 60000).unref();
  return state;
}

async function waitFor(pred, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (pred()) return true; await new Promise((r) => setTimeout(r, 200)); }
  return pred();
}

// ---------- Remote Control supervisor ----------
const rc = { proc: null, running: false, lastExit: null, restarts: 0, needsLogin: false, stopped: false };

function startRemoteControl() {
  if (rc.proc) return;
  rc.needsLogin = false;
  seedClaudeConfig();
  const args = ['remote-control', '--name', MACHINE_NAME, '--permission-mode', PERMISSION_MODE, '--spawn', 'same-dir'];
  // remote-control draws a terminal UI; `script` gives it a pseudo-terminal.
  const cmd = [CLAUDE, ...args].map((a) => `'${a.replace(/'/g, `'\\''`)}'`).join(' ');
  const proc = process.env.NO_PTY
    ? spawn(CLAUDE, args, { cwd: WORK_DIR, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] })
    : spawn('script', ['-qfec', cmd, '/dev/null'], { cwd: WORK_DIR, env: { ...process.env, TERM: 'xterm-256color' }, stdio: ['pipe', 'pipe', 'pipe'] });
  rc.proc = proc;
  rc.running = true;
  let buf = '';
  let consented = false;
  const onData = (b) => {
    buf += stripAnsi(b.toString());
    if (/must be logged in|not logged in|Run `claude auth login`/i.test(buf)) rc.needsLogin = true;
    // First run asks "Enable Remote Control? (y/n)" and waits, with nobody at
    // a terminal (found live, 10.11.2026: the machine sat on it after login).
    // The participant already said yes by connecting Claude on the setup page,
    // so the machine answers once; the CLI remembers it and never asks again.
    if (!consented && /Enable Remote Control\?\s*\(y\/n\)/i.test(buf)) {
      consented = true;
      // Enter is \r on a terminal (raw or cooked, the pty maps it); a plain pipe needs \n.
      try { proc.stdin.write(process.env.NO_PTY ? 'y\n' : 'y\r'); } catch {}
      log('rc: answered "y" to Enable Remote Control');
    }
    const lines = buf.split(/\r?\n|\r/);
    buf = lines.pop();
    for (const l of lines) { const t = l.trim(); if (t && !/^[⠁-⣿]/.test(t)) log(`rc: ${t.slice(0, 300)}`); }
  };
  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);
  proc.on('exit', (code) => {
    rc.proc = null; rc.running = false; rc.lastExit = Date.now();
    log(`remote-control exited ${code}`);
    if (rc.stopped) return;
    if (rc.needsLogin || !authStatus().loggedIn) { rc.needsLogin = true; log('remote-control needs a Claude login; waiting for setup'); return; }
    rc.restarts++;
    const delay = Math.min(60000, 3000 * 2 ** Math.min(rc.restarts - 1, 5));
    log(`restarting remote-control in ${delay / 1000}s`);
    setTimeout(startRemoteControl, delay).unref();
  });
  // A run that stays up for 10 minutes resets the backoff.
  setTimeout(() => { if (rc.proc === proc) rc.restarts = 0; }, 600000).unref();
}

// ---------- HTTP ----------
function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 10000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  });
}

function volumeMounted() {
  try { return fs.readFileSync('/proc/mounts', 'utf8').split('\n').some((l) => l.split(' ')[1] === '/data'); } catch { return true; }
}

export function stateNow() {
  const auth = authStatus();
  return {
    loggedIn: !!auth.loggedIn,
    machine: MACHINE_NAME,
    remoteControl: rc.running,
    windowOpen: setupWindowOpen(),
    volume: volumeMounted(),
    log: setupWindowOpen() ? ring.slice(-25) : [],
  };
}

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && url.pathname === '/healthz') return send(res, 200, { ok: true });
  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, fs.readFileSync(new URL('./page.html', import.meta.url), 'utf8'), 'text/html');
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, stateNow());

  if (req.method === 'POST' && url.pathname === '/api/login/start') {
    if (authStatus().loggedIn) return send(res, 409, { error: 'already_connected' });
    if (!setupWindowOpen()) return send(res, 403, { error: 'window_closed' });
    const s = startLogin();
    await waitFor(() => s.url || s.done, 20000);
    if (!s.url) return send(res, 500, { error: 'no_login_url', detail: s.out.slice(-400) });
    return send(res, 200, { url: s.url, nonce: s.nonce });
  }

  if (req.method === 'POST' && url.pathname === '/api/login/code') {
    const body = await readBody(req);
    if (!login || login.done || body.nonce !== login.nonce) return send(res, 409, { error: 'no_login_in_progress' });
    if (!setupWindowOpen()) return send(res, 403, { error: 'window_closed' });
    const code = String(body.code || '').trim();
    if (!code || code.length > 2000) return send(res, 400, { error: 'empty_code' });
    const s = login;
    s.proc.stdin.write(code + '\n');
    await waitFor(() => s.done, 45000);
    const auth = authStatus();
    if (!auth.loggedIn) {
      if (!s.done) s.proc.kill('SIGKILL');
      return send(res, 400, { error: 'login_failed', detail: s.out.slice(-300) });
    }
    log('claude login ok');
    startRemoteControl();
    return send(res, 200, { ok: true });
  }

  send(res, 404, { error: 'not_found' });
});

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  seedClaudeConfig();
  server.listen(PORT, '0.0.0.0', () => log(`BizAI machine "${MACHINE_NAME}" listening on ${PORT}`));
  if (authStatus().loggedIn) startRemoteControl();
  else log('waiting for Claude login on the setup page');
  const stop = () => { rc.stopped = true; rc.proc?.kill('SIGTERM'); process.exit(0); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
