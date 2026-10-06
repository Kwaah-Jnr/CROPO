import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  getMarketplaceListings,
  getFeaturedListings,
  getFarmerProfileById,
} from "../src/lib/data/marketplace";

async function measure<T>(fn: () => Promise<T>): Promise<{ durationMs: number; result: T }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round(performance.now() - start);
  return { durationMs, result };
}

async function runBenchmarks() {
  console.log("Starting Pass 7A Benchmark Suite...\n");

  // 1. getMarketplaceListings() (default page 1, size 12)
  const m1 = await measure(() => getMarketplaceListings({}));
  const m1Size = Buffer.byteLength(JSON.stringify(m1.result), "utf8");

  // 2. Search query (search for 'cassava')
  const s1 = await measure(() => getMarketplaceListings({ q: "cassava" }));
  const s1Size = Buffer.byteLength(JSON.stringify(s1.result), "utf8");

  // 3. Farmer profile query
  // Samuel Kwaah: 7f03de51-e480-48b2-b664-c5822a80b621
  const farmerId = "7f03de51-e480-48b2-b664-c5822a80b621";
  const f1 = await measure(() => getFarmerProfileById(farmerId));
  const f1Size = Buffer.byteLength(JSON.stringify(f1.result), "utf8");

  // 4. Homepage featured query (4 listings)
  const h1 = await measure(() => getFeaturedListings(4));
  const h1Size = Buffer.byteLength(JSON.stringify(h1.result), "utf8");

  // 5. Measure HTTP endpoints (if local dev server is responding on 3000)
  let httpMarketplaceMs = 0;
  let httpMarketplaceKb = 0;
  let httpHomeMs = 0;
  let httpHomeKb = 0;

  try {
    const t0 = performance.now();
    const resM = await fetch("http://localhost:3000/marketplace");
    const textM = await resM.text();
    httpMarketplaceMs = Math.round(performance.now() - t0);
    httpMarketplaceKb = Math.round((Buffer.byteLength(textM, "utf8") / 1024) * 10) / 10;

    const t1 = performance.now();
    const resH = await fetch("http://localhost:3000/");
    const textH = await resH.text();
    httpHomeMs = Math.round(performance.now() - t1);
    httpHomeKb = Math.round((Buffer.byteLength(textH, "utf8") / 1024) * 10) / 10;
  } catch {
    console.log("Local HTTP server not active on port 3000, skipping HTTP metrics");
  }

  console.log("==========================================================================");
  console.log(" PASS 7A PERFORMANCE BENCHMARK RESULTS");
  console.log("==========================================================================");
  console.log(`1. getMarketplaceListings({}) (Page 1):`);
  console.log(`   - Duration:       ${m1.durationMs} ms`);
  console.log(`   - Rows returned:  ${m1.result.length} (total catalog: ${m1.result.totalCount})`);
  console.log(`   - Payload size:   ${(m1Size / 1024).toFixed(1)} KB`);
  console.log();
  console.log(`2. Search query (q='cassava'):`);
  console.log(`   - Duration:       ${s1.durationMs} ms`);
  console.log(`   - Rows returned:  ${s1.result.length}`);
  console.log(`   - Payload size:   ${(s1Size / 1024).toFixed(1)} KB`);
  console.log();
  console.log(`3. Farmer profile query (${farmerId}):`);
  console.log(`   - Duration:       ${f1.durationMs} ms`);
  console.log(`   - Rows returned:  ${f1.result?.listings.length ?? 0}`);
  console.log(`   - Payload size:   ${(f1Size / 1024).toFixed(1)} KB`);
  console.log();
  console.log(`4. Homepage featured query (getFeaturedListings(4)):`);
  console.log(`   - Duration:       ${h1.durationMs} ms`);
  console.log(`   - Rows returned:  ${h1.result.length}`);
  console.log(`   - Payload size:   ${(h1Size / 1024).toFixed(1)} KB`);
  console.log();
  if (httpMarketplaceMs > 0) {
    console.log(`5. Marketplace Page HTTP Response (/marketplace):`);
    console.log(`   - Duration:       ${httpMarketplaceMs} ms`);
    console.log(`   - Payload size:   ${httpMarketplaceKb} KB`);
    console.log();
    console.log(`6. Homepage HTTP Response (/):`);
    console.log(`   - Duration:       ${httpHomeMs} ms`);
    console.log(`   - Payload size:   ${httpHomeKb} KB`);
  }
  console.log("==========================================================================");
}

runBenchmarks().catch(console.error);
