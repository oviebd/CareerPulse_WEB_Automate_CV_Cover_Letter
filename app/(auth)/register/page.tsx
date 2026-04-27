import { AuthHeroPanel } from '@/components/auth/AuthHeroPanel';
import { RegisterForm } from './register-form';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo =
    typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const preserveGuestCv = params.preserveGuestCv === 'true';

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthHeroPanel variant="register" />
      <div className="flex items-center justify-center px-6 py-12">
        <RegisterForm returnTo={returnTo} preserveGuestCv={preserveGuestCv} />
      </div>
    </div>
  );
}
