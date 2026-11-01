// チャットの API と画面で共有する定数と型

export const MAX_USER_MESSAGE_LENGTH = 500;
// ハイクちゃんの返答は max_tokens で長さが決まるので、ユーザーの上限とは分ける。
// 偽の履歴で大量のトークンを使われないように、上限そのものは設ける。
export const MAX_ASSISTANT_MESSAGE_LENGTH = 4000;
// 直近 20 往復
export const MAX_HISTORY_MESSAGES = 40;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
