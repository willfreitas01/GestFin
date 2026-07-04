import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  useGetDashboardSummary,
  useGetWeeklyChart,
  useGetByCategoryChart,
  useGetRecentTransactions,
  useListClosedMonths,
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
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  PackageX,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  minQuantity: number;
  lowStock: boolean;
};

async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await fetch("/api/inventory", { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar estoque");
  return res.json();
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: "income" | "expense" | "balance" | "rate";
  delay: number;
}) {
  const toneStyles: Record<
    typeof tone,
    { chip: string; icon: string }
  > = {
    income: {
      chip: "bg-green-500/10",
      icon: "text-green-600 dark:text-green-400",
    },
    expense: {
      chip: "bg-red-500/10",
      icon: "text-red-600 dark:text-red-400",
    },
    balance: {
      chip: "bg-primary/10",
      icon: "text-primary",
    },
    rate: {
      chip: "bg-blue-500/10",
      icon: "text-blue-600 dark:text-blue-400",
    },
  };
  const s = toneStyles[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-5 flex items-center gap-4">
          <div
            className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${s.chip}`}
          >
            <Icon className={`h-5 w-5 ${s.icon}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
              {value}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } =
    useGetDashboardSummary();
  const { data: weeklyChart, isLoading: isLoadingWeekly } =
    useGetWeeklyChart();
  const { data: categoryChart, isLoading: isLoadingCategory } =
    useGetByCategoryChart();
  const { data: recentTransactions, isLoading: isLoadingRecent } =
    useGetRecentTransactions();
  const { data: closedMonths } = useListClosedMonths();
  const { data: inventory } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: fetchInventory,
  });

  const isLoading =
    isLoadingSummary || isLoadingWeekly || isLoadingCategory || isLoadingRecent;

  const periodLabel = useMemo(() => {
    if (!closedMonths || closedMonths.length === 0) {
      return "Resumo de todos os lançamentos";
    }
    const mostRecent = [...closedMonths].sort((a, b) =>
      b.closedAt.localeCompare(a.closedAt),
    )[0];
    const d = new Date(mostRecent.closedAt);
    return `Resumo desde o fechamento de ${d.toLocaleDateString("pt-BR")}`;
  }, [closedMonths]);

  const lowStockItems = useMemo(
    () => (inventory ?? []).filter((item) => item.lowStock),
    [inventory],
  );

  const recentToShow = (recentTransactions ?? []).slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted/50 rounded-md animate-pulse" />
          <div className="h-4 w-64 bg-muted/40 rounded-md animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted/20" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-[340px] animate-pulse bg-muted/20" />
          <Card className="h-[340px] animate-pulse bg-muted/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground mt-1">{periodLabel}</p>
      </div>

      {lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Link
            href="/estoque"
            className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/60 px-4 py-3 text-sm hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <PackageX className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate text-amber-900 dark:text-amber-200">
                {lowStockItems.length === 1
                  ? "1 produto está com estoque baixo"
                  : `${lowStockItems.length} produtos estão com estoque baixo`}
              </span>
            </div>
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium shrink-0">
              Ver estoque <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Receitas"
          value={formatCurrency(summary?.totalIncome || 0)}
          tone="income"
          delay={0}
        />
        <KpiCard
          icon={TrendingDown}
          label="Despesas"
          value={formatCurrency(summary?.totalExpenses || 0)}
          tone="expense"
          delay={0.05}
        />
        <KpiCard
          icon={Wallet}
          label="Saldo"
          value={formatCurrency(summary?.balance || 0)}
          tone="balance"
          delay={0.1}
        />
        <KpiCard
          icon={PiggyBank}
          label="Taxa de Economia"
          value={`${(summary?.savingsRate || 0).toFixed(1)}%`}
          tone="rate"
          delay={0.15}
        />
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
                  barGap={4}
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
                    width={56}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => formatDate(label)}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                  <Bar
                    dataKey="income"
                    name="Receitas"
                    fill="hsl(143 58% 40%)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Despesas"
                    fill="hsl(0 84% 60%)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
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
            <CardDescription>Distribuição por categoria</CardDescription>
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
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: 13 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Sem dados no período atual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Lançamentos Recentes</CardTitle>
          <CardDescription>Suas últimas movimentações</CardDescription>
        </CardHeader>
        <CardContent>
          {recentToShow.length > 0 ? (
            <div className="space-y-1">
              {recentToShow.map((tx, i) => {
                const isIncome = (tx as any).type === "income";
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="flex items-center justify-between gap-3 py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                          isIncome
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-normal px-1.5 py-0 ${isIncome ? "text-green-700 bg-green-100 border-green-200" : "text-red-700 bg-red-100 border-red-200"}`}
                          >
                            {tx.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-semibold whitespace-nowrap tabular-nums ${isIncome ? "text-green-600 dark:text-green-400" : "text-foreground"}`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum lançamento recente encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
