/**
 * REAL sample data: genuine articles fetched from the live sources (snapshot in real-snapshot.json),
 * with the LLM extraction step performed by hand (by Claude) instead of by Groq. Same shape the
 * pipeline would produce: features -> normalizeExtraction -> deterministic score -> clustering.
 * Rows are marked meta.sample = "real" and can be removed with:  DELETE FROM defrag_articles WHERE meta->>'sample'='real';
 */
import fs from "fs";
import { randomUUID, createHash } from "crypto";
import { normalizeExtraction, extractAdvisory } from "../server/ai.js";
import { computeImpact, extractCves } from "../server/scoring.js";
import { ClusterIndex } from "../server/cluster.js";
import { kindByName } from "../server/sources.js";

const snapshot = JSON.parse(fs.readFileSync(new URL("./real-snapshot.json", import.meta.url)));
const T = "TECH", C = "COMPANY", P = "PRODUCT";
const X = (event_type, confirmed, technical_detail, audience, short_tag, title, title_uk, summary, summary_uk, entities, stack_tags) =>
  ({ event_type, confirmed, technical_detail, audience, short_tag, title, title_uk, summary, summary_uk, entities, stack_tags });

// keyed by snapshot id; CISA KEV items (6, 18, 30) use the deterministic advisory extractor instead
const EXTRACTED = {
  3: X("SECURITY", true, 3, 4, "SUPPLYCHAIN", "Attackers abuse Qubole's AWS trust to steal customer secrets", "Зловмисники через довіру до Qubole в AWS викрадають секрети клієнтів",
    ["Compromised IAM credentials of Qubole's AWS account were used to reach customer AWS environments", "Secrets and other data were stolen from S3 buckets", "Cross-account IAM trust policies stayed active after the platform was deprecated", "Wiz calls it a broad, opportunistic supply-chain campaign"],
    ["Викрадені IAM-облікові дані акаунта Qubole в AWS дали доступ до середовищ клієнтів", "З S3-бакетів вкрадено секрети та інші дані", "Політики міжакаунтної довіри лишалися активними після закриття платформи", "Wiz називає це широкою опортуністичною атакою на ланцюг постачання"],
    [["Qubole", C], ["AWS", C], ["Wiz", C], ["IAM", T], ["S3", P]], ["aws", "s3", "iam"]),
  5: X("SECURITY", true, 3, 5, "EXPLOIT", "*sshole: OpenSSH + musl flaw under active exploitation", "*sshole: вразливість OpenSSH + musl активно експлуатується",
    ["Critical flaw lets attackers log in to privileged accounts on Linux systems that combine OpenSSH and musl, without authentication", "Public since last Thursday; exploitation confirmed four days later", "GreyNoise honeypots in Southeast Asia saw 'mature intrusions' by a group tracked as GT10", "The backdoor used has Chinese-language comments and looks AI-generated"],
    ["Критична вада дозволяє без автентифікації входити в привілейовані акаунти на Linux з OpenSSH і musl", "Стала публічною минулого четверга; експлуатацію підтвердили через чотири дні", "Honeypot-и GreyNoise в Південно-Східній Азії зафіксували «зрілі вторгнення» групи GT10", "Бекдор має коментарі китайською і, схоже, згенерований ШІ"],
    [["OpenSSH", P], ["musl", T], ["Linux", T], ["GreyNoise", C], ["GT10", "GROUP"]], ["openssh", "musl", "linux"]),
  7: X("TUTORIAL", true, 2, 4, "GUIDE", "GitHub guide: agentic engineering beyond code generation", "Посібник GitHub: agentic engineering — більше, ніж генерація коду",
    ["GitHub saw over 1.2 billion commits in one week in October, 400%+ more than a year earlier", "A Faros AI study found pull requests spend 441% longer in review with high AI adoption", "The guide argues the bottleneck moves from writing code to review and delivery"],
    ["У жовтні GitHub отримав понад 1,2 млрд комітів за тиждень, на 400% більше, ніж рік тому", "Дослідження Faros AI: PR на 441% довше перебувають на рев'ю за високого рівня ШІ", "Автори стверджують, що вузьке місце — не написання коду, а рев'ю та доставка"],
    [["GitHub", C], ["Faros AI", C]], ["github", "ai"]),
  8: X("FUNDING", true, 2, 3, "FUND", "Cloudflare gives first $301K of Vite Ecosystem Fund to 44 projects", "Cloudflare виділяє перші $301 тис. фонду екосистеми Vite на 44 проєкти",
    ["First $301,300 distributed to 44 projects and maintainers in the Vite ecosystem", "Part of a $1M commitment made when VoidZero joined Cloudflare", "Motivation: AI-generated contributions are increasing maintainer burnout"],
    ["Перші $301 300 розподілено між 44 проєктами та мейнтейнерами екосистеми Vite", "Це частина зобов'язання на $1 млн після приєднання VoidZero до Cloudflare", "Мотивація: контриб'юції від ШІ посилюють вигорання мейнтейнерів"],
    [["Cloudflare", C], ["VoidZero", C], ["Vite", T]], ["vite", "cloudflare"]),
  9: X("OUTAGE", true, 3, 4, "EMAIL", "Microsoft mail systems reject messages without a DMARC record", "Пошта Microsoft відхиляє листи без DMARC-запису",
    ["Mail to hotmail.com and outlook.com was rejected with '550 5.7.1 Message lacks SPF/DKIM/DMARC Auth Records'", "Affected messages had valid SPF and DKIM but no DMARC record", "Seen 500+ times on Thursday, never before; adding a DMARC record with policy 'none' helped"],
    ["Пошту на hotmail.com та outlook.com відхиляли з помилкою 550 5.7.1 (немає SPF/DKIM/DMARC)", "У листів були чинні SPF і DKIM, але не було DMARC-запису", "Понад 500 випадків у четвер, раніше жодного; допомогло додавання DMARC з політикою 'none'"],
    [["Microsoft", C], ["Outlook", P], ["DMARC", T], ["SPF", T], ["DKIM", T]], ["dmarc", "email"]),
  10: X("SECURITY", true, 2, 2, "ATTRIBUTION", "France blames Iran's IRGC unit for attacks on 700+ supermarkets", "Франція звинувачує підрозділ КВІР Ірану в атаках на 700+ супермаркетів",
    ["October attacks disrupted refrigeration systems at more than 700 supermarkets and retail sites", "Caused food losses and at least 15 fires", "France's foreign ministry attributes them to Shahid Kaveh, a cyber unit tied to Iran's IRGC"],
    ["Жовтневі атаки порушили роботу холодильних систем у понад 700 супермаркетах і торгових точках", "Це призвело до втрат продуктів і щонайменше 15 пожеж", "МЗС Франції приписує атаки Shahid Kaveh, кіберпідрозділу, пов'язаному з КВІР Ірану"],
    [["France", "ORG"], ["Shahid Kaveh", "GROUP"], ["IRGC", "ORG"]], ["ot", "iot"]),
  12: X("PRODUCT", true, 1, 3, "PRICING", "Apple adds $50 Intelligence Usage Packs, starting in Logic Pro", "Apple запускає пакети використання Intelligence за $50, починаючи з Logic Pro",
    ["Logic Pro becomes Apple's first app to charge for extended Apple Intelligence usage", "Follows a September support article that described usage limits for some features"],
    ["Logic Pro — перший застосунок Apple, що бере плату за розширене використання Apple Intelligence", "Це продовження вересневої статті підтримки про ліміти використання окремих функцій"],
    [["Apple", C], ["Apple Intelligence", P], ["Logic Pro", P]], ["apple"]),
  14: X("SECURITY", true, 3, 2, "RESEARCH", "Researchers remotely unlock cars via automakers' Android apps", "Дослідники віддалено відмикають авто через Android-застосунки виробників",
    ["Two researchers chained WAF bypasses and default logins to command vehicles", "They could remotely unlock cars and honk horns, in Australia and the US"],
    ["Двоє дослідників поєднали обхід WAF і типові логіни, щоб керувати автомобілями", "Вони могли віддалено відмикати авто та сигналити, в Австралії та США"],
    [["WAF", T], ["Android", T]], ["android", "waf"]),
  17: X("RELEASE", true, 3, 5, "RELEASE", "Claude Fable 5.2 and Mythos 5.2", "Claude Fable 5.2 та Mythos 5.2",
    ["Anthropic upgraded Claude Fable and Claude Mythos for the hardest technical tasks", "Improvements in coding, reasoning and vision", "Anthropic cites pre-release results such as complex software migrations and robotics evaluations"],
    ["Anthropic оновила Claude Fable і Claude Mythos для найскладніших технічних задач", "Покращення в програмуванні, міркуванні та зорі", "Anthropic наводить результати до релізу: складні міграції ПЗ, оцінки з робототехніки"],
    [["Anthropic", C], ["Claude Fable", P], ["Claude Mythos", P]], ["claude", "llm"]),
  19: X("RELEASE", true, 2, 5, "RELEASE", "Anthropic launches Claude Fable and Mythos 5.2 models", "Anthropic запускає моделі Claude Fable та Mythos 5.2",
    ["Two new models, Claude Fable 5.2 and Claude Mythos 5.2, aimed at 'daunting' technical challenges", "Fable 5.2 is available today"],
    ["Дві нові моделі, Claude Fable 5.2 і Claude Mythos 5.2, для «надскладних» технічних задач", "Fable 5.2 доступна вже сьогодні"],
    [["Anthropic", C], ["Claude Fable", P], ["Claude Mythos", P]], ["claude", "llm"]),
  22: X("RELEASE", true, 3, 3, "RELEASE", "Google releases Gemini 4 Argon for robot control and simulation", "Google випускає Gemini 4 Argon для керування роботами та симуляції",
    ["Framed as a general-purpose physical-reasoning model", "Targets robot control, simulation and policy improvement"],
    ["Позиціонується як універсальна модель фізичного міркування", "Призначена для керування роботами, симуляції та покращення політик"],
    [["Google", C], ["Gemini 4 Argon", P]], ["gemini", "robotics"]),
  23: X("SECURITY", true, 2, 2, "WIPER", "Russian cloud host Beget rebuilds from scratch after wiper attack", "Російський хмарний хостинг Beget відновлюється з нуля після атаки wiper",
    ["On the night of Nov 1 the attacker reached management systems and deployed malware that erased server data", "Beget disconnected all servers from the network to contain the spread", "The company says it must rebuild its cloud infrastructure from scratch"],
    ["У ніч на 1 листопада зловмисник отримав доступ до систем керування й запустив шкідливе ПЗ, що стирало дані серверів", "Beget відключила всі сервери від мережі, щоб зупинити поширення", "Компанія заявляє, що змушена відбудувати хмарну інфраструктуру з нуля"],
    [["Beget", C]], ["cloud"]),
  25: X("SECURITY", true, 3, 5, "LEAK", "Claude Code settings files expose thousands of secrets on GitHub", "Файли налаштувань Claude Code розкривають тисячі секретів на GitHub",
    ["Apiiro researchers found thousands of secrets (database passwords, API tokens, root logins) in Claude Code settings files committed to public repos", "Cause: how approvals for automated shell commands are stored when a user picks 'Yes, and don't ask again'", "Check and rotate any secret that may sit in a committed .claude settings file"],
    ["Дослідники Apiiro знайшли тисячі секретів (паролі БД, API-токени, root-логіни) у файлах налаштувань Claude Code в публічних репозиторіях", "Причина: як зберігаються дозволи на автоматичні shell-команди при виборі «Yes, and don't ask again»", "Перевірте й змініть секрети, що могли потрапити в закомічені налаштування .claude"],
    [["Claude Code", P], ["Anthropic", C], ["Apiiro", C], ["GitHub", C]], ["claude-code", "github", "secrets"]),
  27: X("RESEARCH", true, 3, 3, "CRYPTO", "Cloudflare tests Merkle Tree Certificates for post-quantum TLS", "Cloudflare тестує Merkle Tree Certificates для постквантового TLS",
    ["Cloudflare tested Merkle Tree Certificates (MTCs) as an alternative to traditional certificate chains", "Reports 9% faster median performance", "Part of building a public certificate authority for the post-quantum web"],
    ["Cloudflare протестувала Merkle Tree Certificates (MTC) як альтернативу класичним ланцюжкам сертифікатів", "Заявлено на 9% швидшу медіанну продуктивність", "Це частина розробки публічного центру сертифікації для постквантового вебу"],
    [["Cloudflare", C], ["Merkle Tree Certificates", T], ["TLS", T]], ["tls", "cloudflare", "pqc"]),
  33: X("RELEASE", true, 2, 5, "RELEASE", "Anthropic releases Claude Mythos 5.2 and Fable 5.2", "Anthropic випускає Claude Mythos 5.2 та Fable 5.2",
    ["Improvements in coding, reasoning and vision; clearer communication with users", "Fable input price cut from $10 to $8 per million tokens, now cheaper than GPT-6 Astra", "Responses 30% faster across effort levels; faster serving costs double; compatible with zero data retention"],
    ["Покращення в програмуванні, міркуванні та зорі; чіткіша комунікація з користувачами", "Ціну входу Fable знижено з $10 до $8 за млн токенів — тепер дешевше за GPT-6 Astra", "Відповіді на 30% швидші; швидший режим коштує вдвічі більше; сумісна з zero data retention"],
    [["Anthropic", C], ["Claude Fable", P], ["Claude Mythos", P], ["GPT-6 Astra", P], ["OpenAI", C]], ["claude", "llm"]),
  35: X("SECURITY", false, 2, 3, "BREACH", "Binance denies breach after alleged ShinyHunters claims", "Binance заперечує злам після заяв хакерів, що видають себе за ShinyHunters",
    ["A threat actor using the 'ShinyHunters' handle claims to sell records of 335 million Binance users", "Claimed data: KYC documents, passwords, wallet private keys, transaction history", "Binance denies a breach; the actor is believed to be impersonating the extortion gang"],
    ["Зловмисник під ніком 'ShinyHunters' заявляє про продаж записів 335 млн користувачів Binance", "Заявлені дані: KYC-документи, паролі, приватні ключі гаманців, історія транзакцій", "Binance заперечує злам; вважають, що актор видає себе за вимагацьке угруповання"],
    [["Binance", C], ["ShinyHunters", "GROUP"]], ["crypto"]),
  38: X("RELEASE", true, 3, 3, "RELEASE", "AWS launches TorchNeuron: PyTorch on Trainium without code changes", "AWS запускає TorchNeuron: PyTorch на Trainium без змін у коді",
    ["Amazon introduced TorchNeuron at PyTorch Conference North America 2026", "A native PyTorch backend that runs models on AWS Trainium without modification"],
    ["Amazon представила TorchNeuron на PyTorch Conference North America 2026", "Нативний бекенд PyTorch для запуску моделей на AWS Trainium без модифікацій"],
    [["AWS", C], ["TorchNeuron", P], ["PyTorch", T], ["Trainium", P]], ["pytorch", "aws"]),
  39: X("PRODUCT", false, 3, 3, "HARDWARE", "DeepX taps out DX-M2 edge AI chip, claims 100B-parameter LLMs under 5 W", "DeepX завершила розробку чипа DX-M2, заявляє LLM до 100 млрд параметрів при <5 Вт",
    ["South Korean startup DeepX taped out its second-generation AI accelerator", "Uses Samsung processor-in-memory (PIM) technology with LPDDR5x", "Vendor claims on-device LLMs up to 100B parameters at under 5 W and a projected 6.7x performance gain"],
    ["Південнокорейський стартап DeepX завершив розробку другого покоління AI-прискорювача", "Використовує технологію processor-in-memory (PIM) від Samsung з LPDDR5x", "Виробник заявляє LLM на пристрої до 100 млрд параметрів при <5 Вт і прогнозує ріст продуктивності у 6,7 раза"],
    [["DeepX", C], ["Samsung", C]], ["edge-ai", "hardware"]),
};

const uuid = (s) => { const h = createHash("sha1").update(s).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };

export function buildRealRows() {
  const index = new ClusterIndex([]);
  const rows = [];
  // oldest first so the cluster index behaves like the pipeline over time
  for (const it of [...snapshot].sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt))) {
    const f = it.advisory ? extractAdvisory(it.advisory) : normalizeExtraction(EXTRACTED[it.id]);
    const cveIds = it.advisory ? [it.advisory.cveID] : extractCves(`${it.title} ${f.title}`);
    const { score, breakdown } = computeImpact({ eventType: f.event_type, confirmed: f.confirmed, technicalDetail: f.technical_detail, audience: f.audience, cveIds, title: f.title });
    const probe = { title: f.title, entities: f.entities, cve_ids: cveIds };
    const matched = index.match(probe);
    const event_id = matched || uuid(`real:${it.url}`);
    index.add({ ...probe, id: null, event_id });
    rows.push({
      title: f.title, summary: f.summary, short_tag: f.short_tag, impact_score: score, original_url: it.url,
      source_name: it.source, source_kind: kindByName[it.source] || "press", published_at: it.publishedAt,
      title_uk: f.title_uk, summary_uk: f.summary_uk, event_type: f.event_type, entities: f.entities, stack_tags: f.stack_tags,
      cve_ids: cveIds, score_breakdown: breakdown, meta: { sample: "real", ...(it.meta || {}) }, event_id,
    });
  }
  return rows;
}
