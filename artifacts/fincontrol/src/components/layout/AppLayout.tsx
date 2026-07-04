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
  UserCircle,
  Truck,
  Calculator,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppLayoutProps {
  children: React.ReactNode;
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
        <Wallet className="h-4.5 w-4.5 text-primary-foreground" />
      </div>
      <span className="text-lg font-bold text-foreground tracking-tight">
        FinControl
      </span>
    </div>
  );
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
    { href: "/clientes", label: "Clientes", icon: UserCircle },
    { href: "/fornecedores", label: "Fornecedores", icon: Truck },
    { href: "/simuladores", label: "Simuladores", icon: Calculator },
    { href: "/historico", label: "Histórico", icon: List },
    { href: "/relatorio", label: "Relatório", icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground text-sm">
        Carregando...
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => setLocation("/login") });
  };

  const initials = (user.username || "?").slice(0, 2).toUpperCase();

  const NavLinks = () => (
    <>
      <nav className="flex flex-col gap-1 mt-4 px-3 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              onClick={() => setOpen(false)}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${
                  isActive
                    ? ""
                    : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate leading-tight">
              {user.username}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              Conta principal
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4 mr-2.5" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex flex-col w-64 border-r border-sidebar-border bg-sidebar">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <Brand />
        </div>
        <NavLinks />
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden h-16 flex items-center justify-between px-4 border-b bg-card shrink-0">
          <Brand />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 p-0 flex flex-col bg-sidebar border-r-0"
            >
              <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
                <Brand />
              </div>
              <NavLinks />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
