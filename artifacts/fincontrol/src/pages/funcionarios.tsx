import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  Pencil,
  ChevronDown,
  Search,
  X,
} from "lucide-react";

type Employee = {
  id: number;
  name: string;
  email: string;
  active: boolean;
  canSellInventory: boolean;
  canRegisterSale: boolean;
  canViewReports: boolean;
  canViewHistory: boolean;
  createdAt: string;
};

const employeeSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(4, "Senha mínima de 4 caracteres"),
  canSellInventory: z.boolean().default(false),
  canRegisterSale: z.boolean().default(false),
  canViewReports: z.boolean().default(false),
  canViewHistory: z.boolean().default(false),
});

const editSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().optional(),
  canSellInventory: z.boolean(),
  canRegisterSale: z.boolean(),
  canViewReports: z.boolean(),
  canViewHistory: z.boolean(),
});

// ── API ──────────────────────────────────────────────
async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch("/api/employees", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao buscar funcionários");
  return res.json();
}

async function createEmployee(
  data: z.infer<typeof employeeSchema>,
): Promise<Employee> {
  const res = await fetch("/api/employees", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error);
  }
  return res.json();
}

async function updateEmployee(
  id: number,
  data: Partial<z.infer<typeof editSchema>>,
): Promise<Employee> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error);
  }
  return res.json();
}

async function deleteEmployee(id: number): Promise<void> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao remover funcionário");
}

const PERMISSIONS = [
  {
    key: "canSellInventory",
    label: "Dar baixa no estoque",
    description: "Permitir remover itens do estoque",
  },
  {
    key: "canRegisterSale",
    label: "Registrar vendas",
    description: "Permitir registrar vendas avulsas",
  },
  {
    key: "canViewReports",
    label: "Ver relatórios",
    description: "Acesso à aba de relatórios",
  },
  {
    key: "canViewHistory",
    label: "Ver histórico",
    description: "Acesso ao histórico de transações",
  },
] as const;

// ── Página principal ──────────────────────────────────
export default function Funcionarios() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Funcionário cadastrado com sucesso." });
      setShowNew(false);
      newForm.reset();
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Funcionário atualizado." });
      setEditEmp(null);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Funcionário removido." });
    },
  });

  const newForm = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      canSellInventory: false,
      canRegisterSale: false,
      canViewReports: false,
      canViewHistory: false,
    },
  });

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
  });

  const openEdit = (e: Employee) => {
    setEditEmp(e);
    editForm.reset({
      name: e.name,
      email: e.email,
      password: "",
      canSellInventory: e.canSellInventory,
      canRegisterSale: e.canRegisterSale,
      canViewReports: e.canViewReports,
      canViewHistory: e.canViewHistory,
    });
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = employees.filter((e) => e.active).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie permissões e acessos
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo funcionário
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de funcionários</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-blue-500/10">
              <UserX className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inativos</p>
              <p className="text-2xl font-bold">{employees.length - activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Funcionários</CardTitle>
              <CardDescription>
                Gerencie seus funcionários e permissões
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar funcionário..."
                className="pl-8 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">
                {search
                  ? "Nenhum funcionário encontrado"
                  : "Nenhum funcionário cadastrado"}
              </p>
              <p className="text-sm">
                {search
                  ? "Tente ajustar a busca"
                  : 'Clique em "Novo funcionário" para começar.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((e) => (
                <div key={e.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() =>
                        setExpandedId(expandedId === e.id ? null : e.id)
                      }
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          e.active
                            ? "bg-green-500/10"
                            : "bg-gray-500/10"
                        }`}
                      >
                        <span
                          className={`text-sm font-bold ${
                            e.active
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {e.name
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{e.name}</p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0.5 ${
                              e.active
                                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400"
                            }`}
                          >
                            {e.active ? "Ativo" : "Inativo"}
                          </Badge>
                          {expandedId === e.id && (
                            <ChevronDown className="h-4 w-4 text-muted-foreground rotate-180 ml-auto" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {e.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        onClick={() => openEdit(e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Excluir"
                        onClick={() => {
                          if (confirm(`Remover ${e.name}?`))
                            deleteMutation.mutate(e.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedId === e.id && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <p className="text-xs font-medium text-foreground mb-3">
                        Permissões:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PERMISSIONS.map((perm) => {
                          const hasPermission =
                            e[perm.key as keyof Employee];
                          return (
                            <div
                              key={perm.key}
                              className={`p-2 rounded border text-xs ${
                                hasPermission
                                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                  : "bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                    hasPermission
                                      ? "bg-green-600 border-green-600"
                                      : "border-gray-300 dark:border-gray-600"
                                  }`}
                                >
                                  {hasPermission && (
                                    <span className="text-white text-[8px]">✓</span>
                                  )}
                                </div>
                                <div>
                                  <p
                                    className={`font-medium ${
                                      hasPermission
                                        ? "text-green-700 dark:text-green-400"
                                        : "text-gray-700 dark:text-gray-400"
                                    }`}
                                  >
                                    {perm.label}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal novo funcionário */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo funcionário</DialogTitle>
          </DialogHeader>
          <Form {...newForm}>
            <form
              onSubmit={newForm.handleSubmit((d) => createMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={newForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="joao@exemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <p className="text-sm font-medium">Permissões</p>
                {PERMISSIONS.map((perm) => (
                  <div key={perm.key} className="flex items-start gap-3">
                    <FormField
                      control={newForm.control}
                      name={perm.key as keyof z.infer<typeof employeeSchema>}
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3 space-y-0 mt-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value as boolean}
                              onChange={field.onChange}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </FormControl>
                          <div>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {perm.label}
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              {perm.description}
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNew(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Criar funcionário"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal editar funcionário */}
      <Dialog open={!!editEmp} onOpenChange={() => setEditEmp(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar — {editEmp?.name}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((d) => {
                if (!editEmp) return;
                updateMutation.mutate({ id: editEmp.id, data: d });
              })}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha (deixe em branco para não alterar)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <p className="text-sm font-medium">Permissões</p>
                {PERMISSIONS.map((perm) => (
                  <div key={perm.key} className="flex items-start gap-3">
                    <FormField
                      control={editForm.control}
                      name={perm.key as keyof z.infer<typeof editSchema>}
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-3 space-y-0 mt-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value as boolean}
                              onChange={field.onChange}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </FormControl>
                          <div>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {perm.label}
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              {perm.description}
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditEmp(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
