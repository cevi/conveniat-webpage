import { cn } from '@/utils/tailwindcss-override';

/** A placeholder that pulses in the quiet grey while its content loads. */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('bg-quiet animate-pulse rounded-md', className)} {...props} />;
}

export { Skeleton };
