import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import categoriesRouter from "./categories";
import inventoryRouter from "./inventory";
import employeesRouter from "./employees";
import clientsRouter from "./clients";
import suppliersRouter from "./suppliers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(categoriesRouter);
router.use(inventoryRouter);
router.use(employeesRouter);
router.use(clientsRouter);
router.use(suppliersRouter);

export default router;
