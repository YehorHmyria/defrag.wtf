import express from "express";
import cron from "node-cron";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./server/config.js";
import { router } from "./server/api.js";
import { runDefragProcess } from "./server/pipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!config.isConfigured) {
  console.warn("⚠️  Missing required environment variables:", config.missing.join(", "));
  console.warn("⚠️  Server will start in degraded mode (health check only).");
} else if (!config.usingServiceKey) {
  console.warn("ℹ️  Using SUPABASE_ANON_KEY for writes. Set SUPABASE_SERVICE_KEY and enable RLS (see migration 002).");
}

const app = express();
app.set("trust proxy", 1); // Railway / reverse proxies: correct client IP for rate limiting
app.use(cors());
app.use(router);

app.use(express.static(path.join(__dirname, "client/dist")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "client/dist/index.html")));

if (config.isConfigured) {
  cron.schedule(config.ingestCron, () => {
    console.log("⏰ Cron: starting scheduled ingestion");
    runDefragProcess().catch((err) => console.error("❌ Scheduled ingestion error:", err));
  }, { timezone: "UTC" });
}

const server = app.listen(config.port, () => {
  console.log(`\n🚀 Defrag.WTF backend on :${config.port}`);
  console.log(`⏰ Ingestion schedule: ${config.ingestCron} (UTC)`);
  console.log(`🔧 Manual: POST /api/defrag/run  (header x-defrag-secret)\n`);
});

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.log(`\n⚠️  ${sig} received, shutting down...`);
    server.close(() => process.exit(0));
  });
}
