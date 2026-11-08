import { getCartItemCount } from "@/features/cart/service";
import { getSessionActor } from "@/server/auth/session";

import { BottomNavView } from "./bottom-nav-view";

export async function BottomNav() {
  const [cartCount, actor] = await Promise.all([getCartItemCount(), getSessionActor()]);

  return (
    <BottomNavView
      cartCount={cartCount}
      accountHref={actor ? "/account" : "/sign-in"}
      accountLabel={actor ? "Account" : "Sign in"}
    />
  );
}
