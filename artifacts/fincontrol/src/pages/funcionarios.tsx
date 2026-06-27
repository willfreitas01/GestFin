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
import { Users, Plus, Trash2, UserCheck, UserX, Pencil } from "lucide-react";

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
  canSellInventory: z.boolean(),
  canRegisterSale: z.boolean(),
  canViewReports: z.boolean(),
  canViewHistory: z.boolean(),
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

const PERMS = [
  {
    key: "canSellInventory",
    label: "Dar baixa no estoque",
    sub: "Pode dar saída de itens do estoque",
  },
  {
    key: "canRegisterSale",
    label: "Registrar venda",
    sub: "Pode registrar vendas avulsas",
  },
  {
    key: "canViewReports",
    label: "Ver relatórios",
    sub: "Acesso à tela de relatórios",
  },
  {
    key: "canViewHistory",
    label: "Ver histórico",
    sub: "Acesso ao histórico de transações",
  },
] as const;

export default function Funcionarios() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Funcionário criado com sucesso." });
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
    onError: () =>
      toast({ variant: "destructive", title: "Erro ao remover funcionário." }),
  });

  const toggleActive = (emp: Employee) => {
    updateMutation.mutate({ id: emp.id, data: { active: !emp.active } });
  };

  const newForm = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      canSellInventory: true,
      canRegisterSale: false,
      canViewReports: false,
      canViewHistory: false,
    },
  });

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
  });

  const openEdit = (emp: Employee) => {
    setEditEmp(emp);
    editForm.reset({
      name: emp.name,
      email: emp.email,
      password: "",
      canSellInventory: emp.canSellInventory,
      canRegisterSale: emp.canRegisterSale,
      canViewReports: emp.canViewReports,
      canViewHistory: emp.canViewHistory,
    });
  };

  const ativos = employees.filter((e) => e.active).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie acessos da sua equipe
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo funcionário
        </Button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-1">{employees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{ativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Inativos</p>
            <p className="text-2xl font-bold mt-1">
              {employees.length - ativos}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>
            Clique em editar para ajustar permissões ou senha
          </CardDescription>
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
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">
                Nenhum funcionário cadastrado
              </p>
              <p className="text-sm">
                Clique em "Novo funcionário" para começar.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">
                        {emp.name
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{emp.name}</p>
                        <Badge
                          variant={emp.active ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {emp.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {emp.email}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {emp.canSellInventory && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 text-green-700 border-green-300"
                          >
                            Estoque
                          </Badge>
                        )}
                        {emp.canRegisterSale && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 text-blue-700 border-blue-300"
                          >
                            Vendas
                          </Badge>
                        )}
                        {emp.canViewReports && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Relatórios
                          </Badge>
                        )}
                        {emp.canViewHistory && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            Histórico
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar"
                      onClick={() => openEdit(emp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      title={emp.active ? "Desativar" : "Ativar"}
                      onClick={() => toggleActive(emp)}
                      disabled={updateMutation.isPending}
                    >
                      {emp.active ? (
                        <UserX className="h-4 w-4 text-red-500" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remover ${emp.name}?`))
                          deleteMutation.mutate(emp.id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal novo funcionário */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
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
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Maria Oliveira" {...field} />
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
                    <FormLabel>E-mail de acesso</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="func@loja.com"
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
                    <FormLabel>Senha inicial</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Ex: func123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <p className="text-sm font-medium mb-3">Permissões de acesso</p>
                <div className="space-y-3">
                  {PERMS.map((p) => (
                    <FormField
                      key={p.key}
                      control={newForm.control}
                      name={p.key}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel className="font-medium cursor-pointer">
                              {p.label}
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              {p.sub}
                            </p>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
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
                  {createMutation.isPending
                    ? "Criando..."
                    : "Criar funcionário"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal editar funcionário */}
      <Dialog open={!!editEmp} onOpenChange={() => setEditEmp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar — {editEmp?.name}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((d) => {
                if (!editEmp) return;
                const payload: any = { ...d };
                if (!payload.password) delete payload.password;
                updateMutation.mutate({ id: editEmp.id, data: payload });
              })}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
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
                    <FormLabel>E-mail</FormLabel>
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
                    <FormLabel>
                      Nova senha{" "}
                      <span className="text-muted-foreground font-normal">
                        (deixe em branco para manter)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Nova senha..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <p className="text-sm font-medium mb-3">Permissões</p>
                <div className="space-y-3">
                  {PERMS.map((p) => (
                    <FormField
                      key={p.key}
                      control={editForm.control}
                      name={p.key}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <FormLabel className="font-medium cursor-pointer">
                              {p.label}
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              {p.sub}
                            </p>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
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
                  {updateMutation.isPending
                    ? "Salvando..."
                    : "Salvar alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
