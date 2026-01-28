interface DashboardSkeletonProps {
  sidebarWidth: string;
}

export const DashboardSkeleton = ({ sidebarWidth }: DashboardSkeletonProps) => {
  return (
    <div className={`pt-14 lg:pt-0 ${sidebarWidth}`}>
      <main className="container max-w-6xl py-6 px-4 sm:px-6 pb-6 lg:pb-8">
        <div className="mb-6">
          <div className="h-8 w-32 rounded-md skeleton-shimmer mb-2" />
          <div className="h-4 w-48 rounded-md skeleton-shimmer" />
        </div>
        <div className="h-12 w-full rounded-md skeleton-shimmer mb-6" />
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
          <div className="h-40 rounded-lg skeleton-shimmer" />
          <div className="h-40 rounded-lg skeleton-shimmer" />
        </div>
        <div className="h-32 rounded-lg skeleton-shimmer mb-6" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </main>
    </div>
  );
};
