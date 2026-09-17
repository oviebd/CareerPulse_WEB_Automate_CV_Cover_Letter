import DashboardGroupLayout from './dashboard-group-layout';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardGroupLayout>{children}</DashboardGroupLayout>;
}
