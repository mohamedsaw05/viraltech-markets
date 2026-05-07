import { useState, useEffect } from "react";
import { api } from "../services/api";
import { Clock, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

export default function AuditLogPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(page);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, [page]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" /> Journal d'audit ({total})
        </h3>
        <button onClick={loadLogs} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Entité</th>
              <th className="px-4 py-3 font-medium">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 text-slate-400 text-xs">{log.created_at ? new Date(log.created_at).toLocaleString("fr-FR") : "-"}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                    {log.action?.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{log.module}</td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{log.entity_type}/{log.entity_id?.substring(0, 8)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-48 truncate">
                  {log.details ? JSON.stringify(log.details).substring(0, 60) : "-"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                {loading ? "Chargement..." : "Aucun log d'audit"}
              </td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="flex items-center gap-1 text-sm text-slate-400 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            <span className="text-xs text-slate-500">Page {page}/{totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              className="flex items-center gap-1 text-sm text-slate-400 disabled:opacity-30">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
