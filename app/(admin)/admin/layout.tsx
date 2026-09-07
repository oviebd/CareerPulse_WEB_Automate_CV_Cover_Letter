import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) {
    redirect('/dashboard');
  }

  return <AdminShell>{children}</AdminShell>;
}
