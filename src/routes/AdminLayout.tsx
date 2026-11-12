import { useId, useState } from 'react';
import { MenuIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { env } from '@/config/env';
import { useLogout, useSession, type Permission } from '@/lib/auth';

interface NavItem {
  to: string;
  label: string;
  /** The permission the page's route needs. */
  permission?: Permission;
  /** Admin can hold every permission too, so team pages check the super admin flag. */
  superAdmin?: true;
}

/**
 * The nav, in groups ordered by how often each area is used: daily work first, setup last.
 * Each feature adds its link here when its screens are built.
 */
const groups: { label?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/', label: 'Dashboard' },
      { to: '/orders', label: 'Orders', permission: 'orders.view' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/products', label: 'Products', permission: 'products.view' },
      { to: '/categories', label: 'Categories', permission: 'categories.manage' },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/blogs', label: 'Blog', permission: 'blogs.manage' },
      { to: '/files', label: 'Files', permission: 'assets.manage' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/payment-methods', label: 'Payment methods', permission: 'payment_methods.manage' },
    ],
  },
  {
    label: 'Team',
    items: [
      { to: '/people', label: 'People', superAdmin: true },
      { to: '/roles', label: 'Roles', superAdmin: true },
      { to: '/audit-log', label: 'Audit log', permission: 'audit_logs.view' },
    ],
  },
];

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-11 items-center rounded-md px-2 text-sm md:min-h-8 ${isActive ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-foreground hover:bg-sidebar-accent/50'}`
      }
    >
      {item.label}
    </NavLink>
  );
}

/** The nav links, the signed-in email, and Log out. The sidebar and the phone menu share them. */
function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useSession();
  const logout = useLogout();
  // The sidebar and the phone menu both render this, so their heading ids must differ.
  const idPrefix = useId();
  // Links the role cannot use are left out, as their pages would only say so. A group with
  // none left is left out with its heading.
  const shown = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.permission || user?.permissions.includes(item.permission)) &&
          (!item.superAdmin || user?.superAdmin),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <nav aria-label="Main" className="flex flex-col gap-4">
        {shown.map((group) => {
          const links = group.items.map((item) => (
            <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
          ));
          if (!group.label) {
            return (
              <div key="main" className="flex flex-col gap-1">
                {links}
              </div>
            );
          }

          const headingId = `${idPrefix}-${group.label}`;
          return (
            <div
              key={group.label}
              role="group"
              aria-labelledby={headingId}
              className="flex flex-col gap-1"
            >
              {/* Small caps in grey, so that headings read as labels and the dark links as places to go. */}
              <p
                id={headingId}
                className="px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
              >
                {group.label}
              </p>
              {links}
            </div>
          );
        })}
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
  // True while the next screen's code downloads. The current page stays up meanwhile.
  const loading = useNavigation().state === 'loading';

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

      {/* Window height and sticky, so that Log out stays in view on long pages. */}
      <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col self-start overflow-y-auto border-r bg-sidebar p-4 md:flex">
        <p className="mb-6 px-2 font-semibold">{env.storeName}</p>
        <NavContent />
      </aside>

      <main aria-busy={loading} className="relative min-w-0 flex-1 p-4 md:p-8">
        {loading && (
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-primary motion-reduce:animate-none"
          />
        )}
        <Outlet />
      </main>
    </div>
  );
}
