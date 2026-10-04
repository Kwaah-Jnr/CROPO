export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-14 w-1/3 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 animate-pulse rounded-lg bg-muted" />
        <div className="h-28 animate-pulse rounded-lg bg-muted" />
        <div className="h-28 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
