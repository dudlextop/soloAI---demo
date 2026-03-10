"use client";

import * as React from "react";
import { Paperclip, SendHorizontal as SendHorizonal, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { SOURCE_LABEL } from "./solo-shared";
import type { Conversation } from "@/lib/types";

interface SoloComposerProps {
  placeholder?: string;
  onSend?: (value: string) => void;
  onGenerate?: () => void;
  disabled?: boolean;
  generating?: boolean;
  channelLabel?: Conversation["source"];
  injectedValue?: string;
  injectedToken?: number;
  focusToken?: number;
}

export function SoloComposer({
  placeholder = "Draft a clear reply...",
  onSend,
  onGenerate,
  disabled = false,
  generating = false,
  channelLabel,
  injectedValue,
  injectedToken,
  focusToken,
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
    if (disabled || generating) return;
    onGenerate?.();
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

  React.useEffect(() => {
    if (typeof injectedToken !== "number" || !injectedValue) return;
    setValue(injectedValue);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [injectedToken, injectedValue]);

  React.useEffect(() => {
    if (typeof focusToken !== "number") return;
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [focusToken]);

  const sourceHint = channelLabel ? SOURCE_LABEL[channelLabel] : "the original channel";

  return (
    <div className="border-t border-[var(--line)] bg-[color:var(--panel-strong)] px-4 py-4 backdrop-blur">
      <div className="rounded-[24px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-subtle)]">
        <div className="flex items-center justify-between gap-3 px-4 pb-0 pt-3">
          <div className="text-sm text-[var(--text-2)]">
            Reply will be sent back to {sourceHint}.
          </div>
          <div className="hidden rounded-full border border-[var(--line)] bg-[var(--panel-subtle)] px-3 py-1 text-[11px] font-medium text-[var(--text-2)] sm:block">
            ⌘ / Ctrl + Enter
          </div>
        </div>

        <div className="px-4 pt-3">
          <div data-typing>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "max-h-[220px] min-h-[52px] w-full resize-none bg-transparent text-[15px] leading-7 text-[var(--foreground)] outline-none placeholder:text-[var(--text-3)]",
                disabled && "cursor-not-allowed opacity-60",
              )}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-3 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" />
              Attach
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled || generating}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel-subtle)] px-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] disabled:pointer-events-none disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {generating ? "Generating..." : "Generate draft"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--foreground)] px-4 text-sm font-medium text-white transition hover:opacity-92 disabled:pointer-events-none disabled:opacity-50"
          >
            <SendHorizonal className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
