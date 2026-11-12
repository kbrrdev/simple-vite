import { useState } from 'react';
import { MenuIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { env } from '@/config/env';
import { useLogout, useSession, type Permission } from '@/lib/auth';

// Each feature adds its link here when its screens are built, with the permission its route needs.
const links: { to: string; label: string; permission?: Permission }[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/orders', label: 'Orders', permission: 'orders.view' },
  { to: '/products', label: 'Products', permission: 'products.view' },
  { to: '/categories', label: 'Categories', permission: 'categories.manage' },
  { to: '/payment-methods', label: 'Payment methods', permission: 'payment_methods.manage' },
  { to: '/blogs', label: 'Blog', permission: 'blogs.manage' },
  { to: '/files', label: 'Files', permission: 'assets.manage' },
  { to: '/audit-log', label: 'Audit log', permission: 'audit_logs.view' },
];

/** The nav links, the signed-in email, and Log out. The sidebar and the phone menu share them. */
function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useSession();
  const logout = useLogout();
  // Links the role cannot use are left out. Their pages would only say so.
  const shown = links.filter(
    (link) => !link.permission || user?.permissions.includes(link.permission),
  );

  return (
    <>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {shown.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-11 items-center rounded-md px-2 text-sm md:min-h-8 ${isActive ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-2 px-2">
        <div className="text-sm">
          <p className="truncate text-muted-foreground">{user?.email}</p>
          {user?.role && <p className="truncate text-muted-foreground">{user.role.name}</p>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          Log out
        </Button>
      </div>
    </>
  );
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-sidebar px-2 py-1 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon />
        </Button>
        <p className="truncate font-semibold">{env.storeName}</p>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="bg-sidebar p-4">
          <SheetTitle className="mb-4 px-2 font-semibold">{env.storeName}</SheetTitle>
          <SheetDescription className="sr-only">Pages and account</SheetDescription>
          <NavContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <p className="mb-6 px-2 font-semibold">{env.storeName}</p>
        <NavContent />
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
