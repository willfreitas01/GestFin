import { useState, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  X,
  MessageCircle,
  Store,
  Check,
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
  price?: number | null;
  dueDate?: string | null;
  equipment?: string | null;
  reportedIssue?: string | null;
  diagnosis?: string | null;
  technicianName?: string | null;
  createdAt: string;
};

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  pending: {
    label: "Aguardando",
    badge: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400",
  },
  in_progress: {
    label: "Em andamento",
    badge: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400",
  },
  done: {
    label: "Pronto",
    badge: "bg-green-500/10 text-green-700 border-green-300 dark:text-green-400",
  },
  delivered: {
    label: "Entregue",
    badge: "bg-gray-500/10 text-gray-700 border-gray-300 dark:text-gray-400",
  },
};

const BUSINESS_NAME_KEY = "fincontrol_business_name";

function getBusinessName(): string {
  if (typeof window === "undefined") return "FinControl";
  return localStorage.getItem(BUSINESS_NAME_KEY) || "FinControl";
}

function setBusinessName(name: string) {
  localStorage.setItem(BUSINESS_NAME_KEY, name);
}

const clientSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  service: z.string().optional(),
  servicePrice: z.string().optional(),
  serviceDueDate: z.string().optional(),
});

const orderSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  notes: z.string().optional(),
  price: z.string().optional(),
  dueDate: z.string().optional(),
  equipment: z.string().optional(),
  reportedIssue: z.string().optional(),
  diagnosis: z.string().optional(),
  technicianName: z.string().optional(),
});

// ── API ──────────────────────────────────────────────
async function fetchClients(): Promise<Client[]> {
  const res = await fetch("/api/clients", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao buscar clientes");
  return res.json();
}

async function createClient(data: z.infer<typeof clientSchema>): Promise<Client> {
  const { service, servicePrice, serviceDueDate, ...clientData } = data;
  const res = await fetch("/api/clients", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clientData),
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

async function createOrder(clientId: number, data: any): Promise<Order> {
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

async function updateOrderStatus(orderId: number, status: string): Promise<Order> {
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

function exportServiceOrder(client: Client, order: Order, businessName: string) {
  const html = `
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ordem de Serviço #${order.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; position: relative; }
        h1 { color: #2d6a4f; font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
        .section-title { font-size: 13px; font-weight: bold; color: #2d6a4f; text-transform: uppercase; margin: 24px 0 8px; border-bottom: 1px solid #d8f3dc; padding-bottom: 4px; }
        .label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
        .value { font-size: 14px; color: #1a1a1a; margin-bottom: 12px; white-space: pre-wrap; }
        .row { display: flex; gap: 40px; }
        .row > div { flex: 1; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #d8f3dc; color: #1b4332; }
        .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        .price { font-size: 22px; font-weight: bold; color: #2d6a4f; }
        .signatures { display: flex; gap: 40px; margin-top: 64px; }
        .sig-box { flex: 1; text-align: center; }
        .sig-line { border-top: 1px solid #333; margin-top: 48px; padding-top: 6px; font-size: 12px; color: #555; }
        .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
        .os-number { position: absolute; top: 40px; right: 40px; text-align: right; }
      </style>
    </head>
    <body>
      <div class="os-number">
        <div class="label">Ordem de Serviço</div>
        <div style="font-size:20px; font-weight:bold;">#${String(order.id).padStart(5, "0")}</div>
      </div>
      <h1>${businessName}</h1>
      <div class="subtitle">Ordem de Serviço</div>

      <div class="section-title">Cliente</div>
      <div class="row">
        <div>
          <div class="label">Nome</div>
          <div class="value">${client.name}</div>
        </div>
        ${client.phone ? `<div><div class="label">Telefone</div><div class="value">${client.phone}</div></div>` : ""}
      </div>
      <div class="row">
        ${client.email ? `<div><div class="label">E-mail</div><div class="value">${client.email}</div></div>` : ""}
        ${client.address ? `<div><div class="label">Endereço</div><div class="value">${client.address}</div></div>` : ""}
      </div>

      <div class="section-title">Serviço</div>
      <div class="label">Descrição</div>
      <div class="value">${order.description}</div>
      ${order.equipment ? `<div class="label">Equipamento</div><div class="value">${order.equipment}</div>` : ""}
      ${order.reportedIssue ? `<div class="label">Defeito relatado pelo cliente</div><div class="value">${order.reportedIssue}</div>` : ""}
      ${order.diagnosis ? `<div class="label">Diagnóstico técnico</div><div class="value">${order.diagnosis}</div>` : ""}

      <div class="section-title">Status e valores</div>
      <div class="row">
        <div>
          <div class="label">Status</div>
          <div class="badge">${STATUS_LABELS[order.status]?.label ?? order.status}</div>
        </div>
        ${order.dueDate ? `<div><div class="label">Prazo de entrega</div><div class="value">${new Date(order.dueDate).toLocaleDateString("pt-BR")}</div></div>` : ""}
        ${order.price ? `<div><div class="label">Valor</div><div class="price">R$ ${order.price.toFixed(2)}</div></div>` : ""}
      </div>
      ${order.technicianName ? `<div class="label">Técnico responsável</div><div class="value">${order.technicianName}</div>` : ""}
      ${order.notes ? `<div class="label">Observações</div><div class="value">${order.notes}</div>` : ""}

      <div class="divider"></div>
      <div class="label">Data de abertura</div>
      <div class="value">${new Date(order.createdAt).toLocaleDateString("pt-BR")}</div>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line">Assinatura do cliente</div>
        </div>
        <div class="sig-box">
          <div class="sig-line">Assinatura do técnico responsável</div>
        </div>
      </div>

      <div class="footer">Gerado por ${businessName}</div>
    </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

// ── Pedidos por cliente ──────────────────────────────
function ClientOrders({
  client,
  businessName,
}: {
  client: Client;
  businessName: string;
}) {
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
      toast({ title: "Ordem de serviço criada com sucesso!" });
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
    defaultValues: {
      description: "",
      notes: "",
      price: "",
      dueDate: "",
      equipment: "",
      reportedIssue: "",
      diagnosis: "",
      technicianName: "",
    },
  });

  const STATUS_FLOW = ["pending", "in_progress", "done", "delivered"];

  return (
    <div className="mt-6 space-y-4 pt-4 border-t">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNew(!showNew)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova ordem de serviço
        </Button>
      </div>

      {showNew && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => createMutation.mutate(d))}
            className="space-y-5 bg-muted/30 rounded-lg p-5 border"
          >
            {/* Seção: Serviço */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Serviço
              </p>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Descrição do serviço *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Troca de tela"
                        {...field}
                        className="h-9 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="equipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Equipamento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: iPhone 15 Pro"
                        {...field}
                        className="h-9 text-sm"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Seção: Diagnóstico */}
            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3">
                Diagnóstico
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="reportedIssue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Defeito relatado</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="O que o cliente relatou"
                          {...field}
                          className="h-9 text-sm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Diagnóstico técnico</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="O que foi identificado"
                          {...field}
                          className="h-9 text-sm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="technicianName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Técnico responsável</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do técnico"
                        {...field}
                        className="h-9 text-sm"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Seção: Valores e prazo */}
            <div className="space-y-3 pt-1 border-t">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3">
                Valores e prazo
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          className="h-9 text-sm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Prazo de entrega</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-9 text-sm" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNew(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Criar ordem de serviço"}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {orders.length === 0 && !showNew && (
        <p className="text-xs text-muted-foreground italic py-2">
          Nenhum pedido ainda
        </p>
      )}

      <div className="space-y-2">
        {orders.map((order) => {
          const statusInfo = STATUS_LABELS[order.status];
          const currentIdx = STATUS_FLOW.indexOf(order.status);
          const nextStatus = STATUS_FLOW[currentIdx + 1];

          return (
            <div
              key={order.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {order.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 ${statusInfo.badge}`}
                  >
                    {statusInfo.label}
                  </Badge>
                  {order.price && (
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      R$ {order.price.toFixed(2)}
                    </span>
                  )}
                  {order.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.dueDate).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 justify-end">
                {nextStatus && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() =>
                      updateMutation.mutate({ id: order.id, status: nextStatus })
                    }
                  >
                    <ChevronUp className="h-3 w-3 mr-0.5" /> Avançar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Gerar Ordem de Serviço"
                  onClick={() => exportServiceOrder(client, order, businessName)}
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
                {order.status === "done" && client.phone && (
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-green-600 hover:bg-green-700 px-2"
                    onClick={() =>
                      sendWhatsApp(client.phone!, client.name, order.description)
                    }
                  >
                    <MessageCircle className="h-3 w-3 mr-0.5" /> WhatsApp
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
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────
export default function Clientes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [businessName, setBusinessNameState] = useState(() => getBusinessName());
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [businessNameDraft, setBusinessNameDraft] = useState(businessName);

  const saveBusinessName = () => {
    const trimmed = businessNameDraft.trim() || "FinControl";
    setBusinessName(trimmed);
    setBusinessNameState(trimmed);
    setEditingBusinessName(false);
    toast({ title: "Nome da loja atualizado." });
  };

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: async (newClient, vars) => {
      if (vars.service?.trim()) {
        try {
          await createOrder(newClient.id, {
            description: vars.service.trim(),
            price: vars.servicePrice,
            dueDate: vars.serviceDueDate,
          });
          queryClient.invalidateQueries({ queryKey: ["orders", newClient.id] });
          setExpandedId(newClient.id);
        } catch {}
      }
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
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      service: "",
      servicePrice: "",
      serviceDueDate: "",
    },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus clientes e pedidos
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo cliente
        </Button>
      </div>

      {/* Nome da loja/empresa (usado na Ordem de Serviço) */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                Nome da loja/empresa
              </p>
              {editingBusinessName ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={businessNameDraft}
                    onChange={(e) => setBusinessNameDraft(e.target.value)}
                    placeholder="Ex: Assistência Silva"
                    className="h-8 text-sm max-w-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveBusinessName();
                      if (e.key === "Escape") {
                        setBusinessNameDraft(businessName);
                        setEditingBusinessName(false);
                      }
                    }}
                  />
                  <Button size="sm" className="h-8" onClick={saveBusinessName}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setBusinessNameDraft(businessName);
                      setEditingBusinessName(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-medium">{businessName}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingBusinessName(true)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de clientes</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-blue-500/10">
              <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Com telefone</p>
              <p className="text-2xl font-bold">
                {clients.filter((c) => c.phone).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-green-500/10">
              <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Com e-mail</p>
              <p className="text-2xl font-bold">
                {clients.filter((c) => c.email).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>Seus clientes e seus pedidos</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
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
                  ? "Nenhum cliente encontrado"
                  : "Nenhum cliente cadastrado"}
              </p>
              <p className="text-sm">
                {search
                  ? "Tente ajustar a busca"
                  : 'Clique em "Novo cliente" para começar.'}
              </p>
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
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {c.name
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{c.name}</p>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expandedId === c.id ? "rotate-180" : ""}`}
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Excluir"
                        onClick={() => {
                          if (confirm(`Remover ${c.name}?`))
                            deleteMutation.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {expandedId === c.id && (
                    <ClientOrders client={c} businessName={businessName} />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal novo cliente */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                      <Input
                        placeholder="Rua, número, bairro..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                <p className="text-sm font-medium">
                  Serviço inicial{" "}
                  <span className="text-muted-foreground font-normal">
                    (opcional)
                  </span>
                </p>
                <FormField
                  control={newForm.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Descrição do serviço
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Lavagem completa..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={newForm.control}
                    name="servicePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Valor (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={newForm.control}
                    name="serviceDueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">
                          Prazo de entrega
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

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
