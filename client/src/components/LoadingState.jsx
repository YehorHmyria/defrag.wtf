const Skeleton = () => (
  <div className="card-dedsec flex gap-4 animate-pulse" aria-hidden="true">
    <div className="hidden sm:block w-10 h-24 bg-base-border/60" />
    <div className="flex-1 space-y-3">
      <div className="h-3 w-1/3 bg-base-border/60" />
      <div className="h-6 w-4/5 bg-base-border/60" />
      <div className="h-3 w-full bg-base-border/40" />
      <div className="h-3 w-11/12 bg-base-border/40" />
    </div>
  </div>
);

const LoadingState = ({ rows = 4 }) => (
  <div className="space-y-4" role="status" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => <Skeleton key={i} />)}
  </div>
);

export default LoadingState;
