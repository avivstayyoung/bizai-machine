// End-to-end tests for the setup page + supervisor, against a fake `claude`.
// Each claim was checked against a mutation in server.mjs (see the commit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const fake = path.join(root, 'test', 'fake-claude.sh');

async function boot(extraEnv = {}, { loggedIn = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bizai-'));
  const state = path.join(dir, 'state');
  fs.mkdirSync(state);
  if (loggedIn) fs.writeFileSync(path.join(state, 'loggedin'), '');
  const port = 20000 + Math.floor(Math.random() * 20000);
  const env = { ...process.env, PORT: String(port), HOME: path.join(dir, 'home'), WORK_DIR: path.join(dir, 'work'), CLAUDE_BIN: fake, FAKE_STATE: state, NO_PTY: '1', ...extraEnv };
  const proc = spawn(process.execPath, [path.join(root, 'app', 'server.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  proc.stdout.on('data', (b) => { out += b; });
  proc.stderr.on('data', (b) => { out += b; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try { await fetch(base + '/healthz'); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  return { base, dir, state, env, proc, out: () => out, stop: () => proc.kill('SIGKILL') };
}
const post = (base, p, body) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });

test('fresh machine: page, open window, first-run dialogs pre-answered, guide installed', async (t) => {
  const m = await boot(); t.after(m.stop);
  const page = await (await fetch(m.base + '/')).text();
  assert.match(page, /התחברות ל-Claude/);
  const s = await (await fetch(m.base + '/api/state')).json();
  assert.equal(s.loggedIn, false);
  assert.equal(s.windowOpen, true);
  const cfg = JSON.parse(fs.readFileSync(path.join(m.env.HOME, '.claude.json'), 'utf8'));
  assert.equal(cfg.hasCompletedOnboarding, true);
  assert.equal(cfg.projects[m.env.WORK_DIR].hasTrustDialogAccepted, true);
  const set = JSON.parse(fs.readFileSync(path.join(m.env.HOME, '.claude', 'settings.json'), 'utf8'));
  assert.equal(set.skipDangerousModePermissionPrompt, true);
  assert.match(fs.readFileSync(path.join(m.env.WORK_DIR, 'CLAUDE.md'), 'utf8'), /@\.bizai\/machine\.md/);
  assert.ok(fs.existsSync(path.join(m.env.WORK_DIR, '.bizai', 'machine.md')));
});

test('participant CLAUDE.md is never overwritten on restart', async (t) => {
  const m = await boot(); m.stop();
  fs.writeFileSync(path.join(m.env.WORK_DIR, 'CLAUDE.md'), 'my notes');
  const m2 = await boot({ HOME: m.env.HOME, WORK_DIR: m.env.WORK_DIR }); t.after(m2.stop);
  assert.equal(fs.readFileSync(path.join(m.env.WORK_DIR, 'CLAUDE.md'), 'utf8'), 'my notes');
});

test('login: wrong code refused, right code connects and starts Remote Control', async (t) => {
  const m = await boot(); t.after(m.stop);
  let r = await post(m.base, '/api/login/start');
  let j = await r.json();
  assert.equal(r.status, 200);
  assert.match(j.url, /^https:\/\/claude\.com\/cai\/oauth\/authorize/);

  r = await post(m.base, '/api/login/code', { code: 'bad', nonce: j.nonce });
  assert.equal(r.status, 400);
  assert.equal((await (await fetch(m.base + '/api/state')).json()).loggedIn, false);

  j = await (await post(m.base, '/api/login/start')).json();
  r = await post(m.base, '/api/login/code', { code: 'good-code', nonce: 'someone-else' });
  assert.equal(r.status, 409, 'a code without the starter nonce is refused');

  r = await post(m.base, '/api/login/code', { code: 'good-code', nonce: j.nonce });
  assert.equal(r.status, 200);
  await new Promise((res) => setTimeout(res, 500));
  const rc = fs.readFileSync(path.join(m.state, 'rc.log'), 'utf8');
  assert.match(rc, /remote-control --name BizAI --permission-mode bypassPermissions --spawn same-dir/);

  r = await post(m.base, '/api/login/start');
  assert.equal(r.status, 409, 'once connected, nobody can start a new login');
});

test('setup window closed: no login can start', async (t) => {
  const m = await boot({ SETUP_WINDOW_MIN: '0' }); t.after(m.stop);
  const r = await post(m.base, '/api/login/start');
  assert.equal(r.status, 403);
  const s = await (await fetch(m.base + '/api/state')).json();
  assert.equal(s.windowOpen, false);
  assert.deepEqual(s.log, [], 'no diagnostics once the window is closed');
});

test('already logged in at boot: Remote Control starts and is restarted when it exits', async (t) => {
  const m = await boot({ FAKE_RC_SECONDS: '0' }, { loggedIn: true }); t.after(m.stop);
  await new Promise((res) => setTimeout(res, 4500));
  const starts = fs.readFileSync(path.join(m.state, 'rc.log'), 'utf8').trim().split('\n').length;
  assert.ok(starts >= 2, `restarted after exit (starts=${starts})`);
});

test('logged out while running: supervisor stops restarting and waits for setup', async (t) => {
  const m = await boot({ FAKE_RC_SECONDS: '1' }, { loggedIn: true }); t.after(m.stop);
  await new Promise((res) => setTimeout(res, 300));
  fs.rmSync(path.join(m.state, 'loggedin'));
  await new Promise((res) => setTimeout(res, 4500));
  assert.match(m.out(), /needs a Claude login/);
  const starts = fs.readFileSync(path.join(m.state, 'rc.log'), 'utf8').trim().split('\n').length;
  assert.equal(starts, 1);
});

test('first run asks "Enable Remote Control? (y/n)": the machine answers y once', async (t) => {
  const m = await boot({ FAKE_RC_ASK: '1', FAKE_RC_SECONDS: '2' }, { loggedIn: true }); t.after(m.stop);
  await new Promise((res) => setTimeout(res, 1500));
  const rcLog = fs.readFileSync(path.join(m.state, 'rc.log'), 'utf8');
  assert.match(rcLog, /consent:y/);
  assert.doesNotMatch(rcLog, /refused/);
});

test('the entrypoint keeps HOME on the volume (gosu would reset it to /home/node)', () => {
  const sh = fs.readFileSync(path.join(root, 'app', 'entrypoint.sh'), 'utf8');
  const line = sh.split('\n').find((l) => l.startsWith('exec gosu'));
  assert.match(line || '', /env HOME=\/data\/home /);
});
