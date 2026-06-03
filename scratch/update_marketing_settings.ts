import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const key = "marketing_settings";
  const slug = `kv-${key}`;
  
  const settingsObj = {
    metaPixelId: "26928253836844726",
    metaPixelEnabled: true,
    metaCapiToken: "EAAgiivlidyEBRqjAV1oZADaQZABqaOULEY6altW1dg7kZCC2Jb9H7tOZA2pml3MWUtVDZCpupq4AwXoDj0O4DZBfOCluF6iB1qtkc4Mzmz9XTvYyo4Jp7moLhOnSFdjDAU0lMbjpaVlmGceYNdRNB5J2LLBZCfHq5pSoHTsfM8RMRyDrbGju6HoOlfrYywF6QZDZD",
    metaCapiEnabled: true,
    metaCapiTestCode: "TEST4319",
    tiktokPixelId: "",
    tiktokPixelEnabled: false,
    globalGatewayFeeEnabled: true,
    globalGatewayFeePercentage: 3.00
  };

  const stringValue = JSON.stringify(settingsObj);
  console.log(`Setting KV for key ${key}...`);

  // Check if exists
  const { data: existing, error: fetchError } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }

  if (existing) {
    console.log(`Updating existing KV record with ID: ${existing.id}`);
    const { error: updateError } = await supabase
      .from('products')
      .update({
        description: stringValue,
        title: `System Data - ${key}`,
        status: 'مخفي'
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error("Update error:", updateError);
    } else {
      console.log("Successfully updated settings in DB.");
    }
  } else {
    console.log("Creating new KV record...");
    const { error: insertError } = await supabase
      .from('products')
      .insert({
        slug: slug,
        title: `System Data - ${key}`,
        short_description: 'System internal data. Do not delete.',
        description: stringValue,
        price: 0,
        status: 'مخفي',
        image_url: 'https://via.placeholder.com/150',
        is_featured: false,
        sales: 0,
        views: 0
      });

    if (insertError) {
      console.error("Insert error:", insertError);
    } else {
      console.log("Successfully created settings in DB.");
    }
  }
}

main();
