import express from "express";
import { RonyxTicketProcessor } from "../../services/ticket-intelligence/ronyx-processor";

const ticketRouter = express.Router();
const processor = new RonyxTicketProcessor();

// Ronyx-specific ticket upload endpoint
ticketRouter.post("/upload", async (req, res) => {
  try {
    const { image, metadata } = req.body;

    // Process using Ronyx-specific configuration
    const result = await processor.processRonyxTicket(image, metadata);

    res.json({
      success: true,
      tenant: "ronyx",
      ticketId: result.ticketId,
      status: "processed",
      reconciliationNeeded: result.needsReconciliation,
    });
  } catch (error: any) {
    res.status(400).json({
      error: "Ticket processing failed",
      tenant: "ronyx",
      details: error.message,
    });
  }
});

// Ronyx reconciliation endpoint
ticketRouter.post("/reconcile", async (req, res) => {
  const { driverTickets, plantCsv, managerExcel } = req.body;

  const reconciliation = await processor.reconcileRonyxTickets(
    driverTickets,
    plantCsv,
    managerExcel,
  );

  res.json({
    tenant: "ronyx",
    reconciliation,
  });
});

export default ticketRouter;
