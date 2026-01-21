import express from "express";
import { RonyxTenantMiddleware } from "../../middleware/ronyx-tenant";

const ronyxRouter = express.Router();

// Apply Ronyx tenant middleware to ALL routes
ronyxRouter.use(RonyxTenantMiddleware.identify);

// RONYX-SPECIFIC API ROUTES (Entry points for each module)
ronyxRouter.use("/loads", require("./loads").default);
ronyxRouter.use("/finance", require("./finance").default);
ronyxRouter.use("/tracking", require("./tracking").default);
ronyxRouter.use("/hr", require("./hr").default);
ronyxRouter.use("/materials", require("./materials").default);
ronyxRouter.use("/tickets", require("./tickets").default);

// EXPLICITLY BLOCK PIT MODULE ACCESS
ronyxRouter.all("/pit/*", (req, res) => {
  res.status(403).json({
    error: "PIT module not available for Ronyx tenant",
    tenant: "ronyx",
    message: "This feature is disabled for your account",
  });
});

// Health check for Ronyx tenant
ronyxRouter.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    tenant: "ronyx",
    domain: "ronyx.movearoundtms.com",
    modules: {
      loads: "enabled",
      finance: "enabled",
      tracking: "enabled",
      hr: "enabled",
      materials: "enabled",
      tickets: "enabled",
      pit: "disabled",
    },
  });
});

export default ronyxRouter;
