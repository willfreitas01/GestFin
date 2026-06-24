import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateTransaction, 
  useDeleteTransaction, 
  useListTransactions,
  getGetDashboardSummaryQueryKey,
  getGetWeeklyChartQueryKey,
  getGetByCategoryChartQueryKey,
  getGetRecentTransactionsQueryKey,
  getListTransactionsQueryKey,
  getGetMonthlyReportQueryKey
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const transactionSchema = z.object({
  date: z.string().min(1, "A data é obrigatória"),
  category: z.enum(["venda", "material", "funcionarios", "outro"], {
    required_error: "Selecione uma categoria",
  }),
  description: z.string().min(1, "A descrição é obrigatória"),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
});

export default function Registrar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  
  // Get today's date string in YYYY-MM-DD
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const { data: transactions, isLoading } = useListTransactions({ });

  const todaysTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => t.date === today);
  }, [transactions, today]);

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: today,
      category: "venda",
      description: "",
      amount: 0,
    },
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetWeeklyChartQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetByCategoryChartQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentTransactionsQueryKey() });
    // Also invalidate any specific monthly reports
    queryClient.invalidateQueries({ queryKey: ['/api/reports/monthly'] });
  };

  function onSubmit(values: z.infer<typeof transactionSchema>) {
    createTransaction.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({
            title: "Lançamento registrado",
            description: "A transação foi adicionada com sucesso.",
          });
          form.reset({
            date: values.date, // keep the selected date
            category: "venda",
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
      }
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
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registrar Lançamento</h1>
        <p className="text-muted-foreground mt-1">Adicione novas receitas ou despesas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Column */}
        <Card>
          <CardHeader>
            <CardTitle>Novo Lançamento</CardTitle>
            <CardDescription>Preencha os detalhes da transação</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
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
                        <Input placeholder="Ex: Venda de produto X" {...field} />
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
                        <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={createTransaction.isPending}>
                  {createTransaction.isPending ? "Salvando..." : "Salvar Lançamento"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Today's Transactions Column */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Lançamentos de Hoje</CardTitle>
            <CardDescription>{formatDate(today)}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[500px]">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : todaysTransactions.length > 0 ? (
              <div className="space-y-3">
                {todaysTransactions.map((tx) => (
                  <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate mr-2">{tx.description}</span>
                        <span className={`font-semibold shrink-0 ${tx.category === 'venda' ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                          {tx.category === 'venda' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-normal px-1.5 py-0 ${CATEGORY_COLORS[tx.category] || ''}`}>
                        {CATEGORY_LABELS[tx.category] || tx.category}
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
                <p>Nenhum lançamento registrado hoje.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
