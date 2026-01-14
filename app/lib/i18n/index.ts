// Internationalization (i18n) support for Move Around TMS
// Supports English (en) and Spanish (es) for Mexico market

export type Locale = "en" | "es";

export const defaultLocale: Locale = "en";

export const locales: Locale[] = ["en", "es"];

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

// Translation dictionary type
export type TranslationKey = keyof typeof translations.en;

// Core translations for the TMS
export const translations = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.tickets": "Tickets",
    "nav.drivers": "Drivers",
    "nav.fleet": "Fleet",
    "nav.payroll": "Payroll",
    "nav.finance": "Finance",
    "nav.dispatch": "Dispatch",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "nav.compliance": "Compliance",
    "nav.maintenance": "Maintenance",
    "nav.marketplace": "Marketplace",
    "nav.hr": "HR",
    
    // Common actions
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.delete": "Delete",
    "action.edit": "Edit",
    "action.add": "Add",
    "action.search": "Search",
    "action.filter": "Filter",
    "action.export": "Export",
    "action.import": "Import",
    "action.submit": "Submit",
    "action.approve": "Approve",
    "action.reject": "Reject",
    "action.view": "View",
    "action.download": "Download",
    "action.upload": "Upload",
    "action.refresh": "Refresh",
    "action.close": "Close",
    "action.back": "Back",
    "action.next": "Next",
    "action.previous": "Previous",
    
    // Status labels
    "status.active": "Active",
    "status.inactive": "Inactive",
    "status.pending": "Pending",
    "status.approved": "Approved",
    "status.rejected": "Rejected",
    "status.completed": "Completed",
    "status.in_progress": "In Progress",
    "status.overdue": "Overdue",
    "status.paid": "Paid",
    "status.unpaid": "Unpaid",
    "status.invoiced": "Invoiced",
    
    // Dashboard
    "dashboard.welcome": "Welcome",
    "dashboard.operations_center": "Operations Center",
    "dashboard.mission_control": "Mission Control",
    "dashboard.total_loads": "Total Loads",
    "dashboard.active_drivers": "Active Drivers",
    "dashboard.pending_tickets": "Pending Tickets",
    "dashboard.monthly_revenue": "Monthly Revenue",
    "dashboard.compliance_rate": "Compliance Rate",
    
    // Tickets
    "tickets.title": "Tickets",
    "tickets.ticket_number": "Ticket Number",
    "tickets.driver": "Driver",
    "tickets.truck": "Truck",
    "tickets.material": "Material",
    "tickets.weight": "Weight",
    "tickets.gross_weight": "Gross Weight",
    "tickets.tare_weight": "Tare Weight",
    "tickets.net_weight": "Net Weight",
    "tickets.plant": "Plant",
    "tickets.date": "Date",
    "tickets.status": "Status",
    "tickets.confidence": "Confidence",
    "tickets.reconciliation": "Reconciliation",
    "tickets.bulk_actions": "Bulk Actions",
    
    // Drivers
    "drivers.title": "Drivers",
    "drivers.name": "Name",
    "drivers.phone": "Phone",
    "drivers.email": "Email",
    "drivers.license": "License",
    "drivers.cdl_expiration": "CDL Expiration",
    "drivers.medical_expiration": "Medical Expiration",
    "drivers.status": "Status",
    "drivers.assigned_truck": "Assigned Truck",
    
    // Fleet
    "fleet.title": "Fleet",
    "fleet.truck_number": "Truck Number",
    "fleet.vin": "VIN",
    "fleet.plate": "Plate",
    "fleet.make": "Make",
    "fleet.model": "Model",
    "fleet.year": "Year",
    "fleet.status": "Status",
    "fleet.last_inspection": "Last Inspection",
    "fleet.next_service": "Next Service",
    
    // Payroll
    "payroll.title": "Payroll",
    "payroll.week_ending": "Week Ending",
    "payroll.total_loads": "Total Loads",
    "payroll.total_tons": "Total Tons",
    "payroll.total_pay": "Total Pay",
    "payroll.deductions": "Deductions",
    "payroll.net_pay": "Net Pay",
    "payroll.settlement": "Settlement",
    
    // Compliance
    "compliance.title": "Compliance",
    "compliance.dvir": "DVIR",
    "compliance.hos": "Hours of Service",
    "compliance.ifta": "IFTA",
    "compliance.documents": "Documents",
    "compliance.expiring_soon": "Expiring Soon",
    "compliance.violations": "Violations",
    "compliance.compliant": "Compliant",
    "compliance.non_compliant": "Non-Compliant",
    
    // Finance
    "finance.title": "Finance",
    "finance.invoices": "Invoices",
    "finance.payments": "Payments",
    "finance.accounts_receivable": "Accounts Receivable",
    "finance.accounts_payable": "Accounts Payable",
    "finance.revenue": "Revenue",
    "finance.expenses": "Expenses",
    "finance.profit": "Profit",
    
    // Settings
    "settings.title": "Settings",
    "settings.profile": "Profile",
    "settings.organization": "Organization",
    "settings.integrations": "Integrations",
    "settings.notifications": "Notifications",
    "settings.security": "Security",
    "settings.language": "Language",
    "settings.timezone": "Timezone",
    
    // Messages
    "message.loading": "Loading...",
    "message.no_data": "No data available",
    "message.error": "An error occurred",
    "message.success": "Operation successful",
    "message.confirm_delete": "Are you sure you want to delete this item?",
    "message.unsaved_changes": "You have unsaved changes",
    "message.access_denied": "Access Denied",
    
    // Time
    "time.today": "Today",
    "time.yesterday": "Yesterday",
    "time.this_week": "This Week",
    "time.last_week": "Last Week",
    "time.this_month": "This Month",
    "time.last_month": "Last Month",
    "time.this_year": "This Year",
    
    // Units
    "unit.tons": "tons",
    "unit.miles": "miles",
    "unit.gallons": "gallons",
    "unit.hours": "hours",
    "unit.days": "days",
  },
  
  es: {
    // Navigation
    "nav.dashboard": "Panel de Control",
    "nav.tickets": "Boletas",
    "nav.drivers": "Conductores",
    "nav.fleet": "Flota",
    "nav.payroll": "Nómina",
    "nav.finance": "Finanzas",
    "nav.dispatch": "Despacho",
    "nav.reports": "Reportes",
    "nav.settings": "Configuración",
    "nav.compliance": "Cumplimiento",
    "nav.maintenance": "Mantenimiento",
    "nav.marketplace": "Mercado",
    "nav.hr": "Recursos Humanos",
    
    // Common actions
    "action.save": "Guardar",
    "action.cancel": "Cancelar",
    "action.delete": "Eliminar",
    "action.edit": "Editar",
    "action.add": "Agregar",
    "action.search": "Buscar",
    "action.filter": "Filtrar",
    "action.export": "Exportar",
    "action.import": "Importar",
    "action.submit": "Enviar",
    "action.approve": "Aprobar",
    "action.reject": "Rechazar",
    "action.view": "Ver",
    "action.download": "Descargar",
    "action.upload": "Subir",
    "action.refresh": "Actualizar",
    "action.close": "Cerrar",
    "action.back": "Atrás",
    "action.next": "Siguiente",
    "action.previous": "Anterior",
    
    // Status labels
    "status.active": "Activo",
    "status.inactive": "Inactivo",
    "status.pending": "Pendiente",
    "status.approved": "Aprobado",
    "status.rejected": "Rechazado",
    "status.completed": "Completado",
    "status.in_progress": "En Progreso",
    "status.overdue": "Vencido",
    "status.paid": "Pagado",
    "status.unpaid": "Sin Pagar",
    "status.invoiced": "Facturado",
    
    // Dashboard
    "dashboard.welcome": "Bienvenido",
    "dashboard.operations_center": "Centro de Operaciones",
    "dashboard.mission_control": "Control de Misión",
    "dashboard.total_loads": "Cargas Totales",
    "dashboard.active_drivers": "Conductores Activos",
    "dashboard.pending_tickets": "Boletas Pendientes",
    "dashboard.monthly_revenue": "Ingresos Mensuales",
    "dashboard.compliance_rate": "Tasa de Cumplimiento",
    
    // Tickets
    "tickets.title": "Boletas",
    "tickets.ticket_number": "Número de Boleta",
    "tickets.driver": "Conductor",
    "tickets.truck": "Camión",
    "tickets.material": "Material",
    "tickets.weight": "Peso",
    "tickets.gross_weight": "Peso Bruto",
    "tickets.tare_weight": "Peso Tara",
    "tickets.net_weight": "Peso Neto",
    "tickets.plant": "Planta",
    "tickets.date": "Fecha",
    "tickets.status": "Estado",
    "tickets.confidence": "Confianza",
    "tickets.reconciliation": "Conciliación",
    "tickets.bulk_actions": "Acciones Masivas",
    
    // Drivers
    "drivers.title": "Conductores",
    "drivers.name": "Nombre",
    "drivers.phone": "Teléfono",
    "drivers.email": "Correo Electrónico",
    "drivers.license": "Licencia",
    "drivers.cdl_expiration": "Vencimiento de CDL",
    "drivers.medical_expiration": "Vencimiento Médico",
    "drivers.status": "Estado",
    "drivers.assigned_truck": "Camión Asignado",
    
    // Fleet
    "fleet.title": "Flota",
    "fleet.truck_number": "Número de Camión",
    "fleet.vin": "VIN",
    "fleet.plate": "Placa",
    "fleet.make": "Marca",
    "fleet.model": "Modelo",
    "fleet.year": "Año",
    "fleet.status": "Estado",
    "fleet.last_inspection": "Última Inspección",
    "fleet.next_service": "Próximo Servicio",
    
    // Payroll
    "payroll.title": "Nómina",
    "payroll.week_ending": "Semana que Termina",
    "payroll.total_loads": "Cargas Totales",
    "payroll.total_tons": "Toneladas Totales",
    "payroll.total_pay": "Pago Total",
    "payroll.deductions": "Deducciones",
    "payroll.net_pay": "Pago Neto",
    "payroll.settlement": "Liquidación",
    
    // Compliance
    "compliance.title": "Cumplimiento",
    "compliance.dvir": "DVIR",
    "compliance.hos": "Horas de Servicio",
    "compliance.ifta": "IFTA",
    "compliance.documents": "Documentos",
    "compliance.expiring_soon": "Por Vencer",
    "compliance.violations": "Violaciones",
    "compliance.compliant": "En Cumplimiento",
    "compliance.non_compliant": "Sin Cumplimiento",
    
    // Finance
    "finance.title": "Finanzas",
    "finance.invoices": "Facturas",
    "finance.payments": "Pagos",
    "finance.accounts_receivable": "Cuentas por Cobrar",
    "finance.accounts_payable": "Cuentas por Pagar",
    "finance.revenue": "Ingresos",
    "finance.expenses": "Gastos",
    "finance.profit": "Ganancia",
    
    // Settings
    "settings.title": "Configuración",
    "settings.profile": "Perfil",
    "settings.organization": "Organización",
    "settings.integrations": "Integraciones",
    "settings.notifications": "Notificaciones",
    "settings.security": "Seguridad",
    "settings.language": "Idioma",
    "settings.timezone": "Zona Horaria",
    
    // Messages
    "message.loading": "Cargando...",
    "message.no_data": "No hay datos disponibles",
    "message.error": "Ocurrió un error",
    "message.success": "Operación exitosa",
    "message.confirm_delete": "¿Está seguro de que desea eliminar este elemento?",
    "message.unsaved_changes": "Tiene cambios sin guardar",
    "message.access_denied": "Acceso Denegado",
    
    // Time
    "time.today": "Hoy",
    "time.yesterday": "Ayer",
    "time.this_week": "Esta Semana",
    "time.last_week": "Semana Pasada",
    "time.this_month": "Este Mes",
    "time.last_month": "Mes Pasado",
    "time.this_year": "Este Año",
    
    // Units
    "unit.tons": "toneladas",
    "unit.miles": "millas",
    "unit.gallons": "galones",
    "unit.hours": "horas",
    "unit.days": "días",
  },
} as const;

// Get translation for a key
export function t(key: TranslationKey, locale: Locale = defaultLocale): string {
  return translations[locale][key] || translations[defaultLocale][key] || key;
}

// Format number with locale
export function formatNumber(value: number, locale: Locale = defaultLocale): string {
  const localeCode = locale === "es" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(localeCode).format(value);
}

// Format currency with locale
export function formatCurrency(value: number, locale: Locale = defaultLocale, currency: string = "USD"): string {
  const localeCode = locale === "es" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(localeCode, {
    style: "currency",
    currency: currency,
  }).format(value);
}

// Format date with locale
export function formatDate(date: Date | string, locale: Locale = defaultLocale, options?: Intl.DateTimeFormatOptions): string {
  const localeCode = locale === "es" ? "es-MX" : "en-US";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(localeCode, options || {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj);
}

// Format relative time
export function formatRelativeTime(date: Date | string, locale: Locale = defaultLocale): string {
  const localeCode = locale === "es" ? "es-MX" : "en-US";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const rtf = new Intl.RelativeTimeFormat(localeCode, { numeric: "auto" });
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return rtf.format(-diffMinutes, "minute");
    }
    return rtf.format(-diffHours, "hour");
  } else if (diffDays < 7) {
    return rtf.format(-diffDays, "day");
  } else if (diffDays < 30) {
    return rtf.format(-Math.floor(diffDays / 7), "week");
  } else if (diffDays < 365) {
    return rtf.format(-Math.floor(diffDays / 30), "month");
  } else {
    return rtf.format(-Math.floor(diffDays / 365), "year");
  }
}
