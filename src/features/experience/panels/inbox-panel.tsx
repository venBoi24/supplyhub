"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquare, Send } from "lucide-react";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";

const time = (at: number) =>
  new Date(at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export function InboxPanel() {
  const { t } = useI18n();
  const { state, sendChat, markChatRead } = useExperience();
  const threads = Object.values(state.chats).sort(
    (a, b) => (b.messages.at(-1)?.at ?? 0) - (a.messages.at(-1)?.at ?? 0),
  );
  const [active, setActive] = useState<string>("");
  const [draft, setDraft] = useState("");
  const activeSlug = active || threads[0]?.vendorSlug || "";
  const thread = state.chats[activeSlug];
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeSlug && state.chats[activeSlug]?.unread) markChatRead(activeSlug);
  }, [activeSlug, state.chats, markChatRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread?.messages.length]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!activeSlug || !draft.trim()) return;
    sendChat(activeSlug, draft);
    setDraft("");
  };

  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <MessageSquare className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-3 font-display text-lg font-medium">{t("experience.inbox.empty")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Open a studio from any product page and tap <strong>{t("product.messageStudio")}</strong>{" "}
          to start a chat. Ask about materials, custom sizes or delivery before you buy.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-[0.35fr_0.65fr]">
      <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto border-b border-border sm:border-r sm:border-b-0">
        {threads.map((t) => (
          <li key={t.vendorSlug}>
            <button
              type="button"
              onClick={() => setActive(t.vendorSlug)}
              className={cn(
                "flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-surface-muted",
                activeSlug === t.vendorSlug && "bg-surface-muted",
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0f766e]/10 text-xs font-bold text-[#0f766e]">
                {t.vendorName.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t.vendorName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t.messages.at(-1)?.text ?? "Say hello"}
                </span>
              </span>
              {t.unread > 0 ? (
                <span className="grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-bold text-white">
                  {t.unread}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex min-h-[26rem] flex-col">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{thread?.vendorName ?? "Studio"}</p>
          <p className="text-xs text-muted-foreground">Usually replies within a few minutes</p>
        </div>
        <div className="flex-1 scrollbar-thin space-y-2 overflow-y-auto p-4">
          {(thread?.messages ?? []).map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.from === "buyer" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  m.from === "buyer"
                    ? "rounded-br-sm bg-[#0f766e] text-white"
                    : "rounded-bl-sm bg-surface-muted text-foreground",
                )}
              >
                <p>{m.text}</p>
                <p
                  className={cn(
                    "mt-0.5 text-[0.625rem]",
                    m.from === "buyer" ? "text-white/70" : "text-muted-foreground",
                  )}
                >
                  {time(m.at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("experience.inbox.placeholder")}
            aria-label={t("experience.inbox.placeholder")}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={t("experience.inbox.send")}
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#0f766e] text-white transition hover:bg-[#0f766e]/90 disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
