"use client";

import { Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DEMO_CATALOG_NOTICE } from "@/features/catalog/constants";
import { cn } from "@/lib/utils/cn";

import { SearchForm } from "./search-form";
import { Wordmark } from "./wordmark";

export interface MobileNavProps {
  categories: readonly { slug: string; name: string; productCount: number }[];
  vendors: readonly { slug: string; name: string }[];
}

const linkClassName =
  "flex items-center justify-between border-b border-border py-3.5 font-display text-lg font-medium tracking-[-0.02em] transition-colors hover:text-accent";

export function MobileNav({ categories, vendors }: MobileNavProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Browse departments, studios, and search the SupplyHub preview catalog.
        </SheetDescription>

        <SheetClose asChild>
          <Link href="/" className="inline-flex w-fit" aria-label="SupplyHub home">
            <Wordmark />
          </Link>
        </SheetClose>

        <div className="mt-7">
          <SearchForm inputId="mobile-catalog-search" />
        </div>

        <nav aria-label="Mobile navigation" className="mt-8 flex flex-col">
          <SheetClose asChild>
            <Link href="/products" className={linkClassName}>
              Shop all <span aria-hidden="true">→</span>
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/vendors" className={linkClassName}>
              Studios <span aria-hidden="true">→</span>
            </Link>
          </SheetClose>
        </nav>

        <div className="mt-8">
          <p className="eyebrow text-muted-foreground">Departments</p>
          <ul className="mt-3 space-y-1">
            {categories.map((category) => (
              <li key={category.slug}>
                <SheetClose asChild>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="flex items-baseline justify-between gap-4 rounded-md py-2 text-sm transition-colors hover:text-accent"
                  >
                    <span>{category.name}</span>
                    <span className="font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
                      {category.productCount} pieces
                    </span>
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-7">
          <p className="eyebrow text-muted-foreground">Studios</p>
          <ul className="mt-3 space-y-1">
            {vendors.map((vendor) => (
              <li key={vendor.slug}>
                <SheetClose asChild>
                  <Link
                    href={`/vendors/${vendor.slug}`}
                    className="block rounded-md py-2 text-sm transition-colors hover:text-accent"
                  >
                    {vendor.name}
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
        </div>

        <p className={cn("mt-auto pt-8 text-xs leading-5 text-muted-foreground")}>
          {DEMO_CATALOG_NOTICE}
        </p>
      </SheetContent>
    </Sheet>
  );
}
