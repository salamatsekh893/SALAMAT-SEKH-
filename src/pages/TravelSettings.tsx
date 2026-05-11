import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { fetchWithAuth } from '../lib/api';
import { Settings, Save, Fuel, Info, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export default function TravelSettings() {
  const navigate = useNavigate();
  const [fuelRate, setFuelRate] = useState('12');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetchWithAuth('/settings/fuel_rate');
      if (res.value) setFuelRate(res.value);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchWithAuth('/settings/fuel_rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: fuelRate })
      });
      toast.success('Configuration saved successfully');
    } catch (err: any) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Travel Settings</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Global Logistics Configuration</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-6 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100"
        >
          <div className="space-y-8">
             <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                   <p className="text-xs font-bold text-blue-900">Admin Control</p>
                   <p className="text-[10px] font-medium text-blue-700 mt-1">
                     These settings affect travel claims globally across all field officers. Changes will be applied to all new travel log submissions.
                   </p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                   <Fuel className="w-5 h-5 text-amber-500" />
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Fuel Reimbursement Rate</h3>
                </div>
                
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate per Kilometer (₹/KM)</label>
                   <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</div>
                      <input 
                        type="number"
                        value={fuelRate}
                        onChange={(e) => setFuelRate(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-8 pr-4 py-4 text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="e.g. 12"
                      />
                   </div>
                   <p className="text-[9px] font-medium text-slate-400 ml-1 italic">
                     * This rate will be suggested to staff as the default for their claims.
                   </p>
                </div>
             </div>

             <div className="pt-4 border-t border-slate-50">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    "w-full py-5 rounded-[20px] font-black uppercase text-sm tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3",
                    saving ? "bg-slate-100 text-slate-400" : "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700"
                  )}
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Configuration
                    </>
                  )}
                </button>
             </div>
          </div>
        </motion.div>

        {/* Verification Tips */}
        <div className="grid grid-cols-1 gap-4">
           {[
             { title: "Review Visits", desc: "Always check visit photos and coordinates before approval.", icon: CheckCircle, color: "text-green-500" },
             { title: "GPS Verification", desc: "Compare odometer distance with GPS calculated distance to prevent fraud.", icon: Settings, color: "text-blue-500" }
           ].map((tip, i) => (
             <div key={i} className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex items-start gap-4">
                <div className={cn("w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0", tip.color.replace('text', 'bg').replace('500', '50'))}>
                   <tip.icon className={cn("w-5 h-5", tip.color)} />
                </div>
                <div>
                   <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{tip.title}</h4>
                   <p className="text-[10px] font-medium text-slate-500 mt-1">{tip.desc}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
