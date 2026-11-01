import type { FormState } from "@/features/identity/form-state";
import { cn } from "@/lib/utils/cn";

export function FormMessage({ state, className }: { state: FormState; className?: string }) {
  if (!state.message) {
    return null;
  }

  if (state.status === "success") {
    return (
      <p
        role="status"
        className={cn(
          "rounded-md border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm leading-5 text-success",
          className,
        )}
      >
        {state.message}
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p
        role="alert"
        className={cn(
          "rounded-md border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm leading-5 text-danger",
          className,
        )}
      >
        {state.message}
      </p>
    );
  }

  return null;
}
