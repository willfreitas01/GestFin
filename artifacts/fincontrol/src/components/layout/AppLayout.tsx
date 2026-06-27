import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  FileText,
  LogOut,
  Menu,
  Package,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const {
    data: user,
    isLoading,
    isError,
  } = useGetMe({ query: { retry: false } });
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && isError) setLocation("/login");
  }, [isError, isLoading, setLocation]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/registrar", label: "Registrar", icon: PlusCircle },
    { href: "/estoque", label: "Estoque", icon: Package },
    { href: "/funcionarios", label: "Funcionários", icon: Users },
    { href: "/historico", label: "Histórico", icon: List },
    { href: "/relatorio", label: "Relatório", icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando...
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => setLocation("/login") });
  };

  const NavLinks = () => (
    <>
      <div className="flex flex-col space-y-2 mt-4 px-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              onClick={() => setOpen(false)}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <span className="text-xl font-bold text-primary tracking-tight">
            FinControl
          </span>
        </div>
        <NavLinks />
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden h-16 flex items-center justify-between px-4 border-b bg-card">
          <span className="text-xl font-bold text-primary tracking-tight">
            FinControl
          </span>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 p-0 flex flex-col bg-sidebar border-r-0"
            >
              <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
                <span className="text-xl font-bold text-primary tracking-tight">
                  FinControl
                </span>
              </div>
              <NavLinks />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
