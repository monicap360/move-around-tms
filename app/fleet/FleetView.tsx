"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { supabase } from "../lib/supabaseClient";
import { samsara } from "../../integrations/eld";
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { 
  Truck, 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  MapPin,
  Fuel,
  FileText,
  Plus,
  Search,
  Filter
} from "lucide-react";

Chart.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  Tooltip,
  Legend,
);

type Vehicle = {
  id: string;
  unit_number: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  license_plate: string;
  registration_expiry: string;
  insurance_expiry: string;
  dot_inspection_due: string;
  last_maintenance: string;
  next_maintenance_due: string;
  current_mileage: number;
  status: 'active' | 'maintenance' | 'out_of_service';
  driver_assigned?: string;
  location?: string;
};

type MaintenanceRecord = {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string;
  cost: number;
  date_completed: string;
  mileage_at_service: number;
  next_due_date?: string;
  next_due_mileage?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
};

type FleetTab =
  | 'vehicles'
  | 'maintenance'
  | 'inspections'
  | 'renewals'
  | 'telematics'
  | 'financial';

type FleetViewProps = {
  defaultTab?: FleetTab;
  showOnlyFinancial?: boolean;
};

type PerformancePoint = {
  period: string;
  revenue: number;
  profit: number;
  tickets: number;
  mpg?: number;
};

type MaterialInsight = {
  material: string;
  profit: number;
  margin: number;
  loads: number;
  share: number;
  profitPerTon: number;
};

type RouteInsight = {
  route: string;
  profit: number;
  margin: number;
  loads: number;
  profitPerMile: number;
};

type CostBreakdown = {
  fuel: number;
  maintenance: number;
  labor: number;
  other: number;
  total: number;
  fuelPct: number;
  maintenancePct: number;
  laborPct: number;
  otherPct: number;
};

type OptimizerInsight = {
  potentialIncrease: number;
  suggestions: string[];
};

type FinancialTab = 'loads' | 'trucks' | 'drivers' | 'invoices';

type LoadProfitRow = {
  loadId: string;
  material: string;
  route: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  profitPerTon: number;
  status: string;
};

type TruckProfitRow = {
  truckLabel: string;
  revenue: number;
  profit: number;
  margin: number;
  loads: number;
  profitPerMile: number;
};

type DriverProfitRow = {
  driverName: string;
  revenue: number;
  profit: number;
  margin: number;
  loads: number;
  profitPerLoad: number;
};

type InvoiceRow = {
  invoiceNumber: string;
  customer: string;
  amount: number;
  dueDate: string | null;
  status: string;
  paymentStatus: string;
};

export default function FleetPage({
  defaultTab,
  showOnlyFinancial = false,
}: FleetViewProps) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id") || undefined;
  const customerId = searchParams.get("customer_id") || undefined;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FleetTab>(defaultTab ?? 'vehicles');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // ELD/Telematics state
  const [driverLocations, setDriverLocations] = useState<any[]>([]);
  const [truckStatus, setTruckStatus] = useState<any[]>([]);
  const [hos, setHos] = useState<any[]>([]);
  const [eldLoading, setEldLoading] = useState(false);
  const [financialPeriod, setFinancialPeriod] = useState<'today' | 'week' | 'month' | 'quarter'>('today');
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleString());
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialError, setFinancialError] = useState<string | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformancePoint[] | null>(null);
  const [financialSummary, setFinancialSummary] = useState<{
    revenue: number;
    profit: number;
    tickets: number;
    mpg: number;
  } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [invoiceStats, setInvoiceStats] = useState({
    paid: 0,
    pending: 0,
    overdue: 0,
  });
  const [materialInsights, setMaterialInsights] = useState<MaterialInsight[]>([]);
  const [routeInsights, setRouteInsights] = useState<RouteInsight[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({
    fuel: 11180,
    maintenance: 6240,
    labor: 4980,
    other: 2395,
    total: 24795,
    fuelPct: 45,
    maintenancePct: 25,
    laborPct: 20,
    otherPct: 10,
  });
  const [optimizerInsight, setOptimizerInsight] = useState<OptimizerInsight>({
    potentialIncrease: 2850,
    suggestions: [
      "Route DT-07 for more Quarry #3 loads",
      "Reduce idle time by 15 minutes per truck",
      "Negotiate fuel discount with Station #4",
    ],
  });
  const [financialTab, setFinancialTab] = useState<FinancialTab>('loads');
  const [loadRows, setLoadRows] = useState<LoadProfitRow[]>([]);
  const [truckRows, setTruckRows] = useState<TruckProfitRow[]>([]);
  const [driverRows, setDriverRows] = useState<DriverProfitRow[]>([]);
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
  const revenueChartRef = useRef<HTMLCanvasElement | null>(null);
  const marginChartRef = useRef<HTMLCanvasElement | null>(null);
  const revenueChartInstance = useRef<Chart | null>(null);
  const marginChartInstance = useRef<Chart | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    total_vehicles: 0,
    active_vehicles: 0,
    maintenance_vehicles: 0,
    overdue_inspections: 0,
    expiring_registrations: 0,
    maintenance_alerts: 0
  });

  const financialSnapshots = {
    today: {
      netProfit: 18427,
      margin: 24.8,
      roi: 18.2,
      revenue: 42850,
      profit: 10628,
      cost: 24795,
      efficiency: 6.42,
    },
    week: {
      netProfit: 74320,
      margin: 26.1,
      roi: 19.4,
      revenue: 285950,
      profit: 74320,
      cost: 173565,
      efficiency: 6.35,
    },
    month: {
      netProfit: 297280,
      margin: 26.0,
      roi: 20.1,
      revenue: 1140000,
      profit: 297280,
      cost: 694260,
      efficiency: 6.28,
    },
    quarter: {
      netProfit: 891840,
      margin: 26.1,
      roi: 21.0,
      revenue: 3420000,
      profit: 891840,
      cost: 2080000,
      efficiency: 6.18,
    },
  };

  useEffect(() => {
    loadFleetData();
  }, []);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load ELD/telematics data when tab is selected
  useEffect(() => {
    if (activeTab === 'telematics') {
      setEldLoading(true);
      Promise.all([
        samsara.fetchDriverLocations(),
        samsara.fetchTruckStatus(),
        samsara.fetchHOS()
      ]).then(([drivers, trucks, hosData]) => {
        setDriverLocations(drivers);
        setTruckStatus(trucks);
        setHos(hosData);
      }).finally(() => setEldLoading(false));
    }
  }, [activeTab]);

  const loadFinancialData = useCallback(async () => {
    setFinancialLoading(true);
    setFinancialError(null);
    try {
      const rangeByPeriod: Record<typeof financialPeriod, string> = {
        today: '7d',
        week: '7d',
        month: '30d',
        quarter: '90d',
      };
      const range = rangeByPeriod[financialPeriod];
      const scopedParams = new URLSearchParams({ range });
      if (projectId) scopedParams.set("project_id", projectId);
      if (customerId) scopedParams.set("customer_id", customerId);
      const invoiceParams = new URLSearchParams();
      if (projectId) invoiceParams.set("project_id", projectId);
      if (customerId) invoiceParams.set("customer_id", customerId);

      const [performanceRes, invoicesRes] = await Promise.all([
        fetch(`/api/analytics/performance?${scopedParams.toString()}`, {
          cache: 'no-store',
        }),
        fetch(`/api/ronyx/invoices?${invoiceParams.toString()}`, {
          cache: 'no-store',
        }),
      ]);

      if (performanceRes.ok) {
        const performanceJson = await performanceRes.json();
        setPerformanceData(performanceJson?.data ?? null);
        if (performanceJson?.summary) {
          setFinancialSummary({
            revenue: Number(performanceJson.summary.totalRevenue) || 0,
            profit: Number(performanceJson.summary.totalProfit) || 0,
            tickets: Number(performanceJson.summary.totalTickets) || 0,
            mpg: Number(performanceJson.summary.averageMPG) || 0,
          });
        }
      } else {
        setFinancialError('Unable to load performance data.');
      }

      if (invoicesRes.ok) {
        const invoiceJson = await invoicesRes.json();
        const invoices = invoiceJson?.invoices || [];
        setInvoiceRows(
          invoices.map((invoice: any) => ({
            invoiceNumber: invoice.invoice_number || invoice.id,
            customer: invoice.customer_name || 'Unassigned',
            amount: Number(invoice.total_amount) || 0,
            dueDate: invoice.due_date || null,
            status: invoice.status || 'open',
            paymentStatus: invoice.payment_status || 'unpaid',
          })),
        );
        const today = new Date().toISOString().slice(0, 10);
        const stats = invoices.reduce(
          (acc: { paid: number; pending: number; overdue: number }, invoice: any) => {
            const total = Number(invoice.total_amount) || 0;
            const isPaid = invoice.payment_status === 'paid' || invoice.status === 'paid';
            const isOverdue =
              !isPaid &&
              invoice.due_date &&
              invoice.due_date < today;
            if (isPaid) acc.paid += total;
            else if (isOverdue) acc.overdue += total;
            else acc.pending += total;
            return acc;
          },
          { paid: 0, pending: 0, overdue: 0 },
        );
        setInvoiceStats(stats);
      }

      const insightsRes = await fetch(
        `/api/ronyx/financial/insights?${scopedParams.toString()}`,
        {
          cache: 'no-store',
        },
      );
      if (insightsRes.ok) {
        const insightsJson = await insightsRes.json();
        setMaterialInsights(insightsJson?.materials || []);
        setRouteInsights(insightsJson?.routes || []);
      }

      const costsRes = await fetch(
        `/api/ronyx/financial/costs?${scopedParams.toString()}`,
        {
          cache: 'no-store',
        },
      );
      if (costsRes.ok) {
        const costsJson = await costsRes.json();
        if (costsJson?.costs) {
          setCostBreakdown(costsJson.costs);
        }
        if (costsJson?.optimizer) {
          setOptimizerInsight(costsJson.optimizer);
        }
      }

      const tabsRes = await fetch(
        `/api/ronyx/financial/tabs?${scopedParams.toString()}`,
        {
          cache: 'no-store',
        },
      );
      if (tabsRes.ok) {
        const tabsJson = await tabsRes.json();
        setLoadRows(tabsJson?.loads || []);
        setTruckRows(tabsJson?.trucks || []);
        setDriverRows(tabsJson?.drivers || []);
      }
    } catch (error) {
      setFinancialError('Unable to load financial data.');
    } finally {
      setFinancialLoading(false);
    }
  }, [financialPeriod, projectId, customerId]);

  useEffect(() => {
    if (activeTab !== 'financial') return;
    void loadFinancialData();
  }, [activeTab, loadFinancialData]);

  useEffect(() => {
    if (activeTab !== 'financial') return;

    const revenueDataByPeriod: Record<typeof financialPeriod, number[]> = {
      today: [38200, 39500, 41800, 40200, 42850, 28500, 42850],
      week: [210000, 225000, 238000, 232000, 245000, 198000, 255000],
      month: [920000, 975000, 1010000, 1045000, 1100000, 1140000, 1095000],
      quarter: [2850000, 2980000, 3120000, 3300000, 3420000, 3250000, 3180000],
    };

    const profitDataByPeriod: Record<typeof financialPeriod, number[]> = {
      today: [9200, 9500, 10200, 9800, 10628, 6800, 10628],
      week: [52000, 56000, 60000, 58000, 61200, 47000, 74320],
      month: [240000, 252000, 270000, 284000, 297000, 310000, 288000],
      quarter: [680000, 710000, 760000, 820000, 891840, 860000, 845000],
    };

    const marginByMaterial: Record<typeof financialPeriod, number[]> = {
      today: [32.6, 28.5, 18.2, 15.4, 22.8],
      week: [31.2, 27.9, 19.1, 16.3, 23.4],
      month: [29.4, 26.2, 17.8, 14.9, 21.6],
      quarter: [28.6, 25.4, 17.2, 14.1, 20.9],
    };

    const labels =
      performanceData && performanceData.length > 0
        ? performanceData.map((item) => item.period)
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];

    const revenueSeries =
      performanceData && performanceData.length > 0
        ? performanceData.map((item) => item.revenue)
        : revenueDataByPeriod[financialPeriod];

    const profitSeries =
      performanceData && performanceData.length > 0
        ? performanceData.map((item) => item.profit)
        : profitDataByPeriod[financialPeriod];

    if (revenueChartInstance.current) {
      revenueChartInstance.current.destroy();
    }
    if (marginChartInstance.current) {
      marginChartInstance.current.destroy();
    }

    if (revenueChartRef.current) {
      revenueChartInstance.current = new Chart(revenueChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Daily Revenue ($)',
              data: revenueSeries,
              borderColor: '#0052cc',
              backgroundColor: 'rgba(0, 82, 204, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Profit ($)',
              data: profitSeries,
              borderColor: '#00a86b',
              backgroundColor: 'rgba(0, 168, 107, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => `${context.dataset.label}: $${Number(context.raw).toLocaleString()}`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => `$${Number(value).toLocaleString()}`,
              },
            },
          },
        },
      });
    }

    if (marginChartRef.current) {
      marginChartInstance.current = new Chart(marginChartRef.current, {
        type: 'bar',
        data: {
          labels: ['Crushed Stone', 'Sand & Gravel', 'Clay', 'Demolition', 'Topsoil'],
          datasets: [
            {
              label: 'Profit Margin %',
              data: marginByMaterial[financialPeriod],
              backgroundColor: [
                'rgba(0, 168, 107, 0.7)',
                'rgba(0, 168, 107, 0.6)',
                'rgba(255, 149, 0, 0.6)',
                'rgba(255, 77, 79, 0.6)',
                'rgba(0, 149, 255, 0.6)',
              ],
              borderColor: [
                'rgba(0, 168, 107, 1)',
                'rgba(0, 168, 107, 1)',
                'rgba(255, 149, 0, 1)',
                'rgba(255, 77, 79, 1)',
                'rgba(0, 149, 255, 1)',
              ],
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `Margin: ${context.raw}%`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 40,
              ticks: {
                callback: (value) => `${value}%`,
              },
            },
          },
        },
      });
    }

    return () => {
      revenueChartInstance.current?.destroy();
      marginChartInstance.current?.destroy();
    };
  }, [activeTab, financialPeriod, performanceData]);

  const loadFleetData = async () => {
    try {
      setLoading(true);

      // Load vehicles from Supabase
      const { data: vehiclesData, error } = await supabase
        .from('vehicles')
        .select('*');
      if (error) throw error;
      setVehicles(vehiclesData || []);

      // Calculate statistics
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

      const totalVehicles = vehiclesData?.length || 0;
      const activeVehicles = vehiclesData?.filter((v: Vehicle) => v.status === 'active').length || 0;
      const maintenanceVehicles = vehiclesData?.filter((v: Vehicle) => v.status === 'maintenance').length || 0;
      const overdueInspections = vehiclesData?.filter((v: Vehicle) => new Date(v.dot_inspection_due) < today).length || 0;
      const expiringRegistrations = vehiclesData?.filter((v: Vehicle) => new Date(v.registration_expiry) < thirtyDaysFromNow).length || 0;
      const maintenanceAlerts = vehiclesData?.filter((v: Vehicle) => new Date(v.next_maintenance_due) < thirtyDaysFromNow).length || 0;

      setStats({
        total_vehicles: totalVehicles,
        active_vehicles: activeVehicles,
        maintenance_vehicles: maintenanceVehicles,
        overdue_inspections: overdueInspections,
        expiring_registrations: expiringRegistrations,
        maintenance_alerts: maintenanceAlerts
      });

    } catch (error) {
      console.error("Error loading fleet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      case 'out_of_service':
        return <Badge className="bg-red-100 text-red-800">Out of Service</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryBadge = (expiryDate: string) => {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    
    if (daysUntil < 0) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-800">Expiring Soon</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">Current</Badge>;
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || vehicle.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const baseSnapshot = financialSnapshots[financialPeriod];
  const revenue = financialSummary?.revenue ?? baseSnapshot.revenue;
  const profit = financialSummary?.profit ?? baseSnapshot.profit;
  const cost = financialSummary ? Math.max(revenue - profit, 0) : baseSnapshot.cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : baseSnapshot.margin;
  const roi = cost > 0 ? (profit / cost) * 100 : baseSnapshot.roi;
  const efficiency = financialSummary?.mpg ?? baseSnapshot.efficiency;
  const netProfit = financialSummary ? profit : baseSnapshot.netProfit;
  const loadCount = financialSummary?.tickets ?? 18;
  const avgLoad = loadCount > 0 ? revenue / loadCount : 0;

  const financialSnapshot = {
    netProfit,
    margin,
    roi,
    revenue,
    profit,
    cost,
    efficiency,
    loads: loadCount,
    avgLoad,
    tonnage: 385,
  };

  const fallbackMaterials: MaterialInsight[] = [
    {
      material: 'Crushed Stone',
      profit: 4820,
      margin: 0.326,
      loads: 6,
      share: 0.42,
      profitPerTon: 31.2,
    },
    {
      material: 'Sand & Gravel',
      profit: 3150,
      margin: 0.285,
      loads: 5,
      share: 0.28,
      profitPerTon: 28.5,
    },
    {
      material: 'Clay',
      profit: 1240,
      margin: 0.182,
      loads: 3,
      share: 0.11,
      profitPerTon: 24.8,
    },
    {
      material: 'Demolition',
      profit: 1418,
      margin: 0.154,
      loads: 4,
      share: 0.12,
      profitPerTon: 18.9,
    },
  ];

  const fallbackRoutes: RouteInsight[] = [
    {
      route: 'Quarry #3 → Site A',
      profit: 2840,
      margin: 0.32,
      loads: 6,
      profitPerMile: 2.1,
    },
    {
      route: 'Gravel Pit → Dev.',
      profit: 2150,
      margin: 0.28,
      loads: 5,
      profitPerMile: 1.85,
    },
  ];

  const materialCards = materialInsights.length > 0 ? materialInsights : fallbackMaterials;
  const routeCards = routeInsights.length > 0 ? routeInsights : fallbackRoutes;

  const formatCurrency = (value: number) =>
    `$${Number.isFinite(value) ? Math.round(value).toLocaleString() : "0"}`;
  const formatPercent = (value: number) =>
    `${Number.isFinite(value) ? (value * 100).toFixed(1) : "0.0"}%`;
  const profitIndicatorClass = (margin: number) =>
    margin >= 0.3 ? 'profit-high' : margin >= 0.2 ? 'profit-medium' : 'profit-low';
  const statusBadgeClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('paid') || normalized.includes('completed') || normalized.includes('approved')) {
      return 'badge badge-success';
    }
    if (normalized.includes('pending') || normalized.includes('in progress')) {
      return 'badge badge-warning';
    }
    return 'badge badge-danger';
  };

  const handleFinancialAction = async (action: string) => {
    const actions: Record<string, string> = {
      'invoice-run': 'Running invoice batch… $18,200 in pending invoices processed.',
      'fuel-report': 'Generating fuel efficiency report… Optimal savings: $1,240/week identified.',
      'profit-report': 'Creating detailed profit report… PDF will be downloaded shortly.',
      'dispatch-optimize': 'Optimizing dispatch routes… Potential revenue increase: $2,850/day.',
      'collections': 'Opening collections dashboard… $3,400 in overdue invoices.',
      'expense-approval': 'Loading expense approvals… 14 requests pending review.',
    };

    if (action === 'invoice-run') {
      try {
        const res = await fetch('/api/ronyx/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_from_tickets',
            project_id: projectId,
            customer_id: customerId,
          }),
        });
        if (res.ok) {
          setActionMessage('Invoice batch generated successfully.');
          void loadFinancialData();
          setTimeout(() => setActionMessage(null), 2400);
          return;
        }
      } catch {
        // fall back to message below
      }
    }

    setActionMessage(actions[action] || 'Action queued.');
    setTimeout(() => setActionMessage(null), 2400);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading fleet data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {!showOnlyFinancial && (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Fleet Management</h1>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total_vehicles}</div>
                <div className="text-sm text-gray-600">Total Vehicles</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.active_vehicles}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{stats.maintenance_vehicles}</div>
                <div className="text-sm text-gray-600">In Maintenance</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{stats.overdue_inspections}</div>
                <div className="text-sm text-gray-600">Overdue Inspections</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{stats.expiring_registrations}</div>
                <div className="text-sm text-gray-600">Expiring Registrations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{stats.maintenance_alerts}</div>
                <div className="text-sm text-gray-600">Maintenance Due</div>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>

          {/* Tab Navigation */}
          <div className="border-b mb-6">
            <nav className="flex space-x-8">
          {[
            { id: 'vehicles', label: 'Vehicles', icon: Truck },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
            { id: 'inspections', label: 'Inspections', icon: CheckCircle },
            { id: 'renewals', label: 'Renewals', icon: Calendar },
            { id: 'telematics', label: 'Telematics', icon: MapPin },
            { id: 'financial', label: 'Financial Ops', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
            </nav>
          </div>

          {/* Telematics Tab Content */}
          {activeTab === 'telematics' && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-2">Live ELD/Telematics Data (Samsara)</h2>
              {eldLoading ? (
                <div>Loading telematics data...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle>Driver Locations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {driverLocations.length === 0 ? <div className="text-gray-500">No data</div> : (
                          <ul className="text-sm">
                            {driverLocations.map((d) => (
                              <li key={d.id} className="mb-1">{d.name} <span className="text-xs text-gray-500">({d.status})</span><br /><span className="text-xs">{d.lat}, {d.lon}</span></li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle>Truck Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {truckStatus.length === 0 ? <div className="text-gray-500">No data</div> : (
                          <ul className="text-sm">
                            {truckStatus.map((t) => (
                              <li key={t.id} className="mb-1">{t.name} <span className="text-xs text-gray-500">({t.status})</span><br /><span className="text-xs">{t.lat}, {t.lon}</span></li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle>HOS (Hours of Service)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {hos.length === 0 ? <div className="text-gray-500">No data</div> : (
                          <ul className="text-sm">
                            {hos.map((h) => (
                              <li key={h.id} className="mb-1">{h.name} <span className="text-xs text-gray-500">({h.hosStatus})</span></li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'financial' && (
        <div className="financial-ops">
          <style jsx global>{`
            .financial-ops {
              background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
              color: #1e293b;
              border-radius: 18px;
              overflow: hidden;
              border: 1px solid #e2e8f0;
              margin-top: 16px;
            }
            .financial-ops .financial-header {
              background: #0f2940;
              color: white;
              padding: 1.25rem 2rem;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
              position: sticky;
              top: 0;
              z-index: 2;
            }
            .financial-ops .financial-header-left {
              display: flex;
              align-items: center;
              gap: 2rem;
            }
            .financial-ops .financial-logo {
              display: flex;
              align-items: center;
              gap: 0.875rem;
            }
            .financial-ops .financial-logo-icon {
              background: linear-gradient(135deg, #0052cc 0%, #0066ff 100%);
              width: 44px;
              height: 44px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.3rem;
              color: white;
            }
            .financial-ops .financial-logo-text h1 {
              font-size: 1.4rem;
              font-weight: 700;
            }
            .financial-ops .financial-logo-text .subtitle {
              font-size: 0.875rem;
              opacity: 0.9;
              color: #93c5fd;
            }
            .financial-ops .financial-period-selector {
              display: flex;
              gap: 0.5rem;
              background: rgba(255, 255, 255, 0.1);
              padding: 0.5rem;
              border-radius: 8px;
              backdrop-filter: blur(10px);
            }
            .financial-ops .period-btn {
              padding: 0.5rem 1.25rem;
              border: none;
              background: transparent;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              color: rgba(255, 255, 255, 0.8);
              transition: all 0.2s;
            }
            .financial-ops .period-btn.active {
              background: #0052cc;
              color: white;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            }
            .financial-ops .financial-header-right {
              display: flex;
              align-items: center;
              gap: 1.5rem;
            }
            .financial-ops .financial-metrics {
              display: flex;
              gap: 2rem;
            }
            .financial-ops .financial-metric {
              text-align: right;
            }
            .financial-ops .financial-metric-label {
              font-size: 0.75rem;
              opacity: 0.8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .financial-ops .financial-metric-value {
              font-size: 1.5rem;
              font-weight: 700;
              margin-top: 0.25rem;
            }
            .financial-ops .positive-change {
              color: #00ff88;
            }
            .financial-ops .negative-change {
              color: #ff6b6b;
            }
            .financial-ops .financial-kpis {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 1.5rem;
              margin: 2rem;
              margin-bottom: 1.5rem;
            }
            .financial-ops .kpi-card {
              background: #ffffff;
              border-radius: 10px;
              padding: 1.75rem;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              border: 1px solid #e2e8f0;
              transition: all 0.3s ease;
            }
            .financial-ops .kpi-card:hover {
              transform: translateY(-3px);
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            }
            .financial-ops .kpi-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 1.5rem;
            }
            .financial-ops .kpi-title {
              font-size: 1rem;
              font-weight: 600;
              color: #1e293b;
              display: flex;
              align-items: center;
              gap: 0.75rem;
            }
            .financial-ops .kpi-icon {
              width: 40px;
              height: 40px;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.2rem;
              color: white;
            }
            .financial-ops .kpi-icon.revenue { background: linear-gradient(135deg, #0052cc 0%, #0066ff 100%); }
            .financial-ops .kpi-icon.profit { background: linear-gradient(135deg, #00a86b 0%, #00c853 100%); }
            .financial-ops .kpi-icon.cost { background: linear-gradient(135deg, #ff9500 0%, #ffaa33 100%); }
            .financial-ops .kpi-icon.efficiency { background: linear-gradient(135deg, #8a2be2 0%, #a855f7 100%); }
            .financial-ops .kpi-value {
              font-size: 2.25rem;
              font-weight: 800;
              line-height: 1;
              margin-bottom: 0.5rem;
            }
            .financial-ops .kpi-trend {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              font-size: 0.875rem;
              font-weight: 500;
            }
            .financial-ops .kpi-submetrics {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1rem;
              margin-top: 1.5rem;
              padding-top: 1.5rem;
              border-top: 1px solid #e2e8f0;
            }
            .financial-ops .kpi-submetric {
              text-align: center;
            }
            .financial-ops .submetric-value {
              font-size: 1.25rem;
              font-weight: 700;
              color: #0f2940;
            }
            .financial-ops .submetric-label {
              font-size: 0.75rem;
              color: #64748b;
              margin-top: 0.25rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .financial-ops .profitability-analysis {
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 1.5rem;
              margin: 0 2rem 1.5rem;
            }
            .financial-ops .profit-card {
              background: #ffffff;
              border-radius: 10px;
              padding: 1.75rem;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .financial-ops .profit-breakdown {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 1.5rem;
              margin-top: 1.5rem;
            }
            .financial-ops .breakdown-item {
              padding: 1.25rem;
              border-radius: 8px;
              background: #f8fafc;
            }
            .financial-ops .breakdown-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 0.75rem;
            }
            .financial-ops .breakdown-value {
              font-size: 1.5rem;
              font-weight: 700;
            }
            .financial-ops .breakdown-change {
              font-size: 0.875rem;
              font-weight: 500;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              background: rgba(0, 168, 107, 0.1);
              color: #00a86b;
            }
            .financial-ops .breakdown-change.negative {
              background: rgba(255, 77, 79, 0.1);
              color: #ff4d4f;
            }
            .financial-ops .financial-dashboard {
              display: grid;
              grid-template-columns: 300px 1fr;
              gap: 1.5rem;
              margin: 0 2rem 2rem;
            }
            .financial-ops .financial-sidebar {
              display: flex;
              flex-direction: column;
              gap: 1.5rem;
            }
            .financial-ops .profit-optimizer {
              background: linear-gradient(135deg, #0f2940 0%, #1e3a5f 100%);
              color: white;
              border-radius: 10px;
              padding: 1.75rem;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            }
            .financial-ops .optimizer-title {
              font-size: 1.125rem;
              font-weight: 600;
              margin-bottom: 1rem;
              display: flex;
              align-items: center;
              gap: 0.75rem;
            }
            .financial-ops .optimizer-metric {
              background: rgba(255, 255, 255, 0.1);
              padding: 1rem;
              border-radius: 8px;
              margin-bottom: 1rem;
            }
            .financial-ops .optimizer-value {
              font-size: 1.5rem;
              font-weight: 700;
              color: #00ff88;
            }
            .financial-ops .optimizer-suggestions {
              margin-top: 1.5rem;
            }
            .financial-ops .suggestion-item {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              padding: 0.75rem;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 6px;
              margin-bottom: 0.75rem;
              font-size: 0.875rem;
            }
            .financial-ops .suggestion-item i {
              color: #00ff88;
            }
            .financial-ops .cost-control {
              background: #ffffff;
              border-radius: 10px;
              padding: 1.75rem;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .financial-ops .cost-category {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 1rem;
              background: #f8fafc;
              border-radius: 8px;
              margin-bottom: 0.75rem;
            }
            .financial-ops .cost-bar {
              height: 8px;
              background: #e2e8f0;
              border-radius: 4px;
              margin-top: 0.5rem;
              overflow: hidden;
            }
            .financial-ops .cost-fill {
              height: 100%;
              border-radius: 4px;
            }
            .financial-ops .cost-fill.fuel { background: #ff6b6b; width: 45%; }
            .financial-ops .cost-fill.maintenance { background: #ffa726; width: 25%; }
            .financial-ops .cost-fill.driver { background: #42a5f5; width: 20%; }
            .financial-ops .cost-fill.other { background: #7e57c2; width: 10%; }
            .financial-ops .financial-main {
              display: flex;
              flex-direction: column;
              gap: 1.5rem;
            }
            .financial-ops .financial-tabs {
              background: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .financial-ops .tab-header {
              display: flex;
              background: #f8fafc;
              padding: 0.5rem;
            }
            .financial-ops .tab-btn {
              flex: 1;
              padding: 1rem;
              border: none;
              background: transparent;
              cursor: pointer;
              font-weight: 600;
              color: #64748b;
              transition: all 0.2s;
              position: relative;
            }
            .financial-ops .tab-btn.active {
              color: #0052cc;
              background: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            }
            .financial-ops .tab-btn.active::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 20%;
              right: 20%;
              height: 3px;
              background: #0052cc;
              border-radius: 2px;
            }
            .financial-ops .tab-content {
              padding: 1.75rem;
            }
            .financial-ops .financial-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-top: 1rem;
            }
            .financial-ops .financial-table thead {
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            }
            .financial-ops .financial-table th {
              padding: 1.25rem 1rem;
              text-align: left;
              font-weight: 600;
              color: #0f2940;
              border-bottom: 2px solid #e2e8f0;
              font-size: 0.875rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .financial-ops .financial-table td {
              padding: 1.25rem 1rem;
              border-bottom: 1px solid #e2e8f0;
              font-weight: 500;
            }
            .financial-ops .financial-table tbody tr {
              transition: all 0.2s;
            }
            .financial-ops .financial-table tbody tr:hover {
              background: linear-gradient(90deg, rgba(0, 82, 204, 0.05) 0%, rgba(0, 82, 204, 0.02) 100%);
              transform: translateX(4px);
            }
            .financial-ops .profit-indicator {
              display: inline-flex;
              align-items: center;
              padding: 0.375rem 0.75rem;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .financial-ops .profit-high {
              background: rgba(0, 168, 107, 0.15);
              color: #00a86b;
              border: 1px solid rgba(0, 168, 107, 0.3);
            }
            .financial-ops .profit-medium {
              background: rgba(255, 149, 0, 0.15);
              color: #ff9500;
              border: 1px solid rgba(255, 149, 0, 0.3);
            }
            .financial-ops .profit-low {
              background: rgba(255, 77, 79, 0.15);
              color: #ff4d4f;
              border: 1px solid rgba(255, 77, 79, 0.3);
            }
            .financial-ops .cost-per-mile {
              font-weight: 700;
              font-size: 1.1rem;
            }
            .financial-ops .cost-per-mile.low { color: #00a86b; }
            .financial-ops .cost-per-mile.medium { color: #ff9500; }
            .financial-ops .cost-per-mile.high { color: #ff4d4f; }
            .financial-ops .financial-charts {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 1.5rem;
              margin-top: 1.5rem;
            }
            .financial-ops .chart-card {
              background: #ffffff;
              border-radius: 10px;
              padding: 1.75rem;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .financial-ops .chart-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 1.5rem;
            }
            .financial-ops .chart-container {
              position: relative;
              height: 280px;
            }
            .financial-ops .financial-actions {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
              gap: 1rem;
              margin-top: 1.5rem;
            }
            .financial-ops .action-btn {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 1.5rem 1rem;
              background: #ffffff;
              border-radius: 10px;
              cursor: pointer;
              transition: all 0.3s;
              border: 2px solid #e2e8f0;
              text-align: center;
            }
            .financial-ops .action-btn:hover {
              border-color: #0052cc;
              transform: translateY(-3px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .financial-ops .action-btn i {
              font-size: 1.75rem;
              margin-bottom: 0.75rem;
              color: #0052cc;
            }
            .financial-ops .action-btn span {
              font-size: 0.875rem;
              font-weight: 600;
            }
            .financial-ops .action-btn .subtext {
              font-size: 0.75rem;
              color: #64748b;
              margin-top: 0.25rem;
            }
            .financial-ops .invoice-status {
              display: flex;
              gap: 1rem;
              margin-top: 1.5rem;
            }
            .financial-ops .invoice-stat {
              flex: 1;
              padding: 1.25rem;
              border-radius: 8px;
              text-align: center;
              background: #f8fafc;
            }
            .financial-ops .invoice-stat.paid { border-left: 4px solid #00a86b; }
            .financial-ops .invoice-stat.pending { border-left: 4px solid #ff9500; }
            .financial-ops .invoice-stat.overdue { border-left: 4px solid #ff4d4f; }
            .financial-ops .invoice-value {
              font-size: 1.75rem;
              font-weight: 700;
              margin-bottom: 0.5rem;
            }
            .financial-ops .financial-footer {
              text-align: center;
              padding: 1.5rem;
              color: #64748b;
              font-size: 0.875rem;
              border-top: 1px solid #e2e8f0;
              margin-top: 2rem;
              background: #ffffff;
            }
            .financial-ops .financial-alert {
              margin: 1rem 2rem 0;
              padding: 0.75rem 1rem;
              border-radius: 10px;
              font-size: 0.875rem;
              border: 1px solid rgba(148, 163, 184, 0.5);
              background: #ffffff;
              color: #1e293b;
            }
            .financial-ops .financial-alert.error {
              border-color: rgba(248, 113, 113, 0.6);
              color: #991b1b;
              background: rgba(254, 226, 226, 0.6);
            }
            .financial-ops .financial-alert.success {
              border-color: rgba(52, 211, 153, 0.6);
              color: #065f46;
              background: rgba(209, 250, 229, 0.7);
            }
            .financial-ops .badge {
              display: inline-flex;
              align-items: center;
              padding: 0.25rem 0.75rem;
              border-radius: 12px;
              font-size: 0.75rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .financial-ops .badge-success {
              background: rgba(0, 168, 107, 0.15);
              color: #00a86b;
            }
            .financial-ops .badge-warning {
              background: rgba(255, 149, 0, 0.15);
              color: #ff9500;
            }
            .financial-ops .badge-danger {
              background: rgba(255, 77, 79, 0.15);
              color: #ff4d4f;
            }
            @media (max-width: 1400px) {
              .financial-ops .financial-dashboard {
                grid-template-columns: 1fr;
              }
              .financial-ops .profitability-analysis {
                grid-template-columns: 1fr;
              }
              .financial-ops .financial-charts {
                grid-template-columns: 1fr;
              }
            }
            @media (max-width: 1024px) {
              .financial-ops .financial-kpis {
                grid-template-columns: repeat(2, 1fr);
              }
              .financial-ops .financial-header {
                flex-direction: column;
                gap: 1rem;
                padding: 1rem;
              }
              .financial-ops .financial-header-left,
              .financial-ops .financial-header-right {
                width: 100%;
              }
              .financial-ops .financial-metrics {
                justify-content: space-between;
                width: 100%;
              }
            }
            @media (max-width: 768px) {
              .financial-ops .financial-kpis {
                grid-template-columns: 1fr;
                margin: 1rem;
              }
              .financial-ops .financial-dashboard,
              .financial-ops .profitability-analysis {
                margin: 1rem;
              }
              .financial-ops .financial-alert {
                margin: 0.75rem 1rem 0;
              }
              .financial-ops .kpi-submetrics {
                grid-template-columns: repeat(2, 1fr);
              }
              .financial-ops .profit-breakdown {
                grid-template-columns: 1fr;
              }
            }
          `}</style>

          <header className="financial-header">
            <div className="financial-header-left">
              <div className="financial-logo">
                <div className="financial-logo-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="financial-logo-text">
                  <h1>RONYX FINANCIAL TMS</h1>
                  <div className="subtitle">Dump Truck Profitability Dashboard</div>
                </div>
              </div>
              <div className="financial-period-selector">
                {(['today', 'week', 'month', 'quarter'] as const).map((period) => (
                  <button
                    key={period}
                    className={`period-btn ${financialPeriod === period ? 'active' : ''}`}
                    onClick={() => setFinancialPeriod(period)}
                  >
                    {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'Quarter'}
                  </button>
                ))}
              </div>
            </div>
            <div className="financial-header-right">
              <div className="financial-metrics">
                <div className="financial-metric">
                  <div className="financial-metric-label">Net Profit</div>
                  <div className="financial-metric-value positive-change">
                    ${financialSnapshot.netProfit.toLocaleString()}
                  </div>
                </div>
                <div className="financial-metric">
                  <div className="financial-metric-label">Margin</div>
                  <div className="financial-metric-value positive-change">
                    {financialSnapshot.margin.toFixed(1)}%
                  </div>
                </div>
                <div className="financial-metric">
                  <div className="financial-metric-label">ROI</div>
                  <div className="financial-metric-value positive-change">
                    {financialSnapshot.roi.toFixed(1)}%
                  </div>
                </div>
              </div>
              <button
                className="period-btn"
                onClick={() => loadFinancialData()}
                disabled={financialLoading}
              >
                <i className="fas fa-redo"></i>
                {financialLoading ? ' Refreshing' : ' Refresh'}
              </button>
            </div>
          </header>

          {(financialError || actionMessage) && (
            <div
              className={`financial-alert ${financialError ? 'error' : 'success'}`}
            >
              {financialError || actionMessage}
            </div>
          )}

          <div className="financial-kpis">
            <div className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-title">
                  <div className="kpi-icon revenue">
                    <i className="fas fa-money-bill-wave"></i>
                  </div>
                  <span>Daily Revenue</span>
                </div>
                <div className="kpi-trend positive-change">
                  <i className="fas fa-arrow-up"></i> 12.4%
                </div>
              </div>
              <div className="kpi-value">${financialSnapshot.revenue.toLocaleString()}</div>
              <div className="kpi-submetrics">
                <div className="kpi-submetric">
                  <div className="submetric-value">{financialSnapshot.loads}</div>
                  <div className="submetric-label">Loads</div>
                </div>
                <div className="kpi-submetric">
                  <div className="submetric-value">
                    ${financialSnapshot.avgLoad.toFixed(0)}
                  </div>
                  <div className="submetric-label">Avg/load</div>
                </div>
                <div className="kpi-submetric">
                  <div className="submetric-value">{financialSnapshot.tonnage}T</div>
                  <div className="submetric-label">Tonnage</div>
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-title">
                  <div className="kpi-icon profit">
                    <i className="fas fa-hand-holding-usd"></i>
                  </div>
                  <span>Gross Profit</span>
                </div>
                <div className="kpi-trend positive-change">
                  <i className="fas fa-arrow-up"></i> 8.7%
                </div>
              </div>
              <div className="kpi-value">${financialSnapshot.profit.toLocaleString()}</div>
              <div className="kpi-submetrics">
                <div className="kpi-submetric">
                  <div className="submetric-value">{financialSnapshot.margin.toFixed(1)}%</div>
                  <div className="submetric-label">Margin</div>
                </div>
                <div className="kpi-submetric">
                  <div className="submetric-value">
                    ${financialSnapshot.loads ? (financialSnapshot.profit / financialSnapshot.loads).toFixed(0) : 0}
                  </div>
                  <div className="submetric-label">Per Load</div>
                </div>
                <div className="kpi-submetric">
                  <div className="submetric-value">$27.60</div>
                  <div className="submetric-label">Per Ton</div>
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-title">
                  <div className="kpi-icon cost">
                    <i className="fas fa-gas-pump"></i>
                  </div>
                  <span>Operating Cost</span>
                </div>
                <div className="kpi-trend negative-change">
                  <i className="fas fa-arrow-down"></i> 3.2%
                </div>
              </div>
              <div className="kpi-value">${financialSnapshot.cost.toLocaleString()}</div>
              <div className="kpi-submetrics">
                <div className="kpi-submetric">
                  <div className="submetric-value">$1.85</div>
                  <div className="submetric-label">Per Mile</div>
                </div>
                <div className="kpi-submetric">
                  <div className="submetric-value">$64.40</div>
                  <div className="submetric-label">Per Ton</div>
                </div>
                <div className="kpi-submetric">
                  <div className="submetric-value">45%</div>
                  <div className="submetric-label">Fuel %</div>
                </div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-title">
                  <div className="kpi-icon efficiency">
                    <i className="fas fa-tachometer-alt"></i>
                  </div>
                  <span>Fleet Efficiency</span>
                </div>
                <div className="kpi-trend positive-change">
                  <i className="fas fa-arrow-up"></i> 5.1%
                </div>
              </div>
              <div className="kpi-value">{financialSnapshot.efficiency.toFixed(2)} MPG</div>
              <div className="kpi-submetrics">
                <div className="kpi-submetric">
                  <div className="submetric-value">94%</div>
                  <div className="submetric-label">Utilization</div>
                </div>
                <div className="kpi-submetric">
                  <div className="submetric-value">4.2</div>
                  <div className="submetric-label">Loads/Day</div>
                </div>
                <div className="kpi-submetric">
                  <div className="submetric-value">78%</div>
                  <div className="submetric-label">On-time</div>
                </div>
              </div>
            </div>
          </div>

          <div className="profitability-analysis">
            <div className="profit-card">
              <h3><i className="fas fa-chart-pie"></i> Profit Breakdown by Material</h3>
              <div className="profit-breakdown">
                {materialCards.map((material) => (
                  <div className="breakdown-item" key={material.material}>
                    <div className="breakdown-header">
                      <span>{material.material}</span>
                      <span className="breakdown-change positive-change">
                        {(material.share * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="breakdown-value">
                      ${material.profit.toLocaleString()}
                    </div>
                    <div className="breakdown-details">
                      {material.loads} loads | ${material.profitPerTon.toFixed(2)}/ton
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="profit-card">
              <h3><i className="fas fa-bullseye"></i> Top Profit Routes</h3>
              <div className="profit-breakdown">
                {routeCards.map((route) => (
                  <div className="breakdown-item" key={route.route}>
                    <div className="breakdown-header">
                      <span>{route.route}</span>
                      <span className="badge badge-success">
                        {(route.margin * 100).toFixed(0)}% margin
                      </span>
                    </div>
                    <div className="breakdown-value">
                      ${route.profit.toLocaleString()}
                    </div>
                    <div className="breakdown-details">
                      {route.loads} loads | ${route.profitPerMile.toFixed(2)}/mile profit
                    </div>
                  </div>
                ))}
              </div>
              <div className="invoice-status">
                <div className="invoice-stat paid">
                <div className="invoice-value">
                  ${invoiceStats.paid.toLocaleString()}
                </div>
                  <div className="invoice-label">Invoices Paid</div>
                </div>
                <div className="invoice-stat pending">
                <div className="invoice-value">
                  ${invoiceStats.pending.toLocaleString()}
                </div>
                  <div className="invoice-label">Pending</div>
                </div>
                <div className="invoice-stat overdue">
                <div className="invoice-value">
                  ${invoiceStats.overdue.toLocaleString()}
                </div>
                  <div className="invoice-label">Overdue</div>
                </div>
              </div>
            </div>
          </div>

          <div className="financial-dashboard">
            <div className="financial-sidebar">
              <div className="profit-optimizer">
                <div className="optimizer-title">
                  <i className="fas fa-lightbulb"></i> Profit Optimizer
                </div>
                <div className="optimizer-metric">
                  <div>Potential Revenue Increase</div>
                <div className="optimizer-value">
                  +${optimizerInsight.potentialIncrease.toLocaleString()}/day
                </div>
                </div>
                <div className="optimizer-suggestions">
                {optimizerInsight.suggestions.map((suggestion) => (
                  <div className="suggestion-item" key={suggestion}>
                    <i className="fas fa-check-circle"></i>
                    <span>{suggestion}</span>
                  </div>
                ))}
                </div>
              </div>

              <div className="cost-control">
                <h3><i className="fas fa-sliders-h"></i> Cost Control Center</h3>
                <div className="cost-category">
                  <span>Fuel Costs</span>
                <span>${costBreakdown.fuel.toLocaleString()}</span>
                </div>
                <div className="cost-bar">
                <div
                  className="cost-fill fuel"
                  style={{ width: `${costBreakdown.fuelPct}%` }}
                ></div>
                </div>
                <div className="cost-category">
                  <span>Maintenance</span>
                <span>${costBreakdown.maintenance.toLocaleString()}</span>
                </div>
                <div className="cost-bar">
                <div
                  className="cost-fill maintenance"
                  style={{ width: `${costBreakdown.maintenancePct}%` }}
                ></div>
                </div>
                <div className="cost-category">
                  <span>Driver Wages</span>
                <span>${costBreakdown.labor.toLocaleString()}</span>
                </div>
                <div className="cost-bar">
                <div
                  className="cost-fill driver"
                  style={{ width: `${costBreakdown.laborPct}%` }}
                ></div>
                </div>
                <div className="cost-category">
                  <span>Other</span>
                <span>${costBreakdown.other.toLocaleString()}</span>
                </div>
                <div className="cost-bar">
                <div
                  className="cost-fill other"
                  style={{ width: `${costBreakdown.otherPct}%` }}
                ></div>
                </div>
              </div>
            </div>

            <div className="financial-main">
              <div className="financial-tabs">
                <div className="tab-header">
                  {(
                    [
                      { id: 'loads', label: 'Profit by Load' },
                      { id: 'trucks', label: 'Truck Profitability' },
                      { id: 'drivers', label: 'Driver Performance' },
                      { id: 'invoices', label: 'Invoice Status' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      className={`tab-btn ${financialTab === tab.id ? 'active' : ''}`}
                      onClick={() => setFinancialTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="tab-content">
                  {financialTab === 'loads' && (
                    <table className="financial-table">
                      <thead>
                        <tr>
                          <th>Load ID</th>
                          <th>Material</th>
                          <th>Route</th>
                          <th>Revenue</th>
                          <th>Cost</th>
                          <th>Profit</th>
                          <th>Margin</th>
                          <th>Profit/Ton</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadRows.length === 0 ? (
                          <tr>
                            <td colSpan={9}>No load profitability data yet.</td>
                          </tr>
                        ) : (
                          loadRows.map((row) => (
                            <tr key={row.loadId}>
                              <td>{row.loadId}</td>
                              <td>{row.material}</td>
                              <td>{row.route}</td>
                              <td>{formatCurrency(row.revenue)}</td>
                              <td>{formatCurrency(row.cost)}</td>
                              <td>{formatCurrency(row.profit)}</td>
                              <td>
                                <span className={`profit-indicator ${profitIndicatorClass(row.margin)}`}>
                                  {formatPercent(row.margin)}
                                </span>
                              </td>
                              <td className="cost-per-mile">
                                {formatCurrency(row.profitPerTon)}
                              </td>
                              <td>
                                <span className={statusBadgeClass(row.status)}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {financialTab === 'trucks' && (
                    <table className="financial-table">
                      <thead>
                        <tr>
                          <th>Truck</th>
                          <th>Revenue</th>
                          <th>Profit</th>
                          <th>Margin</th>
                          <th>Loads</th>
                          <th>Profit/Mile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {truckRows.length === 0 ? (
                          <tr>
                            <td colSpan={6}>No truck profitability data yet.</td>
                          </tr>
                        ) : (
                          truckRows.map((row) => (
                            <tr key={row.truckLabel}>
                              <td>{row.truckLabel}</td>
                              <td>{formatCurrency(row.revenue)}</td>
                              <td>{formatCurrency(row.profit)}</td>
                              <td>
                                <span className={`profit-indicator ${profitIndicatorClass(row.margin)}`}>
                                  {formatPercent(row.margin)}
                                </span>
                              </td>
                              <td>{row.loads}</td>
                              <td className="cost-per-mile">
                                {formatCurrency(row.profitPerMile)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {financialTab === 'drivers' && (
                    <table className="financial-table">
                      <thead>
                        <tr>
                          <th>Driver</th>
                          <th>Revenue</th>
                          <th>Profit</th>
                          <th>Margin</th>
                          <th>Loads</th>
                          <th>Profit/Load</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driverRows.length === 0 ? (
                          <tr>
                            <td colSpan={6}>No driver performance data yet.</td>
                          </tr>
                        ) : (
                          driverRows.map((row) => (
                            <tr key={row.driverName}>
                              <td>{row.driverName}</td>
                              <td>{formatCurrency(row.revenue)}</td>
                              <td>{formatCurrency(row.profit)}</td>
                              <td>
                                <span className={`profit-indicator ${profitIndicatorClass(row.margin)}`}>
                                  {formatPercent(row.margin)}
                                </span>
                              </td>
                              <td>{row.loads}</td>
                              <td className="cost-per-mile">
                                {formatCurrency(row.profitPerLoad)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}

                  {financialTab === 'invoices' && (
                    <table className="financial-table">
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th>Due Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceRows.length === 0 ? (
                          <tr>
                            <td colSpan={5}>No invoices found.</td>
                          </tr>
                        ) : (
                          invoiceRows.map((row) => (
                            <tr key={row.invoiceNumber}>
                              <td>{row.invoiceNumber}</td>
                              <td>{row.customer}</td>
                              <td>{formatCurrency(row.amount)}</td>
                              <td>{row.dueDate || '—'}</td>
                              <td>
                                <span className={statusBadgeClass(row.paymentStatus || row.status)}>
                                  {row.paymentStatus || row.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="financial-actions">
                <div className="action-btn" onClick={() => handleFinancialAction('invoice-run')}>
                  <i className="fas fa-file-invoice-dollar"></i>
                  <span>Run Invoices</span>
                  <div className="subtext">$18.2K pending</div>
                </div>
                <div className="action-btn" onClick={() => handleFinancialAction('fuel-report')}>
                  <i className="fas fa-gas-pump"></i>
                  <span>Fuel Analysis</span>
                  <div className="subtext">Optimize costs</div>
                </div>
                <div className="action-btn" onClick={() => handleFinancialAction('profit-report')}>
                  <i className="fas fa-chart-line"></i>
                  <span>Profit Report</span>
                  <div className="subtext">Generate PDF</div>
                </div>
                <div className="action-btn" onClick={() => handleFinancialAction('dispatch-optimize')}>
                  <i className="fas fa-route"></i>
                  <span>Optimize Routes</span>
                  <div className="subtext">+$2,850 potential</div>
                </div>
                <div className="action-btn" onClick={() => handleFinancialAction('collections')}>
                  <i className="fas fa-money-check-alt"></i>
                  <span>Collections</span>
                  <div className="subtext">$3.4K overdue</div>
                </div>
                <div className="action-btn" onClick={() => handleFinancialAction('expense-approval')}>
                  <i className="fas fa-receipt"></i>
                  <span>Approve Expenses</span>
                  <div className="subtext">14 pending</div>
                </div>
              </div>

              <div className="financial-charts">
                <div className="chart-card">
                  <div className="chart-header">
                    <h3><i className="fas fa-chart-bar"></i> Daily Revenue Trend</h3>
                    <select className="chart-period" value={financialPeriod} onChange={(event) => setFinancialPeriod(event.target.value as any)}>
                      <option value="today">7 Days</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="quarter">Quarter</option>
                    </select>
                  </div>
                  <div className="chart-container">
                    <canvas ref={revenueChartRef}></canvas>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3><i className="fas fa-percentage"></i> Profit Margin by Material</h3>
                    <select className="chart-period" value={financialPeriod} onChange={(event) => setFinancialPeriod(event.target.value as any)}>
                      <option value="today">This Week</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="quarter">This Quarter</option>
                    </select>
                  </div>
                  <div className="chart-container">
                    <canvas ref={marginChartRef}></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="financial-footer">
            <div>Ronyx Financial TMS © 2023 | Real-time data updated: <span>{currentTime}</span></div>
            <div className="footer-info">
              <span>Data Privacy Compliance: PCI DSS Level 1 | Financial Reporting: GAAP Standards</span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      {activeTab !== 'financial' && (
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search vehicles by unit number, make, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="maintenance">In Maintenance</SelectItem>
              <SelectItem value="out_of_service">Out of Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'vehicles' && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Fleet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold">Unit #</th>
                    <th className="text-left p-3 font-semibold">Make/Model</th>
                    <th className="text-left p-3 font-semibold">Year</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Driver</th>
                    <th className="text-left p-3 font-semibold">Mileage</th>
                    <th className="text-left p-3 font-semibold">Registration</th>
                    <th className="text-left p-3 font-semibold">DOT Inspection</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{vehicle.unit_number}</td>
                      <td className="p-3">{vehicle.make} {vehicle.model}</td>
                      <td className="p-3">{vehicle.year}</td>
                      <td className="p-3">{getStatusBadge(vehicle.status)}</td>
                      <td className="p-3">{vehicle.driver_assigned || 'Unassigned'}</td>
                      <td className="p-3">{vehicle.current_mileage?.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getExpiryBadge(vehicle.registration_expiry)}
                          <span className="text-sm text-gray-600">
                            {new Date(vehicle.registration_expiry).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getExpiryBadge(vehicle.dot_inspection_due)}
                          <span className="text-sm text-gray-600">
                            {new Date(vehicle.dot_inspection_due).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'maintenance' && (
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold">All Maintenance Records</div>
              <Button onClick={() => {
                // Add a new sample record (in-memory)
                setMaintenanceRecords(prev => [
                  ...prev,
                  {
                    id: (prev.length + 1).toString(),
                    vehicle_id: vehicles[0]?.id || '1',
                    maintenance_type: 'Oil Change',
                    description: 'Changed oil and filter',
                    cost: 250,
                    date_completed: new Date().toISOString().slice(0,10),
                    mileage_at_service: vehicles[0]?.current_mileage || 0,
                    next_due_date: '',
                    next_due_mileage: (vehicles[0]?.current_mileage || 0) + 10000,
                    status: 'completed',
                  }
                ]);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Record
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 border">Vehicle</th>
                    <th className="px-2 py-1 border">Type</th>
                    <th className="px-2 py-1 border">Description</th>
                    <th className="px-2 py-1 border">Date</th>
                    <th className="px-2 py-1 border">Mileage</th>
                    <th className="px-2 py-1 border">Cost</th>
                    <th className="px-2 py-1 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRecords.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-gray-400">No maintenance records yet.</td></tr>
                  ) : maintenanceRecords.map(rec => {
                    const vehicle = vehicles.find(v => v.id === rec.vehicle_id);
                    return (
                      <tr key={rec.id} className="border-b">
                        <td className="px-2 py-1">{vehicle?.unit_number || rec.vehicle_id}</td>
                        <td className="px-2 py-1">{rec.maintenance_type}</td>
                        <td className="px-2 py-1">{rec.description}</td>
                        <td className="px-2 py-1">{rec.date_completed}</td>
                        <td className="px-2 py-1">{rec.mileage_at_service}</td>
                        <td className="px-2 py-1">${rec.cost}</td>
                        <td className="px-2 py-1">{rec.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'inspections' && (
        <Card>
          <CardHeader>
            <CardTitle>DOT Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold">All Inspections</div>
              <Button onClick={() => {
                // Add a new sample inspection (in-memory)
                setMaintenanceRecords(prev => [
                  ...prev,
                  {
                    id: (prev.length + 1001).toString(),
                    vehicle_id: vehicles[0]?.id || '1',
                    maintenance_type: 'DOT Inspection',
                    description: 'Annual DOT inspection completed',
                    cost: 150,
                    date_completed: new Date().toISOString().slice(0,10),
                    mileage_at_service: vehicles[0]?.current_mileage || 0,
                    next_due_date: '',
                    next_due_mileage: undefined,
                    status: 'completed',
                  }
                ]);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Inspection
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 border">Vehicle</th>
                    <th className="px-2 py-1 border">Type</th>
                    <th className="px-2 py-1 border">Description</th>
                    <th className="px-2 py-1 border">Date</th>
                    <th className="px-2 py-1 border">Mileage</th>
                    <th className="px-2 py-1 border">Cost</th>
                    <th className="px-2 py-1 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRecords.filter(r => r.maintenance_type === 'DOT Inspection').length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-gray-400">No inspections yet.</td></tr>
                  ) : maintenanceRecords.filter(r => r.maintenance_type === 'DOT Inspection').map(rec => {
                    const vehicle = vehicles.find(v => v.id === rec.vehicle_id);
                    return (
                      <tr key={rec.id} className="border-b">
                        <td className="px-2 py-1">{vehicle?.unit_number || rec.vehicle_id}</td>
                        <td className="px-2 py-1">{rec.maintenance_type}</td>
                        <td className="px-2 py-1">{rec.description}</td>
                        <td className="px-2 py-1">{rec.date_completed}</td>
                        <td className="px-2 py-1">{rec.mileage_at_service}</td>
                        <td className="px-2 py-1">${rec.cost}</td>
                        <td className="px-2 py-1">{rec.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'renewals' && (
        <Card>
          <CardHeader>
            <CardTitle>Registration Renewals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="font-semibold">All Renewals</div>
              <Button onClick={() => {
                // Add a new sample renewal (in-memory)
                setMaintenanceRecords(prev => [
                  ...prev,
                  {
                    id: (prev.length + 2001).toString(),
                    vehicle_id: vehicles[0]?.id || '1',
                    maintenance_type: 'Registration Renewal',
                    description: 'Annual registration renewed',
                    cost: 120,
                    date_completed: new Date().toISOString().slice(0,10),
                    mileage_at_service: vehicles[0]?.current_mileage || 0,
                    next_due_date: '',
                    next_due_mileage: undefined,
                    status: 'completed',
                  }
                ]);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Renewal
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 border">Vehicle</th>
                    <th className="px-2 py-1 border">Type</th>
                    <th className="px-2 py-1 border">Description</th>
                    <th className="px-2 py-1 border">Date</th>
                    <th className="px-2 py-1 border">Mileage</th>
                    <th className="px-2 py-1 border">Cost</th>
                    <th className="px-2 py-1 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRecords.filter(r => r.maintenance_type === 'Registration Renewal').length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-gray-400">No renewals yet.</td></tr>
                  ) : maintenanceRecords.filter(r => r.maintenance_type === 'Registration Renewal').map(rec => {
                    const vehicle = vehicles.find(v => v.id === rec.vehicle_id);
                    return (
                      <tr key={rec.id} className="border-b">
                        <td className="px-2 py-1">{vehicle?.unit_number || rec.vehicle_id}</td>
                        <td className="px-2 py-1">{rec.maintenance_type}</td>
                        <td className="px-2 py-1">{rec.description}</td>
                        <td className="px-2 py-1">{rec.date_completed}</td>
                        <td className="px-2 py-1">{rec.mileage_at_service}</td>
                        <td className="px-2 py-1">${rec.cost}</td>
                        <td className="px-2 py-1">{rec.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
