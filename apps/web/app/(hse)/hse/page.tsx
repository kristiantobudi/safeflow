import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Skeleton } from '@repo/ui/components/ui/skeleton';

export default function HSEDashboard() {
  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">HSE Verification Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and monitor safety compliance and project verifications.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Active Projects', value: '24' },
          { title: 'Valid PTWs', value: '156' },
          { title: 'Expiring HIRAC', value: '5' },
          { title: 'Safety Score', value: '98%' },
        ].map((stat, i) => (
          <Card key={i} className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Project Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-xl bg-muted/50" />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Pending Verifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {[1, 2, 3, 4].map((i) => (
               <div key={i} className="flex items-center gap-4">
                 <Skeleton className="h-10 w-10 rounded-full" />
                 <div className="space-y-1">
                   <Skeleton className="h-4 w-[150px]" />
                   <Skeleton className="h-3 w-[100px]" />
                 </div>
               </div>
             ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
