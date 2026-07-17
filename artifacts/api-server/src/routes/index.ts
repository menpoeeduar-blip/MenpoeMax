import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import postsRouter from "./posts";
import storiesRouter from "./stories";
import messagesRouter from "./messages";
import notificationsRouter from "./notifications";
import jobsRouter from "./jobs";
import marketplaceRouter from "./marketplace";
import communitiesRouter from "./communities";
import eventsRouter from "./events";
import streamsRouter from "./streams";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";
import devRouter from "./dev";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dev", devRouter);
router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/stories", storiesRouter);
router.use("/conversations", messagesRouter);
router.use("/notifications", notificationsRouter);
router.use("/jobs", jobsRouter);
router.use("/marketplace", marketplaceRouter);
router.use("/communities", communitiesRouter);
router.use("/events", eventsRouter);
router.use("/streams", streamsRouter);
router.use("/ai", aiRouter);
router.use("/dashboard", dashboardRouter);
router.use(storageRouter);

export default router;
