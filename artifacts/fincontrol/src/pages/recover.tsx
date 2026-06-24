import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetSecurityQuestion, useVerifySecurityAnswer } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

const step1Schema = z.object({
  username: z.string().min(1, "O usuário é obrigatório"),
});

const step2Schema = z.object({
  answer: z.string().min(1, "A resposta é obrigatória"),
});

export default function Recover() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [question, setQuestion] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  
  const { toast } = useToast();
  const getQuestion = useGetSecurityQuestion();
  const verifyAnswer = useVerifySecurityAnswer();

  const form1 = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: { username: "" },
  });

  const form2 = useForm<z.infer<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: { answer: "" },
  });

  function onSubmitStep1(values: z.infer<typeof step1Schema>) {
    getQuestion.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setUsername(values.username);
          setQuestion(data.question);
          setStep(2);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Usuário não encontrado",
            description: "Verifique o nome de usuário digitado.",
          });
        },
      }
    );
  }

  function onSubmitStep2(values: z.infer<typeof step2Schema>) {
    verifyAnswer.mutate(
      { data: { username, answer: values.answer } },
      {
        onSuccess: (data) => {
          setTempPassword(data.tempPassword);
          setStep(3);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Resposta incorreta",
            description: "A resposta fornecida não confere.",
          });
        },
      }
    );
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    toast({
      title: "Senha copiada",
      description: "A senha temporária foi copiada para a área de transferência.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary tracking-tight mb-2">FinControl</h1>
          <p className="text-muted-foreground">Recuperação de conta</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Recuperar senha</CardTitle>
            <CardDescription>
              {step === 1 && "Informe seu usuário"}
              {step === 2 && "Responda à pergunta de segurança"}
              {step === 3 && "Sua nova senha temporária"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <Form {...form1}>
                <form onSubmit={form1.handleSubmit(onSubmitStep1)} className="space-y-4">
                  <FormField
                    control={form1.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu usuário" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={getQuestion.isPending}>
                    {getQuestion.isPending ? "Buscando..." : "Continuar"}
                  </Button>
                </form>
              </Form>
            )}

            {step === 2 && (
              <Form {...form2}>
                <form onSubmit={form2.handleSubmit(onSubmitStep2)} className="space-y-4">
                  <div className="p-3 bg-muted rounded-md text-sm font-medium mb-4">
                    {question}
                  </div>
                  <FormField
                    control={form2.control}
                    name="answer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sua Resposta</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite sua resposta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setStep(1)} className="w-1/3">
                      Voltar
                    </Button>
                    <Button type="submit" className="w-2/3" disabled={verifyAnswer.isPending}>
                      {verifyAnswer.isPending ? "Verificando..." : "Verificar"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="p-4 bg-muted/50 border border-border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">Sua senha temporária é:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-xl font-mono font-bold px-3 py-1 bg-background rounded border">{tempPassword}</code>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard} title="Copiar">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Use esta senha para fazer login e não se esqueça de alterá-la depois.
                </p>
                <Button className="w-full" asChild>
                  <Link href="/login">Ir para o Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
          {step !== 3 && (
            <CardFooter className="flex justify-center text-sm">
              <div className="text-muted-foreground">
                Lembrou a senha?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Faça login
                </Link>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
