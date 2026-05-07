import { useState } from "react";
import { api } from "../services/api";
import {
  ShieldCheck, RefreshCw, Wrench, Calculator,
  Database, Wifi, CheckCircle2, XCircle
} from "lucide-react";

export default function DiagnosticPanel() {
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [repairResult, setRepairResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading("diagnostic");
    try {
      const result = await api.runDiagnostic();
      setDiagnosticResult(result);
    } catch (e) { console.error(e); }
    setLoading(null);
  };

  const runRepair = async () => {
    setLoading("repair");
    try {
      const result = await api.repairData();
      setRepairResult(result);
    } catch (e) { console.error(e); }
    setLoading(null);
  };

  const runRecalculate = async () => {
    setLoading("recalculate");
    try {
      const result = await api.recalculate();
      setRepairResult(result);
    } catch (e) { console.error(e); }
    setLoading(null);
  };

  const runRebuildCache = async () => {
    setLoading("rebuild");
    try {
      const result = await api.rebuildCache();
      setRepairResult(result);
    } catch (e) { console.error(e); }
    setLoading(null);
  };

  const runResetSync = async () => {
    setLoading("sync");
    try {
      const result = await api.resetSync();
      setRepairResult(result);
    } catch (e) { console.error(e); }
    setLoading(null);
  };

  const runVerifyIntegrity = async () => {
    setLoading("verify");
    try {
      const result = await api.verifyIntegrity();
      setDiagnosticResult(result);
    } catch (e) { console.error(e); }
    setLoading(null);
  };

  const actions = [
    { id: "diagnostic", label: "Diagnostic complet", desc: "Analyser erreurs inventaire", icon: ShieldCheck, fn: runDiagnostic, color: "blue" },
    { id: "repair", label: "Réparer incohérences", desc: "Corriger données invalides", icon: Wrench, fn: runRepair, color: "yellow" },
    { id: "recalculate", label: "Recalculer quantités", desc: "Recalculer depuis mouvements", icon: Calculator, fn: runRecalculate, color: "green" },
    { id: "rebuild", label: "Reconstruire cache", desc: "Régénérer données calculées", icon: Database, fn: runRebuildCache, color: "purple" },
    { id: "sync", label: "Réinitialiser sync", desc: "Remettre états synchronisation", icon: Wifi, fn: runResetSync, color: "cyan" },
    { id: "verify", label: "Vérifier intégrité", desc: "Contrôler structure données", icon: CheckCircle2, fn: runVerifyIntegrity, color: "emerald" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-600 hover:bg-blue-500",
    yellow: "bg-yellow-600 hover:bg-yellow-500",
    green: "bg-green-600 hover:bg-green-500",
    purple: "bg-purple-600 hover:bg-purple-500",
    cyan: "bg-cyan-600 hover:bg-cyan-500",
    emerald: "bg-emerald-600 hover:bg-emerald-500",
  };

  return (
    <div className="space-y-6">
      {/* Actions Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => (
          <button key={action.id} onClick={action.fn} disabled={loading !== null}
            className={`p-4 rounded-xl border border-slate-700 bg-slate-900/80 text-left transition-all hover:border-slate-600 disabled:opacity-50 group`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[action.color]}`}>
                {loading === action.id ? <RefreshCw className="w-5 h-5 text-white animate-spin" /> : <action.icon className="w-5 h-5 text-white" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{action.label}</div>
                <div className="text-xs text-slate-500">{action.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Results */}
      {diagnosticResult && (
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" /> Résultats du diagnostic
          </h3>

          {diagnosticResult.summary && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
                <div className="text-2xl font-bold text-red-400">{diagnosticResult.summary.errors}</div>
                <div className="text-xs text-slate-400">Erreurs</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3 text-center border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-400">{diagnosticResult.summary.warnings}</div>
                <div className="text-xs text-slate-400">Avertissements</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">{diagnosticResult.summary.repaired || 0}</div>
                <div className="text-xs text-slate-400">Réparés</div>
              </div>
            </div>
          )}

          {diagnosticResult.checks && (
            <div className="space-y-3">
              {diagnosticResult.checks.map((check: any, i: number) => (
                <div key={i} className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {check.errors > 0 ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    <span className="text-sm font-medium text-white">{check.check?.replace(/_/g, " ")}</span>
                    <span className="text-xs text-slate-500">{check.errors} erreurs, {check.warnings} avertissements</span>
                  </div>
                  {check.details?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {check.details.map((d: string, j: number) => (
                        <div key={j} className="text-xs text-slate-400 pl-6">• {d}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {diagnosticResult.checks === undefined && diagnosticResult.all_ok !== undefined && (
            <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg">
              {diagnosticResult.all_ok ? (
                <><CheckCircle2 className="w-6 h-6 text-green-400" /><span className="text-green-400 font-medium">Toutes les structures sont intègres</span></>
              ) : (
                <><XCircle className="w-6 h-6 text-red-400" /><span className="text-red-400 font-medium">Des problèmes d'intégrité ont été détectés</span></>
              )}
            </div>
          )}
        </div>
      )}

      {repairResult && (
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-yellow-400" /> Résultats de la réparation
          </h3>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">
              {repairResult.total_repairs ?? repairResult.total_recalculated ?? repairResult.products_rebuilt ?? repairResult.products_reset ?? 0} opérations effectuées
            </span>
          </div>
          {repairResult.repairs?.length > 0 && (
            <div className="space-y-1">
              {repairResult.repairs.map((r: any, i: number) => (
                <div key={i} className="text-xs text-slate-400 pl-2">• {r.product || r.type}: {r.action}</div>
              ))}
            </div>
          )}
          {repairResult.details?.length > 0 && (
            <div className="space-y-1">
              {repairResult.details.map((d: any, i: number) => (
                <div key={i} className="text-xs text-slate-400 pl-2">
                  • {d.product}: {d.old_quantity} → {d.new_quantity} (diff: {d.difference})
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
