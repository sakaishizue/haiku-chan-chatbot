import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  isUnknownStickerTag,
  parseAssistantContent,
  parseUserContent,
  STICKERS,
  stickerTag,
} from "@/lib/stickers";
import { parseMessages } from "@/lib/validateMessages";

const yatta = STICKERS.find(({ id }) => id === "yatta")!;
const sleep = STICKERS.find(({ id }) => id === "sleep")!;

describe("スタンプの一覧", () => {
  it.each(STICKERS.map((sticker) => [sticker.label, sticker] as const))(
    "%s の画像がある",
    (_label, sticker) => {
      expect(existsSync(join("public", sticker.src))).toBe(true);
    },
  );

  it("id とラベルが重複していない", () => {
    expect(new Set(STICKERS.map(({ id }) => id)).size).toBe(STICKERS.length);
    expect(new Set(STICKERS.map(({ label }) => label)).size).toBe(
      STICKERS.length,
    );
  });
});

describe("parseUserContent", () => {
  it("全体が一覧のタグならスタンプにする", () => {
    expect(parseUserContent(stickerTag(yatta))).toEqual({
      text: "",
      sticker: yatta,
    });
  });

  it("文章の中のタグや、一覧にないタグは文字のまま表示する", () => {
    for (const content of ["見て（スタンプ: やったー）", "（スタンプ: ほげ）", "やっほー"]) {
      expect(parseUserContent(content)).toEqual({ text: content, sticker: null });
    }
  });
});

describe("parseAssistantContent", () => {
  it("タグを取り除いてスタンプにする", () => {
    expect(parseAssistantContent("おやすみ！\n（スタンプ: おやすみ）")).toEqual({
      text: "おやすみ！",
      sticker: sleep,
    });
  });

  it("スタンプだけの返答も扱える", () => {
    expect(parseAssistantContent("（スタンプ: やったー）")).toEqual({
      text: "",
      sticker: yatta,
    });
  });

  it.each(["（スタンプ：やったー）", "(スタンプ: やったー)", "（スタンプ:やったー）"])(
    "書き方の違いも認める: %s",
    (content) => {
      expect(parseAssistantContent(content).sticker).toBe(yatta);
    },
  );

  it("一覧にないタグは表示しない", () => {
    expect(parseAssistantContent("やっほー（スタンプ: ほげ）")).toEqual({
      text: "やっほー",
      sticker: null,
    });
  });

  it("スタンプは最初の 1 つだけ使い、タグはすべて取り除く", () => {
    expect(
      parseAssistantContent(
        "（スタンプ: ほげ）やっほー（スタンプ: やったー）（スタンプ: おやすみ）",
      ),
    ).toEqual({ text: "やっほー", sticker: yatta });
  });

  it.each(["（", "（ス", "（スタ", "（スタン", "（スタンプ", "（スタンプ:", "（スタンプ: やっ"])(
    "ストリーミング途中の %s を見せない",
    (partial) => {
      expect(parseAssistantContent(`やっほー${partial}`)).toEqual({
        text: "やっほー",
        sticker: null,
      });
    },
  );

  it("スタンプではないかっこは残す", () => {
    const content = "楽しかった（笑） スタンプ集めも好き(たぶん)";
    expect(parseAssistantContent(content).text).toBe(content);
  });

  it("タグがなければそのまま返す", () => {
    expect(parseAssistantContent("やっほー！")).toEqual({
      text: "やっほー！",
      sticker: null,
    });
  });
});

describe("スタンプの入力検証", () => {
  it("一覧にないタグだけのメッセージを見分ける", () => {
    expect(isUnknownStickerTag("（スタンプ: ほげ）")).toBe(true);
    expect(isUnknownStickerTag(stickerTag(yatta))).toBe(false);
    expect(isUnknownStickerTag("見て（スタンプ: ほげ）")).toBe(false);
  });

  it("ユーザーが一覧のスタンプを送れる", () => {
    const messages = [{ role: "user", content: stickerTag(yatta) }];
    expect(parseMessages({ messages })).toEqual(messages);
  });

  it("ユーザーが一覧にないスタンプを送ると拒否する", () => {
    const messages = [{ role: "user", content: "（スタンプ: ほげ）" }];
    expect(parseMessages({ messages })).toBeNull();
  });

  it("ハイクちゃんの履歴に一覧にないタグがあっても拒否しない", () => {
    const messages = [
      { role: "user", content: "やっほー" },
      { role: "assistant", content: "（スタンプ: ほげ）" },
      { role: "user", content: "元気？" },
    ];
    expect(parseMessages({ messages })).toEqual(messages);
  });
});
