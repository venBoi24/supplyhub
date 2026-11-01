"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { archiveCategoryAction } from "@/features/catalog/admin-actions";
import { initialFormState } from "@/features/identity/form-state";

export function CategoryArchiveAction({
  categoryId,
  publishedCount,
}: {
  categoryId: string;
  publishedCount: number;
}) {
  const [state, action] = useActionState(archiveCategoryAction, initialFormState);

  if (publishedCount > 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        This department holds {publishedCount} published{" "}
        {publishedCount === 1 ? "object" : "objects"}. Move them to another department before
        archiving.
      </p>
    );
  }

  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(event) => {
        if (!window.confirm("Archive this department? It will disappear from the storefront.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="categoryId" value={categoryId} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Archiving…" variant="secondary" className="w-auto" size="sm">
        Archive department
      </SubmitButton>
    </form>
  );
}
