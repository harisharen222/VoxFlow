// Skeleton.jsx — Shimmer loading placeholder
export default function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-100 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-6 flex flex-col gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16 mt-1" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function SkeletonLine({ width = "100%" }) {
  return <Skeleton className={`h-3`} style={{ width }} />;
}
