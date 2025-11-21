import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  MessageSquare,
  TrendingUp,
  Settings,
  Users,
  FileText,
  Cog,
  Menu,
  X,
  Download,
  MapPin,
  AlertTriangle,
  BarChart3, // Added for Analize Dinamice icon
  PieChart as PieChartIcon, // Renamed to avoid conflict with Recharts PieChart
  Plus, // Added for new chat button
  ArrowLeft, // Added for back button
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area"; // Added as per outline

import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import UserMenu from "../components/chat/UserMenu"; // Assuming this path is correct for UserMenu
import {
  fetchDashboardMetrics,
  DASHBOARD_DEFAULT_FILTERS,
} from "@/api/dashboardClient";

const menuItems = [
  {
    id: "pulsul_conversatiilor",
    label: "Pulsul Conversațiilor",
    icon: Activity,
  },
  { id: "hub_conversatii", label: "Hub Conversații", icon: MessageSquare },
  { id: "explorer_trenduri", label: "Explorer Trenduri", icon: TrendingUp },
  { id: "analize_dinamice", label: "Analize Dinamice", icon: BarChart3 }, // Added new menu item
  {
    id: "setari_categorii",
    label: "Setări Categorii Probleme",
    icon: Settings,
  },
  { id: "administrare_useri", label: "Administrare Useri", icon: Users },
  { id: "logs", label: "Logs", icon: FileText },
  { id: "setari_generale", label: "Setări Generale", icon: Cog },
];

const COLORS = ["#DC2626", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"];
const SEVERITY_FILTER_OPTIONS = ["scăzută", "medie", "ridicată", "critică"];
const STATUS_FILTER_OPTIONS = [
  "în_curs",
  "pregătit pentru confirmare",
  "finalizat",
];

export default function DashboardPage() {
  const [activeItem, setActiveItem] = useState("pulsul_conversatiilor");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Analize Dinamice state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dashboardFilters, setDashboardFilters] = useState(
    DASHBOARD_DEFAULT_FILTERS
  );
  const DAY_MS = 24 * 60 * 60 * 1000;
  const requestFilters = useMemo(
    () => ({
      ...DASHBOARD_DEFAULT_FILTERS,
      ...dashboardFilters,
      trend_range_days:
        dashboardFilters.trend_range_days ??
        DASHBOARD_DEFAULT_FILTERS.trend_range_days,
    }),
    [dashboardFilters]
  );

  const {
    data: dashboardPayload,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboardMetrics,
  } = useQuery({
    queryKey: ["dashboard-metrics", requestFilters],
    queryFn: () => fetchDashboardMetrics(undefined, requestFilters),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const handleFilterSelectChange = (field) => (value) => {
    setDashboardFilters((prev) => ({
      ...prev,
      [field]: value === "all" ? null : value,
    }));
  };
  const handleTrendRangeChange = (value) => {
    const parsed = Number(value);
    setDashboardFilters((prev) => ({
      ...prev,
      trend_range_days: Number.isNaN(parsed) ? prev.trend_range_days : parsed,
    }));
  };
  const handleDateRangeChange = (value) => {
    if (value === "all") {
      setDashboardFilters((prev) => ({
        ...prev,
        date_range_days: null,
        date_from: null,
        date_to: null,
      }));
      return;
    }
    const days = Number(value);
    if (Number.isNaN(days)) return;
    const toDate = new Date();
    const fromDate = new Date(Date.now() - days * DAY_MS);
    setDashboardFilters((prev) => ({
      ...prev,
      date_range_days: days,
      date_from: fromDate.toISOString(),
      date_to: toDate.toISOString(),
    }));
  };

  const metrics = dashboardPayload?.metrics ?? {};
  const generatedAt = dashboardPayload?.generated_at;

  const countySeverityMap = new Map(
    (metrics.county_severity ?? []).map((item) => [
      item.county,
      item.avg_severity_label,
    ])
  );

  const dashboardConversations = useMemo(
    () => metrics.recent_conversations ?? [],
    [metrics.recent_conversations]
  );

  const categoryOptions = useMemo(() => {
    const set = new Set();
    dashboardConversations.forEach((conv) => {
      if (conv.category) set.add(conv.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dashboardConversations]);

  const countyOptions = useMemo(() => {
    const set = new Set();
    dashboardConversations.forEach((conv) => {
      if (conv.location_county) set.add(conv.location_county);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dashboardConversations]);

  const categoryTotals = useMemo(() => {
    const totals = dashboardConversations.reduce((acc, conv) => {
      const key = conv.category || "Nespecificată";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [dashboardConversations]);

  const trendCategories = useMemo(() => {
    const topCategories = categoryTotals.slice(0, 3).map((item) => item.name);
    return topCategories.length > 0 ? topCategories : ["Nespecificată"];
  }, [categoryTotals]);

  const dashboardTopThemes = categoryTotals.slice(0, 5);

  const dashboardTopCounties = (metrics.top_counties ?? []).map((item) => ({
    judet: item.name,
    count: item.count,
    severitate: countySeverityMap.get(item.name) || "necunoscută",
  }));

  const dashboardHeatmapData = (metrics.county_severity ?? []).map((item) => ({
    judet: item.county,
    count: item.count,
    severity: item.avg_severity_label || "necunoscută",
  }));

  const trendChartData = useMemo(() => {
    if (dashboardConversations.length === 0) return [];

    const rangeDays = requestFilters.trend_range_days || 30;
    const span =
      rangeDays <= 7
        ? 1
        : rangeDays <= 30
        ? 5
        : Math.max(7, Math.ceil(rangeDays / 6));
    const bucketCount = Math.max(1, Math.ceil(rangeDays / span));
    const endDate = new Date();
    const buckets = [];

    for (let i = bucketCount - 1; i >= 0; i--) {
      const bucketEnd = new Date(
        endDate.getTime() - (bucketCount - 1 - i) * span * DAY_MS
      );
      const bucketStart = new Date(bucketEnd.getTime() - span * DAY_MS);
      const startLabel = bucketStart.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "short",
      });
      const endLabel = bucketEnd.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "short",
      });
      const entry = {
        date: endLabel,
        total: 0,
        rangeStartLabel: startLabel,
        rangeEndLabel: endLabel,
      };
      trendCategories.forEach((cat) => {
        entry[cat] = 0;
      });

      dashboardConversations.forEach((conv) => {
        const created = new Date(conv.created_date);
        if (created >= bucketStart && created < bucketEnd) {
          entry.total += 1;
          const cat = conv.category || "Nespecificată";
          if (trendCategories.includes(cat)) {
            entry[cat] += 1;
          }
        }
      });

      buckets.push(entry);
    }

    return buckets.reverse();
  }, [
    dashboardConversations,
    trendCategories,
    requestFilters.trend_range_days,
    DAY_MS,
  ]);

  const trendPeriod = useMemo(() => {
    if (!trendChartData.length) return null;
    return {
      start: trendChartData[0].rangeStartLabel,
      end: trendChartData[trendChartData.length - 1].rangeEndLabel,
    };
  }, [trendChartData]);

  const severityBreakdown = useMemo(() => {
    const counts = dashboardConversations.reduce((acc, conv) => {
      const key = conv.severity || "necunoscută";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [dashboardConversations]);

  const filteredConversations = useMemo(() => {
    return dashboardConversations.filter((conv) => {
      if (
        dashboardFilters.category &&
        conv.category !== dashboardFilters.category
      ) {
        return false;
      }
      if (
        dashboardFilters.city &&
        conv.location_city !== dashboardFilters.city
      ) {
        return false;
      }
      if (
        dashboardFilters.county &&
        conv.location_county !== dashboardFilters.county
      ) {
        return false;
      }
      if (
        dashboardFilters.severity &&
        conv.severity !== dashboardFilters.severity
      ) {
        return false;
      }
      if (dashboardFilters.status && conv.status !== dashboardFilters.status) {
        return false;
      }
      if (dashboardFilters.date_from) {
        const created = new Date(conv.created_date);
        if (created < new Date(dashboardFilters.date_from)) {
          return false;
        }
      }
      if (dashboardFilters.date_to) {
        const created = new Date(conv.created_date);
        if (created > new Date(dashboardFilters.date_to)) {
          return false;
        }
      }
      return true;
    });
  }, [dashboardConversations, dashboardFilters]);

  const newConversations7d = metrics.new_conversations_7d ?? 0;
  const newConversations7dTrend =
    metrics.new_conversations_7d_trend_pct ?? null;
  const newConversations30d = metrics.new_conversations_30d ?? 0;
  const newConversations30dTrend =
    metrics.new_conversations_30d_trend_pct ?? null;
  const avgSeverityLabel = metrics.avg_severity || "N/A";
  const avgResponseRate =
    typeof metrics.avg_response_rate === "number"
      ? `${metrics.avg_response_rate}%`
      : "N/A";

  const formatMetricValue = (value, suffix = "") =>
    typeof value === "number"
      ? `${value.toLocaleString("ro-RO")}${suffix}`
      : "N/A";

  const formatTrendText = (value, fallback) => {
    if (typeof value === "number") {
      return `${value >= 0 ? "+" : ""}${value}% ${fallback}`;
    }
    return null;
  };

  const trendTextClass = (value) => {
    if (typeof value === "number") {
      if (value > 0) return "text-green-600";
      if (value < 0) return "text-red-600";
    }
    return "text-gray-500";
  };

  const getSeverityBadgeClass = (label) => {
    const normalized = (label || "").toLowerCase();
    if (normalized === "ridicată" || normalized === "critică") {
      return "bg-red-100 text-red-700";
    }
    if (normalized === "medie") {
      return "bg-yellow-100 text-yellow-700";
    }
    if (normalized === "scăzută") {
      return "bg-green-100 text-green-700";
    }
    return "bg-gray-100 text-gray-600";
  };

  const getSeverityBubbleClass = (label) => {
    const normalized = (label || "").toLowerCase();
    if (normalized === "ridicată" || normalized === "critică") {
      return "bg-red-500 text-white";
    }
    if (normalized === "medie") {
      return "bg-orange-400 text-white";
    }
    if (normalized === "scăzută") {
      return "bg-green-400 text-white";
    }
    return "bg-gray-300 text-gray-800";
  };

  // No authentication required - app works without Base44 auth
  useEffect(() => {
    // Allow anonymous access
    setCurrentUser(null);
    setIsCheckingAuth(false);
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  const suggestionCards = [
    {
      id: 1,
      title: "Distribuție pe categorii",
      description:
        "Arată-mi distribuția feedback-urilor pe categorii principale",
      icon: PieChartIcon,
      color: "bg-blue-50 text-blue-600",
      query: { type: "categories" },
    },
    {
      id: 2,
      title: "Trenduri recente",
      description:
        "Care sunt trendurile și evoluția feedback-urilor în ultimele săptămâni?",
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
      query: { type: "trend" },
    },
    {
      id: 3,
      title: "Top județe",
      description: "Care sunt cele mai active județe cu feedback-uri?",
      icon: MapPin,
      color: "bg-orange-50 text-orange-600",
      query: { type: "counties" },
    },
    {
      id: 4,
      title: "Evoluție severitate",
      description:
        "Cum a evoluat nivelul de severitate al problemelor raportate?",
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
      query: { type: "severity" },
    },
    {
      id: 5,
      title: "Comparație categorii",
      description: "Compară performanța și volumul între diferite categorii",
      icon: BarChart3,
      color: "bg-green-50 text-green-600",
      query: { type: "comparison" },
    },
    {
      id: 6,
      title: "Statistici generale",
      description: "Oferă-mi un rezumat general al tuturor datelor colectate",
      icon: Activity,
      color: "bg-indigo-50 text-indigo-600",
      query: { type: "summary" },
    },
  ];

  const handleSendAnalyticsQuery = async (query) => {
    if (isProcessing) return;

    const buildResponseForQuery = (queryObj) => {
      const type = typeof queryObj === "string" ? "summary" : queryObj.type;
      switch (type) {
        case "categories":
          return {
            title: "Distribuție pe categorii",
            message:
              "Iată distribuția feedback-urilor pe categorii principale conform datelor actuale:",
            chart: {
              type: "pie",
              data: dashboardTopThemes.map((item, index) => ({
                name: item.name,
                value: item.count,
                color: COLORS[index % COLORS.length],
              })),
            },
          };
        case "trend":
          return {
            title: "Trend conversații",
            message: `Trendul conversațiilor pentru intervalul ${
              trendPeriod
                ? `${trendPeriod.start} – ${trendPeriod.end}`
                : "curent"
            }:`,
            chart: {
              type: "line",
              data: trendChartData,
              categories: trendCategories,
            },
          };
        case "counties":
          return {
            title: "Top județe",
            message: "Top județe după numărul de conversații:",
            chart: {
              type: "bar",
              data: dashboardTopCounties.map((item) => ({
                name: item.judet,
                value: item.count,
              })),
            },
          };
        case "severity":
          return {
            title: "Distribuție severitate",
            message: "Distribuția feedback-urilor pe nivel de severitate:",
            chart: {
              type: "pie",
              data: severityBreakdown.map((item, index) => ({
                ...item,
                color: COLORS[index % COLORS.length],
              })),
            },
          };
        case "comparison":
          return {
            title: "Comparație categorii",
            message: "Comparație între categoriile principale:",
            chart: {
              type: "bar-comparison",
              data: trendChartData,
              categories: trendCategories,
            },
          };
        case "summary":
        default:
          return {
            title: "Statistici generale",
            message: `• Total conversații listate: ${
              dashboardConversations.length
            }\n• Interval trend: ${
              trendPeriod ? `${trendPeriod.start} – ${trendPeriod.end}` : "N/A"
            }\n• Top categorie: ${
              dashboardTopThemes[0]?.name ?? "insuficiente date"
            }\n• Top județ: ${
              dashboardTopCounties[0]?.judet ?? "insuficiente date"
            }`,
            chart: null,
          };
      }
    };

    const queryObj =
      typeof query === "string" ? { type: "summary", title: query } : query;
    const userContent = queryObj.title || "Cerere analiză";
    const responsePayload = buildResponseForQuery(queryObj);

    const userMsg = {
      role: "user",
      content: userContent,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const botResponse = {
        role: "bot",
        content: `${responsePayload.title}\n\n${responsePayload.message}`,
        chart: responsePayload.chart,
        timestamp: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Error processing query:", error);
      const errorMsg = {
        role: "bot",
        content: "Scuze, am întâmpinat o problemă. Te rog încearcă din nou.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardClick = (query) => {
    handleSendAnalyticsQuery(query);
  };

  const handleNewChat = () => {
    setChatMessages([]);
    setChatInput("");
  };

  const renderChart = (chartConfig) => {
    if (!chartConfig) return null;

    switch (chartConfig.type) {
      case "pie":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-4 my-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartConfig.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartConfig.data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      case "line":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-4 my-4">
            {(() => {
              const lineData = chartConfig.data ?? trendChartData;
              const categories =
                chartConfig.categories ?? trendCategories ?? [];
              if (!lineData || lineData.length === 0) {
                return (
                  <p className="text-sm text-gray-500">
                    Nu există date pentru a genera acest grafic.
                  </p>
                );
              }
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {categories.map((cat, index) => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={COLORS[index % COLORS.length]}
                        name={cat}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        );

      case "bar":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-4 my-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartConfig.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#DC2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case "bar-comparison":
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-4 my-4">
            {(() => {
              const comparisonData = chartConfig.data ?? trendChartData;
              const categories =
                chartConfig.categories ?? trendCategories ?? [];
              if (!comparisonData || comparisonData.length === 0) {
                return (
                  <p className="text-sm text-gray-500">
                    Nu există date pentru a genera acest grafic.
                  </p>
                );
              }
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {categories.map((cat, index) => (
                      <Bar
                        key={cat}
                        dataKey={cat}
                        fill={COLORS[index % COLORS.length]}
                        name={cat}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        );

      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (activeItem) {
      case "pulsul_conversatiilor":
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Pulsul Conversațiilor
            </h1>
            <p className="text-gray-600 mb-8">
              Dashboard public/analist - KPI-uri și trenduri
            </p>
            <div className="flex flex-col gap-3 mb-6">
              {dashboardError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                  Nu am putut încărca datele: {dashboardError.message}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span>
                  {isDashboardLoading
                    ? "Se încarcă datele reale..."
                    : generatedAt
                    ? `Ultima actualizare: ${new Date(
                        generatedAt
                      ).toLocaleString("ro-RO")}`
                    : "Date generate din surse locale"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchDashboardMetrics()}
                  disabled={isDashboardLoading}
                >
                  Reîmprospătează
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Conversații Noi (7 zile)
                  </span>
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatMetricValue(newConversations7d)}
                </p>
                {formatTrendText(
                  newConversations7dTrend,
                  "față de săptămâna trecută"
                ) && (
                  <p
                    className={`text-sm mt-1 ${trendTextClass(
                      newConversations7dTrend
                    )}`}
                  >
                    {formatTrendText(
                      newConversations7dTrend,
                      "față de săptămâna trecută"
                    )}
                  </p>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Conversații Noi (30 zile)
                  </span>
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {formatMetricValue(newConversations30d)}
                </p>
                {formatTrendText(
                  newConversations30dTrend,
                  "față de luna trecută"
                ) && (
                  <p
                    className={`text-sm mt-1 ${trendTextClass(
                      newConversations30dTrend
                    )}`}
                  >
                    {formatTrendText(
                      newConversations30dTrend,
                      "față de luna trecută"
                    )}
                  </p>
                )}
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Severitate Medie
                  </span>
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-orange-600 capitalize">
                  {avgSeverityLabel}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Pe toate conversațiile
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Rate Răspuns
                  </span>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {avgResponseRate}
                </p>
                {typeof metrics.avg_response_rate === "number" && (
                  <p className="text-sm text-gray-500 mt-1">
                    Răspunsuri procesate această lună
                  </p>
                )}
              </Card>
            </div>

            {/* Top 5 Teme & Județe */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Top 5 Teme
                </h2>
                {dashboardTopThemes.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nu există date pentru intervalul selectat.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboardTopThemes.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-red-600">
                              {index + 1}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Top 5 Județe
                </h2>
                {dashboardTopCounties.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nu există date pentru intervalul selectat.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboardTopCounties.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {item.judet}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-gray-900">
                            {item.count}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBadgeClass(
                              item.severitate
                            )}`}
                          >
                            {item.severitate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Trend Line */}
            <Card className="p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Trend Conversații pe Categorii
                </h2>
                <Select
                  value={String(requestFilters.trend_range_days ?? 30)}
                  onValueChange={handleTrendRangeChange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 zile</SelectItem>
                    <SelectItem value="30">30 zile</SelectItem>
                    <SelectItem value="90">90 zile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {trendPeriod && (
                <p className="text-xs text-gray-500 mb-2">
                  Interval: {trendPeriod.start} – {trendPeriod.end}
                </p>
              )}
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {trendCategories.map((cat, index) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={COLORS[index % COLORS.length]}
                      name={cat}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Heatmap */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Heatmap Județe - Distribuție Conversații
              </h2>
              <div className="bg-gray-50 rounded-lg p-8">
                <p className="text-center text-gray-500 mb-4">
                  Distribuție pe județe (volum + severitate medie)
                </p>
                {dashboardHeatmapData.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">
                    Nu există date pentru intervalul selectat.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {dashboardHeatmapData.map((item, idx) => (
                      <div
                        key={`${item.judet}-${idx}`}
                        className={`p-4 rounded-lg text-center ${getSeverityBubbleClass(
                          item.severity
                        )}`}
                      >
                        <p className="font-semibold">{item.judet}</p>
                        <p className="text-sm">{item.count} cazuri</p>
                        <p className="text-xs mt-1 capitalize">
                          Severitate: {item.severity ?? "n/a"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <div className="mt-8 flex justify-center">
              <Button
                onClick={() => setActiveItem("explorer_trenduri")}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Explorează Trenduri
              </Button>
            </div>
          </div>
        );

      case "hub_conversatii":
        return (
          <div className="flex gap-6 h-full">
            {/* Lista Conversații */}
            <div
              className={`${
                selectedConversation ? "w-1/2" : "w-full"
              } flex flex-col`}
            >
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Hub Conversații
                </h1>
                <p className="text-gray-600">
                  Listă conversații cu filtre și preview
                </p>
              </div>

              {/* Filtre */}
              <Card className="p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <Select
                    value={dashboardFilters.category ?? "all"}
                    onValueChange={handleFilterSelectChange("category")}
                    disabled={categoryOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toate temele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate temele</SelectItem>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={dashboardFilters.county ?? "all"}
                    onValueChange={handleFilterSelectChange("county")}
                    disabled={countyOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toate județele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate județele</SelectItem>
                      {countyOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={dashboardFilters.severity ?? "all"}
                    onValueChange={handleFilterSelectChange("severity")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Severitate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate</SelectItem>
                      {SEVERITY_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={dashboardFilters.status ?? "all"}
                    onValueChange={handleFilterSelectChange("status")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toate statusurile</SelectItem>
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={
                      dashboardFilters.date_range_days
                        ? String(dashboardFilters.date_range_days)
                        : "all"
                    }
                    onValueChange={handleDateRangeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Perioadă" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toată perioada</SelectItem>
                      <SelectItem value="7">Ultimele 7 zile</SelectItem>
                      <SelectItem value="30">Ultimele 30 zile</SelectItem>
                      <SelectItem value="90">Ultimele 90 zile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              {/* Listă */}
              <div className="flex-1 overflow-auto space-y-3">
                {filteredConversations.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nu există conversații care să corespundă filtrelor
                    selectate.
                  </p>
                ) : (
                  filteredConversations.map((conv) => (
                    <Card
                      key={conv.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedConversation?.id === conv.id
                          ? "ring-2 ring-red-500"
                          : ""
                      }`}
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">
                            {conv.ticket_id}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBadgeClass(
                              conv.severity
                            )}`}
                          >
                            {conv.severity}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(conv.created_date).toLocaleDateString(
                            "ro-RO"
                          )}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {conv.category}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {conv.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {conv.location_city}, {conv.location_county}
                        </span>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Panel Preview */}
            {selectedConversation && (
              <Card className="w-1/2 p-6 overflow-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Detalii Conversație
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Rezumat AI */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Rezumat AI
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      {selectedConversation.summary}
                    </p>
                  </div>
                </div>

                {/* Câmpuri Extrase */}
                <div className="mb-6 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Categorie
                    </span>
                    <p className="text-gray-900">
                      {selectedConversation.category} →{" "}
                      {selectedConversation.subcategory}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Locație
                    </span>
                    <p className="text-gray-900">
                      {selectedConversation.location_city},{" "}
                      {selectedConversation.location_county}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Instituție
                    </span>
                    <p className="text-gray-900">
                      {selectedConversation.institution}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Severitate
                    </span>
                    <p className="text-gray-900 capitalize">
                      {selectedConversation.severity}
                    </p>
                  </div>
                </div>

                {/* Text Original */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Text Original
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      {selectedConversation.description}
                    </p>
                  </div>
                </div>

                {/* Entități Detectate */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Entități Detectate
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedConversation.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        );

      case "explorer_trenduri":
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Explorer Trenduri & Clustere
            </h1>
            <p className="text-gray-600 mb-6">
              Analiză timeline și clustere conversații
            </p>

            {/* Comutator */}
            <Card className="p-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  Vizualizare pe:
                </span>
                <Select defaultValue="judet">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tara">Țară</SelectItem>
                    <SelectItem value="judet">Județ</SelectItem>
                    <SelectItem value="localitate">Localitate</SelectItem>
                    <SelectItem value="institutie">Instituție</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Timeline Volume pe Teme
              </h2>
              {trendPeriod && (
                <p className="text-xs text-gray-500 mb-2">
                  Interval: {trendPeriod.start} – {trendPeriod.end}
                </p>
              )}
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="politici"
                    fill="#3B82F6"
                    name="Politici publice"
                  />
                  <Bar
                    dataKey="probleme"
                    fill="#DC2626"
                    name="Probleme spitale"
                  />
                  <Bar
                    dataKey="programe"
                    fill="#10B981"
                    name="Programe naționale"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Clustere Bule */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Clustere Conversații - Hartă Județe
              </h2>
              <div className="bg-gray-50 rounded-lg p-8">
                {dashboardHeatmapData.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">
                    Nu există date pentru a construi harta.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
                    {dashboardHeatmapData.map((item, i) => {
                      const bubbleSize = Math.min(120, 40 + item.count);
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <div
                            className={`rounded-full flex items-center justify-center mb-2 cursor-pointer hover:scale-110 transition-transform ${getSeverityBubbleClass(
                              item.severity
                            )}`}
                            style={{
                              width: bubbleSize,
                              height: bubbleSize,
                            }}
                          >
                            <span className="font-bold text-sm">
                              {item.count}
                            </span>
                          </div>
                          <span className="text-xs text-gray-700 text-center">
                            {item.judet}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-6 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-200"></div>
                    <span className="text-xs text-gray-600">
                      Severitate scăzută
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-600"></div>
                    <span className="text-xs text-gray-600">
                      Severitate ridicată
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      case "analize_dinamice": // New case for Analize Dinamice
        return (
          <div className="h-full flex flex-col">
            {chatMessages.length === 0 ? (
              // Initial state with suggestion cards
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-5xl">
                  <h1 className="text-4xl font-bold text-gray-900 text-center mb-12">
                    Cu ce te pot ajuta?
                  </h1>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {suggestionCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleCardClick(card.query)}
                          className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all text-left group"
                        >
                          <div
                            className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {card.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {card.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendAnalyticsQuery(chatInput);
                      }}
                      className="flex gap-3"
                    >
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Întreabă orice..."
                        className="flex-1 border-gray-300"
                        disabled={isProcessing}
                      />
                      <Button
                        type="submit"
                        disabled={!chatInput.trim() || isProcessing}
                        className="bg-[#DC2626] hover:bg-[#B91C1C]"
                      >
                        {isProcessing ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Trimite"
                        )}
                      </Button>
                    </form>
                    <p className="text-xs text-gray-400 text-center mt-3">
                      Analizele pot comite greșeli. Te rog să verifici
                      răspunsurile importante.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Chat interface when messages exist
              <>
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        Analize Dinamice
                      </h1>
                      <p className="text-sm text-gray-600">
                        Explorează datele colectate
                      </p>
                    </div>
                    <Button
                      onClick={handleNewChat}
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Chat Nou
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-6">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-4 ${
                          message.role === "user"
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === "user"
                              ? "bg-gray-200"
                              : "bg-purple-500"
                          }`}
                        >
                          {message.role === "user" ? (
                            <Users className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Activity className="w-4 h-4 text-white" />
                          )}
                        </div>

                        <div
                          className={`flex-1 max-w-2xl ${
                            message.role === "user"
                              ? "flex flex-col items-end"
                              : ""
                          }`}
                        >
                          <div
                            className={`${
                              message.role === "user"
                                ? "bg-blue-500 text-white rounded-2xl rounded-tr-sm"
                                : "bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-200"
                            } px-4 py-3`}
                          >
                            <p className="whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                          {message.chart && renderChart(message.chart)}
                        </div>
                      </div>
                    ))}

                    {isProcessing && (
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                          <div className="flex gap-1">
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <div
                              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t border-gray-200 p-6 bg-white">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendAnalyticsQuery(chatInput);
                    }}
                    className="max-w-4xl mx-auto"
                  >
                    <div className="flex gap-3">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Întreabă orice..."
                        disabled={isProcessing}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        disabled={!chatInput.trim() || isProcessing}
                        className="bg-[#DC2626] hover:bg-[#B91C1C] px-6"
                      >
                        {isProcessing ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Trimite"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        );

      case "setari_categorii":
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Setări Categorii Probleme
            </h1>
            <p className="text-gray-600 mb-6">
              Gestionare categorii, subcategorii și flux AI
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Categorii */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Categorii & Subcategorii
                </h2>
                <div className="space-y-4">
                  {[
                    { cat: "Politici publice", sub: 7, color: "blue" },
                    { cat: "Probleme din spitale", sub: 5, color: "red" },
                    { cat: "Programe naționale", sub: 2, color: "green" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.cat}</p>
                        <p className="text-sm text-gray-500">
                          {item.sub} subcategorii
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Editează
                      </Button>
                    </div>
                  ))}
                  <Button className="w-full" variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Adaugă Categorie Nouă
                  </Button>
                </div>
              </Card>

              {/* Flux AI */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Flux Logic AI per Categorie
                </h2>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <span className="font-medium text-gray-900">
                        Identificare problemă
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">
                      AI identifică categoria și severitatea
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <span className="font-medium text-gray-900">
                        Colectare detalii
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">
                      Întrebări contextuale pentru informații complete
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <span className="font-medium text-gray-900">
                        Validare & confirmare
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-8">
                      Utilizatorul confirmă informațiile
                    </p>
                  </div>

                  <Button className="w-full mt-4">
                    <Settings className="w-4 h-4 mr-2" />
                    Editează Workflow AI
                  </Button>
                </div>
              </Card>
            </div>

            {/* Sinonime & Praguri */}
            <Card className="p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Sinonime & Praguri Modele
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Sinonime Detectate
                  </h3>
                  <div className="space-y-2">
                    {[
                      "protocol → procedură, regulament",
                      "spital → unitate medicală, clinică",
                      "consultație → examinare, control",
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="p-2 bg-gray-50 rounded text-sm text-gray-700"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Praguri Auto-Accept
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">
                        Confidence minim clasificare
                      </label>
                      <Input type="number" defaultValue="85" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">
                        Prag auto-etichetare
                      </label>
                      <Input type="number" defaultValue="90" className="mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      case "administrare_useri":
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Administrare Useri
            </h1>
            <p className="text-gray-600 mb-6">
              Gestionare utilizatori și raportare comportament
            </p>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Input placeholder="Caută utilizator..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toți userii</SelectItem>
                      <SelectItem value="active">Activi</SelectItem>
                      <SelectItem value="blocked">Blocați</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Utilizator
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Conversații
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Acțiuni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      {
                        name: "Ion Popescu",
                        email: "ion.popescu@email.com",
                        tickets: 12,
                        status: "active",
                      },
                      {
                        name: "Maria Ionescu",
                        email: "maria.ionescu@email.com",
                        tickets: 8,
                        status: "active",
                      },
                      {
                        name: "Andrei Georgescu",
                        email: "andrei.g@email.com",
                        tickets: 5,
                        status: "blocked",
                      },
                    ].map((user, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.tickets}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              user.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {user.status === "active" ? "Activ" : "Blocat"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              {user.status === "active"
                                ? "Blochează"
                                : "Deblochează"}
                            </Button>
                            <Button variant="outline" size="sm">
                              Raportează
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        );

      case "logs":
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Logs</h1>
            <p className="text-gray-600 mb-6">
              Istoric activitate și evenimente sistem
            </p>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate evenimentele</SelectItem>
                    <SelectItem value="ticket">Conversații</SelectItem>
                    <SelectItem value="user">Utilizatori</SelectItem>
                    <SelectItem value="system">Sistem</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" className="w-40" />
              </div>

              <div className="space-y-3">
                {[
                  {
                    type: "ticket",
                    action: "Conversație nouă creată",
                    user: "ion.popescu@email.com",
                    time: "2024-02-15 10:30",
                  },
                  {
                    type: "user",
                    action: "Utilizator blocat",
                    user: "admin@system",
                    time: "2024-02-15 09:15",
                  },
                  {
                    type: "system",
                    action: "Backup automat efectuat",
                    user: "system",
                    time: "2024-02-15 03:00",
                  },
                  {
                    type: "ticket",
                    action: "Conversație finalizată",
                    user: "maria.ionescu@email.com",
                    time: "2024-02-14 16:45",
                  },
                ].map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          log.type === "ticket"
                            ? "bg-blue-500"
                            : log.type === "user"
                            ? "bg-red-500"
                            : "bg-gray-500"
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {log.action}
                        </p>
                        <p className="text-sm text-gray-500">
                          de către {log.user}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{log.time}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );

      case "setari_generale":
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Setări Generale
            </h1>
            <p className="text-gray-600 mb-6">
              Configurări aplicație și sistem
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Notificări
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      label: "Notificări email pentru conversații noi",
                      checked: true,
                    },
                    { label: "Notificări rapoarte zilnice", checked: true },
                    { label: "Alerte severitate ridicată", checked: true },
                    { label: "Rezumat săptămânal", checked: false },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm text-gray-700">
                        {item.label}
                      </span>
                      <input
                        type="checkbox"
                        defaultChecked={item.checked}
                        className="w-4 h-4"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Integrări
                </h2>
                <div className="space-y-3">
                  {[
                    { name: "Email SMTP", status: "Conectat", color: "green" },
                    { name: "Backup Cloud", status: "Activ", color: "green" },
                    { name: "Analytics", status: "Dezactivat", color: "gray" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.status}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configurează
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Backup & Siguranță
                </h2>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Ultimul backup
                    </p>
                    <p className="text-sm text-gray-600">
                      15 Februarie 2024, 03:00
                    </p>
                  </div>
                  <Button className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Backup Manual
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Informații Sistem
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Versiune</span>
                    <span className="font-medium text-gray-900">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total conversații</span>
                    <span className="font-medium text-gray-900">324</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utilizatori activi</span>
                    <span className="font-medium text-gray-900">47</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Spațiu utilizat</span>
                    <span className="font-medium text-gray-900">2.3 GB</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed Header - peste tot */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            Încrederea ne face bine!
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Înapoi la chat
            </Button>
          </Link>

          {currentUser && <UserMenu user={currentUser} />}
        </div>
      </div>

      {/* Sidebar - poziționat sub header */}
      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Navigation - padding 96px pentru aliniere perfectă */}
        <nav className="flex-1 overflow-y-auto pt-24 pb-6 px-3">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveItem(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-red-50 text-[#DC2626]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f872ca8ce6660b34aeb6f6/f52b2829d_Sigla.png"
              alt="Nenos Software"
              className="w-6 h-6 object-contain"
            />
            <span>by Nenos Software</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden pt-16 lg:ml-0">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto h-full">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}
