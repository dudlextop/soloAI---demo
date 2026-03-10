"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimestamp } from "@/lib/format";
import { highlightText, type SearchHit } from "@/lib/search";
import { computeMorningBrief } from "@/lib/brief";
import { cn } from "@/lib/utils";
import { RefreshCw, ShieldCheck } from "lucide-react";
import {
  PriorityPill,
  SourceLogo,
  SourcePill,
  type Connectors,
  type SourceChannel,
} from "./solo-shared";

function Surface({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-panel)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </div>
          <div className="mt-1 text-sm leading-6 text-[var(--text-2)]">{description}</div>
        </div>
        {action}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-[var(--panel-subtle)] px-4 py-5 text-sm leading-6 text-[var(--text-2)]">
      <div className="font-medium text-[var(--foreground)]">{title}</div>
      <div className="mt-1">{description}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-3)]">
      {children}
    </div>
  );
}

export function BriefView({
  brief,
  loading,
  onOpenConversation,
  onRefresh,
}: {
  brief: ReturnType<typeof computeMorningBrief>;
  loading: boolean;
  onOpenConversation: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <Surface
      title="Brief"
      description="A quieter summary of what deserves attention next."
      action={
        <Button
          type="button"
          variant="secondary"
          className="h-10 rounded-full px-4"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="grid gap-6">
        <div className="grid gap-3">
          <SectionLabel>Focus now</SectionLabel>
          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-[20px]" />
              ))}
            </div>
          ) : brief.topPriorities.length ? (
            <div className="grid gap-3">
              {brief.topPriorities.map((item) => (
                <button
                  key={item.conversationId}
                  type="button"
                  onClick={() => onOpenConversation(item.conversationId)}
                  className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4 text-left transition-colors hover:border-[var(--line-strong)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-[var(--foreground)]">
                        {item.title}
                      </div>
                      <div className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-2)]">
                        {item.snippet}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityPill label={item.priorityLabel} />
                      <SourcePill source={item.source} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing urgent is competing for attention."
              description="Refresh the brief after triage if you want a fresh summary."
            />
          )}
        </div>

        <div className="grid gap-3">
          <SectionLabel>Follow-ups</SectionLabel>
          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-[20px]" />
              ))}
            </div>
          ) : brief.followUps.length ? (
            <div className="grid gap-3">
              {brief.followUps.slice(0, 5).map((item) => (
                <button
                  key={item.conversationId}
                  type="button"
                  onClick={() => onOpenConversation(item.conversationId)}
                  className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4 text-left transition-colors hover:border-[var(--line-strong)]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-[var(--foreground)]">
                      {item.title}
                    </div>
                    <div className="mt-2 line-clamp-1 text-sm text-[var(--text-2)]">
                      {item.snippet}
                    </div>
                  </div>
                  <SourcePill source={item.source} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No open follow-ups right now."
              description="When threads are waiting on you, they will show up here."
            />
          )}
        </div>

        <div className="grid gap-3">
          <SectionLabel>Next moves</SectionLabel>
          <div className="grid gap-2.5">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 rounded-[18px]" />
                ))
              : brief.suggestedActions.map((action) => (
                  <div
                    key={action}
                    className="flex items-start gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3"
                  >
                    <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-[var(--text-3)]" />
                    <span className="text-sm leading-6 text-[var(--text-2)]">{action}</span>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </Surface>
  );
}

const MATCH_LABEL: Record<SearchHit["matchedField"], string> = {
  title: "Title",
  snippet: "Snippet",
  participant: "Participant",
  sender: "Sender",
  role: "Role",
  body: "Message",
  source: "Source",
  relationship: "Context",
};

export function SearchView({
  query,
  loading,
  results,
  onOpenConversation,
}: {
  query: string;
  loading: boolean;
  results: SearchHit[];
  onOpenConversation: (id: string) => void;
}) {
  const hasQuery = query.trim().length > 0;

  return (
    <Surface
      title="Search"
      description="Unified matches across senders, titles, messages, and source labels."
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[var(--text-2)]">
          {hasQuery ? (
            <>
              Searching for <span className="font-medium text-[var(--foreground)]">{query.trim()}</span>
            </>
          ) : (
            "Open the top search bar to search the full inbox."
          )}
        </div>
        {hasQuery ? (
          <div className="rounded-full border border-[var(--line)] bg-[var(--panel-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-2)]">
            {results.length} results
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        {!hasQuery ? (
          <div className="rounded-[18px] border border-[var(--line)] bg-[var(--panel-subtle)] px-4 py-4 text-sm text-[var(--text-2)]">
            Search opens from the top bar and returns one best hit per thread.
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-[20px]" />
            ))}
          </div>
        ) : results.length ? (
          <div className="grid gap-3">
            {results.map((result) => (
              <button
                key={result.conversationId}
                type="button"
                onClick={() => onOpenConversation(result.conversationId)}
                className="rounded-[22px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4 text-left transition-colors hover:border-[var(--line-strong)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-3)]">
                      <span>{MATCH_LABEL[result.matchedField]}</span>
                      <span className="h-1 w-1 rounded-full bg-[var(--text-3)]" />
                      <span>{result.participant}</span>
                    </div>
                    <div className="mt-2 truncate text-[15px] font-semibold text-[var(--foreground)]">
                      {result.title}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-2)]">
                      {highlightText(result.excerpt, result.highlightRanges).map((part, index) => (
                        <span
                          key={index}
                          className={
                            part.highlight
                              ? "rounded bg-[color:var(--brand-soft)] px-1 text-[var(--foreground)]"
                              : ""
                          }
                        >
                          {part.text}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <SourceLogo source={result.source} className="h-4 w-4" />
                    <PriorityPill label={result.priorityLabel} />
                    <div className="text-xs text-[var(--text-3)]">
                      {formatTimestamp(result.lastMessageAt)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title={`No results for "${query.trim()}".`}
            description="Try a sender name, company, topic, source name, or a phrase from the message body."
          />
        )}
      </div>
    </Surface>
  );
}

function ConnectorRow({
  source,
  status,
  onToggle,
  disabled,
}: {
  source: SourceChannel;
  status: Connectors[keyof Connectors];
  onToggle: () => void;
  disabled?: boolean;
}) {
  const label =
    status === "connected"
      ? "Connected"
      : status === "available"
        ? "Available soon"
        : "Disconnected";

  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--panel-subtle)]">
          <SourceLogo source={source} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-[var(--foreground)]">
            {source === "whatsapp"
              ? "WhatsApp"
              : source === "linkedin"
                ? "LinkedIn"
                : source === "telegram"
                  ? "Telegram"
                  : source.charAt(0).toUpperCase() + source.slice(1)}
          </div>
          <div className="mt-1 text-sm text-[var(--text-2)]">{label}</div>
        </div>
      </div>
      <Button
        type="button"
        variant={status === "connected" ? "secondary" : "default"}
        className="h-10 rounded-full px-4"
        onClick={onToggle}
        disabled={disabled || status === "available"}
      >
        {status === "connected" ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}

export function SettingsView({
  connectors,
  onToggle,
}: {
  connectors: Connectors;
  onToggle: (key: keyof Connectors) => void;
}) {
  return (
    <Surface
      title="Settings"
      description="A calm place to manage the sources feeding Solo."
    >
      <div className="grid gap-3">
        <ConnectorRow
          source="gmail"
          status={connectors.gmail}
          onToggle={() => onToggle("gmail")}
        />
        <ConnectorRow
          source="slack"
          status={connectors.slack}
          onToggle={() => onToggle("slack")}
        />
        <ConnectorRow
          source="whatsapp"
          status={connectors.whatsapp}
          onToggle={() => onToggle("whatsapp")}
          disabled={connectors.whatsapp === "available"}
        />
        <ConnectorRow
          source="linkedin"
          status={connectors.linkedin}
          onToggle={() => onToggle("linkedin")}
        />
        <ConnectorRow
          source="telegram"
          status={connectors.telegram}
          onToggle={() => onToggle("telegram")}
          disabled={connectors.telegram === "available"}
        />
      </div>

      <div className="mt-6 rounded-[22px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--panel-subtle)]">
            <ShieldCheck className="h-4 w-4 text-[var(--foreground)]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--foreground)]">
              Your data stays under your control.
            </div>
            <div className="mt-1 text-sm leading-6 text-[var(--text-2)]">
              Solo keeps this MVP local and uses deterministic triage so the interface stays calm, inspectable, and predictable.
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}
