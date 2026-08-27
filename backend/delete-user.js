import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const positionalArgs = args.filter((a) => a !== '--local');

const username = positionalArgs[0];

if (!username) {
  console.log('\nUsage: node delete-user.js <username> [--local]');
  console.log('Example (Production): node delete-user.js admin');
  console.log('Example (Local Dev):   node delete-user.js admin --local\n');
  process.exit(1);
}

const cleanUser = username.replace(/'/g, "''");
const sql = `
DELETE FROM net_worth_snapshots WHERE user_id IN (SELECT id FROM users WHERE username = '${cleanUser}');
DELETE FROM holdings WHERE user_id IN (SELECT id FROM users WHERE username = '${cleanUser}');
DELETE FROM users WHERE username = '${cleanUser}';
`;

const tempFile = path.join(process.cwd(), '.temp_delete_user.sql');
const targetEnv = isLocal ? 'local development' : 'production Cloudflare D1';
const flag = isLocal ? '--local' : '--remote';

try {
  fs.writeFileSync(tempFile, sql, 'utf8');
  console.log(`\nDeleting user "${username}" and all associated holdings/snapshots from ${targetEnv}...`);
  execSync(`npx wrangler d1 execute investment-tracker-db ${flag} --file="${tempFile}" -y`, { stdio: 'inherit' });
  console.log(`\n✅ User "${username}" successfully deleted from ${targetEnv}!\n`);
} catch (err) {
  console.error('\n❌ Failed to delete user:', err.message);
} finally {
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
