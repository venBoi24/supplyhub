"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { archiveCategoryAction } from "@/features/catalog/admin-actions";
import { initialFormState } from "@/features/identity/form-state";
import { useT } from "@/i18n/client";

export function CategoryArchiveAction({
  categoryId,
  publishedCount,
}: {
  categoryId: string;
  publishedCount: number;
}) {
  const t = useT();
  const [state, action] = useActionState(archiveCategoryAction, initialFormState);

  if (publishedCount > 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        {t("admin.archiveBlocked", {
          count: publishedCount,
          objects: publishedCount === 1 ? t("nav.object") : t("nav.objects"),
        })}
      </p>
    );
  }

  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(event) => {
        if (!window.confirm(t("admin.archiveConfirm"))) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      <FormMessage state={state} />
      <SubmitButton
        pendingLabel={t("admin.archivingPending")}
        variant="secondary"
        className="w-auto"
        size="sm"
      >
        {t("admin.archiveDepartment")}
      </SubmitButton>
    </form>
  );
}
