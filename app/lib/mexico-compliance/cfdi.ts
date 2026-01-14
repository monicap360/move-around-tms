// Mexican Tax Compliance - CFDI (Comprobante Fiscal Digital por Internet)
// and Carta Porte (Transportation Complement) support
// 
// CFDI is the electronic invoice format required by SAT (Servicio de Administración Tributaria)
// Carta Porte is a mandatory complement for freight transportation since January 2022
//
// This module provides types and utilities for generating CFDI-compliant invoices
// with the Carta Porte complement for transportation services.

// CFDI Version 4.0 Types
export interface CFDIDocument {
  version: "4.0";
  serie?: string;
  folio?: string;
  fecha: string; // ISO 8601 format
  formaPago: FormaPago;
  condicionesDePago?: string;
  subTotal: number;
  descuento?: number;
  moneda: Moneda;
  tipoCambio?: number;
  total: number;
  tipoDeComprobante: TipoComprobante;
  exportacion: Exportacion;
  metodoPago?: MetodoPago;
  lugarExpedicion: string; // Postal code
  emisor: Emisor;
  receptor: Receptor;
  conceptos: Concepto[];
  impuestos?: Impuestos;
  complemento?: {
    cartaPorte?: CartaPorte;
  };
}

// Payment methods
export type FormaPago = 
  | "01" // Efectivo
  | "02" // Cheque nominativo
  | "03" // Transferencia electrónica de fondos
  | "04" // Tarjeta de crédito
  | "28" // Tarjeta de débito
  | "99"; // Por definir

// Currency codes
export type Moneda = "MXN" | "USD" | "EUR";

// Document types
export type TipoComprobante = 
  | "I" // Ingreso (Income)
  | "E" // Egreso (Expense)
  | "T" // Traslado (Transfer - for Carta Porte)
  | "N" // Nómina (Payroll)
  | "P"; // Pago (Payment)

// Export types
export type Exportacion = 
  | "01" // No aplica
  | "02" // Definitiva
  | "03" // Temporal
  | "04"; // Definitiva con clave distinta a A1

// Payment methods
export type MetodoPago = 
  | "PUE" // Pago en una sola exhibición
  | "PPD"; // Pago en parcialidades o diferido

// Issuer information
export interface Emisor {
  rfc: string;
  nombre: string;
  regimenFiscal: RegimenFiscal;
}

// Receiver information
export interface Receptor {
  rfc: string;
  nombre: string;
  domicilioFiscalReceptor: string; // Postal code
  regimenFiscalReceptor: RegimenFiscal;
  usoCFDI: UsoCFDI;
}

// Tax regime codes (most common)
export type RegimenFiscal = 
  | "601" // General de Ley Personas Morales
  | "603" // Personas Morales con Fines no Lucrativos
  | "605" // Sueldos y Salarios e Ingresos Asimilados a Salarios
  | "606" // Arrendamiento
  | "607" // Régimen de Enajenación o Adquisición de Bienes
  | "608" // Demás ingresos
  | "610" // Residentes en el Extranjero sin Establecimiento Permanente en México
  | "611" // Ingresos por Dividendos (socios y accionistas)
  | "612" // Personas Físicas con Actividades Empresariales y Profesionales
  | "614" // Ingresos por intereses
  | "615" // Régimen de los ingresos por obtención de premios
  | "616" // Sin obligaciones fiscales
  | "620" // Sociedades Cooperativas de Producción que optan por diferir sus ingresos
  | "621" // Incorporación Fiscal
  | "622" // Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras
  | "623" // Opcional para Grupos de Sociedades
  | "624" // Coordinados
  | "625" // Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas
  | "626"; // Régimen Simplificado de Confianza

// CFDI usage codes (most common for transportation)
export type UsoCFDI = 
  | "G01" // Adquisición de mercancías
  | "G02" // Devoluciones, descuentos o bonificaciones
  | "G03" // Gastos en general
  | "I01" // Construcciones
  | "I02" // Mobiliario y equipo de oficina por inversiones
  | "I03" // Equipo de transporte
  | "I04" // Equipo de cómputo y accesorios
  | "I05" // Dados, troqueles, moldes, matrices y herramental
  | "I06" // Comunicaciones telefónicas
  | "I07" // Comunicaciones satelitales
  | "I08" // Otra maquinaria y equipo
  | "D01" // Honorarios médicos, dentales y gastos hospitalarios
  | "D02" // Gastos médicos por incapacidad o discapacidad
  | "D03" // Gastos funerales
  | "D04" // Donativos
  | "D05" // Intereses reales efectivamente pagados por créditos hipotecarios
  | "D06" // Aportaciones voluntarias al SAR
  | "D07" // Primas por seguros de gastos médicos
  | "D08" // Gastos de transportación escolar obligatoria
  | "D09" // Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones
  | "D10" // Pagos por servicios educativos (colegiaturas)
  | "S01" // Sin efectos fiscales
  | "CP01"; // Pagos

// Concept (line item)
export interface Concepto {
  claveProdServ: string; // SAT product/service code
  noIdentificacion?: string;
  cantidad: number;
  claveUnidad: string; // SAT unit code
  unidad?: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  objetoImp: ObjetoImpuesto;
  impuestos?: ConceptoImpuestos;
}

// Tax object types
export type ObjetoImpuesto = 
  | "01" // No objeto de impuesto
  | "02" // Sí objeto de impuesto
  | "03" // Sí objeto del impuesto y no obligado al desglose
  | "04"; // Sí objeto del impuesto y no causa impuesto

// Concept taxes
export interface ConceptoImpuestos {
  traslados?: Traslado[];
  retenciones?: Retencion[];
}

// Tax transfer (IVA, IEPS)
export interface Traslado {
  base: number;
  impuesto: "002" | "003"; // 002 = IVA, 003 = IEPS
  tipoFactor: "Tasa" | "Cuota" | "Exento";
  tasaOCuota?: number;
  importe?: number;
}

// Tax withholding (ISR, IVA)
export interface Retencion {
  base: number;
  impuesto: "001" | "002"; // 001 = ISR, 002 = IVA
  tipoFactor: "Tasa" | "Cuota";
  tasaOCuota: number;
  importe: number;
}

// Document-level taxes
export interface Impuestos {
  totalImpuestosTrasladados?: number;
  totalImpuestosRetenidos?: number;
  traslados?: Traslado[];
  retenciones?: Retencion[];
}

// Carta Porte 3.0 Complement
export interface CartaPorte {
  version: "3.0";
  transpInternac: "Sí" | "No";
  entradaSalidaMerc?: "Entrada" | "Salida";
  paisOrigenDestino?: string; // ISO 3166-1 alpha-3
  viaEntradaSalida?: ViaEntradaSalida;
  totalDistRec?: number; // Total distance in km
  ubicaciones: Ubicacion[];
  mercancias: Mercancias;
  figuraTransporte?: FiguraTransporte[];
}

// Entry/exit routes
export type ViaEntradaSalida = 
  | "01" // Autotransporte
  | "02" // Transporte Marítimo
  | "03" // Transporte Aéreo
  | "04" // Transporte Ferroviario
  | "05"; // Ducto

// Location (origin/destination)
export interface Ubicacion {
  tipoUbicacion: "Origen" | "Destino";
  idUbicacion?: string;
  rfcRemitenteDestinatario?: string;
  nombreRemitenteDestinatario?: string;
  numRegIdTrib?: string;
  residenciaFiscal?: string;
  numEstacion?: string;
  nombreEstacion?: string;
  navegacionTrafico?: string;
  fechaHoraSalidaLlegada: string; // ISO 8601
  tipoEstacion?: string;
  distanciaRecorrida?: number;
  domicilio?: Domicilio;
}

// Address
export interface Domicilio {
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  localidad?: string;
  referencia?: string;
  municipio?: string;
  estado: string; // SAT state code
  pais: string; // ISO 3166-1 alpha-3
  codigoPostal: string;
}

// Merchandise section
export interface Mercancias {
  pesoBrutoTotal: number;
  unidadPeso: string; // SAT unit code (e.g., "KGM" for kilograms)
  pesoNetoTotal?: number;
  numTotalMercancias: number;
  cargoPorTasacion?: number;
  mercancia: Mercancia[];
  autotransporte?: Autotransporte;
  transporteMaritimo?: any;
  transporteAereo?: any;
  transporteFerroviario?: any;
}

// Individual merchandise item
export interface Mercancia {
  bienesTransp: string; // SAT product code
  claveSTCC?: string;
  descripcion: string;
  cantidad: number;
  claveUnidad: string;
  unidad?: string;
  dimensiones?: string;
  materialPeligroso?: "Sí" | "No";
  cveMaterialPeligroso?: string;
  embalaje?: string;
  descripEmbalaje?: string;
  pesoEnKg: number;
  valorMercancia?: number;
  moneda?: Moneda;
  fraccionArancelaria?: string;
  uuidComercioExt?: string;
  tipoMateria?: TipoMateria;
  descripcionMateria?: string;
  cantidadTransporta?: CantidadTransporta[];
  detalleMercancia?: any;
}

// Material types
export type TipoMateria = 
  | "01" // Materia prima
  | "02" // Productos terminados
  | "03" // Productos semiterminados
  | "04" // Materiales para ensamble
  | "05"; // Otros

// Quantity transported
export interface CantidadTransporta {
  cantidad: number;
  idOrigen: string;
  idDestino: string;
  cvesTransporte?: string;
}

// Auto transport (trucks)
export interface Autotransporte {
  permSCT: string; // SCT permit type
  numPermisoSCT: string;
  identificacionVehicular: IdentificacionVehicular;
  seguros: Seguros;
  remolques?: Remolque[];
}

// Vehicle identification
export interface IdentificacionVehicular {
  configVehicular: string; // SAT vehicle configuration code
  placaVM: string;
  anioModeloVM: number;
}

// Insurance
export interface Seguros {
  aseguraRespCivil: string;
  polizaRespCivil: string;
  aseguraMedAmbiente?: string;
  polizaMedAmbiente?: string;
  aseguraCarga?: string;
  polizaCarga?: string;
  primaSeguro?: number;
}

// Trailer
export interface Remolque {
  subTipoRem: string; // SAT trailer type code
  placa: string;
}

// Transport figures (driver, owner, etc.)
export interface FiguraTransporte {
  tipoFigura: TipoFigura;
  rfcFigura?: string;
  numLicencia?: string;
  nombreFigura?: string;
  numRegIdTribFigura?: string;
  residenciaFiscalFigura?: string;
  parteTransporte?: ParteTransporte[];
  domicilio?: Domicilio;
}

// Figure types
export type TipoFigura = 
  | "01" // Operador (Driver)
  | "02" // Propietario (Owner)
  | "03" // Arrendador (Lessor)
  | "04"; // Notificado

// Transport parts
export interface ParteTransporte {
  parteTransporte: string; // SAT transport part code
}

// Helper functions for generating CFDI documents

// Generate a basic CFDI for transportation services
export function createTransportCFDI(params: {
  emisor: Emisor;
  receptor: Receptor;
  conceptos: Concepto[];
  cartaPorte: CartaPorte;
  fecha?: Date;
  serie?: string;
  folio?: string;
  formaPago?: FormaPago;
  metodoPago?: MetodoPago;
  moneda?: Moneda;
}): CFDIDocument {
  const {
    emisor,
    receptor,
    conceptos,
    cartaPorte,
    fecha = new Date(),
    serie,
    folio,
    formaPago = "03", // Transferencia electrónica
    metodoPago = "PUE",
    moneda = "MXN",
  } = params;

  const subTotal = conceptos.reduce((sum, c) => sum + c.importe, 0);
  const descuento = conceptos.reduce((sum, c) => sum + (c.descuento || 0), 0);
  
  // Calculate taxes
  let totalImpuestosTrasladados = 0;
  conceptos.forEach(c => {
    if (c.impuestos?.traslados) {
      c.impuestos.traslados.forEach(t => {
        totalImpuestosTrasladados += t.importe || 0;
      });
    }
  });

  const total = subTotal - descuento + totalImpuestosTrasladados;

  return {
    version: "4.0",
    serie,
    folio,
    fecha: fecha.toISOString(),
    formaPago,
    subTotal,
    descuento: descuento > 0 ? descuento : undefined,
    moneda,
    total,
    tipoDeComprobante: cartaPorte.transpInternac === "No" ? "I" : "T",
    exportacion: cartaPorte.transpInternac === "No" ? "01" : "02",
    metodoPago,
    lugarExpedicion: emisor.rfc.length > 12 ? "00000" : "00000", // Should be actual postal code
    emisor,
    receptor,
    conceptos,
    impuestos: totalImpuestosTrasladados > 0 ? {
      totalImpuestosTrasladados,
    } : undefined,
    complemento: {
      cartaPorte,
    },
  };
}

// Common SAT codes for transportation
export const SAT_CODES = {
  // Product/Service codes for transportation
  PRODUCTOS_SERVICIOS: {
    FLETE_TERRESTRE: "78101800", // Servicios de transporte de carga por carretera
    FLETE_MARITIMO: "78101900", // Servicios de transporte de carga por mar
    FLETE_AEREO: "78102000", // Servicios de transporte de carga por aire
    FLETE_FERROVIARIO: "78102100", // Servicios de transporte de carga por ferrocarril
    MATERIALES_CONSTRUCCION: "30111500", // Materiales de construcción
    AGREGADOS: "11111700", // Agregados (arena, grava, etc.)
  },
  
  // Unit codes
  UNIDADES: {
    TONELADA: "TNE",
    KILOGRAMO: "KGM",
    METRO_CUBICO: "MTQ",
    LITRO: "LTR",
    PIEZA: "H87",
    SERVICIO: "E48",
    VIAJE: "E54",
  },
  
  // Vehicle configuration codes (most common)
  CONFIG_VEHICULAR: {
    CAMION_2_EJES: "C2",
    CAMION_3_EJES: "C3",
    TRACTOCAMION_2_EJES: "T2S1",
    TRACTOCAMION_3_EJES: "T3S2",
    TRACTOCAMION_5_EJES: "T3S2R4",
  },
  
  // SCT permit types
  PERMISOS_SCT: {
    CARGA_GENERAL: "TPAF01", // Autotransporte Federal de Carga General
    CARGA_ESPECIALIZADA: "TPAF02", // Autotransporte Federal de Carga Especializada
    MATERIALES_PELIGROSOS: "TPAF03", // Autotransporte Federal de Materiales y Residuos Peligrosos
  },
  
  // Mexican states
  ESTADOS: {
    AGU: "AGU", // Aguascalientes
    BCN: "BCN", // Baja California
    BCS: "BCS", // Baja California Sur
    CAM: "CAM", // Campeche
    CHP: "CHP", // Chiapas
    CHH: "CHH", // Chihuahua
    COA: "COA", // Coahuila
    COL: "COL", // Colima
    DIF: "DIF", // Ciudad de México
    DUR: "DUR", // Durango
    GUA: "GUA", // Guanajuato
    GRO: "GRO", // Guerrero
    HID: "HID", // Hidalgo
    JAL: "JAL", // Jalisco
    MEX: "MEX", // Estado de México
    MIC: "MIC", // Michoacán
    MOR: "MOR", // Morelos
    NAY: "NAY", // Nayarit
    NLE: "NLE", // Nuevo León
    OAX: "OAX", // Oaxaca
    PUE: "PUE", // Puebla
    QUE: "QUE", // Querétaro
    ROO: "ROO", // Quintana Roo
    SLP: "SLP", // San Luis Potosí
    SIN: "SIN", // Sinaloa
    SON: "SON", // Sonora
    TAB: "TAB", // Tabasco
    TAM: "TAM", // Tamaulipas
    TLA: "TLA", // Tlaxcala
    VER: "VER", // Veracruz
    YUC: "YUC", // Yucatán
    ZAC: "ZAC", // Zacatecas
  },
};

// Validate RFC format
export function validateRFC(rfc: string): boolean {
  // RFC for individuals: 13 characters (4 letters + 6 digits + 3 alphanumeric)
  // RFC for companies: 12 characters (3 letters + 6 digits + 3 alphanumeric)
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  return rfcRegex.test(rfc.toUpperCase());
}

// Format RFC
export function formatRFC(rfc: string): string {
  return rfc.toUpperCase().replace(/[^A-ZÑ&0-9]/g, "");
}

// Calculate IVA (16%)
export function calculateIVA(base: number): number {
  return Math.round(base * 0.16 * 100) / 100;
}

// Calculate ISR retention (4% for transportation)
export function calculateISRRetencion(base: number): number {
  return Math.round(base * 0.04 * 100) / 100;
}
