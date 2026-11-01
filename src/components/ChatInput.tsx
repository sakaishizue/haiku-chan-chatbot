"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { MAX_USER_MESSAGE_LENGTH } from "@/lib/chat";

type Props = {
  disabled: boolean;
  onSend: (text: string) => void;
};

// タッチ端末ではソフトキーボードの改行キーを、送信ではなく改行として扱う
function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

export default function ChatInput({ disabled, onSend }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isTooLong = text.length > MAX_USER_MESSAGE_LENGTH;
  const canSend = !disabled && text.trim() !== "" && !isTooLong;

  // 無効化でフォーカスが外れるので、返答が終わったら戻す（タッチ端末ではキーボードが開くので戻さない）
  useEffect(() => {
    if (!disabled && !isTouchDevice()) textareaRef.current?.focus();
  }, [disabled]);

  function send() {
    if (!canSend) return;
    onSend(text);
    setText("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    // 日本語の変換を確定する Enter では送信しない（keyCode 229 は Safari 向け）
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (isTouchDevice()) return;
    event.preventDefault();
    send();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white px-3 pt-2 pb-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          aria-label="メッセージ"
          aria-describedby="message-length"
          aria-invalid={isTooLong}
          placeholder={disabled ? "ハイクちゃんが入力中…" : "メッセージを入力"}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl bg-slate-100 px-3 py-2 text-base field-sizing-content text-ink outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-chat-send disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="h-10 shrink-0 rounded-full bg-chat-send px-4 font-bold text-white disabled:bg-slate-300 disabled:text-slate-600"
        >
          送信
        </button>
      </div>
      <p
        id="message-length"
        className={`mt-1 text-right text-xs ${isTooLong ? "font-bold text-red-700" : "text-slate-600"}`}
      >
        {isTooLong && "長すぎるよ！ "}
        {text.length} / {MAX_USER_MESSAGE_LENGTH}
      </p>
    </form>
  );
}
