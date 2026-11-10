"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/client";

export interface DepartmentMenuProps {
  categories: readonly {
    slug: string;
    name: string;
    productCount: number;
    images?: readonly { src: string; alt: string; width?: number; height?: number }[];
  }[];
}

export function DepartmentMenu({ categories }: DepartmentMenuProps) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-3 font-normal">
          {t("nav.departments")}
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("nav.browseByDepartment")}</DropdownMenuLabel>
        {categories.map((category) => {
          const thumb = category.images?.[0];

          return (
            <DropdownMenuItem key={category.slug} asChild>
              <Link
                href={`/categories/${category.slug}`}
                className="flex w-full items-center gap-3 py-2"
              >
                {thumb ? (
                  <Image
                    src={thumb.src}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-muted text-muted-foreground">
                    {category.name.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{category.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {category.productCount}{" "}
                    {category.productCount === 1 ? t("nav.object") : t("nav.objects")}
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/products" className="w-full justify-between">
            {t("footer.allObjects")} <span aria-hidden="true">→</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
