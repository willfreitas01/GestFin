import { useState, useMemo } from "react";
import { 
  useGetMonthlyReport,
  useListAvailableMonths,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default function Relatorio() {
  const { data: availableMonths, isLoading: isLoadingMonths } = useListAvailableMonths();
  
  // Default to current month YYYY-MM if none selected
  const defaultMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  // If availableMonths loads and our selected month isn't in it, maybe we still want to query it, 
  // but let's just keep the state simple.
  const { data: report, isLoading: isLoadingReport } = useGetMonthlyReport(
    { month: selectedMonth },
    { query: { enabled: !!selectedMonth } }
  );

  const formatMonthLabel = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório Mensal</h1>
          <p className="text-muted-foreground mt-1">Análise detalhada por período</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Card key={i} className="h-28 animate-pulse bg-muted/20" />)}
          </div>
          <Card className="h-64 animate-pulse bg-muted/20" />
          <Card className="h-96 animate-pulse bg-muted/20" />
        </div>
      ) : report ? (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Receitas</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(report.totalIncome)}</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(report.totalExpenses)}</div>
              </CardContent>
            </Card>

            <Card className={`border-l-4 ${report.balance >= 0 ? 'border-l-primary' : 'border-l-red-500'}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo do Mês</CardTitle>
                <DollarSign className={`h-4 w-4 ${report.balance >= 0 ? 'text-primary' : 'text-red-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(report.balance)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Composição por Categoria</CardTitle>
              <CardDescription>Resumo dos valores de {formatMonthLabel(selectedMonth)}</CardDescription>
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
                            <Badge variant="outline" className={`font-normal ${CATEGORY_COLORS[cat.category] || ''}`}>
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

          {/* Monthly Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle>Lançamentos do Mês</CardTitle>
              <CardDescription>Todas as movimentações de {formatMonthLabel(selectedMonth)}</CardDescription>
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
                      {report.transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                          <TableCell className="font-medium">{tx.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-normal ${CATEGORY_COLORS[tx.category] || ''}`}>
                              {CATEGORY_LABELS[tx.category] || tx.category}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold whitespace-nowrap ${tx.category === 'venda' ? 'text-green-600 dark:text-green-400' : ''}`}>
                            {tx.category === 'venda' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
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
