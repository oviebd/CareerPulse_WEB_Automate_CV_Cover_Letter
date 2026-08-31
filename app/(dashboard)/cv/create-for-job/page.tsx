import { redirect } from 'next/navigation';

/** Unified tailor entry — legacy create-for-job path */
export default function CreateCVForJobRedirectPage() {
  redirect('/applications/new');
}
