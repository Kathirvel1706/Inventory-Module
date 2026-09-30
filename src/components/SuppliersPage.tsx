import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Plus, 
  Trash2,
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CreditCard,
  Package
} from 'lucide-react';
import { getSuppliers, createSupplier, deleteSupplier } from '../api/client';
import { Supplier } from '../types/inventory';

export function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Supplier, 'id' | 'created_at'>>({
    code: '',
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    country: 'India',
    materials_supplied: '',
    payment_terms: 'Net 30 Days',
    lead_time_days: 7,
    rating: 5.0,
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => getSuppliers(search || undefined),
  });

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: (newSup) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setIsModalOpen(false);
      resetForm();
      setSuccessMessage(`Supplier "${newSup.name}" (${newSup.code}) registered successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setServerError(err.message || 'Failed to register supplier');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setIsRemoveModalOpen(false);
      setSelectedSupplierId(null);
      setRemoveError(null);
      setSuccessMessage(data.message || 'Supplier removed successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setRemoveError(err.message || 'Failed to remove supplier');
    }
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      country: 'India',
      materials_supplied: '',
      payment_terms: 'Net 30 Days',
      lead_time_days: 7,
      rating: 5.0,
      is_active: true,
    });
    setFormErrors({});
    setServerError(null);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Supplier code is required';
    if (!formData.name.trim()) errors.name = 'Supplier name is required';
    if (!formData.contact_person.trim()) errors.contact_person = 'Contact person is required';
    if (!formData.email.trim()) errors.email = 'Email address is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.materials_supplied.trim()) errors.materials_supplied = 'Materials supplied description is required';
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
        <div className="relative min-w-[280px] flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search supplier name, vendor code, fabrics/materials supplied..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-[#0c162c] rounded-2xl border border-[#162646]">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading registered textile vendors...</span>
            </div>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-[#0c162c] rounded-2xl border border-[#162646]">
            <div className="flex flex-col items-center justify-center gap-2">
              <Building2 className="w-8 h-8 text-slate-600" />
              <p className="font-semibold text-slate-300">No suppliers registered</p>
              <p className="text-xs text-slate-500">Add yarn spinning mills, fabric weaving/knitting mills, and trim vendors.</p>
            </div>
          </div>
        ) : (
          suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-[#0c162c] p-6 rounded-2xl border border-[#162646] shadow-sm hover:border-slate-500 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-400">{sup.code}</span>
                    <h3 className="text-sm font-bold text-white mt-0.5 leading-snug">{sup.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full text-xs font-bold text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>{sup.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="p-3 bg-[#081224] border border-[#162646] rounded-xl text-xs text-slate-300 font-medium mb-3">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Specialized Materials</div>
                  {sup.materials_supplied}
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="font-medium text-slate-300">{sup.contact_person}</span>
                    <span className="text-slate-500">({sup.country})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{sup.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{sup.phone}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-[#162646] flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Lead time: {sup.lead_time_days} days</span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>{sup.payment_terms}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#0c162c] rounded-2xl max-w-lg w-full shadow-2xl border border-[#162646] overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#162646] bg-[#081224]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#142343] text-blue-400 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Enrol New Textile Vendor</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Supplier Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SUP-006"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 text-xs font-mono uppercase bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {formErrors.code && <p className="text-[11px] text-rose-400 mt-1">{formErrors.code}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Country / Region
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Company / Mill Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reliance Textile Mills Ltd"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {formErrors.name && <p className="text-[11px] text-rose-400 mt-1">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Contact Person <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {formErrors.contact_person && <p className="text-[11px] text-rose-400 mt-1">{formErrors.contact_person}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  placeholder="sales@reliancetex.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {formErrors.email && <p className="text-[11px] text-rose-400 mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Materials Supplied <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Micro Polar Fleece, Rayon Viscose, Spandex Blends"
                  value={formData.materials_supplied}
                  onChange={(e) => setFormData({ ...formData, materials_supplied: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {formErrors.materials_supplied && <p className="text-[11px] text-rose-400 mt-1">{formErrors.materials_supplied}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Payment Terms
                  </label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="Net 45 Days">Net 45 Days</option>
                    <option value="Net 60 Days">Net 60 Days</option>
                    <option value="LC at Sight">LC at Sight</option>
                    <option value="Advance Payment">Advance Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Avg Lead Time (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value, 10) || 7 })}
                    className="w-full px-3.5 py-2 text-xs bg-[#081224] border border-[#162646] rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
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
                  <span>Save Supplier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Supplier Modal */}
      {isRemoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0c162c] border border-[#162646] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#162646]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-950/80 text-rose-400 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Remove Supplier</h2>
                  <p className="text-[11px] text-slate-400">Deactivate and remove an existing textile supplier from the directory.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRemoveModalOpen(false);
                  setRemoveError(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#13223f] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {removeError && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{removeError}</span>
                </div>
              )}

              {suppliers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No suppliers available to remove.</p>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Select Supplier to Remove
                    </label>
                    <select
                      value={selectedSupplierId || ''}
                      onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs font-medium bg-[#081224] border border-[#162646] rounded-xl text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code}) - {s.materials_supplied}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const selected = suppliers.find((s) => s.id === selectedSupplierId);
                    if (!selected) return null;
                    return (
                      <div className="p-3.5 bg-[#081224] border border-[#162646] rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{selected.name}</span>
                          <span className="font-mono text-[11px] text-blue-400 font-bold">{selected.code}</span>
                        </div>
                        <div className="text-slate-400">
                          <span className="text-slate-500">Contact:</span> {selected.contact_person} ({selected.country})
                        </div>
                        <div className="text-slate-400">
                          <span className="text-slate-500">Specialty:</span> {selected.materials_supplied}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>
                      This action will remove the supplier from your active vendors list. Are you sure you want to proceed?
                    </span>
                  </div>
                </>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#162646]">
                <button
                  type="button"
                  onClick={() => {
                    setIsRemoveModalOpen(false);
                    setRemoveError(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending || !selectedSupplierId || suppliers.length === 0}
                  onClick={() => {
                    if (selectedSupplierId) {
                      deleteMutation.mutate(selectedSupplierId);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {deleteMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Supplier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
