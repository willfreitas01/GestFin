export const CATEGORY_LABELS: Record<string, string> = {
  venda: 'Receita Operacional',
  material: 'Insumos',
  funcionarios: 'Folha de Pagamento',
  outro: 'Outras Despesas',
};

export const CATEGORY_COLORS: Record<string, string> = {
  venda: 'text-green-700 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800',
  material: 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800',
  funcionarios: 'text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800',
  outro: 'text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800',
};

export const CATEGORY_CHART_COLORS: Record<string, string> = {
  venda: 'hsl(143 58% 40%)',
  material: 'hsl(38 92% 50%)',
  funcionarios: 'hsl(0 84% 60%)',
  outro: 'hsl(217 91% 60%)',
};
