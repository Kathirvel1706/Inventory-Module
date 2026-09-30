import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Warehouse as WarehouseIcon, 
  Plus, 
  Search, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building2
} from 'lucide-react';
import { getWarehouses, createWarehouse } from '../api/client';
import { WarehouseCreateInput } from '../types/inventory';

export function WarehouseMasterPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<WarehouseCreateInput>({
    name: '',
    location: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: warehouses = [], isLoading, isError, error } = useQuery({
    queryKey: ['warehouses', search, selectedStatus],
    queryFn: () => getWarehouses({
      search: search || undefined,
      is_active: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
    }),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: createWarehouse,
    onSuccess: (newWh) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['currentStock'] });
      setIsModalOpen(false);
      resetForm();
      setSuccessMessage(`Warehouse "${newWh.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to create warehouse');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      is_active: true,
    });
    setFormErrors({});
    setServerError(null);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Warehouse name is required';
    if (!formData.location.trim()) errors.location = 'Location description is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    createMutation.mutate({
      name: formData.name.trim(),
      location: formData.location.trim(),
      is_active: formData.is_active,
    });
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
          <div className="relative min-w-[260px] flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search storage facility by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

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

        {/* Add Warehouse Button */}
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-600 rounded-xl shadow-sm transition-all flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Warehouse</span>
        </button>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-[#0c162c] rounded-2xl border border-[#162646]">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading plant storage locations...</span>
            </div>
          </div>
        ) : isError ? (
          <div className="col-span-full py-12 text-center text-rose-400 bg-[#0c162c] rounded-2xl border border-rose-800/40">
            <div className="flex flex-col items-center justify-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <span>Failed to load warehouses. {(error as any)?.message}</span>
            </div>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-[#0c162c] rounded-2xl border border-[#162646]">
            <div className="flex flex-col items-center justify-center gap-2">
              <Building2 className="w-8 h-8 text-slate-600" />
              <p className="font-semibold text-slate-300">No warehouses configured</p>
              <p className="text-xs text-slate-500">Add storage zones like Fabric Store, Trims Store, or Cutting Floor Storage.</p>
            </div>
          </div>
        ) : (
          warehouses.map((wh) => (
            <div 
              key={wh.id}
              className="bg-[#0c162c] p-6 rounded-2xl border border-[#162646] hover:border-slate-500 shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#142343] border border-[#162646] text-blue-400 flex items-center justify-center flex-shrink-0">
                    <WarehouseIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    wh.is_active 
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' 
                      : 'bg-slate-900 text-slate-400 border-slate-700/60'
                  }`}>
                    {wh.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{wh.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span>{wh.location}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#162646] flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">ID: #{wh.id}</span>
                <span>Configured: {new Date(wh.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Warehouse Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#0c162c] rounded-2xl max-w-md w-full shadow-2xl border border-[#162646] overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#162646] bg-[#081224]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#142343] text-blue-400 flex items-center justify-center font-bold">
                  <WarehouseIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Register Warehouse Master</h3>
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

              {/* Warehouse Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Warehouse Facility Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fabric Store - Main Plant"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                    formErrors.name ? 'border-rose-500' : 'border-[#162646]'
                  }`}
                />
                {formErrors.name && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.name}</p>}
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Plant Location / Bay / Floor <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor, Bay 1-3"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className={`w-full px-3.5 py-2 text-xs bg-[#081224] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                    formErrors.location ? 'border-rose-500' : 'border-[#162646]'
                  }`}
                />
                {formErrors.location && <p className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.location}</p>}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="wh_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0 h-4 w-4 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="wh_active" className="text-xs font-medium text-slate-300 cursor-pointer">
                  Active (available for material storage and movement)
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
                  <span>Save Warehouse</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
