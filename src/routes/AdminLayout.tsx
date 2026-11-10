import { NavLink, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { useLogout, useSession } from '@/lib/auth';

// Each feature adds its link here when its screens are built.
const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/categories', label: 'Categories' },
  { to: '/files', label: 'Files' },
];

export function AdminLayout() {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar p-4">
        <p className="mb-6 px-2 font-semibold">Store Admin</p>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) =>
                `rounded-md px-2 py-1.5 text-sm ${isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2 px-2">
          <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            Log out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
