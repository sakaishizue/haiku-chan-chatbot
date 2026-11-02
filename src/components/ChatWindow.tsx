"use client";

import { useEffect, useRef, useState } from "react";

import ChatInput from "@/components/ChatInput";
import MessageBubble from "@/components/MessageBubble";
import { MAX_HISTORY_MESSAGES } from "@/lib/chat";
import type { ChatMessage } from "@/lib/chat";
import { parseAssistantContent, parseUserContent } from "@/lib/stickers";
import type { DisplayContent } from "@/lib/stickers";

type DisplayMessage = ChatMessage & {
  id: number;
  // あいさつやエラーの定型文は、画面に出すだけで API には送らない
  displayOnly?: boolean;
};

const GREETING: DisplayMessage = {
  id: 0,
  role: "assistant",
  content:
    "やっほー！ハイクちゃんだよ♪ 今日はどんなことがあった？なんでも気軽に話しかけてね！",
  displayOnly: true,
};

const ERROR_MESSAGE =
  "ごめんね、ちょっと調子が悪いみたい…少し待ってからもう一度話しかけてね！";

// API はエラーでもハイクちゃんの口調の文面を text/plain で返す。それ以外の応答は中身を見せない。
async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("text/plain")) return ERROR_MESSAGE;
  return (await response.text()) || ERROR_MESSAGE;
}

// 取得できないときは null を返す。残り回数の表示だけの話なので、会話は止めない。
async function fetchRemaining(): Promise<number | null> {
  try {
    const response = await fetch("/api/quota");
    if (!response.ok) return null;
    const { remaining } = (await response.json()) as { remaining: number };
    return remaining;
  } catch {
    return null;
  }
}

function toDisplayContent({ role, content }: ChatMessage): DisplayContent {
  return role === "user" ? parseUserContent(content) : parseAssistantContent(content);
}

export default function ChatWindow() {
  // 会話はこの state だけで持つので、リロードすると消える
  const [messages, setMessages] = useState<DisplayMessage[]>([GREETING]);
  const [isSending, setIsSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRemaining().then(setRemaining);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, isSending]);

  // スタンプ一覧やキーボードが開いて会話の欄が狭くなっても、最新のメッセージを見えるようにする
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  async function handleSend(text: string) {
    const userMessage: DisplayMessage = {
      id: nextId.current++,
      role: "user",
      content: text,
    };
    const replyId = nextId.current++;

    function putReply(content: string, displayOnly = false) {
      setMessages((current) => [
        ...current.filter((message) => message.id !== replyId),
        { id: replyId, role: "assistant", content, displayOnly },
      ]);
    }

    const history = [...messages, userMessage]
      .filter((message) => !message.displayOnly)
      .slice(-MAX_HISTORY_MESSAGES)
      .map(({ role, content }) => ({ role, content }));

    setMessages((current) => [...current, userMessage]);
    setIsSending(true);

    let reply = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!response.ok || !response.body) {
        putReply(await readErrorMessage(response), true);
        return;
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        reply += value;
        putReply(reply);
      }
      if (reply.trim() === "") putReply(ERROR_MESSAGE, true);
    } catch {
      putReply(reply ? `${reply}\n\n${ERROR_MESSAGE}` : ERROR_MESSAGE, true);
    } finally {
      setIsSending(false);
      setRemaining(await fetchRemaining());
    }
  }

  const displayMessages = messages
    .map((message) => ({ ...message, display: toDisplayContent(message) }))
    // タグだけが届いている途中の返答は、まだ表示するものがない
    .filter(({ display }) => display.text !== "" || display.sticker);

  // 返答の最初の文字が届くまでは「入力中…」の吹き出しを出す
  const isWaitingForReply =
    isSending && displayMessages[displayMessages.length - 1]?.role === "user";

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-chat-background">
      <header className="bg-chat-header px-4 py-2 text-white">
        <h1 className="font-bold">ハイクちゃん</h1>
        <p className="text-xs">おしゃべり好きな AI の女の子</p>
        {remaining !== null && (
          <p className="text-xs">今日はあと {remaining} 回話せるよ</p>
        )}
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-label="会話"
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-3"
      >
        {displayMessages.map(({ id, role, display }) => (
          <MessageBubble key={id} role={role} sticker={display.sticker}>
            {display.text}
          </MessageBubble>
        ))}
        {isWaitingForReply && (
          <MessageBubble role="assistant">入力中…</MessageBubble>
        )}
      </div>

      <ChatInput disabled={isSending} onSend={handleSend} />
    </div>
  );
}
