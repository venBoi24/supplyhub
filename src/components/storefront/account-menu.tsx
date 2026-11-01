import { Suspense } from "react";

import { getSessionActor } from "@/server/auth/session";

import { AccountMenuView } from "./account-menu-view";

async function AccountMenuContent() {
  const actor = await getSessionActor();
  return <AccountMenuView actor={actor} />;
}

export function AccountMenu() {
  return (
    <Suspense
      fallback={
        <span
          aria-hidden="true"
          className="block size-11 animate-pulse rounded-md bg-surface-muted"
        />
      }
    >
      <AccountMenuContent />
    </Suspense>
  );
}
