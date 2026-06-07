const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let env = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.replace(/^"|"\s*$/g, '');
      }
      env[key] = value.trim();
    }
  });
} catch (e) {
  console.error('Failed to read .env.local file:', e);
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables in .env.local', { supabaseUrl, supabaseServiceKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Fetching Supabase storage buckets...');
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
    process.exit(1);
  }

  console.log('Existing buckets:', buckets.map(b => b.name));

  const targetBucket = 'instapay-receipts';
  const exists = buckets.some(b => b.name === targetBucket);

  if (!exists) {
    console.log(`Bucket "${targetBucket}" does not exist. Creating it...`);
    const { data, error: createError } = await supabase.storage.createBucket(targetBucket, {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      process.exit(1);
    }
    console.log(`Bucket "${targetBucket}" created successfully!`, data);
  } else {
    console.log(`Bucket "${targetBucket}" already exists.`);
  }
}

main();
