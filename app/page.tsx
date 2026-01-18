"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function LandingPage() {
  return (
    <Suspense fallback={<div />}>
      <LandingPageContent />
    </Suspense>
  );
}

function LandingPageContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState("all");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const searchParams = useSearchParams();
  const [profitLeakOpen, setProfitLeakOpen] = useState(false);
  const [profitLeakInputs, setProfitLeakInputs] = useState({
    fleetSize: 10,
    loadsPerWeek: 15,
    avgLoadValue: 850,
    emptyMiles: 14,
  });
  const [roiInputs, setRoiInputs] = useState({
    loadsPerDay: 45,
    avgValuePerLoad: 420,
    discrepancyPct: 4,
    manualHoursPerDay: 2,
    missedAccessorialPct: 2,
  });
  const [activeLoadFilter, setActiveLoadFilter] = useState("active");
  const [loadSearch, setLoadSearch] = useState("");
  const [loadSort, setLoadSort] = useState("newest");
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(true);
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
  const [activeLoadTab, setActiveLoadTab] = useState("overview");
  const [selectedLoadIds, setSelectedLoadIds] = useState<string[]>([]);
  const [actionToast, setActionToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [liveTracking, setLiveTracking] = useState<{
    lat: number;
    lng: number;
    updatedAt?: string;
    speed?: number;
    label?: string;
  } | null>(null);
  const [isInvoicing, setIsInvoicing] = useState(false);

  const copy = {
    en: {
      navPitToPay: "Pit-to-Pay",
      navPits: "Pits & Quarries",
      navDump: "Dump Truck Fleets",
      navModules: "Modules",
      navOnboarding: "Onboarding",
      navPricing: "Pricing",
      navAudit: "Audit Shield",
      navDemo: "Get Demo",
      choosePathTitle: "What best describes your business?",
      choosePathSubtitle: "Pick the path that fits you. You’ll land on a tailored page.",
      choosePathPits: "I haul Aggregates / Run a Quarry",
      choosePathDump: "I run a Dump Truck or Heavy Haul Fleet",
      choosePathCrossBorder: "I run Cross‑Border (US‑Mexico) Operations",
      choosePathGeneral: "I run General Freight / Trucking / 3PL",
      heroBadge: "BUSINESS PROCESS SOLUTION",
      heroTitle: "Stop Losing Time and Money on Manual Haul Tracking",
      heroSub: "We automate your 3 biggest operational headaches—Excel tickets, pit reconciliations, and driver payroll.",
      heroBody1:
        "MoveAround is a business process solution that replaces spreadsheet chaos with a connected workflow: Excel → digital ticket, pit invoice matching, and payroll export.",
      heroBody2:
        "Powered by a modern, easy-to-use TMS built specifically for aggregate and dump truck fleets.",
      heroBody3:
        "Prove it fast: run the 3‑module demo and see the whole workflow in under 5 minutes.",
      heroCtaPrimary: "Get ROI Analysis",
      heroCtaSecondary: "See Pit-to-Pay",
      pitsTitle: "For Aggregate & Bulk Material Haulers",
      pitsSubtitle:
        "Ticket matching, short loads, scale fraud, and production tracking—handled end‑to‑end.",
      dumpTitle: "For Dump Truck Fleets",
      dumpSubtitle:
        "A TMS built for the unique chaos of dump trucking—connecting pits, jobsites, and load boards.",
      demoTitle: "Don’t Watch a Generic Demo. Experience Yours.",
      demoSubtitle: "Select your biggest profit leak and jump to the exact solution.",
      pricingTitle: "Pricing: Business Process Solution",
      pricingSubtitle: "Value-based pricing per truck, per month",
      pricingNoContract: "No long‑term contracts. Cancel anytime.",
      demoMenuTitle: "Request a Demo Menu",
      demoMenuSubtitle: "Choose the session that matches your operation and get an instant asset when you book.",
      demoMenuCta: "Book This Demo",
      demoMenuForLabel: "For",
      demoMenuAssetLabel: "Instant asset",
    },
    es: {
      navPitToPay: "Pit‑to‑Pay",
      navPits: "Canteras y Agregados",
      navDump: "Flotas de Volteo",
      navModules: "Módulos",
      navOnboarding: "Implementación",
      navPricing: "Precios",
      navAudit: "Audit Shield",
      navDemo: "Solicitar Demo",
      choosePathTitle: "¿Cuál describe mejor tu negocio?",
      choosePathSubtitle: "Elige tu ruta y verás una página hecha para ti.",
      choosePathPits: "Transporto agregados / Opero una cantera",
      choosePathDump: "Opero una flota de volteo o carga pesada",
      choosePathCrossBorder: "Opero cruces fronterizos (EE. UU.‑México)",
      choosePathGeneral: "Opero carga general / transporte / 3PL",
      heroBadge: "SOLUCIÓN DE PROCESOS DE NEGOCIO",
      heroTitle: "Deja de perder tiempo y dinero con el control manual",
      heroSub: "Automatizamos 3 dolores clave: Excel→tickets, conciliación de pit y nómina.",
      heroBody1:
        "MoveAround es una solución de procesos que conecta todo: Excel → ticket digital → conciliación → exportación de nómina.",
      heroBody2:
        "Impulsado por un TMS moderno y fácil de usar, diseñado para flotas de volteo y agregados.",
      heroBody3:
        "Compruébalo rápido con el demo de 3 módulos en menos de 5 minutos.",
      heroCtaPrimary: "Obtener ROI",
      heroCtaSecondary: "Ver Pit‑to‑Pay",
      pitsTitle: "Para Canteras y Materiales a Granel",
      pitsSubtitle:
        "Ticket matching, cargas cortas, fraude en báscula y producción—todo de punta a punta.",
      dumpTitle: "Para Flotas de Volteo",
      dumpSubtitle:
        "Un TMS para el caos del volteo—conecta canteras, obras y bolsas de carga.",
      demoTitle: "No veas un demo genérico. Vive el tuyo.",
      demoSubtitle: "Selecciona tu mayor fuga de utilidad y ve la solución exacta.",
      pricingTitle: "Precios: Solución de Procesos",
      pricingSubtitle: "Precio por camión, por mes",
      pricingNoContract: "Sin contratos a largo plazo. Cancela cuando quieras.",
      demoMenuTitle: "Menú de Demos",
      demoMenuSubtitle: "Elige la sesión ideal y recibe un recurso al agendar.",
      demoMenuCta: "Agendar Demo",
      demoMenuForLabel: "Para",
      demoMenuAssetLabel: "Recurso inmediato",
    },
  } as const;

  const t = (key: keyof typeof copy.en) => copy[language][key];

  useEffect(() => {
    const paramLang = searchParams.get("lang");
    const storedLang =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("sales_lang") as "en" | "es" | null)
        : null;
    const nextLang = paramLang === "en" || paramLang === "es" ? paramLang : storedLang;
    if (nextLang && nextLang !== language) {
      setLanguage(nextLang);
    }
  }, [searchParams, language]);

  const setLanguageAndPersist = (next: "en" | "es") => {
    setLanguage(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem("sales_lang", next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", url.toString());
  };
  const demoMenuOptions =
    language === "es"
      ? [
          {
            title: "Auditoría de Fugas de Ganancia",
            forWho: "Flotas de Volteo",
            asset: "Checklist de 5 puntos de utilidad (PDF)",
            subject: "Solicitud de Demo: Auditoría de Fugas",
          },
          {
            title: "Análisis Pit‑to‑Pay",
            forWho: "Transportistas de Agregados",
            asset: "Autoevaluación de báscula (Hoja de trabajo)",
            subject: "Solicitud de Demo: Pit‑to‑Pay",
          },
          {
            title: "Briefing de Estrategia Fronteriza",
            forWho: "Operaciones Cross‑Border",
            asset: "Guía SAT 2024 (PDF)",
            subject: "Solicitud de Demo: Estrategia Fronteriza",
          },
          {
            title: "Consulta General de ROI",
            forWho: "Carga General / 3PL",
            asset: "Calculadora ROI TMS (Excel)",
            subject: "Solicitud de Demo: ROI General",
          },
        ]
      : [
          {
            title: "The Profit Leak Audit",
            forWho: "Dump Truck Fleets",
            asset: "The 5‑Point Fleet Profit Checklist (PDF)",
            subject: "Profit Leak Audit Demo Request",
          },
          {
            title: "The Pit‑to‑Pay Analysis",
            forWho: "Aggregate Haulers",
            asset: "Scale House Efficiency Self‑Audit (Worksheet)",
            subject: "Pit‑to‑Pay Analysis Demo Request",
          },
          {
            title: "The Border Strategy Briefing",
            forWho: "Cross‑Border Ops",
            asset: "2024 SAT Compliance Update Cheat Sheet (PDF)",
            subject: "Border Strategy Briefing Request",
          },
          {
            title: "General ROI Consultation",
            forWho: "General Freight / 3PL",
            asset: "TMS ROI Calculator (Excel)",
            subject: "General ROI Consultation Request",
          },
        ];

  const demoFlowSteps =
    language === "es"
      ? [
          {
            title: "Módulo 1: Excel → Ticket",
            description: "Sube tu Excel y crea un ticket oficial en minutos.",
          },
          {
            title: "Módulo 2: Ticket de báscula → Reconciliación",
            description: "Sube la factura del pit y ve el mismatch resaltado.",
          },
          {
            title: "Módulo 3: Ticket aprobado → QuickBooks",
            description: "El ticket aprobado se exporta directo al payroll.",
          },
        ]
      : [
          {
            title: "Module 1: Excel → Ticket",
            description: "Upload your Excel and see a clean ticket created.",
          },
          {
            title: "Module 2: Pit Invoice → Match",
            description: "Upload a pit invoice and watch mismatches flag instantly.",
          },
          {
            title: "Module 3: Approved Ticket → QuickBooks",
            description: "That approved ticket flows into payroll export.",
          },
        ];

  const loadRows = [
    {
      id: "LD-4021",
      createdAt: "2025-05-17T07:15:00",
      dateLabel: "05/17",
      timeLabel: "07:15",
      customer: "Jones Const",
      project: "Main St Project",
      driver: "D. Perez",
      truck: "#12",
      driverPhone: "+15550100121",
      customerId: "123",
      material: "15yd Gravel",
      materialDetail: '3/4" Clean',
      status: "IN TRANSIT",
      statusType: "in-transit",
      statusGroup: "active",
      statusNote: "ETA: 14 min",
      from: "Pit 7",
      to: "I-45 Jobsite",
      currentLocation: {
        lat: 29.7604,
        lng: -95.3698,
        label: "I-45 N, Exit 48",
        speed: 42,
        updatedAt: "2 minutes ago",
      },
      value: 855,
      valueNote: "Paid: Net 30",
      etaMinutes: 14,
    },
    {
      id: "LD-4032",
      createdAt: "2025-05-17T08:30:00",
      dateLabel: "05/17",
      timeLabel: "08:30",
      customer: "Thompson Co",
      project: "Oakridge Site",
      driver: "UNASSIGNED",
      truck: "",
      driverPhone: "",
      customerId: "456",
      material: "10yd Topsoil",
      materialDetail: "",
      status: "AVAILABLE",
      statusType: "available",
      statusGroup: "available",
      statusNote: "Ready to assign",
      from: "Pit 3",
      to: "Oakridge",
      currentLocation: {
        lat: 29.7499,
        lng: -95.3584,
        label: "Dispatch Queue",
      },
      value: 425,
      valueNote: "Per load",
      etaMinutes: null,
    },
    {
      id: "LD-4018",
      createdAt: "2025-05-16T10:45:00",
      dateLabel: "05/16",
      timeLabel: "10:45",
      customer: "City Project",
      project: "",
      driver: "M. Chen",
      truck: "#07",
      driverPhone: "+15550100118",
      customerId: "789",
      material: "18yd Road Base",
      materialDetail: "",
      status: "COMPLETED",
      statusType: "completed",
      statusGroup: "completed",
      statusNote: "Signed 05/16",
      from: "Delivered",
      to: "10:45 AM",
      currentLocation: {
        lat: 29.731,
        lng: -95.366,
        label: "Delivered",
      },
      value: 720,
      valueNote: "Invoiced",
      etaMinutes: null,
    },
    {
      id: "LD-4038",
      createdAt: "2025-05-17T06:10:00",
      dateLabel: "05/17",
      timeLabel: "06:10",
      customer: "Riverton Builders",
      project: "South Loop",
      driver: "K. Alston",
      truck: "#23",
      driverPhone: "+15550100123",
      customerId: "654",
      material: "12yd Fill Sand",
      materialDetail: "",
      status: "AT SITE",
      statusType: "active",
      statusGroup: "active",
      statusNote: "Waiting to unload",
      from: "Yard A",
      to: "South Loop",
      currentLocation: {
        lat: 29.7201,
        lng: -95.4302,
        label: "South Loop Site",
        speed: 0,
        updatedAt: "6 minutes ago",
      },
      value: 610,
      valueNote: "Paid: Net 15",
      etaMinutes: 0,
    },
    {
      id: "LD-4025",
      createdAt: "2025-05-17T05:45:00",
      dateLabel: "05/17",
      timeLabel: "05:45",
      customer: "Thompson Co",
      project: "Thompson Co Site",
      driver: "S. Grant",
      truck: "#18",
      driverPhone: "+15550100125",
      customerId: "456",
      material: "14yd Base",
      materialDetail: "",
      status: "DETENTION",
      statusType: "detention",
      statusGroup: "detention",
      statusNote: "45 min elapsed",
      from: "Pit 7",
      to: "Thompson Co Site",
      currentLocation: {
        lat: 29.7432,
        lng: -95.4043,
        label: "Thompson Co Site",
        speed: 0,
        updatedAt: "3 minutes ago",
      },
      value: 780,
      valueNote: "Detention eligible",
      etaMinutes: null,
    },
    {
      id: "LD-4030",
      createdAt: "2025-05-17T06:25:00",
      dateLabel: "05/17",
      timeLabel: "06:25",
      customer: "Riverside Site",
      project: "",
      driver: "L. Owens",
      truck: "#19",
      driverPhone: "+15550100129",
      customerId: "882",
      material: "16yd Gravel",
      materialDetail: "",
      status: "WARNING",
      statusType: "warning",
      statusGroup: "detention",
      statusNote: "10 min until charges",
      from: "Pit 5",
      to: "Riverside",
      currentLocation: {
        lat: 29.775,
        lng: -95.392,
        label: "Riverside",
        speed: 12,
        updatedAt: "1 minute ago",
      },
      value: 690,
      valueNote: "Net 30",
      etaMinutes: 10,
    },
    {
      id: "LD-3995",
      createdAt: "2025-05-15T15:20:00",
      dateLabel: "05/15",
      timeLabel: "15:20",
      customer: "Westline Haul",
      project: "Loop 8",
      driver: "A. Ellis",
      truck: "#04",
      driverPhone: "+15550100104",
      customerId: "991",
      material: "20yd Road Base",
      materialDetail: "",
      status: "CANCELLED",
      statusType: "cancelled",
      statusGroup: "cancelled",
      statusNote: "Cancelled by customer",
      from: "Pit 2",
      to: "Loop 8",
      currentLocation: {
        lat: 29.7809,
        lng: -95.347,
        label: "Pit 2",
      },
      value: 560,
      valueNote: "No charge",
      etaMinutes: null,
    },
  ];

  const detentionAlerts = [
    {
      id: "LD-4025",
      title: "LD-4025 - Thompson Co Site",
      time: "45 min elapsed",
      details: ["Driver: S. Grant | Truck #18", "Free time ended 15 min ago"],
      variant: "danger",
      actions: [
        { label: "CHARGE $75", variant: "warning", tab: "payment" },
        { label: "CONTACT SITE", variant: "secondary", tab: "overview" },
      ],
    },
    {
      id: "LD-4030",
      title: "LD-4030 - Riverside Site",
      time: "35 min elapsed",
      details: ["10 min until detention charges apply"],
      variant: "warning",
      actions: [{ label: "NOTIFY DRIVER", variant: "secondary", tab: "tracking" }],
    },
  ];

  const loadCounts = loadRows.reduce(
    (acc, load) => {
      acc[load.statusGroup] += 1;
      return acc;
    },
    {
      active: 0,
      available: 0,
      completed: 0,
      cancelled: 0,
      detention: 0,
    }
  );

  const normalizedSearch = loadSearch.trim().toLowerCase();
  const filteredLoads = loadRows.filter((load) => {
    const matchesFilter = load.statusGroup === activeLoadFilter;
    if (!matchesFilter) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }
    const haystack = [
      load.id,
      load.customer,
      load.project,
      load.driver,
      load.truck,
      load.material,
      load.from,
      load.to,
      load.status,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  const sortedLoads = [...filteredLoads].sort((a, b) => {
    switch (loadSort) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "customer":
        return a.customer.localeCompare(b.customer);
      case "value":
        return b.value - a.value;
      case "eta": {
        const aEta = a.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        const bEta = b.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        return aEta - bEta;
      }
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const visibleLoadIds = sortedLoads.map((load) => load.id);
  const allVisibleSelected =
    visibleLoadIds.length > 0 && visibleLoadIds.every((id) => selectedLoadIds.includes(id));
  const selectedLoad = loadRows.find((load) => load.id === selectedLoadId) ?? loadRows[0];
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const fallbackLocation = selectedLoad?.currentLocation;
  const trackingLat = liveTracking?.lat ?? fallbackLocation?.lat;
  const trackingLng = liveTracking?.lng ?? fallbackLocation?.lng;
  const trackingLabel = liveTracking?.label ?? fallbackLocation?.label ?? "Unknown location";
  const trackingSpeed = liveTracking?.speed ?? fallbackLocation?.speed;
  const trackingUpdated = liveTracking?.updatedAt ?? fallbackLocation?.updatedAt ?? "—";
  const mapQuery = trackingLat !== undefined && trackingLng !== undefined ? `${trackingLat},${trackingLng}` : "";
  const mapSrc = mapQuery
    ? googleMapsKey
      ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${encodeURIComponent(mapQuery)}`
      : `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`
    : "";

  useEffect(() => {
    if (!actionToast) {
      return undefined;
    }
    const timer = window.setTimeout(() => setActionToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [actionToast]);

  useEffect(() => {
    if (!selectedLoadId || activeLoadTab !== "tracking") {
      return;
    }

    const load = loadRows.find((item) => item.id === selectedLoadId);
    if (!load) {
      return;
    }

    let isMounted = true;
    setIsTrackingLoading(true);
    setTrackingError(null);
    setLiveTracking(null);

    fetch(`/api/load-hub/telemetry?driver=${encodeURIComponent(load.driver)}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Telematics unavailable");
        }
        const matches = (payload.locations || []) as Array<{
          name?: string;
          lat?: number;
          lon?: number;
          status?: string;
          updatedAt?: string;
        }>;
        const match = matches.find((item) =>
          item.name?.toLowerCase().includes(load.driver.toLowerCase())
        );

        if (!match || match.lat === undefined || match.lon === undefined) {
          throw new Error("No live location found");
        }

        if (isMounted) {
          setLiveTracking({
            lat: match.lat,
            lng: match.lon,
            updatedAt: match.updatedAt,
            label: match.status,
          });
        }
      })
      .catch((error: Error) => {
        if (isMounted) {
          setTrackingError(error.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsTrackingLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeLoadTab, selectedLoadId]);

  const toggleLoadSelection = (loadId: string) => {
    setSelectedLoadIds((prev) =>
      prev.includes(loadId) ? prev.filter((id) => id !== loadId) : [...prev, loadId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedLoadIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleLoadIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleLoadIds]));
    });
  };

  const openLoadModal = (loadId: string, tab: string = "overview") => {
    setSelectedLoadId(loadId);
    setActiveLoadTab(tab);
  };

  const notifyAction = (type: "success" | "error" | "info", message: string) => {
    setActionToast({ type, message });
  };

  const sendLoadMessage = async (loadId: string) => {
    const load = loadRows.find((row) => row.id === loadId);
    if (!load?.driverPhone) {
      notifyAction("error", "Driver phone number missing. Add it to send SMS.");
      return;
    }

    notifyAction("info", `Sending SMS to ${load.driver}...`);
    try {
      const res = await fetch("/api/load-hub/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: load.driverPhone,
          body: `Load ${load.id}: Please confirm status and ETA.`,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "SMS send failed");
      }
      notifyAction("success", `SMS delivered to ${load.driver}.`);
    } catch (error: any) {
      notifyAction("error", error.message || "SMS send failed");
    }
  };

  const createQuickBooksInvoice = async () => {
    if (!selectedLoadId) {
      return;
    }
    const load = loadRows.find((row) => row.id === selectedLoadId);
    if (!load?.customerId) {
      notifyAction("error", "Customer QuickBooks ID missing.");
      return;
    }

    setIsInvoicing(true);
    notifyAction("info", "Creating QuickBooks invoice...");
    try {
      const res = await fetch("/api/load-hub/quickbooks/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: load.customerId,
          amount: load.value,
          docNumber: load.id,
          lineDescription: `${load.material} • ${load.from} → ${load.to}`,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "QuickBooks invoice failed");
      }
      notifyAction("success", "QuickBooks invoice created.");
    } catch (error: any) {
      notifyAction("error", error.message || "QuickBooks invoice failed");
    } finally {
      setIsInvoicing(false);
    }
  };

  const focusLoadSearch = () => {
    const input = document.getElementById("loadSearch");
    if (input instanceof HTMLInputElement) {
      input.focus();
    }
  };

  const hourlyRate = 30;
  const annualRevenue =
    roiInputs.loadsPerDay * roiInputs.avgValuePerLoad * 260;
  const recoveredTonnageRevenue =
    roiInputs.loadsPerDay *
    (roiInputs.discrepancyPct / 100) *
    roiInputs.avgValuePerLoad *
    260;
  const annualLaborSavings =
    roiInputs.manualHoursPerDay * hourlyRate * 260;
  const recoveredAccessorials =
    annualRevenue * (roiInputs.missedAccessorialPct / 100);
  const annualTotalSavings =
    recoveredTonnageRevenue + annualLaborSavings + recoveredAccessorials;

  const profitLeakMetrics = (() => {
    const trucks = Number(profitLeakInputs.fleetSize || 0);
    const loads = Number(profitLeakInputs.loadsPerWeek || 0);
    const loadValue = Number(profitLeakInputs.avgLoadValue || 0);
    const emptyMilesPercent = Number(profitLeakInputs.emptyMiles || 0);
    const monthlyLoads = trucks * loads * 4.33;
    const monthlyRevenue = monthlyLoads * loadValue;
    const emptyMilesLoss = monthlyRevenue * (emptyMilesPercent / 100) * 0.45;
    const billingErrorsLoss = monthlyRevenue * 0.03;
    const adminTimeLoss = trucks * 40 * 35 + loads * 0.5 * 35;
    const detentionLoss = monthlyLoads * 0.3 * 75;
    const totalMonthlyLoss = emptyMilesLoss + billingErrorsLoss + adminTimeLoss + detentionLoss;
    const totalAnnualLoss = totalMonthlyLoss * 12;
    const emptyMilesSavings = emptyMilesLoss * 0.35;
    const billingSavings = billingErrorsLoss * 0.75;
    const adminSavings = adminTimeLoss * 0.5;
    const detentionSavings = detentionLoss * 0.8;
    const totalMonthlySavings = emptyMilesSavings + billingSavings + adminSavings + detentionSavings;
    const monthlyCost = 3000;
    const annualSavings = totalMonthlySavings * 12;
    const annualCost = monthlyCost * 12;
    const roi = annualCost ? ((annualSavings - annualCost) / annualCost) * 100 : 0;
    return {
      emptyMilesLoss,
      billingErrorsLoss,
      adminTimeLoss,
      detentionLoss,
      totalMonthlyLoss,
      totalAnnualLoss,
      totalMonthlySavings,
      roi,
    };
  })();

  const formatMoney = (value: number) =>
    Math.round(value || 0).toLocaleString("en-US");

  return (
    <div className="landing-performance">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700;800;900&display=swap");
        @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");

        :root {
          --bulletproof-black: #080808;
          --carbon-fiber: #121212;
          --titanium-gray: #1e1e1e;
          --hyper-yellow: #ffd700;
          --racing-silver: #c0c0c0;
          --performance-red: #ff2800;
          --speed-white: #ffffff;
          --turbo-blue: #00b4ff;
          --chrome-accent: #e8e8e8;
          --kevlar-gray: #2a2a2a;
          --success-green: #00ff9d;

          --gradient-performance: linear-gradient(
            135deg,
            #ffd700 0%,
            #c0c0c0 50%,
            #00b4ff 100%
          );
          --gradient-bulletproof: linear-gradient(
            135deg,
            rgba(255, 215, 0, 0.15),
            rgba(0, 180, 255, 0.1)
          );
          --gradient-speed: linear-gradient(90deg, #ffd700, #ff2800);
          --gradient-success: linear-gradient(90deg, #00ff9d, #00b4ff);

          --shadow-performance: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          --shadow-bulletproof: 0 0 60px rgba(255, 215, 0, 0.4);
          --shadow-chrome: 0 15px 50px rgba(232, 232, 232, 0.25);
          --shadow-speed: 0 0 40px rgba(255, 40, 0, 0.3);

          --border-performance: 1px solid rgba(255, 215, 0, 0.3);
          --border-bulletproof: 2px solid rgba(0, 180, 255, 0.2);

          --radius-sharp: 4px;
          --radius-performance: 8px;
          --radius-smooth: 16px;
          --radius-pill: 100px;

          --speed-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .landing-performance {
          font-family: "Montserrat", sans-serif;
          background-color: var(--bulletproof-black);
          color: var(--speed-white);
          line-height: 1.7;
          overflow-x: hidden;
          background: linear-gradient(145deg, #080808 0%, #121212 100%),
            radial-gradient(
              circle at 0% 0%,
              rgba(255, 215, 0, 0.05) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(0, 180, 255, 0.05) 0%,
              transparent 50%
            );
          position: relative;
        }

        .landing-performance::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
              45deg,
              transparent 0%,
              rgba(255, 40, 0, 0.02) 100%
            ),
            radial-gradient(
              circle at 80% 20%,
              rgba(0, 180, 255, 0.03) 0%,
              transparent 70%
            );
          z-index: -1;
          pointer-events: none;
          animation: pulseSpeed 4s ease-in-out infinite alternate;
        }

        @keyframes pulseSpeed {
          0% {
            opacity: 0.3;
          }
          100% {
            opacity: 0.7;
          }
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          font-family: "Space Grotesk", sans-serif;
          font-weight: 900;
          letter-spacing: -0.03em;
          line-height: 1.05;
        }

        h1 {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: -0.04em;
        }

        h2 {
          font-size: 3.5rem;
          margin-bottom: 1rem;
        }

        h3 {
          font-size: 2rem;
          margin-bottom: 0.75rem;
        }

        .speed-gradient {
          background: var(--gradient-speed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .performance-gradient {
          background: var(--gradient-performance);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        p {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 1.5rem;
          line-height: 1.8;
          font-weight: 400;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
        }

        section {
          padding: 120px 0;
          position: relative;
          overflow: hidden;
        }

        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(8, 8, 8, 0.98);
          backdrop-filter: blur(20px);
          z-index: 1000;
          padding: 15px 0;
          border-bottom: var(--border-bulletproof);
          box-shadow: 0 5px 30px rgba(0, 0, 0, 0.8);
        }

        .navbar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          position: relative;
        }

        .logo-icon {
          width: 52px;
          height: 52px;
          background: var(--gradient-performance);
          border-radius: var(--radius-performance);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: var(--bulletproof-black);
          font-size: 26px;
          font-family: "Space Grotesk", sans-serif;
          position: relative;
          overflow: hidden;
        }

        .logo-icon::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255, 255, 255, 0.2) 50%,
            transparent 70%
          );
          animation: shine 3s infinite;
        }

        .logo-text {
          font-size: 2rem;
          font-weight: 900;
          background: var(--gradient-performance);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-family: "Space Grotesk", sans-serif;
          letter-spacing: -1px;
        }

        .nav-links {
          display: flex;
          gap: 48px;
          align-items: center;
        }

        .nav-link {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: var(--speed-transition);
          position: relative;
          padding: 8px 0;
        }

        .nav-link::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--gradient-speed);
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-link:hover {
          color: var(--speed-white);
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .nav-cta {
          background: var(--gradient-speed);
          color: var(--speed-white);
          padding: 14px 32px;
          border-radius: var(--radius-pill);
          font-weight: 900;
          font-size: 0.9rem;
          transition: var(--speed-transition);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border: none;
        }

        .nav-cta:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-speed);
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          z-index: 1001;
        }

        .hero {
          padding-top: 180px;
          padding-bottom: 150px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(
              145deg,
              rgba(8, 8, 8, 0.9),
              rgba(18, 18, 18, 0.95)
            ),
            radial-gradient(
              circle at 20% 30%,
              rgba(255, 215, 0, 0.1) 0%,
              transparent 60%
            );
        }

        .hero::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          background: radial-gradient(
              circle at 30% 40%,
              rgba(255, 215, 0, 0.15) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 70% 60%,
              rgba(255, 40, 0, 0.1) 0%,
              transparent 50%
            );
          animation: pulse 8s ease-in-out infinite alternate;
          z-index: -1;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 100px;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 215, 0, 0.1);
          color: var(--hyper-yellow);
          padding: 14px 28px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 40px;
          border: var(--border-performance);
          backdrop-filter: blur(10px);
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }

        .hero-cta {
          display: flex;
          gap: 24px;
          margin-top: 60px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 20px 48px;
          border-radius: var(--radius-performance);
          font-weight: 900;
          font-size: 1rem;
          text-decoration: none;
          transition: var(--speed-transition);
          cursor: pointer;
          border: none;
          gap: 14px;
          position: relative;
          overflow: hidden;
          font-family: "Space Grotesk", sans-serif;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: 0.6s;
        }

        .btn:hover::before {
          left: 100%;
        }

        .btn-primary {
          background: var(--gradient-speed);
          color: var(--speed-white);
          box-shadow: var(--shadow-speed);
        }

        .btn-primary:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(255, 40, 0, 0.4);
        }
        .btn-primary:active {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(255, 120, 80, 0.35);
        }

        .btn-secondary {
          background: transparent;
          color: var(--speed-white);
          border: 2px solid rgba(255, 215, 0, 0.4);
          backdrop-filter: blur(10px);
        }

        .btn-secondary:hover {
          border-color: var(--hyper-yellow);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(255, 215, 0, 0.3);
        }
        .btn-secondary:active {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(255, 215, 0, 0.2);
        }

        .btn:focus-visible,
        .nav-cta:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18);
        }

        .profit-leak-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(5, 5, 5, 0.65);
          backdrop-filter: blur(6px);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .profit-leak-modal {
          width: min(1000px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: rgba(18, 18, 18, 0.95);
          border-radius: 20px;
          border: 1px solid rgba(255, 215, 0, 0.18);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
          padding: 28px;
        }
        .profit-leak-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 215, 0, 0.2);
        }
        .profit-leak-title {
          font-size: 2rem;
          font-weight: 800;
        }
        .profit-leak-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.95rem;
        }
        .profit-leak-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
          margin-top: 24px;
        }
        .profit-leak-panel {
          background: rgba(30, 30, 30, 0.7);
          border-radius: 16px;
          border: 1px solid rgba(255, 215, 0, 0.16);
          padding: 20px;
        }
        .profit-leak-input {
          display: grid;
          gap: 8px;
          margin-bottom: 18px;
          color: rgba(255, 255, 255, 0.85);
        }
        .profit-leak-input input[type="number"] {
          background: rgba(18, 18, 18, 0.8);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 10px;
          padding: 10px 12px;
          color: #fff;
        }
        .profit-leak-range {
          width: 100%;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 215, 0, 0.2);
        }
        .profit-leak-range::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--hyper-yellow);
          cursor: pointer;
        }
        .profit-leak-metric {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 215, 0, 0.15);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .profit-leak-metric strong {
          display: block;
          font-size: 1.6rem;
          color: var(--hyper-yellow);
        }
        .profit-leak-metric.loss strong {
          color: #ff6b6b;
        }
        .profit-leak-metric.savings strong {
          color: var(--success-green);
        }
        .profit-leak-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        .profit-leak-breakdown div {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 12px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .profit-leak-cta {
          margin-top: 18px;
          width: 100%;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .dashboard-preview {
          background: linear-gradient(
            145deg,
            rgba(30, 30, 30, 0.9),
            rgba(18, 18, 18, 0.7)
          );
          border-radius: var(--radius-smooth);
          overflow: hidden;
          box-shadow: var(--shadow-performance);
          border: var(--border-performance);
          backdrop-filter: blur(30px);
          transform: perspective(1500px) rotateY(-10deg) rotateX(5deg);
          transition: var(--speed-transition);
          position: relative;
        }

        .dashboard-preview:hover {
          transform: perspective(1500px) rotateY(-5deg) rotateX(3deg);
          box-shadow: var(--shadow-bulletproof);
        }

        .dashboard-header {
          background: rgba(30, 30, 30, 0.95);
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: var(--border-performance);
        }

        .performance-stats {
          padding: 40px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .stat-widget {
          background: rgba(42, 42, 42, 0.6);
          border-radius: var(--radius-performance);
          padding: 24px;
          border: 1px solid rgba(255, 215, 0, 0.15);
          position: relative;
          overflow: hidden;
          transition: var(--speed-transition);
        }

        .stat-widget:hover {
          border-color: var(--hyper-yellow);
          transform: translateY(-5px);
        }

        .stat-widget::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--gradient-speed);
        }

        .modules-performance {
          background: linear-gradient(
              145deg,
              rgba(18, 18, 18, 0.9),
              rgba(8, 8, 8, 0.95)
            ),
            radial-gradient(
              circle at 50% 0%,
              rgba(255, 215, 0, 0.05) 0%,
              transparent 50%
            );
          border-top: var(--border-performance);
          border-bottom: var(--border-performance);
        }

        .modules-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
          margin-top: 80px;
        }

        .module-card {
          background: linear-gradient(
            145deg,
            rgba(30, 30, 30, 0.8),
            rgba(42, 42, 42, 0.4)
          );
          border-radius: var(--radius-smooth);
          padding: 48px 36px;
          border: var(--border-performance);
          backdrop-filter: blur(20px);
          transition: var(--speed-transition);
          position: relative;
          overflow: hidden;
        }

        .module-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--gradient-speed);
        }

        .module-card:hover {
          transform: translateY(-15px);
          border-color: var(--hyper-yellow);
          box-shadow: var(--shadow-performance);
        }

        .module-icon {
          width: 80px;
          height: 80px;
          background: rgba(255, 215, 0, 0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
          border: 1px solid rgba(255, 215, 0, 0.3);
          position: relative;
        }

        .module-icon i {
          font-size: 36px;
          color: var(--hyper-yellow);
        }

        .module-badge {
          display: inline-block;
          background: rgba(255, 215, 0, 0.15);
          color: var(--hyper-yellow);
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          font-size: 0.75rem;
          font-weight: 700;
          border: 1px solid rgba(255, 215, 0, 0.3);
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .onboarding-process,
        .reporting-features,
        .switch-benefits,
        .pricing-performance {
          background: linear-gradient(
            145deg,
            rgba(30, 30, 30, 0.7),
            rgba(8, 8, 8, 0.9)
          );
          border-top: var(--border-performance);
        }

        .onboarding-steps {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 30px;
          margin-top: 60px;
          position: relative;
        }

        .onboarding-steps::before {
          content: "";
          position: absolute;
          top: 40px;
          left: 40px;
          right: 40px;
          height: 2px;
          background: var(--gradient-speed);
          z-index: 1;
        }

        .onboarding-step {
          text-align: center;
          padding: 30px 20px;
          background: rgba(42, 42, 42, 0.4);
          border-radius: var(--radius-smooth);
          border: var(--border-performance);
          position: relative;
          z-index: 2;
          transition: var(--speed-transition);
        }

        .onboarding-step:hover {
          transform: translateY(-10px);
          border-color: var(--hyper-yellow);
        }

        .step-number {
          width: 60px;
          height: 60px;
          background: var(--gradient-speed);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: var(--speed-white);
          margin: 0 auto 20px;
          font-size: 1.5rem;
          font-family: "Space Grotesk", sans-serif;
        }

        .reporting-grid,
        .benefits-grid,
        .pricing-tiers {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          margin-top: 60px;
        }

        .reporting-card,
        .benefit-card,
        .pricing-card {
          padding: 40px;
          background: rgba(42, 42, 42, 0.4);
          border-radius: var(--radius-smooth);
          border: var(--border-performance);
          transition: var(--speed-transition);
        }

        .reporting-card:hover,
        .benefit-card:hover,
        .pricing-card:hover {
          transform: translateY(-10px);
          border-color: var(--hyper-yellow);
        }

        .pricing-header {
          padding: 40px 32px;
          background: rgba(30, 30, 30, 0.9);
          border-bottom: var(--border-performance);
        }

        .deposit-amount {
          background: rgba(255, 215, 0, 0.1);
          padding: 15px;
          border-radius: var(--radius-performance);
          margin-top: 20px;
          text-align: center;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .footer-performance {
          background: linear-gradient(
            145deg,
            rgba(8, 8, 8, 0.98),
            rgba(18, 18, 18, 0.95)
          );
          padding: 100px 0 50px;
          border-top: var(--border-performance);
          position: relative;
        }

        .footer-performance::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--gradient-speed);
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          margin-bottom: 80px;
        }

        .load-management-hub {
          background: rgba(10, 10, 10, 0.9);
          border-top: 1px solid rgba(255, 215, 0, 0.2);
          border-bottom: 1px solid rgba(0, 180, 255, 0.2);
        }

        .load-hub-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .hub-kicker {
          font-size: 0.85rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.6);
        }

        .load-hub-summary {
          margin-top: 12px;
          background: rgba(30, 30, 30, 0.5);
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 215, 0, 0.2);
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .load-action-toast {
          margin-top: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.9rem;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(30, 30, 30, 0.6);
        }

        .load-action-toast.info {
          border-color: rgba(0, 180, 255, 0.4);
          background: rgba(0, 180, 255, 0.12);
        }

        .load-action-toast.success {
          border-color: rgba(0, 255, 157, 0.4);
          background: rgba(0, 255, 157, 0.12);
        }

        .load-action-toast.error {
          border-color: rgba(255, 40, 0, 0.4);
          background: rgba(255, 40, 0, 0.12);
        }

        .load-filter-tabs {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
        }

        .tab-btn {
          background: rgba(30, 30, 30, 0.7);
          color: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 999px;
          padding: 10px 16px;
          font-weight: 600;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: var(--speed-transition);
        }

        .tab-btn.active {
          background: rgba(255, 215, 0, 0.15);
          color: var(--speed-white);
          border-color: rgba(255, 215, 0, 0.6);
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        }

        .count-badge {
          background: rgba(0, 180, 255, 0.2);
          border: 1px solid rgba(0, 180, 255, 0.4);
          color: rgba(255, 255, 255, 0.9);
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
        }

        .bulk-actions-bar {
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(0, 180, 255, 0.12);
          border: 1px solid rgba(0, 180, 255, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 0.9rem;
        }

        .load-hub-layout {
          display: grid;
          grid-template-columns: 2.2fr 1fr;
          gap: 24px;
          margin-top: 24px;
          align-items: start;
        }

        .load-board {
          background: rgba(20, 20, 20, 0.8);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        }

        .board-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 220px;
        }

        .search-box input {
          width: 100%;
          background: rgba(8, 8, 8, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--speed-white);
          padding: 10px 36px 10px 12px;
          border-radius: 10px;
          font-size: 0.9rem;
        }

        .search-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
        }

        .view-controls {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .sort-select {
          background: rgba(8, 8, 8, 0.9);
          color: var(--speed-white);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .loads-table-wrap {
          overflow-x: auto;
        }

        .loads-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
          min-width: 820px;
        }

        .loads-table thead th {
          text-align: left;
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.75rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 12px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .loads-table tbody td {
          padding: 14px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          vertical-align: top;
        }

        .load-row {
          transition: var(--speed-transition);
        }

        .load-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .driver-info.unassigned {
          color: rgba(255, 255, 255, 0.55);
          font-style: italic;
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .status-badge.in-transit {
          background: rgba(0, 180, 255, 0.15);
          border-color: rgba(0, 180, 255, 0.4);
          color: rgba(255, 255, 255, 0.95);
        }

        .status-badge.available {
          background: rgba(0, 255, 157, 0.12);
          border-color: rgba(0, 255, 157, 0.4);
        }

        .status-badge.completed {
          background: rgba(0, 255, 157, 0.18);
          border-color: rgba(0, 255, 157, 0.4);
        }

        .status-badge.cancelled {
          background: rgba(255, 40, 0, 0.12);
          border-color: rgba(255, 40, 0, 0.4);
        }

        .status-badge.detention,
        .status-badge.warning {
          background: rgba(255, 200, 0, 0.15);
          border-color: rgba(255, 200, 0, 0.45);
        }

        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .btn-xs {
          padding: 6px 10px;
          font-size: 0.7rem;
          border-radius: 6px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .btn-warning {
          background: rgba(255, 200, 0, 0.2);
          border: 1px solid rgba(255, 200, 0, 0.6);
          color: var(--speed-white);
        }

        .btn-success {
          background: rgba(0, 255, 157, 0.2);
          border: 1px solid rgba(0, 255, 157, 0.5);
          color: var(--speed-white);
        }

        .btn-danger {
          background: rgba(255, 40, 0, 0.2);
          border: 1px solid rgba(255, 40, 0, 0.5);
          color: var(--speed-white);
        }

        .btn-sm {
          padding: 8px 12px;
          font-size: 0.75rem;
          border-radius: 8px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .btn-block {
          width: 100%;
          justify-content: center;
        }

        .load-hub-sidebar {
          display: grid;
          gap: 18px;
        }

        .sidebar-create-load,
        .detention-panel {
          background: rgba(20, 20, 20, 0.85);
          border: 1px solid rgba(0, 180, 255, 0.2);
          border-radius: 16px;
          padding: 16px;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        }

        .sidebar-header h3 {
          font-size: 1.1rem;
          margin: 0;
        }

        .toggle-icon {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .sidebar-content {
          margin-top: 16px;
          display: grid;
          gap: 14px;
        }

        .form-group label {
          display: block;
          font-size: 0.85rem;
          margin-bottom: 6px;
          color: rgba(255, 255, 255, 0.7);
        }

        .form-group select,
        .form-group input {
          width: 100%;
          background: rgba(8, 8, 8, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--speed-white);
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 0.85rem;
        }

        .inline-inputs,
        .route-inputs {
          display: grid;
          grid-template-columns: 1.4fr 0.6fr 1fr;
          gap: 8px;
          align-items: center;
        }

        .route-inputs {
          grid-template-columns: 1fr auto 1.2fr;
        }

        .route-inputs .arrow {
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
        }

        .price-preview {
          background: rgba(255, 215, 0, 0.08);
          border: 1px solid rgba(255, 215, 0, 0.2);
          padding: 12px;
          border-radius: 12px;
          display: grid;
          gap: 6px;
        }

        .price-line {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
        }

        .detention-panel h3 {
          margin-bottom: 12px;
        }

        .alert-item {
          background: rgba(30, 30, 30, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .alert-item.warning {
          border-color: rgba(255, 200, 0, 0.35);
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
        }

        .alert-time {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
        }

        .alert-actions {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .load-details-modal {
          background: rgba(10, 10, 10, 0.95);
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          width: min(1100px, 100%);
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .close-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 1.5rem;
          cursor: pointer;
        }

        .modal-tabs {
          display: flex;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap;
        }

        .modal-tab {
          background: rgba(30, 30, 30, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.75);
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .modal-tab.active {
          background: rgba(255, 215, 0, 0.18);
          border-color: rgba(255, 215, 0, 0.4);
          color: var(--speed-white);
        }

        .modal-content {
          padding: 20px;
          overflow-y: auto;
          display: grid;
          gap: 20px;
        }

        .tab-content {
          display: none;
        }

        .tab-content.active {
          display: block;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .detail-column {
          background: rgba(30, 30, 30, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
        }

        .document-list {
          display: grid;
          gap: 12px;
        }

        .doc-item {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(30, 30, 30, 0.6);
        }

        .doc-item.missing {
          border-color: rgba(255, 200, 0, 0.4);
        }

        .upload-zone {
          margin-top: 12px;
          border: 1px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
        }

        .tracking-info {
          margin-top: 12px;
          display: grid;
          gap: 6px;
          font-size: 0.9rem;
        }

        .tracking-status {
          margin-top: 10px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .tracking-frame {
          width: 100%;
          height: 260px;
          border: none;
          border-radius: 12px;
        }

        .load-mobile-view {
          display: none;
          margin-top: 32px;
          background: rgba(20, 20, 20, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px;
        }

        .mobile-load-card {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px 0;
        }

        .mobile-load-card:last-child {
          border-bottom: none;
        }

        .mobile-load-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes pulse {
          0% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.5;
          }
        }

        @media (max-width: 1400px) {
          h1 {
            font-size: 4rem;
          }
          h2 {
            font-size: 3rem;
          }
          .container {
            max-width: 1200px;
          }
        }

        @media (max-width: 1200px) {
          .hero-container {
            grid-template-columns: 1fr;
            gap: 60px;
          }
          .load-hub-layout {
            grid-template-columns: 1fr;
          }
          .modules-grid,
          .pricing-tiers,
          .reporting-grid,
          .benefits-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .onboarding-steps {
            grid-template-columns: 1fr;
          }
          .onboarding-steps::before {
            display: none;
          }
        }

        @media (max-width: 992px) {
          .mobile-menu-btn {
            display: block;
          }
          .load-mobile-view {
            display: block;
          }
          .nav-links {
            position: fixed;
            top: 80px;
            left: 0;
            right: 0;
            background: rgba(8, 8, 8, 0.98);
            flex-direction: column;
            padding: 40px;
            gap: 30px;
            border-bottom: var(--border-performance);
            transform: translateY(-100%);
            opacity: 0;
            transition: var(--speed-transition);
            backdrop-filter: blur(30px);
            z-index: 999;
            max-height: 80vh;
            overflow-y: auto;
          }
          .nav-links.active {
            transform: translateY(0);
            opacity: 1;
          }
          .hero {
            padding-top: 140px;
          }
          .hero-container {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .dashboard-preview {
            transform: none;
          }
          .dashboard-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
          .hero-cta {
            flex-direction: column;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            text-align: center;
          }
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 3rem;
          }
          h2 {
            font-size: 2.5rem;
          }
          section {
            padding: 80px 0;
          }
          .navbar {
            padding: 10px 0;
          }
          .logo-text {
            font-size: 1.4rem;
          }
          .hero-cta .btn {
            width: 100%;
          }
          .performance-stats {
            padding: 24px;
            grid-template-columns: 1fr;
          }
          .module-card {
            padding: 32px 24px;
          }
          .modules-grid,
          .pricing-tiers,
          .reporting-grid,
          .benefits-grid {
            grid-template-columns: 1fr;
          }
          .performance-stats {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 576px) {
          h1 {
            font-size: 2.5rem;
          }
          h2 {
            font-size: 2rem;
          }
          .container {
            padding: 0 20px;
          }
          .hero-badge,
          .btn {
            padding-left: 24px;
            padding-right: 24px;
          }
          .nav-links {
            padding: 24px;
            gap: 20px;
          }
          .nav-cta {
            width: 100%;
            text-align: center;
          }
          .logo {
            gap: 10px;
          }
          .logo-icon {
            width: 44px;
            height: 44px;
            font-size: 20px;
          }
        }
      `}</style>

      <nav className="navbar">
        <div className="container navbar-container">
          <Link href="/" prefetch={false} className="logo" onClick={() => setMenuOpen(false)}>
            <div className="logo-icon">M</div>
            <div className="logo-text">MoveAround TMS</div>
          </Link>

          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            <i className={`fas ${menuOpen ? "fa-times" : "fa-bars"}`}></i>
          </button>

          <div className={`nav-links ${menuOpen ? "active" : ""}`}>
            <a href="#pits" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t("navPits")}
            </a>
            <a href="#dump-truck" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t("navDump")}
            </a>
            <a href="#modules" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t("navModules")}
            </a>
            <a href="#onboarding" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t("navOnboarding")}
            </a>
            <a href="#pricing" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t("navPricing")}
            </a>
            <a href="#audit-shield" className="nav-link" onClick={() => setMenuOpen(false)}>
              {t("navAudit")}
            </a>
            <a href="#demo" className="nav-link nav-cta" onClick={() => setMenuOpen(false)}>
              {t("navDemo")}
            </a>
          </div>
          <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
            <button
              onClick={() => setLanguageAndPersist("en")}
              className="btn btn-secondary"
              style={{
                padding: "8px 14px",
                fontSize: "0.75rem",
                borderColor: language === "en" ? "var(--hyper-yellow)" : "rgba(255,215,0,0.2)",
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLanguageAndPersist("es")}
              className="btn btn-secondary"
              style={{
                padding: "8px 14px",
                fontSize: "0.75rem",
                borderColor: language === "es" ? "var(--hyper-yellow)" : "rgba(255,215,0,0.2)",
              }}
            >
              ES
            </button>
          </div>
        </div>
      </nav>

      <section style={{ paddingTop: 120, paddingBottom: 40 }}>
        <div className="container">
          <div className="reporting-card" style={{ textAlign: "center" }}>
            <h3 style={{ marginBottom: 8 }}>{t("choosePathTitle")}</h3>
            <p style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "0.95rem" }}>
              {t("choosePathSubtitle")}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
                marginTop: 20,
              }}
            >
              <Link
                href="/pit-to-pay"
                prefetch={false}
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px 16px", fontSize: "0.9rem" }}
              >
                {t("choosePathPits")}
              </Link>
              <Link
                href="/dump-truck-fleets"
                prefetch={false}
                className="btn btn-secondary"
                style={{ width: "100%", padding: "10px 16px", fontSize: "0.9rem" }}
              >
                {t("choosePathDump")}
              </Link>
              <Link
                href="/cross-border"
                prefetch={false}
                className="btn btn-secondary"
                style={{ width: "100%", padding: "10px 16px", fontSize: "0.9rem" }}
              >
                {t("choosePathCrossBorder")}
              </Link>
              <Link
                href="/"
                prefetch={false}
                className="btn btn-secondary"
                style={{ width: "100%", padding: "10px 16px", fontSize: "0.9rem" }}
              >
                {t("choosePathGeneral")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="hero" id="performance">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <i className="fas fa-bolt"></i>
              {t("heroBadge")}
            </div>
            <h1 className="speed-gradient">{t("heroTitle")}</h1>
            <p>
              <strong>{t("heroSub")}</strong>
            </p>
            <p>{t("heroBody1")}</p>
            <p>{t("heroBody2")}</p>
            <p>
              <strong>{t("heroBody3")}</strong>
            </p>

            <div className="hero-cta">
              <a href="#roi-calculator" className="btn btn-primary">
                <i className="fas fa-chart-line"></i>
                {t("heroCtaPrimary")}
              </a>
              <a href="#pits" className="btn btn-secondary">
                <i className="fas fa-industry"></i>
                {t("heroCtaSecondary")}
              </a>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              {["SSL Secured", "SOC2-Ready", "Audit-Ready Docs", "No Long-Term Contracts"].map((badge) => (
                <span
                  key={badge}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,215,0,0.3)",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "0.75rem",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-image">
            <div className="dashboard-preview">
              <div className="dashboard-header">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: "var(--gradient-speed)",
                      borderRadius: "50%",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--hyper-yellow)",
                      fontWeight: 700,
                    }}
                  >
                    MOVEAROUND CONTROL • LIVE
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(255, 255, 255, 0.6)",
                    fontWeight: 600,
                  }}
                >
                  Avg. ROI: 214% • Payback: 4.2 months
                </div>
              </div>
              <div className="performance-stats">
                {[
                  {
                    label: "STARTUP DEPOSIT",
                    value: "$999",
                    detail: "Get started • Full implementation",
                    accent: "var(--gradient-speed)",
                  },
                  {
                    label: "TIME TO VALUE",
                    value: "30 Days",
                    detail: "Implementation • Training • Go-live",
                    accent: "var(--gradient-performance)",
                  },
                  {
                    label: "AVG. ROI",
                    value: "214%",
                    detail: "First year return on investment",
                    accent: "var(--gradient-success)",
                  },
                  {
                    label: "PAYBACK PERIOD",
                    value: "4.2 Mos",
                    detail: "Average time to recover investment",
                    accent: "var(--gradient-speed)",
                  },
                ].map((stat) => (
                  <div className="stat-widget" key={stat.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "rgba(255, 255, 255, 0.7)",
                          fontWeight: 600,
                        }}
                      >
                        {stat.label}
                      </div>
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 900,
                          color: "var(--hyper-yellow)",
                        }}
                      >
                        {stat.value}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      {stat.detail}
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: 2,
                        marginTop: 15,
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: stat.accent,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="modules-performance">
        <div className="container">
          <div className="section-header">
            <h2>
              Selling Modules: <span className="speed-gradient">Choose What You Need</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Mix and match modules based on your operational requirements
            </p>
          </div>

          <div className="modules-grid">
            {[
              {
                icon: "fa-bolt",
                price: "Sell Separately: $599/month",
                title: "TicketFlash OCR Module",
                desc: "Process paper tickets at 99.97% accuracy with AI-powered optical character recognition.",
                features: [
                  "2-second ticket processing",
                  "Handwriting recognition",
                  "Multi-language support",
                  "Learning AI improves over time",
                ],
                target: "Companies with paper-based processes, manual data entry",
                href: "/ticketflash-ocr",
                cta: "Subscribe for $599/mo",
              },
              {
                icon: "fa-weight-hanging",
                price: "Sell Separately: $799/month",
                title: "AccuriScale Module",
                desc: "Real-time scale validation with fraud detection and automated billing verification.",
                features: [
                  "150+ validation rules",
                  "Anomaly detection algorithms",
                  "Cross-reference verification",
                  "Automated dispute evidence",
                ],
                target: "Aggregate haulers, quarries, bulk material transport",
              },
              {
                icon: "fa-tachometer-alt",
                price: "Sell Separately: $1,499/month",
                title: "TMS Operations Platform",
                desc: "Complete fleet management system with dispatch, compliance, and real-time tracking.",
                features: [
                  "Real-time dispatch & tracking",
                  "Automated compliance monitoring",
                  "Integrated billing & payroll",
                  "Advanced reporting suite",
                ],
                target: "All fleet operations needing complete management",
              },
              {
                icon: "fa-route",
                price: "Sell Separately: $299/month",
                title: "Route Optimization",
                desc: "Smart routing suggestions that reduce fuel and improve on-time performance.",
                features: [
                  "Multi-stop optimization",
                  "Fuel-efficient routing",
                  "Load sequencing",
                  "Real-time route adjustments",
                ],
                target: "Dispatch teams optimizing daily routes",
              },
              {
                icon: "fa-file-invoice-dollar",
                price: "Sell Separately: $599/month",
                title: "Revenue Shield",
                desc: "Automated reconciliation and revenue leakage prevention.",
                features: [
                  "Invoice matching",
                  "Exception detection",
                  "Detention claims",
                  "Evidence packet generator",
                ],
                target: "Companies losing revenue to missed accessorials",
              },
              {
                icon: "fa-file-excel",
                price: "Sell Separately: $699/month",
                title: "Excel & Plant Invoice Reconciliation",
                desc: "Upload Excel tickets and auto-reconcile against CSV invoices from material plants.",
                features: [
                  "Excel import with schema detection",
                  "Auto error scanning and variance flags",
                  "CSV invoice matching by load, date, and tonnage",
                  "Exception queue with audit trail",
                ],
                target: "Aggregate and materials haulers reconciling plant invoices",
              },
              {
                icon: "fa-clipboard-check",
                price: "Sell Separately: $349/month",
                title: "Module 1: Excel-to-Ticket Reconciliation Validation Checklist",
                desc: "Step-by-step validation that auto-flags mismatches before they hit billing.",
                features: [
                  "Ticket #, date, and material checks",
                  "Gross/tare/net validation rules",
                  "Auto-flag short loads and duplicates",
                  "Audit-ready exception log",
                ],
                target: "Teams standardizing Excel-to-ticket reconciliation",
              },
              {
                icon: "fa-user-check",
                price: "Sell Separately: $399/month",
                title: "Module 3: Payroll (Ticket-to-Driver) Validation Checklist",
                desc: "Validate pay rules and driver tickets before payroll closes.",
                features: [
                  "Driver/ticket match validation",
                  "Rate type & unit checks",
                  "Auto-flag missing PODs",
                  "Exception-ready payroll audit log",
                ],
                target: "Ops teams preventing payroll disputes",
              },
              {
                icon: "fa-globe",
                price: "Sell Separately: $399/month",
                title: "Cross-Border Mexico",
                desc: "Automated customs documentation and compliance monitoring.",
                features: [
                  "CFDI 4.0 + Carta Porte",
                  "Customs status tracking",
                  "Multi-currency invoicing",
                  "Compliance audit trails",
                ],
                target: "Cross-border carriers and 3PLs",
              },
              {
                icon: "fa-file-lines",
                price: "Sell Separately: $349/month",
                title: "DocPulse Documentation",
                desc: "Centralized document vault with audit trails and dispute-ready evidence packets.",
                features: [
                  "Auto-organized tickets and invoices",
                  "Immutable audit trails",
                  "One-click evidence packets",
                  "Compliance-ready exports",
                ],
                target: "Teams managing high-volume ticket and invoice documentation",
              },
            ].map((module) => (
              <div className="module-card" key={module.title}>
                <div className="module-icon">
                  <i className={`fas ${module.icon}`}></i>
                </div>
                <span className="module-badge">{module.price}</span>
                <h3>{module.title}</h3>
                <p>
                  <strong>{module.desc}</strong>
                </p>

                <div style={{ marginTop: 30 }}>
                  <h4 style={{ color: "var(--hyper-yellow)", marginBottom: 15 }}>
                    Key Selling Features:
                  </h4>
                  <ul
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.95rem",
                      paddingLeft: 20,
                      marginBottom: 25,
                    }}
                  >
                    {module.features.map((feature) => (
                      <li key={feature} style={{ marginBottom: 8 }}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    background: "rgba(255, 215, 0, 0.05)",
                    padding: 20,
                    borderRadius: 8,
                    border: "1px solid rgba(255, 215, 0, 0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "rgba(255, 255, 255, 0.7)",
                      fontWeight: 600,
                    }}
                  >
                    TARGET CUSTOMERS:
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--hyper-yellow)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {module.target}
                  </div>
                </div>
                {module.href && (
                  <Link
                    href={module.href}
                    prefetch={false}
                    className="btn btn-primary"
                    style={{ marginTop: 20, width: "100%", justifyContent: "center" }}
                  >
                    {module.cta || "Learn More"}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              Choose Your Path: <span className="speed-gradient">Clear Solutions</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Start with the package that matches your operation.
            </p>
          </div>

          <div className="benefits-grid">
            {[
              {
                icon: "fa-industry",
                title: "I haul Aggregates / Run a Quarry",
                desc: "Pit‑to‑Pay workflow built for scale houses, short loads, and ticket matching.",
                cta: "Explore Pit‑to‑Pay",
                href: "/pit-to-pay",
              },
              {
                icon: "fa-truck",
                title: "I run a Dump Truck or Heavy Haul Fleet",
                desc: "Dispatch, backhauls, ticket capture, and dispute‑proof billing built for dump fleets.",
                cta: "View Dump Fleet Tools",
                href: "/dump-truck-fleets",
              },
              {
                icon: "fa-globe",
                title: "I run Cross‑Border (US‑Mexico) Operations",
                desc: "CFDI 4.0 + Carta Porte automation with live customs visibility.",
                cta: "View Cross‑Border",
                href: "/cross-border",
              },
              {
                icon: "fa-briefcase",
                title: "I run General Freight / Trucking / 3PL",
                desc: "Core TMS, invoicing, and reporting without enterprise bloat.",
                cta: "View General TMS",
                href: "/",
              },
            ].map((path) => (
              <div className="benefit-card" key={path.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(255, 215, 0, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 25px",
                    border: "2px solid rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <i className={`fas ${path.icon}`} style={{ fontSize: 24, color: "var(--hyper-yellow)" }}></i>
                </div>
                <h3>{path.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  {path.desc}
                </p>
                <Link href={path.href} prefetch={false} className="btn btn-secondary" style={{ marginTop: 20 }}>
                  {path.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reconciliation" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              Automated Reconciliation:{" "}
              <span className="speed-gradient">Excel + Plant Invoices</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Upload your Excel tickets, match against CSV invoices, and resolve exceptions fast.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 30 }}>
            {[
              {
                step: "1",
                title: "Upload Excel Tickets",
                desc: "Drag & drop Excel exports. We detect columns, normalize units, and validate totals automatically.",
              },
              {
                step: "2",
                title: "Match CSV Invoices",
                desc: "Plant invoices are matched by load, date, truck, and tonnage. Variances are flagged instantly.",
              },
              {
                step: "3",
                title: "Resolve Exceptions",
                desc: "Exception queue shows discrepancies with evidence and one-click dispute packets.",
              },
            ].map((item) => (
              <div className="reporting-card" key={item.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(0, 180, 255, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 25,
                    border: "2px solid rgba(0, 180, 255, 0.3)",
                    fontWeight: 900,
                    fontSize: "1.25rem",
                    color: "var(--turbo-blue)",
                  }}
                >
                  {item.step}
                </div>
                <h3>{item.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="dump-truck" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              {t("dumpTitle")}:{" "}
              <span className="speed-gradient">Turn More Trips Into More Profit</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              {t("dumpSubtitle")}
            </p>
          </div>

          <div className="benefits-grid">
            {[
              {
                icon: "fa-route",
                title: "Deadhead & Empty Miles",
                desc: "Load‑to‑Dump Sequencing finds backhauls and minimizes empty return trips.",
                solution: "Route Optimization + TMS Platform",
              },
              {
                icon: "fa-list-check",
                title: "Spot Market Loads",
                desc: "Backhaul Board surfaces nearby loads without switching apps.",
                solution: "Backhaul Board + Dispatch (coming soon)",
              },
              {
                icon: "fa-file-invoice-dollar",
                title: "Disputed Invoicing",
                desc: "Auto‑invoicing from scale tickets, signed slips, and driver logs.",
                solution: "Revenue Shield + TicketFlash + DocPulse",
              },
              {
                icon: "fa-location-dot",
                title: "Driver & Asset Downtime",
                desc: "Live Pit‑to‑Dump visibility with statuses: Loaded, Empty, In Queue, At Site.",
                solution: "Live TMS Tracking",
              },
              {
                icon: "fa-screwdriver-wrench",
                title: "Maintenance Surprises",
                desc: "Track cost‑per‑ton and truck health to spot money‑losing assets early.",
                solution: "Operational Efficiency Reporting",
              },
              {
                icon: "fa-chart-line",
                title: "Daily Profit Cycle",
                desc: "Find & Dispatch → Haul & Track → Verify & Bill → Analyze & Grow.",
                solution: "VeriFlow + TicketFlash + AccuriScale",
              },
            ].map((item) => (
              <div className="benefit-card" key={item.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(255, 215, 0, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 25px",
                    border: "2px solid rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: 24, color: "var(--hyper-yellow)" }}></i>
                </div>
                <h3>{item.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  {item.desc}
                </p>
                <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)" }}>
                  <strong>Solution:</strong> {item.solution}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 50 }}>
            <div
              style={{
                background: "rgba(0, 255, 157, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 36,
                border: "1px solid rgba(0, 255, 157, 0.3)",
                maxWidth: 900,
                margin: "0 auto",
              }}
            >
              <h3 style={{ color: "var(--success-green)", marginBottom: 10 }}>
                90‑Day Profitability Boost
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "0.95rem" }}>
                We’ll help you reduce empty miles by <strong>15%</strong> or the quarter is free.
              </p>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>
                For less than the daily cost of one truck sitting idle, ensure your entire fleet is profitable.
              </p>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 16 }}>
                Start Dump Fleet Pilot
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="interactive-demo" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              {t("demoTitle")}{" "}
              <span className="speed-gradient">Experience Yours.</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              {t("demoSubtitle")}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              { id: "deadhead", label: "Empty Miles / Deadhead", target: "#demo-deadhead" },
              { id: "billing", label: "Invoice Disputes & Late Payments", target: "#demo-billing" },
              { id: "dispatch", label: "Dispatch Chaos & Unknown Status", target: "#demo-dispatch" },
              { id: "all", label: "All of the Above", target: "#demo-cycle" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setSelectedDemo(option.id);
                  const el = document.querySelector(option.target);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  borderColor: selectedDemo === option.id ? "var(--hyper-yellow)" : "rgba(255,215,0,0.3)",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 40, display: "grid", gap: 24 }}>
            <div id="demo-deadhead" className="reporting-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <h3>Module A: Plug the Empty Miles Leak</h3>
                <span style={{ color: "var(--hyper-yellow)", fontWeight: 700 }}>
                  Smart Route & Load Optimization
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                Video: How to Turn Deadhead into Paid Backhauls (60–90s).
              </p>
              <div
                style={{
                  background: "rgba(30,30,30,0.6)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,215,0,0.2)",
                  padding: 24,
                }}
              >
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 1:</strong> Truck #101 finishes a dump run and returns empty.
                  “This 38‑mile deadhead just cost you $120.”
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 2:</strong> Backhaul Alert surfaces a 22‑ton load 2 miles away.
                </p>
                <p>
                  <strong>Scene 3:</strong> Dispatcher assigns the load. “In 10 seconds, a cost becomes profit.”
                </p>
              </div>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 16 }}>
                Book My Demo to Calculate Deadhead Savings
              </a>
            </div>

            <div id="demo-billing" className="reporting-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <h3>Module B: Plug the Billing Leaks</h3>
                <span style={{ color: "var(--hyper-yellow)", fontWeight: 700 }}>
                  TicketFlash + Revenue Shield
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                Video: From Scale Ticket to Paid Invoice, Automatically (60–90s).
              </p>
              <div
                style={{
                  background: "rgba(30,30,30,0.6)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,215,0,0.2)",
                  padding: 24,
                }}
              >
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 1:</strong> Pile of tickets, disputed invoice.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 2:</strong> TicketFlash digitizes ticket; Revenue Shield flags a 1.5‑ton discrepancy.
                </p>
                <p>
                  <strong>Scene 3:</strong> Clean invoice sent with evidence. “Paid 14 days faster.”
                </p>
              </div>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 16 }}>
                Book My Demo to Stop Billing Disputes
              </a>
            </div>

            <div id="demo-dispatch" className="reporting-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <h3>Module C: Eliminate Dispatch Chaos</h3>
                <span style={{ color: "var(--hyper-yellow)", fontWeight: 700 }}>
                  Live Fleet Command
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                Video: Your Entire Fleet on One Screen, in Real‑Time (60–90s).
              </p>
              <div
                style={{
                  background: "rgba(30,30,30,0.6)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,215,0,0.2)",
                  padding: 24,
                }}
              >
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 1:</strong> Dispatcher buried in check‑calls and spreadsheets.
                </p>
                <p style={{ marginBottom: 10 }}>
                  <strong>Scene 2:</strong> Live map shows status: Loaded, Empty, At Site.
                </p>
                <p>
                  <strong>Scene 3:</strong> In‑app messaging replaces chaos with control.
                </p>
              </div>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 16 }}>
                Book My Demo to See Live Fleet Control
              </a>
            </div>

            <div id="demo-cycle" className="reporting-card">
              <h3>Unified Vision: The Daily Profit Cycle</h3>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                30‑second overview: dispatch → backhaul → ticket scan → invoice → profit dashboard.
              </p>
              <div
                style={{
                  background: "rgba(30,30,30,0.6)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,215,0,0.2)",
                  padding: 24,
                }}
              >
                <p style={{ marginBottom: 10 }}>
                  “It’s the brain our operation was missing. We’re billing more, arguing less, and our
                  trucks are never empty.”
                </p>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
                  — Dump Truck Fleet Owner
                </p>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="mailto:sales@movearoundtms.com" className="btn btn-primary">
                  Book My Personalized Profit Demo
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setProfitLeakOpen(true)}
                >
                  Download Profit Leak Calculator
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="load-hub" className="load-management-hub">
        <div className="container">
          <div className="load-hub-header">
            <div>
              <p className="hub-kicker">Load Command Center</p>
              <h2>
                📦 Load Management <span className="speed-gradient">Hub</span>
              </h2>
            </div>
            <div>
              <button className="btn btn-secondary btn-sm" onClick={focusLoadSearch}>
                🔍 Search Loads
              </button>
            </div>
          </div>
          <div className="load-hub-summary">
            Active: 38 | Today: 12 | This Week: 85 | Revenue: $42,850
          </div>
          {actionToast && <div className={`load-action-toast ${actionToast.type}`}>{actionToast.message}</div>}

          <div className="load-filter-tabs">
            {[
              { id: "active", label: "🚛 ACTIVE LOADS", count: loadCounts.active },
              { id: "available", label: "⏳ AVAILABLE", count: loadCounts.available },
              { id: "completed", label: "✅ COMPLETED", count: loadCounts.completed },
              { id: "cancelled", label: "❌ CANCELLED", count: loadCounts.cancelled },
              { id: "detention", label: "⚠️ DETENTION", count: loadCounts.detention },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeLoadFilter === tab.id ? "active" : ""}`}
                onClick={() => setActiveLoadFilter(tab.id)}
              >
                {tab.label} <span className="count-badge">{tab.count}</span>
              </button>
            ))}
          </div>

          {selectedLoadIds.length > 0 && (
            <div className="bulk-actions-bar">
              <strong>{selectedLoadIds.length} selected</strong>
              <div className="action-buttons">
                <button className="btn btn-xs btn-secondary">Bulk Assign</button>
                <button className="btn btn-xs btn-secondary">Status Update</button>
                <button className="btn btn-xs btn-secondary">Export</button>
              </div>
            </div>
          )}

          <div className="load-hub-layout">
            <div className="load-board">
              <div className="board-toolbar">
                <div className="search-box">
                  <input
                    id="loadSearch"
                    type="text"
                    placeholder="Search loads, customers, drivers..."
                    value={loadSearch}
                    onChange={(event) => setLoadSearch(event.target.value)}
                  />
                  <span className="search-icon">🔍</span>
                </div>

                <div className="view-controls">
                  <button className="btn btn-sm btn-secondary">📥 Export</button>
                  <button className="btn btn-sm btn-secondary">🖨️ Print</button>
                  <select className="sort-select" value={loadSort} onChange={(event) => setLoadSort(event.target.value)}>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="customer">Customer A-Z</option>
                    <option value="value">Highest Value</option>
                    <option value="eta">Soonest ETA</option>
                  </select>
                </div>
              </div>

              <div className="loads-table-wrap">
                <table className="loads-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
                      </th>
                      <th style={{ width: 100 }}>Load #</th>
                      <th style={{ width: 150 }}>Customer</th>
                      <th style={{ width: 120 }}>Driver/Truck</th>
                      <th style={{ width: 120 }}>Material</th>
                      <th style={{ width: 110 }}>Status</th>
                      <th style={{ width: 120 }}>Location</th>
                      <th style={{ width: 100 }}>Value</th>
                      <th style={{ width: 160 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLoads.map((load) => (
                      <tr key={load.id} className={`load-row ${load.statusGroup}`}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedLoadIds.includes(load.id)}
                            onChange={() => toggleLoadSelection(load.id)}
                          />
                        </td>
                        <td>
                          <strong>{load.id}</strong>
                          <br />
                          <small>
                            {load.dateLabel} • {load.timeLabel}
                          </small>
                        </td>
                        <td>
                          <strong>{load.customer}</strong>
                          <br />
                          <small>{load.project || "—"}</small>
                        </td>
                        <td>
                          <div className={`driver-info ${load.driver === "UNASSIGNED" ? "unassigned" : ""}`}>
                            <span className="driver">{load.driver}</span>
                            <br />
                            <span className="truck">{load.truck || "—"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="material">{load.material}</span>
                          {load.materialDetail ? (
                            <>
                              <br />
                              <small>{load.materialDetail}</small>
                            </>
                          ) : null}
                        </td>
                        <td>
                          <span className={`status-badge ${load.statusType}`}>{load.status}</span>
                          <br />
                          <small>{load.statusNote}</small>
                        </td>
                        <td>
                          <div className="location">
                            <span className="from">{load.from}</span> →
                            <br />
                            <span className="to">{load.to}</span>
                          </div>
                        </td>
                        <td>
                          <strong>${load.value.toFixed(2)}</strong>
                          <br />
                          <small>{load.valueNote}</small>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {load.statusGroup === "active" && (
                              <>
                                <button className="btn btn-xs btn-primary" onClick={() => openLoadModal(load.id)}>
                                  View
                                </button>
                                <button
                                  className="btn btn-xs btn-secondary"
                                  onClick={() => openLoadModal(load.id, "tracking")}
                                >
                                  Track
                                </button>
                                <button
                                  className="btn btn-xs btn-warning"
                                  onClick={() => {
                                    openLoadModal(load.id, "overview");
                                    sendLoadMessage(load.id);
                                  }}
                                >
                                  Msg
                                </button>
                                <button className="btn btn-xs btn-success" onClick={() => openLoadModal(load.id, "tickets")}>
                                  Ticket
                                </button>
                              </>
                            )}
                            {load.statusGroup === "available" && (
                              <>
                                <button className="btn btn-xs btn-primary" onClick={() => openLoadModal(load.id)}>
                                  Assign
                                </button>
                                <button className="btn btn-xs btn-secondary" onClick={() => openLoadModal(load.id)}>
                                  Edit
                                </button>
                                <button className="btn btn-xs btn-danger" onClick={() => openLoadModal(load.id)}>
                                  Cancel
                                </button>
                              </>
                            )}
                            {load.statusGroup === "completed" && (
                              <>
                                <button className="btn btn-xs btn-primary" onClick={() => openLoadModal(load.id, "payment")}>
                                  Invoice
                                </button>
                                <button
                                  className="btn btn-xs btn-secondary"
                                  onClick={() => openLoadModal(load.id, "documents")}
                                >
                                  Ticket
                                </button>
                                <button className="btn btn-xs btn-success" onClick={() => openLoadModal(load.id)}>
                                  Repeat
                                </button>
                              </>
                            )}
                            {load.statusGroup === "cancelled" && (
                              <>
                                <button className="btn btn-xs btn-secondary" onClick={() => openLoadModal(load.id)}>
                                  View
                                </button>
                                <button className="btn btn-xs btn-success" onClick={() => openLoadModal(load.id)}>
                                  Repeat
                                </button>
                              </>
                            )}
                            {load.statusGroup === "detention" && (
                              <>
                                <button className="btn btn-xs btn-warning" onClick={() => openLoadModal(load.id, "payment")}>
                                  Charge
                                </button>
                                <button
                                  className="btn btn-xs btn-secondary"
                                  onClick={() => openLoadModal(load.id, "tracking")}
                                >
                                  Contact
                                </button>
                                <button className="btn btn-xs btn-primary" onClick={() => openLoadModal(load.id)}>
                                  View
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="load-hub-sidebar">
              <div className="sidebar-create-load">
                <div className="sidebar-header" onClick={() => setIsQuickCreateOpen((prev) => !prev)}>
                  <h3>⚡ Quick Create Load</h3>
                  <span className="toggle-icon">{isQuickCreateOpen ? "▼" : "▲"}</span>
                </div>

                {isQuickCreateOpen && (
                  <div className="sidebar-content">
                    <div className="form-group">
                      <label>Customer</label>
                      <select className="customer-select">
                        <option value="">Select customer...</option>
                        <option value="jones">Jones Construction</option>
                        <option value="thompson">Thompson Co</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Material & Quantity</label>
                      <div className="inline-inputs">
                        <select className="material-select">
                          <option>3/4" Gravel</option>
                          <option>Fill Sand</option>
                          <option>Road Base</option>
                        </select>
                        <input type="number" defaultValue={12} min={1} />
                        <select className="unit-select">
                          <option>tons</option>
                          <option>yards</option>
                          <option>loads</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Route</label>
                      <div className="route-inputs">
                        <select className="pickup-select">
                          <option>Pit 7</option>
                          <option>Pit 3</option>
                          <option>Yard A</option>
                        </select>
                        <span className="arrow">→</span>
                        <input type="text" placeholder="Delivery address..." className="delivery-input" />
                      </div>
                    </div>

                    <div className="price-preview">
                      <div className="price-line">
                        <span>Estimated Price:</span>
                        <strong>$855.00</strong>
                      </div>
                      <small>Based on customer rate card</small>
                    </div>

                    <button className="btn btn-primary btn-block">Create Load & Dispatch</button>
                    <button className="btn btn-secondary btn-block">Save as Template</button>
                  </div>
                )}
              </div>

              <div className="detention-panel">
                <h3>⏰ Detention Alerts</h3>
                {detentionAlerts.map((alert) => (
                  <div key={alert.id} className={`alert-item ${alert.variant === "warning" ? "warning" : ""}`}>
                    <div className="alert-header">
                      <strong>{alert.title}</strong>
                      <span className="alert-time">{alert.time}</span>
                    </div>
                    <div className="alert-body">
                      {alert.details.map((detail) => (
                        <p key={detail}>{detail}</p>
                      ))}
                    </div>
                    <div className="alert-actions">
                      {alert.actions.map((action) => (
                        <button
                          key={action.label}
                          className={`btn btn-xs btn-${action.variant}`}
                          onClick={() => openLoadModal(alert.id, action.tab)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="load-mobile-view">
            <h3>📦 Loads Mobile</h3>
            <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
              <strong>Active:</strong> {loadCounts.active} | <strong>Available:</strong> {loadCounts.available}
            </p>
            {sortedLoads.slice(0, 3).map((load) => (
              <div key={load.id} className="mobile-load-card">
                <strong>
                  {load.id} • {load.driver || "Unassigned"} • ${load.value.toFixed(0)}
                </strong>
                <p style={{ margin: "6px 0" }}>
                  📍 {load.from} → {load.to} • {load.statusNote}
                </p>
                <div className="mobile-load-actions">
                  <button className="btn btn-xs btn-secondary" onClick={() => openLoadModal(load.id, "tracking")}>
                    Track
                  </button>
                  <button
                    className="btn btn-xs btn-warning"
                    onClick={() => {
                      openLoadModal(load.id, "overview");
                      sendLoadMessage(load.id);
                    }}
                  >
                    Msg
                  </button>
                  <button className="btn btn-xs btn-primary" onClick={() => openLoadModal(load.id)}>
                    View
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-sm">➕ Quick Create</button>
              <button className="btn btn-secondary btn-sm" onClick={focusLoadSearch}>
                🔍 Search
              </button>
            </div>
          </div>
        </div>

        {selectedLoadId && (
          <div className="modal-overlay" onClick={() => setSelectedLoadId(null)}>
            <div className="modal load-details-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {selectedLoad.id} - {selectedLoad.customer}
                </h2>
                <button className="close-btn" onClick={() => setSelectedLoadId(null)}>
                  ×
                </button>
              </div>

              <div className="modal-tabs">
                {[
                  { id: "overview", label: "📋 Overview" },
                  { id: "documents", label: "📄 Documents" },
                  { id: "tracking", label: "📍 Tracking" },
                  { id: "tickets", label: "🎫 Tickets" },
                  { id: "payment", label: "💰 Payment" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`modal-tab ${activeLoadTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveLoadTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="modal-content">
                <div className={`tab-content ${activeLoadTab === "overview" ? "active" : ""}`}>
                  <div className="detail-grid">
                    <div className="detail-column">
                      <h4>Load Info</h4>
                      <p>
                        <strong>Created:</strong> {selectedLoad.dateLabel} {selectedLoad.timeLabel}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span className={`status-badge ${selectedLoad.statusType}`}>{selectedLoad.status}</span>
                      </p>
                      <p>
                        <strong>Value:</strong> ${selectedLoad.value.toFixed(2)} ({selectedLoad.valueNote})
                      </p>
                      <p>
                        <strong>Priority:</strong> Standard
                      </p>
                    </div>
                    <div className="detail-column">
                      <h4>Assignment</h4>
                      <p>
                        <strong>Driver:</strong> {selectedLoad.driver}
                      </p>
                      <p>
                        <strong>Truck:</strong> {selectedLoad.truck || "—"}
                      </p>
                      <p>
                        <strong>Driver Status:</strong> On duty - 4h 22m available
                      </p>
                      <button className="btn btn-xs btn-warning">Reassign</button>
                    </div>
                    <div className="detail-column">
                      <h4>Route</h4>
                      <p>
                        <strong>Pickup:</strong> {selectedLoad.from}
                      </p>
                      <p>
                        <strong>Delivery:</strong> {selectedLoad.to}
                      </p>
                      <p>
                        <strong>ETA:</strong> {selectedLoad.statusNote}
                      </p>
                      <p>
                        <strong>Distance:</strong> 8.2 miles
                      </p>
                    </div>
                  </div>

                  <div className="action-buttons" style={{ marginTop: 16 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveLoadTab("tracking")}>
                      Live Track
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => sendLoadMessage(selectedLoad.id)}>
                      Message Driver
                    </button>
                    <button className="btn btn-warning btn-sm">Update Status</button>
                    <button className="btn btn-success btn-sm" onClick={() => setActiveLoadTab("payment")}>
                      Create Invoice
                    </button>
                  </div>
                </div>

                <div className={`tab-content ${activeLoadTab === "documents" ? "active" : ""}`}>
                  <h4>📄 Load Documents</h4>
                  <div className="document-list">
                    <div className="doc-item">
                      <span className="doc-icon">📋</span>
                      <span className="doc-name">Rate Confirmation</span>
                      <span className="doc-status">Uploaded 05/16</span>
                      <button className="btn btn-xs btn-secondary">View</button>
                    </div>
                    <div className="doc-item missing">
                      <span className="doc-icon">🎫</span>
                      <span className="doc-name">Delivery Ticket</span>
                      <span className="doc-status">Pending</span>
                      <button className="btn btn-xs btn-primary">Upload</button>
                    </div>
                  </div>
                  <div className="upload-zone">
                    Drag & drop documents here or <button className="btn btn-xs btn-secondary">Browse</button>
                  </div>
                </div>

                <div className={`tab-content ${activeLoadTab === "tracking" ? "active" : ""}`}>
                  <h4>📍 Live Tracking</h4>
                  {mapSrc ? (
                    <iframe className="tracking-frame" src={mapSrc} loading="lazy" title="Live load tracking map" />
                  ) : (
                    <div style={{ height: 240, borderRadius: 12, background: "rgba(0,180,255,0.1)" }} />
                  )}
                  <div className="tracking-info">
                    <p>
                      <strong>Current Location:</strong> {trackingLabel}
                    </p>
                    <p>
                      <strong>Speed:</strong> {trackingSpeed !== undefined ? `${trackingSpeed} mph` : "—"}
                    </p>
                    <p>
                      <strong>Last Update:</strong> {trackingUpdated}
                    </p>
                  </div>
                  <div className="tracking-status">
                    {isTrackingLoading ? "Syncing with telematics..." : trackingError ? trackingError : "Live feed connected."}
                  </div>
                </div>

                <div className={`tab-content ${activeLoadTab === "tickets" ? "active" : ""}`}>
                  <h4>🎫 Tickets</h4>
                  <div className="document-list">
                    <div className="doc-item">
                      <span className="doc-icon">🧾</span>
                      <span className="doc-name">Scale Ticket</span>
                      <span className="doc-status">Captured 07:42</span>
                      <button className="btn btn-xs btn-secondary">View</button>
                    </div>
                    <div className="doc-item">
                      <span className="doc-icon">🧾</span>
                      <span className="doc-name">Delivery Ticket</span>
                      <span className="doc-status">Awaiting signature</span>
                      <button className="btn btn-xs btn-primary">Request</button>
                    </div>
                  </div>
                </div>

                <div className={`tab-content ${activeLoadTab === "payment" ? "active" : ""}`}>
                  <h4>💰 Payment</h4>
                  <div className="detail-grid">
                    <div className="detail-column">
                      <p>
                        <strong>Invoice Status:</strong> Draft
                      </p>
                      <p>
                        <strong>Amount:</strong> ${selectedLoad.value.toFixed(2)}
                      </p>
                      <p>
                        <strong>Terms:</strong> Net 30
                      </p>
                    </div>
                    <div className="detail-column">
                      <p>
                        <strong>Customer:</strong> {selectedLoad.customer}
                      </p>
                      <p>
                        <strong>Billing Contact:</strong> ap@{selectedLoad.customer.toLowerCase().replace(/\s+/g, "")}.com
                      </p>
                      <p>
                        <strong>Last Sent:</strong> —
                      </p>
                    </div>
                  </div>
                  <div className="action-buttons" style={{ marginTop: 16 }}>
                    <button className="btn btn-primary btn-sm" onClick={createQuickBooksInvoice} disabled={isInvoicing}>
                      {isInvoicing ? "Creating..." : "Create Invoice"}
                    </button>
                    <button className="btn btn-secondary btn-sm">Send Reminder</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {profitLeakOpen && (
        <div className="profit-leak-backdrop" onClick={() => setProfitLeakOpen(false)}>
          <div className="profit-leak-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profit-leak-header">
              <div>
                <div className="hero-badge" style={{ marginBottom: 8 }}>
                  <i className="fas fa-triangle-exclamation"></i>
                  Profit Leak Calculator
                </div>
                <div className="profit-leak-title speed-gradient">Know Your Monthly Revenue Leakage</div>
                <div className="profit-leak-subtitle">
                  Model empty miles, billing errors, admin time, and detention losses in seconds.
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setProfitLeakOpen(false)}>
                ✕ Close
              </button>
            </div>

            <div className="profit-leak-grid">
              <div className="profit-leak-panel">
                <div className="profit-leak-input">
                  Fleet Size (Trucks)
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={profitLeakInputs.fleetSize}
                    onChange={(e) =>
                      setProfitLeakInputs((prev) => ({ ...prev, fleetSize: Number(e.target.value || 0) }))
                    }
                  />
                  <input
                    type="range"
                    className="profit-leak-range"
                    min={1}
                    max={50}
                    value={profitLeakInputs.fleetSize}
                    onChange={(e) =>
                      setProfitLeakInputs((prev) => ({ ...prev, fleetSize: Number(e.target.value || 0) }))
                    }
                  />
                </div>
                <div className="profit-leak-input">
                  Avg Loads per Truck per Week
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={profitLeakInputs.loadsPerWeek}
                    onChange={(e) =>
                      setProfitLeakInputs((prev) => ({ ...prev, loadsPerWeek: Number(e.target.value || 0) }))
                    }
                  />
                  <input
                    type="range"
                    className="profit-leak-range"
                    min={5}
                    max={30}
                    value={profitLeakInputs.loadsPerWeek}
                    onChange={(e) =>
                      setProfitLeakInputs((prev) => ({ ...prev, loadsPerWeek: Number(e.target.value || 0) }))
                    }
                  />
                </div>
                <div className="profit-leak-input">
                  Average Load Value ($)
                  <input
                    type="number"
                    min={100}
                    max={5000}
                    value={profitLeakInputs.avgLoadValue}
                    onChange={(e) =>
                      setProfitLeakInputs((prev) => ({ ...prev, avgLoadValue: Number(e.target.value || 0) }))
                    }
                  />
                  <input
                    type="range"
                    className="profit-leak-range"
                    min={500}
                    max={2000}
                    value={profitLeakInputs.avgLoadValue}
                    onChange={(e) =>
                      setProfitLeakInputs((prev) => ({ ...prev, avgLoadValue: Number(e.target.value || 0) }))
                    }
                  />
                </div>
                <div className="profit-leak-input">
                  Current Empty Miles (%)
                  <input
                    type="number"
                    min={5}
                    max={40}
                    value={profitLeakInputs.emptyMiles}
                    onChange={(e) =>
                      setProfitLeakInputs((prev) => ({ ...prev, emptyMiles: Number(e.target.value || 0) }))
                    }
                  />
                  <input
                    type="range"
                    className="profit-leak-range"
                    min={5}
                    max={40}
                    value={profitLeakInputs.emptyMiles}
                    onChange={(e) =>
                      setProfitLeakInputs((prev) => ({ ...prev, emptyMiles: Number(e.target.value || 0) }))
                    }
                  />
                </div>
              </div>

              <div className="profit-leak-panel">
                <div className="profit-leak-metric loss">
                  Monthly Profit Loss
                  <strong>${formatMoney(profitLeakMetrics.totalMonthlyLoss)}</strong>
                  <span className="profit-leak-subtitle">Lost monthly to inefficiencies</span>
                </div>
                <div className="profit-leak-metric">
                  Annual Profit Loss
                  <strong>${formatMoney(profitLeakMetrics.totalAnnualLoss)}</strong>
                  <span className="profit-leak-subtitle">Total yearly revenue leakage</span>
                </div>
                <div className="profit-leak-metric savings">
                  Potential Monthly Savings
                  <strong>${formatMoney(profitLeakMetrics.totalMonthlySavings)}</strong>
                  <span className="profit-leak-subtitle">With Ronyx optimization</span>
                </div>
                <div className="profit-leak-breakdown">
                  <div>
                    Empty Miles
                    <strong>${formatMoney(profitLeakMetrics.emptyMilesLoss)}</strong>
                  </div>
                  <div>
                    Billing Errors
                    <strong>${formatMoney(profitLeakMetrics.billingErrorsLoss)}</strong>
                  </div>
                  <div>
                    Admin Time
                    <strong>${formatMoney(profitLeakMetrics.adminTimeLoss)}</strong>
                  </div>
                  <div>
                    Detention
                    <strong>${formatMoney(profitLeakMetrics.detentionLoss)}</strong>
                  </div>
                </div>
                <div className="profit-leak-metric" style={{ marginTop: 16 }}>
                  ROI on a $3,000/mo investment
                  <strong>{Math.round(profitLeakMetrics.roi)}%</strong>
                </div>
                <a href="https://movearoundtms.com/#dump-truck" className="btn btn-primary profit-leak-cta">
                  🚀 Plug Your Profit Leaks with Ronyx TMS
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <section id="pits" className="switch-benefits">
        <div className="container">
          <div className="section-header">
            <h2>
              {t("pitsTitle")}:{" "}
              <span className="speed-gradient">AccuriScale Intelligence</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              {t("pitsSubtitle")}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 30 }}>
            <div className="benefit-card">
              <h3 style={{ marginBottom: 12 }}>AccuriScale Is Mission‑Critical</h3>
              <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.85)" }}>
                <strong>Stop Revenue Leakage:</strong> Automatically flag load weight discrepancies
                before they become billing disputes.
              </p>
              <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.85)" }}>
                <strong>End Manual Ticket Matching:</strong> Sync scale house data with dispatch tickets
                in real-time, eliminating clerical hours.
              </p>
              <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.85)" }}>
                <strong>Prevent Fraud & Collusion:</strong> AI alerts for suspicious patterns
                between drivers, loaders, and scale operators.
              </p>
            </div>
            <div className="benefit-card" style={{ textAlign: "left" }}>
              <h3 style={{ marginBottom: 12 }}>Pit‑to‑Pay Workflow</h3>
              <ol style={{ paddingLeft: 18, color: "rgba(255, 255, 255, 0.8)", fontSize: "0.95rem" }}>
                <li style={{ marginBottom: 10 }}>
                  <strong>Scale Integration:</strong> Weight captured automatically at the pit.
                </li>
                <li style={{ marginBottom: 10 }}>
                  <strong>Ticket Creation:</strong> TicketFlash OCR generates a digital ticket instantly.
                </li>
                <li style={{ marginBottom: 10 }}>
                  <strong>Dispatch & Tracking:</strong> Load assigned and tracked live.
                </li>
                <li style={{ marginBottom: 10 }}>
                  <strong>Delivery Verification:</strong> Destination weight verified; mismatches flagged.
                </li>
                <li>
                  <strong>Automated Billing:</strong> Clean, dispute‑free invoice generated instantly.
                </li>
              </ol>
            </div>
            <div className="benefit-card">
              <h3 style={{ marginBottom: 12 }}>Industry Proof</h3>
              <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.85)" }}>
                “We recovered <strong>$87,000</strong> in disputed loads and saved 240 admin hours
                in the first quarter.”
              </p>
              <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)" }}>
                — Aggregate Hauler, Texas Gulf Region
              </p>
            </div>
          </div>

          <div style={{ marginTop: 60 }} className="reporting-card">
            <h3 style={{ marginBottom: 16 }}>The 5 Costly Problems We Solve for Pits</h3>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                {
                  problem: "Short Loads & Weight Disputes",
                  pain: "Unbillable tons, customer arguments, manual ticket matching.",
                  solution:
                    "AccuriScale validates pit scale vs destination weight in real time.",
                },
                {
                  problem: "Revenue Leakage & Manual Errors",
                  pain: "Lost tickets, miskeyed weights, missed accessorial charges.",
                  solution:
                    "Revenue Shield + TicketFlash OCR auto-match loads to invoices and flag misses.",
                },
                {
                  problem: "Scale House Fraud & Collusion",
                  pain: "Suspicious overrides, no audit trail, unverified edits.",
                  solution:
                    "150+ validation rules with anomaly detection and immutable audit logs.",
                },
                {
                  problem: "Inefficient Haul Cycles",
                  pain: "Idle trucks, poor sequencing, dispatch in the dark.",
                  solution:
                    "Route Optimization + Live TMS visibility across pit, queue, and en route.",
                },
                {
                  problem: "Cross‑Border Complexity",
                  pain: "Manual customs docs, currency issues, compliance risks.",
                  solution:
                    "Cross‑Border Mexico module auto‑generates CFDI 4.0 + Carta Porte.",
                },
              ].map((item) => (
                <div
                  key={item.problem}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr 1.2fr 1.5fr",
                    gap: 16,
                    background: "rgba(30,30,30,0.6)",
                    borderRadius: 12,
                    border: "1px solid rgba(255,215,0,0.2)",
                    padding: 16,
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--hyper-yellow)" }}>{item.problem}</strong>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.95rem" }}>
                    {item.pain}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem" }}>
                    {item.solution}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="roi-calculator" style={{ marginTop: 60 }} className="reporting-card">
            <h3 style={{ marginBottom: 12 }}>Aggregate Hauler ROI Calculator</h3>
            <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
              Estimate your annual recovery from short loads, manual reconciliation, and missed accessorials.
              <span style={{ color: "var(--hyper-yellow)" }}> Assumes $30/hr admin cost.</span>
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginTop: 20,
              }}
            >
              <label>
                Loads per day
                <input
                  type="number"
                  value={roiInputs.loadsPerDay}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      loadsPerDay: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
              <label>
                Average value per load ($)
                <input
                  type="number"
                  value={roiInputs.avgValuePerLoad}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      avgValuePerLoad: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
              <label>
                % loads with weight discrepancies
                <input
                  type="number"
                  value={roiInputs.discrepancyPct}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      discrepancyPct: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
              <label>
                Manual reconciliation hours/day
                <input
                  type="number"
                  value={roiInputs.manualHoursPerDay}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      manualHoursPerDay: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
              <label>
                % revenue lost to missed accessorials
                <input
                  type="number"
                  value={roiInputs.missedAccessorialPct}
                  onChange={(e) =>
                    setRoiInputs((prev) => ({
                      ...prev,
                      missedAccessorialPct: Number(e.target.value || 0),
                    }))
                  }
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "rgba(30,30,30,0.7)",
                    border: "1px solid rgba(255,215,0,0.3)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "white",
                  }}
                />
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginTop: 24,
              }}
            >
              <div className="stat-widget">
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                  Recovered tonnage revenue
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--hyper-yellow)" }}>
                  ${recoveredTonnageRevenue.toLocaleString()}
                </div>
              </div>
              <div className="stat-widget">
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                  Annual labor savings
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--success-green)" }}>
                  ${annualLaborSavings.toLocaleString()}
                </div>
              </div>
              <div className="stat-widget">
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                  Recovered accessorials
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--hyper-yellow)" }}>
                  ${recoveredAccessorials.toLocaleString()}
                </div>
              </div>
              <div className="stat-widget">
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                  Total annual impact
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--turbo-blue)" }}>
                  ${annualTotalSavings.toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ padding: "16px 28px" }}>
                Schedule ROI Walkthrough
              </a>
            </div>
          </div>

          <div style={{ marginTop: 50 }} className="reporting-card">
            <h3 style={{ marginBottom: 12 }}>Scale System Compatibility</h3>
            <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
              Works with leading scale house software and hardware. We can integrate with
              common CSV exports and API feeds.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {["ScaleSoft Pro", "WeighMaster", "QuarryTrack", "TicketPro", "Custom CSV Exports", "API Feeds"].map(
                (item) => (
                  <div key={item} className="stat-widget" style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>{item}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div style={{ marginTop: 50 }} className="reporting-card">
            <h3 style={{ marginBottom: 12 }}>Pit Operator’s Guide to Digital Transformation</h3>
            <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
              A practical guide built for quarries and bulk material haulers.
            </p>
            <ul style={{ paddingLeft: 20, color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
              <li style={{ marginBottom: 8 }}>The true cost of paper tickets</li>
              <li style={{ marginBottom: 8 }}>Scale house tech & integration checklist</li>
              <li style={{ marginBottom: 8 }}>Building a dispute‑proof audit trail</li>
              <li style={{ marginBottom: 8 }}>ROI framework for short loads & accessorials</li>
              <li>What to expect in a 30‑day implementation</li>
            </ul>
            <div style={{ marginTop: 20 }}>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-secondary" style={{ padding: "14px 26px" }}>
                Request the Guide
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="onboarding" className="onboarding-process">
        <div className="container">
          <div className="section-header">
            <h2>
              Quick Onboarding: <span className="speed-gradient">Live in 7 Days or Less</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              From $999 deposit to full implementation in 7 days or less
            </p>
          </div>

          <div className="onboarding-steps">
            {[
              "Deposit & Discovery",
              "Module Configuration",
              "Data Migration",
              "Team Training",
              "Go Live & Support",
            ].map((step, idx) => (
              <div className="onboarding-step" key={step}>
                <div className="step-number">{idx + 1}</div>
                <h3>{step}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  Streamlined onboarding with white-glove support for every team.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="reporting" className="reporting-features">
        <div className="container">
          <div className="section-header">
            <h2>
              Advanced Reporting:{" "}
              <span className="speed-gradient">Actionable Intelligence</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              Reporting that turns operational data into executive decisions
            </p>
          </div>

          <div className="reporting-grid">
            {[
              {
                icon: "fa-chart-line",
                title: "Financial Performance",
                items: [
                  "Revenue per truck analysis",
                  "Cost per mile tracking",
                  "Profitability by lane",
                  "ROI calculation reports",
                ],
              },
              {
                icon: "fa-truck",
                title: "Operational Efficiency",
                items: [
                  "Truck utilization rates",
                  "Driver performance metrics",
                  "Fuel efficiency tracking",
                  "Maintenance cost analysis",
                ],
              },
              {
                icon: "fa-shield-alt",
                title: "Compliance & Safety",
                items: [
                  "HOS compliance tracking",
                  "Safety violation reports",
                  "Cross-border compliance",
                  "Audit trail documentation",
                ],
              },
            ].map((card) => (
              <div className="reporting-card" key={card.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(255, 215, 0, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 25,
                    border: "2px solid rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <i className={`fas ${card.icon}`} style={{ fontSize: 24, color: "var(--hyper-yellow)" }}></i>
                </div>
                <h3>{card.title}</h3>
                <ul
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "0.95rem",
                    paddingLeft: 20,
                    marginTop: 15,
                  }}
                >
                  {card.items.map((item) => (
                    <li key={item} style={{ marginBottom: 8 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="switch" className="switch-benefits">
        <div className="container">
          <div className="section-header">
            <h2>
              Why Switch Now: <span className="speed-gradient">Immediate Benefits</span>
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              What you gain immediately when switching from other systems
            </p>
          </div>

          <div className="benefits-grid">
            {[
              {
                icon: "fa-dollar-sign",
                title: "Immediate Cost Savings",
                desc: "Average 35% reduction in operational costs within the first 90 days.",
              },
              {
                icon: "fa-bolt",
                title: "85% Faster Processing",
                desc: "Ticket processing time reduced from hours to seconds.",
              },
              {
                icon: "fa-chart-bar",
                title: "Revenue Recovery",
                desc: "Find 5-8% of lost revenue from missed billable loads.",
              },
            ].map((benefit) => (
              <div className="benefit-card" key={benefit.title}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "rgba(255, 215, 0, 0.1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 25px",
                    border: "2px solid rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <i className={`fas ${benefit.icon}`} style={{ fontSize: 24, color: "var(--hyper-yellow)" }}></i>
                </div>
                <h3>{benefit.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.8)" }}>
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 60 }}>
            <a href="#demo" className="btn btn-primary" style={{ padding: "25px 60px", fontSize: "1.25rem" }}>
              <i className="fas fa-exchange-alt"></i>
              Switch Now for $999 Deposit
            </a>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", marginTop: 20, fontSize: "0.95rem" }}>
              30-day money-back guarantee • Average ROI: 214% • Payback: 4.2 months
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-performance">
        <div className="container">
          <div className="section-header">
            <h2>
              {t("pricingTitle")}
            </h2>
            <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
              {t("pricingSubtitle")}
            </p>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
              {t("pricingNoContract")}
            </p>
          </div>

          <div className="pricing-tiers">
            {[
              {
                badge: "ESSENTIAL (1–5 TRUCKS)",
                price: "$75–$100",
                desc: "Core process solution per truck/month",
                deposit: "$0",
                features: [
                  "Excel → Ticket automation",
                  "Pit ticket OCR + matching",
                  "Ticket‑to‑Payroll export",
                  "Driver mobile app",
                  "Standard support",
                ],
                cta: "Start Essential",
                ctaClass: "btn btn-secondary",
              },
              {
                badge: "PROFESSIONAL (6–20 TRUCKS)",
                price: "$100–$150",
                desc: "Full business integration per truck/month",
                deposit: "$0",
                features: [
                  "Everything in Essential",
                  "QuickBooks integration",
                  "Advanced reporting (profit per load)",
                  "Priority support",
                ],
                cta: "Start Professional",
                ctaClass: "btn btn-primary",
                highlight: true,
              },
              {
                badge: "ENTERPRISE (20+ TRUCKS)",
                price: "Custom",
                desc: "Custom workflows + white‑glove onboarding",
                deposit: "$0",
                features: [
                  "Custom rule engine",
                  "Dedicated account manager",
                  "SLA + on‑site training",
                  "Custom API development",
                ],
                cta: "Contact Enterprise Sales",
                ctaClass: "btn btn-secondary",
              },
            ].map((tier) => (
              <div
                className="pricing-card"
                key={tier.badge}
                style={tier.highlight ? { borderColor: "var(--hyper-yellow)", transform: "scale(1.05)" } : undefined}
              >
                {tier.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--gradient-speed)",
                      color: "var(--speed-white)",
                      padding: "8px 24px",
                      borderRadius: "0 0 8px 8px",
                      fontWeight: 900,
                      fontSize: "0.8rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="pricing-header">
                  <div className="module-badge" style={tier.highlight ? { background: "rgba(255, 215, 0, 0.2)" } : undefined}>
                    {tier.badge}
                  </div>
                  <h3 style={{ fontSize: "2.5rem", marginBottom: 10 }}>
                    {tier.price}
                    <span style={{ fontSize: "1rem", color: "rgba(255, 255, 255, 0.7)" }}>/month</span>
                  </h3>
                  <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
                    {tier.desc}
                  </p>
                  <div className="deposit-amount">
                    <div style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.7)" }}>
                      SETUP
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--hyper-yellow)" }}>
                      {tier.deposit}
                    </div>
                  </div>
                </div>
                <div style={{ padding: 32 }}>
                  <h4 style={{ color: "var(--hyper-yellow)", marginBottom: 20 }}>Includes:</h4>
                  <ul
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.95rem",
                      paddingLeft: 20,
                      marginBottom: 30,
                    }}
                  >
                    {tier.features.map((feature) => (
                      <li key={feature} style={{ marginBottom: 10 }}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a href="#demo" className={tier.ctaClass} style={{ width: "100%" }}>
                    <i className="fas fa-rocket"></i>
                    {tier.cta}
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div id="audit-shield" style={{ marginTop: 60 }} className="reporting-card">
            <div className="section-header" style={{ marginBottom: 24 }}>
              <h2>Audit Shield Service Packages & Pricing</h2>
              <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
                Premium compliance protection with clear, value-based tiers
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
              {[
                {
                  title: "Audit Ready (Preventative)",
                  target: "All fleets who want proactive compliance",
                  oneTime: "Included in Professional Bundle & above",
                  retainer: "$2,495/year ($208/month)",
                  value:
                    "Your proactive insurance. A serious, high‑value layer to prevent $8,000+ fines and 80+ hours of panic.",
                  includes: [
                    "One‑Click Audit Packet in DocPulse",
                    "Quarterly compliance health scan report",
                    "Semi‑annual audit preparedness strategy call",
                    "Audit playbook with checklists & templates",
                  ],
                },
                {
                  title: "Audit Defense (FLAGSHIP)",
                  target: "Audited fleets needing immediate crisis help",
                  oneTime: "$8,500–$15,000 per audit",
                  retainer: "N/A",
                  value:
                    "Your expert defense team. Priced for high‑stakes outcomes and liability—protecting $30k–$100k+ risk.",
                  includes: [
                    "Immediate triage + response plan (24 hrs)",
                    "End‑to‑end document gathering & submission",
                    "Direct expert representation in meetings",
                    "Penalty negotiation + dispute support",
                    "Post‑audit resolution report",
                  ],
                },
                {
                  title: "Audit Concierge (Elite)",
                  target: "High‑risk, hazmat, or 25+ truck fleets",
                  oneTime: "$25,000+ per audit",
                  retainer: "$25,000+/year",
                  value:
                    "Your full‑time compliance department. White‑glove, dedicated protection for mission‑critical fleets.",
                  includes: [
                    "Dedicated audit liaison (single point of contact)",
                    "Unlimited, priority support",
                    "Bi‑monthly compliance reviews",
                    "Guaranteed 4‑hour response time",
                    "24‑hour packet preparation",
                  ],
                },
              ].map((tier) => (
                <div key={tier.title} className="benefit-card" style={{ textAlign: "left" }}>
                  <h3 style={{ marginBottom: 10 }}>{tier.title}</h3>
                  <p style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "0.95rem" }}>
                    <strong>Best for:</strong> {tier.target}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>ONE‑TIME FEE</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--hyper-yellow)" }}>
                      {tier.oneTime}
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>ANNUAL RETAINER</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{tier.retainer}</div>
                  </div>
                  <p style={{ marginTop: 12, color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                    {tier.value}
                  </p>
                  <ul style={{ paddingLeft: 18, marginTop: 12, color: "rgba(255,255,255,0.8)" }}>
                    {tier.includes.map((item) => (
                      <li key={item} style={{ marginBottom: 6 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 60 }} className="reporting-card">
            <div className="section-header" style={{ marginBottom: 24 }}>
              <h2>The Dump Truck Audit Nightmare: Pain Points You Solve</h2>
              <p style={{ color: "var(--hyper-yellow)", fontWeight: 600 }}>
                Every audit phase mapped to an Audit Shield solution
              </p>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                {
                  phase: "The Audit Notice",
                  panic: "Panic: “What did we do wrong? Where do we even start?” Scrambling to find records.",
                  solution:
                    "Immediate Audit Triage: A dedicated specialist explains the notice in plain English and builds a Strategic Response Plan.",
                },
                {
                  phase: "Document Gathering",
                  panic:
                    "Chaos: Weeks wasted digging through filing cabinets, emails, and disparate software for logs, tickets, receipts.",
                  solution:
                    "One‑Click Audit Packet: DocPulse generates a complete, organized digital packet with time‑stamped records.",
                },
                {
                  phase: "Discrepancy Analysis",
                  panic:
                    "Fear: Finding errors before the auditor does (missing tickets, unlogged miles, HOS violations).",
                  solution:
                    "Pre‑Audit Health Scan: Automated compliance checks flag vulnerabilities with clear explanations.",
                },
                {
                  phase: "Agent Interaction",
                  panic:
                    "Intimidation: Nervous owners/staff saying the wrong thing to auditors.",
                  solution:
                    "Representation & Coaching: Guided representation or role‑play coaching for common questions.",
                },
                {
                  phase: "Resolution & Appeal",
                  panic:
                    "Cost: Unprepared for fines, penalties, and calculating what they truly owe.",
                  solution:
                    "Dispute Support & Negotiation: Challenge unjust penalties with evidence and clear liability math.",
                },
              ].map((row) => (
                <div
                  key={row.phase}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.4fr 1.6fr",
                    gap: 16,
                    background: "rgba(30,30,30,0.6)",
                    borderRadius: 12,
                    border: "1px solid rgba(255,215,0,0.2)",
                    padding: 16,
                  }}
                >
                  <div style={{ color: "var(--hyper-yellow)", fontWeight: 700 }}>{row.phase}</div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.95rem" }}>{row.panic}</div>
                  <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.95rem" }}>{row.solution}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Link href="/audit-support-for-trucking-companies" prefetch={false} className="btn btn-secondary">
                Learn More About Audit Shield
              </Link>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div
              style={{
                background: "rgba(0, 180, 255, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 40,
                border: "1px solid rgba(0, 180, 255, 0.3)",
                maxWidth: 900,
                margin: "0 auto",
              }}
            >
              <h3 style={{ color: "var(--turbo-blue)", marginBottom: 12 }}>
                Starter Pilot (Risk‑Free)
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.95rem" }}>
                Try <strong>AccuriScale</strong> for 90 days with a $0 deposit. Only pay the
                $799/month fee if you recover more than <strong>$5,000</strong> in disputed loads.
              </p>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 18 }}>
                Start Pilot
              </a>
              <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", marginTop: 12 }}>
                Value‑first guarantee designed for 1–2 truck operators and new pits.
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div
              style={{
                background: "rgba(255, 40, 0, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 40,
                border: "1px solid rgba(255, 40, 0, 0.3)",
                maxWidth: 980,
                margin: "0 auto",
              }}
            >
              <h3 style={{ color: "var(--performance-red)", marginBottom: 12 }}>
                The 90‑Day Pit Profit Guarantee
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "0.95rem" }}>
                We implement the <strong>VeriFlow Pit‑to‑Pay Suite</strong> in your operation.
                You pay <strong>$0 for 90 days</strong>. If AccuriScale doesn’t identify at least
                <strong> 5x its monthly cost</strong> in discrepancies and savings, you owe nothing.
              </p>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 18 }}>
                Start the 90‑Day Guarantee
              </a>
              <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.85rem", marginTop: 12 }}>
                Built for pits, quarries, and bulk material haulers who need proof before commitment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="switch-benefits" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: "center" }}>
            <h2>
              Integrated 3‑Module Demo{" "}
              <span className="speed-gradient">End‑to‑End Proof</span>
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.8)" }}>
              Show the connected story: ingest → reconcile → payroll export.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {demoFlowSteps.map((step) => (
              <div key={step.title} className="benefit-card" style={{ textAlign: "left" }}>
                <h3 style={{ marginBottom: 8 }}>{step.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>{step.description}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 30, textAlign: "center" }}>
            <div
              style={{
                background: "rgba(255, 215, 0, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 28,
                border: "1px solid rgba(255, 215, 0, 0.3)",
                maxWidth: 920,
                margin: "0 auto",
              }}
            >
              <p style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                Demo script: “Show me Excel → Ticket, then Pit invoice mismatch, then that approved ticket exported to
                QuickBooks.”
              </p>
              <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ marginTop: 16 }}>
                Request the 3‑Module Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="switch-benefits" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: "center" }}>
            <h2>
              Module 1: Excel‑to‑Ticket Reconciliation{" "}
              <span className="speed-gradient">Validation Checklist</span>
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.8)" }}>
              Objective: verify the workflow is complete, connected, and automated.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              {
                title: "What to Ask",
                points: [
                  "“Show me the column mapping setup.”",
                  "“What happens if my Excel has a blank cell or typo?”",
                  "“After import, where do the tickets go?”",
                ],
              },
              {
                title: "What to Demand to See",
                points: [
                  "Drag/drop header mapping into Ronyx fields.",
                  "An Import Exceptions report listing bad rows.",
                  "Tickets in Live Loads/Dispatch with “Ready” status.",
                ],
              },
              {
                title: "Red Flags",
                points: [
                  "“We’ll handle the setup for you.”",
                  "Silent failures or bad tickets created.",
                  "Tickets stuck in an imports screen only.",
                ],
              },
            ].map((column) => (
              <div key={column.title} className="benefit-card" style={{ textAlign: "left" }}>
                <h3 style={{ marginBottom: 8 }}>{column.title}</h3>
                <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.8)" }}>
                  {column.points.map((point) => (
                    <li key={point} style={{ marginBottom: 8 }}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div
              style={{
                background: "rgba(0, 180, 255, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 24,
                border: "1px solid rgba(0, 180, 255, 0.3)",
                maxWidth: 920,
                margin: "0 auto",
              }}
            >
              <p style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                Live test: “Use my Excel from last Tuesday. Map the columns, create tickets, and show one on the
                dispatch board.”
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="switch-benefits" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: "center" }}>
            <h2>
              Module 3: Payroll (Ticket‑to‑Driver){" "}
              <span className="speed-gradient">Validation Checklist</span>
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.8)" }}>
              Objective: confirm payroll is automated, itemized, and exportable to QuickBooks.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              {
                title: "What to Ask",
                points: [
                  "“Where are driver pay rules set?”",
                  "“Show me the payroll calculation for Driver D. Perez last week.”",
                  "“Show me the export to QuickBooks.”",
                  "“What if I need to correct a ticket after payroll is run?”",
                ],
              },
              {
                title: "What to Demand to See",
                points: [
                  "Driver profile showing pay type and base rate.",
                  "Itemized pay stub with delivered tickets + deductions.",
                  "Export button and actual .IIF file (or QBO connect screen).",
                  "Re‑open pay period / void payroll before export.",
                ],
              },
              {
                title: "Red Flags",
                points: [
                  "Rules only in a spreadsheet‑like table.",
                  "Single total with no ticket breakdown.",
                  "Payroll approved but no export proof.",
                  "“Fix it in QuickBooks manually.”",
                ],
              },
            ].map((column) => (
              <div key={column.title} className="benefit-card" style={{ textAlign: "left" }}>
                <h3 style={{ marginBottom: 8 }}>{column.title}</h3>
                <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.8)" }}>
                  {column.points.map((point) => (
                    <li key={point} style={{ marginBottom: 8 }}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div
              style={{
                background: "rgba(255, 40, 0, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 24,
                border: "1px solid rgba(255, 40, 0, 0.3)",
                maxWidth: 920,
                margin: "0 auto",
              }}
            >
              <p style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                Live test: “Show D. Perez’s pay stub for last week, the tickets that make it up, then generate the
                QuickBooks export file.”
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="launch-partner" className="switch-benefits">
        <div className="container">
          <div className="section-header" style={{ textAlign: "center" }}>
            <h2>
              Become a <span className="speed-gradient">Launch Partner</span>
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.8)" }}>
              A low‑risk pilot with real‑world feedback and a locked‑in launch partner rate.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              {
                title: "90‑Day Evaluation",
                points: [
                  "Discounted or free access during the pilot",
                  "Weekly feedback loop with dedicated support",
                  "Focus on Excel → Ticket, Pit Match, Payroll export",
                ],
              },
              {
                title: "Launch Partner Contract",
                points: [
                  "12‑month contract after success metrics hit",
                  "Launch partner rate at least 30% below public pricing",
                  "Rate locked for the initial contract term",
                ],
              },
              {
                title: "Success Metrics",
                points: [
                  "Reduce admin time by X hours per week",
                  "Catch Y% of discrepancies before billing",
                  "Run a full cycle without manual re‑entry",
                ],
              },
            ].map((column) => (
              <div key={column.title} className="benefit-card" style={{ textAlign: "left" }}>
                <h3 style={{ marginBottom: 8 }}>{column.title}</h3>
                <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.8)" }}>
                  {column.points.map((point) => (
                    <li key={point} style={{ marginBottom: 8 }}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div
              style={{
                background: "rgba(0, 255, 157, 0.08)",
                borderRadius: "var(--radius-smooth)",
                padding: 24,
                border: "1px solid rgba(0, 255, 157, 0.3)",
                maxWidth: 920,
                margin: "0 auto",
              }}
            >
              <p style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                “I’m willing to be a launch partner. I’ll provide feedback and real‑world usage. In return, I need a
                90‑day evaluation and a launch partner rate if the system hits our metrics.”
              </p>
              <a href="/launch-partner" className="btn btn-primary" style={{ marginTop: 16 }}>
                Apply to Become a Launch Partner
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="switch-benefits">
        <div className="container">
          <div className="section-header" style={{ textAlign: "center" }}>
            <h2>
              {t("demoMenuTitle")}: <span className="speed-gradient">Move Fast</span>
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.8)" }}>{t("demoMenuSubtitle")}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {demoMenuOptions.map((demo) => (
              <div key={demo.title} className="benefit-card" style={{ textAlign: "left" }}>
                <h3 style={{ marginBottom: 8 }}>{demo.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.95rem" }}>
                  <strong>{t("demoMenuForLabel")}:</strong> {demo.forWho}
                </p>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem" }}>
                  <strong>{t("demoMenuAssetLabel")}:</strong> {demo.asset}
                </p>
                <a
                  href={`mailto:sales@movearoundtms.com?subject=${encodeURIComponent(demo.subject)}`}
                  className="btn btn-primary"
                  style={{ marginTop: 14, width: "100%" }}
                >
                  {t("demoMenuCta")}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer-performance">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="logo" style={{ marginBottom: 30 }}>
                <div className="logo-icon">M</div>
                <div className="logo-text">MoveAround TMS</div>
              </div>
              <p style={{ color: "rgba(255, 255, 255, 0.7)", marginBottom: 30, maxWidth: 400 }}>
                Bulletproof fleet intelligence. 99.99% uptime. 30-day implementation. 214% average ROI.
              </p>
            </div>

            <div>
              <h4 style={{ color: "var(--speed-white)", marginBottom: 25, fontSize: "1.1rem" }}>
                Modules
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: 15 }}>
                  <a href="#modules" className="nav-link">TicketFlash OCR</a>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <a href="#modules" className="nav-link">AccuriScale</a>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <a href="#modules" className="nav-link">TMS Platform</a>
                </li>
                <li>
                  <a href="#modules" className="nav-link">Cross-Border</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 style={{ color: "var(--speed-white)", marginBottom: 25, fontSize: "1.1rem" }}>
                Company
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: 15 }}>
                  <a href="#onboarding" className="nav-link">Onboarding</a>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <a href="#reporting" className="nav-link">Reporting</a>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <Link href="/compare" prefetch={false} className="nav-link">Compare</Link>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <Link href="/integrations" prefetch={false} className="nav-link">Integrations</Link>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <Link href="/for-shippers" prefetch={false} className="nav-link">For Shippers</Link>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <Link href="/roadmap" prefetch={false} className="nav-link">Roadmap</Link>
                </li>
                <li style={{ marginBottom: 15 }}>
                  <Link href="/audit-support-for-trucking-companies" prefetch={false} className="nav-link">Audit Shield</Link>
                </li>
                <li>
                  <a href="#pricing" className="nav-link">Pricing</a>
                </li>
                <li style={{ marginTop: 15 }}>
                  <a href="#audit-shield" className="nav-link">Audit Shield</a>
                </li>
                <li style={{ marginTop: 15 }}>
                  <Link href="/terms" prefetch={false} className="nav-link">Terms</Link>
                </li>
                <li style={{ marginTop: 10 }}>
                  <Link href="/privacy" prefetch={false} className="nav-link">Privacy</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 style={{ color: "var(--speed-white)", marginBottom: 25, fontSize: "1.1rem" }}>
                Get Started
              </h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: 15, color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
                  <i className="fas fa-envelope" style={{ color: "var(--hyper-yellow)", marginRight: 10 }}></i>
                  sales@movearoundtms.com
                </li>
                <li style={{ marginBottom: 15, color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
                  <i className="fas fa-map-marker-alt" style={{ color: "var(--turbo-blue)", marginRight: 10 }}></i>
                  Houston, TX
                </li>
                <li style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
                  <i className="fas fa-dollar-sign" style={{ color: "var(--success-green)", marginRight: 10 }}></i>
                  Startup Deposit: $999
                </li>
              </ul>
            </div>
          </div>

          <div style={{ textAlign: "center", paddingTop: 50, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <p style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.875rem" }}>
              © {new Date().getFullYear()} MoveAround TMS. From Street Smart to Fleet Smart.
            </p>
            <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "0.75rem", marginTop: 10 }}>
              99.99% Uptime Guarantee • 7-Day Implementation • 214% Average ROI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
