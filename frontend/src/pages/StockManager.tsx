import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import {
  Package, Plus, Search, RefreshCw, Trash2,
  Copy, ArrowUpRight, ArrowDownRight, Eye,
  ChevronLeft, ChevronRight, ArrowUpDown, X, Save,
  AlertTriangle, Brain, BarChart3
} from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  max_quantity: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  margin: number;
  warehouse_id: string | null;
  supplier: string;
  sync_status: string;
  security_status: string;
  risk_level: number;
  is_expired: boolean;
  days_until_expiry: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export default function StockManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [productAI, setProductAI] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({
        search, page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder,
        category: filterCategory, low_stock: filterLowStock || undefined,
      });
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize, sortBy, sortOrder, filterCategory, filterLowStock]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("asc");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    await api.deleteProduct(id);
    loadProducts();
    if (selectedProduct?.id === id) setSelectedProduct(null);
  };

  const handleDuplicate = async (id: string) => {
    await api.duplicateProduct(id);
    loadProducts();
  };

  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product);
    setShowDetailPanel(true);
    try {
      const ai = await api.analyzeProduct(product.id);
      setProductAI(ai);
    } catch { setProductAI(null); }
  };

  const getStockBadge = (p: Product) => {
    if (p.quantity <= 0) return { text: "Rupture", cls: "bg-red-500/20 text-red-400" };
    if (p.quantity <= p.min_quantity) return { text: "Faible", cls: "bg-yellow-500/20 text-yellow-400" };
    if (p.is_expired) return { text: "Expiré", cls: "bg-red-500/20 text-red-400" };
    return { text: "OK", cls: "bg-green-500/20 text-green-400" };
  };

  const getRiskBadge = (level: number) => {
    if (level >= 70) return { text: "Élevé", cls: "bg-red-500/20 text-red-400" };
    if (level >= 40) return { text: "Moyen", cls: "bg-yellow-500/20 text-yellow-400" };
    return { text: "Bas", cls: "bg-green-500/20 text-green-400" };
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Main Table */}
      <div className={`flex-1 space-y-4 ${showDetailPanel ? "" : ""}`}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher produits, SKU, code-barres..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
            <option value="">Toutes catégories</option>
            <option value="General">Général</option>
            <option value="Electronics">Électronique</option>
            <option value="Food">Alimentation</option>
            <option value="Clothing">Vêtements</option>
          </select>
          <button onClick={() => { setFilterLowStock(!filterLowStock); setPage(1); }}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
              filterLowStock ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400" : "border-slate-700 text-slate-400 hover:text-white"
            }`}>
            <AlertTriangle className="w-4 h-4" /> Stock faible
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
          <button onClick={loadProducts} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{total} produits</span>
          <span>•</span>
          <span>Page {page}/{totalPages}</span>
        </div>

        {/* Table */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800 bg-slate-900/50">
                  {[
                    { key: "sku", label: "SKU" },
                    { key: "name", label: "Produit" },
                    { key: "category", label: "Catégorie" },
                    { key: "quantity", label: "Quantité" },
                    { key: "selling_price", label: "Prix vente" },
                    { key: "margin", label: "Marge" },
                  ].map((col) => (
                    <th key={col.key} className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort(col.key)}>
                      <span className="flex items-center gap-1">
                        {col.label}
                        {sortBy === col.key && <ArrowUpDown className="w-3 h-3" />}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">État</th>
                  <th className="px-4 py-3 font-medium">Risque</th>
                  <th className="px-4 py-3 font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map((p) => {
                  const stock = getStockBadge(p);
                  const risk = getRiskBadge(p.risk_level);
                  return (
                    <tr key={p.id} onClick={() => handleSelectProduct(p)}
                      className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedProduct?.id === p.id ? "bg-blue-500/10" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.sku}</td>
                      <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-slate-400">{p.category}</td>
                      <td className="px-4 py-3">
                        <span className={p.quantity <= p.min_quantity ? "text-yellow-400 font-medium" : "text-white"}>
                          {p.quantity} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white">{p.selling_price?.toLocaleString()} CFA</td>
                      <td className="px-4 py-3">
                        <span className={p.margin >= 30 ? "text-green-400" : p.margin >= 15 ? "text-yellow-400" : "text-red-400"}>
                          {p.margin}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${stock.cls}`}>{stock.text}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${risk.cls}`}>{risk.text}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleSelectProduct(p)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDuplicate(p.id)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {loading ? "Chargement..." : "Aucun produit trouvé"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-slate-400 hover:text-white disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded text-sm ${p === page ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                      {p}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-sm text-slate-400 hover:text-white disabled:opacity-30">
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {showDetailPanel && selectedProduct && (
        <div className="w-96 bg-slate-900/80 rounded-xl border border-slate-700 overflow-auto flex-shrink-0 max-h-screen sticky top-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Détails produit</h3>
            <button onClick={() => setShowDetailPanel(false)} className="p-1 rounded hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-lg font-bold text-white">{selectedProduct.name}</h4>
              <p className="text-xs text-slate-500 font-mono">{selectedProduct.sku}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-800 rounded-lg p-3"><div className="text-slate-500 text-xs">Quantité</div><div className="text-white font-semibold">{selectedProduct.quantity} {selectedProduct.unit}</div></div>
              <div className="bg-slate-800 rounded-lg p-3"><div className="text-slate-500 text-xs">Prix vente</div><div className="text-white font-semibold">{selectedProduct.selling_price?.toLocaleString()} CFA</div></div>
              <div className="bg-slate-800 rounded-lg p-3"><div className="text-slate-500 text-xs">Prix achat</div><div className="text-white font-semibold">{selectedProduct.cost_price?.toLocaleString()} CFA</div></div>
              <div className="bg-slate-800 rounded-lg p-3"><div className="text-slate-500 text-xs">Marge</div><div className={`font-semibold ${selectedProduct.margin >= 30 ? "text-green-400" : "text-yellow-400"}`}>{selectedProduct.margin}%</div></div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Catégorie</span><span className="text-white">{selectedProduct.category}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Min / Max</span><span className="text-white">{selectedProduct.min_quantity} / {selectedProduct.max_quantity}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Fournisseur</span><span className="text-white">{selectedProduct.supplier || "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Sync</span><span className="text-green-400">{selectedProduct.sync_status}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Sécurité</span><span className="text-green-400">{selectedProduct.security_status}</span></div>
            </div>

            {/* AI Analysis */}
            {productAI && !productAI.error && (
              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" /> Analyse IA
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Consommation/jour</span><span className="text-white">{productAI.daily_consumption_rate}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Prévision stock</span><span className={`font-medium ${productAI.stock_forecast_days < 7 ? "text-red-400" : "text-green-400"}`}>{productAI.stock_forecast_days} jours</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Score risque</span><span className={`font-medium ${productAI.risk_score > 50 ? "text-red-400" : "text-green-400"}`}>{productAI.risk_score}/100</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tendance</span><span className="text-white capitalize">{productAI.trend?.direction}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Confiance IA</span><span className="text-blue-400">{productAI.confidence}%</span></div>
                  {productAI.risk_factors?.length > 0 && (
                    <div className="mt-2">
                      <span className="text-slate-500 text-xs">Facteurs de risque:</span>
                      {productAI.risk_factors.map((f: string, i: number) => (
                        <div key={i} className="text-xs text-red-400 mt-1">• {f}</div>
                      ))}
                    </div>
                  )}
                  {productAI.invisible_losses?.has_loss && (
                    <div className="mt-2 bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                      <span className="text-xs text-red-400">⚠ Perte invisible détectée: {productAI.invisible_losses.discrepancy} unités ({productAI.invisible_losses.loss_percentage}%)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <button onClick={() => { setShowMovementModal(true); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">
                <ArrowUpRight className="w-4 h-4" /> Mouvement stock
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleDuplicate(selectedProduct.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700">
                  <Copy className="w-3.5 h-3.5" /> Dupliquer
                </button>
                <button onClick={() => handleDelete(selectedProduct.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); loadProducts(); }} />}

      {/* Movement Modal */}
      {showMovementModal && selectedProduct && (
        <MovementModal product={selectedProduct} onClose={() => setShowMovementModal(false)}
          onDone={() => { setShowMovementModal(false); loadProducts(); if (selectedProduct) handleSelectProduct(selectedProduct); }} />
      )}
    </div>
  );
}

function AddProductModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    name: "", category: "General", quantity: 0, min_quantity: 0,
    max_quantity: 0, unit: "unit", cost_price: 0, selling_price: 0,
    supplier: "", description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      await api.createProduct(form);
      onAdded();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Plus className="w-5 h-5 text-blue-400" /> Nouveau produit</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Nom du produit *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Catégorie</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="General">Général</option>
                <option value="Electronics">Électronique</option>
                <option value="Food">Alimentation</option>
                <option value="Clothing">Vêtements</option>
                <option value="Pharma">Pharmacie</option>
                <option value="Industrial">Industriel</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Unité</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="unit">Unité</option>
                <option value="kg">Kg</option>
                <option value="litre">Litre</option>
                <option value="box">Boîte</option>
                <option value="pack">Pack</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Quantité</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Min</label>
              <input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Max</label>
              <input type="number" value={form.max_quantity} onChange={(e) => setForm({ ...form, max_quantity: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Prix d'achat</label>
              <input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Prix de vente</label>
              <input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Fournisseur</label>
            <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={loading || !form.name}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 disabled:opacity-50">
            <Save className="w-4 h-4" /> {loading ? "Création..." : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MovementModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState("in");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (quantity <= 0) return;
    setLoading(true);
    try {
      await api.recordMovement({
        product_id: product.id,
        movement_type: type,
        quantity,
        reason,
      });
      onDone();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Mouvement: {product.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Type de mouvement</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "in", label: "Entrée", icon: ArrowUpRight, color: "green" },
                { id: "out", label: "Sortie", icon: ArrowDownRight, color: "red" },
                { id: "adjustment", label: "Ajust.", icon: BarChart3, color: "blue" },
              ].map((t) => (
                <button key={t.id} onClick={() => setType(t.id)}
                  className={`p-2 rounded-lg border text-sm flex flex-col items-center gap-1 ${
                    type === t.id ? `border-${t.color}-500 bg-${t.color}-500/20 text-${t.color}-400` : "border-slate-600 text-slate-400"
                  }`}>
                  <t.icon className="w-4 h-4" />{t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Quantité</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={0}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none" />
            <p className="text-xs text-slate-500 mt-1">Stock actuel: {product.quantity} {product.unit}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1 block">Raison</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif du mouvement"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400">Annuler</button>
          <button onClick={handleSubmit} disabled={loading || quantity <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 disabled:opacity-50">
            {loading ? "Enregistrement..." : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
