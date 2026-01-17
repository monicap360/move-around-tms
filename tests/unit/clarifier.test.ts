import { describe, expect, it } from "vitest";

import { clarifier } from "../../lib/tickets/clarifier";

describe("clarifier", () => {
  it("flags net weight mismatch", () => {
    const issues = clarifier([
      {
        id: "1",
        ticket_number: "T-1",
        gross_weight: 100,
        tare_weight: 20,
        net_weight: 70,
        quantity: 1,
        bill_rate: 50,
      },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].reason).toBe("Net weight mismatch");
  });

  it("flags missing gross or tare", () => {
    const issues = clarifier([
      {
        id: "2",
        ticket_number: "T-2",
        gross_weight: 100,
        tare_weight: null,
        net_weight: null,
        quantity: 1,
        bill_rate: 50,
      },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].reason).toBe("Missing gross or tare weight");
  });

  it("flags missing quantity or rate", () => {
    const issues = clarifier([
      {
        id: "3",
        ticket_number: "T-3",
        gross_weight: 100,
        tare_weight: 20,
        net_weight: 80,
        quantity: null,
        bill_rate: null,
      },
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].reason).toBe("Missing quantity or rate");
  });

  it("returns no issues for valid tickets", () => {
    const issues = clarifier([
      {
        id: "4",
        ticket_number: "T-4",
        gross_weight: 120,
        tare_weight: 20,
        net_weight: 100,
        quantity: 10,
        bill_rate: 15,
      },
    ]);

    expect(issues).toHaveLength(0);
  });
});
