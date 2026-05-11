import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Building2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchWithAuth } from '../lib/api';

export default function CreateBankAccount() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_name: '',
    opening_balance: 0,
    status: 'active'
  });

  useEffect(() => {
    if (id) {
      loadBank();
    }
  }, [id]);

  useEffect(() => {
    if (formData.ifsc_code?.length === 11) {
      fetchWithAuth(`/ifsc/${formData.ifsc_code}`)
        .then(data => {
          if (data && data.BANK && data.BRANCH) {
            setFormData(prev => ({
              ...prev,
              bank_name: prev.bank_name || data.BANK,
              branch_name: prev.branch_name || data.BRANCH
            }));
          }
        })
        .catch(() => {});
    }
  }, [formData.ifsc_code]);

  const loadBank = async () => {
    try {
      const data = await fetchWithAuth('/banks');
      const bank = data.find((b: any) => b.id.toString() === id);
      if (bank) {
        setFormData({
          bank_name: bank.bank_name || '',
          account_number: bank.account_number || '',
          ifsc_code: bank.ifsc_code || '',
          branch_name: bank.branch_name || '',
          account_name: bank.account_name || '',
          opening_balance: bank.opening_balance || 0,
          status: bank.status || 'active'
        });
      }
    } catch (err) {
      console.error('Failed to load bank setup');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id) {
        await fetchWithAuth(`/banks/${id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await fetchWithAuth('/banks', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      
      voiceFeedback.success();
      navigate('/banks');
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message || 'Error saving data');
    }
  };

  if (user?.role !== 'superadmin') {
    return <div className="p-10 text-center text-rose-500 font-bold">Access Denied</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4 pb-10">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{id ? 'Edit Bank Account' : 'New Bank Account'}</h2>
              <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase mt-0.5">Define Company Bank Credentials</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/banks')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Bank Name *</label>
              <input 
                required
                type="text" 
                value={formData.bank_name}
                onChange={e => setFormData({...formData, bank_name: e.target.value})}
                placeholder="e.g. State Bank of India"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Account Number *</label>
              <input 
                required
                type="text" 
                value={formData.account_number}
                onChange={e => setFormData({...formData, account_number: e.target.value})}
                placeholder="Account Number"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Account Holder Name *</label>
              <input 
                required
                type="text" 
                value={formData.account_name}
                onChange={e => setFormData({...formData, account_name: e.target.value})}
                placeholder="Company / Legal Entity Name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">IFSC Code *</label>
              <input 
                required
                type="text" 
                value={formData.ifsc_code}
                onChange={e => setFormData({...formData, ifsc_code: e.target.value})}
                placeholder="e.g. SBIN0001234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Branch Name *</label>
              <input 
                required
                type="text" 
                value={formData.branch_name}
                onChange={e => setFormData({...formData, branch_name: e.target.value})}
                placeholder="Branch Location"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
              />
            </div>

            {!id && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Opening Balance</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.opening_balance}
                  onChange={e => setFormData({...formData, opening_balance: parseFloat(e.target.value.replace(/^0+/, '') || '0')})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold transition-colors"
              >
                <option value="active">Active (Available for transactions)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => navigate('/banks')}
              className="px-6 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider rounded flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
