import { Card } from '@repo/ui/components/ui/card';
import { Skeleton } from '@repo/ui/components/ui/skeleton';

export function ModuleDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Hero section skeleton */}
      <Card className="border-none shadow-2xl">
        <div className="p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-10">
          <Skeleton className="h-24 w-24 rounded-2xl" />
          <div className="flex flex-col gap-4 flex-1 w-full">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      </Card>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="p-6 border-none shadow-xl">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="p-8 border-none shadow-xl">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
