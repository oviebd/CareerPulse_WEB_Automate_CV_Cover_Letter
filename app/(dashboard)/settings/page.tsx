import Link from 'next/link';

export default function SettingsIndexPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <ul className="space-y-2 text-sm">
        <li>
          <Link href="/settings/account" className="text-[var(--color-primary)] hover:underline">
            Account
          </Link>
        </li>
        <li>
          <Link href="/settings/billing" className="text-[var(--color-primary)] hover:underline">
            Billing
          </Link>
        </li>
      </ul>
    </div>
  );
}
