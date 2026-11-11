import { useState } from 'react';
import { MenuIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { env } from '@/config/env';
import { useLogout, useSession } from '@/lib/auth';

// Each feature adds its link here when its screens are built.
const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/orders', label: 'Orders' },
  { to: '/products', label: 'Products' },
  { to: '/categories', label: 'Categories' },
  { to: '/payment-methods', label: 'Payment methods' },
  { to: '/files', label: 'Files' },
];

/** The nav links, the signed-in email, and Log out. The sidebar and the phone menu share them. */
function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {links.map((link) => (
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
