import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Info,
  ChevronRight,
  History
} from 'lucide-react';
import { getItems, createItem } from '../api/client';
import { Item, ItemCreateInput } from '../types/inventory';

const CATEGORIES = ['Fabric', 'Yarn', 'Trim', 'Accessory', 'Packaging'];
const UOMS = ['Meter', 'KG', 'Pieces', 'Yard', 'Cone', 'Roll'];

interface ItemMasterPageProps {
  onNavigate?: (path: string) => void;
}

export function ItemMasterPage({ onNavigate }: ItemMasterPageProps = {}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Form State
  const [formData, setFormData] = useState<ItemCreateInput>({
    code: '',
    name: '',
    category: 'Fabric',
    uom: 'Meter',
    unit_cost: 0,
    reorder_level: 100,
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: items = [], isLoading, isError, error } = useQuery({
    queryKey: ['items', search, selectedCategory, selectedStatus],
    queryFn: () => getItems({
      search: search || undefined,
      category: selectedCategory || undefined,
      is_active: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
    }),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['currentStock'] });
      setIsModalOpen(false);
      resetForm();
      setSuccessMessage(`Item "${newItem.code} - ${newItem.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to create item');
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      category: 'Fabric',
      uom: 'Meter',
      unit_cost: 0,
      reorder_level: 100,
      is_active: true,
    });
    setFormErrors({});
    setServerError(null);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Item code is required';
    if (!formData.name.trim()) errors.name = 'Item name is required';
    if (!formData.category.trim()) errors.category = 'Category is required';
    if (!formData.uom.trim()) errors.uom = 'UOM is required';
    if (isNaN(Number(formData.unit_cost)) || Number(formData.unit_cost) < 0) {
      errors.unit_cost = 'Unit cost must be a non-negative number';
    }
    if (isNaN(Number(formData.reorder_level)) || Number(formData.reorder_level) < 0) {
      errors.reorder_level = 'Reorder level must be a non-negative number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    createMutation.mutate({
      ...formData,
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      unit_cost: Number(formData.unit_cost),
      reorder_level: Number(formData.reorder_level),
    });
  };

  const getCategoryDotClass = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'fabric':
        return 'bg-blue-500';
      case 'yarn':
        return 'bg-amber-500';
      case 'trim':
        return 'bg-purple-500';
      case 'accessory':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Toast Feedback */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded-2xl shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c162c] p-5 rounded-2xl border border-[#162646] shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search SKU code or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Add Item Button */}
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 rounded-xl shadow-sm transition-all flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add SKU Item</span>
        </button>
      </div>

      {/* Items Table */}
      <div className="bg-[#0c162c] border border-[#162646] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#081224]/80 border-b border-[#162646] text-slate-400 font-medium">
                <th className="py-3 px-4">Item Code</th>
                <th className="py-3 px-4">Item Name / Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">UOM</th>
                <th className="py-3 px-4 text-right">Standard Cost</th>
                <th className="py-3 px-4 text-right">Reorder Threshold</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#13223f]/50 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Loading SKU catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-rose-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6" />
                      <span>Failed to load items. {(error as any)?.message}</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-300">No items found</p>
                      <p className="text-xs text-slate-500">Try adjusting your search criteria or register a new SKU item.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#101e38]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {item.code}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-white">
                      {item.name}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-300">
                        <span className={`w-2 h-2 rounded-full ${getCategoryDotClass(item.category)}`}></span>
                        <span>{item.category}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-medium">
                      {item.uom}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-300">
                      ₹{Number(item.unit_cost).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-300">
                      {Number(item.reorder_level).toLocaleString()} {item.uom}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        item.is_active 
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
                          : 'bg-slate-900 text-slate-400 border-slate-700/60'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate(`/stock/movements?item_id=${item.id}`)}
                            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 font-medium transition-colors cursor-pointer"
                            title="View Stock Movement Timeline"
                          >
                            <History className="w-3.5 h-3.5 text-blue-400" />
                            <span>Timeline</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#0c162c] rounded-2xl max-w-lg w-full shadow-2xl border border-[#162646] overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#162646] bg-[#081224]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#142343] text-blue-400 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Register New Item Master SKU</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {serverError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/80 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{serverError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Item Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Item Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FAB005"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className={`w-full px-3.5 py-2 text-xs font-mono uppercase bg-[#081224] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                      formErrors.code ? 'border-rose-500' : 'border-[#162646]'
                    }`}
                  />
                  {formErrors.code && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.code}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Item Description <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100% Cotton Poplin 130 GSM White"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                    formErrors.name ? 'border-rose-500' : 'border-[#162646]'
                  }`}
                />
                {formErrors.name && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* UOM */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    UOM <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none cursor-pointer"
                  >
                    {UOMS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Unit Cost */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Standard Cost (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 text-xs font-mono font-bold bg-[#081224] border rounded-xl text-white placeholder-slate-500 focus:outline-none ${
                      formErrors.unit_cost ? 'border-rose-500' : 'border-[#162646]'
                    }`}
                  />
                  {formErrors.unit_cost && <p className="text-[11px] text-rose-400 mt-1">{formErrors.unit_cost}</p>}
                </div>

                {/* Reorder Level */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Reorder Level <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3.5 py-2 text-xs font-mono font-bold bg-[#081224] border rounded-xl text-white placeholder-slate-500 focus:outline-none ${
                      formErrors.reorder_level ? 'border-rose-500' : 'border-[#162646]'
                    }`}
                  />
                  {formErrors.reorder_level && <p className="text-[11px] text-rose-400 mt-1">{formErrors.reorder_level}</p>}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0 h-4 w-4 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="is_active" className="text-xs font-medium text-slate-300 cursor-pointer">
                  Active (available for Stock In & Stock Out transactions)
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#162646]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {createMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Save SKU</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Details View Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0c162c] rounded-2xl max-w-md w-full shadow-2xl border border-[#162646] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#162646] bg-[#081224]">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Item Master Details</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#162646]">
                <span className="text-slate-400 font-medium">SKU Code:</span>
                <span className="font-mono font-bold text-blue-400">{selectedItem.code}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#162646]">
                <span className="text-slate-400 font-medium">Description:</span>
                <span className="font-medium text-white text-right">{selectedItem.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#162646]">
                <span className="text-slate-400 font-medium">Category:</span>
                <span className="font-medium text-slate-300">{selectedItem.category}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#162646]">
                <span className="text-slate-400 font-medium">UOM:</span>
                <span className="font-medium text-slate-300">{selectedItem.uom}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#162646]">
                <span className="text-slate-400 font-medium">Standard Unit Cost:</span>
                <span className="font-mono font-bold text-white">₹{Number(selectedItem.unit_cost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#162646]">
                <span className="text-slate-400 font-medium">Reorder Alert Threshold:</span>
                <span className="font-mono font-bold text-amber-400">{Number(selectedItem.reorder_level).toLocaleString()} {selectedItem.uom}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#162646]">
                <span className="text-slate-400 font-medium">Status:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  selectedItem.is_active ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' : 'bg-slate-900 text-slate-400 border-slate-700/60'
                }`}>
                  {selectedItem.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400 font-medium">Registered:</span>
                <span className="text-slate-300">{new Date(selectedItem.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="px-6 py-3 bg-[#081224] border-t border-[#162646] flex items-center justify-between">
              {onNavigate && (
                <button
                  onClick={() => {
                    const id = selectedItem.id;
                    setSelectedItem(null);
                    onNavigate(`/stock/movements?item_id=${id}`);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View Stock Movement Timeline</span>
                </button>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-300 bg-[#0c162c] border border-[#162646] rounded-xl hover:border-slate-500 ml-auto cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
