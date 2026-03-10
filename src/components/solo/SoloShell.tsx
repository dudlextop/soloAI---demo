"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Menu, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SoloAvatar } from "./SoloAvatar";
import {
  channelStatusTone,
  type Connectors,
  NAV_ITEMS,
  RAIL_SOURCES,
  SOURCE_LABEL,
  SourceLogo,
  type SourceFilter,
  type TabKey,
} from "./solo-shared";

const LOGO_SRC = "/icon.png";

function SourceRailButton({
  active,
  connectors,
  source,
  onClick,
}: {
  active: boolean;
  connectors: Connectors;
  source: keyof Connectors;
  onClick: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const status = connectors[source];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={SOURCE_LABEL[source]}
      whileHover={reducedMotion ? undefined : { y: -1, scale: 1.04 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center rounded-[16px] border transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]",
        active
          ? "border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] text-[color:var(--brand)] shadow-[0_8px_18px_rgba(109,94,252,0.12)]"
          : "border-transparent bg-transparent text-[var(--text-2)] hover:border-[var(--line)] hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]",
      )}
    >
      <SourceLogo source={source} className="h-5 w-5" mono={false} />
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--canvas)]",
          channelStatusTone(status),
        )}
      />
    </motion.button>
  );
}

function NavPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={reducedMotion ? undefined : { y: -1 }}
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] text-[color:var(--brand)] shadow-[0_8px_18px_rgba(109,94,252,0.1)]"
          : "border-transparent text-[var(--text-2)] hover:border-[var(--line)] hover:bg-[var(--panel-subtle)] hover:text-[var(--foreground)]",
      )}
    >
      {label}
    </motion.button>
  );
}

function LogoMark({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-[16px] bg-white/90 shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all",
        active && "shadow-[0_10px_26px_rgba(109,94,252,0.18)]",
      )}
    >
      <Image
        src={LOGO_SRC}
        alt="Solo"
        width={52}
        height={52}
        className="h-[52px] w-[52px] object-cover"
        priority
      />
    </div>
  );
}

export function SoloSidebarPanel({
  tab,
  setTab,
  sourceFilter,
  setSourceFilter,
  connectors,
}: {
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (filter: SourceFilter) => void;
  connectors: Connectors;
}) {
  return (
    <div className="flex h-full flex-col bg-[var(--panel)] px-4 py-4">
      <div className="mb-5 flex items-center gap-3 rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4 shadow-[var(--shadow-subtle)]">
        <LogoMark active={false} />
        <div>
          <div className="text-[13px] font-semibold text-[var(--foreground)]">Solo</div>
          <div className="mt-1 text-sm text-[var(--text-2)]">
            Unified inbox with calm triage across every channel.
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {NAV_ITEMS.filter((item) => item.key !== "search").map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left text-sm font-medium transition-all",
              tab === item.key
                ? "bg-[color:var(--brand-soft)] text-[color:var(--brand)] shadow-[0_8px_18px_rgba(109,94,252,0.1)]"
                : "text-[var(--text-2)] hover:bg-[var(--panel-subtle)] hover:text-[var(--foreground)]",
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--panel-subtle)]">
              <item.icon className="h-4 w-4" />
            </span>
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-3)]">
          Sources
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setTab("inbox");
              setSourceFilter("all");
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              sourceFilter === "all"
                ? "border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                : "border-[var(--line)] bg-[var(--panel-subtle)] text-[var(--text-2)]",
            )}
          >
            All
          </button>
          {RAIL_SOURCES.map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => {
                setTab("inbox");
                setSourceFilter(source);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
                sourceFilter === source
                  ? "border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                  : "border-[var(--line)] bg-[var(--panel-subtle)] text-[var(--text-2)]",
              )}
            >
              <SourceLogo source={source} className="h-3.5 w-3.5" />
              {SOURCE_LABEL[source]}
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  channelStatusTone(connectors[source]),
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-auto rounded-[20px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4 shadow-[var(--shadow-subtle)]">
        <div className="flex items-center gap-3">
          <SoloAvatar
            name="You"
            status="online"
            className="h-10 w-10 border-0 bg-transparent shadow-none"
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[var(--foreground)]">Kabid</div>
            <div className="truncate text-xs text-[var(--text-2)]">
              Reviewing inbound across channels
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SoloShell({
  tab,
  setTab,
  connectors,
  sourceFilter,
  setSourceFilter,
  searchQuery,
  onOpenSearch,
  onOpenSidebar,
  children,
}: {
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  connectors: Connectors;
  sourceFilter: SourceFilter;
  setSourceFilter: (filter: SourceFilter) => void;
  searchQuery: string;
  onOpenSearch: () => void;
  onOpenSidebar: () => void;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-[var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_bottom,rgba(109,94,252,0.08),transparent_26%),linear-gradient(180deg,#f4f3ef,#eef2f5)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.24] [background-image:linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="relative z-10 flex min-h-dvh">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[92px] lg:flex lg:flex-col lg:items-center lg:px-3 lg:py-4">
          <div className="flex h-[calc(100dvh-32px)] w-full flex-col items-center rounded-[28px] border border-[var(--line)] bg-[color:var(--panel)] px-2 py-4 shadow-[var(--shadow-subtle)] backdrop-blur-xl">
            <motion.button
              type="button"
              onClick={() => {
                setTab("inbox");
                setSourceFilter("all");
              }}
              whileHover={reducedMotion ? undefined : { y: -1, scale: 1.02 }}
              whileTap={reducedMotion ? undefined : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className={cn(
                "mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-[20px] border border-transparent bg-transparent p-1 transition-all",
                tab === "inbox" || tab === "now"
                  ? "shadow-[0_0_0_2px_var(--brand-line)]"
                  : "hover:bg-[var(--panel-strong)]",
              )}
              aria-label="Open inbox"
            >
              <LogoMark active={tab === "inbox" || tab === "now"} />
            </motion.button>

            <div className="flex flex-col items-center gap-3">
              {RAIL_SOURCES.map((source) => (
                <SourceRailButton
                  key={source}
                  active={(tab === "inbox" || tab === "now") && sourceFilter === source}
                  connectors={connectors}
                  source={source}
                  onClick={() => {
                    setTab("inbox");
                    setSourceFilter(source);
                  }}
                />
              ))}
            </div>

            <div className="mt-auto flex flex-col items-center gap-3">
              <SoloAvatar
                name="You"
                status="online"
                className="h-10 w-10 border-0 bg-transparent shadow-none"
              />
              <motion.button
                type="button"
                onClick={() => setTab("settings")}
                whileHover={reducedMotion ? undefined : { y: -1, scale: 1.03 }}
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-[16px] border transition-all",
                  tab === "settings"
                    ? "border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                    : "border-[var(--line)] bg-[var(--panel-strong)] text-[var(--text-2)] hover:text-[var(--foreground)]",
                )}
                aria-label="Settings"
              >
                <Settings2 className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:pl-[104px]">
          <header className="relative sticky top-0 z-20 px-3 pt-3 sm:px-4 lg:px-6 lg:pt-5">
            <div className="pointer-events-none absolute inset-x-0 inset-y-0 bg-[color:rgba(244,243,239,0.92)] backdrop-blur-xl" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-b from-[color:rgba(244,243,239,0.92)] to-transparent" />
            <div className="relative mx-auto w-full max-w-[1180px] pb-4">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="lg:hidden"
                  onClick={onOpenSidebar}
                  aria-label="Open navigation"
                >
                  <Menu className="h-4 w-4" />
                </Button>

                <motion.button
                  type="button"
                  layout
                  onClick={onOpenSearch}
                  whileHover={reducedMotion ? undefined : { y: -1 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.998 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3.5 text-left shadow-[var(--shadow-subtle)] transition-colors hover:border-[color:var(--brand-line)] hover:bg-white"
                  aria-label="Open search"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ef6a5b,#f6c75a,#6d5efc)] shadow-[0_10px_22px_rgba(109,94,252,0.12)]" />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[15px] font-medium",
                      searchQuery.trim()
                        ? "text-[var(--foreground)]"
                        : "text-[var(--text-2)]",
                    )}
                  >
                    {searchQuery.trim()
                      ? searchQuery
                      : "Search Solo by sender, topic, or message"}
                  </span>
                  <span className="hidden rounded-full border border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--brand)] sm:inline-flex">
                    ⌘K
                  </span>
                </motion.button>
              </div>

              <div className="mt-4 hidden items-center gap-2 lg:flex">
                {NAV_ITEMS.filter(
                  (item) => item.key !== "search" && item.key !== "settings",
                ).map((item) => (
                  <NavPill
                    key={item.key}
                    active={tab === item.key}
                    label={item.label}
                    onClick={() => setTab(item.key)}
                  />
                ))}
              </div>
            </div>
          </header>

          <div className="px-3 pb-2 sm:px-4 lg:hidden">
            <div className="flex gap-2 overflow-x-auto rounded-[18px] border border-[var(--line)] bg-[color:var(--panel)] px-3 py-2 shadow-[var(--shadow-subtle)] backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  setTab("inbox");
                  setSourceFilter("all");
                }}
                className={cn(
                  "inline-flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-[16px] border transition-colors",
                  (tab === "inbox" || tab === "now") && sourceFilter === "all"
                    ? "border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] p-0.5"
                    : "border-transparent bg-transparent p-0",
                )}
                aria-label="Open inbox"
              >
                <Image
                  src={LOGO_SRC}
                  alt="Solo"
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-[14px] object-cover"
                />
              </button>
              {RAIL_SOURCES.map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => {
                    setTab("inbox");
                    setSourceFilter(source);
                  }}
                  className={cn(
                    "relative inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] border transition-colors",
                    (tab === "inbox" || tab === "now") && sourceFilter === source
                      ? "border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                      : "border-transparent bg-transparent text-[var(--text-2)]",
                  )}
                >
                  <SourceLogo source={source} className="h-4.5 w-4.5" mono={false} />
                  <span
                    className={cn(
                      "absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full",
                      channelStatusTone(connectors[source]),
                    )}
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTab("settings")}
                className={cn(
                  "ml-auto inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] border transition-colors",
                  tab === "settings"
                    ? "border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                    : "border-transparent bg-transparent text-[var(--text-2)]",
                )}
              >
                <Settings2 className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <main className="flex-1 px-3 pb-4 sm:px-4 lg:px-6 lg:pb-6">
            <div className="mx-auto w-full max-w-[1180px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
