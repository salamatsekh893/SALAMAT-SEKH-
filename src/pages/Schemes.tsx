import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, Edit2, Search, PieChart, Clock, Hash, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { voiceFeedback } from '../lib/voice';

export default function Schemes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    setLoading(true);
    fetchWithAuth('/schemes')
      .then((data) => setSchemes(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filteredSchemes = schemes.filter(s => 
    s.scheme_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.scheme_code && s.scheme_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">
      Loading Schemes...
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      <div className="bg-white rounded-[40px] p-4 sm:p-10 shadow-xl shadow-indigo-500/5 border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 border-b border-slate-100 pb-8 px-2 sm:px-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
               <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Organization Schemes</h1>
              <p className="text-slate-500 font-medium text-sm mt-0.5 uppercase tracking-widest leading-none">Loan & Savings Products</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            <div className="relative group flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                placeholder="SEARCH SCHEMES..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all transition-all"
              />
            </div>
            {user?.role === 'superadmin' && (
              <button 
                onClick={() => navigate('/schemes/new')} 
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-indigo-500/30 transition-all active:scale-95 shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
              >
                Add New Scheme
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:-mx-10 px-4 sm:px-10">
          <div className="hidden md:block">
            <table className="w-full border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20 rounded-tl-xl">SL No</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Scheme Property</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Repayment</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Rate & Tenure</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Fees (PF/Ins/Late)</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Status</th>
                  <th className="text-right text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20 rounded-tr-xl">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchemes.map((scheme, index) => (
                  <tr key={scheme.id} className="group hover:bg-slate-50 transition-all duration-300">
                    <td className="p-6">
                      <span className="text-xs font-black text-slate-400">
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100">{scheme.scheme_code || `SC-${scheme.id}`}</span>
                          <span className="text-[15px] text-slate-900 font-bold tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{scheme.scheme_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase opacity-70">{scheme.interest_type} BASIS</span>
                          {(scheme.active_loans_count > 0 || scheme.groups_count > 0) && (
                            <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-100 whitespace-nowrap">ENGAGED ({scheme.groups_count} GROUPS)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl self-start w-fit">
                          <Hash className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                            {scheme.repayment_frequency}
                          </span>
                        </div>
                        {scheme.repayment_frequency === 'monthly' && scheme.collection_week && (
                          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-xl self-start w-fit border border-amber-100 text-[9px] font-black uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {scheme.collection_week}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[13px] text-slate-900 font-black">
                          <PieChart className="w-3.5 h-3.5 text-indigo-500" />
                          {scheme.interest_rate}% RATE
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-black uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5" />
                          {scheme.duration_months} EMI
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">PF</div>
                          <div className="text-[12px] font-black text-slate-900">
                            {scheme.processing_fee_type === 'percentage' ? `${scheme.processing_fee}%` : `${scheme.processing_fee}`}
                          </div>
                        </div>
                        <div className="text-center border-x border-slate-100 px-4">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">INS.</div>
                          <div className="text-[12px] font-black text-slate-900">
                            {scheme.insurance_fee_type === 'percentage' ? `${scheme.insurance_fee}%` : `${scheme.insurance_fee}`}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">LATE</div>
                          <div className="text-[12px] font-black text-slate-900">{scheme.penalty_rate}%</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                        scheme.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {scheme.status === 'active' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                        {scheme.status}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        {user?.role === 'superadmin' && (
                          <button
                            onClick={() => navigate(`/schemes/edit/${scheme.id}`)}
                            className="w-10 h-10 flex items-center justify-center bg-white text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-100 rounded-xl transition-all shadow-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSchemes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-20 text-slate-400 text-center text-xs font-black uppercase tracking-widest opacity-50">Zero Schemes Logged</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden space-y-4">
            {filteredSchemes.length === 0 ? (
               <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs bg-slate-50 rounded-xl border border-slate-100">
                  Zero Schemes Logged
               </div>
            ) : (
               filteredSchemes.map((scheme) => (
                 <div key={scheme.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-start">
                       <div>
                          <div className="flex gap-2 items-center mb-1">
                             <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-lg border border-white/20">{scheme.scheme_code || `SC-${scheme.id}`}</span>
                             <h3 className="font-black uppercase tracking-tight text-lg leading-tight">{scheme.scheme_name}</h3>
                          </div>
                          <span className="text-[10px] text-indigo-100 font-bold tracking-widest uppercase">{scheme.interest_type} BASIS</span>
                       </div>
                       <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                          scheme.status === 'active' ? "bg-emerald-500/20 text-emerald-100 border-emerald-500/30" : "bg-rose-500/20 text-rose-100 border-rose-500/30"
                       )}>
                          {scheme.status}
                       </div>
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-2">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Repayment</p>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg w-fit">
                               <Hash className="w-3 h-3 text-indigo-500" />
                               <span className="text-[11px] font-black text-slate-900 uppercase">{scheme.repayment_frequency}</span>
                            </div>
                            {scheme.repayment_frequency === 'monthly' && scheme.collection_week && (
                              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-lg w-fit text-[8px] font-black uppercase tracking-tighter">
                                 <Clock className="w-2.5 h-2.5" /> {scheme.collection_week}
                              </div>
                            )}
                          </div>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rate / Tenure</p>
                          <div className="flex flex-col">
                             <span className="text-xs font-black text-slate-900">{scheme.interest_rate}% RATE</span>
                             <span className="text-[10px] font-bold text-slate-500">{scheme.duration_months} EMI</span>
                          </div>
                       </div>
                    </div>

                    <div className="px-4 pb-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Fees Overview</p>
                       <div className="flex items-center justify-between px-2">
                          <div className="text-center">
                             <span className="text-[9px] text-slate-400 font-black uppercase">PF</span>
                             <div className="text-xs font-black text-slate-900">{scheme.processing_fee_type === 'percentage' ? `${scheme.processing_fee}%` : `${scheme.processing_fee}`}</div>
                          </div>
                          <div className="text-center border-x border-slate-100 px-4">
                             <span className="text-[9px] text-slate-400 font-black uppercase">INS.</span>
                             <div className="text-xs font-black text-slate-900">{scheme.insurance_fee_type === 'percentage' ? `${scheme.insurance_fee}%` : `${scheme.insurance_fee}`}</div>
                          </div>
                          <div className="text-center">
                             <span className="text-[9px] text-slate-400 font-black uppercase">LATE</span>
                             <div className="text-xs font-black text-slate-900">{scheme.penalty_rate}%</div>
                          </div>
                       </div>
                    </div>

                    {user?.role === 'superadmin' && (
                       <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                          <button
                             onClick={() => navigate(`/schemes/edit/${scheme.id}`)}
                             className="flex items-center justify-center gap-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-xl px-4 py-2 transition-all shadow-sm font-bold text-xs uppercase tracking-widest hover:bg-indigo-50"
                          >
                             <Edit2 className="w-3.5 h-3.5" /> Edit Scheme
                          </button>
                       </div>
                    )}
                 </div>
               ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
