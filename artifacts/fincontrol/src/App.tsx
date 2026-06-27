import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Recover from "@/pages/recover";
import Dashboard from "@/pages/dashboard";
import Registrar from "@/pages/registrar";
import Historico from "@/pages/historico";
import Relatorio from "@/pages/relatorio";
import Estoque from "@/pages/estoque";
import Funcionarios from "@/pages/funcionarios";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/recover" component={Recover} />
      <Route path="/dashboard">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route path="/registrar">
        <AppLayout>
          <Registrar />
        </AppLayout>
      </Route>
      <Route path="/historico">
        <AppLayout>
          <Historico />
        </AppLayout>
      </Route>
      <Route path="/relatorio">
        <AppLayout>
          <Relatorio />
        </AppLayout>
      </Route>
      <Route path="/estoque">
        <AppLayout>
          <Estoque />
        </AppLayout>
      </Route>
      <Route path="/funcionarios">
        <AppLayout>
          <Funcionarios />
        </AppLayout>
      </Route>
      <Route path="/">
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
