#!/usr/bin/env node
// Prints a bcrypt hash for the admin password — and nothing else — on stdout.
//
//   npm run hash-password            prompts twice; typing is not echoed
//   echo "…" | npm run -s hash-password   non-interactive: first line of stdin
//
// Put the output in ADMIN_PASS_HASH (see .env.example for quoting).
const bcrypt = require('bcryptjs');

const MIN_LENGTH = 12;
const COST = 12;

// Reads one line from a TTY without echoing it.
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stderr.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = chunk => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stderr.write('\n');
          return resolve(value);
        }
        if (ch === '') {            // Ctrl-C
          stdin.setRawMode(false);
          process.stderr.write('\n');
          return reject(new Error('Cancelled.'));
        }
        if (ch === '' || ch === '\b') value = value.slice(0, -1);   // Backspace
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

function readFirstLine() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => { data += c; });
    process.stdin.on('end', () => resolve(data.split(/\r?\n/)[0] || ''));
  });
}

async function main() {
  let password;
  if (process.stdin.isTTY) {
    password = await promptHidden('Admin password (not shown): ');
    const again = await promptHidden('Repeat password: ');
    if (password !== again) throw new Error('Passwords do not match.');
  } else {
    password = await readFirstLine();
  }

  if (password.length < MIN_LENGTH) throw new Error(`Password must be at least ${MIN_LENGTH} characters.`);
  if (Buffer.byteLength(password) > 72) throw new Error('Password must be at most 72 bytes (bcrypt limit).');

  process.stdout.write(`${await bcrypt.hash(password, COST)}\n`);
}

main().catch(err => {
  process.stderr.write(`✖ ${err.message}\n`);
  process.exit(1);
});
