import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { getCartItemCount } from "@/features/cart/service";
import { cn } from "@/lib/utils/cn";

export async function CartLink() {
  const count = await getCartItemCount();
  const label = count === 0 ? "Cart, empty" : `Cart, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <Link
      href="/cart"
      aria-label={label}
      className="relative grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      <span
        aria-hidden="true"
        className={cn(
          "absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[0.625rem] leading-none",
          count > 0 ? "bg-accent text-accent-foreground" : "hidden",
        )}
      >
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}
