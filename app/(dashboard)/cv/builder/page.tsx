import { redirect } from 'next/navigation';

/** Alias for the core CV editor. */
export default async function CVBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string') u.set(k, v);
    if (Array.isArray(v) && v[0]) u.set(k, v[0]);
  }
  const q = u.toString();
  redirect(q ? `/cv/edit?${q}` : '/cv/edit');
}
