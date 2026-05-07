import { useState, useEffect } from "react";
import { api } from "../services/api";
import { AlertTriangle, Check, Eye, RefreshCw, Shield } from "lucide-react";

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts({ severity: filter || undefined });
      setAlerts(data.alerts || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadAlerts(); }, [filter]);

  const handleResolve = async (id: string) => {
    await api.resolveAlert(id);
    loadAlerts();
  };

  const handleRead = async (id: string) => {
    await api.markAlertRead(id);
    loadAlerts();
  };

  const severityStyles: Record<string, string> = {
    info: "border-blue-500/30 bg-blue-500/10",
    warning: "border-yellow-500/30 bg-yellow-500/10",
    critical: "border-red-500/30 bg-red-500/10",
    emergency: "border-red-600/40 bg-red-600/15",
  };

  const severityIcons: Record<string, string> = {
    info: "text-blue-400",
    warning: "text-yellow-400",
    critical: "text-red-400",
    emergency: "text-red-500",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">{total} alertes</h3>
          <div className="flex gap-1">
            {["", "info", "warning", "critical", "emergency"].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === s ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}>
                {s || "Toutes"}
              </button>
            ))}
          </div>
        </div>
        <button onClick={loadAlerts} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className={`rounded-xl border p-4 ${severityStyles[alert.severity] || severityStyles.info} ${alert.is_read ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${severityIcons[alert.severity] || "text-blue-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    alert.severity === "critical" || alert.severity === "emergency" ? "bg-red-600 text-white" :
                    alert.severity === "warning" ? "bg-yellow-600 text-white" : "bg-blue-600 text-white"
                  }`}>
                    {alert.severity}
                  </span>
                  {alert.is_resolved && <span className="px-2 py-0.5 rounded text-xs bg-green-600 text-white">Résolu</span>}
                </div>
                <p className="text-sm text-slate-400 mt-1">{alert.message}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <span>{alert.type?.replace(/_/g, " ")}</span>
                  <span>•</span>
                  <span>{alert.created_at ? new Date(alert.created_at).toLocaleString("fr-FR") : ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!alert.is_read && (
                  <button onClick={() => handleRead(alert.id)} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white" title="Marquer comme lu">
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                {!alert.is_resolved && (
                  <button onClick={() => handleResolve(alert.id)} className="p-1.5 rounded hover:bg-green-500/20 text-slate-400 hover:text-green-400" title="Résoudre">
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {alerts.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune alerte</p>
          </div>
        )}
        {loading && alerts.length === 0 && (
          <div className="text-center py-12"><RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto" /></div>
        )}
      </div>
    </div>
  );
}
