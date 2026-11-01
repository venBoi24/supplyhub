"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/field";
import { editAdminUserAppealAction } from "@/features/admin/actions";
import { initialFormState } from "@/features/identity/form-state";

export function UserAppealEditForm({
  userId,
  vendorId,
  name,
  vendorName,
  appealReason,
}: {
  userId: string;
  vendorId: string;
  name: string;
  vendorName: string;
  appealReason: string;
}) {
  const [state, action, pending] = useActionState(editAdminUserAppealAction, initialFormState);

  return (
    <details className="mt-3 border-t border-border pt-3">
      <summary className="cursor-pointer text-xs font-medium text-accent underline underline-offset-4">
        Edit user and appeal
      </summary>
      <form action={action} className="mt-3 grid min-w-64 gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="vendorId" value={vendorId} />
        <label className="grid gap-1 text-xs">
          Username
          <Input name="name" defaultValue={name} maxLength={80} required minLength={2} />
        </label>
        <label className="grid gap-1 text-xs">
          Store name
          <Input
            name="vendorName"
            defaultValue={vendorName}
            maxLength={100}
            required
            minLength={2}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Appeal reason
          <Textarea
            name="appealReason"
            defaultValue={appealReason}
            minLength={20}
            maxLength={1000}
            required
            className="min-h-24"
          />
        </label>
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save user and appeal"}
        </Button>
        {state.message ? (
          <p role="status" className="text-xs text-muted-foreground">
            {state.message}
          </p>
        ) : null}
      </form>
    </details>
  );
}
