import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTransactions,
  useDeleteTransaction,
  getListTransactionsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetWeeklyChartQueryKey,
  getGetByCategoryChartQueryKey,
  getGetRecentTransactionsQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, FileSearch } from "lucide-react";

export default function Historico() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("todos");

  const { data: transactions, isLoading } = useListTransactions({});
  const deleteTransaction = useDeleteTransaction();

  const filteredTransactions = transactions?.filter((tx) => {
    if (filter === "todos") return true;
    if (filter === "receitas") return (tx as any).type === "income";
    if (filter === "despesas") return (tx as any).type === "expense";
    return tx.category === filter;
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

  const filters = [
    { value: "todos", label: "Todos" },
    { value: "receitas", label: "Receitas" },
    { value: "despesas", label: "Despesas" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground mt-1">
          Todas as suas movimentações financeiras
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
            className="rounded-full"
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <div className="space-y-4 p-4 sm:p-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : filteredTransactions && filteredTransactions.length > 0 ? (
            <div className="divide-y">
              {filteredTransactions.map((tx) => {
                const isIncome = (tx as any).type === "income";
                return (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex flex-col items-center justify-center w-12 h-12 rounded-full bg-muted/50 border">
                        <span className="text-xs font-medium">
                          {tx.date.split("-")[2]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {tx.date.split("-")[1]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{tx.description}</span>
                          <span className="sm:hidden text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs font-normal px-2 py-0.5 ${isIncome ? "text-green-700 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-900/30" : "text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-900/30"}`}
                        >
                          {tx.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <div
                        className={`font-semibold ${isIncome ? "text-green-600 dark:text-green-400" : "text-foreground"}`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        onClick={() => handleDelete(tx.id)}
                        disabled={deleteTransaction.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">
                Nenhum lançamento encontrado
              </p>
              <p className="text-sm">
                Não há transações para os filtros selecionados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
