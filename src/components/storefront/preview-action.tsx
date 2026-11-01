"use client";

import { Info, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

export interface PreviewActionProps {
  label: string;
  title: string;
  description: string;
  note?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  icon?: "bag" | "info";
  iconOnly?: boolean;
  className?: string;
}

export function PreviewAction({
  label,
  title,
  description,
  note,
  variant = "accent",
  size = "md",
  icon = "bag",
  iconOnly = false,
  className,
}: PreviewActionProps) {
  const Icon = icon === "info" ? Info : ShoppingBag;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(iconOnly && "w-11", className)}
          aria-label={iconOnly ? label : undefined}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {iconOnly ? <span className="sr-only">{label}</span> : label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <p className="eyebrow text-clay">Preview</p>
        <DialogHeader className="mt-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {note ? (
          <p className="mt-4 rounded-md border border-border bg-surface-muted px-3.5 py-3 text-xs leading-5 text-muted-foreground">
            {note}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variant="secondary">Continue browsing</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button asChild>
              <Link href="/products">View the catalog</Link>
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
