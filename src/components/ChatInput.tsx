"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { MAX_USER_MESSAGE_LENGTH } from "@/lib/chat";
import { STICKERS, stickerTag } from "@/lib/stickers";
import type { Sticker } from "@/lib/stickers";

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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
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

  // 入力途中の文章は消さない
  function sendSticker(sticker: Sticker) {
    if (disabled) return;
    setIsPickerOpen(false);
    onSend(stickerTag(sticker));
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
      {isPickerOpen && (
        <div
          id="sticker-picker"
          role="group"
          aria-label="スタンプ一覧"
          className="mb-2 grid grid-cols-4 gap-2"
        >
          {STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => sendSticker(sticker)}
              disabled={disabled}
              aria-label={`${sticker.label}のスタンプを送る`}
              className="flex justify-center rounded-xl p-1 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-chat-send focus-visible:outline-none disabled:opacity-50"
            >
              <Image
                src={sticker.src}
                alt=""
                width={64}
                height={80}
                className="h-20 w-16"
              />
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setIsPickerOpen((isOpen) => !isOpen)}
          aria-label={isPickerOpen ? "スタンプ一覧を閉じる" : "スタンプ一覧を開く"}
          aria-expanded={isPickerOpen}
          aria-controls="sticker-picker"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-chat-send focus-visible:outline-none ${isPickerOpen ? "bg-slate-200" : "bg-slate-100"}`}
        >
          <Image src="/haiku-chan.svg" alt="" width={28} height={28} />
        </button>
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
