/**
 * Usage: node scripts/hash-password.js <your_password>
 * Outputs a bcrypt hash to paste into .env as APP_PASSWORD_HASH
 */
const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) { console.error('Usage: node hash-password.js <password>'); process.exit(1); }
const hash = bcrypt.hashSync(password, 12);
console.log('APP_PASSWORD_HASH=' + hash);
