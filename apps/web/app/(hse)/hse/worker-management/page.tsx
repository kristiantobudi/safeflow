'use client';

import { WorkerManagementView } from '@/components/hse/worker-management-view';

export default function HseWorkerManagementPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 w-full max-w-full mx-auto overflow-hidden">
      <WorkerManagementView />
    </div>
  );
}
