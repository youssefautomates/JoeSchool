import { setKV, getKV } from "@/lib/kv";

async function testKV() {
  console.log("Testing setKV...");
  const success = await setKV("test_key", { hello: "world" });
  console.log("setKV success:", success);
  
  if (success) {
    console.log("Testing getKV...");
    const data = await getKV("test_key");
    console.log("getKV data:", data);
  }
}

testKV();
