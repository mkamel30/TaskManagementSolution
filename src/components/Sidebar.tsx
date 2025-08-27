import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, ListTodo, BarChart3, LogOut, Building, Tool } from 'lucide-react'; // Added Tool icon
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/AuthManager';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, label, isActive, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary",
      isActive && "bg-sidebar-accent text-sidebar-accent-foreground hover:text-sidebar-accent-foreground"
    )}
    dir="rtl"
  >
    <Icon className="h-4 w-4" />
    {label}
  </Link>
);

export const Sidebar: React.FC = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    if (isMobile) setIsSheetOpen(false);
  };

  const handleNavLinkClick = () => {
    if (isMobile) setIsSheetOpen(false);
  };

  // Navigation items now point to the main page, and tabs will handle internal routing
  const navigationItems = [
    { to: '/', label: 'المهام', icon: ListTodo, isActive: location.pathname === '/' },
    { to: '/reports', label: 'التقارير', icon: BarChart3, isActive: location.pathname === '/reports' },
    // The following links will now navigate to the main page and rely on tabs to show the content
    { to: '/', label: 'حصص المخابز', icon: Building, isActive: location.pathname === '/' }, // Will need to activate 'bakery-quotas' tab
    { to: '/', label: 'أدوات المخابز', icon: Tool, isActive: location.pathname === '/' }, // Will need to activate 'bakery-tools' tab
  ];

  const sidebarContent = (
    <div className="flex h-full max-h-screen flex-col gap-2 bg-sidebar-background text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
        <Logo className="h-8 w-auto" />
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to + item.label} // Added label to key for uniqueness
              to={item.to}
              icon={item.icon}
              label={item.label}
              isActive={item.isActive}
              onClick={handleNavLinkClick}
            />
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-sidebar-border">
        {session?.user?.email && (
          <div className="text-sm text-muted-foreground mb-2 text-right truncate">
            {session.user.email}
          </div>
        )}
        <Button variant="outline" onClick={handleSignOut} className="w-full flex items-center gap-2 justify-end" dir="rtl">
          <LogOut className="h-4 w-4" />
          <span>تسجيل الخروج</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 right-4 z-50">
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0 w-64">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed top-0 right-0 h-full w-64 border-l border-sidebar-border">
        {sidebarContent}
      </div>
    </>
  );
};