import * as bcrypt from 'bcryptjs';

const username = process.argv[2] || 'admin';
const password = process.argv[3];

if (!password) {
  console.log('Usage: node hash-password.js <username> <password>');
  console.log('Example: node hash-password.js admin mySecurePassword123');
  process.exit(1);
}

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('=========================================');
console.log('Username:', username);
console.log('Password:', password);
console.log('Hash:    ', hash);
console.log('=========================================');
console.log('\nRun this command to insert into your production Cloudflare D1 database:');
console.log(`npx wrangler d1 execute investment-tracker-db --remote --command="INSERT INTO users (username, password_hash) VALUES ('${username}', '${hash}');"`);
console.log('=========================================\n');
