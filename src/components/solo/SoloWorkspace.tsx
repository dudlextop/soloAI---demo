"use client";

import * as React from "react";
import type { ContactMemory, Conversation } from "@/lib/types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/format";
import { SoloAvatar } from "./SoloAvatar";
import { SoloComposer } from "./SoloComposer";
import {
  type InboxMode,
  type PriorityFilter,
  PRIORITY_FILTERS,
  priorityDotTone,
  type QueueSection,
  SourceLogo,
  SOURCE_LABEL,
  type SourceFilter,
  SourcePill,
  primaryParticipant,
  PriorityPill,
} from "./solo-shared";

function formatCompactTime(iso: string) {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w`;
  return formatTimestamp(iso);
}

function rowSecondaryText(conversation: Conversation, person: string) {
  const normalizedTitle = conversation.title.trim().toLowerCase();
  const normalizedPerson = person.trim().toLowerCase();

  if (normalizedTitle && normalizedTitle !== normalizedPerson) {
    return conversation.title;
  }

  return conversation.snippet || conversation.title;
}

function QueueRow({
  conversation,
  active,
  onSelect,
  rowRef,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  rowRef: (element: HTMLButtonElement | null) => void;
}) {
  const reducedMotion = useReducedMotion();
  const person = primaryParticipant(conversation);
  const unread = conversation.unread;

  return (
    <motion.button
      ref={rowRef}
      type="button"
      onClick={onSelect}
      layout
      whileHover={reducedMotion ? undefined : { y: -1 }}
      whileTap={reducedMotion ? undefined : { scale: 0.995 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]",
        active
          ? "border border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] shadow-[0_14px_30px_rgba(109,94,252,0.12)]"
          : "border border-transparent hover:bg-white/70",
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", priorityDotTone(conversation))} />
      <SoloAvatar
        name={person}
        status="online"
        className="h-11 w-11 rounded-full border-0 bg-[var(--panel-subtle)] shadow-none"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-[15px] text-[var(--foreground)]",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {person}
          </span>
          <span className="text-[12px] text-[var(--text-3)]">
            {formatCompactTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="mt-1 line-clamp-1 text-sm leading-6 text-[var(--text-2)]">
          {rowSecondaryText(conversation, person)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <SourceLogo source={conversation.source} className="h-4 w-4" />
      </div>
    </motion.button>
  );
}

function QueueHeader({
  context,
  analyzing,
  onAnalyzeInbox,
}: {
  context?: React.ReactNode;
  analyzing: boolean;
  onAnalyzeInbox: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3.5">
      <div className="min-w-0 text-sm text-[var(--text-2)]">{context}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-[var(--text-2)] hover:bg-[color:var(--brand-soft)] hover:text-[color:var(--brand)]"
        onClick={onAnalyzeInbox}
        disabled={analyzing}
        aria-label="Refresh triage"
      >
        <RefreshCw className={cn("h-4 w-4", analyzing && "animate-spin")} />
      </Button>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyQueue({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[360px] items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <div className="text-sm font-medium text-[var(--foreground)]">{title}</div>
        <div className="mt-2 text-sm leading-6 text-[var(--text-2)]">{description}</div>
      </div>
    </div>
  );
}

function QueuePane({
  mode,
  rows,
  nowSections,
  activeId,
  analyzing,
  sourceFilter,
  priorityFilter,
  listItemRefs,
  setActiveId,
  setInboxMode,
  setPriorityFilter,
  onAnalyzeInbox,
}: {
  mode: "now" | "inbox";
  rows: Conversation[];
  nowSections: QueueSection[];
  activeId: string | null;
  analyzing: boolean;
  sourceFilter: SourceFilter;
  priorityFilter: PriorityFilter;
  listItemRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  setActiveId: (id: string) => void;
  setInboxMode: (mode: InboxMode) => void;
  setPriorityFilter: (filter: PriorityFilter) => void;
  onAnalyzeInbox: () => void;
}) {
  const isNow = mode === "now";

  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-panel)]">
      <QueueHeader
        context={
          sourceFilter !== "all" ? (
            <span className="inline-flex items-center gap-2">
              <SourceLogo source={sourceFilter} className="h-4 w-4" />
              {SOURCE_LABEL[sourceFilter]}
            </span>
          ) : isNow ? (
            "Focused queue"
          ) : (
            "All sources"
          )
        }
        analyzing={analyzing}
        onAnalyzeInbox={onAnalyzeInbox}
      />

      {!isNow ? (
        <div className="border-b border-[var(--line)] px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {PRIORITY_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setPriorityFilter(filter.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  priorityFilter === filter.key
                    ? "border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] text-[color:var(--brand)] shadow-[0_8px_18px_rgba(109,94,252,0.1)]"
                    : "border-[var(--line)] bg-[var(--panel-subtle)] text-[var(--text-2)] hover:bg-white",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-[560px]">
        <ScrollArea className="h-[calc(100dvh-238px)] min-h-[560px]">
          <div className="px-3 py-3">
            {analyzing ? (
              <LoadingList />
            ) : isNow ? (
              nowSections.length ? (
                <div className="space-y-5">
                  {nowSections.map((section) => (
                    <div key={section.key}>
                      <div className="px-2 pb-2">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-3)]">
                          {section.label}
                        </div>
                        <div className="mt-1 text-sm text-[var(--text-2)]">
                          {section.description}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {section.items.map((conversation) => (
                          <QueueRow
                            key={conversation.id}
                            conversation={conversation}
                            active={activeId === conversation.id}
                            rowRef={(element) => {
                              listItemRefs.current[conversation.id] = element;
                            }}
                            onSelect={() => {
                              setActiveId(conversation.id);
                              setInboxMode("thread");
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyQueue
                  title="Now is clear."
                  description="Nothing urgent is competing for attention at the moment."
                />
              )
            ) : rows.length ? (
              <div className="space-y-1">
                {rows.map((conversation) => (
                  <QueueRow
                    key={conversation.id}
                    conversation={conversation}
                    active={activeId === conversation.id}
                    rowRef={(element) => {
                      listItemRefs.current[conversation.id] = element;
                    }}
                    onSelect={() => {
                      setActiveId(conversation.id);
                      setInboxMode("thread");
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyQueue
                title="Nothing matches this filter."
                description="Change the priority or source filter to see more threads."
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}

function MessageBlock({
  conversation,
  message,
}: {
  conversation: Conversation;
  message: Conversation["messages"][number];
}) {
  const isYou = message.senderName === "You";

  return (
    <div className={cn("flex", isYou ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[92%] gap-3 lg:max-w-[84%]", isYou && "flex-row-reverse")}>
        <SoloAvatar
          name={isYou ? "You" : message.senderName}
          status={isYou ? "offline" : "online"}
          className="mt-1 h-9 w-9 rounded-full border-0 shadow-none"
        />
        <div
          className={cn(
            "rounded-[24px] border px-4 py-3",
            isYou
              ? "border-[var(--line)] bg-[var(--accent-soft)]"
              : "border-[var(--line)] bg-[var(--panel-strong)]",
          )}
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-3)]">
            <span className="font-semibold text-[var(--foreground)]">
              {isYou ? "You" : message.senderName}
            </span>
            <span>{formatTimestamp(message.timestamp)}</span>
            {!isYou ? <span>{SOURCE_LABEL[message.source ?? conversation.source]}</span> : null}
          </div>
          <div className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-[var(--foreground)]">
            {message.body}
          </div>
        </div>
      </div>
    </div>
  );
}

function truncateMessage(body: string, max = 120) {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

function ContextWindow({
  activeConversation,
  contactMemory,
}: {
  activeConversation: Conversation | null;
  contactMemory: ContactMemory | null;
}) {
  const recentMessages = activeConversation?.messages.slice(-2).reverse() ?? [];
  const relationshipLine = contactMemory?.relationshipSummary
    ? truncateMessage(contactMemory.relationshipSummary, 96)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.16 }}
      className="w-full max-w-[420px] rounded-[26px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_28px_80px_rgba(15,23,42,0.2)]"
    >
      <div className="space-y-4 text-sm leading-6">
        <div>
          <div className="text-[16px] font-semibold text-[var(--foreground)]">Context</div>
          <div className="mt-2 text-[15px] leading-7 text-[var(--foreground)]">
            {activeConversation?.suggestedNextStep ?? "Review the latest messages and respond."}
          </div>
        </div>

        {relationshipLine ? (
          <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-subtle)] px-4 py-3 text-[14px] leading-6 text-[var(--text-2)]">
            {relationshipLine}
          </div>
        ) : null}

        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-3)]">
            Latest
          </div>
          <div className="mt-2 space-y-2">
            {recentMessages.map((message, index) => (
              <div
                key={`${message.timestamp}_${index}`}
                className="rounded-[16px] border border-[var(--line)] bg-[var(--panel-subtle)] px-3 py-2.5"
              >
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-3)]">
                  {message.senderName}
                </div>
                <div className="mt-1 text-[13px] leading-5 text-[var(--foreground)]">
                  {truncateMessage(message.body, 100)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ThreadSheet({
  open,
  onOpenChange,
  activeConversation,
  generatingDraft,
  contactMemory,
  onGenerateDraft,
  onSendMessage,
  composerSeed,
  composerSeedToken,
  composerFocusToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeConversation: Conversation | null;
  generatingDraft: boolean;
  contactMemory: ContactMemory | null;
  onGenerateDraft: () => void;
  onSendMessage: (value: string) => void;
  composerSeed: string;
  composerSeedToken: number;
  composerFocusToken: number;
}) {
  const [contextOpen, setContextOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) {
      setContextOpen(false);
    }
  }, [open]);

  React.useEffect(() => {
    setContextOpen(false);
  }, [activeConversation?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "left-3 right-3 top-auto bottom-3 z-[60] max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-[30px] border border-[var(--line)] bg-[var(--panel)] p-0 shadow-[var(--shadow-panel)]",
          "w-auto max-h-[82dvh] data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
          "sm:left-auto sm:right-6 sm:top-6 sm:bottom-6 sm:w-[min(620px,calc(100vw-64px))] sm:max-w-none sm:max-h-[calc(100dvh-48px)] sm:data-[state=closed]:slide-out-to-right-4 sm:data-[state=open]:slide-in-from-right-4",
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Thread</DialogTitle>
        </DialogHeader>
        {activeConversation ? (
          <div className="relative flex h-full min-h-0 flex-col">
            <div className="border-b border-[var(--line)] px-5 py-4">
              <div className="relative flex items-start gap-3">
                <SoloAvatar
                  name={primaryParticipant(activeConversation)}
                  status="online"
                  className="h-11 w-11 rounded-full border-0 shadow-none"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[18px] font-semibold text-[var(--foreground)]">
                    {primaryParticipant(activeConversation)}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-[var(--text-2)]">
                    {activeConversation.title}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <SourcePill source={activeConversation.source} />
                    <PriorityPill label={activeConversation.priorityLabel} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setContextOpen((current) => !current)}
                    className="inline-flex h-9 items-center rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-3 text-sm font-medium text-[var(--text-2)] transition-colors hover:border-[color:var(--brand-line)] hover:bg-[color:var(--brand-soft)] hover:text-[color:var(--brand)]"
                  >
                    Context
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-strong)] text-[var(--text-2)] transition-colors hover:text-[var(--foreground)]"
                    aria-label="Close thread"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

              </div>
            </div>

            <div className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-4 px-5 py-5">
                  <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-subtle)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                    {activeConversation.suggestedNextStep ??
                      "Review the thread and decide the next step."}
                  </div>

                  {activeConversation.messages.map((message, index) => (
                    <MessageBlock
                      key={`${message.timestamp}_${index}`}
                      conversation={activeConversation}
                      message={message}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            <SoloComposer
              key={activeConversation.id}
              disabled={!activeConversation}
              generating={generatingDraft}
              channelLabel={activeConversation.source}
              onGenerate={onGenerateDraft}
              onSend={onSendMessage}
              injectedValue={composerSeed}
              injectedToken={composerSeedToken}
              focusToken={composerFocusToken}
            />

            <AnimatePresence>
              {contextOpen ? (
                <div className="absolute inset-0 z-30 flex items-start justify-center bg-[rgba(15,23,42,0.08)] px-4 py-20 backdrop-blur-[2px]">
                  <button
                    type="button"
                    className="absolute inset-0 cursor-default"
                    aria-label="Close context"
                    onClick={() => setContextOpen(false)}
                  />
                  <div className="relative z-10 w-full max-w-[420px]">
                    <ContextWindow
                      activeConversation={activeConversation}
                      contactMemory={contactMemory}
                    />
                  </div>
                </div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function SoloWorkspace({
  mode,
  rows,
  nowSections,
  activeId,
  analyzing,
  sourceFilter,
  priorityFilter,
  listItemRefs,
  setActiveId,
  setInboxMode,
  setPriorityFilter,
  onAnalyzeInbox,
}: {
  mode: "now" | "inbox";
  rows: Conversation[];
  nowSections: QueueSection[];
  activeId: string | null;
  analyzing: boolean;
  sourceFilter: SourceFilter;
  priorityFilter: PriorityFilter;
  listItemRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  setActiveId: (id: string) => void;
  setInboxMode: (mode: InboxMode) => void;
  setPriorityFilter: (filter: PriorityFilter) => void;
  onAnalyzeInbox: () => void;
}) {
  return (
    <QueuePane
      mode={mode}
      rows={rows}
      nowSections={nowSections}
      activeId={activeId}
      analyzing={analyzing}
      sourceFilter={sourceFilter}
      priorityFilter={priorityFilter}
      listItemRefs={listItemRefs}
      setActiveId={setActiveId}
      setInboxMode={setInboxMode}
      setPriorityFilter={setPriorityFilter}
      onAnalyzeInbox={onAnalyzeInbox}
    />
  );
}
