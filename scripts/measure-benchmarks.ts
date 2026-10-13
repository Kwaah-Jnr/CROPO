import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  getMarketplaceListings,
  getFeaturedListings,
  getFarmerProfileById,
  getMarketplaceListingById,
} from "../src/lib/data/marketplace";

async function measure<T>(fn: () => Promise<T>): Promise<{ durationMs: number; result: T }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round(performance.now() - start);
  return { durationMs, result };
}

async function runBenchmarks() {
  console.log("Starting Pass 7B Benchmark Suite...\n");

  // 1. getMarketplaceListings() (default page 1, size 12)
  const m1 = await measure(() => getMarketplaceListings({}));
  const m1Size = Buffer.byteLength(JSON.stringify(m1.result), "utf8");

  // 2. Search query (search for 'cassava')
  const s1 = await measure(() => getMarketplaceListings({ q: "cassava" }));
  const s1Size = Buffer.byteLength(JSON.stringify(s1.result), "utf8");

  // 3. Farmer profile query
  const farmerId = "7f03de51-e480-48b2-b664-c5822a80b621";
  const f1 = await measure(() => getFarmerProfileById(farmerId));
  const f1Size = Buffer.byteLength(JSON.stringify(f1.result), "utf8");

  // 4. Homepage featured query (4 listings)
  const h1 = await measure(() => getFeaturedListings(4));
  const h1Size = Buffer.byteLength(JSON.stringify(h1.result), "utf8");

  // 5. Listing detail query
  const testListingId = m1.result[0]?.id || "d14c241d-cb87-43ca-adcf-be1aeb6c433c";
  const ld1 = await measure(() => getMarketplaceListingById(testListingId));
  const ld1Size = Buffer.byteLength(JSON.stringify(ld1.result), "utf8");

  // 6. Measure HTTP endpoints against the production server (port 3000)
  const httpResults: Record<string, { durationMs: number; kb: number; status: number }> = {};

  const endpoints = [
    { name: "Homepage (/)", path: "/" },
    { name: "About (/about)", path: "/about" },
    { name: "How It Works (/how-it-works)", path: "/how-it-works" },
    { name: "Marketplace (/marketplace)", path: "/marketplace" },
    { name: "Listing Detail (/marketplace/[id])", path: `/marketplace/${testListingId}` },
  ];

  for (const ep of endpoints) {
    try {
      // Warm-up / initial hit
      await fetch(`http://localhost:3000${ep.path}`);

      // Measured hit
      const t0 = performance.now();
      const res = await fetch(`http://localhost:3000${ep.path}`);
      const text = await res.text();
      const durationMs = Math.round(performance.now() - t0);
      const kb = Math.round((Buffer.byteLength(text, "utf8") / 1024) * 10) / 10;
      httpResults[ep.name] = { durationMs, kb, status: res.status };
    } catch {
      // Server not reachable
    }
  }

  console.log("==========================================================================");
  console.log(" PASS 7B PERFORMANCE BENCHMARK RESULTS");
  console.log("==========================================================================");
  console.log(`1. getMarketplaceListings({}) (Page 1, 12 items):`);
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
  console.log(`5. Listing detail query (${testListingId}):`);
  console.log(`   - Duration:       ${ld1.durationMs} ms`);
  console.log(`   - Payload size:   ${(ld1Size / 1024).toFixed(1)} KB`);
  console.log();

  if (Object.keys(httpResults).length > 0) {
    console.log("--- Public HTTP Route Response Times (Production Build Server) ---");
    for (const [name, data] of Object.entries(httpResults)) {
      console.log(`${name}:`);
      console.log(`   - Duration:       ${data.durationMs} ms (HTTP ${data.status})`);
      console.log(`   - Payload size:   ${data.kb} KB`);
    }
  }
  console.log("==========================================================================");
}

runBenchmarks().catch(console.error);
