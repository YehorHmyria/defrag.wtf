import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapeArticleContent(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxContentLength: 3 * 1024 * 1024,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DefragBot/2.0; +https://defrag.wtf)" },
    });
    const $ = cheerio.load(response.data);
    $("script, style, nav, header, footer, iframe, aside, .ad, .advertisement, .social-share").remove();

    let text = "";
    for (const sel of ["article", '[role="main"]', ".article-content", ".post-content", ".entry-content", "main"]) {
      const t = $(sel).text();
      if (t && t.length > text.length) text = t;
    }
    if (text.length < 100) text = $("body").text();
    return text.replace(/\s+/g, " ").trim().substring(0, 15000);
  } catch (error) {
    console.error(`❌ Failed to scrape ${url}:`, error.message);
    return "";
  }
}
