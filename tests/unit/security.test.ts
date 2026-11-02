import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, safeEqual, verifySessionToken } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { escapeHtml } from "@/lib/html";
import { escapeIcsText, foldIcsLine, formatIcsDate } from "@/lib/ics";

describe("admin session tokens", () => {
  const original = process.env.ADMIN_SESSION_SECRET;
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = "a".repeat(48);
  });
  afterEach(() => {
    process.env.ADMIN_SESSION_SECRET = original;
  });

  it("accepts a token it issued", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it("rejects arbitrary or tampered cookies", async () => {
    const token = (await createSessionToken())!;
    const [exp, nonce, sig] = token.split(".");
    expect(await verifySessionToken("anything")).toBe(false);
    expect(await verifySessionToken("")).toBe(false);
    expect(await verifySessionToken(`${Number(exp) + 1000}.${nonce}.${sig}`)).toBe(false);
    expect(await verifySessionToken(`${exp}.${nonce}.${sig.slice(0, -1)}x`)).toBe(false);
  });

  it("rejects expired tokens", async () => {
    const token = await createSessionToken(Date.now() - 13 * 60 * 60 * 1000);
    expect(await verifySessionToken(token)).toBe(false);
  });

  it("rejects tokens signed with another secret", async () => {
    const token = await createSessionToken();
    process.env.ADMIN_SESSION_SECRET = "b".repeat(48);
    expect(await verifySessionToken(token)).toBe(false);
  });

  it("refuses to work without a strong secret", async () => {
    process.env.ADMIN_SESSION_SECRET = "short";
    expect(await createSessionToken()).toBeNull();
  });

  it("compares strings safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("password hashing", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("output escaping", () => {
  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });

  it("escapes iCalendar text so notes cannot inject properties", () => {
    expect(escapeIcsText("a;b,c\\d\r\nURL:https://evil.test")).toBe("a\;b\\,c\\\\d\\nURL:https://evil.test");
  });

  it("formats UTC dates and folds long lines to 75 octets", () => {
    expect(formatIcsDate(new Date("2026-01-05T08:00:00Z"))).toBe("20260105T080000Z");
    const folded = foldIcsLine("DESCRIPTION:" + "Ж".repeat(100));
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
