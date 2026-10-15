// The pages must satisfy the CSP we send: no inline scripts/handlers/<style>,
// and every external resource allowed by an explicit source.
const fs      = require('fs');
const path    = require('path');
const request = require('supertest');
const listen  = require('./helpers/server');
const { cspDirectives, SOURCES } = require('../src/config/security');

const app = listen();
const PUBLIC = path.join(__dirname, '..', 'public');
const read = file => fs.readFileSync(path.join(PUBLIC, file), 'utf8');

// Minimal CSP source matcher: 'self' for same-origin paths, exact file or
// path-prefix (trailing /) or origin for absolute URLs.
function allowedBy(url, sources) {
  if (!/^https?:/.test(url)) return sources.includes("'self'");
  return sources.some(src => {
    if (!/^https?:/.test(src)) return false;
    if (src.endsWith('/')) return url.startsWith(src);
    if (src === url) return true;
    try { return new URL(src).pathname === '/' && url.startsWith(new URL(src).origin + '/'); } catch { return false; }
  });
}

const policyOf = header => Object.fromEntries(header.split(';').map(part => {
  const [name, ...values] = part.trim().split(/\s+/);
  return [name, values];
}).filter(([name]) => name));

describe('CSP header', () => {
  test.each([['/'], ['/admin.html']])('is sent on %s and forbids inline/eval scripts', async url => {
    const res = await request(app).get(url).expect(200);
    const policy = policyOf(res.headers['content-security-policy']);
    expect(policy['script-src']).not.toContain("'unsafe-inline'");
    expect(policy['script-src']).not.toContain("'unsafe-eval'");
    expect(policy['script-src-attr']).toEqual(["'none'"]);
    expect(policy['style-src']).not.toContain("'unsafe-inline'");   // only style-src-attr is inline
    expect(policy['default-src']).toEqual(["'self'"]);
    expect(policy['object-src']).toEqual(["'none'"]);
    expect(policy['frame-ancestors']).toEqual(["'none'"]);
  });

  test('other security headers', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['strict-transport-security']).toBeUndefined();   // not outside production
  });

  test('production adds HSTS and upgrade-insecure-requests', () => {
    expect(cspDirectives(true).upgradeInsecureRequests).toEqual([]);
    expect(cspDirectives(false).upgradeInsecureRequests).toBeUndefined();
  });
});

describe.each([
  ['index.html', '/'],
  ['admin.html', '/admin.html']
])('%s satisfies the policy', (file, url) => {
  let html, policy;
  beforeAll(async () => {
    const res = await request(app).get(url).expect(200);
    html = res.text;                       // as served (index.html includes rendered sections)
    policy = policyOf(res.headers['content-security-policy']);
  });

  test('has no inline <script>, no inline event handlers, no <style> block', () => {
    const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)].map(m => m[1]);
    for (const attrs of scriptTags) expect(attrs).toMatch(/\bsrc=/);
    expect(html).not.toMatch(/\son[a-z]+\s*=\s*["']/i);
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/javascript:/i);
  });

  test('every script src is allowed by script-src', () => {
    const srcs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m => m[1]);
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) expect({ src, allowed: allowedBy(src, policy['script-src']) }).toEqual({ src, allowed: true });
  });

  test('every stylesheet href is allowed by style-src', () => {
    const hrefs = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)]
      .map(tag => tag[0].match(/href=["']([^"']+)["']/)?.[1])
      .filter(Boolean);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect({ href, allowed: allowedBy(href, policy['style-src']) }).toEqual({ href, allowed: true });
  });
});

describe('page scripts avoid CSP-violating patterns', () => {
  test.each([['js/main.js'], ['js/admin.js']])('%s', file => {
    const code = read(file);
    expect(code).not.toMatch(/\beval\s*\(/);
    expect(code).not.toMatch(/new\s+Function\s*\(/);
    expect(code).not.toMatch(/set(Timeout|Interval)\s*\(\s*["'`]/);   // string-body timers
    expect(code).not.toMatch(/createElement\(\s*['"]style['"]\s*\)/);
    expect(code).not.toMatch(/setAttribute\(\s*['"]style['"]/);
    expect(code).not.toMatch(/\.innerHTML\b/);
  });

  test('fetch() only talks to our own origin (connect-src self)', () => {
    for (const file of ['js/main.js', 'js/admin.js']) {
      for (const [, url] of read(file).matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) {
        expect(url.startsWith('/')).toBe(true);
      }
    }
  });
});

test('the SortableJS tag matches the pinned CSP source and carries an SRI hash', () => {
  const tag = read('admin.html').match(/<script[^>]*Sortable[^>]*>/i)[0];
  expect(tag).toContain(SOURCES.SORTABLE);
  expect(tag).toMatch(/integrity="sha512-[A-Za-z0-9+/=]+"/);
  expect(tag).toContain('crossorigin="anonymous"');
});
