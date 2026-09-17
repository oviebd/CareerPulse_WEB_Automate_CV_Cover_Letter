import { AuthHeroPanel } from '@/components/auth/AuthHeroPanel';
import { RedirectIfAuthenticated } from '@/components/auth/RedirectIfAuthenticated';
import { RegisterForm } from './register-form';

export const dynamic = 'force-dynamic';

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
      <RedirectIfAuthenticated returnTo={returnTo} />
      <AuthHeroPanel variant="register" />
      <div className="flex items-center justify-center px-6 py-12">
        <RegisterForm returnTo={returnTo} />
      </div>
    </div>
  );
}
