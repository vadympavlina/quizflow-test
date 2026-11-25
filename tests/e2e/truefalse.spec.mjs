// Питання «Правда / Неправда» на сторінці тесту: дві великі картки, клавіші 1/2, перевірка, перегляд результату
import { test, expect, seed, readDb } from "./fixtures.mjs";

function tfSeed() {
  const Q = [
    { id: 'a1', type: 'truefalse', text: 'Вода кипить при 100 °C на рівні моря', options: ['Правда', 'Неправда'], correct: [0], points: 1 },
    { id: 'a2', type: 'truefalse', text: 'Сонце — це планета', options: ['Правда', 'Неправда'], correct: [1], points: 1 },
    { id: 'a3', type: 'truefalse', text: 'Земля пласка', options: ['Правда', 'Неправда'], correct: [1], points: 1 },
  ];
  return {
    users: { t1: { role: 'teacher', name: 'Олена', surname: 'Коваль' } },
    teachers: { t1: {
      tests: { TF: { title: 'Правда чи ні', status: 'active', questions: Q } },
      links: { LF: { testId: 'TF', status: 'active', group: 'ІП-21' } },
    } },
  };
}
async function start(page) {
  await seed(page, tfSeed());
  await page.goto("/?link=LF&t=t1");
  await page.waitForFunction(() => typeof window.obSkip === "function");
  await page.evaluate(() => obSkip());
  await page.fill("#inputName", "Марія"); await page.fill("#inputSurname", "Бондар");
  await page.click("#startBtn");
}

for (const [label, vp] of [["комп'ютер", { width: 1280, height: 800 }], ["телефон", { width: 390, height: 844 }]]) {
  test(`«Правда / Неправда»: картки, вибір, оцінка (${label})`, async ({ page, errors }) => {
    await page.setViewportSize(vp);
    await start(page);
    await expect(page.locator(".q-type-badge")).toHaveText("Правда чи неправда");
    const cards = page.locator(".tf-item");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("Правда"); await expect(cards.nth(1)).toContainText("Неправда");
    // картки в один ряд, нічого не вилазить за екран
    const [b0, b1] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
    expect(Math.abs(b0.y - b1.y)).toBeLessThan(2);
    expect(b1.x + b1.width).toBeLessThanOrEqual(vp.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    // 1-е питання: «Правда» (вірно); змінюємо вибір клавішею 2 і повертаємо
    await cards.nth(0).click();
    await expect(cards.nth(0)).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("2");
    await expect(cards.nth(1)).toHaveAttribute("aria-checked", "true");
    await expect(cards.nth(0)).toHaveAttribute("aria-checked", "false");
    await page.keyboard.press("1");
    await expect(cards.nth(0)).toHaveAttribute("aria-checked", "true");
    await page.click("#nextBtn");
    await page.locator(".tf-item").nth(0).click();                                 // 2-е: «Правда» — помилка
    await page.click("#nextBtn");
    await page.locator(".tf-item").nth(1).click();                                 // 3-є: «Неправда» — вірно
    await page.click("#nextBtn");                                                  // «Завершити тест»: усі питання з відповідями, тож без підтвердження
    await expect.poll(async () => Object.values((await readDb(page)).teachers.t1.attempts || {}).filter(a => a.finishedAt).length, { timeout: 15_000 }).toBe(1);
    const att = Object.values((await readDb(page)).teachers.t1.attempts)[0];
    const by = Object.fromEntries((att.answers || []).map(a => [a.questionId, a]));
    expect(by.a1.correct).toBe(true); expect(by.a2.correct).toBe(false); expect(by.a3.correct).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("«Правда / Неправда»: збережена відповідь відновлюється після перезавантаження", async ({ page, errors }) => {
  await start(page);
  await page.locator(".tf-item").nth(1).click();
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForFunction(() => typeof window.obSkip === "function");
  const restore = page.locator("#restoreModal");
  if (await restore.isVisible().catch(() => false)) await page.locator("#restoreModal button").first().click();
  await page.waitForTimeout(500);
  if (await page.locator(".tf-item").count()) await expect(page.locator(".tf-item").nth(1)).toHaveAttribute("aria-checked", "true");
  expect(errors).toEqual([]);
});
