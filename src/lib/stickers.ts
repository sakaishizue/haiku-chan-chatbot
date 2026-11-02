// スタンプの一覧と、会話の中のタグの扱い。API と画面で共有する。
// スタンプは「（スタンプ: やったー）」のようなテキストとして履歴に入れ、画面に出すときだけ画像にする。

export type Sticker = {
  id: string;
  label: string;
  src: string;
};

// 画像を差し替えるときは public/stickers/ のファイルか、ここの src を変える
export const STICKERS: readonly Sticker[] = [
  { id: "yatta", label: "やったー", src: "/stickers/yatta.svg" },
  { id: "thanks", label: "ありがとう", src: "/stickers/thanks.svg" },
  { id: "sleep", label: "おやすみ", src: "/stickers/sleep.svg" },
  { id: "sorry", label: "ごめんね", src: "/stickers/sorry.svg" },
  { id: "surprised", label: "びっくり", src: "/stickers/surprised.svg" },
  { id: "naruhodo", label: "なるほど", src: "/stickers/naruhodo.svg" },
  { id: "cheer", label: "がんばれ", src: "/stickers/cheer.svg" },
  { id: "eeen", label: "えーん", src: "/stickers/eeen.svg" },
];

// AI が半角のかっこやコロンで書くこともあるので、どちらも認める
const TAG_PATTERN = /[（(]スタンプ[:：]\s*([^）)]*?)\s*[）)]/g;
const WHOLE_TAG_PATTERN = /^[（(]スタンプ[:：]\s*([^）)]*?)\s*[）)]$/;
// ストリーミング途中で末尾に届いている、閉じていないタグ（「（スタ」など）
const PARTIAL_TAG_PATTERN = /[（(](?:ス(?:タ(?:ン(?:プ(?:[:：][^）)]*)?)?)?)?)?$/;

function findSticker(label: string): Sticker | null {
  return STICKERS.find((sticker) => sticker.label === label) ?? null;
}

export function stickerTag(sticker: Sticker): string {
  return `（スタンプ: ${sticker.label}）`;
}

// メッセージ全体がタグなのに、一覧にないスタンプを指している場合に true を返す
export function isUnknownStickerTag(content: string): boolean {
  const match = content.trim().match(WHOLE_TAG_PATTERN);
  return match !== null && findSticker(match[1]) === null;
}

export type DisplayContent = {
  text: string;
  sticker: Sticker | null;
};

// ユーザーのメッセージは、全体が一覧のタグのときだけスタンプとして表示する
export function parseUserContent(content: string): DisplayContent {
  const match = content.trim().match(WHOLE_TAG_PATTERN);
  const sticker = match && findSticker(match[1]);
  return sticker ? { text: "", sticker } : { text: content, sticker: null };
}

// ハイクちゃんの返答からタグを取り除く。スタンプは最初の 1 つだけ使い、一覧にないものは表示しない。
export function parseAssistantContent(content: string): DisplayContent {
  let sticker: Sticker | null = null;
  const text = content
    .replace(TAG_PATTERN, (_tag, label: string) => {
      sticker ??= findSticker(label);
      return "";
    })
    .replace(PARTIAL_TAG_PATTERN, "")
    .trim();
  return { text, sticker };
}
