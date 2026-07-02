import {
  useGetDashboardSummary,
  useGetWeeklyChart,
  useGetByCategoryChart,
  useGetRecentTransactions,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORY_CHART_COLORS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } =
    useGetDashboardSummary();
  const { data: weeklyChart, isLoading: isLoadingWeekly } = useGetWeeklyChart();
  const { data: categoryChart, isLoading: isLoadingCategory } =
    useGetByCategoryChart();
  const { data: recentTransactions, isLoading: isLoadingRecent } =
    useGetRecentTransactions();

  const isLoading =
    isLoadingSummary || isLoadingWeekly || isLoadingCategory || isLoadingRecent;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-16 bg-muted/50 rounded-t-xl" />
              <CardContent className="h-20" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-[400px] animate-pulse bg-muted/20" />
          <Card className="h-[400px] animate-pulse bg-muted/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">
            Resumo das suas finanças neste mês
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receitas do Mês
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalIncome || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas do Mês
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalExpenses || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.balance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Economia
            </CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.savingsRate || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Receitas × Despesas</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {weeklyChart && weeklyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyChart}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) =>
                      val.split("-").reverse().slice(0, 2).join("/")
                    }
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `R$ ${val}`}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend iconType="circle" />
                  <Bar
                    dataKey="income"
                    name="Receitas"
                    fill="hsl(143 58% 40%)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Despesas"
                    fill="hsl(0 84% 60%)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Sem dados para os últimos 7 dias.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Composição Geral</CardTitle>
            <CardDescription>Distribuição por categoria no mês</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {categoryChart && categoryChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="label"
                  >
                    {categoryChart.map((entry: any, index) => (
                      <Cell
                        key={entry.category}
                        fill={
                          entry.color ||
                          CATEGORY_CHART_COLORS[entry.category] ||
                          (entry.type === "income"
                            ? "hsl(143 58% 40%)"
                            : "hsl(0 84% 60%)")
                        }
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Sem dados no mês atual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Lançamentos Recentes</CardTitle>
          <CardDescription>Suas últimas 5 movimentações</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((tx) => {
                const isIncome = (tx as any).type === "income";
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-muted">
                        <span className="text-xs font-medium">
                          {tx.date.split("-")[2]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {tx.date.split("-")[1]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm sm:text-base">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-normal px-1.5 py-0 ${isIncome ? "text-green-700 bg-green-100 border-green-200" : "text-red-700 bg-red-100 border-red-200"}`}
                          >
                            {tx.category}
