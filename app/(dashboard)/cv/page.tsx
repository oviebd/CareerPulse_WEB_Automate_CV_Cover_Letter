import { redirect } from 'next/navigation';

/** Canonical documents hub — resumes tab */
export default function CVListRedirectPage() {
  redirect('/documents?tab=resumes');
}
