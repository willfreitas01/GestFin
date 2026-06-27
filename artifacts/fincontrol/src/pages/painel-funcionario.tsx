import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LogOut, ShoppingCart, Package, CheckCircle } from "lucide-react";

type EmpMe = {
  id: number;
  name: string;
  canSellInventory: boolean;
  canRegisterSale: boolean;
};

type Product = {
  id: number;
  name: string;
  quantity: number;
  salePrice: number;
};

export default function PainelFuncionario() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [sellProduct, setSellProduct] = useState<Product | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const [sellNote, setSellNote] = useState("");
  const [saleDesc, setSaleDesc] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Busca dados do funcionário logado
  const {
    data: me,
    isLoading,
    isError,
  } = useQuery<EmpMe>({
    queryKey: ["employee-me"],
    queryFn: async () => {
      const res = await fetch("/api/employee/me", { credentials: "include" });
      if (!res.ok) throw new Error("Não autenticado");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (isError) setLocation("/login-funcionario");
  }, [isError, setLocation]);

  // Busca estoque (se tiver permissão)
  const { data: products = [], refetch: refetchProducts } = useQuery<Product[]>(
    {
      queryKey: ["employee-inventory"],
      queryFn: async () => {
        const res = await fetch("/api/employee/inventory", {
          credentials: "include",
        });
        if (!res.ok) return [];
        return res.json();
      },
      enabled: !!me?.canSellInventory,
    },
  );

  // Dar baixa no estoque
  const sellMutation = useMutation({
    mutationFn: async () => {
      if (!sellProduct) return;
      const res = await fetch(
        `/api/employee/inventory/${sellProduct.id}/sell`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: sellQty, note: sellNote }),
        },
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setLastAction(
        `✅ Baixa registrada: ${sellProduct?.name} (${sellQty} un) — R$ ${data.amountRegistered.toFixed(2)}`,
      );
      setSellProduct(null);
      setSellQty(1);
      setSellNote("");
      refetchProducts();
      toast({ title: "Baixa registrada com sucesso!" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  // Registrar venda avulsa
  const saleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/employee/sale", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: saleDesc,
          amount: parseFloat(saleAmount),
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      return res.json();
    },
    onSuccess: () => {
      setLastAction(
        `✅ Venda registrada: ${saleDesc} — R$ ${parseFloat(saleAmount).toFixed(2)}`,
      );
      setSaleDesc("");
      setSaleAmount("");
      toast({ title: "Venda registrada com sucesso!" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  async function handleLogout() {
    await fetch("/api/employee/logout", {
      method: "POST",
      credentials: "include",
    });
    setLocation("/login-funcionario");
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando...
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 h-16 flex items-center justify-between">
        <div>
          <span className="text-xl font-bold text-primary">FinControl</span>
          <Badge variant="outline" className="ml-3 text-xs">
            Funcionário
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">
            Olá, {me.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Olá, {me.name}!</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selecione a ação que deseja realizar
          </p>
        </div>

        {/* Última ação */}
        {lastAction && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">
              {lastAction}
            </p>
          </div>
        )}

        {/* Nenhuma permissão */}
        {!me.canSellInventory && !me.canRegisterSale && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>Você ainda não tem permissões ativas.</p>
              <p className="text-sm mt-1">
                Contate o proprietário para liberar seu acesso.
              </p>
            </CardContent>
          </Card>
        )}

        {/* DAR BAIXA NO ESTOQUE */}
        {me.canSellInventory && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" /> Dar baixa no estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sellProduct ? (
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="font-medium">{sellProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Disponível: {sellProduct.quantity} un · R${" "}
                      {sellProduct.salePrice.toFixed(2)}/un
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Quantidade vendida
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max={sellProduct.quantity}
                      value={sellQty}
                      onChange={(e) =>
                        setSellQty(parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Observação{" "}
                      <span className="text-muted-foreground font-normal">
                        (opcional)
                      </span>
                    </label>
                    <Input
                      placeholder="Ex: Venda no caixa"
                      value={sellNote}
                      onChange={(e) => setSellNote(e.target.value)}
                    />
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-bold text-primary">
                      R$ {(sellProduct.salePrice * sellQty).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSellProduct(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={
                        sellMutation.isPending ||
                        sellQty < 1 ||
                        sellQty > sellProduct.quantity
                      }
                      onClick={() => sellMutation.mutate()}
                    >
                      {sellMutation.isPending
                        ? "Registrando..."
                        : "Confirmar baixa"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum produto disponível no estoque.
                    </p>
                  ) : (
                    products.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          p.quantity === 0
                            ? "opacity-50 cursor-not-allowed bg-muted/30"
                            : "hover:bg-muted/50 cursor-pointer"
                        }`}
                        onClick={() => {
                          if (p.quantity > 0) {
                            setSellProduct(p);
                            setSellQty(1);
                            setSellNote("");
                          }
                        }}
                      >
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {p.salePrice.toFixed(2)}/un
                          </p>
                        </div>
                        <Badge
                          variant={p.quantity === 0 ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          {p.quantity} un
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* REGISTRAR VENDA AVULSA */}
        {me.canRegisterSale && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" /> Registrar venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Descrição da venda
                </label>
                <Input
                  placeholder="Ex: Venda de produto X"
                  value={saleDesc}
                  onChange={(e) => setSaleDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={saleMutation.isPending || !saleDesc || !saleAmount}
                onClick={() => saleMutation.mutate()}
              >
                {saleMutation.isPending ? "Registrando..." : "Registrar venda"}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
