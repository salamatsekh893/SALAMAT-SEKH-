import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import { voiceFeedback } from '../lib/voice';
import { ArrowLeft, Save, BookOpen, Clock, Percent, AlignLeft, Hash } from 'lucide-react';
import { motion } from 'motion/react';

export default function SchemeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    scheme_name: '',
    scheme_code: '',
    interest_rate: '',
    duration_months: '',
    description: '',
    repayment_frequency: 'weekly',
    collection_week: 'Every Week',
    interest_type: 'flat',
    processing_fee: '',
    processing_fee_type: 'fixed',
    insurance_fee: '',
    insurance_fee_type: 'fixed',
    penalty_rate: '',
    status: 'active'
  });

  useEffect(() => {
    if (id) {
      fetchWithAuth(`/schemes/${id}`)
        .then(data => setFormData({
          scheme_name: data.scheme_name,
          scheme_code: data.scheme_code || '',
          interest_rate: data.interest_rate,
          duration_months: data.duration_months,
          description: data.description || '',
          repayment_frequency: data.repayment_frequency,
          collection_week: data.collection_week || 'Every Week',
          interest_type: data.interest_type,
          processing_fee: data.processing_fee || '',
          processing_fee_type: data.processing_fee_type || 'fixed',
          insurance_fee: data.insurance_fee || '',
          insurance_fee_type: data.insurance_fee_type || 'fixed',
          penalty_rate: data.penalty_rate || '',
          status: data.status
        }))
        .catch(err => console.error(err));
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
      };
      if (id) {
        await fetchWithAuth(`/schemes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchWithAuth('/schemes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      voiceFeedback.success();
      navigate('/schemes');
    } catch (err: any) {
      alert(err.message);
      voiceFeedback.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6 pb-20"
    >
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 px-2">
          <button 
            onClick={() => navigate('/schemes')}
            className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              {id ? 'Edit Scheme' : 'Create New Scheme'}
            </h1>
            <p className="text-slate-500 font-medium text-sm">Define financial product parameters</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[40px] p-4 sm:p-10 border border-slate-100 shadow-sm space-y-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          {/* Scheme Name */}
          <div className="space-y-3 col-span-2">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Scheme Name</label>
            <div className="relative group">
              <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
              <input
                required
                type="text"
                placeholder="Product Name (e.g. Micro Loan)"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 pl-14 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                value={formData.scheme_name}
                onChange={(e) => setFormData({ ...formData, scheme_name: e.target.value })}
              />
            </div>
          </div>

          {/* Scheme Code */}
          <div className="space-y-3 col-span-2">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Scheme Code (Unique)</label>
            <div className="relative group">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
              <input
                type="text"
                placeholder="LEAVE BLANK FOR AUTO-GENERATED (SC-0001)"
                className="w-full bg-slate-100 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 pl-14 rounded-2xl text-[11px] font-black text-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm uppercase placeholder:text-slate-400"
                value={formData.scheme_code}
                onChange={(e) => setFormData({ ...formData, scheme_code: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Rate (%)</label>
            <div className="relative group">
              <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
              <input
                required
                type="number"
                step="0.01"
                placeholder="Annual %"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 pl-14 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Tenure (EMI)</label>
            <div className="relative group">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
              <input
                required
                type="number"
                placeholder="EMI Count"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 pl-14 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                value={formData.duration_months}
                onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
              />
            </div>
          </div>

          {/* Repayment Frequency */}
          <div className="space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Frequency</label>
            <select
              required
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none transition-all cursor-pointer shadow-sm"
              value={formData.repayment_frequency}
              onChange={(e) => setFormData({ ...formData, repayment_frequency: e.target.value })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Collection Week (Visible for Monthly Only) */}
          {formData.repayment_frequency === 'monthly' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 ml-1">Collection Week</label>
              <select
                required
                className="w-full bg-indigo-50 border-2 border-indigo-200 focus:border-indigo-300 focus:bg-white p-5 rounded-2xl text-sm font-black text-indigo-600 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none transition-all cursor-pointer shadow-sm"
                value={formData.collection_week}
                onChange={(e) => setFormData({ ...formData, collection_week: e.target.value })}
              >
                <option value="Every Week">Every Week (Default)</option>
                <option value="1st Week">1st Week</option>
                <option value="2nd Week">2nd Week</option>
                <option value="3rd Week">3rd Week</option>
                <option value="4th Week">4th Week</option>
                <option value="5th Week">5th Week</option>
              </select>
            </motion.div>
          )}

          {/* Interest Type */}
          <div className="space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Interest Type</label>
            <select
              required
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none transition-all cursor-pointer shadow-sm"
              value={formData.interest_type}
              onChange={(e) => setFormData({ ...formData, interest_type: e.target.value })}
            >
              <option value="flat">Flat Rate</option>
              <option value="reducing">Reducing</option>
            </select>
          </div>

          {/* Processing Fee */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Proc. Fee</label>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, processing_fee_type: 'fixed'})}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${formData.processing_fee_type === 'fixed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >FIX</button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, processing_fee_type: 'percentage'})}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${formData.processing_fee_type === 'percentage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >%</button>
              </div>
            </div>
            <input
              type="number"
              placeholder={formData.processing_fee_type === 'fixed' ? "Amount" : "Percent %"}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
              value={formData.processing_fee}
              onChange={(e) => setFormData({ ...formData, processing_fee: e.target.value })}
            />
          </div>

          {/* Insurance Fee */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Insurance</label>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, insurance_fee_type: 'fixed'})}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${formData.insurance_fee_type === 'fixed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >FIX</button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, insurance_fee_type: 'percentage'})}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${formData.insurance_fee_type === 'percentage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                >%</button>
              </div>
            </div>
            <input
              type="number"
              placeholder={formData.insurance_fee_type === 'fixed' ? "Amount" : "Percent %"}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
              value={formData.insurance_fee}
              onChange={(e) => setFormData({ ...formData, insurance_fee: e.target.value })}
            />
          </div>

          {/* Penalty Rate */}
          <div className="space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Penalty (%)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Late Charge"
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
              value={formData.penalty_rate}
              onChange={(e) => setFormData({ ...formData, penalty_rate: e.target.value })}
            />
          </div>

          {/* Status */}
          <div className="space-y-3">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Status</label>
            <select
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white p-5 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none appearance-none transition-all cursor-pointer shadow-sm"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 ml-1">Description</label>
          <div className="relative group">
            <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-indigo-600 transition-colors" />
            <textarea
              rows={4}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white p-4 pl-12 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none"
              placeholder="Terms and conditions or summary..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white p-6 rounded-2xl text-xs font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Save className="w-5 h-5" />
            {loading ? 'SAVING SCHEME...' : (id ? 'UPDATE PRODUCT' : 'DEPLOY PRODUCT')}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
