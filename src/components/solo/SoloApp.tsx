"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import type { Conversation } from "@/lib/types";
import { seedConversations } from "@/lib/seed";
import { analyzeInbox, computePriority } from "@/lib/priority";
import { contactForConversation, conversationsForContact } from "@/lib/contacts";
import { generateContactMemory } from "@/lib/conversation-memory";
import { computeMorningBrief } from "@/lib/brief";
import { searchAll } from "@/lib/search";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SoloShell, SoloSidebarPanel } from "./SoloShell";
import { SoloWorkspace, ThreadSheet } from "./SoloWorkspace";
import {
  buildInboxRows,
  buildNowSections,
  type Connectors,
  type InboxMode,
  type PriorityFilter,
  SOURCE_LABEL,
  type SourceFilter,
  type TabKey,
} from "./solo-shared";
import { BriefView, SearchView, SettingsView } from "./SoloSecondaryViews";
import { SoloCommandPalette } from "./SoloCommandPalette";

function initConversations() {
  return analyzeInbox(seedConversations);
}

export function SoloApp() {
  const [tab, setTab] = React.useState<TabKey>("now");
  const [conversations, setConversations] = React.useState<Conversation[]>(() =>
    initConversations(),
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeConversation = React.useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  );

  const activeContact = React.useMemo(
    () => (activeConversation ? contactForConversation(activeConversation) : null),
    [activeConversation],
  );
  const contactMemory = React.useMemo(() => {
    if (!activeContact) return null;
    const related = conversationsForContact(activeContact, conversations);
    return generateContactMemory(activeContact, related);
  }, [activeContact, conversations]);

  const [connectors, setConnectors] = React.useState<Connectors>({
    gmail: "connected",
    slack: "connected",
    whatsapp: "available",
    linkedin: "connected",
    telegram: "available",
  });

  const [analyzing, setAnalyzing] = React.useState(false);
  const [generatingDraft, setGeneratingDraft] = React.useState(false);
  const [briefRefreshing, setBriefRefreshing] = React.useState(false);
  const brief = React.useMemo(() => computeMorningBrief(conversations), [conversations]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const searchResults = React.useMemo(
    () => searchAll(conversations, deferredSearchQuery),
    [conversations, deferredSearchQuery],
  );
  const searchLoading = searchQuery !== deferredSearchQuery;

  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>("all");
  const [inboxMode, setInboxMode] = React.useState<InboxMode>("list");

  const inboxRows = React.useMemo(
    () =>
      buildInboxRows(conversations, {
        sortMode: "priority",
        sourceFilter,
        priorityFilter,
      }),
    [conversations, sourceFilter, priorityFilter],
  );

  const nowSections = React.useMemo(
    () =>
      buildNowSections(conversations, {
        sourceFilter,
        priorityFilter,
      }),
    [conversations, sourceFilter, priorityFilter],
  );

  const queueVisibleIds = React.useMemo(() => {
    if (tab === "now") {
      return nowSections.flatMap((section) =>
        section.items.map((conversation) => conversation.id),
      );
    }

    return inboxRows.map((conversation) => conversation.id);
  }, [inboxRows, nowSections, tab]);

  const [navIndex, setNavIndex] = React.useState(0);
  const listItemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const [composerSeed, setComposerSeed] = React.useState("");
  const [composerSeedToken, setComposerSeedToken] = React.useState(0);
  const [composerFocusToken, setComposerFocusToken] = React.useState(0);

  React.useEffect(() => {
    if (!activeId && conversations.length) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  React.useEffect(() => {
    if (!queueVisibleIds.length) return;

    if (!activeId || !queueVisibleIds.includes(activeId)) {
      setActiveId(queueVisibleIds[0]);
    }

    setNavIndex((current) => Math.max(0, Math.min(current, queueVisibleIds.length - 1)));
  }, [activeId, queueVisibleIds]);

  React.useEffect(() => {
    const isQueueTab = tab === "now" || tab === "inbox";
    if (!isQueueTab) return;

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        target.isContentEditable ||
        target.closest("[data-typing]") !== null
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? event.metaKey : event.ctrlKey;

      if (mod && key === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (paletteOpen || !queueVisibleIds.length || isTypingTarget(event.target)) return;

      if (key === "j") {
        event.preventDefault();
        setNavIndex((current) => {
          const next = Math.min(current + 1, queueVisibleIds.length - 1);
          const id = queueVisibleIds[next];
          listItemRefs.current[id]?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (key === "k") {
        event.preventDefault();
        setNavIndex((current) => {
          const next = Math.max(current - 1, 0);
          const id = queueVisibleIds[next];
          listItemRefs.current[id]?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (key === "enter") {
        event.preventDefault();
        const id = queueVisibleIds[navIndex];
        if (id) {
          setActiveId(id);
          setInboxMode("thread");
        }
      } else if (key === "r") {
        event.preventDefault();
        if (!activeConversation) return;
        setInboxMode("thread");
        setComposerFocusToken((current) => current + 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeConversation, navIndex, paletteOpen, queueVisibleIds, tab]);

  async function handleAnalyzeInbox() {
    if (analyzing) return;
    setAnalyzing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setConversations((current) => analyzeInbox(current));
    setAnalyzing(false);
    toast.success("Triage refreshed");
  }

  async function handleGenerateDraft() {
    if (!activeConversation || generatingDraft) return;
    setGeneratingDraft(true);

    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: activeConversation }),
      });

      if (!response.ok) {
        throw new Error("Draft generation failed");
      }

      const data = (await response.json()) as { draft: string };
      setComposerSeed(data.draft);
      setComposerSeedToken((current) => current + 1);
      setComposerFocusToken((current) => current + 1);
      setInboxMode("thread");
      toast.message("Draft inserted");
    } catch {
      toast.error("Could not generate draft");
    } finally {
      setGeneratingDraft(false);
    }
  }

  function handleSendMessage(value: string) {
    if (!activeId) return;

    const sentAt = new Date().toISOString();
    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== activeId) return conversation;

        const updatedMessages = [
          ...conversation.messages,
          {
            senderName: "You",
            body: value,
            timestamp: sentAt,
            source: conversation.source,
          },
        ];

        const updatedConversation: Conversation = {
          ...conversation,
          messages: updatedMessages,
          snippet: value.slice(0, 140),
          lastMessageAt: sentAt,
          unread: false,
          awaitingReply: false,
          status: "Waiting for response",
        };

        const { priorityScore, priorityLabel, priorityReasons } =
          computePriority(updatedConversation);

        return {
          ...updatedConversation,
          priorityScore,
          priorityLabel,
          priorityReasons,
        };
      }),
    );

    toast.success("Message sent (demo).");
  }

  async function handleRefreshBrief() {
    if (briefRefreshing) return;
    setBriefRefreshing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    setConversations((current) => [...current]);
    setBriefRefreshing(false);
    toast.message("Brief refreshed");
  }

  function goTo(nextTab: TabKey) {
    React.startTransition(() => {
      setTab(nextTab);
    });

    if (nextTab === "now" || nextTab === "inbox") {
      setInboxMode("list");
    }
  }

  function openConversation(id: string) {
    setActiveId(id);
    setInboxMode("thread");
  }

  function toggleConnector(key: keyof Connectors) {
    setConnectors((current) => {
      const status = current[key];
      if (status === "available") return current;
      const next = status === "connected" ? "disconnected" : "connected";
      toast.message(
        `${SOURCE_LABEL[key]} ${next === "connected" ? "connected" : "disconnected"}`,
      );
      return { ...current, [key]: next };
    });
  }

  return (
    <>
      <SoloShell
        tab={tab}
        setTab={goTo}
        connectors={connectors}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        searchQuery={searchQuery}
        onOpenSearch={() => setPaletteOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      >
        <AnimatePresence mode="wait">
          {(tab === "now" || tab === "inbox") && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <SoloWorkspace
                mode={tab}
                rows={inboxRows}
                nowSections={nowSections}
                activeId={activeId}
                analyzing={analyzing}
                sourceFilter={sourceFilter}
                priorityFilter={priorityFilter}
                listItemRefs={listItemRefs}
                setActiveId={setActiveId}
                setInboxMode={setInboxMode}
                setPriorityFilter={setPriorityFilter}
                onAnalyzeInbox={handleAnalyzeInbox}
              />
            </motion.div>
          )}

          {tab === "brief" && (
            <motion.div
              key="brief"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <BriefView
                brief={brief}
                loading={briefRefreshing}
                onRefresh={handleRefreshBrief}
                onOpenConversation={openConversation}
              />
            </motion.div>
          )}

          {tab === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <SearchView
                query={searchQuery}
                loading={searchLoading}
                results={searchResults}
                onOpenConversation={openConversation}
              />
            </motion.div>
          )}

          {tab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsView connectors={connectors} onToggle={toggleConnector} />
            </motion.div>
          )}
        </AnimatePresence>
      </SoloShell>

      <SoloCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        query={searchQuery}
        setQuery={setSearchQuery}
        results={searchResults}
        goTo={goTo}
        onOpenConversation={openConversation}
        onCompose={() => {
          if (!activeConversation) {
            const fallbackId = queueVisibleIds[0] ?? conversations[0]?.id;
            if (fallbackId) setActiveId(fallbackId);
          }
          setInboxMode("thread");
          setComposerFocusToken((current) => current + 1);
        }}
        onOpenPriorityFilter={(filter) => {
          setPriorityFilter(filter);
          goTo("inbox");
        }}
        onGenerateReply={handleGenerateDraft}
        onAnalyzeInbox={handleAnalyzeInbox}
      />

      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogContent
          showCloseButton={false}
          className="fixed left-0 top-0 m-0 h-dvh w-[280px] max-w-[86vw] translate-x-0 translate-y-0 rounded-none border-r border-[var(--line)] bg-[var(--panel)] p-0 shadow-[var(--shadow-panel)]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Navigation</DialogTitle>
          </DialogHeader>
          <SoloSidebarPanel
            tab={tab}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            connectors={connectors}
            setTab={(nextTab) => {
              goTo(nextTab);
              setSidebarOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <ThreadSheet
        open={Boolean(activeConversation && inboxMode === "thread")}
        onOpenChange={(open) => {
          if (!open) setInboxMode("list");
        }}
        activeConversation={activeConversation}
        generatingDraft={generatingDraft}
        contactMemory={contactMemory}
        onGenerateDraft={handleGenerateDraft}
        onSendMessage={handleSendMessage}
        composerSeed={composerSeed}
        composerSeedToken={composerSeedToken}
        composerFocusToken={composerFocusToken}
      />
    </>
  );
}
