import { redirect } from 'next/navigation';

export default async function JobCVEditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/cv/edit/${encodeURIComponent(id)}?tailored=true`);
}
