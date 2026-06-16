const fs = require('fs');
const path = require('path');
const os = require('os');

const paths = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'auth.json'),
  path.join(os.homedir(), '.config', 'vercel', 'auth.json'),
  path.join(os.homedir(), 'AppData', 'Local', 'vercel', 'auth.json')
];

let token = null;
for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log(`Found auth file at: ${p}`);
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (data.token) {
        token = data.token;
        console.log('Successfully retrieved token!');
        break;
      }
    } catch (e) {
      console.error(`Error reading ${p}:`, e);
    }
  }
}

if (!token) {
  console.log('❌ Token not found in standard paths.');
}
