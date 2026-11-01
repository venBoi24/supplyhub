"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface SubmitButtonProps extends Omit<ButtonProps, "children" | "type"> {
  children: string;
  pendingLabel: string;
}

export function SubmitButton({ children, pendingLabel, className, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className={cn("w-full", className)} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
