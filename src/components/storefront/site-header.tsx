import { Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listCategorySummaries, listVendorSummaries } from "@/features/catalog/queries";

import { AnnouncementBar } from "./announcement-bar";
import { AccountMenu } from "./account-menu";
import { CartLink } from "./cart-link";
import { DepartmentMenu } from "./department-menu";
import { MobileNav } from "./mobile-nav";
import { PageShell } from "./page-shell";
import { SearchForm } from "./search-form";
import { Wordmark } from "./wordmark";

export async function SiteHeader() {
  const [categories, vendors] = await Promise.all([listCategorySummaries(), listVendorSummaries()]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <AnnouncementBar />
      <PageShell className="flex h-18 items-center gap-3 sm:gap-4">
        <MobileNav categories={categories} vendors={vendors} />

        <Link
          href="/"
          className="mr-1 inline-flex shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          <Wordmark compact className="sm:hidden" />
          <Wordmark className="hidden sm:inline-flex" />
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 lg:flex">
          <Button asChild variant="ghost" size="sm" className="px-3 font-normal">
            <Link href="/products">Shop all</Link>
          </Button>
          <DepartmentMenu categories={categories} />
          <Button asChild variant="ghost" size="sm" className="px-3 font-normal">
            <Link href="/delivery">Delivery</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="px-3 font-normal">
            <Link href="/vendors">Studios</Link>
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="hidden flex-1 justify-center md:flex">
            <SearchForm inputId="header-catalog-search" className="w-full max-w-xl" />
          </div>
          <Link
            href="/search"
            aria-label="Search the catalog"
            className="grid size-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none md:hidden"
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>
          <AccountMenu />
          <CartLink />
        </div>
      </PageShell>
    </header>
  );
}
