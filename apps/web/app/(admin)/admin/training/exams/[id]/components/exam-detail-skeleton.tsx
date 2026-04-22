import { Skeleton } from '@repo/ui/components/ui/skeleton';

export default function ExamDetailSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8 animate-pulse">
      <div className="h-10 w-40 bg-muted rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center h-10 px-2">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
          <Skeleton className="h-60 w-full rounded-3xl" />
          <Skeleton className="h-60 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
