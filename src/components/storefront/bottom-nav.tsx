import { getCartItemCount } from "@/features/cart/service";
import { getServerI18n } from "@/i18n/server";
import { getSessionActor } from "@/server/auth/session";

import { BottomNavView } from "./bottom-nav-view";

export async function BottomNav() {
  const [cartCount, actor, { t }] = await Promise.all([
    getCartItemCount(),
    getSessionActor(),
    getServerI18n(),
  ]);

  return (
    <BottomNavView
      cartCount={cartCount}
      accountHref={actor ? "/account" : "/sign-in"}
      accountLabel={actor ? t("bottomNav.account") : t("bottomNav.signIn")}
    />
  );
}
