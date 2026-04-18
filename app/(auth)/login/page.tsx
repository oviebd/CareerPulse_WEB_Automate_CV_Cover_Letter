import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo =
    typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const error =
    typeof params.error === 'string' ? params.error : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-[var(--color-border)] bg-gradient-to-br from-[var(--auth-hero-from)] via-[var(--auth-hero-via)] to-[var(--auth-hero-to)] p-10 lg:flex">
        <div>
          <p className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
            CareerPulse
          </p>
          <p className="mt-4 max-w-sm text-sm text-[var(--color-muted)]">
            Upload once, generate tailored cover letters, and track applications in
            one place.
          </p>
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          Professional documents for global job seekers.
        </p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <LoginForm returnTo={returnTo} urlError={error} />
      </div>
    </div>
  );
}
