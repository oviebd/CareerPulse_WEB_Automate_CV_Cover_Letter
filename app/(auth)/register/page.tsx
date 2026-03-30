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
      <div className="hidden flex-col justify-between bg-[var(--color-secondary)] p-10 text-white lg:flex">
        <div>
          <p className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold">
            CV &amp; Cover Letter
          </p>
          <p className="mt-4 max-w-sm text-sm text-slate-300">
            Join thousands of job seekers who tailor applications faster with AI.
          </p>
        </div>
        <p className="text-xs text-slate-400">Your data stays private and secure.</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <RegisterForm returnTo={returnTo} />
      </div>
    </div>
  );
}
