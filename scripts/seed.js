#!/usr/bin/env node
// Seed projects and experience from data/*.seed.json.
//
//   npm run seed                      insert missing entries, never overwrite existing ones
//   npm run seed -- --update          also overwrite existing entries with the seed values
//   npm run seed -- --only=projects   seed one resource (projects | experience)
//   npm run seed -- --allow-remote    permit a non-localhost MONGODB_URI (off by default)
//
// Safe to re-run. The connection string is never printed.
require('dotenv').config();
const path       = require('path');
const mongoose   = require('mongoose');
const Project    = require('../src/models/Project');
const Experience = require('../src/models/Experience');
const { isLocalMongoUri } = require('../src/utils/mongoUri');

// How each resource is identified for idempotent upserts.
const RESOURCES = {
  projects: {
    model: Project,
    file:  'projects.seed.json',
    key:   'projects',
    match: p => ({ slug: p.slug })
  },
  experience: {
    model: Experience,
    file:  'experience.seed.json',
    key:   'experience',
    match: e => ({ company: e.company, role: e.role, startDate: new Date(e.startDate) })
  }
};

const argv        = process.argv.slice(2);
const allowRemote = argv.includes('--allow-remote');
const update      = argv.includes('--update');
const only        = argv.find(a => a.startsWith('--only='))?.slice('--only='.length);

async function seedResource(name, { model, file, key, match }) {
  const items = require(path.join(__dirname, '..', 'data', file))[key];

  // Validate everything up front so a bad entry doesn't leave a half-seeded collection.
  for (const item of items) await new model(item).validate();
  await model.init();   // make sure indexes exist

  const counts = { inserted: 0, updated: 0, skipped: 0 };
  for (const item of items) {
    const filter = match(item);
    if (!(await model.exists(filter))) {
      await model.create(item);
      counts.inserted++;
    } else if (update) {
      await model.updateOne(filter, { $set: item }, { runValidators: true });
      counts.updated++;
    } else {
      counts.skipped++;
    }
  }
  console.log(`  ${name.padEnd(10)} ${counts.inserted} inserted, ${counts.updated} updated, ${counts.skipped} unchanged`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✖ MONGODB_URI is not set.');
    process.exit(1);
  }
  if (!isLocalMongoUri(uri) && !allowRemote) {
    console.error('✖ Refusing to seed: MONGODB_URI does not point to localhost/127.0.0.1.');
    console.error('  Re-run with --allow-remote if you really mean to seed a remote database.');
    process.exit(1);
  }
  if (only && !RESOURCES[only]) {
    console.error(`✖ Unknown --only value. Use one of: ${Object.keys(RESOURCES).join(', ')}`);
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`✓ Seeding (${allowRemote ? 'remote allowed' : 'local'}):`);
  for (const [name, resource] of Object.entries(RESOURCES)) {
    if (!only || only === name) await seedResource(name, resource);
  }
}

main()
  .catch(err => {
    // Validation errors are safe to show (field names); anything else stays generic.
    if (err?.name === 'ValidationError') console.error('✖ Seed data invalid:', Object.keys(err.errors).join(', '));
    else console.error('✖ Seed failed:', err?.name || 'Error');
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
