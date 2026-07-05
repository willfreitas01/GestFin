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
import { Input } from "@/components/ui/input";
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
  Wallet,
  PiggyBank,
  Lock,
  LockOpen,
  Search,
  X,
  Download,
  FileText,
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
  const [search, setSearch] = useState("");

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

  const filteredCategories = useMemo(() => {
    if (!report?.categoryBreakdown) return [];
    return report.categoryBreakdown.filter((cat) =>
      cat.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [report?.categoryBreakdown, search]);

  const exportPDF = () => {
    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório ${formatMonthLabel(selectedMonth)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
          h1 { color: #2d6a4f; font-size: 24px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
          .section { margin-bottom: 32px; }
          .label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 15px; color: #1a1a1a; font-weight: 500; }
          .row { display: flex; gap: 40px; margin-bottom: 16px; }
          .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f0f0f0; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #2d6a4f; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .footer { margin-top: 48px; font-size: 12px; color: #999; text-align: center; }
          .income { color: #16a34a; }
          .expense { color: #dc2626; }
        </style>
      </head>
      <body>
        <h1>FinControl</h1>
        <div class="subtitle">Relatório de ${formatMonthLabel(selectedMonth)}</div>
        <hr class="divider">
        <div class="section">
          <div class="row">
            <div>
              <div class="label">Total de Receitas</div>
              <div class="value income">R$ ${report?.totalIncome?.toFixed(2) || "0,00"}</div>
            </div>
            <div>
              <div class="label">Total de Despesas</div>
              <div class="value expense">R$ ${report?.totalExpenses?.toFixed(2) || "0,00"}</div>
            </div>
            <div>
              <div class="label">Saldo</div>
              <div class="value">R$ ${((report?.totalIncome || 0) - (report?.totalExpenses || 0)).toFixed(2)}</div>
            </div>
          </div>
        </div>
        <hr class="divider">
        <div class="section">
          <h2>Composição por Categoria</h2>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Receitas</th>
                <th>Despesas</th>
              </tr>
            </thead>
            <tbody>
              ${(report?.categoryBreakdown || [])
                .map(
                  (cat) => `
                <tr>
                  <td>${cat.name}</td>
                  <td class="income">R$ ${(cat.income || 0).toFixed(2)}</td>
                  <td class="expense">R$ ${(cat.expense || 0).toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <hr class="divider">
        <div class="section">
          <div class="label">Data do Relatório</div>
          <div class="value">${new Date().toLocaleDateString("pt-BR")}</div>
        </div>
        <div class="footer">Gerado pelo FinControl</div>
      </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório</h1>
          <p className="text-muted-foreground mt-1">
            Análise mensal detalhada
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
          <Button
            variant="outline"
            size="icon"
            title="Exportar PDF"
            onClick={exportPDF}
            disabled={isLoadingReport}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoadingReport ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted/20" />
          ))}
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receitas</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(report.totalIncome || 0)}
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
                  <p className="text-sm text-muted-foreground">Despesas</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(report.totalExpenses || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(
                      (report.totalIncome || 0) - (report.totalExpenses || 0),
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-blue-500/10">
                  <PiggyBank className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Economia</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {(
                      ((report.totalIncome || 0) - (report.totalExpenses || 0)) /
                      (report.totalIncome || 1) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Composição por Categoria</CardTitle>
                  <CardDescription>
                    Receitas e despesas por categoria
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar categoria..."
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
              {filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium">
                    {search
                      ? "Nenhuma categoria encontrada"
                      : "Nenhuma categoria disponível"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Despesas</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((cat) => {
                      const balance = (cat.income || 0) - (cat.expense || 0);
                      return (
                        <TableRow key={cat.name}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(cat.income || 0)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(cat.expense || 0)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              balance >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {formatCurrency(balance)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              {report.closed ? (
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Mês fechado em {formatDate(report.closedAt || "")}</span>
                </div>
              ) : (
                <span>Mês em aberto</span>
              )}
            </div>
            {!report.closed && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LockOpen className="h-4 w-4 mr-2" /> Fechar mês
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Fechar mês?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao fechar o mês de {formatMonthLabel(selectedMonth)}, o
                      relatório será congelado e não poderá ser alterado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        closeMonthMutation.mutate({ month: selectedMonth })
                      }
                      disabled={closeMonthMutation.isPending}
                    >
                      {closeMonthMutation.isPending
                        ? "Fechando..."
                        : "Fechar mês"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
