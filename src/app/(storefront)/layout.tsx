import { Suspense } from "react";

import { BottomNav } from "@/components/storefront/bottom-nav";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import {
  BottomNavSkeleton,
  SiteFooterSkeleton,
  SiteHeaderSkeleton,
} from "@/components/storefront/skeletons";
import { SkipLink } from "@/components/storefront/skip-link";
import { ToasterProvider } from "@/components/ui/toaster";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <ToasterProvider>
      <SkipLink />
      <div className="flex min-h-dvh flex-col">
        <Suspense fallback={<SiteHeaderSkeleton />}>
          <SiteHeader />
        </Suspense>
        <main id="main" className="bottom-nav-clearance flex-1">
          {children}
        </main>
        <Suspense fallback={<SiteFooterSkeleton />}>
          <SiteFooter />
        </Suspense>
        <Suspense fallback={<BottomNavSkeleton />}>
          <BottomNav />
        </Suspense>
      </div>
    </ToasterProvider>
  );
}
