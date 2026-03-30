import dynamic from 'next/dynamic';

const GenerateCoverLetterForm = dynamic(
  () =>
    import('@/components/cover-letter/GenerateCoverLetterForm').then(
      (m) => m.GenerateCoverLetterForm
    ),
  {
    loading: () => (
      <div className="grid gap-8 lg:grid-cols-2 animate-pulse">
        <div className="space-y-4">
          <div className="h-48 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
        </div>
        <div className="h-96 rounded-xl border border-[var(--color-border)] bg-slate-50" />
      </div>
    ),
  }
);

export default function NewCoverLetterPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold">New cover letter</h1>
      <GenerateCoverLetterForm />
    </div>
  );
}
