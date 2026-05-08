import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, KeyRound, Users, LockOpen, MessageSquare, UserCircle } from 'lucide-react';
import { useState } from 'react';
import NotificationBell from '@/components/layout/NotificationBell';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const location = useLocation();
  const { user, isAdmin } = useCurrentUser();
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggleTheme = () => setDark((d) => !d);

  const isTeamMember = ['detail_team', 'service_team', 'vendor'].includes(user?.role);

  const navItems = [
    ...(!isTeamMember ? [{ path: '/', label: 'Dashboard', icon: LayoutDashboard }] : []),
    ...(!isTeamMember ? [{ path: '/inventory', label: 'Inventory', icon: Car }] : []),
    { path: '/keys', label: 'Keys', icon: KeyRound },
    ...(isAdmin ? [{ path: '/lost-keys', label: 'Lost Keys', icon: LockOpen }] : []),
    ...(isAdmin ? [{ path: '/users', label: 'Users', icon: Users }] : []),
    { path: '/messages', label: 'Messages', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">KeyTrack</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={isActive ? '' : 'text-muted-foreground'}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Account">
                  <UserCircle className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-foreground truncate">{user?.display_name || user?.full_name || user?.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => setSignOutConfirm(true)}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Page content — extra bottom padding on mobile for tab bar */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-5 pb-24 md:pb-6">
        <Outlet />
      </main>

      <AlertDialog open={signOutConfirm} onOpenChange={setSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to sign out?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => base44.auth.logout()} className="bg-destructive hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-xl border-t safe-area-inset-bottom">
        <div className="flex items-stretch h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors"
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium leading-none transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}