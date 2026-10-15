#!/usr/bin/env node
// Seed projects and experience from data/*.seed.json.
//
//   npm run seed                      insert missing entries, never overwrite existing ones
//   npm run seed -- --update          also overwrite existing entries with the seed values
//   npm run seed -- --only=projects   seed one resource (projects | experience)
//   npm run seed -- --allow-remote    permit a non-localhost MONGODB_URI (off by default)
//   npm run seed -- --force           also seed collections already seeded or edited in the admin
//
// A collection becomes "managed" after its first successful seed or its first admin
// write. Managed collections are skipped by default, so deleted entries are never
// re-created; --update on a managed collection therefore also needs --force.
//
// Entries are matched by their stable `seedKey`, so editing a seeded document's
// slug/company/role/dates in the admin never causes a duplicate on re-seed.
// Documents seeded before seedKey existed are backfilled once by their old
// identity (legacyMatch). Safe to re-run. The connection string is never printed.
const path       = require('path');
const mongoose   = require('mongoose');
const Project    = require('../src/models/Project');
const Experience = require('../src/models/Experience');
const { isLocalMongoUri } = require('../src/utils/mongoUri');
const { isManaged, markManaged } = require('../src/services/managedCollections');

const RESOURCES = {
  projects: {
    model:       Project,
    file:        'projects.seed.json',
    key:         'projects',
    legacyMatch: p => ({ slug: p.slug })
  },
  experience: {
    model:       Experience,
    file:        'experience.seed.json',
    key:         'experience',
    legacyMatch: e => ({ company: e.company, role: e.role, startDate: new Date(e.startDate) })
  }
};

function loadItems({ file, key }) {
  return require(path.join(__dirname, '..', 'data', file))[key];
}

// Seeds one resource on the current mongoose connection.
async function seedResource({ model, legacyMatch, ...resource }, { update = false, items } = {}) {
  items = items || loadItems(resource);

  // Validate everything up front so a bad entry doesn't leave a half-seeded collection.
  for (const item of items) {
    if (!item.seedKey) throw new Error('Every seed entry needs a seedKey.');
    await new model(item).validate();
  }
  await model.init();   // make sure indexes (incl. the unique sparse seedKey) exist

  const counts = { inserted: 0, updated: 0, backfilled: 0, skipped: 0 };
  for (const item of items) {
    if (await model.exists({ seedKey: item.seedKey })) {
      if (update) {
        await model.updateOne({ seedKey: item.seedKey }, { $set: item }, { runValidators: true });
        counts.updated++;
      } else {
        counts.skipped++;
      }
      continue;
    }

    // One-time backfill: a document seeded before seedKey existed.
    const legacy = await model.findOne({ ...legacyMatch(item), seedKey: { $exists: false } }).select('_id');
    if (legacy) {
      await model.updateOne({ _id: legacy._id }, { $set: update ? item : { seedKey: item.seedKey } },
                            { runValidators: true });
      counts.backfilled++;
      continue;
    }

    await model.create(item);
    counts.inserted++;
  }
  return counts;
}

// Seeds every (or one) resource. Managed collections are skipped unless force.
async function seedAll({ update = false, force = false, only } = {}) {
  const results = {};
  for (const [name, resource] of Object.entries(RESOURCES)) {
    if (only && only !== name) continue;
    if (!force && await isManaged(name)) {
      results[name] = { skippedManaged: true };
      continue;
    }
    results[name] = await seedResource(resource, { update });
    await markManaged(name);
  }
  return results;
}

async function main() {
  require('dotenv').config();   // only when run as a script — importing this file never reads .env
  const argv        = process.argv.slice(2);
  const allowRemote = argv.includes('--allow-remote');
  const update      = argv.includes('--update');
  const force       = argv.includes('--force');
  const only        = argv.find(a => a.startsWith('--only='))?.slice('--only='.length);

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
  const results = await seedAll({ update, force, only });
  for (const [name, c] of Object.entries(results)) {
    if (c.skippedManaged) {
      console.log(`  ${name.padEnd(10)} skipped — already seeded or edited in the admin (use --force to seed anyway)`);
      continue;
    }
    console.log(`  ${name.padEnd(10)} ${c.inserted} inserted, ${c.backfilled} backfilled, ` +
                `${c.updated} updated, ${c.skipped} unchanged`);
  }
}

if (require.main === module) {
  main()
    .catch(err => {
      // Validation errors are safe to show (field names); anything else stays generic.
      if (err?.name === 'ValidationError') console.error('✖ Seed data invalid:', Object.keys(err.errors).join(', '));
      else console.error('✖ Seed failed:', err?.name || 'Error');
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { RESOURCES, seedResource, seedAll };
