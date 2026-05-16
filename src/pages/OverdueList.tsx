import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { format } from 'date-fns';
import { Search, Filter, Download, RefreshCw, User, Phone, MapPin, ChevronRight, Calculator, AlertTriangle, FileText } from 'lucide-react';
import { formatAmount } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function OverdueList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [groups, setGroups] = useState<any[]>([]);

  const fetchOverdue = () => {
    setLoading(true);
    setError(null);
    fetchWithAuth('/reports/overdue')
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || 'Failed to fetch data');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOverdue();
    fetchWithAuth('/groups').then(setGroups).catch(console.error);
  }, []);

  const filteredLoans = data?.loans.filter((l: any) => 
    (l.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     l.loan_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     l.member_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterGroup === '' || l.group_id === Number(filterGroup))
  ) || [];

  const handleCollect = (loan: any) => {
    navigate('/collections', { 
      state: { 
        groupId: loan.group_id?.toString(),
        loanId: loan.id?.toString(),
        amount: Math.round(loan.overdue_amount || loan.emi_amount)
      } 
    });
  };

  const getBucketColor = (dpd: number) => {
    if (dpd <= 30) return 'bg-sky-400 text-white';
    if (dpd <= 60) return 'bg-yellow-400 text-black';
    if (dpd <= 90) return 'bg-orange-400 text-white';
    return 'bg-red-500 text-white';
  };

  const getBucketLabel = (dpd: number) => {
    if (dpd <= 30) return '0-30 Days';
    if (dpd <= 60) return '30-60 Days';
    if (dpd <= 90) return '60-90 Days';
    return 'NPA (90+)';
  };

  if (loading && !data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600 p-4 rounded-xl text-white shadow-lg overflow-hidden relative"
        >
          <div className="absolute right-[-10px] top-[-10px] opacity-10">
            <Calculator size={80} />
          </div>
          <p className="text-sm font-medium uppercase opacity-80">Total Overdue</p>
          <h2 className="text-3xl font-bold mt-1">₹{formatAmount(data?.summary.total_overdue || 0)}</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-indigo-600 p-4 rounded-xl text-white shadow-lg overflow-hidden relative"
        >
          <div className="absolute right-[-10px] top-[-10px] opacity-10">
            <AlertTriangle size={80} />
          </div>
          <p className="text-sm font-medium uppercase opacity-80">Risk (O/S)</p>
          <h2 className="text-3xl font-bold mt-1">₹{formatAmount(data?.summary.total_risk || 0)}</h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-orange-500 p-4 rounded-xl text-white shadow-lg overflow-hidden relative"
        >
          <div className="absolute right-[-10px] top-[-10px] opacity-10">
            <User size={80} />
          </div>
          <p className="text-sm font-medium uppercase opacity-80">NPA (90+)</p>
          <h2 className="text-3xl font-bold mt-1">{data?.summary.npa_count || 0} <span className="text-lg opacity-80 font-normal">Mbrs</span></h2>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <select 
            className="w-full bg-slate-50 border-none rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500/20"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
          >
            <option value="">All Groups</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.group_name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex-[2] min-w-[250px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Name/Code / Loan No..."
            className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="p-2.5 bg-sky-500 text-white rounded-xl shadow-sm hover:bg-sky-600 transition-colors">
          <Filter className="w-5 h-5" />
        </button>
        
        <button 
          onClick={fetchOverdue}
          className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:bg-emerald-700">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Excel</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <AlertTriangle size={20} className="flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Error Loading Report</p>
            <p className="text-xs opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* List Container */}
      <div className="space-y-4">
        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider">SL</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Member Details</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Group Name</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Loan ID & Term</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider">First EMI</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Total Paid</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Overdue</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider">EMI Stats</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-center">Bucket (DPD)</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.map((loan: any, idx: number) => (
                <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 text-xs text-slate-400 font-medium">{idx + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                        {loan.profile_image ? (
                          <img src={loan.profile_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-500">
                            <User size={20} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{loan.member_name}</div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-sky-600">{loan.member_code}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {loan.mobile_no}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 max-w-max">
                      <MapPin className="w-3 h-3" />
                      <span className="text-[10px] font-bold whitespace-nowrap uppercase italic tracking-tighter">
                        {loan.group_name}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-semibold text-slate-700">{loan.loan_no}</div>
                    <div className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded inline-block uppercase mt-1">
                      {loan.emi_frequency}
                    </div>
                  </td>
                  <td className="p-4 text-xs font-medium text-slate-600">
                    {format(new Date(loan.start_date), 'dd-MMM-yyyy')}
                  </td>
                  <td className="p-4 text-xs font-bold text-emerald-600">
                    ₹{formatAmount(loan.total_paid)}
                  </td>
                  <td className="p-4 text-xs font-black text-rose-600">
                    ₹{formatAmount(loan.overdue_amount)}
                  </td>
                  <td className="p-4">
                    <div className="text-[10px] space-y-0.5">
                      <div className="flex justify-between gap-4">
                        <span className="text-emerald-600 font-bold">Paid: {loan.paid_emi_count}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-rose-600 font-bold">Miss: {loan.missed_emis}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm ${getBucketColor(loan.dpd)}`}>
                      {getBucketLabel(loan.dpd)}
                    </span>
                    <div className="text-[8px] text-slate-400 mt-1">{loan.dpd} Days DPD</div>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleCollect(loan)}
                      className="px-3 py-1.5 bg-white border border-rose-300 text-rose-600 text-[10px] font-bold rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                    >
                      Collect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Staggered Cards) */}
        <div className="lg:hidden space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredLoans.map((loan: any) => (
              <motion.div
                key={loan.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Horizontal accents */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${getBucketColor(loan.dpd)}`}></div>

                {/* Top Info Row */}
                <div className="flex justify-between items-start pt-2">
                  <div className="flex gap-2">
                     <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
                       {loan.loan_no}
                     </span>
                     <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-100 italic">
                       {loan.group_name}
                     </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${getBucketColor(loan.dpd)}`}>
                    {getBucketLabel(loan.dpd)}
                  </span>
                </div>

                {/* Member Profile Row */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                    {loan.profile_image ? (
                      <img src={loan.profile_image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-500">
                         <User size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-800">{loan.member_name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-600">{loan.member_code}</span>
                      <span className="text-xs text-slate-400">|</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Phone size={12} className="text-slate-300" />
                        {loan.mobile_no}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount Details Box */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 grid grid-cols-3 gap-2">
                  <div className="text-center border-r border-slate-200 last:border-0 pr-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Paid</p>
                    <p className="text-sm font-bold text-emerald-600 italic">₹{formatAmount(loan.total_paid)}</p>
                  </div>
                  <div className="text-center border-r border-slate-200 last:border-0 pr-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Missed EMI</p>
                    <p className="text-sm font-bold text-slate-700">{loan.missed_emis}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-rose-400 font-bold uppercase mb-1">Overdue</p>
                    <p className="text-sm font-extrabold text-rose-600 italic">₹{formatAmount(loan.overdue_amount)}</p>
                  </div>
                </div>

                {/* Collection Button */}
                <button 
                  onClick={() => handleCollect(loan)}
                  className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-600/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 group italic"
                >
                  Go to Collect
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredLoans.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No overdue accounts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
