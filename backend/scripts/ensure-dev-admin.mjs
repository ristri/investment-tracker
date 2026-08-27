import * as bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy } from 'wrangler';

function splitStatements(schema) {
  return schema
    .split(/;\s*\n/g)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function ensureSchema(db, schema) {
  // Check if holdings table needs schema update for us_stock
  try {
    const tableInfo = await db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='holdings'").first();
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('us_stock')) {
      console.log('Migrating holdings table to support us_stock asset class...');
      await db.prepare('DROP TABLE IF EXISTS holdings').run();
      await db.prepare('DROP TABLE IF EXISTS net_worth_snapshots').run();
    }
  } catch {}

  for (const statement of splitStatements(schema)) {
    try {
      await db.prepare(statement).run();
    } catch (error) {
      if (!(error instanceof Error) || !/already exists/i.test(error.message)) {
        throw error;
      }
    }
  }

  // Ensure missing columns in net_worth_snapshots
  try {
    const cols = await db.prepare("PRAGMA table_info(net_worth_snapshots)").all();
    const colNames = (cols.results || []).map((c) => c.name);
    if (colNames.length > 0 && !colNames.includes('us_stocks_value')) {
      console.log('Adding missing us_stocks_value column to net_worth_snapshots...');
      await db.prepare('ALTER TABLE net_worth_snapshots ADD COLUMN us_stocks_value REAL NOT NULL DEFAULT 0').run();
    }
  } catch (e) {
    console.error('Error checking snapshot columns:', e);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');
const schemaPath = path.join(backendDir, 'schema.sql');
const configPath = path.join(backendDir, 'wrangler.jsonc');

const proxy = await getPlatformProxy({
  configPath,
  envFiles: [],
});

try {
  const schema = await readFile(schemaPath, 'utf8');
  await ensureSchema(proxy.env.investment_tracker_db, schema);

  const existingAdmin = await proxy.env.investment_tracker_db
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind('admin')
    .first();

  if (existingAdmin) {
    console.log('Dev admin user already exists.');
  } else {
    const passwordHash = await bcrypt.hash('password123', 10);
    await proxy.env.investment_tracker_db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .bind('admin', passwordHash)
      .run();

    console.log('Created dev admin user: admin / password123');
  }
} finally {
  await proxy.dispose();
}
