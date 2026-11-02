import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Collection } from "mongodb";

import { getUsageCollection } from "@/lib/mongodb";
import type { UsageDocument } from "@/lib/mongodb";
import { consumeQuota, getJstDate, getRemainingQuota } from "@/lib/rateLimit";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ DAILY_LIMIT: 2, IP_HASH_SALT: "テスト用のソルト" }),
}));
vi.mock("@/lib/mongodb", () => ({ getUsageCollection: vi.fn() }));

const IP_LIMIT = 200;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// usage コレクションのうち、回数制限で使う操作だけをメモリ上で再現する
function createFakeUsage() {
  const documents: UsageDocument[] = [];
  return {
    documents,
    async findOneAndUpdate(
      { key, date }: { key: string; date: string },
      update: { $inc: { count: number }; $setOnInsert: { expiresAt: Date } },
    ) {
      let document = documents.find(
        (item) => item.key === key && item.date === date,
      );
      if (!document) {
        document = { key, date, count: 0, ...update.$setOnInsert };
        documents.push(document);
      }
      document.count += update.$inc.count;
      return document;
    },
    find({ date, key }: { date: string; key: { $in: string[] } }) {
      return {
        toArray: async () =>
          documents.filter(
            (item) => item.date === date && key.$in.includes(item.key),
          ),
      };
    },
  };
}

function requestFrom(forwardedFor: string): Request {
  return new Request("http://localhost/api/chat", {
    headers: { "x-forwarded-for": forwardedFor },
  });
}

describe("getJstDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["2026-01-01T14:59:59.999Z", "2026-01-01"],
    ["2026-01-01T15:00:00.000Z", "2026-01-02"],
    ["2026-12-31T15:00:00.000Z", "2027-01-01"],
    ["2028-02-28T15:00:00.000Z", "2028-02-29"],
  ])("UTC %s は日本時間で %s", (now, expected) => {
    vi.useFakeTimers({ now: new Date(now) });
    expect(getJstDate()).toBe(expected);
  });
});

describe("回数制限", () => {
  let usage: ReturnType<typeof createFakeUsage>;
  const request = requestFrom("203.0.113.1");
  const countOf = (prefix: string) =>
    usage.documents.find((item) => item.key.startsWith(prefix))?.count;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-06-01T03:00:00.000Z") });
    usage = createFakeUsage();
    vi.mocked(getUsageCollection).mockResolvedValue(
      usage as unknown as Collection<UsageDocument>,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ブラウザごとの上限まで認め、超えたら拒否する", async () => {
    expect(await consumeQuota("a", request)).toBe(true);
    expect(await consumeQuota("a", request)).toBe(true);
    expect(await consumeQuota("a", request)).toBe(false);
  });

  it("ブラウザごとの上限で拒否した分は、IP の回数に数えない", async () => {
    await consumeQuota("a", request);
    await consumeQuota("a", request);
    await consumeQuota("a", request);
    expect(countOf("anon:")).toBe(3);
    expect(countOf("ip:")).toBe(2);
  });

  it("別のブラウザは別に数える", async () => {
    await consumeQuota("a", request);
    await consumeQuota("a", request);
    expect(await consumeQuota("b", request)).toBe(true);
  });

  it("IP の上限を超えたら、別のブラウザでも拒否する", async () => {
    await consumeQuota("a", request);
    usage.documents.find((item) => item.key.startsWith("ip:"))!.count =
      IP_LIMIT - 1;
    expect(await consumeQuota("b", request)).toBe(true);
    expect(await consumeQuota("c", request)).toBe(false);
  });

  it("日本時間の 0 時で回数がリセットされる", async () => {
    vi.setSystemTime(new Date("2026-06-01T14:59:00.000Z"));
    await consumeQuota("a", request);
    await consumeQuota("a", request);
    expect(await consumeQuota("a", request)).toBe(false);

    vi.setSystemTime(new Date("2026-06-01T15:00:00.000Z"));
    expect(await consumeQuota("a", request)).toBe(true);
  });

  it("最初に数えたときの 2 日後を削除日時にして、以後は変えない", async () => {
    const start = Date.now();
    await consumeQuota("a", request);
    vi.setSystemTime(start + 60_000);
    await consumeQuota("a", request);
    const document = usage.documents.find((item) =>
      item.key.startsWith("anon:"),
    );
    expect(document?.expiresAt.getTime()).toBe(start + TWO_DAYS_MS);
  });

  it("IP をそのまま保存しない", async () => {
    await consumeQuota("a", request);
    expect(JSON.stringify(usage.documents)).not.toContain("203.0.113.1");
  });

  it("X-Forwarded-For の先頭を書き換えても、IP の回数をごまかせない", async () => {
    await consumeQuota("a", requestFrom("198.51.100.1, 203.0.113.1"));
    await consumeQuota("b", requestFrom("198.51.100.2, 203.0.113.1"));
    expect(usage.documents.filter((item) => item.key.startsWith("ip:"))).toEqual(
      [expect.objectContaining({ count: 2 })],
    );
  });

  it("残り回数を返し、0 より小さくしない", async () => {
    expect(await getRemainingQuota("a", request)).toBe(2);
    await consumeQuota("a", request);
    expect(await getRemainingQuota("a", request)).toBe(1);
    await consumeQuota("a", request);
    await consumeQuota("a", request);
    expect(await getRemainingQuota("a", request)).toBe(0);
  });

  it("IP の残りの方が少なければ、そちらを返す", async () => {
    await consumeQuota("a", request);
    usage.documents.find((item) => item.key.startsWith("ip:"))!.count =
      IP_LIMIT - 1;
    expect(await getRemainingQuota("b", request)).toBe(1);
  });
});
