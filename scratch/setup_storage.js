require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for bucket management
);

async function setup() {
  const { data, error } = await supabase.storage.createBucket('products', {
    public: true,
    fileSizeLimit: 104857600, // 100MB
    allowedMimeTypes: ['image/*', 'video/*']
  });
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log("Bucket 'products' already exists.");
    } else {
      console.error("Error creating bucket:", error);
    }
  } else {
    console.log("Bucket 'products' created successfully.");
  }
}
setup();
