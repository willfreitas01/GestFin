import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp } from "lucide-react";

const CARD_RATES = [
  { label: "Pix / Dinheiro", rate: 0, days: 0, color: "text-green-600" },
  { label: "Débito", rate: 1.49, days: 1, color: "text-blue-600" },
  { label: "Crédito 1x", rate: 2.99, days: 30, color: "text-orange-600" },
  { label: "Crédito 2x", rate: 3.49, days: 30, color: "text-orange-600" },
  { label: "Crédito 3x", rate: 3.99, days: 30, color: "text-orange-600" },
  { label: "Crédito 6x", rate: 4.99, days: 30, color: "text-red-600" },
  { label: "Crédito 12x", rate: 6.99, days: 30, color: "text-red-600" },
];

export default function Simuladores() {
  const [saleValue, setSaleValue] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [margin, setMargin] = useState("");
  const [sellPrice, setSellPrice] = useState("");

  const value = parseFloat(saleValue) || 0;
  const cost = parseFloat(costPrice) || 0;
  const marginPct = parseFloat(margin) || 0;
  const sell = parseFloat(sellPrice) || 0;

  // Simulador de taxas
  const cardResults = CARD_RATES.map((r) => ({
    ...r,
    receive: value * (1 - r.rate / 100),
    fee: value * (r.rate / 100),
  }));

  // Simulador de vendas — calcular preço de venda
  const calcSellPrice =
    cost > 0 && marginPct > 0 ? cost / (1 - marginPct / 100) : 0;
  const calcProfit = calcSellPrice - cost;

  // Simulador de vendas — calcular margem de um preço
  const calcMargin = cost > 0 && sell > 0 ? ((sell - cost) / sell) * 100 : 0;
  const calcProfitFromSell = sell - cost;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simuladores</h1>
        <p className="text-muted-foreground mt-1">
          Calcule taxas de cartão e preços de venda
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulador de taxas de cartão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Simulador de taxas de cartão
            </CardTitle>
            <CardDescription>
              Veja quanto você recebe em cada forma de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor da venda (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={saleValue}
                onChange={(e) => setSaleValue(e.target.value)}
              />
            </div>
            {value > 0 && (
              <div className="space-y-2">
                {cardResults.map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.rate === 0 ? "Sem taxa" : `Taxa: ${r.rate}%`}
                        {r.days > 0
                          ? ` · Recebe em ${r.days} dia${r.days > 1 ? "s" : ""}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${r.color}`}>
                        R$ {r.receive.toFixed(2)}
                      </p>
                      {r.fee > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Taxa: R$ {r.fee.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!value && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Digite o valor da venda para ver as taxas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Simulador de vendas */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Calcular preço de venda
              </CardTitle>
              <CardDescription>
                Digite o custo e a margem desejada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Preço de custo (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Margem desejada (%)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    placeholder="Ex: 30"
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                  />
                </div>
              </div>
              {calcSellPrice > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="font-medium">Preço de venda sugerido</span>
                    <span className="font-bold text-primary text-lg">
                      R$ {calcSellPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg border">
                    <span className="text-sm text-muted-foreground">
                      Lucro por unidade
                    </span>
                    <span className="font-medium text-green-600">
                      R$ {calcProfit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg border">
                    <span className="text-sm text-muted-foreground">
                      Markup
                    </span>
                    <Badge variant="outline">{marginPct}%</Badge>
                  </div>
                </div>
              )}
              {!calcSellPrice && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Preencha o custo e a margem para calcular
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Calcular margem de lucro
              </CardTitle>
              <CardDescription>
                Descubra a margem de um produto que você já vende
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Preço de custo (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Preço de venda (R$)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                  />
                </div>
              </div>
              {sell > 0 && cost > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between p-3 rounded-lg border">
                    <span className="text-sm text-muted-foreground">
                      Lucro por unidade
                    </span>
                    <span
                      className={`font-medium ${calcProfitFromSell >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      R$ {calcProfitFromSell.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between p-3 rounded-lg border ${calcMargin < 20 ? "border-red-200 bg-red-50 dark:bg-red-900/10" : "border-green-200 bg-green-50 dark:bg-green-900/10"}`}
                  >
                    <span className="font-medium">Margem de lucro</span>
                    <span
                      className={`font-bold text-lg ${calcMargin < 20 ? "text-red-600" : "text-green-600"}`}
                    >
                      {calcMargin.toFixed(1)}%
                    </span>
                  </div>
                  {calcMargin < 20 && (
                    <p className="text-xs text-red-600">
                      ⚠️ Margem abaixo de 20% — considere revisar o preço
                    </p>
                  )}
                </div>
              )}
              {!(sell > 0 && cost > 0) && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Preencha o custo e o preço de venda para calcular
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
