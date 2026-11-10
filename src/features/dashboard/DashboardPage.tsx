import { useSession } from '@/lib/auth';

export function DashboardPage() {
  const { data: user } = useSession();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Signed in as {user?.email}.</p>
    </div>
  );
}
