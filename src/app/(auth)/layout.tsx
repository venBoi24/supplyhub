import { Suspense, type ReactNode } from "react";

import { AuthFrame } from "@/components/auth/auth-frame";
import { BottomNav } from "@/components/storefront/bottom-nav";
import { BottomNavSkeleton } from "@/components/storefront/skeletons";
import { SkipLink } from "@/components/storefront/skip-link";
import { listVendorSummaries } from "@/features/catalog/queries";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <AuthFrame
        registry={
          <Suspense fallback={<div className="h-[6.5rem]" aria-hidden="true" />}>
            <RegistryVendors />
          </Suspense>
        }
        bottomNav={
          <Suspense fallback={<BottomNavSkeleton />}>
            <BottomNav />
          </Suspense>
        }
      >
        {children}
      </AuthFrame>
    </>
  );
}

async function RegistryVendors() {
  const vendors = (await listVendorSummaries()).slice(0, 3);

  return (
    <ul className="grid gap-2.5">
      {vendors.map((vendor) => (
        <li
          key={vendor.slug}
          className="flex items-baseline justify-between gap-4 border-t border-primary-foreground/15 pt-2.5 font-mono text-[0.625rem] tracking-[0.13em] uppercase"
        >
          <span>{vendor.name}</span>
          <span className="truncate text-primary-foreground/60">{vendor.location}</span>
        </li>
      ))}
    </ul>
  );
}
