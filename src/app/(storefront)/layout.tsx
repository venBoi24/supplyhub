import { Suspense } from "react";

import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooterSkeleton, SiteHeaderSkeleton } from "@/components/storefront/skeletons";
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
        <main id="main" className="flex-1">
          {children}
        </main>
        <Suspense fallback={<SiteFooterSkeleton />}>
          <SiteFooter />
        </Suspense>
      </div>
    </ToasterProvider>
  );
}
