#!/usr/bin/env node
// Seed projects from data/projects.seed.json, keyed by slug.
//
//   npm run seed                      insert missing projects, never overwrite existing ones
//   npm run seed -- --update          also overwrite existing projects with the seed values
//   npm run seed -- --allow-remote    permit a non-localhost MONGODB_URI (off by default)
//
// Safe to re-run. The connection string is never printed.
require('dotenv').config();
const path     = require('path');
const mongoose = require('mongoose');
const Project  = require('../src/models/Project');
const { isLocalMongoUri } = require('../src/utils/mongoUri');

const args        = new Set(process.argv.slice(2));
const allowRemote = args.has('--allow-remote');
const update      = args.has('--update');

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

  const { projects } = require(path.join(__dirname, '..', 'data', 'projects.seed.json'));

  // Validate everything up front so a bad entry doesn't leave a half-seeded DB.
  for (const p of projects) await new Project(p).validate();

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await Project.init();   // make sure the unique slug index exists

  const counts = { inserted: 0, updated: 0, skipped: 0 };
  for (const p of projects) {
    const exists = await Project.exists({ slug: p.slug });
    if (!exists) {
      await Project.create(p);
      counts.inserted++;
    } else if (update) {
      await Project.updateOne({ slug: p.slug }, { $set: p }, { runValidators: true });
      counts.updated++;
    } else {
      counts.skipped++;
    }
  }

  console.log(`✓ Seed complete (${allowRemote ? 'remote allowed' : 'local'}): ` +
              `${counts.inserted} inserted, ${counts.updated} updated, ${counts.skipped} unchanged.`);
}

main()
  .catch(err => {
    // Validation errors are safe to show (field names); anything else stays generic.
    if (err?.name === 'ValidationError') console.error('✖ Seed data invalid:', Object.keys(err.errors).join(', '));
    else console.error('✖ Seed failed:', err?.name || 'Error');
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
