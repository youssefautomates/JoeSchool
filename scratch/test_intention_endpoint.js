const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const paymobSecretKey = env['PAYMOB_SECRET_KEY'];

const ids = [
  'pi_live_1a6c9c413a0c4771aa3abe6310b7b20c',
  'pi_live_da75ff60068c46e9a112891ddc1f4e67',
  'pi_live_af11f6a428cb4a739cd4a2f0c68cd792'
];

async function check() {
  for (const id of ids) {
    console.log(`\n--------------------------------------------`);
    console.log(`Checking ID: ${id}`);
    
    // Try without trailing slash
    const urlNoSlash = `https://accept.paymob.com/v1/intention/${id}`;
    console.log(`Trying URL: ${urlNoSlash}`);
    try {
      const res = await fetch(urlNoSlash, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${paymobSecretKey}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`No Slash Response Status: ${res.status}`);
      const text = await res.text();
      console.log(`No Slash Response Body: ${text}`);
    } catch (e) {
      console.error(`Error without slash:`, e);
    }
  }
}

check();
