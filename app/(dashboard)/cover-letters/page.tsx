import { redirect } from 'next/navigation';

/** Canonical documents hub — cover letters tab */
export default function CoverLettersListRedirectPage() {
  redirect('/documents?tab=cover-letters');
}
