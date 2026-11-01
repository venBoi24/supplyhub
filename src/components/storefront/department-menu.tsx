"use client";

import { ChevronDown } from "lucide-react";
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

export interface DepartmentMenuProps {
  categories: readonly { slug: string; name: string; productCount: number }[];
}

export function DepartmentMenu({ categories }: DepartmentMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-3 font-normal">
          Departments
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Browse by department</DropdownMenuLabel>
        {categories.map((category) => (
          <DropdownMenuItem key={category.slug} asChild>
            <Link href={`/categories/${category.slug}`} className="w-full justify-between gap-6">
              <span>{category.name}</span>
              <span className="font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
                {category.productCount}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/products" className="w-full justify-between">
            All objects <span aria-hidden="true">→</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
