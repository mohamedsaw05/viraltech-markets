import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { Shield, Key, AlertTriangle, Lock, Clock, Sparkles } from "lucide-react";

interface Props {
  onActivated: () => void;
}

export default function LicenseActivation({ onActivated }: Props) {
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [timerActive, setTimerActive] = useState(false);
  const [securityInfo, setSecurityInfo] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.securityCheck().then(setSecurityInfo);
  }, []);

  useEffect(() => {
    if (!timerActive) return;
    if (timeLeft <= 0) {
      setError("Temps expiré. Veuillez recharger la page.");
      setTimerActive(false);
      return;
    }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, timerActive]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setLicenseKey(val);
    if (!timerActive && val.length > 0) {
      setTimerActive(true);
    }
    setError("");
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setError("Le copier-coller est désactivé. Saisissez la clé manuellement.");
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError("Veuillez entrer une clé de licence.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.activateLicense(licenseKey.trim());
      if (result.success) {
        onActivated();
      } else {
        setError(result.error || "Activation échouée.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAndGetKey = async () => {
    setSeeding(true);
    try {
      await api.seedLicenses();
      const randomNum = Math.floor(Math.random() * 1000);
      const result = await api.getRandomKey(randomNum);
      if (result.success) {
        setError("");
        alert(`Votre clé de licence: ${result.key}\n\nSaisissez-la manuellement ci-dessous.`);
      }
    } catch {
      setError("Erreur lors de la génération.");
    } finally {
      setSeeding(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Viraltech-Markets</h1>
          </div>
          <p className="text-blue-300">Activation de licence</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Entrez votre clé de licence</h2>
          </div>

          {securityInfo?.clock_tampered && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Modification d'horloge détectée
            </div>
          )}

          {securityInfo?.virtual_machine && (
            <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Machine virtuelle détectée
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Key className="w-4 h-4" /> Clé de licence
                </label>
                {timerActive && (
                  <span className={`text-sm font-mono flex items-center gap-1 ${timeLeft < 30 ? "text-red-400" : "text-slate-400"}`}>
                    <Clock className="w-3 h-3" />
                    {minutes}:{seconds.toString().padStart(2, "0")}
                  </span>
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={licenseKey}
                onChange={handleKeyChange}
                onPaste={handlePaste}
                placeholder="VT-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                maxLength={34}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none tracking-wider"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleActivate}
              disabled={loading || !licenseKey.trim() || timeLeft <= 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <>Vérification...</>
              ) : (
                <><Lock className="w-4 h-4" /> Activer la licence</>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700" /></div>
              <div className="relative flex justify-center"><span className="bg-slate-800 px-3 text-xs text-slate-500">OU</span></div>
            </div>

            <button
              onClick={handleSeedAndGetKey}
              disabled={seeding}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors text-sm"
            >
              {seeding ? "Génération en cours..." : "Obtenir une clé de démonstration"}
            </button>

            <div className="mt-4 text-xs text-slate-500 space-y-1">
              <p className="flex items-center gap-1"><Lock className="w-3 h-3" /> Copier-coller désactivé</p>
              <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> Limite de 3 minutes</p>
              <p className="flex items-center gap-1"><Shield className="w-3 h-3" /> Protection anti brute-force</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
