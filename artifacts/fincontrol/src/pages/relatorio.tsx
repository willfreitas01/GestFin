import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMonthlyReport,
  useListAvailableMonths,
  useCloseMonthlyReport,
  getGetMonthlyReportQueryKey,
} from "@workspace/api-client-react";
import type { MonthlyReport } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Lock,
  LockOpen,
} from "lucide-react";

type MonthlyReportWithClosedState = MonthlyReport & {
  closed: boolean;
  closedAt?: string;
};

export default function Relatorio() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: availableMonths, isLoading: isLoadingMonths } =
    useListAvailableMonths();

  const defaultMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  const { data: report, isLoading: isLoadingReport } =
    useGetMonthlyReport<MonthlyReportWithClosedState>(
      { month: selectedMonth },
      { query: { enabled: !!selectedMonth } },
    );

  const closeMonthMutation = useCloseMonthlyReport({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Mês fechado com sucesso",
          description: `O relatório de ${formatMonthLabel(selectedMonth)} foi congelado.`,
        });
        queryClient.invalidateQueries({
          queryKey: getGetMonthlyReportQueryKey({ month: selectedMonth }),
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Erro ao fechar o mês",
          description:
            (error as any).data?.error || "Tente novamente mais tarde.",
        });
      },
    },
  });

  const formatMonthLabel = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date
      .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatório Mensal
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada por período
          </p>
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            disabled={isLoadingMonths}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um mês" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths?.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonthLabel(m)}
                </SelectItem>
              ))}
              {!availableMonths?.includes(selectedMonth) && (
                <SelectItem value={selectedMonth}>
                  {formatMonthLabel(selectedMonth)}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoadingReport ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-28 animate-pulse bg-muted/20" />
          ))}
        </div>
      ) : report ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 rounded-lg border bg-muted/30 p-4">
            {report.closed ? (
              <div className="flex items-center gap-2 text-sm">
                <Lock className="h-4 w-4 text-primary" />
                <span>
                  Mês fechado em{" "}
                  <span className="font-medium">
                    {new Date(report.closedAt!).toLocaleDateString("pt-BR")}
                  </span>
                  . Os totais estão congelados.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LockOpen className="h-4 w-4" />
                <span>
                  Este mês ainda está aberto. Os totais refletem os lançamentos
                  atuais.
                </span>
              </div>
            )}
            {!report.closed && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={closeMonthMutation.isPending}
                  >
                    <Lock className="h-4 w-4 mr-2" /> Fechar mês
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Fechar {formatMonthLabel(selectedMonth)}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso vai congelar os totais deste mês. Essa ação não pode
                      ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        closeMonthMutation.mutate({
                          data: { month: selectedMonth },
                        })
                      }
                    >
                      Sim, fechar mês
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Receitas
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(report.totalIncome)}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Despesas
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(report.totalExpenses)}
                </div>
              </CardContent>
            </Card>
            <Card
              className={`border-l-4 ${report.balance >= 0 ? "border-l-primary" : "border-l-red-500"}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo do Mês
                </CardTitle>
                <DollarSign
                  className={`h-4 w-4 ${report.balance >= 0 ? "text-primary" : "text-red-500"}`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(report.balance)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Composição por Categoria</CardTitle>
              <CardDescription>
                Resumo dos valores de {formatMonthLabel(selectedMonth)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.byCategory.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.byCategory.map((cat) => (
                        <TableRow key={cat.category}>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {cat.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(cat.total)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {cat.percentage.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Sem dados de categorias para este mês.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lançamentos do Mês</CardTitle>
              <CardDescription>
                Todas as movimentações de {formatMonthLabel(selectedMonth)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.transactions.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.transactions.map((tx) => {
                        const isIncome = (tx as any).type === "income";
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(tx.date)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {tx.description}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`font-normal ${isIncome ? "text-green-700 bg-green-100 border-green-200" : "text-red-700 bg-red-100 border-red-200"}`}
                              >
                                {tx.category}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={`text-right font-semibold whitespace-nowrap ${isIncome ? "text-green-600 dark:text-green-400" : ""}`}
                            >
                              {isIncome ? "+" : "-"}
                              {formatCurrency(tx.amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lançamento encontrado neste mês.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
