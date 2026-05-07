const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json();
}

export const api = {
  // Config
  getStatus: () => request<any>("/api/config/status"),
  setupSystem: (data: any) => request<any>("/api/config/setup", { method: "POST", body: JSON.stringify(data) }),
  getAvailableModules: () => request<any>("/api/config/modules/available"),
  getSuggestedModules: (domain: string) => request<string[]>(`/api/config/modules/suggested/${domain}`),
  getActiveModules: () => request<any[]>("/api/config/modules/active"),
  getAuditLogs: (page = 1, module?: string) =>
    request<any>(`/api/config/audit-logs?page=${page}${module ? `&module=${module}` : ""}`),
  getSystemStats: () => request<any>("/api/config/stats"),

  // License
  activateLicense: (key: string) =>
    request<any>("/api/license/activate", { method: "POST", body: JSON.stringify({ license_key: key }) }),
  validateLicense: () => request<any>("/api/license/validate"),
  getLicenseStats: () => request<any>("/api/license/stats"),
  seedLicenses: () => request<any>("/api/license/seed", { method: "POST" }),
  getRandomKey: (num: number) =>
    request<any>("/api/license/get-key", { method: "POST", body: JSON.stringify({ number: num }) }),
  securityCheck: () => request<any>("/api/license/security-check"),

  // Stock
  getProducts: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request<any>(`/api/stock/products?${qs.toString()}`);
  },
  getProduct: (id: string) => request<any>(`/api/stock/products/${id}`),
  createProduct: (data: any) =>
    request<any>("/api/stock/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) =>
    request<any>(`/api/stock/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    request<any>(`/api/stock/products/${id}`, { method: "DELETE" }),
  duplicateProduct: (id: string) =>
    request<any>(`/api/stock/products/${id}/duplicate`, { method: "POST" }),
  recordMovement: (data: any) =>
    request<any>("/api/stock/movements", { method: "POST", body: JSON.stringify(data) }),
  getMovements: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request<any>(`/api/stock/movements?${qs.toString()}`);
  },
  transferStock: (data: any) =>
    request<any>("/api/stock/transfer", { method: "POST", body: JSON.stringify(data) }),
  adjustStock: (productId: string, qty: number, reason: string) =>
    request<any>(`/api/stock/products/${productId}/adjust`, {
      method: "POST", body: JSON.stringify({ new_quantity: qty, reason }),
    }),
  getAlerts: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request<any>(`/api/stock/alerts?${qs.toString()}`);
  },
  resolveAlert: (id: string) => request<any>(`/api/stock/alerts/${id}/resolve`, { method: "POST" }),
  markAlertRead: (id: string) => request<any>(`/api/stock/alerts/${id}/read`, { method: "POST" }),
  getWarehouses: () => request<any[]>("/api/stock/warehouses"),
  createWarehouse: (data: any) =>
    request<any>("/api/stock/warehouses", { method: "POST", body: JSON.stringify(data) }),
  getStockAnalytics: () => request<any>("/api/stock/analytics"),
  getDormant: (days = 30) => request<any[]>(`/api/stock/dormant?days=${days}`),
  exportInventory: (format = "json") => request<any>(`/api/stock/export?format_type=${format}`),
  securityAudit: () => request<any>("/api/stock/security-audit"),

  // Analytics & AI
  analyzeProduct: (id: string) => request<any>(`/api/analytics/product/${id}`),
  analyzeAll: () => request<any>("/api/analytics/analyze-all", { method: "POST" }),
  getInsights: () => request<any>("/api/analytics/insights"),
  runDiagnostic: () => request<any>("/api/analytics/diagnostic"),
  repairData: () => request<any>("/api/analytics/repair", { method: "POST" }),
  recalculate: () => request<any>("/api/analytics/recalculate", { method: "POST" }),
  rebuildCache: () => request<any>("/api/analytics/rebuild-cache", { method: "POST" }),
  resetSync: () => request<any>("/api/analytics/reset-sync", { method: "POST" }),
  verifyIntegrity: () => request<any>("/api/analytics/verify-integrity"),
};
