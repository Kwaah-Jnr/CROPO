export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}
