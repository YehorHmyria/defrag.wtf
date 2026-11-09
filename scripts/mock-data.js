/**
 * Demo data for Defrag. EVERYTHING here is fictional / illustrative, not real news.
 * Rows are marked meta.mock = true and use https://example.com/mock/... URLs, so they can be
 * removed with `npm run seed -- --clean` (or the DELETE at the top of supabase/seed.sql).
 *
 * Scores are computed with the real scoring module, so the "why this score?" breakdown is consistent.
 */
import crypto from "crypto";
import { computeImpact } from "../server/scoring.js";
import { kindByName } from "../server/sources.js";

// [slug, type, confirmed, detail, audience, tag, title, title_uk, facts[3], facts_uk[3], entities, stack, cves, coverage [[source, hoursAgo]]]
const E = (slug, type, confirmed, detail, audience, tag, title, title_uk, facts, facts_uk, entities, stack, cves, coverage) =>
  ({ slug, type, confirmed, detail, audience, tag, title, title_uk, facts, facts_uk, entities, stack, cves, coverage });

const T = "TECH", C = "COMPANY", P = "PRODUCT", H = "PERSON";

export const EVENTS = [
  E("react-20", "RELEASE", true, 3, 4, "RELEASE", "React 20 ships compiler by default, drops legacy context", "React 20 виходить із компілятором за замовчуванням і без legacy context",
    ["Compiler is enabled by default; opt-out via a config flag", "Legacy context API removed; codemod provided", "Benchmarks: up to 38% fewer re-renders in the sample apps"],
    ["Компілятор увімкнений за замовчуванням, вимикається прапорцем", "Legacy context API видалено, є codemod для міграції", "У тестових застосунках на 38% менше повторних рендерів"],
    [["React", T], ["Meta", C], ["Vite", T]], ["react", "vite", "typescript"], [], [["GitHub Blog", 9], ["InfoQ", 7], ["Hacker News", 6], ["The Register", 3]]),
  E("openssh-cve", "SECURITY", true, 3, 4, "CVE", "CVE-2026-1182: actively exploited RCE in OpenSSH tooling", "CVE-2026-1182: активно експлуатована RCE у засобах OpenSSH",
    ["Remote code execution via a crafted agent-forwarding request", "Listed in the CISA Known Exploited Vulnerabilities catalog", "Fixed in the 10.2 patch release; workaround: disable agent forwarding"],
    ["Віддалене виконання коду через спеціально сформований запит agent forwarding", "Додано до каталогу відомих експлуатованих вразливостей CISA", "Виправлено в патчі 10.2; тимчасово: вимкнути agent forwarding"],
    [["OpenSSH", P], ["Linux", T]], ["openssh", "linux"], ["CVE-2026-1182"], [["CISA KEV", 7], ["BleepingComputer", 6], ["Ars Technica", 4]]),
  E("cf-outage", "OUTAGE", true, 2, 4, "OUTAGE", "Cloudflare DNS resolver outage lasted 38 minutes", "Збій DNS-резолвера Cloudflare тривав 38 хвилин",
    ["Resolver returned SERVFAIL for a subset of queries", "Root cause: faulty configuration push, rolled back", "Post-mortem promised within 5 business days"],
    ["Резолвер повертав SERVFAIL для частини запитів", "Причина: помилкове розгортання конфігурації, відкочено", "Пост-мортем обіцяють протягом 5 робочих днів"],
    [["Cloudflare", C], ["DNS", T]], ["dns"], [], [["Cloudflare Blog", 5], ["The Register", 4]]),
  E("pg-19", "RELEASE", true, 3, 4, "RELEASE", "PostgreSQL 19 beta adds native vector index and async I/O", "PostgreSQL 19 beta: нативний векторний індекс і асинхронний I/O",
    ["HNSW-style vector index in core, no extension needed", "Async I/O for sequential scans, +20-35% throughput in tests", "Beta 1 available; GA planned for autumn"],
    ["HNSW-подібний векторний індекс у ядрі, без розширень", "Асинхронний I/O для послідовних сканувань, +20-35% пропускної здатності", "Доступна Beta 1; GA заплановано на осінь"],
    [["PostgreSQL", T], ["pgvector", T]], ["postgresql"], [], [["Lobsters", 12], ["InfoQ", 10], ["Hacker News", 9]]),
  E("node-cjs", "DEPRECATION", true, 2, 3, "DEPRECATED", "Node.js deprecates the CommonJS loader flag", "Node.js оголошує застарілим прапорець завантажувача CommonJS",
    ["--experimental-cjs-loader prints a runtime deprecation warning", "Removal scheduled for the next major release", "Migration guide published"],
    ["--experimental-cjs-loader тепер друкує попередження про застарілість", "Видалення заплановане на наступний мажорний реліз", "Опубліковано посібник із міграції"],
    [["Node.js", T]], ["nodejs", "javascript"], [], [["GitHub Blog", 3]]),
  E("acme-funding", "FUNDING", true, 0, 2, "MONEY", "Acme AI raises $40M for agent infrastructure", "Acme AI залучила $40 млн на інфраструктуру для агентів",
    ["Series B led by an undisclosed investor", "Funds earmarked for hiring and GPU capacity", "No product launch date announced"],
    ["Раунд B очолив інвестор, ім'я якого не розголошується", "Кошти підуть на найм і GPU-потужності", "Дата запуску продукту не названа"],
    [["Acme AI", C]], [], [], [["TechCrunch", 2]]),
  E("k8s-134", "RELEASE", true, 3, 4, "RELEASE", "Kubernetes 1.34 promotes sidecar containers to GA", "Kubernetes 1.34: sidecar-контейнери переходять у GA",
    ["Native sidecar containers are generally available", "Two alpha features graduate to beta", "One deprecated in-tree volume plugin removed"],
    ["Нативні sidecar-контейнери загальнодоступні", "Дві alpha-функції переходять у beta", "Видалено один застарілий in-tree плагін томів"],
    [["Kubernetes", T], ["CNCF", C]], ["kubernetes", "docker"], [], [["InfoQ", 20], ["Hacker News", 18], ["Lobsters", 17]]),
  E("aws-outage", "OUTAGE", true, 2, 5, "OUTAGE", "AWS us-east-1 storage outage disrupts dozens of services", "Збій сховища AWS us-east-1 порушив роботу десятків сервісів",
    ["Elevated error rates in object storage for about 3 hours", "Dependent services including queues and serverless were degraded", "AWS status page confirms mitigation"],
    ["Підвищена частка помилок об'єктного сховища близько 3 годин", "Залежні сервіси, зокрема черги та serverless, працювали з деградацією", "Сторінка статусу AWS підтвердила усунення"],
    [["AWS", C], ["S3", P]], ["aws"], [], [["The Verge", 30], ["The Register", 29], ["Ars Technica", 28], ["Hacker News", 27]]),
  E("linux-7", "RELEASE", true, 3, 5, "RELEASE", "Linux 7.0 merges first Rust-only driver subsystem", "Linux 7.0 приймає першу підсистему драйверів лише на Rust",
    ["First subsystem where new drivers must be written in Rust", "Merge window closed; rc1 expected in two weeks", "Maintainers note build-time impact"],
    ["Перша підсистема, де нові драйвери пишуться лише на Rust", "Вікно злиття закрито; rc1 очікується через два тижні", "Мейнтейнери відзначають вплив на час збирання"],
    [["Linux", T], ["Rust", T], ["Linus Torvalds", H]], ["linux", "rust"], [], [["Ars Technica", 36], ["Lobsters", 35], ["The Register", 34]]),
  E("gpt-launch", "PRODUCT", true, 1, 4, "AI", "OpenAI releases a new flagship model with a 1M-token context", "OpenAI випускає нову флагманську модель із контекстом 1 млн токенів",
    ["Available in the API today; consumer rollout next week", "Context window of 1M tokens, pricing unchanged per token", "Independent benchmarks not yet published"],
    ["Доступна в API вже сьогодні; для користувачів наступного тижня", "Контекст 1 млн токенів, ціна за токен не змінилась", "Незалежні бенчмарки ще не опубліковані"],
    [["OpenAI", C], ["GPT-5", P], ["AWS", C]], ["aws", "python"], [], [["TechCrunch", 40], ["The Verge", 39], ["Wired", 38]]),
  E("py-315", "RELEASE", true, 3, 4, "RELEASE", "Python 3.15 released with free-threaded build as default", "Вийшов Python 3.15: free-threaded збірка за замовчуванням",
    ["Free-threaded interpreter is now the default build", "JIT improvements: ~12% faster on the standard suite", "Several long-deprecated modules removed"],
    ["Free-threaded інтерпретатор тепер збірка за замовчуванням", "Покращення JIT: ~12% швидше на стандартному наборі", "Видалено кілька давно застарілих модулів"],
    [["Python", T]], ["python"], [], [["InfoQ", 52], ["Hacker News", 50]]),
  E("docker-cve", "SECURITY", true, 3, 4, "CVE", "CVE-2026-2044: container escape in Docker Desktop", "CVE-2026-2044: вихід із контейнера в Docker Desktop",
    ["Container escape through a crafted bind-mount path", "Added to the CISA Known Exploited Vulnerabilities catalog", "Update to the latest Docker Desktop release"],
    ["Вихід із контейнера через спеціально сформований шлях bind-mount", "Додано до каталогу відомих експлуатованих вразливостей CISA", "Оновіть Docker Desktop до останньої версії"],
    [["Docker", P], ["Linux", T]], ["docker", "linux"], ["CVE-2026-2044"], [["BleepingComputer", 60], ["CISA KEV", 58]]),
  E("opinion-agents", "OPINION", false, 0, 3, "OPINION", "Opinion: AI agents will rewrite how software is built", "Думка: ШІ-агенти змінять те, як створюють софт",
    ["Author predicts agents will write most code within five years", "No data or benchmarks cited", "Piece is an opinion column"],
    ["Автор прогнозує, що агенти писатимуть більшість коду за п'ять років", "Жодних даних чи бенчмарків не наведено", "Матеріал є колонкою-думкою"],
    [["OpenAI", C]], [], [], [["Wired", 70]]),
  E("tutorial-rag", "TUTORIAL", true, 1, 2, "TUTORIAL", "Tutorial: build a RAG search with pgvector", "Туторіал: RAG-пошук на pgvector",
    ["Step-by-step guide with a sample schema", "Uses an open embedding model", "Covers indexing and query tuning"],
    ["Покроковий посібник із прикладом схеми", "Використовує відкриту модель ембедингів", "Охоплює індексацію та налаштування запитів"],
    [["pgvector", T], ["PostgreSQL", T]], ["postgresql", "python"], [], [["InfoQ", 75]]),
  // older events: history for trends and the graph
  E("ts-6", "RELEASE", true, 3, 4, "RELEASE", "TypeScript 6.0 releases with a native compiler", "Вийшов TypeScript 6.0 з нативним компілятором",
    ["Compiler rewritten natively, 8-10x faster builds", "Language semantics unchanged", "Editor tooling updated"],
    ["Компілятор переписано нативно, збирання в 8-10 разів швидше", "Семантика мови не змінилась", "Оновлено інструменти редакторів"],
    [["TypeScript", T], ["Vite", T]], ["typescript", "vite"], [], [["GitHub Blog", 120], ["InfoQ", 118], ["Hacker News", 117]]),
  E("cf-workers", "RELEASE", true, 2, 3, "RELEASE", "Cloudflare Workers adds native Postgres connections", "Cloudflare Workers отримують нативні підключення до Postgres",
    ["Workers can open TCP connections to Postgres directly", "Connection pooling handled at the edge", "Available in open beta"],
    ["Workers можуть напряму відкривати TCP до Postgres", "Пулінг з'єднань виконується на edge", "Доступно у відкритій бета-версії"],
    [["Cloudflare", C], ["PostgreSQL", T]], ["postgresql", "nodejs"], [], [["Cloudflare Blog", 150], ["Lobsters", 148]]),
  E("lambda", "RELEASE", true, 2, 3, "RELEASE", "AWS Lambda raises the memory limit to 20 GB", "AWS Lambda піднімає ліміт пам'яті до 20 ГБ",
    ["Maximum memory raised from 10 GB to 20 GB", "Pricing scales linearly with memory", "Available in all commercial regions"],
    ["Максимум пам'яті збільшено з 10 до 20 ГБ", "Вартість зростає лінійно з пам'яттю", "Доступно в усіх комерційних регіонах"],
    [["AWS", C], ["Lambda", P]], ["aws"], [], [["InfoQ", 200], ["The Register", 199]]),
  E("react-compiler", "RELEASE", true, 3, 3, "RELEASE", "React Compiler enters beta with Next.js support", "React Compiler переходить у beta з підтримкою Next.js",
    ["Beta available via an opt-in plugin", "Next.js integration documented", "Known limitations listed"],
    ["Beta доступна через opt-in плагін", "Інтеграцію з Next.js описано в документації", "Відомі обмеження перелічено"],
    [["React", T], ["Meta", C]], ["react", "nextjs"], [], [["GitHub Blog", 260], ["Hacker News", 258]]),
  E("k8s-cve", "SECURITY", true, 3, 4, "CVE", "CVE-2026-0042: privilege escalation in kube-scheduler", "CVE-2026-0042: підвищення привілеїв у kube-scheduler",
    ["Privilege escalation via a malformed pod spec", "Fixed in patch releases of supported versions", "No known exploitation in the wild"],
    ["Підвищення привілеїв через некоректний специфікатор pod", "Виправлено в патч-релізах підтримуваних версій", "Експлуатації в реальному світі не виявлено"],
    [["Kubernetes", T], ["Linux", T]], ["kubernetes", "linux"], ["CVE-2026-0042"], [["BleepingComputer", 300], ["InfoQ", 298], ["CISA KEV", 296]]),
];

const uuidFrom = (s) => {
  const h = crypto.createHash("sha1").update(`defrag-mock:${s}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const bullets = (arr) => arr.map((s) => `• ${s}`).join("\n");

/** Flat article rows. published_ago_min is turned into a timestamp by the caller. */
export function buildRows() {
  const rows = [];
  for (const e of EVENTS) {
    const { score, breakdown } = computeImpact({
      eventType: e.type, confirmed: e.confirmed, technicalDetail: e.detail, audience: e.audience, cveIds: e.cves, title: e.title,
    });
    e.coverage.forEach(([source, hoursAgo], i) => {
      rows.push({
        title: e.title,
        summary: bullets(e.facts),
        short_tag: e.tag,
        impact_score: score,
        original_url: `https://example.com/mock/${e.slug}/${source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        source_name: source,
        source_kind: kindByName[source] || "press",
        published_ago_min: Math.round(hoursAgo * 60) - i,
        title_uk: e.title_uk,
        summary_uk: bullets(e.facts_uk),
        event_type: e.type,
        entities: e.entities.map(([name, type]) => ({ name, type })),
        stack_tags: e.stack,
        cve_ids: e.cves,
        score_breakdown: breakdown,
        meta: { mock: true, ...(source === "Hacker News" ? { hn_points: 300 + i * 37, hn_comments: 120 + i * 11, discussion: "https://news.ycombinator.com" } : {}) },
        event_id: uuidFrom(e.slug),
      });
    });
  }
  return rows;
}
