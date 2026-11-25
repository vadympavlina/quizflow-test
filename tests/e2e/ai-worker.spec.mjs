// AI через воркер на сторінці тесту: студент без входу, запит іде у воркер з посиланням на тест викладача,
// ключів у браузері немає, облік веде воркер.
import { test, expect, seed, readDb } from "./fixtures.mjs";
import { tseed } from "./seeds/student.mjs";

const WORKER = "https://mail.quizflow.test";

async function finishTest(page) {
  await page.goto("/?link=LX&t=t1");
  await page.waitForFunction(() => typeof window.obSkip === "function");
  await page.evaluate(() => obSkip());
  await page.fill("#inputName", "Марія");
  await page.fill("#inputSurname", "Бондар");
  await page.click("#startBtn");
  await page.locator(".choice-item").nth(1).click();
  await page.click("#nextBtn"); await page.locator(".choice-item").nth(0).click(); await page.locator(".choice-item").nth(2).click();
  await page.click("#nextBtn"); await page.fill(".text-answer", "Париж");
  await page.click("#nextBtn"); await page.fill(".text-answer", "56");
  await page.click("#nextBtn"); await page.locator(".match-opt").nth(0).click();
  await page.click("#nextBtn"); await page.locator('.ord-btn[data-mv="1"]').nth(0).click();
  await page.click("#nextBtn");
  await page.click("#nextBtn");
  await page.evaluate(() => window._confirmFinish());
}

test("коментар AI студенту іде через воркер з посиланням на тест, без токена й без ключів", async ({ page, errors }) => {
  const calls = [];
  await page.context().route(`${WORKER}/**`, async route => {
    const req = route.request();
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    calls.push({ path: new URL(req.url()).pathname, body: JSON.parse(req.postData()), auth: req.headers()["authorization"] });
    route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify({ ok: true, text: '{"grade": 8, "comment": "Добре, повторіть теми, де були помилки."}', tokens: 80, provider: "groq" }) });
  });
  const db = tseed();
  db.settings = { ...(db.settings || {}), mail: { workerUrl: WORKER }, ai: { enabled: true, viaWorker: true, groqModel: "llama-3.3-70b-versatile" } };
  await seed(page, db);
  await finishTest(page);
  await expect.poll(() => calls.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const c = calls.find(x => x.body.feature === "comments") || calls[0];
  expect(c.path).toBe("/ai");
  expect(c.auth).toBeUndefined();
  expect(c.body.as).toEqual({ teacherUid: "t1", linkId: "LX" });
  expect(c.body.messages.every(m => m.role !== "system")).toBe(true);
  expect(JSON.stringify(c.body)).not.toMatch(/gsk_|AIza/);
  // у запиті до AI лише ім'я учня, прізвища немає
  expect(JSON.stringify(c.body)).toContain("Марія");
  expect(JSON.stringify(c.body)).not.toContain("Бондар");
  // облік веде воркер: браузер студента лічильник не пише
  expect(JSON.stringify((await readDb(page)).aiUsage || {})).not.toContain("comments");
  expect(errors).toEqual([]);
});
