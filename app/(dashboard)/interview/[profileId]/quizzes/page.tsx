import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ profileId: string }>;
};

export default async function QuizHistoryRedirect({ params }: Props) {
  const { profileId } = await params;
  redirect(`/interview/${profileId}?tab=quiz`);
}
