"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
}

interface ToastInput {
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToasterProvider.");
  }

  return context;
}

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((input: ToastInput) => {
    setMessages((current) => [
      ...current,
      { id: Date.now() + Math.floor(Math.random() * 1000), ...input },
    ]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4200}>
        {children}
        {messages.map((message) => (
          <ToastPrimitive.Root
            key={message.id}
            defaultOpen
            onOpenChange={(open) => {
              if (!open) {
                setMessages((current) => current.filter((item) => item.id !== message.id));
              }
            }}
            className="toast-panel flex items-start gap-4 rounded-lg border border-border bg-surface px-4 py-3.5 shadow-[0_24px_60px_-28px_rgb(6_10_20/0.55)]"
          >
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="text-sm font-medium">
                {message.title}
              </ToastPrimitive.Title>
              {message.description ? (
                <ToastPrimitive.Description className="mt-1 text-sm leading-5 text-muted-foreground">
                  {message.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <X className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Dismiss notification</span>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
