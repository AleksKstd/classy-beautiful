import { test, expect } from "@playwright/test";

const hasDatabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("public pages", () => {
  test("home page renders the hero carousel", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Classy|Beautiful/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("CLASSY & BEAUTIFUL");
    // Uploaded images or the fallback images
    await expect(page.locator("section").first().locator("img").first()).toBeAttached();
  });

  test("reservation page shows the office step", async ({ page }) => {
    await page.goto("/rezervacii");
    const main = page.locator("main");
    await expect(main.getByRole("heading", { name: "Изберете локация" })).toBeVisible();
    await expect(main.getByRole("button", { name: /София/ })).toBeVisible();
    await expect(main.getByRole("button", { name: /Лом/ })).toBeVisible();
  });

  test("procedures page lists procedures", async ({ page }) => {
    test.skip(!hasDatabase, "needs a Supabase project");
    await page.goto("/proceduri");
    await expect(page.getByRole("heading", { name: "Нашите процедури" })).toBeVisible();
  });

  test("sitemap only lists real pages", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("/proceduri");
    expect(xml).toContain("/rezervacii");
    expect(xml).not.toContain("/reserve");
  });
});

test.describe("security", () => {
  test("admin dashboard requires a valid session", async ({ page, context }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin$/);

    // A forged cookie value must not work
    const url = new URL(page.url());
    await context.addCookies([{ name: "cb_admin_session", value: "anything", domain: url.hostname, path: "/" }]);
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("calendar feed is not public", async ({ request }) => {
    expect((await request.get("/api/calendar/feed.ics")).status()).toBe(404);
    expect((await request.get("/api/calendar/feed.ics?token=guess")).status()).toBe(404);
  });

  test("old unauthenticated email endpoints are gone", async ({ request }) => {
    const res = await request.post("/api/email/confirmation", { data: { reservationId: "x" } });
    expect(res.status()).toBe(404);
  });

  test("security headers are set", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});
