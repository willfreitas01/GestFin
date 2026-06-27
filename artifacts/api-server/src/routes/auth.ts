import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import {
  RegisterBody,
  LoginBody,
  GetSecurityQuestionBody,
  VerifySecurityAnswerBody,
} from "@workspace/api-zod";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    employeeId: number;
    ownerId: number;
    employeeName: string;
  }
}

const router = Router();

function hashStr(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function genTempPassword(): string {
  return randomBytes(4).toString("hex");
}

const SECURITY_QUESTIONS: Record<string, string> = {
  pet: "Nome do seu primeiro animal de estimação?",
  escola: "Nome da sua escola primária?",
  cidade: "Cidade onde você nasceu?",
  mae: "Primeiro nome da sua mãe?",
};

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos." });
    return;
  }

  const { username, password, securityQuestion, securityAnswer } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Usuário já existe. Escolha outro nome." });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      username: username.toLowerCase(),
      passwordHash: hashStr(username.toLowerCase() + password),
      securityQuestion,
      securityAnswerHash: hashStr(securityAnswer.trim().toLowerCase()),
    })
    .returning({ id: usersTable.id, username: usersTable.username });

  req.session.userId = user.id;
  req.session.username = user.username;
  delete req.session.employeeId;
  delete req.session.ownerId;
  delete req.session.employeeName;

  res.status(201).json({ id: user.id, username: user.username });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos." });
    return;
  }

  const { username, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()))
    .limit(1);
  if (!user) {
    res.status(401).json({ error: "Usuário não encontrado." });
    return;
  }

  if (user.passwordHash !== hashStr(username.toLowerCase() + password)) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  delete req.session.employeeId;
  delete req.session.ownerId;
  delete req.session.employeeName;

  res.json({ id: user.id, username: user.username });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ message: "Sessão encerrada com sucesso." });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  res.json({ id: req.session.userId, username: req.session.username });
});

router.post("/auth/recover/question", async (req, res): Promise<void> => {
  const parsed = GetSecurityQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, parsed.data.username.toLowerCase()))
    .limit(1);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }

  const questionKey = user.securityQuestion;
  const question = SECURITY_QUESTIONS[questionKey] ?? questionKey;

  res.json({ question, questionKey });
});

router.post("/auth/recover/verify", async (req, res): Promise<void> => {
  const parsed = VerifySecurityAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos." });
    return;
  }

  const { username, answer } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()))
    .limit(1);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }

  if (user.securityAnswerHash !== hashStr(answer.trim().toLowerCase())) {
    res.status(401).json({ error: "Resposta incorreta." });
    return;
  }

  const tempPassword = genTempPassword();
  await db
    .update(usersTable)
    .set({ passwordHash: hashStr(username.toLowerCase() + tempPassword) })
    .where(eq(usersTable.id, user.id));

  res.json({ tempPassword });
});

export default router;
