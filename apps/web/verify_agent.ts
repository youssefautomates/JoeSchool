import { runAgent } from "./src/lib/agent";

async function testQuery(query: string) {
  console.log(`\n--- Query: "${query}" ---`);
  const result = await runAgent("test-chat", query);
  console.log(result.text);
}

async function main() {
  await testQuery("هل يوجد مبيعات؟");
  await testQuery("كم عدد الطلبات؟");
  await testQuery("كم الإيرادات؟");
  
  await testQuery("كم عدد الطلبات التاريخي؟");
  await testQuery("كم الإيرادات مدى الحياة؟");
}

main().catch(console.error);
