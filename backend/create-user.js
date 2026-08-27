import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const positionalArgs = args.filter((a) => a !== '--local');

const username = positionalArgs[0];
const password = positionalArgs[1];

if (!username || !password) {
  console.log('\nUsage: node create-user.js <username> <password> [--local]');
  console.log('Example (Production): node create-user.js rishabh MyStrongPassword123!');
  console.log('Example (Local Dev):   node create-user.js rishabh MyStrongPassword123! --local\n');
  process.exit(1);
}

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

const sql = `INSERT INTO users (username, password_hash) VALUES ('${username.replace(/'/g, "''")}', '${hash}');\n`;
const tempFile = path.join(process.cwd(), '.temp_create_user.sql');
const targetEnv = isLocal ? 'local development' : 'production Cloudflare D1';
const flag = isLocal ? '--local' : '--remote';

try {
  fs.writeFileSync(tempFile, sql, 'utf8');
  console.log(`\nCreating user "${username}" in ${targetEnv}...`);
  execSync(`npx wrangler d1 execute investment-tracker-db ${flag} --file="${tempFile}" -y`, { stdio: 'inherit' });
  console.log(`\n✅ User "${username}" successfully created in ${targetEnv}!\n`);
} catch (err) {
  console.error('\n❌ Failed to create user:', err.message);
} finally {
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
