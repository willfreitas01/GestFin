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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Search, X, TrendingUp, TrendingDown } from "lucide-react";

export default function Historico() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");

  const { data: transactions, isLoading } = useListTransactions({});
  const deleteTransaction = useDeleteTransaction();

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesFilter =
      filter === "todos" ||
      (filter === "receitas" && (tx as any).type === "income") ||
      (filter === "despesas" && (tx as any).type === "expense");

    const matchesSearch = search === "" ||
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
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
    if (!confirm("Tem certeza que deseja remover este lançamento?")) return;
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

  const stats = {
    totalTransactions: transactions?.length || 0,
    totalIncome: transactions
      ?.filter((tx) => (tx as any).type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0) || 0,
    totalExpense: transactions
      ?.filter((tx) => (tx as any).type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0) || 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
          <p className="text-muted-foreground mt-1">
            Suas movimentações financeiras
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10">
              <span className="text-lg font-bold text-primary">
                {stats.totalTransactions}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de lançamentos</p>
              <p className="text-lg text-muted-foreground">
                {stats.totalTransactions === 1 ? "1 transação" : "transações"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de receitas</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-red-500/10">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de despesas</p>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(stats.totalExpense)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Lançamentos</CardTitle>
              <CardDescription>
                Filtro e busca de transações
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar lançamento..."
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
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {["todos", "receitas", "despesas"].map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === "todos"
                  ? "Todos"
                  : f === "receitas"
                    ? "Receitas"
                    : "Despesas"}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : !filteredTransactions || filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">
                {search || filter !== "todos"
                  ? "Nenhum lançamento encontrado"
                  : "Nenhum lançamento registrado"}
              </p>
              <p className="text-sm">
                {search ? "Tente ajustar sua busca" : "Comece a registrar transações"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTransactions.map((tx) => {
                const isIncome = (tx as any).type === "income";
                return (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 hover:bg-muted/20 px-2 -mx-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          isIncome
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isIncome ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{tx.description}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 ${
                              isIncome
                                ? "text-green-700 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-900/30"
                                : "text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-900/30"
                            }`}
                          >
                            {tx.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div
                        className={`font-semibold tabular-nums ${
                          isIncome
                            ? "text-green-600 dark:text-green-400"
                            : "text-foreground"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        title="Excluir lançamento"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
