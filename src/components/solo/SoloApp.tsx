"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Mail,
  MessageCircle,
  Slack,
  Linkedin,
  Search as SearchIcon,
  Inbox as InboxIcon,
  Calendar,
  Settings as SettingsIcon,
  MoreHorizontal,
  Sparkles,
  Clock3,
  Flag,
  CircleDot,
  UserRound,
  Briefcase,
  MessageSquareReply,
} from "lucide-react";

import type { Conversation, ContactMemory } from "@/lib/types";
import { seedConversations } from "@/lib/seed";
import { analyzeInbox, computePriority } from "@/lib/priority";
import { contactForConversation, conversationsForContact } from "@/lib/contacts";
import { generateContactMemory } from "@/lib/conversation-memory";
import { computeMorningBrief } from "@/lib/brief";
import { searchAll, highlightText } from "@/lib/search";
import { formatTimestamp } from "@/lib/format";

import { cn } from "@/lib/utils";
import { SoloAvatar } from "./SoloAvatar";
import { SoloBadge } from "./SoloBadge";
import { SoloComposer } from "./SoloComposer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TabKey = "inbox" | "brief" | "search" | "settings";
type InboxFilter = "all" | "priority" | "waiting" | "followups" | "other";
type SortMode = "priority" | "recent" | "unread";

type ConnectorStatus = "connected" | "disconnected" | "available";
type Connectors = {
  gmail: ConnectorStatus;
  slack: ConnectorStatus;
  whatsapp: ConnectorStatus;
  linkedin: ConnectorStatus;
};

const TAB_TITLES: Record<TabKey, string> = {
  inbox: "Inbox",
  brief: "Brief",
  search: "Search",
  settings: "Settings",
};

const SOURCE_LABEL: Record<Conversation["source"], string> = {
  gmail: "Gmail",
  slack: "Slack",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
};

function initConversations() {
  return analyzeInbox(seedConversations);
}

export function SoloApp() {
  const [tab, setTab] = React.useState<TabKey>("inbox");
  const [conversations, setConversations] = React.useState<Conversation[]>(() =>
    initConversations(),
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeConversation = React.useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const [contactMemory, setContactMemory] = React.useState<ContactMemory | null>(null);
  const [memoryLoading, setMemoryLoading] = React.useState(false);
  const activeContact = React.useMemo(
    () => (activeConversation ? contactForConversation(activeConversation) : null),
    [activeConversation],
  );

  const [connectors, setConnectors] = React.useState<Connectors>({
    gmail: "connected",
    slack: "connected",
    whatsapp: "available",
    linkedin: "connected",
  });

  const [analyzing, setAnalyzing] = React.useState(false);
  const [generatingDraft, setGeneratingDraft] = React.useState(false);
  const [draft, setDraft] = React.useState<string>("");

  const [briefRefreshing, setBriefRefreshing] = React.useState(false);
  const brief = React.useMemo(() => computeMorningBrief(conversations), [conversations]);

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState(() =>
    searchAll(conversations, ""),
  );

  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false);
  const [inboxFilter, setInboxFilter] = React.useState<InboxFilter>("all");
  const [inboxSearch, setInboxSearch] = React.useState("");
  const [sortMode, setSortMode] = React.useState<SortMode>("priority");
  const [inboxMode, setInboxMode] = React.useState<InboxMode>("list");

  // Conversation list keyboard navigation (J/K + Enter)
  const [navIndex, setNavIndex] = React.useState(0);
  const listIds = React.useMemo(() => conversations.map((c) => c.id), [conversations]);
  React.useEffect(() => {
    if (!listIds.length) return;
    setNavIndex((i) => Math.max(0, Math.min(i, listIds.length - 1)));
  }, [listIds]);

  const listItemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  React.useEffect(() => {
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

    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (paletteOpen) return;
      if (tab !== "inbox") return;
      if (isTypingTarget(e.target)) return;

      if (key === "j") {
        e.preventDefault();
        setNavIndex((i) => {
          const next = Math.min(i + 1, listIds.length - 1);
          const id = listIds[next];
          listItemRefs.current[id]?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (key === "k") {
        e.preventDefault();
        setNavIndex((i) => {
          const next = Math.max(i - 1, 0);
          const id = listIds[next];
          listItemRefs.current[id]?.scrollIntoView({ block: "nearest" });
          return next;
        });
      } else if (key === "enter") {
        e.preventDefault();
        const id = listIds[navIndex];
        if (id) setActiveId(id);
      } else if (key === "e") {
        e.preventDefault();
        if (activeId) {
          toast.message("Archived (demo only)");
        }
      } else if (key === "r") {
        e.preventDefault();
        const textarea = document.querySelector<HTMLTextAreaElement>(
          "textarea[placeholder='Write a reply…']",
        );
        textarea?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, tab, listIds, navIndex]);

  // Search with a small deterministic delay to show loading state.
  React.useEffect(() => {
    if (tab !== "search") return;
    setSearching(true);
    const t = window.setTimeout(() => {
      setSearchResults(searchAll(conversations, searchQuery));
      setSearching(false);
    }, 220);
    return () => window.clearTimeout(t);
  }, [searchQuery, conversations, tab]);

  React.useEffect(() => {
    if (!activeContact) {
      setContactMemory(null);
      return;
    }
    const related = conversationsForContact(activeContact, conversations);
    setContactMemory(generateContactMemory(activeContact, related));
  }, [activeContact, conversations]);

  async function handleUpdateMemory() {
    if (!activeContact) return;
    setMemoryLoading(true);
    await new Promise((r) => window.setTimeout(r, 500));
    const related = conversationsForContact(activeContact, conversations);
    setContactMemory(generateContactMemory(activeContact, related));
    setMemoryLoading(false);
    toast.message("Memory updated");
  }

  async function handleAnalyzeInbox() {
    if (analyzing) return;
    setAnalyzing(true);
    const delay = 750;
    await new Promise((r) => window.setTimeout(r, delay));
    setConversations((prev) => analyzeInbox(prev));
    setAnalyzing(false);
    toast.success("Inbox analyzed");
  }

  async function handleGenerateDraft() {
    if (!activeConversation || generatingDraft) return;
    setGeneratingDraft(true);
    setDraft("");
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: activeConversation }),
      });
      if (!res.ok) throw new Error("Draft failed");
      const data = (await res.json()) as { draft: string };
      setDraft(data.draft);
      toast.message("Draft generated");
    } catch {
      toast.error("Could not generate draft");
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  function handleSendMessage(value: string) {
    if (!activeId) return;
    const sentAt = new Date().toISOString();
    setConversations((prev: Conversation[]) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const updatedMessages = [
          ...c.messages,
          {
            senderName: "You",
            body: value,
            timestamp: sentAt,
          },
        ];
        const updated: Conversation = {
          ...c,
          messages: updatedMessages,
          snippet: value.slice(0, 140),
          lastMessageAt: sentAt,
          unread: false,
          awaitingReply: false,
        };
        const { priorityScore, priorityLabel, priorityReasons } = computePriority(updated);
        return {
          ...updated,
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
    await new Promise((r) => window.setTimeout(r, 700));
    // Brief is derived from conversations; keep deterministic and recompute by forcing state update.
    setConversations((prev) => [...prev]);
    setBriefRefreshing(false);
    toast.message("Brief refreshed");
  }

  function goTo(tabKey: TabKey) {
  setTab(tabKey);
  if (tabKey === "search") {
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }
  if (tabKey === "inbox") {
    setInboxMode("list");
  }
  }

  function toggleConnector(key: keyof Connectors) {
    setConnectors((prev) => {
      const current = prev[key];
      if (current === "available") return prev;
      const next = current === "connected" ? "disconnected" : "connected";
      toast.message(`${SOURCE_LABEL[key]} ${next === "connected" ? "connected" : "disconnected"}`);
      return { ...prev, [key]: next };
    });
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_#c7e1ff_0,_#e8f1ff_32%,_#fdf1e5_72%,_#f8e0dc_100%)] text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 select-none opacity-70 [mask-image:radial-gradient(circle_at_top,_black,transparent_70%)]">
        <div className="absolute inset-x-0 top-[-40px] mx-auto h-64 max-w-4xl rounded-full bg-[radial-gradient(circle_at_top,_#ffffff_0,_transparent_55%)]" />
        <div className="absolute left-[-120px] bottom-[-40px] h-64 w-72 rotate-[-8deg] rounded-[48px] bg-[linear-gradient(135deg,#c7f0ff,#fef3c7)] blur-2xl" />
        <div className="absolute right-[-140px] bottom-[-20px] h-72 w-80 rotate-[6deg] rounded-[56px] bg-[linear-gradient(135deg,#e0e7ff,#fecaca)] blur-2xl" />
      </div>
      <div className="relative z-10 flex min-h-dvh w-full flex-col">
        <TopBar onOpenPalette={() => setPaletteOpen(true)} onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="px-3 pb-3 pt-4 sm:px-4 lg:hidden">
          <Card className="rounded-[16px] border-border bg-white p-1 shadow-sm">
            <div className="grid grid-cols-4 gap-1">
              <MobileTab label="Inbox" active={tab === "inbox"} onClick={() => setTab("inbox")} />
              <MobileTab label="Brief" active={tab === "brief"} onClick={() => setTab("brief")} />
              <MobileTab label="Search" active={tab === "search"} onClick={() => setTab("search")} />
              <MobileTab
                label="Settings"
                active={tab === "settings"}
                onClick={() => setTab("settings")}
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-1 gap-3 px-3 pb-4 sm:gap-4 sm:px-4 sm:pb-8">
          <Sidebar tab={tab} setTab={setTab} connectors={connectors} />
          <WorkspaceSidebar
            tab={tab}
            setTab={setTab}
            inboxFilter={inboxFilter}
            setInboxFilter={setInboxFilter}
          />

          <main className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              {tab === "inbox" && (
                <motion.div
                  key="inbox"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="h-full"
                >
                  <InboxView
                    conversations={conversations}
                    analyzing={analyzing}
                    activeId={activeId}
                    setActiveId={(id) => {
                      setActiveId(id);
                      setDraft("");
                    }}
                    navIndex={navIndex}
                    setNavIndex={setNavIndex}
                    listItemRefs={listItemRefs}
                    activeConversation={activeConversation}
                    draft={draft}
                    generatingDraft={generatingDraft}
                    aiPanelOpen={aiPanelOpen}
                    setAiPanelOpen={setAiPanelOpen}
                    inboxFilter={inboxFilter}
                    setInboxFilter={setInboxFilter}
                    inboxSearch={inboxSearch}
                    setInboxSearch={setInboxSearch}
                    onGenerateDraft={handleGenerateDraft}
                    onInsertDraft={() => {}}
                    onCopy={handleCopy}
                    sortMode={sortMode}
                    setSortMode={setSortMode}
                    contactMemory={contactMemory}
                    memoryLoading={memoryLoading}
                    onUpdateMemory={handleUpdateMemory}
                    onSendMessage={handleSendMessage}
                    inboxMode={inboxMode}
                    setInboxMode={setInboxMode}
                  />
                </motion.div>
              )}

              {tab === "brief" && (
                <motion.div
                  key="brief"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="h-full"
                >
                  <BriefView
                    brief={brief}
                    loading={briefRefreshing}
                    onOpenConversation={(id) => {
                      setActiveId(id);
                      setTab("inbox");
                    }}
                  />
                </motion.div>
              )}

              {tab === "search" && (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="h-full"
                >
                  <SearchView
                    inputRef={searchInputRef}
                    query={searchQuery}
                    setQuery={setSearchQuery}
                    loading={searching}
                    results={searchResults}
                    onOpenConversation={(id) => {
                      setActiveId(id);
                      setTab("inbox");
                    }}
                  />
                </motion.div>
              )}

              {tab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="h-full"
                >
                  <SettingsView connectors={connectors} onToggle={toggleConnector} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      <SoloCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        goTo={goTo}
        onSearchConversations={() => {
          setTab("search");
          window.setTimeout(() => searchInputRef.current?.focus(), 0);
        }}
        onCompose={() => {
          setTab("inbox");
          window.setTimeout(() => {
            const el = document.querySelector<HTMLTextAreaElement>("textarea[placeholder='Write a reply…']");
            el?.focus();
          }, 0);
        }}
        onOpenPriority={() => {
          setInboxFilter("priority");
          setTab("inbox");
        }}
        onOpenWaiting={() => {
          setInboxFilter("waiting");
          setTab("inbox");
        }}
        onOpenFollowups={() => {
          setInboxFilter("followups");
          setTab("inbox");
        }}
        onGenerateReply={handleGenerateDraft}
        onMarkHighPriority={() => {
          if (!activeId) return;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId ? { ...c, priorityLabel: "High" } : c,
            ),
          );
          toast.message("Marked as high priority (demo).");
        }}
        onChangeStage={() => {
          if (!activeId) return;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId ? { ...c, stage: "Decision" } : c,
            ),
          );
          toast.message("Stage changed to Decision (demo).");
        }}
        onChangeContactRole={() => {
          if (!activeId) return;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId ? { ...c, relationshipTag: "client" } : c,
            ),
          );
          toast.message("Contact role set to Client (demo).");
        }}
        onChangeTopic={() => {
          if (!activeId) return;
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId ? { ...c, intent: "Contract discussion" } : c,
            ),
          );
          toast.message("Conversation topic updated (demo).");
        }}
      />

      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogContent className="fixed left-0 top-0 m-0 h-dvh w-[260px] max-w-[80vw] translate-x-0 translate-y-0 rounded-none border-r border-border bg-white p-0 shadow-lg sm:w-[280px]">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-sm font-medium text-[#0B0D10]">
              Navigation
            </DialogTitle>
          </DialogHeader>
          <SidebarContent tab={tab} setTab={(t) => { setTab(t); setSidebarOpen(false); }} connectors={connectors} />
        </DialogContent>
      </Dialog>

      <Dialog open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
        <DialogContent className="fixed right-0 top-0 m-0 h-dvh w-[340px] max-w-[90vw] translate-x-0 translate-y-0 rounded-none border-l border-border bg-white p-0 shadow-lg lg:hidden">
          <AiPanel
            analyzing={analyzing}
            activeConversation={activeConversation}
            draft={draft}
            generatingDraft={generatingDraft}
            contactMemory={contactMemory}
            memoryLoading={memoryLoading}
            onUpdateMemory={handleUpdateMemory}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkspaceSidebar({
  tab,
  setTab,
  inboxFilter,
  setInboxFilter,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  inboxFilter: InboxFilter;
  setInboxFilter: (f: InboxFilter) => void;
}) {
  const goView = (filter: InboxFilter) => {
    setTab("inbox");
    setInboxFilter(filter);
  };

  return (
    <div className="hidden w-[264px] shrink-0 lg:block">
      <Card className="flex h-full flex-col rounded-[20px] border border-white/60 bg-white/90 p-3 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex-1 space-y-6 text-[13px]">
          <div>
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Views
            </div>
            <nav className="space-y-1">
              <WorkspaceItem
                label="Inbox"
                active={tab === "inbox" && inboxFilter === "all"}
                onClick={() => goView("all")}
              />
              <WorkspaceItem
                label="Priority"
                icon={Flag}
                active={tab === "inbox" && inboxFilter === "priority"}
                onClick={() => goView("priority")}
              />
              <WorkspaceItem
                label="Waiting on you"
                icon={Clock3}
                active={tab === "inbox" && inboxFilter === "waiting"}
                onClick={() => goView("waiting")}
              />
              <WorkspaceItem
                label="Follow-ups"
                icon={Sparkles}
                active={tab === "inbox" && inboxFilter === "followups"}
                onClick={() => goView("followups")}
              />
              <WorkspaceItem
                label="Drafts"
                onClick={() => toast.message("Drafts view is not available in this MVP.")}
                active={false}
              />
              <WorkspaceItem
                label="Sent"
                onClick={() => toast.message("Sent view is not available in this MVP.")}
                active={false}
              />
            </nav>
          </div>

          <div>
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sources
            </div>
            <nav className="space-y-1">
              <WorkspaceItem label="Gmail" icon={Mail} active={false} onClick={() => {}} />
              <WorkspaceItem label="LinkedIn" icon={Linkedin} active={false} onClick={() => {}} />
              <WorkspaceItem label="Telegram" active={false} onClick={() => {}} />
            </nav>
          </div>

          <div>
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Labels
            </div>
            <nav className="space-y-1">
              <WorkspaceItem label="Investor" active={false} onClick={() => {}} />
              <WorkspaceItem label="Client" active={false} onClick={() => {}} />
              <WorkspaceItem label="Hiring" active={false} onClick={() => {}} />
              <WorkspaceItem label="Support" active={false} onClick={() => {}} />
              <WorkspaceItem label="Partnership" active={false} onClick={() => {}} />
            </nav>
          </div>
        </div>
      </Card>
    </div>
  );
}

function WorkspaceItem({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-left text-[13px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        active
          ? "bg-[color-mix(in_oklab,var(--primary)_10%,white)] text-[#0B0D10]"
          : "text-muted-foreground hover:bg-muted/60 hover:text-[#0B0D10]",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

function TopBar({
  onOpenPalette,
  onOpenSidebar,
}: {
  onOpenPalette: () => void;
  onOpenSidebar: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-white/85 backdrop-blur">
      <div className="flex h-14 w-full items-center gap-3 px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-xs text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
          >
            ≡
          </button>
          <div className="text-[15px] font-semibold tracking-tight text-[#0B0D10]">
            Solo
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <button
            type="button"
            onClick={onOpenPalette}
            className="inline-flex h-10 items-center gap-3 rounded-2xl border border-black/10 bg-white px-5 text-sm font-medium text-black shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Open command palette"
          >
            <span>Command</span>
            <span className="text-zinc-400">⌘K</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white text-black shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label="More"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => toast.message("All changes are local in this MVP.")}>
                About
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.message("No billing or accounts in MVP.")}>
                Help
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  tab,
  setTab,
  connectors,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  connectors: Connectors;
}) {
  return (
    <div className="hidden w-[72px] shrink-0 lg:block">
      <Card className="h-full rounded-[20px] border border-white/60 bg-white/80 p-0 shadow-[var(--shadow-soft)] backdrop-blur-md">
        <SidebarContent tab={tab} setTab={setTab} connectors={connectors} />
      </Card>
    </div>
  );
}

function SidebarContent({
  tab,
  setTab,
  connectors,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  connectors: Connectors;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-between py-3">
      <nav className="flex flex-col items-center gap-2">
        <SideTab
          label="Inbox"
          icon={InboxIcon}
          active={tab === "inbox"}
          onClick={() => setTab("inbox")}
        />
        <SideTab
          label="Brief"
          icon={Calendar}
          active={tab === "brief"}
          onClick={() => setTab("brief")}
        />
        <SideTab
          label="Search"
          icon={SearchIcon}
          active={tab === "search"}
          onClick={() => setTab("search")}
        />
      </nav>
      <div className="flex flex-col items-center gap-2">
        <ConnectorChip label="Gmail" status={connectors.gmail} />
        <ConnectorChip label="Slack" status={connectors.slack} />
        <ConnectorChip label="WA" status={connectors.whatsapp} />
        <ConnectorChip label="IN" status={connectors.linkedin} />
        <SideTab
          label="Settings"
          icon={SettingsIcon}
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        />
      </div>
    </div>
  );
}

function SideTab({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-[999px] text-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        active
          ? "bg-[color-mix(in_oklab,var(--primary)_16%,white)] text-[#0B0D10]"
          : "text-muted-foreground hover:bg-muted/60 hover:text-[#0B0D10]",
      )}
    >
      <span className="sr-only">{label}</span>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function MobileTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-[14px] px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        active
          ? "bg-[color-mix(in_oklab,var(--primary)_10%,white)] text-[#0B0D10]"
          : "text-muted-foreground hover:bg-muted/60 hover:text-[#0B0D10]",
      )}
    >
      {label}
    </button>
  );
}

function ConnectorChip({ label, status }: { label: string; status: ConnectorStatus }) {
  const source: Conversation["source"] =
    label === "Gmail" ? "gmail" : label === "Slack" ? "slack" : label === "WA" ? "whatsapp" : "linkedin";
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-white/80 shadow-[var(--shadow-subtle)]">
      <span className="sr-only">{label}</span>
      <SourceIcon source={source} className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

type InboxMode = "list" | "thread";

function InboxView(props: {
  conversations: Conversation[];
  analyzing: boolean;
  activeId: string | null;
  setActiveId: (id: string) => void;
  navIndex: number;
  setNavIndex: (n: number) => void;
  listItemRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  activeConversation: Conversation | null;
  draft: string;
  generatingDraft: boolean;
  aiPanelOpen: boolean;
  setAiPanelOpen: (v: boolean) => void;
  inboxFilter: InboxFilter;
  setInboxFilter: (f: InboxFilter) => void;
  inboxSearch: string;
  setInboxSearch: (v: string) => void;
  onGenerateDraft: () => void;
  onInsertDraft: () => void;
  onCopy: (text: string) => void;
  sortMode: SortMode;
  setSortMode: (s: SortMode) => void;
  contactMemory: ContactMemory | null;
  memoryLoading: boolean;
  onUpdateMemory: () => void;
  onSendMessage: (value: string) => void;
  inboxMode: InboxMode;
  setInboxMode: (mode: InboxMode) => void;
}) {
  const {
    conversations,
    analyzing,
    activeId,
    setActiveId,
    navIndex,
    setNavIndex,
    listItemRefs,
    activeConversation,
    draft,
    generatingDraft,
    onGenerateDraft,
    onInsertDraft,
    onCopy,
    sortMode,
    setSortMode,
    contactMemory,
    memoryLoading,
    onUpdateMemory,
    aiPanelOpen,
    setAiPanelOpen,
    inboxFilter,
    setInboxFilter,
    inboxSearch,
    setInboxSearch,
    onSendMessage,
    inboxMode,
    setInboxMode,
  } = props;

  const filtered = React.useMemo(() => {
    const q = inboxSearch.trim().toLowerCase();
    const base = conversations.filter((c) => {
      let include = true;
      switch (inboxFilter) {
        case "priority":
          include = c.priorityLabel === "High";
          break;
        case "waiting":
          include = c.awaitingReply;
          break;
        case "followups":
          include = !c.awaitingReply && c.unread;
          break;
        case "other":
          include = !c.awaitingReply && c.priorityLabel === "Low" && !c.unread;
          break;
        default:
          include = true;
      }
      if (!include) return false;
      if (!q) return true;
      const lastMessage = c.messages[c.messages.length - 1];
      const text = `${c.title} ${c.snippet} ${lastMessage?.body ?? ""}`.toLowerCase();
      return text.includes(q);
    });

    return base;
  }, [conversations, inboxFilter, inboxSearch]);

  if (inboxMode === "list") {
    return (
      <div className="h-[calc(100dvh-56px-16px)]">
        <div className="h-full min-w-0 overflow-hidden rounded-[20px] border border-white/60 bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur">
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-[#0B0D10]">Inbox</div>
                <div className="text-xs text-muted-foreground">{conversations.length} total</div>
              </div>
              <div className="relative">
                <Input
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="h-9 rounded-[999px] pl-8 text-sm"
                />
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Sort by</span>
                  <div className="inline-flex overflow-hidden rounded-full border border-border bg-muted/40 text-xs">
                    {(["priority", "recent", "unread"] as SortMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSortMode(mode)}
                        className={cn(
                          "px-2.5 py-1 capitalize transition-colors",
                          sortMode === mode
                            ? "bg-white text-[#0B0D10]"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[calc(100%-88px)]">
            {analyzing ? (
              <ConversationListSkeleton />
            ) : (
              <div className="divide-y divide-border/80">
                {filtered
                  .slice()
                  .sort((a, b) => {
                    if (sortMode === "recent") {
                      return b.lastMessageAt.localeCompare(a.lastMessageAt);
                    }
                    if (sortMode === "unread") {
                      if (a.unread !== b.unread) {
                        return a.unread ? -1 : 1;
                      }
                      return b.lastMessageAt.localeCompare(a.lastMessageAt);
                    }
                    if (a.priorityScore !== b.priorityScore) {
                      return b.priorityScore - a.priorityScore;
                    }
                    return b.lastMessageAt.localeCompare(a.lastMessageAt);
                  })
                  .map((c, idx) => {
                  const last = c.messages[c.messages.length - 1];
                  const sender =
                      last?.senderName && last.senderName !== "You"
                        ? last.senderName
                        : c.participants.find((p) => p !== "You") ?? "Unknown";
                  const unread = c.unread;
                  const isActive = c.id === activeId;
                  const accentClass =
                    c.priorityLabel === "High"
                      ? "bg-red-400"
                      : c.priorityLabel === "Medium"
                        ? "bg-amber-400"
                        : c.awaitingReply
                          ? "bg-blue-400"
                          : "bg-zinc-300";
                    return (
                      <button
                        key={c.id}
                        ref={(el) => {
                          listItemRefs.current[c.id] = el;
                        }}
                        type="button"
                        onClick={() => {
                          setNavIndex(idx);
                          setActiveId(c.id);
                          setInboxMode("thread");
                        }}
                        className={cn(
                          "group flex w-full items-stretch gap-3 px-4 py-2.5 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                          isActive
                            ? "bg-blue-50/80"
                            : "hover:bg-blue-50/50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-[78px] w-full items-center gap-3 rounded-[16px] bg-white/95 px-2 py-2 shadow-[0_1px_0_rgba(15,23,42,0.04)] ring-1 ring-transparent transition-all group-hover:shadow-[0_6px_16px_rgba(15,23,42,0.10)] group-hover:ring-blue-100",
                            isActive && "bg-blue-50/60 ring-[1.5px] ring-blue-300",
                          )}
                        >
                          <div className={cn("h-full w-[3px] rounded-full", accentClass)} />
                          <MessageAvatar name={sender} isYou={false} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <div
                                  className={cn(
                                    "truncate text-[14px]",
                                  unread ? "font-semibold text-[#0B0D10]" : "font-medium text-[#0B0D10]",
                                  )}
                                >
                                  {sender}
                                </div>
                                <span
                                  className="truncate text-[13px] text-muted-foreground"
                                >
                                  {" — "}
                                  {c.title}
                                </span>
                                <SourceIcon
                                  source={c.source}
                                  className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
                                />
                              </div>
                              <div className="ml-2 flex items-center gap-2">
                                <PriorityPill label={c.priorityLabel} />
                                <div className="w-12 text-right text-[11px] text-muted-foreground">
                                  {formatTimestamp(c.lastMessageAt)}
                                </div>
                                {unread && (
                                  <span
                                    className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
                                    aria-label="Unread"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
                              <span className="line-clamp-1 flex-1">{c.snippet}</span>
                              <div className="ml-2 hidden items-center gap-1 md:flex">
                                {c.intent && <SoloBadge label={c.intent} type="topic" />}
                                {c.relationshipTag && (
                                  <SoloBadge
                                    label={
                                      c.relationshipTag.charAt(0).toUpperCase() +
                                      c.relationshipTag.slice(1)
                                    }
                                    type="role"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-56px-16px)]">
      <div className="h-full overflow-hidden rounded-[20px] border border-white/60 bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            {analyzing ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-48" />
              </div>
            ) : (
              <>
                {activeConversation ? (
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <SoloAvatar
                        name={
                          activeConversation.participants.find((p) => p !== "You") ??
                          activeConversation.participants[0] ??
                          "Contact"
                        }
                        status="online"
                        className="h-9 w-9"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[#0B0D10]">
                          {activeConversation.title}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {activeConversation.participants.filter((p) => p !== "You").join(", ")}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                          <SoloBadge
                            label={activeConversation.intent ?? "Contract discussion"}
                            type="topic"
                          />
                          <SoloBadge
                            label={`Status: ${
                              activeConversation.status ?? "Awaiting reply"
                            }`}
                            type="status"
                          />
                          <SoloBadge
                            label={`Stage: ${activeConversation.stage ?? "Decision"}`}
                            type="stage"
                          />
                          {activeConversation.relationshipTag && (
                            <SoloBadge
                              label={
                                activeConversation.relationshipTag.charAt(0).toUpperCase() +
                                activeConversation.relationshipTag.slice(1)
                              }
                              type="role"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SourceBadge source={activeConversation.source} />
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span>Priority</span>
                        <span className="font-semibold text-[#0B0D10]">
                          {activeConversation.priorityScore}
                        </span>
                      </div>
                      <PriorityPill label={activeConversation.priorityLabel} />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-[#0B0D10]">Thread</div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="ml-3 inline-flex h-8 shrink-0 items-center px-2 text-xs"
                  onClick={() => setInboxMode("list")}
                >
                  ← Inbox
                </Button>
                {activeConversation && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="ml-3 inline-flex h-9 shrink-0 items-center px-3 text-xs lg:hidden"
                    onClick={() => setAiPanelOpen(true)}
                  >
                    AI Insight
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="min-h-0 flex-1">
            {analyzing ? (
              <ThreadSkeleton />
            ) : activeConversation ? (
              <ScrollArea className="h-full">
                <div className="space-y-3 p-4">
                  {activeConversation.messages.map((m, idx) => {
                    const isYou = m.senderName === "You";
                    return (
                      <div
                        key={`${m.timestamp}_${idx}`}
                        className={cn(
                          "flex gap-3",
                          isYou ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "flex max-w-[80%] items-start gap-3 lg:max-w-[72%]",
                            isYou && "flex-row-reverse",
                          )}
                        >
                          <MessageAvatar name={m.senderName} isYou={isYou} />
                          <div
                            className={cn(
                              "min-w-0 rounded-[18px] border px-3.5 py-3 shadow-[0_4px_10px_rgba(15,23,42,0.04)]",
                              isYou
                                ? "border-blue-100 bg-[#E8F1FF]"
                                : "border-zinc-200 bg-white",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-[#0B0D10]">
                                  {isYou ? "You" : m.senderName}
                                  {m.senderRole ? (
                                    <span className="ml-1 font-normal text-muted-foreground">
                                      · {m.senderRole}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  {deriveEmail(m.senderName)}
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <SourceIcon
                                    source={m.source ?? activeConversation.source}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span>{formatTimestamp(m.timestamp)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-zinc-100"
                                  >
                                    Reply
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-zinc-100"
                                  >
                                    Forward
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-zinc-100"
                                  >
                                    Copy link
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 whitespace-pre-wrap text-[16px] leading-7 text-[#0B0D10]">
                              {m.body}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-full items-center justify-center px-6">
                <div className="max-w-sm text-center">
                  <div className="text-sm font-medium text-[#0B0D10]">
                    Select a conversation to see details.
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Use J/K to navigate and Enter to open.
                  </div>
                </div>
              </div>
            )}
          </div>
          <SoloComposer
            disabled={!activeConversation}
            onGenerate={() => {
              onGenerateDraft();
            }}
            onSend={(value) => {
              if (!activeConversation) return;
              onSendMessage(value);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: Conversation["source"] }) {
  const label = SOURCE_LABEL[source];
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-700">
      <SourceIcon source={source} className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}

function SourceIcon({
  source,
  className,
}: {
  source: Conversation["source"];
  className?: string;
}) {
  const Icon =
    source === "gmail"
      ? Mail
      : source === "slack"
        ? Slack
        : source === "whatsapp"
          ? MessageCircle
          : Linkedin;
  return <Icon className={cn("h-4 w-4 text-muted-foreground", className)} aria-hidden="true" />;
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-[1.5px] border-current border-r-transparent align-middle",
        className,
      )}
      aria-hidden="true"
    />
  );
}

function deriveRowState(convo: Conversation): string {
  if (convo.unread && convo.awaitingReply) return "Unread · waiting on you";
  if (convo.unread) return "Unread";
  if (convo.intent === "Meeting scheduling" && convo.stage === "Decision") {
    return "Meeting scheduled";
  }
  if (convo.awaitingReply) return "Waiting on you";
  if (convo.stage === "Follow-up") return "Follow-up";
  return "Replied";
}

function MessageAvatar({ name, isYou }: { name: string; isYou: boolean }) {
  const displayName = isYou ? "You" : name;
  const status = isYou ? ("offline" as const) : ("online" as const);
  return (
    <div className="mt-1 shrink-0" aria-hidden="true">
      <SoloAvatar name={displayName} status={status} />
    </div>
  );
}

function deriveEmail(name: string): string {
  if (name === "You") return "you@solo.app";
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return cleaned ? `${cleaned}@example.com` : "contact@example.com";
}

function AiPanel({
  analyzing,
  activeConversation,
  draft,
  generatingDraft,
  contactMemory,
  memoryLoading,
  onUpdateMemory,
}: {
  analyzing: boolean;
  activeConversation: Conversation | null;
  draft: string;
  generatingDraft: boolean;
  contactMemory: ContactMemory | null;
  memoryLoading: boolean;
  onUpdateMemory: () => void;
}) {
  const [doneLoops, setDoneLoops] = React.useState<string[]>([]);

  React.useEffect(() => {
    setDoneLoops([]);
  }, [contactMemory?.contactId]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-medium text-[#0B0D10]">AI Insight</div>
      </div>
      <div className="min-h-0 flex-1">
        {analyzing ? (
          <AiPanelSkeleton />
        ) : activeConversation ? (
          <ScrollArea className="h-full">
            <div className="space-y-5 p-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">Priority</div>
                  <PriorityPill label={activeConversation.priorityLabel} />
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-medium text-[#0B0D10]">Priority score</div>
                  <div className="text-sm font-semibold text-[#0B0D10]">
                    {activeConversation.priorityScore}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium text-[#0B0D10]">Why this matters</div>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  {(activeConversation.priorityReasons.length
                    ? activeConversation.priorityReasons
                    : ["Not analyzed yet.", "Run Analyze inbox to score priority.", ""])
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((r, idx) => (
                      <li key={`${r}_${idx}`}>{r}</li>
                    ))}
                </ul>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium text-[#0B0D10]">Suggested next action</div>
                <div className="rounded-[14px] border border-border bg-muted/40 px-3 py-2 text-sm text-[#0B0D10]">
                  {activeConversation.suggestedNextStep ??
                    (activeConversation.priorityScore === 0
                      ? "Analyze inbox to generate a clear next action."
                      : "Reply with a clear next step and confirm timing.")}
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium text-[#0B0D10]">Draft reply</div>
                {generatingDraft ? (
                  <div className="space-y-2 rounded-[14px] border border-border bg-white p-3">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ) : draft ? (
                  <div className="rounded-[14px] border border-border bg-white p-3">
                    <div className="flex items-start gap-3">
                      <SoloAvatar name="Solo AI" status="ai" className="h-7 w-7" />
                      <div className="whitespace-pre-wrap text-sm leading-6 text-[#0B0D10]">
                        {draft}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[14px] border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    Generate a draft to preview it here.
                  </div>
                )}
              </div>
              <div className="mt-2 border-t border-border/80 pt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Contact memory
                  </div>
                  <Button
                    size="xs"
                    variant="secondary"
                    className="h-7 rounded-full px-3 text-[11px]"
                    onClick={onUpdateMemory}
                    disabled={memoryLoading || !activeConversation}
                  >
                    {memoryLoading ? "Updating…" : "Update memory"}
                  </Button>
                </div>
                {memoryLoading ? (
                  <MemorySkeleton />
                ) : contactMemory ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid gap-1.5">
                      <div className="text-[11px] font-semibold text-[#0B0D10]">
                        Relationship summary
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contactMemory.relationshipSummary}
                      </div>
                    </div>
                    {contactMemory.keyFacts.length ? (
                      <div className="grid gap-1.5">
                        <div className="text-[11px] font-semibold text-[#0B0D10]">
                          Key facts
                        </div>
                        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                          {contactMemory.keyFacts.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold text-[#0B0D10]">
                          Open loops
                        </div>
                      </div>
                      {contactMemory.openLoops.length ? (
                        <div className="space-y-1.5">
                          {contactMemory.openLoops.map((loop) => {
                            const done = doneLoops.includes(loop);
                            return (
                              <div
                                key={loop}
                                className={cn(
                                  "flex items-start justify-between gap-2 rounded-[10px] px-2 py-1.5",
                                  done
                                    ? "bg-zinc-50 text-zinc-400"
                                    : "bg-amber-50/60 text-amber-800",
                                )}
                              >
                                <div className="flex items-start gap-1.5">
                                  <span
                                    className={cn(
                                      "mt-1 h-1.5 w-1.5 rounded-full",
                                      done ? "bg-zinc-300" : "bg-amber-500",
                                    )}
                                  />
                                  <span className="text-[11px] leading-snug">
                                    {loop}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className={cn(
                                    "ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                    done
                                      ? "bg-zinc-100 text-zinc-500"
                                      : "bg-white text-amber-700 shadow-[0_1px_0_rgba(15,23,42,0.05)]",
                                  )}
                                  onClick={() =>
                                    setDoneLoops((prev) =>
                                      done ? prev.filter((l) => l !== loop) : [...prev, loop],
                                    )
                                  }
                                >
                                  {done ? "Reopen" : "Mark done"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[10px] bg-zinc-50 px-2 py-1.5 text-[11px] text-muted-foreground">
                          No open loops detected.
                        </div>
                      )}
                    </div>
                    <div className="grid gap-1.5">
                      <div className="text-[11px] font-semibold text-[#0B0D10]">
                        Last agreement
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contactMemory.lastAgreement}
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <div className="text-[11px] font-semibold text-[#0B0D10]">
                        Preferences
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contactMemory.preferences}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[14px] border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Select a conversation to see memory.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <div className="text-sm font-medium text-[#0B0D10]">
                Select a conversation to see details.
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                AI Insight appears for the selected thread.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityPill({ label }: { label: Conversation["priorityLabel"] }) {
  const tone =
    label === "High"
      ? "bg-red-50 text-red-700 border-red-200"
      : label === "Medium"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-zinc-50 text-zinc-700 border-zinc-200";
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", tone)}>
      {label}
    </span>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-2 w-2 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="h-full p-4">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
            <div className="w-[72%] rounded-[14px] border border-border p-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="mt-2 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiPanelSkeleton() {
  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-9 w-full rounded-[14px]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-20 w-full rounded-[14px]" />
      </div>
      <div className="mt-2 space-y-2 border-t border-border/80 pt-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function MemorySkeleton() {
  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-9/12" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-10/12" />
      </div>
    </div>
  );
}

function BriefView({
  brief,
  loading,
  onOpenConversation,
}: {
  brief: ReturnType<typeof computeMorningBrief>;
  loading: boolean;
  onOpenConversation: (id: string) => void;
}) {
  return (
    <div className="grid h-[calc(100dvh-56px-16px)] gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="rounded-[16px] border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <div className="text-sm font-medium text-[#0B0D10]">Today</div>
        </div>
        <div className="p-5">
          <div className="grid gap-6">
            <section className="grid gap-3">
              <div className="text-sm font-medium text-[#0B0D10]">Top priorities</div>
              {loading ? (
                <div className="grid gap-2">
                  <Skeleton className="h-14 w-full rounded-[14px]" />
                  <Skeleton className="h-14 w-full rounded-[14px]" />
                  <Skeleton className="h-14 w-full rounded-[14px]" />
                </div>
              ) : brief.topPriorities.length ? (
                <div className="grid gap-2">
                  {brief.topPriorities.map((it) => (
                    <button
                      key={it.conversationId}
                      type="button"
                      onClick={() => onOpenConversation(it.conversationId)}
                      className="rounded-[14px] border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[#0B0D10]">
                            {it.title}
                          </div>
                          <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                            {it.snippet}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <SourceBadge source={it.source} />
                          <PriorityPill label={it.priorityLabel} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[14px] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  No priorities yet. Analyze inbox to generate scoring.
                </div>
              )}
            </section>

            <section className="grid gap-3">
              <div className="text-sm font-medium text-[#0B0D10]">Follow-ups</div>
              {loading ? (
                <div className="grid gap-2">
                  <Skeleton className="h-12 w-full rounded-[14px]" />
                  <Skeleton className="h-12 w-full rounded-[14px]" />
                </div>
              ) : brief.followUps.length ? (
                <div className="grid gap-2">
                  {brief.followUps.slice(0, 4).map((it) => (
                    <button
                      key={it.conversationId}
                      type="button"
                      onClick={() => onOpenConversation(it.conversationId)}
                      className="rounded-[14px] border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[#0B0D10]">
                            {it.title}
                          </div>
                          <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                            {it.snippet}
                          </div>
                        </div>
                        <SourceBadge source={it.source} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[14px] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  No follow-ups needed right now.
                </div>
              )}
            </section>
          </div>
        </div>
      </Card>

      <Card className="rounded-[16px] border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <div className="text-sm font-medium text-[#0B0D10]">Suggested actions</div>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : (
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {brief.suggestedActions.map((a, idx) => (
                <li key={`${a}_${idx}`}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function SearchView({
  inputRef,
  query,
  setQuery,
  loading,
  results,
  onOpenConversation,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  results: ReturnType<typeof searchAll>;
  onOpenConversation: (id: string) => void;
}) {
  const hasQuery = query.trim().length > 0;
  const hasAny = results.conversations.length + results.messages.length > 0;

  return (
    <div className="grid h-[calc(100dvh-56px-16px)] gap-4 lg:grid-cols-[1fr_1fr]">
      <Card className="rounded-[16px] border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <div className="grid gap-2">
            <div className="text-sm font-medium text-[#0B0D10]">Search</div>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all conversations…"
              className="h-10 rounded-[14px]"
            />
          </div>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-12 w-full rounded-[14px]" />
              <Skeleton className="h-12 w-full rounded-[14px]" />
              <Skeleton className="h-12 w-full rounded-[14px]" />
            </div>
          ) : !hasQuery ? (
            <div className="rounded-[14px] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Start typing to search across titles, snippets, and messages.
            </div>
          ) : !hasAny ? (
            <div className="rounded-[14px] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              No results for “{query.trim()}”.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-medium text-[#0B0D10]">Conversations</div>
              {results.conversations.length ? (
                <div className="grid gap-2">
                  {results.conversations.map((r) => (
                    <button
                      key={`${r.type}_${r.conversationId}`}
                      type="button"
                      onClick={() => onOpenConversation(r.conversationId)}
                      className="rounded-[14px] border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[#0B0D10]">
                            {highlightText(
                              r.matches.field === "title" ? r.title : r.title,
                              r.matches.field === "title" ? r.matches.indices : [],
                            ).map((p, idx) => (
                              <span
                                key={idx}
                                className={
                                  p.highlight
                                    ? "rounded-sm bg-[color-mix(in_oklab,var(--primary)_18%,white)] px-1"
                                    : ""
                                }
                              >
                                {p.text}
                              </span>
                            ))}
                          </div>
                          <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                            {highlightText(
                              r.matches.field === "snippet" ? r.snippet : r.snippet,
                              r.matches.field === "snippet" ? r.matches.indices : [],
                            ).map((p, idx) => (
                              <span
                                key={idx}
                                className={
                                  p.highlight
                                    ? "rounded-sm bg-[color-mix(in_oklab,var(--primary)_18%,white)] px-1"
                                    : ""
                                }
                              >
                                {p.text}
                              </span>
                            ))}
                          </div>
                        </div>
                        <SourceBadge source={r.source} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[14px] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  No conversation matches.
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-[16px] border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <div className="text-sm font-medium text-[#0B0D10]">Messages</div>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-[14px]" />
              <Skeleton className="h-12 w-full rounded-[14px]" />
              <Skeleton className="h-12 w-full rounded-[14px]" />
            </div>
          ) : !hasQuery ? (
            <div className="rounded-[14px] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Search results will appear here.
            </div>
          ) : results.messages.length ? (
            <ScrollArea className="h-[calc(100dvh-56px-16px-72px-40px)] pr-2">
              <div className="grid gap-2">
                {results.messages.map((r, idx) => (
                  <button
                    key={`${r.type}_${r.conversationId}_${r.message.timestamp}_${idx}`}
                    type="button"
                    onClick={() => onOpenConversation(r.conversationId)}
                    className="rounded-[14px] border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[#0B0D10]">
                          {r.title}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          <span className="font-medium text-[#0B0D10]">
                            {r.message.senderName}
                            {r.message.senderRole ? ` · ${r.message.senderRole}` : ""}:
                          </span>{" "}
                          {highlightText(r.message.body, r.matches.indices).map((p, i2) => (
                            <span
                              key={i2}
                              className={
                                p.highlight
                                  ? "rounded-sm bg-[color-mix(in_oklab,var(--primary)_18%,white)] px-1"
                                  : ""
                              }
                            >
                              {p.text}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <SourceBadge source={r.source} />
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(r.message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="rounded-[14px] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              No message matches.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function SettingsView({
  connectors,
  onToggle,
}: {
  connectors: Connectors;
  onToggle: (key: keyof Connectors) => void;
}) {
  return (
    <div className="grid h-[calc(100dvh-56px-16px)] gap-4 lg:grid-cols-[1fr_420px]">
      <Card className="rounded-[16px] border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <div className="text-sm font-medium text-[#0B0D10]">Connectors</div>
        </div>
        <div className="p-5">
          <div className="grid gap-3">
            <ConnectorRow
              name="Gmail"
              status={connectors.gmail}
              onToggle={() => onToggle("gmail")}
            />
            <ConnectorRow
              name="Slack"
              status={connectors.slack}
              onToggle={() => onToggle("slack")}
            />
            <ConnectorRow
              name="WhatsApp"
              status={connectors.whatsapp}
              onToggle={() => onToggle("whatsapp")}
              disabled
            />
            <ConnectorRow
              name="LinkedIn"
              status={connectors.linkedin}
              onToggle={() => onToggle("linkedin")}
            />
          </div>
        </div>
      </Card>

      <Card className="rounded-[16px] border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <div className="text-sm font-medium text-[#0B0D10]">Privacy</div>
        </div>
        <div className="p-5">
          <div className="rounded-[14px] border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground">
            Your data stays under your control. Solo does not sell or share your
            information.
          </div>
        </div>
      </Card>
    </div>
  );
}

function ConnectorRow({
  name,
  status,
  onToggle,
  disabled,
}: {
  name: string;
  status: ConnectorStatus;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const label =
    status === "connected" ? "Connected" : status === "available" ? "Available" : "Disconnected";
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-border bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#0B0D10]">{name}</div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      </div>
      <Button
        variant={status === "connected" ? "secondary" : "default"}
        className="h-9"
        disabled={disabled || status === "available"}
        onClick={onToggle}
      >
        {status === "connected" ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}

function SoloCommandPalette({
  open,
  onOpenChange,
  goTo,
  onSearchConversations,
  onCompose,
  onOpenPriority,
  onOpenWaiting,
  onOpenFollowups,
  onGenerateReply,
  onMarkHighPriority,
  onChangeStage,
  onChangeContactRole,
  onChangeTopic,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goTo: (t: TabKey) => void;
  onSearchConversations: () => void;
  onCompose: () => void;
  onOpenPriority: () => void;
  onOpenWaiting: () => void;
  onOpenFollowups: () => void;
  onGenerateReply?: () => void;
  onMarkHighPriority?: () => void;
  onChangeStage?: () => void;
  onChangeContactRole?: () => void;
  onChangeTopic?: () => void;
}) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search conversations or run a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Search">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onSearchConversations();
            }}
          >
            <SearchIcon className="mr-2 h-4 w-4" />
            <span>Search all conversations</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              goTo("inbox");
            }}
          >
            <InboxIcon className="mr-2 h-4 w-4" />
            <span>Go to inbox</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="Views">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onOpenPriority();
            }}
          >
            <Flag className="mr-2 h-4 w-4" />
            <span>Open priority conversations</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onOpenWaiting();
            }}
          >
            <Clock3 className="mr-2 h-4 w-4" />
            <span>Open waiting on you</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onOpenFollowups();
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Open follow-ups</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="Conversation actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onGenerateReply?.();
            }}
          >
            <MessageSquareReply className="mr-2 h-4 w-4" />
            <span>Generate reply</span>
            <CommandShortcut>G</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onMarkHighPriority?.();
            }}
          >
            <Flag className="mr-2 h-4 w-4" />
            <span>Mark as high priority</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onChangeStage?.();
            }}
          >
            <CircleDot className="mr-2 h-4 w-4" />
            <span>Change stage</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onChangeContactRole?.();
            }}
          >
            <UserRound className="mr-2 h-4 w-4" />
            <span>Change contact role</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onChangeTopic?.();
            }}
          >
            <Briefcase className="mr-2 h-4 w-4" />
            <span>Change conversation topic</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />

        <CommandGroup heading="System">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              goTo("search");
            }}
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

