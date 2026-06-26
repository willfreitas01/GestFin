import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlertTriangle,
} from "lucide-react";

type Product = {
  id: number;
  name: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  salePrice: number;
  lowStock: boolean;
  createdAt: string;
};

const productSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  quantity: z.coerce.number().int().min(0, "Quantidade mínima é 0"),
  minQuantity: z.coerce.number().int().min(0, "Quantidade mínima é 0"),
  costPrice: z.coerce.number().min(0, "Preço mínimo é 0"),
  salePrice: z.coerce.number().min(0, "Preço mínimo é 0"),
});

const movementSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantidade mínima é 1"),
  note: z.string().optional(),
});

async function fetchInventory(): Promise<Product[]> {
  const res = await fetch("/api/inventory", { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao buscar estoque");
  return res.json();
}

async function createProduct(
  data: z.infer<typeof productSchema>,
): Promise<Product> {
  const res = await fetch("/api/inventory", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao criar produto");
  return res.json();
}

async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`/api/inventory/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao excluir produto");
}

async function registerMovement(
  id: number,
  type: "in" | "out",
  quantity: number,
  note?: string,
): Promise<Product> {
  const res = await fetch(`/api/inventory/${id}/movement`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, quantity, note }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro ao registrar movimentação");
  }
  return res.json();
}

export default function Estoque() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showNewProduct, setShowNewProduct] = useState(false);
  const [movementProduct, setMovementProduct] = useState<{
    product: Product;
    type: "in" | "out";
  } | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Produto cadastrado com sucesso." });
      setShowNewProduct(false);
      productForm.reset();
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao cadastrar produto." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Produto excluído com sucesso." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao excluir produto." });
    },
  });

  const movementMutation = useMutation({
    mutationFn: ({
      id,
      type,
      quantity,
      note,
    }: {
      id: number;
      type: "in" | "out";
      quantity: number;
      note?: string;
    }) => registerMovement(id, type, quantity, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Movimentação registrada com sucesso." });
      setMovementProduct(null);
      movementForm.reset();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: err.message });
    },
  });

  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      quantity: 0,
      minQuantity: 0,
      costPrice: 0,
      salePrice: 0,
    },
  });

  const movementForm = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
    defaultValues: { quantity: 1, note: "" },
  });

  const totalProducts = products.length;
  const totalValue = products.reduce(
    (acc, p) => acc + p.costPrice * p.quantity,
    0,
  );
  const lowStockCount = products.filter((p) => p.lowStock).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground mt-1">
            Controle seus produtos e materiais
          </p>
        </div>
        <Button onClick={() => setShowNewProduct(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo produto
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total de produtos</p>
            <p className="text-2xl font-bold mt-1">{totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Valor em estoque</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card
          className={
            lowStockCount > 0 ? "border-red-300 dark:border-red-800" : ""
          }
        >
          <CardContent className="pt-6">
            <p
              className={`text-sm ${lowStockCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
            >
              Estoque baixo
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? "text-red-600 dark:text-red-400" : ""}`}
            >
              {lowStockCount} {lowStockCount === 1 ? "produto" : "produtos"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>Gerencie seu estoque de produtos</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Nenhum produto cadastrado</p>
              <p className="text-sm">Clique em "Novo produto" para começar.</p>
            </div>
          ) : (
            <div className="divide-y">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{product.name}</p>
                        {product.lowStock && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0 flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" /> Estoque baixo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Mín: {product.minQuantity} un · Custo:{" "}
                        {formatCurrency(product.costPrice)} · Venda:{" "}
                        {formatCurrency(product.salePrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-end">
                    <Badge
                      variant="outline"
                      className={`text-sm font-semibold px-3 ${product.lowStock ? "text-red-600 border-red-300 bg-red-50 dark:bg-red-900/20" : ""}`}
                    >
                      {product.quantity} un
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-green-600"
                      title="Entrada"
                      onClick={() => {
                        setMovementProduct({ product, type: "in" });
                        movementForm.reset({ quantity: 1, note: "" });
                      }}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      title="Saída"
                      onClick={() => {
                        setMovementProduct({ product, type: "out" });
                        movementForm.reset({ quantity: 1, note: "" });
                      }}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(product.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal novo produto */}
      <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo produto</DialogTitle>
          </DialogHeader>
          <Form {...productForm}>
            <form
              onSubmit={productForm.handleSubmit((data) =>
                createMutation.mutate(data),
              )}
              className="space-y-4"
            >
              <FormField
                control={productForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Shampoo automotivo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade inicial</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque mínimo</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de custo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de venda</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewProduct(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Salvar produto"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal movimentação */}
      <Dialog
        open={!!movementProduct}
        onOpenChange={() => setMovementProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementProduct?.type === "in"
                ? "Entrada de estoque"
                : "Saída de estoque"}{" "}
              — {movementProduct?.product.name}
            </DialogTitle>
          </DialogHeader>
          <Form {...movementForm}>
            <form
              onSubmit={movementForm.handleSubmit((data) => {
                if (!movementProduct) return;
                movementMutation.mutate({
                  id: movementProduct.product.id,
                  type: movementProduct.type,
                  quantity: data.quantity,
                  note: data.note,
                });
              })}
              className="space-y-4"
            >
              <FormField
                control={movementForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={movementForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Compra de fornecedor X"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMovementProduct(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={movementMutation.isPending}
                  className={
                    movementProduct?.type === "in"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {movementMutation.isPending
                    ? "Salvando..."
                    : movementProduct?.type === "in"
                      ? "Registrar entrada"
                      : "Registrar saída"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
