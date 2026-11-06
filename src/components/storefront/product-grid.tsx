import type { ProductListing } from "@/features/catalog/types";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils/cn";

import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  className,
  animate = true,
  priorityCount = 0,
}: {
  products: readonly ProductListing[];
  className?: string;
  animate?: boolean;
  priorityCount?: number;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4",
        className,
      )}
    >
      {products.map((product, index) => {
        const card = (
          <ProductCard product={product} priority={index < priorityCount} className="h-full" />
        );

        if (!animate) {
          return <div key={product.slug}>{card}</div>;
        }

        return (
          <Reveal key={product.slug} delay={Math.min(index, 6) * 0.045} className="h-full">
            {card}
          </Reveal>
        );
      })}
    </div>
  );
}
