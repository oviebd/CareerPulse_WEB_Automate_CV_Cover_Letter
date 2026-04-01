import { RegisterForm } from './register-form';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo =
    typeof params.returnTo === 'string' ? params.returnTo : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-[var(--color-border)] bg-gradient-to-br from-[#13131a] via-[#0d0d12] to-[#0a0a0f] p-10 lg:flex">
        <div>
          <p className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
            CareerPulse
          </p>
          <p className="mt-4 max-w-sm text-sm text-[var(--color-muted)]">
            Join thousands of job seekers who tailor applications faster with AI.
          </p>
        </div>
        <p className="text-xs text-[var(--color-muted)]">Your data stays private and secure.</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <RegisterForm returnTo={returnTo} />
      </div>
    </div>
  );
}
