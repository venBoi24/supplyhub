"use client";

import { useActionState } from "react";

import { updateUserStatusAction } from "@/features/admin/actions";
import { initialFormState } from "@/features/identity/form-state";
import { Button } from "@/components/ui/button";

export function UserStatusForm({
  userId,
  status,
}: {
  userId: string;
  status: "ACTIVE" | "SUSPENDED";
}) {
  const [state, action, pending] = useActionState(updateUserStatusAction, initialFormState);
  const nextStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        if (
          nextStatus === "SUSPENDED" &&
          !window.confirm("Suspend this account? Their current sessions will be revoked.")
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={nextStatus} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Saving…" : status === "ACTIVE" ? "Suspend" : "Reactivate"}
      </Button>
      {state.message ? (
        <span
          aria-live="polite"
          className={state.status === "error" ? "text-xs text-danger" : "text-xs text-success"}
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
