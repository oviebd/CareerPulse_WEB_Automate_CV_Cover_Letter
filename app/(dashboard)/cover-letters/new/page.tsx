import { GenerateCoverLetterForm } from '@/components/cover-letter/GenerateCoverLetterForm';

export default function NewCoverLetterPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold">New cover letter</h1>
      <GenerateCoverLetterForm />
    </div>
  );
}
