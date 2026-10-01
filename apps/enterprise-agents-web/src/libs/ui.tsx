import {
  type ButtonHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
} from 'react';
import { ApiError } from '../services/http/api-client';

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <button
      {...props}
      type={type}
      className={`btn ${variant === 'secondary' ? 'btn-secondary' : variant === 'danger' ? 'btn-danger' : 'btn-primary'} ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border-ui bg-surface p-5 shadow-xs transition-shadow duration-150 ${className}`}
    >
      {children}
    </section>
  );
}

export const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(function Field({ label, error, id, ...props }, ref) {
  const generated_id = useId();
  const input_id = id ?? generated_id;
  const error_id = `${input_id}-error`;
  return (
    <div>
      <label
        htmlFor={input_id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <input
        {...props}
        ref={ref}
        id={input_id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? error_id : undefined}
        className="mt-1.5 block w-full rounded-lg border border-border-ui bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted transition-colors focus:border-neutral-400 dark:focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600"
      />
      {error && (
        <p
          id={error_id}
          role="alert"
          className="mt-1 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
});

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-foreground-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-foreground-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  const details = error instanceof ApiError ? error.details : [];
  const traceId = error instanceof ApiError ? error.traceId : undefined;
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300 shadow-xs"
    >
      <div className="flex items-center gap-2 font-medium">
        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
        <span>{message}</span>
      </div>
      {details.length > 1 && (
        <ul className="mt-2.5 list-disc space-y-1 pl-6 text-xs opacity-90">
          {details.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {traceId && (
        <p className="mt-2.5 font-mono text-xs opacity-70">
          Trace ID: {traceId}
        </p>
      )}
    </div>
  );
}

export function Skeleton({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden="true" className={`skeleton ${className}`} {...props} />
  );
}

export function CardSkeleton() {
  return (
    <Card className="space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </Card>
  );
}

export function TableSkeleton({
  rows = 4,
  columns,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border-ui bg-surface p-4">
      <Skeleton className="mb-3 h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) =>
        columns && columns > 1 ? (
          <div key={`row-${i}`} className="flex gap-3">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={`col-${j}`} className="h-10 flex-1" />
            ))}
          </div>
        ) : (
          <Skeleton key={`row-${i}`} className="h-10 w-full" />
        ),
      )}
    </div>
  );
}

export function PaginationBar({
  count,
  limit,
  offset,
  onOffsetChange,
}: {
  count: number;
  limit: number;
  offset: number;
  onOffsetChange: (next_offset: number) => void;
}) {
  if (count <= limit && offset === 0) return null;
  const start = count === 0 ? 0 : offset + 1;
  const end = Math.min(count, offset + limit);
  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <span className="text-foreground-muted">
        Showing {start}–{end} of {count}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={offset + limit >= count}
          onClick={() => onOffsetChange(offset + limit)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
