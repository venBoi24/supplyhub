import { Skeleton } from "@/components/ui/skeleton";

export function AuthFormSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-8 border-t-2 border-clay pt-6">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-4 h-9 w-64" />
        <Skeleton className="mt-4 h-4 w-full max-w-sm" />
      </div>
      <div className="space-y-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
