import { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Package, TrendingUp, AlertTriangle, Activity, BarChart3,
  Warehouse, Layers, ArrowUpRight, ArrowDownRight,
  ShieldCheck, Brain, RefreshCw, Bell, Sparkles,
  Menu, X, Clock
} from "lucide-react";
import StockManager from "./StockManager";
import AlertsPanel from "../components/AlertsPanel";
import DiagnosticPanel from "../components/DiagnosticPanel";
import AuditLogPanel from "../components/AuditLogPanel";
import AIAssistant from "../components/AIAssistant";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

interface Props {
  config: any;
  onLogout: () => void;
}

type ActiveView = "dashboard" | "stock" | "alerts" | "diagnostic" | "audit" | "ai";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function Dashboard({ config }: Props) {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, analyticsData, insightsData, modulesData, alertsData] = await Promise.all([
        api.getSystemStats(),
        api.getStockAnalytics(),
        api.getInsights(),
        api.getActiveModules(),
        api.getAlerts({ unread_only: true }),
      ]);
      setStats(statsData);
      setAnalytics(analyticsData);
      setInsights(insightsData);
      setModules(modulesData);
      setAlertCount(alertsData?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: "dashboard" as const, label: "Tableau de bord", icon: BarChart3 },
    { id: "stock" as const, label: "Gestion de Stock", icon: Package },
    { id: "alerts" as const, label: "Alertes", icon: Bell, badge: alertCount },
    { id: "ai" as const, label: "Assistant IA", icon: Brain },
    { id: "diagnostic" as const, label: "Diagnostic", icon: ShieldCheck },
    { id: "audit" as const, label: "Journal d'audit", icon: Clock },
  ];

  const healthScore = insights?.health_score ?? 100;
  const healthColor = healthScore >= 80 ? "text-green-400" : healthScore >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-white truncate">Viraltech-Markets</h1>
                <p className="text-xs text-slate-500 truncate">{config?.company_name}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeView === item.id
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge ? (
                    <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">{item.badge}</span>
                  ) : null}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-slate-800 space-y-1">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {sidebarOpen && <span>Réduire</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">
              {menuItems.find((m) => m.id === activeView)?.label || "Tableau de bord"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setActiveView("alerts")} className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
              {alertCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 rounded-full text-xs text-white flex items-center justify-center">{alertCount}</span>}
            </button>
          </div>
        </header>

        <div className="p-6">
          {activeView === "dashboard" && (
            <DashboardView
              stats={stats} analytics={analytics} insights={insights}
              modules={modules} healthScore={healthScore} healthColor={healthColor}
              loading={loading}
            />
          )}
          {activeView === "stock" && <StockManager />}
          {activeView === "alerts" && <AlertsPanel />}
          {activeView === "ai" && <AIAssistant />}
          {activeView === "diagnostic" && <DiagnosticPanel />}
          {activeView === "audit" && <AuditLogPanel />}
        </div>
      </main>
    </div>
  );
}

function DashboardView({ stats, analytics, insights, modules, healthScore, healthColor, loading }: any) {
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Produits", value: stats?.products || 0, icon: Package, color: "blue", change: null },
    { label: "Valeur Stock", value: `${(analytics?.total_stock_value || 0).toLocaleString()} CFA`, icon: TrendingUp, color: "green", change: null },
    { label: "Alertes actives", value: analytics?.active_alerts || 0, icon: AlertTriangle, color: analytics?.critical_alerts > 0 ? "red" : "yellow", change: null },
    { label: "Mouvements", value: stats?.movements || 0, icon: Activity, color: "purple", change: null },
    { label: "Entrepôts", value: stats?.warehouses || 0, icon: Warehouse, color: "cyan", change: null },
    { label: "Modules actifs", value: stats?.modules || 0, icon: Layers, color: "pink", change: null },
  ];

  const colorMap: Record<string, string> = {
    blue: "from-blue-600/20 to-blue-600/5 border-blue-600/30",
    green: "from-green-600/20 to-green-600/5 border-green-600/30",
    yellow: "from-yellow-600/20 to-yellow-600/5 border-yellow-600/30",
    red: "from-red-600/20 to-red-600/5 border-red-600/30",
    purple: "from-purple-600/20 to-purple-600/5 border-purple-600/30",
    cyan: "from-cyan-600/20 to-cyan-600/5 border-cyan-600/30",
    pink: "from-pink-600/20 to-pink-600/5 border-pink-600/30",
  };

  const iconColorMap: Record<string, string> = {
    blue: "text-blue-400", green: "text-green-400", yellow: "text-yellow-400",
    red: "text-red-400", purple: "text-purple-400", cyan: "text-cyan-400", pink: "text-pink-400",
  };

  const categoryData = analytics?.categories?.map((c: any) => ({
    name: c.name?.substring(0, 12) || "N/A",
    count: c.count,
    quantity: c.total_qty,
  })) || [];

  const recommendations = insights?.recommendations || [];

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-400">Score de santé système</h3>
          <p className="text-sm text-slate-500 mt-0.5">Basé sur l'analyse IA en temps réel</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold ${healthColor}`}>{healthScore}%</div>
          <div className="w-32 h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${healthScore >= 80 ? "bg-green-500" : healthScore >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi, i) => (
          <div key={i} className={`bg-gradient-to-br ${colorMap[kpi.color]} rounded-xl border p-4`}>
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className={`w-5 h-5 ${iconColorMap[kpi.color]}`} />
            </div>
            <div className="text-2xl font-bold text-white">{typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}</div>
            <div className="text-xs text-slate-400 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Distribution par catégorie</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Produits" />
                <Bar dataKey="quantity" fill="#10b981" radius={[4, 4, 0, 0]} name="Quantité" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500">Aucune donnée disponible</div>
          )}
        </div>

        {/* Stock Summary Pie */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">État du stock</h3>
          {analytics ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Normal", value: Math.max(0, (analytics.total_products || 0) - (analytics.low_stock_count || 0) - (analytics.out_of_stock_count || 0)) },
                      { name: "Stock faible", value: analytics.low_stock_count || 0 },
                      { name: "Rupture", value: analytics.out_of_stock_count || 0 },
                      { name: "Expiré", value: analytics.expired_count || 0 },
                    ].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value"
                  >
                    {[0, 1, 2, 3].map((i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                    labelStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-slate-300">Normal</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-slate-300">Stock faible ({analytics.low_stock_count})</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500" /><span className="text-slate-300">Rupture ({analytics.out_of_stock_count})</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-slate-300">Expiré ({analytics.expired_count})</span></div>
                <div className="mt-4 pt-3 border-t border-slate-700">
                  <div className="text-slate-400">Profit potentiel</div>
                  <div className="text-lg font-bold text-green-400">{(analytics.potential_profit || 0).toLocaleString()} CFA</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500">Chargement...</div>
          )}
        </div>
      </div>

      {/* Recommendations & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Recommendations */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" /> Recommandations IA
          </h3>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((r: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border ${
                  r.priority === "critical" ? "bg-red-500/10 border-red-500/30" : "bg-yellow-500/10 border-yellow-500/30"
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${r.priority === "critical" ? "text-red-400" : "text-yellow-400"}`} />
                    <span className={`text-sm font-medium ${r.priority === "critical" ? "text-red-300" : "text-yellow-300"}`}>{r.message}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2" />
              <p>Aucune recommandation - tout est en ordre</p>
            </div>
          )}
        </div>

        {/* Active Modules */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" /> Modules actifs
          </h3>
          <div className="space-y-2">
            {modules.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Layers className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{m.display_name}</div>
                  <div className="text-xs text-slate-500">v{m.version}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${m.is_loaded ? "bg-green-500" : "bg-slate-600"}`} />
              </div>
            ))}
            {modules.length === 0 && (
              <div className="text-center py-8 text-slate-500">Aucun module chargé</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400" /> Activité récente
        </h3>
        {analytics?.recent_movements?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Quantité</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {analytics.recent_movements.map((m: any) => (
                  <tr key={m.id} className="text-slate-300">
                    <td className="py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        m.type === "in" ? "bg-green-500/20 text-green-400" :
                        m.type === "out" ? "bg-red-500/20 text-red-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {m.type === "in" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {m.type}
                      </span>
                    </td>
                    <td className="py-2">{m.quantity}</td>
                    <td className="py-2 text-slate-500">{m.created_at ? new Date(m.created_at).toLocaleString("fr-FR") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">Aucun mouvement récent</div>
        )}
      </div>
    </div>
  );
}
