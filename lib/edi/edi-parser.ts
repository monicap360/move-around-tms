/**
 * EDI Parser
 * Parses EDI documents (204, 210, 214, 997) into structured data
 */

export interface EDIDocument {
  documentType: string;
  controlNumber: string;
  tradingPartner: string;
  segments: EDISegment[];
}

export interface EDISegment {
  id: string;
  elements: string[];
}

/**
 * Parse EDI document
 * EDI format: Segment*Element*Element~ (segments separated by ~, elements by *)
 */
export function parseEDI(rawContent: string): EDIDocument {
  const segments: EDISegment[] = [];
  const segmentStrings = rawContent.split("~").filter((s) => s.trim());

  segmentStrings.forEach((segmentStr) => {
    const elements = segmentStr.split("*");
    if (elements.length > 0) {
      segments.push({
        id: elements[0],
        elements: elements.slice(1),
      });
    }
  });

  // Extract document type and control number from ISA/GS segments
  const isaSegment = segments.find((s) => s.id === "ISA");
  const gsSegment = segments.find((s) => s.id === "GS");
  const stSegment = segments.find((s) => s.id === "ST");

  const controlNumber = stSegment?.elements[2] || "";
  const documentType = stSegment?.elements[1] || "";

  // Extract trading partner (usually in N1 segments)
  const n1Segment = segments.find((s) => s.id === "N1");
  const tradingPartner = n1Segment?.elements[1] || "";

  return {
    documentType,
    controlNumber,
    tradingPartner,
    segments,
  };
}

/**
 * Parse 204 (Load Tender) EDI document
 */
export function parse204LoadTender(ediDoc: EDIDocument): any {
  const result: any = {
    loadNumber: "",
    customer: "",
    pickupLocation: "",
    deliveryLocation: "",
    pickupDate: "",
    deliveryDate: "",
    equipmentType: "",
    weight: 0,
    pieces: 0,
    rate: 0,
  };

  // Find relevant segments
  const b2Segment = ediDoc.segments.find((s) => s.id === "B2");
  const n1Segments = ediDoc.segments.filter((s) => s.id === "N1");
  const n3Segments = ediDoc.segments.filter((s) => s.id === "N3");
  const n4Segments = ediDoc.segments.filter((s) => s.id === "N4");
  const l11Segment = ediDoc.segments.find((s) => s.id === "L11");

  if (b2Segment) {
    result.loadNumber = b2Segment.elements[1] || "";
  }

  // Extract customer from N1 segment with "BY" qualifier
  const customerN1 = n1Segments.find((s) => s.elements[0] === "BY");
  if (customerN1) {
    result.customer = customerN1.elements[1] || "";
  }

  // Extract locations from N3/N4 segments
  // (Simplified - real EDI parsing is more complex)

  return result;
}

/**
 * Parse 210 (Freight Invoice) EDI document
 */
export function parse210FreightInvoice(ediDoc: EDIDocument): any {
  const result: any = {
    invoiceNumber: "",
    invoiceDate: "",
    customer: "",
    totalAmount: 0,
    lineItems: [],
  };

  // Find relevant segments
  const b3Segment = ediDoc.segments.find((s) => s.id === "B3");
  const n1Segments = ediDoc.segments.filter((s) => s.id === "N1");
  const l1Segments = ediDoc.segments.filter((s) => s.id === "L1");

  if (b3Segment) {
    result.invoiceNumber = b3Segment.elements[1] || "";
    result.invoiceDate = b3Segment.elements[2] || "";
    result.totalAmount = parseFloat(b3Segment.elements[3] || "0");
  }

  // Extract customer
  const customerN1 = n1Segments.find((s) => s.elements[0] === "BY");
  if (customerN1) {
    result.customer = customerN1.elements[1] || "";
  }

  // Extract line items
  l1Segments.forEach((l1) => {
    result.lineItems.push({
      chargeCode: l1.elements[0] || "",
      amount: parseFloat(l1.elements[1] || "0"),
      description: l1.elements[2] || "",
    });
  });

  return result;
}

/**
 * Parse 214 (Shipment Status) EDI document
 */
export function parse214ShipmentStatus(ediDoc: EDIDocument): any {
  const result: any = {
    loadNumber: "",
    status: "",
    statusDate: "",
    location: "",
    events: [],
  };

  // Find relevant segments
  const b10Segment = ediDoc.segments.find((s) => s.id === "B10");
  const e1Segments = ediDoc.segments.filter((s) => s.id === "E1");

  if (b10Segment) {
    result.loadNumber = b10Segment.elements[1] || "";
  }

  // Extract status events
  e1Segments.forEach((e1) => {
    result.events.push({
      eventCode: e1.elements[0] || "",
      eventDate: e1.elements[1] || "",
      eventTime: e1.elements[2] || "",
      location: e1.elements[3] || "",
    });
  });

  return result;
}

/**
 * Generate 997 Functional Acknowledgment
 */
export function generate997Acknowledgment(
  originalDocument: EDIDocument,
  status: "A" | "E" | "R",
  errors: string[] = []
): string {
  // Simplified 997 generation
  // In production, generate full EDI 997 document
  const acknowledgment = `
ISA*00*          *00*          *ZZ*RECEIVER         *ZZ*SENDER           *${new Date().toISOString().split("T")[0].replace(/-/g, "")}*${new Date().toISOString().split("T")[1].replace(/:/g, "").split(".")[0]}*^*00501*${originalDocument.controlNumber}*0*P*:~
GS*FA*SENDER*RECEIVER*${new Date().toISOString().split("T")[0].replace(/-/g, "")}*${new Date().toISOString().split("T")[1].replace(/:/g, "").split(".")[0]}*${originalDocument.controlNumber}*X*005010~
ST*997*${originalDocument.controlNumber}~
AK1*${originalDocument.documentType}*${originalDocument.controlNumber}~
AK2*${originalDocument.documentType}*${originalDocument.controlNumber}~
AK5*${status}~
${errors.map((e) => `AK9*E*${e}~`).join("\n")}
SE*${originalDocument.segments.length}*${originalDocument.controlNumber}~
GE*1*${originalDocument.controlNumber}~
IEA*1*${originalDocument.controlNumber}~
  `.trim();

  return acknowledgment;
}
