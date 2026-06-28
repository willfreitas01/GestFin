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
import { useToast } from "@/hooks/use-toast";
import { Truck, Plus, Trash2, Pencil, Phone, Mail } from "lucide-react";

type Supplier = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  category?: string;
  notes?: string;
  createdAt: string;
};

const supplierSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().optional(),
  email: z.string().optional(),
  cnpj: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch("/api/suppliers", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao buscar fornecedores");
  return res.json();
}

async function createSupplier(
  data: z.infer<typeof supplierSchema>,
): Promise<Supplier> {
  const res = await fetch("/api/suppliers", {
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

async function updateSupplier(
  id: number,
  data: Partial<z.infer<typeof supplierSchema>>,
): Promise<Supplier> {
  const res = await fetch(`/api/suppliers/${id}`, {
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

async function deleteSupplier(id: number): Promise<void> {
  const res = await fetch(`/api/suppliers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao excluir fornecedor");
}

export default function Fornecedores() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor cadastrado com sucesso." });
      setShowNew(false);
      newForm.reset();
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor atualizado." });
      setEditSupplier(null);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor removido." });
    },
  });

  const newForm = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      cnpj: "",
      category: "",
      notes: "",
    },
  });

  const editForm = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
  });

  const openEdit = (s: Supplier) => {
    setEditSupplier(s);
    editForm.reset({
      name: s.name,
      phone: s.phone ?? "",
      email: s.email ?? "",
      cnpj: s.cnpj ?? "",
      category: s.category ?? "",
      notes: s.notes ?? "",
    });
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.cnpj?.includes(search),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus fornecedores
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo fornecedor
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold mt-1">{suppliers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Com CNPJ</p>
            <p className="text-2xl font-bold mt-1">
              {suppliers.filter((s) => s.cnpj).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Com contato</p>
            <p className="text-2xl font-bold mt-1">
              {suppliers.filter((s) => s.phone || s.email).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de fornecedores</CardTitle>
          <CardDescription>
            <Input
              placeholder="Buscar por nome, telefone ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2 max-w-sm"
            />
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">
                {search
                  ? "Nenhum fornecedor encontrado"
                  : "Nenhum fornecedor cadastrado"}
              </p>
              <p className="text-sm">
                Clique em "Novo fornecedor" para começar.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                      <Truck className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {s.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {s.phone}
                          </span>
                        )}
                        {s.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {s.email}
                          </span>
                        )}
                        {s.cnpj && (
                          <span className="text-xs text-muted-foreground">
                            CNPJ: {s.cnpj}
                          </span>
                        )}
                        {s.category && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                            {s.category}
                          </span>
                        )}
                      </div>
                      {s.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {s.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remover ${s.name}?`))
                          deleteMutation.mutate(s.id);
                      }}
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

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo fornecedor</DialogTitle>
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
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Distribuidora ABC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={newForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 00000-0000" {...field} />
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
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={newForm.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Eletrônicos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={newForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input placeholder="Anotações..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNew(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSupplier} onOpenChange={() => setEditSupplier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar — {editSupplier?.name}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((d) => {
                if (!editSupplier) return;
                updateMutation.mutate({ id: editSupplier.id, data: d });
              })}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditSupplier(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
