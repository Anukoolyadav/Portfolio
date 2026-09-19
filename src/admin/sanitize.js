// Explicit write whitelist for admin input.
//
// sanitize(body, spec) returns { data, errors }:
// - keys not in the spec are rejected (never silently copied — no mass assignment),
// - each value must already have the right JSON type (no coercion),
// - '' clears optional strings, null clears nullable dates.
// Lengths, enums and URL schemes are then enforced by the mongoose schema.

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

const T = {
  string:   { check: v => typeof v === 'string', expect: 'a string', clean: v => (v.trim() === '' ? undefined : v) },
  boolean:  { check: v => typeof v === 'boolean', expect: 'true or false' },
  strings:  { check: v => Array.isArray(v) && v.every(s => typeof s === 'string'), expect: 'an array of strings',
              clean: v => v.map(s => s.trim()).filter(Boolean) },
  date:     { check: v => typeof v === 'string' && !Number.isNaN(Date.parse(v)), expect: 'a date (YYYY-MM-DD)',
              clean: v => new Date(v) },
  dateOrNull: { check: v => v === null || (typeof v === 'string' && (v === '' || !Number.isNaN(Date.parse(v)))),
                expect: 'a date (YYYY-MM-DD) or null', clean: v => (v ? new Date(v) : null) }
};

// Nested object of string fields, e.g. links: { github, live }.
const stringObject = keys => ({ kind: 'object', keys });

// Array of objects with string fields, e.g. metrics: [{ label, value }].
const objectList = keys => ({ kind: 'objectList', keys });

function sanitizeObject(value, keys, path, errors) {
  if (!isPlainObject(value)) { errors[path] = 'must be an object'; return undefined; }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (!keys.includes(k)) { errors[`${path}.${k}`] = 'is not an allowed field'; continue; }
    if (typeof v !== 'string') { errors[`${path}.${k}`] = 'must be a string'; continue; }
    out[k] = v.trim() === '' ? undefined : v.trim();
  }
  return out;
}

function sanitize(body, spec) {
  const data = {};
  const errors = {};
  if (!isPlainObject(body)) return { data, errors: { body: 'must be a JSON object' } };

  for (const [key, value] of Object.entries(body)) {
    const rule = spec[key];
    if (!rule) { errors[key] = 'is not an allowed field'; continue; }

    if (rule.kind === 'object') {
      const out = sanitizeObject(value, rule.keys, key, errors);
      if (out) data[key] = out;
      continue;
    }
    if (rule.kind === 'objectList') {
      if (!Array.isArray(value)) { errors[key] = 'must be an array'; continue; }
      data[key] = value.map((item, i) => sanitizeObject(item, rule.keys, `${key}.${i}`, errors));
      continue;
    }

    const type = T[rule];
    if (!type.check(value)) { errors[key] = `must be ${type.expect}`; continue; }
    data[key] = type.clean ? type.clean(value) : value;
  }
  return { data, errors };
}

module.exports = { sanitize, stringObject, objectList };
