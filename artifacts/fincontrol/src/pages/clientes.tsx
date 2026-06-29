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
import { Badge } from "@/components/ui/badge";
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
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Client = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
};

type Order = {
  id: number;
  clientId: number;
  description: string;
  status: "pending" | "in_progress" | "done" | "delivered";
  notes?: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: {
    label: "Aguardando",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  in_progress: {
    label: "Em andamento",
    color: "bg-blue-100 text-blue-800 border-blue-300",
  },
  done: {
    label: "Pronto ✅",
    color: "bg-green-100 text-green-800 border-green-300",
  },
  delivered: {
    label: "Entregue",
    color: "bg-gray-100 text-gray-600 border-gray-300",
  },
};

const clientSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const orderSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  notes: z.string().optional(),
});

// ── API ──────────────────────────────────────────────
async function fetchClients(): Promise<Client[]> {
  const res = await fetch("/api/clients", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao buscar clientes");
  return res.json();
}
async function createClient(
  data: z.infer<typeof clientSchema>,
): Promise<Client> {
  const res = await fetch("/api/clients", {
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
async function updateClient(id: number, data: any): Promise<Client> {
  const res = await fetch(`/api/clients/${id}`, {
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
async function deleteClient(id: number): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao excluir cliente");
}
async function fetchOrders(clientId: number): Promise<Order[]> {
  const res = await fetch(`/api/clients/${clientId}/orders`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  return res.json();
}
async function createOrder(
  clientId: number,
  data: z.infer<typeof orderSchema>,
): Promise<Order> {
  const res = await fetch(`/api/clients/${clientId}/orders`, {
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
async function updateOrderStatus(
  orderId: number,
  status: string,
): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error);
  }
  return res.json();
}
async function deleteOrder(orderId: number): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao excluir pedido");
}

function sendWhatsApp(phone: string, clientName: string, orderDesc: string) {
  const clean = phone.replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  const msg = encodeURIComponent(
    `Olá ${clientName}! Seu pedido está pronto: *${orderDesc}*. Pode vir buscar! 😊`,
  );
  window.open(`https://wa.me/${number}?text=${msg}`, "_blank");
}

// ── Componente de pedidos por cliente ────────────────
function ClientOrders({ client }: { client: Client }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", client.id],
    queryFn: () => fetchOrders(client.id),
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof orderSchema>) =>
      createOrder(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", client.id] });
      toast({ title: "Pedido criado!" });
      setShowNew(false);
      form.reset();
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["orders", client.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", client.id] });
      toast({ title: "Pedido removido." });
    },
  });

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: { description: "", notes: "" },
  });

  const STATUS_FLOW = ["pending", "in_progress", "done", "delivered"];

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Pedidos
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowNew(!showNew)}
        >
          <Plus className="h-3 w-3 mr-1" /> Novo pedido
        </Button>
      </div>

      {showNew && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => createMutation.mutate(d))}
            className="space-y-2 bg-muted/30 rounded-lg p-3"
          >
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Descrição do pedido..."
                      {...field}
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Observações (opcional)"
                      {...field}
                      className="h-8 text-sm"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowNew(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-7 text-xs"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Salvando..." : "Criar pedido"}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {orders.length === 0 && !showNew && (
        <p className="text-xs text-muted-foreground italic">
          Nenhum pedido ainda.
        </p>
      )}

      {orders.map((order) => {
        const statusInfo = STATUS_LABELS[order.status];
        const currentIdx = STATUS_FLOW.indexOf(order.status);
        const nextStatus = STATUS_FLOW[currentIdx + 1];
        const prevStatus = STATUS_FLOW[currentIdx - 1];

        return (
          <div
            key={order.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-card"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {order.description}
              </p>
              {order.notes && (
                <p className="text-xs text-muted-foreground italic">
                  {order.notes}
                </p>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 mt-1 ${statusInfo.color}`}
              >
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {prevStatus && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Voltar status"
                  onClick={() =>
                    updateMutation.mutate({ id: order.id, status: prevStatus })
                  }
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              )}
              {nextStatus && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Avançar status"
                  onClick={() =>
                    updateMutation.mutate({ id: order.id, status: nextStatus })
                  }
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
              )}
              {order.status === "done" && client.phone && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-green-600 hover:bg-green-700"
                  onClick={() =>
                    sendWhatsApp(client.phone!, client.name, order.description)
                  }
                >
                  <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm("Remover pedido?"))
                    deleteMutation.mutate(order.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Página principal ─────────────────────────────────
export default function Clientes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente cadastrado com sucesso." });
      setShowNew(false);
      newForm.reset();
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente atualizado." });
      setEditClient(null);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente removido." });
    },
  });

  const newForm = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", phone: "", email: "", address: "", notes: "" },
  });

  const editForm = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
  });

  const openEdit = (c: Client) => {
    setEditClient(c);
    editForm.reset({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
    });
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua base de clientes e pedidos
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total de clientes</p>
            <p className="text-2xl font-bold mt-1">{clients.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Com telefone</p>
            <p className="text-2xl font-bold mt-1">
              {clients.filter((c) => c.phone).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Com e-mail</p>
            <p className="text-2xl font-bold mt-1">
              {clients.filter((c) => c.email).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de clientes</CardTitle>
          <CardDescription>
            <Input
              placeholder="Buscar por nome, telefone ou e-mail..."
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
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">
                {search
                  ? "Nenhum cliente encontrado"
                  : "Nenhum cliente cadastrado"}
              </p>
              <p className="text-sm">Clique em "Novo cliente" para começar.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className="p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() =>
                        setExpandedId(expandedId === c.id ? null : c.id)
                      }
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {c.name
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{c.name}</p>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === c.id ? "rotate-180" : ""}`}
                          />
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {c.phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {c.phone}
                            </span>
                          )}
                          {c.email && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {c.email}
                            </span>
                          )}
                          {c.address && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {c.address}
                            </span>
                          )}
                        </div>
                        {c.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {c.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="Pedidos"
                        onClick={() =>
                          setExpandedId(expandedId === c.id ? null : c.id)
                        }
                      >
                        <ClipboardList className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Remover ${c.name}?`))
                            deleteMutation.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {expandedId === c.id && <ClientOrders client={c} />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal novo cliente */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
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
              <FormField
                control={newForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, número, bairro..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Anotações sobre o cliente..."
                        {...field}
                      />
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
                  {createMutation.isPending
                    ? "Salvando..."
                    : "Cadastrar cliente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal editar cliente */}
      <Dialog open={!!editClient} onOpenChange={() => setEditClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar — {editClient?.name}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((d) => {
                if (!editClient) return;
                updateMutation.mutate({ id: editClient.id, data: d });
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
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  onClick={() => setEditClient(null)}
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
