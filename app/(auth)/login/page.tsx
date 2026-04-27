import { AuthHeroPanel } from '@/components/auth/AuthHeroPanel';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const returnTo =
    typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const preserveGuestCv = params.preserveGuestCv === 'true';
  const error =
    typeof params.error === 'string' ? params.error : undefined;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthHeroPanel variant="login" />
      <div className="flex items-center justify-center px-6 py-12">
        <LoginForm
          returnTo={returnTo}
          preserveGuestCv={preserveGuestCv}
          urlError={error}
        />
      </div>
    </div>
  );
}
