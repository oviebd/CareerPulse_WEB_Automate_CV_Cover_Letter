import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ profileId: string }>;
};

export default async function InterviewPrepareRedirect({ params }: Props) {
  const { profileId } = await params;
  redirect(`/interview/${profileId}?tab=topics`);
}
