import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { Search, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

export default function ClosedLoans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [closedLoans, setClosedLoans] = useState<any[]>([]);

  // Table Filters state
  const [filterGroup, setFilterGroup] = useState('All Groups');
  const [filterSearch, setFilterSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  
  // Loading state
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLoans();
    fetchGroups();
  }, []);

  const fetchLoans = () => {
    setLoading(true);
    fetchWithAuth('/loans?status=closed')
      .then((loanData) => {
        setClosedLoans(loanData);
      })
      .finally(() => setLoading(false));
  };
  
  const fetchGroups = async () => {
    try {
      const data = await fetchWithAuth('/groups');
      setGroups(data);
    } catch (error) {
      console.error(error);
    }
  };

  const totalClosedCount = closedLoans.length;
  const totalRecovered = closedLoans.reduce((acc, loan) => acc + (Number(loan.total_paid) || 0), 0);
  
  const handleReopen = async (loanId: number) => {
    if (!confirm('আপনি কি নিশ্চিত যে আপনি এই লোনটি পুনরায় চালু (Reopen) করতে চান? এটি লোন স্ট্যাটাস একটিভ করবে এবং ভুল করে করা প্রাক-ক্লোজার ডাটা ডিলিট করবে।')) return;
    try {
      setLoading(true);
      await fetchWithAuth(`/loans/${loanId}/reopen`, { method: 'POST' });
      fetchLoans();
      alert('সফলভাবে লোনটি পুনরায় চালু করা হয়েছে।');
    } catch (err: any) {
      alert('লোন পুনরায় চালু করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFind = () => {
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 500); 
  };

  const handleReset = () => {
    setFilterGroup('All Groups');
    setFilterSearch('');
    setFromDate('');
    setToDate('');
  };

  const currentTableData = closedLoans.filter(loan => {
    if (filterGroup !== 'All Groups' && loan.group_name !== filterGroup) return false;
    if (filterSearch && !loan.member_name?.toLowerCase().includes(filterSearch.toLowerCase()) && !loan.loan_no?.toLowerCase().includes(filterSearch.toLowerCase()) && !loan.member_code?.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    
    const targetDateStr = loan.disbursed_date || loan.created_at;
    if (targetDateStr) {
      const loanDate = new Date(targetDateStr);
      loanDate.setHours(0, 0, 0, 0);
      
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (loanDate < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(0, 0, 0, 0);
        if (loanDate > to) return false;
      }
    } else {
      if (fromDate || toDate) return false;
    }
    
    return true;
  });

  return (
    <div className="max-w-[1400px] mx-auto pb-10 xl:px-4 space-y-4 pt-2">
      {/* Header Row */}
      <div className="flex flex-row items-center justify-between gap-4 px-2 sm:px-0">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
               <CheckCircle className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-normal text-slate-800 tracking-tight">Closed Loans</h1>
         </div>
         
         <div className="flex items-center gap-2">
           <button className="flex items-center gap-1.5 bg-[#3b434a] hover:bg-[#2a3035] active:scale-95 transition-all text-white px-3 sm:px-4 py-2 rounded text-[10px] sm:text-[13px] font-medium uppercase tracking-wide shadow-sm">
             <Download className="w-4 h-4" />
             EXCEL
           </button>
         </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 gap-3 px-2 sm:px-0">
         <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="bg-gradient-to-br from-emerald-500 to-teal-600 text-left border-l-[6px] border-emerald-700/50 rounded-lg p-3 sm:p-5 shadow-md flex flex-col justify-center min-h-[90px] relative overflow-hidden group hover:-translate-y-1 transition-transform"
         >
            <motion.div
              animate={{ x: ["-200%", "300%"] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 1 }}
              className="absolute inset-0 z-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
            />
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
               <CheckCircle className="w-16 h-16 text-white" />
            </div>
            <h3 className="text-[11px] sm:text-xs font-bold text-emerald-100 uppercase mb-1 z-10 relative">Total Closed</h3>
            <div className="text-2xl sm:text-3xl font-black text-white z-10 relative drop-shadow-sm">{totalClosedCount}</div>
         </motion.div>
         
         <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-gradient-to-br from-blue-500 to-indigo-600 text-left border-l-[6px] border-blue-700/50 rounded-lg p-3 sm:p-5 shadow-md flex flex-col justify-center min-h-[90px] relative overflow-hidden group hover:-translate-y-1 transition-transform"
         >
            <motion.div
              animate={{ x: ["-200%", "300%"] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 1.5 }}
              className="absolute inset-0 z-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
            />
            <h3 className="text-[11px] sm:text-xs font-bold text-blue-100 uppercase mb-1 z-10 relative">Recovered Amount</h3>
            <div className="text-2xl sm:text-3xl font-black text-white z-10 relative drop-shadow-sm">₹{formatAmount(totalRecovered)}</div>
         </motion.div>
      </div>

      {/* Filters Row */}
      <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="col-span-1">
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Group</label>
             <select 
               value={filterGroup}
               onChange={(e) => setFilterGroup(e.target.value)}
               className="w-full h-[42px] px-3 bg-white border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-indigo-500"
             >
               <option value="All Groups">All Groups</option>
               {groups.map(g => <option key={g.id} value={g.group_name}>{g.group_name}</option>)}
             </select>
          </div>
          <div className="col-span-1">
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Search</label>
             <input 
               type="text" 
               placeholder="Search..." 
               value={filterSearch}
               onChange={(e) => setFilterSearch(e.target.value)}
               className="w-full h-[42px] px-3 bg-white border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-indigo-500 placeholder:text-slate-400"
             />
          </div>
          <div className="col-span-1">
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">From Date</label>
             <input 
               type="date" 
               value={fromDate}
               onChange={(e) => setFromDate(e.target.value)}
               className="w-full h-[42px] px-3 bg-white border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-indigo-500"
             />
          </div>
          <div className="col-span-1">
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">To Date</label>
             <input 
               type="date" 
               value={toDate}
               onChange={(e) => setToDate(e.target.value)}
               className="w-full h-[42px] px-3 bg-white border border-slate-200 rounded text-[13px] text-slate-700 outline-none focus:border-indigo-500"
             />
          </div>
          <div className="col-span-1 sm:col-span-1 flex items-end">
             <button 
               onClick={handleFind}
               className="w-full h-[42px] bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded font-medium tracking-wide text-[13px] transition-all shadow-sm uppercase"
             >
               {isSearching ? 'SEARCHING...' : 'FIND'}
             </button>
          </div>
          <div className="col-span-1 sm:col-span-1 flex items-end">
             <button 
               onClick={handleReset}
               className="w-full h-[42px] bg-[#6c757d] hover:bg-slate-600 active:scale-[0.98] text-white rounded font-medium tracking-wide text-[13px] transition-all shadow-sm uppercase"
             >
               RESET
             </button>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="w-full px-2 sm:px-0">
        <div className="bg-white rounded overflow-hidden shadow-sm border border-slate-200">
          {loading ? (
            <div className="text-center py-10 sm:py-16 text-slate-400">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-slate-100 border-t-slate-400 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="font-bold tracking-tight text-xs sm:text-sm">Loading history...</p>
            </div>
          ) : currentTableData.length === 0 ? (
            <div className="text-center py-10 sm:py-16">
              <p className="text-slate-500 font-bold tracking-tight text-sm">No closed accounts found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <div className="min-w-[1200px] w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-600 text-white shadow-sm">
                      <th className="py-3 px-3 text-[12px] font-bold w-12 border-r border-white/10 uppercase tracking-wider">SL</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider">Member Name</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider">Member Code</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider">Mobile No.</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider">Loan Date</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider whitespace-nowrap">Close Date</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider whitespace-nowrap">Group Name</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider whitespace-nowrap">Branch Name</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider whitespace-nowrap">Staff Name</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider whitespace-nowrap">Closed By</th>
                      <th className="py-3 px-3 text-[12px] font-bold border-r border-white/10 uppercase tracking-wider whitespace-nowrap">Approved By</th>
                      <th className="py-3 px-3 text-[12px] font-bold text-center uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {currentTableData.map((loan, idx) => (
                      <tr 
                        key={loan.id} 
                        className={`hover:bg-slate-50 transition-colors text-[13px] ${idx % 2 !== 0 ? 'bg-slate-50/50' : ''}`}
                      >
                        <td className="py-3 px-3 text-slate-700">{idx + 1}</td>
                        <td className="py-3 px-3 text-slate-800 font-medium uppercase">{loan.member_name}</td>
                        <td className="py-3 px-3 text-indigo-600 font-medium">{loan.member_code || '-'}</td>
                        <td className="py-3 px-3 text-slate-600">{loan.member_mobile || '-'}</td>
                        <td className="py-3 px-3 text-slate-600">{loan.disbursed_date ? format(new Date(loan.disbursed_date), 'dd/MM/yyyy') : (loan.created_at ? format(new Date(loan.created_at), 'dd/MM/yyyy') : '-')}</td>
                        <td className="py-3 px-3 text-emerald-600 font-bold">{loan.last_payment_date ? format(new Date(loan.last_payment_date), 'dd/MM/yyyy') : '-'}</td>
                        <td className="py-3 px-3 text-slate-700">{loan.group_name || '-'}</td>
                        <td className="py-3 px-3 text-slate-700">{loan.branch_name || '-'}</td>
                        <td className="py-3 px-3 text-slate-700">{loan.staff_name || '-'}</td>
                        <td className="py-3 px-3 text-slate-700">{loan.closed_by_name || '-'}</td>
                        <td className="py-3 px-3 text-slate-700">
                          {loan.approver_name ? (
                            <span className="font-medium text-slate-800">{loan.approver_name}</span>
                          ) : (
                            <span className="text-slate-400 italic">Auto/System</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => navigate(`/loans/noc/${loan.id}`)}
                              className="bg-slate-800 hover:bg-black text-white px-3 py-1 rounded text-[11px] font-medium uppercase transition-all shadow-sm whitespace-nowrap"
                            >
                              NOC
                            </button>
                            {['superadmin', 'admin', 'branch_manager', 'manager'].includes(user?.role || '') && 
                             (loan.closing_type === 'pre_close' || loan.closing_type === 'lump_sum') && (
                              <button 
                                onClick={() => handleReopen(loan.id)}
                                className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded text-[11px] font-medium uppercase transition-all shadow-sm whitespace-nowrap"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
