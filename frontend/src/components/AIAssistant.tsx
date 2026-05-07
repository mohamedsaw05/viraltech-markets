import { useState } from "react";
import { api } from "../services/api";
import {
  Brain, RefreshCw, TrendingUp, AlertTriangle,
  ArrowDown, ArrowUp, Package, Zap, BarChart3, Target
} from "lucide-react";

export default function AIAssistant() {
  const [insights, setInsights] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const loadInsights = async () => {
    setLoading("insights");
    try {
      const data = await api.getInsights();
      setInsights(data);
    } catch (e) { console.error(e); }
    setLoading(null);
  };

  const runFullAnalysis = async () => {
    setLoading("analysis");
    try {
      const data = await api.analyzeAll();
      setAnalysisResult(data);
    } catch (e) { console.error(e); }
    setLoading(null);
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={loadInsights} disabled={loading !== null}
          className="p-6 rounded-xl border border-slate-700 bg-gradient-to-br from-purple-600/20 to-blue-600/20 text-left hover:border-purple-500/50 transition-all disabled:opacity-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center">
              {loading === "insights" ? <RefreshCw className="w-6 h-6 text-white animate-spin" /> : <Brain className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Insights globaux</h3>
              <p className="text-sm text-slate-400">Vue d'ensemble intelligente</p>
            </div>
          </div>
        </button>

        <button onClick={runFullAnalysis} disabled={loading !== null}
          className="p-6 rounded-xl border border-slate-700 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 text-left hover:border-blue-500/50 transition-all disabled:opacity-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              {loading === "analysis" ? <RefreshCw className="w-6 h-6 text-white animate-spin" /> : <Zap className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Analyse complète</h3>
              <p className="text-sm text-slate-400">Analyser tous les produits avec IA</p>
            </div>
          </div>
        </button>
      </div>

      {/* Insights */}
      {insights && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" /> Résumé
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Produits", value: insights.summary?.total_products, icon: Package },
                { label: "Valeur inventaire", value: `${(insights.summary?.total_inventory_value || 0).toLocaleString()} CFA`, icon: TrendingUp },
                { label: "Mouvements aujourd'hui", value: insights.summary?.movements_today, icon: Zap },
                { label: "Risque élevé", value: insights.summary?.high_risk_products, icon: AlertTriangle },
                { label: "Stock faible", value: insights.summary?.low_stock_products, icon: ArrowDown },
              ].map((item, i) => (
                <div key={i} className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </div>
                  <div className="text-lg font-bold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Score */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-green-400" /> Score de santé
            </h3>
            <div className="flex items-center gap-6">
              <div className={`text-5xl font-bold ${
                insights.health_score >= 80 ? "text-green-400" : insights.health_score >= 50 ? "text-yellow-400" : "text-red-400"
              }`}>
                {insights.health_score}%
              </div>
              <div className="flex-1">
                <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    insights.health_score >= 80 ? "bg-green-500" : insights.health_score >= 50 ? "bg-yellow-500" : "bg-red-500"
                  }`} style={{ width: `${insights.health_score}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {insights.health_score >= 80 ? "Excellent état du système" :
                   insights.health_score >= 50 ? "Attention requise sur certains aspects" :
                   "Actions urgentes nécessaires"}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {insights.recommendations?.length > 0 && (
            <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" /> Recommandations
              </h3>
              <div className="space-y-2">
                {insights.recommendations.map((r: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    r.priority === "critical" ? "bg-red-500/10 border-red-500/20" : "bg-yellow-500/10 border-yellow-500/20"
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${r.priority === "critical" ? "text-red-400" : "text-yellow-400"}`} />
                      <span className="text-sm text-white">{r.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" /> Résultats de l'analyse ({analysisResult.analyzed} produits)
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-red-400">{analysisResult.high_risk?.length || 0}</div>
              <div className="text-xs text-slate-400">Risque élevé</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-yellow-400">{analysisResult.low_stock_forecast?.length || 0}</div>
              <div className="text-xs text-slate-400">Rupture &lt; 7j</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-400">{analysisResult.anomalies_detected?.length || 0}</div>
              <div className="text-xs text-slate-400">Anomalies</div>
            </div>
            <div className="bg-slate-500/10 border border-slate-500/20 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-slate-400">{analysisResult.dormant_products?.length || 0}</div>
              <div className="text-xs text-slate-400">Dormants</div>
            </div>
          </div>

          {analysisResult.high_risk?.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-slate-400 mb-2">Produits à risque élevé</h4>
              <div className="space-y-1">
                {analysisResult.high_risk.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm bg-slate-800 rounded p-2">
                    <span className="text-white">{p.name}</span>
                    <span className="text-red-400 font-mono text-xs">{p.score}/100</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {analysisResult.trending_up?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1"><ArrowUp className="w-3 h-3" /> Tendance hausse</h4>
                {analysisResult.trending_up.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="text-xs text-slate-400">• {p.name}</div>
                ))}
              </div>
            )}
            {analysisResult.trending_down?.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1"><ArrowDown className="w-3 h-3" /> Tendance baisse</h4>
                {analysisResult.trending_down.slice(0, 3).map((p: any) => (
                  <div key={p.id} className="text-xs text-slate-400">• {p.name}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!insights && !analysisResult && (
        <div className="text-center py-16 text-slate-500">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium text-slate-400">Assistant IA Viraltech</p>
          <p className="text-sm mt-1">Cliquez sur une action ci-dessus pour démarrer l'analyse</p>
        </div>
      )}
    </div>
  );
}
