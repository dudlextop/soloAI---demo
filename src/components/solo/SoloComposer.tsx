"use client";

import * as React from "react";
import { Sparkles, SendHorizontal as SendHorizonal, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";

interface SoloComposerProps {
  placeholder?: string;
  onSend?: (value: string) => void;
  onGenerate?: (value: string) => void;
  disabled?: boolean;
}

export function SoloComposer({
  placeholder = "Write a reply...",
  onSend,
  onGenerate,
  disabled = false,
}: SoloComposerProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend?.(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleGenerate = () => {
    if (disabled) return;
    onGenerate?.(value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  React.useEffect(() => {
    autoResize();
  }, [value]);

  return (
    <div className="sticky bottom-0 z-20 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="px-4 pt-4">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "max-h-[220px] min-h-[44px] w-full resize-none bg-transparent text-[15px] leading-6 text-black outline-none placeholder:text-zinc-400",
                disabled && "cursor-not-allowed opacity-60",
              )}
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                className="inline-flex h-9 items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4" />
                Attach
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={disabled}
                className="inline-flex h-9 items-center gap-2 rounded-2xl border border-black/10 bg-zinc-50 px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Generate reply
              </button>
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
            >
              <SendHorizonal className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 pt-2 text-xs text-zinc-400">
          <span>Messages are only sent when you press Send.</span>
          <span>⌘Enter to send</span>
        </div>
      </div>
    </div>
  );
}

