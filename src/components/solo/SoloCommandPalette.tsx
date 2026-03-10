"use client";

import {
  CalendarDays,
  Inbox as InboxIcon,
  Settings2,
  Sparkles,
} from "lucide-react";

import { formatTimestamp } from "@/lib/format";
import type { SearchHit } from "@/lib/search";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  type PriorityFilter,
  PriorityPill,
  SourceLogo,
  type TabKey,
} from "./solo-shared";

function priorityDotFor(label: SearchHit["priorityLabel"]) {
  if (label === "High") return "bg-red-500";
  if (label === "Medium") return "bg-amber-500";
  return "bg-zinc-300";
}

function SearchResultItem({
  result,
  onSelect,
}: {
  result: SearchHit;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={[
        result.title,
        result.participant,
        result.excerpt,
        result.matchedField,
        result.source,
      ].join(" ")}
      onSelect={onSelect}
      className="rounded-[18px] px-3 py-3 data-[selected=true]:bg-[color:var(--brand-soft)] data-[selected=true]:text-[var(--foreground)]"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full ${priorityDotFor(result.priorityLabel)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-3)]">
            <span>{result.participant}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--text-3)]" />
            <span>{result.matchedField}</span>
          </div>
          <div className="mt-1 truncate text-[15px] font-semibold text-[var(--foreground)]">
            {result.title}
          </div>
          <div className="mt-1 line-clamp-1 text-sm text-[var(--text-2)]">{result.excerpt}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <SourceLogo source={result.source} className="h-4 w-4" />
          <PriorityPill label={result.priorityLabel} />
          <span className="text-[11px] text-[var(--text-3)]">
            {formatTimestamp(result.lastMessageAt)}
          </span>
        </div>
      </div>
    </CommandItem>
  );
}

export function SoloCommandPalette({
  open,
  onOpenChange,
  query,
  setQuery,
  results,
  goTo,
  onOpenConversation,
  onCompose,
  onOpenPriorityFilter,
  onGenerateReply,
  onAnalyzeInbox,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  query: string;
  setQuery: (value: string) => void;
  results: SearchHit[];
  goTo: (tab: TabKey) => void;
  onOpenConversation: (id: string) => void;
  onCompose: () => void;
  onOpenPriorityFilter: (filter: PriorityFilter) => void;
  onGenerateReply: () => void;
  onAnalyzeInbox: () => void;
}) {
  const handleSelect = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  const hasQuery = query.trim().length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-2xl overflow-hidden rounded-[30px] border border-[var(--line)] bg-[var(--panel)] p-0 shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search threads, jump to a view, or run an action"
        className="text-[15px]"
      />
      <CommandList className="max-h-[520px]">
        {hasQuery ? (
          results.length ? (
            <CommandGroup heading="Threads" className="p-2">
              {results.slice(0, 10).map((result) => (
                <SearchResultItem
                  key={result.conversationId}
                  result={result}
                  onSelect={() => handleSelect(() => onOpenConversation(result.conversationId))}
                />
              ))}
            </CommandGroup>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-[var(--text-2)]">
              No threads match <span className="font-medium text-[var(--foreground)]">{query}</span>.
            </div>
          )
        ) : (
          <>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => handleSelect(() => goTo("now"))}>
                <Sparkles className="h-4 w-4" />
                Now
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => goTo("inbox"))}>
                <InboxIcon className="h-4 w-4" />
                Inbox
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => goTo("brief"))}>
                <CalendarDays className="h-4 w-4" />
                Brief
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => goTo("settings"))}>
                <Settings2 className="h-4 w-4" />
                Settings
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Inbox filters">
              <CommandItem onSelect={() => handleSelect(() => onOpenPriorityFilter("all"))}>
                All threads
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => onOpenPriorityFilter("high"))}>
                High priority
              </CommandItem>
              <CommandItem
                onSelect={() => handleSelect(() => onOpenPriorityFilter("needs_reply"))}
              >
                Needs reply
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => onOpenPriorityFilter("medium"))}>
                Medium priority
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => onOpenPriorityFilter("low"))}>
                Low priority
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => handleSelect(onCompose)}>
                Focus composer
                <CommandShortcut>R</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(onGenerateReply)}>
                Generate draft reply
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(onAnalyzeInbox)}>
                Refresh triage
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
