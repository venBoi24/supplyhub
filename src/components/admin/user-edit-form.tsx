"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAdminUserAction, editAdminUserAction } from "@/features/admin/actions";
import { initialFormState } from "@/features/identity/form-state";
import { useT } from "@/i18n/client";

export function UserEditForm({
  userId,
  name,
  email,
}: {
  userId: string;
  name: string;
  email: string;
}) {
  const t = useT();
  const [editState, editAction, editPending] = useActionState(
    editAdminUserAction,
    initialFormState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAdminUserAction,
    initialFormState,
  );

  return (
    <div className="grid gap-3">
      <details>
        <summary className="cursor-pointer text-xs font-medium text-accent underline underline-offset-4">
          {t("admin.editAccount")}
        </summary>
        <form action={editAction} className="mt-3 grid w-full min-w-0 gap-2">
          <input type="hidden" name="userId" value={userId} />
          <label className="grid gap-1 text-xs">
            {t("auth.name")}
            <Input
              name="name"
              defaultValue={name}
              maxLength={80}
              required
              minLength={2}
              className="min-w-0"
            />
          </label>
          <label className="grid gap-1 text-xs">
            {t("auth.email")}
            <Input
              name="email"
              type="email"
              defaultValue={email}
              maxLength={254}
              required
              className="min-w-0"
            />
          </label>
          <Button
            size="sm"
            type="submit"
            disabled={editPending}
            className="w-full min-w-0"
            style={{ whiteSpace: "normal" }}
          >
            {editPending ? t("common.saving") : t("admin.saveChanges")}
          </Button>
          {editState.message ? (
            <p role="status" className="text-xs text-muted-foreground">
              {editState.message}
            </p>
          ) : null}
        </form>
      </details>

      <form
        action={deleteAction}
        onSubmit={(event) => {
          if (!window.confirm(t("admin.deleteAccountConfirm"))) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={deletePending}
          className="w-full min-w-0"
          style={{ whiteSpace: "normal" }}
        >
          {deletePending ? t("admin.deletingPending") : t("common.delete")}
        </Button>
        {deleteState.message ? (
          <p role="status" className="mt-2 max-w-56 text-xs text-muted-foreground">
            {deleteState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
