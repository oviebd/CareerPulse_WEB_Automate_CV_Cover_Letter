'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/useAuthStore';

function resolveBuildCvHref(
  builderPath: string,
  initialized: boolean,
  isLoggedIn: boolean
): string {
  if (initialized && !isLoggedIn) {
    return `/login?returnTo=${encodeURIComponent(builderPath)}`;
  }
  return builderPath;
}

type BuildCvLinkProps = {
  builderPath?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

/** Routes guests to login; logged-in users go to the CV builder. */
export function BuildCvLink({
  builderPath = '/cv/builder',
  className,
  children,
  onClick,
}: BuildCvLinkProps) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const href = resolveBuildCvHref(builderPath, initialized, Boolean(user));

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function useBuildCvHref(builderPath = '/cv/builder'): string {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  return resolveBuildCvHref(builderPath, initialized, Boolean(user));
}
