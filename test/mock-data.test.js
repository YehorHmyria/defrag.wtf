import test from "node:test";
import assert from "node:assert/strict";
import { buildRows, EVENTS } from "../scripts/mock-data.js";

test("demo data: valid, unique and clearly marked as mock", () => {
  const rows = buildRows();
  assert.ok(rows.length >= 30 && EVENTS.length >= 15);
  assert.equal(new Set(rows.map((r) => r.original_url)).size, rows.length, "urls must be unique (DB constraint)");
  for (const r of rows) {
    assert.ok(r.impact_score >= 0 && r.impact_score <= 100);
    assert.equal(r.meta.mock, true);
    assert.ok(r.original_url.startsWith("https://example.com/mock/"));
    assert.ok(r.summary.startsWith("• ") && r.summary_uk.startsWith("• "));
    assert.equal(r.score_breakdown.total, r.impact_score);
    assert.ok(r.published_ago_min > 0);
  }
});

test("demo data: covers every feature (signal+noise, CVE, multi-source events, history for trends)", () => {
  const rows = buildRows();
  assert.ok(rows.some((r) => r.impact_score >= 70) && rows.some((r) => r.impact_score < 70));
  assert.ok(rows.some((r) => r.cve_ids.length));
  const per = {};
  rows.forEach((r) => { per[r.event_id] = (per[r.event_id] || 0) + 1; });
  assert.ok(Object.values(per).some((n) => n >= 3), "needs clustered events");
  assert.ok(Math.max(...rows.map((r) => r.published_ago_min)) > 7 * 24 * 60, "needs older history");
});
