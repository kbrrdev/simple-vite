import { useState } from 'react';
import {
  ChevronsUpDownIcon,
  FileTextIcon,
  HouseIcon,
  InboxIcon,
  MenuIcon,
  PercentIcon,
  SettingsIcon,
  TagIcon,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigation } from 'react-router';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { env } from '@/config/env';
import { useCan, useLogout, useSession, type Permission, type User } from '@/lib/auth';
import { useOrderStatus } from '@/features/reports/api';

interface Page {
  to: string;
  label: string;
  /** The permission the page's route needs. */
  permission?: Permission;
  /** Admin can hold every permission too, so team pages check the super admin flag. */
  superAdmin?: true;
}

interface Area {
  label: string;
  icon: LucideIcon;
  /** The area's own page, such as the products list. Areas without one open their first page. */
  page?: Page;
  /** Pages shown under the area while one of its pages is open. */
  pages?: Page[];
}

/**
 * The nav, after Shopify Admin: a few areas with icons, their pages shown only while inside
 * them, and Settings at the bottom. Each feature adds its page here when its screen is built.
 */
const areas: Area[] = [
  { label: 'Home', icon: HouseIcon, page: { to: '/', label: 'Home' } },
  {
    label: 'Orders',
    icon: InboxIcon,
    page: { to: '/orders', label: 'Orders', permission: 'orders.view' },
  },
  {
    label: 'Products',
    icon: TagIcon,
    page: { to: '/products', label: 'Products', permission: 'products.view' },
    pages: [{ to: '/categories', label: 'Categories', permission: 'categories.manage' }],
  },
  {
    label: 'Content',
    icon: FileTextIcon,
    pages: [
      { to: '/blogs', label: 'Blog', permission: 'blogs.manage' },
      { to: '/banners', label: 'Banners', permission: 'banners.manage' },
      { to: '/files', label: 'Files', permission: 'assets.manage' },
    ],
  },
  {
    label: 'Discounts',
    icon: PercentIcon,
    page: { to: '/discounts', label: 'Discounts', permission: 'promotions.manage' },
  },
];

const settings: Area = {
  label: 'Settings',
  icon: SettingsIcon,
  pages: [
    { to: '/payment-methods', label: 'Payment methods', permission: 'payment_methods.manage' },
    { to: '/people', label: 'People', superAdmin: true },
    { to: '/roles', label: 'Roles', superAdmin: true },
    { to: '/audit-log', label: 'Audit log', permission: 'audit_logs.view' },
  ],
};

function allowed(page: Page, user?: User | null) {
  return (
    (!page.permission || Boolean(user?.permissions.includes(page.permission))) &&
    (!page.superAdmin || Boolean(user?.superAdmin))
  );
}

/** Whether a path is a page or one of its own pages, such as /orders/123 under /orders. */
function inside(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

const rowClass =
  'flex min-h-11 items-center gap-3 rounded-md px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring md:min-h-9';

/** The number of payments waiting to be checked, for roles that can read the order report. */
function OrdersCount() {
  const canCount = useCan('reports.operations');
  const report = useOrderStatus(canCount);
  // A count is a nicety, so a report that is late or shaped differently shows none.
  const count = report.data?.data?.needsAttention?.paymentsToConfirm ?? 0;
  if (count === 0) return null;

  return (
    <>
      {/* Keeps the count apart from the label when read aloud. */}{' '}
      <Badge variant="warning" className="ml-auto tabular-nums">
        {count} <span className="sr-only">{count === 1 ? 'payment' : 'payments'} to check</span>
      </Badge>
    </>
  );
}

function AreaLinks({ area, onNavigate }: { area: Area; onNavigate?: () => void }) {
  const { data: user } = useSession();
  const { pathname } = useLocation();
  const page = area.page && allowed(area.page, user) ? area.page : undefined;
  const pages = (area.pages ?? []).filter((item) => allowed(item, user));
  // An area with nothing the role can use is left out.
  const target = page ?? pages[0];
  if (!target) return null;

  const open = [area.page, ...(area.pages ?? [])].some((item) => item && inside(pathname, item.to));
  const Icon = area.icon;

  return (
    <li>
      <NavLink
        to={target.to}
        end={target.to === '/'}
        onClick={onNavigate}
        className={cn(
          rowClass,
          open
            ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
            : 'text-foreground hover:bg-sidebar-accent/50',
        )}
      >
        <Icon aria-hidden className="size-5 shrink-0" strokeWidth={open ? 2.25 : 1.75} />
        {area.label}
        {area.label === 'Orders' && <OrdersCount />}
      </NavLink>

      {/* Its pages show only while inside the area, so the nav stays short. */}
      {open && pages.length > 0 && (
        <ul className="mt-1 space-y-1">
          {pages.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    rowClass,
                    'pl-10',
                    isActive || inside(pathname, item.to)
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Initials for the account button, from the email's name. */
function initials(email = '') {
  return email.slice(0, 2).toUpperCase();
}

/** Who is signed in, with Log out in a menu so that a stray tap cannot sign them out. */
function AccountMenu() {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(rowClass, 'w-full text-left hover:bg-sidebar-accent/50')}
        >
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {initials(user?.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{user?.email}</span>
            {user?.role && (
              <span className="block truncate text-xs text-muted-foreground">{user.role.name}</span>
            )}
          </span>
          <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="min-w-52">
        <DropdownMenuItem
          className="min-h-11 md:min-h-8"
          disabled={logout.isPending}
          onSelect={() => logout.mutate()}
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The areas, Settings, and the account. The sidebar and the phone menu share them. */
function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav aria-label="Main" className="flex flex-1 flex-col">
        <ul className="space-y-1">
          {areas.map((area) => (
            <AreaLinks key={area.label} area={area} onNavigate={onNavigate} />
          ))}
        </ul>
        <ul className="mt-auto space-y-1 pt-6">
          <AreaLinks area={settings} onNavigate={onNavigate} />
        </ul>
      </nav>
      <div className="mt-4 border-t pt-4">
        <AccountMenu />
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
        <SheetContent side="left" className="flex flex-col bg-sidebar p-4">
          <SheetTitle className="mb-4 px-2 font-semibold">{env.storeName}</SheetTitle>
          <SheetDescription className="sr-only">Pages and account</SheetDescription>
          <NavContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Window height and sticky, so that Settings and the account stay in view on long pages. */}
      <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col self-start overflow-y-auto border-r bg-sidebar p-4 md:flex">
        <Link to="/" className="mb-6 px-2 font-semibold">
          {env.storeName}
        </Link>
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
