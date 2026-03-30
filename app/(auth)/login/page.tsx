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
      <div className="hidden flex-col justify-between bg-[var(--color-secondary)] p-10 text-white lg:flex">
        <div>
          <p className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold">
            CV &amp; Cover Letter
          </p>
          <p className="mt-4 max-w-sm text-sm text-slate-300">
            Upload once, generate tailored cover letters, and track applications in
            one place.
          </p>
        </div>
        <p className="text-xs text-slate-400">
          Professional documents for global job seekers.
        </p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <LoginForm returnTo={returnTo} urlError={error} />
      </div>
    </div>
  );
}
