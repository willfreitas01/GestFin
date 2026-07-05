import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCreateTransaction,
  useDeleteTransaction,
  useListTransactions,
  getGetDashboardSummaryQueryKey,
  getGetWeeklyChartQueryKey,
  getGetByCategoryChartQueryKey,
  getGetRecentTransactionsQueryKey,
  getListTransactionsQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Trash2, Plus } from "lucide-react";

type Category = {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
};

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao buscar categorias");
  return res.json();
}

async function createCategory(data: {
  name: string;
  type: string;
  color: string;
}): Promise<Category> {
  const res = await fetch("/api/categories", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao criar categoria");
  return res.json();
}

async function deleteCategory(id: number): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao excluir categoria");
}

const transactionSchema = z.object({
  date: z.string().min(1, "A data é obrigatória"),
  category: z.string().min(1, "Selecione uma categoria"),
  description: z.string().min(1, "A descrição é obrigatória"),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
});

const categorySchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  type: z.enum(["income", "expense"], { required_error: "Selecione o tipo" }),
});

const COLORS = [
  "#1a5c2a",
  "#185FA5",
  "#854F0B",
  "#A32D2D",
  "#534AB7",
  "#0F6E56",
  "#993556",
];

export default function Registrar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { data: transactions, isLoading } = useListTransactions({});
  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const todaysTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((t) => t.date === today);
  }, [transactions, today]);

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { date: today, category: "", description: "", amount: 0 },
  });

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", type: "income" },
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetDashboardSummaryQueryKey(),
    });
    queryClient.invalidateQueries({ queryKey: getGetWeeklyChartQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetByCategoryChartQueryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: getGetRecentTransactionsQueryKey(),
    });
    queryClient.invalidateQueries({ queryKey: ["/api/reports/monthly"] });
  };

  function onSubmit(values: z.infer<typeof transactionSchema>) {
    createTransaction.mutate(
      { data: { ...values } },
      {
        onSuccess: () => {
          toast({
            title: "Lançamento registrado",
            description: "A transação foi adicionada com sucesso.",
          });
          form.reset({
            date: values.date,
            category: "",
            description: "",
            amount: 0,
          });
          invalidateQueries();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erro ao registrar",
            description: "Ocorreu um erro ao salvar o lançamento.",
          });
        },
      },
    );
  }

  const handleDelete = (id: number) => {
    deleteTransaction.mutate(
      { id },
      {
        onSuccess: () => {
          toast({
            title: "Lançamento excluído",
            description: "A transação foi removida com sucesso.",
          });
          invalidateQueries();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erro ao excluir",
            description: "Não foi possível remover o lançamento.",
          });
        },
      },
    );
  };

  const handleCreateCategory = async (
    values: z.infer<typeof categorySchema>,
  ) => {
    try {
      await createCategory({ ...values, color: selectedColor });
      toast({ title: "Categoria criada com sucesso." });
      refetchCategories();
      setShowCategoryModal(false);
      categoryForm.reset();
      setSelectedColor(COLORS[0]);
    } catch {
      toast({ variant: "destructive", title: "Erro ao criar categoria." });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteCategory(id);
      toast({ title: "Categoria excluída." });
      refetchCategories();
    } catch {
      toast({ variant: "destructive", title: "Erro ao excluir categoria." });
    }
  };

  const getCategoryColor = (name: string) => {
    const cat = categories.find((c) => c.name === name);
    if (!cat) return "";
    return cat.type === "income"
      ? "text-green-700 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-900/30"
      : "text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-900/30";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Transações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas transações financeiras
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Nova Transação</CardTitle>
            <CardDescription>Complete os dados da transação</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Categoria</FormLabel>
                        <button
                          type="button"
                          onClick={() => setShowCategoryModal(true)}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Gerenciar categorias
                        </button>
                      </div>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              Nenhuma categoria. Crie uma!
                            </div>
                          ) : (
                            categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: cat.color }}
                                  />
                                  {cat.name}
                                  <span className="text-xs text-muted-foreground">
                                    {cat.type === "income"
                                      ? "(Receita)"
                                      : "(Despesa)"}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Venda de produto X"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTransaction.isPending}
                >
                  {createTransaction.isPending
                    ? "Salvando..."
                    : "Salvar Transação"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Transações de Hoje</CardTitle>
            <CardDescription>{formatDate(today)}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[500px]">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted/50 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : todaysTransactions.length > 0 ? (
              <div className="space-y-3">
                {todaysTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate mr-2">
                          {tx.description}
                        </span>
                        <span className="font-semibold shrink-0">
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-normal px-1.5 py-0 ${getCategoryColor(tx.category)}`}
                      >
                        {tx.category}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0 self-end sm:self-auto"
                      onClick={() => handleDelete(tx.id)}
                      disabled={deleteTransaction.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <p>Nenhuma transação registrada hoje.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar categorias</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma categoria criada ainda.
                </p>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: cat.color }}
                      />
                      <span className="text-sm font-medium">{cat.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${cat.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      >
                        {cat.type === "income" ? "Receita" : "Despesa"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Nova categoria</p>
              <Form {...categoryForm}>
                <form
                  onSubmit={categoryForm.handleSubmit(handleCreateCategory)}
                  className="space-y-3"
                >
                  <FormField
                    control={categoryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Lavagem completa"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={categoryForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classificação</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => field.onChange("income")}
                            className={`p-2 rounded-lg border text-sm font-medium transition-colors ${field.value === "income" ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20" : "border-border text-muted-foreground"}`}
                          >
                            ↑ Receita
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange("expense")}
                            className={`p-2 rounded-lg border text-sm font-medium transition-colors ${field.value === "expense" ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20" : "border-border text-muted-foreground"}`}
                          >
                            ↓ Despesa
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <p className="text-sm font-medium mb-2">Cor</p>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className="w-6 h-6 rounded-full transition-all"
                          style={{
                            background: color,
                            outline:
                              selectedColor === color
                                ? `2px solid ${color}`
                                : "none",
                            outlineOffset: "2px",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCategoryModal(false)}
                    >
                      Fechar
                    </Button>
                    <Button type="submit">Criar categoria</Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
