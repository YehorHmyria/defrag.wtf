import dotenv from "dotenv";

dotenv.config();

const env = process.env;

export const config = {
  port: env.PORT || 3000,
  supabaseUrl: env.SUPABASE_URL,
  // Prefer the service-role key (bypasses RLS) for the backend; fall back to anon.
  supabaseKey: env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY,
  usingServiceKey: Boolean(env.SUPABASE_SERVICE_KEY),
  groqKey: env.GROQ_API_KEY,
  secret: env.DEFRAG_SECRET,

  groqModel: env.GROQ_MODEL || "llama-3.1-8b-instant",
  // Ukrainian title/summary doubles the output tokens; can be switched off.
  enableUk: env.ENABLE_UK !== "false",

  ingestCron: env.INGEST_CRON || "0 */3 * * *",
  maxPerRun: Number(env.MAX_PER_RUN) || 60,
  concurrency: Number(env.CONCURRENCY) || 3,
  llmMinIntervalMs: Number(env.LLM_MIN_INTERVAL_MS) || 2500,
  windowHours: Number(env.WINDOW_HOURS) || 48,
  clusterWindowHours: 72,
};

const missing = [];
if (!config.supabaseUrl) missing.push("SUPABASE_URL");
if (!config.supabaseKey) missing.push("SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY");
if (!config.groqKey) missing.push("GROQ_API_KEY");
if (!config.secret) missing.push("DEFRAG_SECRET");

config.missing = missing;
config.isConfigured = missing.length === 0;
