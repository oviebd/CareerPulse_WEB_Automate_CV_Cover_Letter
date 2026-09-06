import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ profileId: string }>;
};

export default async function InterviewLobbyRedirect({ params }: Props) {
  const { profileId } = await params;
  redirect(`/interview/${profileId}?tab=mock`);
}
