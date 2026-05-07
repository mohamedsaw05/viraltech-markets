import { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Building2, Globe, Layers, Users, Settings, ChevronRight,
  ChevronLeft, Check, Package, ShoppingCart, Factory,
  Pill, UtensilsCrossed, GraduationCap, Stethoscope,
  Calculator, Truck, Warehouse, UserCog, Cog, ShoppingBag,
  Database, Sparkles
} from "lucide-react";

const BUSINESS_TYPES = [
  { id: "sarl", label: "SARL", icon: Building2 },
  { id: "sa", label: "SA", icon: Building2 },
  { id: "sas", label: "SAS", icon: Building2 },
  { id: "ei", label: "Entreprise Individuelle", icon: Building2 },
  { id: "association", label: "Association", icon: Building2 },
  { id: "cooperative", label: "Coopérative", icon: Building2 },
  { id: "other", label: "Autre", icon: Building2 },
];

const BUSINESS_DOMAINS = [
  { id: "commerce", label: "Commerce", icon: ShoppingCart },
  { id: "industrie", label: "Industrie", icon: Factory },
  { id: "sante", label: "Santé", icon: Stethoscope },
  { id: "education", label: "Éducation", icon: GraduationCap },
  { id: "restauration", label: "Restauration", icon: UtensilsCrossed },
  { id: "logistique", label: "Logistique", icon: Truck },
  { id: "general", label: "Général", icon: Globe },
];

const ALL_MODULES: Record<string, { label: string; icon: any; desc: string }> = {
  stock: { label: "Gestion de Stock", icon: Package, desc: "Stock intelligent avec analyse IA" },
  commercial: { label: "Gestion Commerciale", icon: ShoppingCart, desc: "Ventes, achats, factures" },
  accounting: { label: "Comptabilité", icon: Calculator, desc: "Plan comptable, journaux, bilan" },
  hr: { label: "Ressources Humaines", icon: UserCog, desc: "Employés, paie, congés" },
  production: { label: "Production", icon: Cog, desc: "Ordres de fabrication" },
  logistics: { label: "Logistique", icon: Truck, desc: "Transport, livraison" },
  ecommerce: { label: "E-Commerce", icon: ShoppingBag, desc: "Boutique en ligne" },
  pharmacy: { label: "Pharmacie", icon: Pill, desc: "Médicaments, ordonnances" },
  restaurant: { label: "Restaurant", icon: UtensilsCrossed, desc: "Menu, commandes, tables" },
  school: { label: "École", icon: GraduationCap, desc: "Élèves, classes, notes" },
  hospital: { label: "Hôpital", icon: Stethoscope, desc: "Patients, dossiers" },
  multi_warehouse: { label: "Multi-Entrepôts", icon: Warehouse, desc: "Plusieurs entrepôts" },
  data_management: { label: "Gestion de Données", icon: Database, desc: "Import, export, nettoyage" },
  industrial: { label: "Gestion Industrielle", icon: Factory, desc: "Machines, maintenance" },
};

const MANAGEMENT_LEVELS = [
  { id: "simple", label: "Simple", desc: "Gestion basique de données" },
  { id: "standard", label: "Standard", desc: "Gestion complète avec rapports" },
  { id: "advanced", label: "Avancé", desc: "IA, analytics, multi-entrepôts" },
  { id: "enterprise", label: "Entreprise", desc: "Toutes fonctionnalités" },
];

interface Props {
  onComplete: () => void;
}

export default function ConfigWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessDomain, setBusinessDomain] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [maxUsers, setMaxUsers] = useState(1);
  const [managementLevel, setManagementLevel] = useState("standard");
  const [suggestedModules, setSuggestedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (businessDomain) {
      api.getSuggestedModules(businessDomain).then((modules) => {
        setSuggestedModules(modules);
        setSelectedModules(modules);
      });
    }
  }, [businessDomain]);

  const toggleModule = (mod: string) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.setupSystem({
        company_name: companyName,
        business_type: businessType,
        business_domain: businessDomain,
        management_level: managementLevel,
        max_users: maxUsers,
        active_modules: selectedModules,
      });
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: "Entreprise", icon: Building2 },
    { title: "Domaine", icon: Globe },
    { title: "Modules", icon: Layers },
    { title: "Utilisateurs", icon: Users },
    { title: "Configuration", icon: Settings },
  ];

  const canNext = () => {
    if (step === 0) return companyName.length > 0 && businessType.length > 0;
    if (step === 1) return businessDomain.length > 0;
    if (step === 2) return selectedModules.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Viraltech-Markets</h1>
          </div>
          <p className="text-blue-300">Assistant de configuration initiale</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                i < step ? "bg-green-600 text-white" : i === step ? "bg-blue-600 text-white ring-4 ring-blue-400/30" : "bg-slate-700 text-slate-400"
              }`}>
                {i < step ? <Check className="w-5 h-5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 ${i < step ? "bg-green-600" : "bg-slate-700"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            {(() => { const StepIcon = steps[step].icon; return <StepIcon className="w-5 h-5 text-blue-400" />; })()}
            {steps[step].title}
          </h2>

          {/* Step 0: Company Info */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nom de l'entreprise</label>
                <input
                  type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Entrez le nom de votre entreprise"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Type d'entreprise</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BUSINESS_TYPES.map((bt) => (
                    <button key={bt.id} onClick={() => setBusinessType(bt.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        businessType === bt.id
                          ? "border-blue-500 bg-blue-500/20 text-white"
                          : "border-slate-600 hover:border-slate-500 text-slate-300"
                      }`}>
                      <bt.icon className="w-5 h-5 mb-1" />
                      <div className="text-sm font-medium">{bt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Business Domain */}
          {step === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {BUSINESS_DOMAINS.map((bd) => (
                <button key={bd.id} onClick={() => setBusinessDomain(bd.id)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    businessDomain === bd.id
                      ? "border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-400/30"
                      : "border-slate-600 hover:border-slate-500 text-slate-300"
                  }`}>
                  <bd.icon className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-medium">{bd.label}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Modules */}
          {step === 2 && (
            <div className="space-y-4">
              {suggestedModules.length > 0 && (
                <p className="text-sm text-blue-300 bg-blue-500/10 rounded-lg px-3 py-2">
                  💡 Modules suggérés pour votre domaine sélectionnés automatiquement
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(ALL_MODULES).map(([key, mod]) => {
                  const Icon = mod.icon;
                  const selected = selectedModules.includes(key);
                  const suggested = suggestedModules.includes(key);
                  return (
                    <button key={key} onClick={() => toggleModule(key)}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                        selected
                          ? "border-blue-500 bg-blue-500/15 text-white"
                          : "border-slate-600 hover:border-slate-500 text-slate-400"
                      }`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selected ? "bg-blue-600" : "bg-slate-700"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {mod.label}
                          {suggested && <span className="text-xs bg-blue-600 px-1.5 py-0.5 rounded text-blue-100">Suggéré</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{mod.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selected ? "bg-blue-600 border-blue-600" : "border-slate-600"
                      }`}>
                        {selected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Users */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nombre d'utilisateurs</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={1} max={100} value={maxUsers}
                    onChange={(e) => setMaxUsers(Number(e.target.value))}
                    className="flex-1 accent-blue-600" />
                  <div className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white font-mono min-w-16 text-center">
                    {maxUsers}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Management Level */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MANAGEMENT_LEVELS.map((level) => (
                  <button key={level.id} onClick={() => setManagementLevel(level.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      managementLevel === level.id
                        ? "border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-400/30"
                        : "border-slate-600 hover:border-slate-500 text-slate-300"
                    }`}>
                    <div className="font-semibold mb-1">{level.label}</div>
                    <div className="text-sm text-slate-400">{level.desc}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6 bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Résumé de configuration</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-500">Entreprise:</div>
                  <div className="text-white">{companyName}</div>
                  <div className="text-slate-500">Type:</div>
                  <div className="text-white">{businessType.toUpperCase()}</div>
                  <div className="text-slate-500">Domaine:</div>
                  <div className="text-white capitalize">{businessDomain}</div>
                  <div className="text-slate-500">Modules:</div>
                  <div className="text-white">{selectedModules.length} sélectionnés</div>
                  <div className="text-slate-500">Utilisateurs:</div>
                  <div className="text-white">{maxUsers}</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} disabled={!canNext()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors">
                {loading ? "Configuration..." : "Démarrer Viraltech-Markets"}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
