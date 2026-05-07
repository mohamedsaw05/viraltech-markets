import { useState, useEffect } from "react";
import { api } from "./services/api";
import ConfigWizard from "./pages/ConfigWizard";
import LicenseActivation from "./pages/LicenseActivation";
import Dashboard from "./pages/Dashboard";

type AppState = "loading" | "license" | "wizard" | "app";

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const licenseStatus = await api.validateLicense();
      if (!licenseStatus.valid) {
        setAppState("license");
        return;
      }

      const configStatus = await api.getStatus();
      if (!configStatus.is_configured) {
        setAppState("wizard");
        return;
      }

      setConfig(configStatus);
      setAppState("app");
    } catch {
      setAppState("license");
    }
  };

  const handleLicenseActivated = async () => {
    const configStatus = await api.getStatus();
    if (!configStatus.is_configured) {
      setAppState("wizard");
    } else {
      setConfig(configStatus);
      setAppState("app");
    }
  };

  const handleConfigComplete = async () => {
    const configStatus = await api.getStatus();
    setConfig(configStatus);
    setAppState("app");
  };

  const handleLogout = () => {
    setAppState("license");
  };

  if (appState === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">Viraltech-Markets</h1>
          <p className="text-slate-500 text-sm mt-1">Chargement du système...</p>
        </div>
      </div>
    );
  }

  if (appState === "license") {
    return <LicenseActivation onActivated={handleLicenseActivated} />;
  }

  if (appState === "wizard") {
    return <ConfigWizard onComplete={handleConfigComplete} />;
  }

  return <Dashboard config={config} onLogout={handleLogout} />;
}

export default App;
