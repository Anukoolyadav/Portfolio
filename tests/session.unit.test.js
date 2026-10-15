// Unit tests: session tokens, env validation, hash-password script + dotenv quoting.
const { spawnSync } = require('child_process');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const session     = require('../src/auth/session');
const validateEnv = require('../src/config/validateEnv');

describe('session tokens', () => {
  test('a fresh token verifies', () => {
    const payload = session.verifyToken(session.createToken());
    expect(payload).toMatchObject({ v: 1 });
    expect(payload.exp - payload.iat).toBe(session.MAX_AGE_MS);
  });

  test('expired token is rejected', () => {
    const past = Date.now() - session.MAX_AGE_MS - 1000;
    expect(session.verifyToken(session.createToken(past))).toBeNull();
    const t = session.createToken();
    expect(session.verifyToken(t, Date.now() + session.MAX_AGE_MS + 1)).toBeNull();
  });

  test('tampered payload or signature is rejected', () => {
    const t = session.createToken();
    const [body, sig] = t.split('.');
    const forgedBody = Buffer.from(JSON.stringify({ v: 1, iat: 0, exp: Date.now() * 2, nonce: 'x' })).toString('base64url');
    expect(session.verifyToken(`${forgedBody}.${sig}`)).toBeNull();
    const flipped = sig.slice(0, -2) + (sig.at(-2) === 'A' ? 'B' : 'A') + sig.at(-1);
    expect(session.verifyToken(`${body}.${flipped}`)).toBeNull();
    expect(session.verifyToken(`${body}.${sig}=`)).toBeNull();        // non-canonical encoding
    expect(session.verifyToken(`${body}.${sig}.extra`)).toBeNull();
    expect(session.verifyToken('')).toBeNull();
    expect(session.verifyToken(undefined)).toBeNull();
  });

  test('token signed with another secret is rejected', () => {
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = 'another-secret-another-secret-another-secret';
    const other = session.createToken();
    process.env.SESSION_SECRET = original;
    expect(session.verifyToken(other)).toBeNull();
  });

  test('wrong version is rejected even with a valid signature', () => {
    expect(session.verifyToken(session.sign({ v: 2, exp: Date.now() + 10000 }))).toBeNull();
  });

  test('readCookie picks the right cookie and tolerates junk', () => {
    const req = cookie => ({ headers: { cookie } });
    expect(session.readCookie(req('a=1; admin_session=tok.en; b=2'))).toBe('tok.en');
    expect(session.readCookie(req('admin_session_x=1'))).toBeUndefined();
    expect(session.readCookie(req('admin_session=%E0%A4%A'))).toBeUndefined();
    expect(session.readCookie({ headers: {} })).toBeUndefined();
  });
});

describe('validateEnv', () => {
  const hash   = bcrypt.hashSync('whatever-password', 4);
  const secret = 'x'.repeat(32);

  test('valid env has no problems', () => {
    expect(validateEnv({ ADMIN_PASS_HASH: hash, SESSION_SECRET: secret })).toEqual([]);
  });

  test.each([
    [{ SESSION_SECRET: secret }, /ADMIN_PASS_HASH is not set/],
    [{ ADMIN_PASS_HASH: '2b$12$truncated', SESSION_SECRET: secret }, /not a valid bcrypt hash/],
    [{ ADMIN_PASS_HASH: hash }, /SESSION_SECRET is not set/],
    [{ ADMIN_PASS_HASH: hash, SESSION_SECRET: 'short-secret-value' }, /at least 32 characters/]
  ])('reports %#', (env, pattern) => {
    const problems = validateEnv(env);
    expect(problems.join(' ')).toMatch(pattern);
    for (const v of Object.values(env)) expect(problems.join(' ')).not.toContain(v);   // no values
  });
});

describe('scripts/hash-password.js', () => {
  const script = path.join(__dirname, '..', 'scripts', 'hash-password.js');
  const run = input => spawnSync(process.execPath, [script], { input, encoding: 'utf8' });

  test('prints only a bcrypt hash of the password', () => {
    const out = run('test-password-123\n');
    expect(out.status).toBe(0);
    const lines = out.stdout.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(validateEnv.BCRYPT_HASH);
    expect(out.stdout).not.toContain('test-password-123');
    expect(bcrypt.compareSync('test-password-123', lines[0])).toBe(true);
  });

  test('refuses short passwords', () => {
    const out = run('short\n');
    expect(out.status).toBe(1);
    expect(out.stdout).toBe('');
  });

  test('the hash (with $ characters) survives dotenv parsing, quoted or not', () => {
    const hash = run('test-password-123\n').stdout.trim();
    expect(hash).toContain('$');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envtest-'));
    for (const line of [`ADMIN_PASS_HASH=${hash}`, `ADMIN_PASS_HASH='${hash}'`, `ADMIN_PASS_HASH="${hash}"`]) {
      fs.writeFileSync(path.join(dir, '.env'), `${line}\n`);
      const target = {};
      dotenv.config({ path: path.join(dir, '.env'), processEnv: target });
      expect(target.ADMIN_PASS_HASH).toBe(hash);
      expect(dotenv.parse(line).ADMIN_PASS_HASH).toBe(hash);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
