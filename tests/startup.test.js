// Boots server.js for real with controlled env vars. cwd is an empty temp dir,
// so dotenv finds no .env — the real .env is never read.
const { spawn, spawnSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'server.js');
let cwd;
beforeAll(() => { cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'boot-')); });
afterAll(() => fs.rmSync(cwd, { recursive: true, force: true }));

const baseEnv = { PATH: process.env.PATH, NODE_ENV: 'test', PORT: '0' };
const boot = env => spawnSync(process.execPath, [SERVER], { cwd, env: { ...baseEnv, ...env }, encoding: 'utf8', timeout: 10000 });

test('refuses to boot without ADMIN_PASS_HASH and SESSION_SECRET', () => {
  const r = boot({});
  expect(r.status).toBe(1);
  expect(r.stderr).toMatch(/ADMIN_PASS_HASH is not set/);
  expect(r.stderr).toMatch(/SESSION_SECRET is not set/);
});

test('refuses a short SESSION_SECRET and a malformed hash, without printing either value', () => {
  const r = boot({ ADMIN_PASS_HASH: 'not-a-bcrypt-hash-value', SESSION_SECRET: 'too-short-secret-value' });
  expect(r.status).toBe(1);
  expect(r.stderr).toMatch(/at least 32 characters/);
  expect(r.stderr).toMatch(/not a valid bcrypt hash/);
  expect(r.stdout + r.stderr).not.toContain('too-short-secret-value');
  expect(r.stdout + r.stderr).not.toContain('not-a-bcrypt-hash-value');
});

test('boots with valid values and warns (by name only) about a leftover ADMIN_PASS', async () => {
  const child = spawn(process.execPath, [SERVER], {
    cwd,
    env: {
      ...baseEnv,
      ADMIN_PASS_HASH: process.env.ADMIN_PASS_HASH,
      SESSION_SECRET:  process.env.SESSION_SECRET,
      ADMIN_PASS:      'old-plain-password-value'
    }
  });
  let out = '';
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { out += d; });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`did not boot:\n${out}`)), 8000);
    const check = () => { if (out.includes('Portfolio  →')) { clearTimeout(timer); resolve(); } };
    child.stdout.on('data', check);
    child.stderr.on('data', check);
  }).finally(() => child.kill());
  expect(out).toMatch(/ADMIN_PASS is no longer used/);
  expect(out).not.toContain('old-plain-password-value');
  expect(out).not.toContain(process.env.SESSION_SECRET);
});
