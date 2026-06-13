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

  const formatDateSafe = (dateStr: any) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return format(d, 'dd/MM/yyyy');
    } catch (e) {
      return '-';
    }
  };

  const safeLoans = Array.isArray(closedLoans) ? closedLoans : [];
  const safeGroups = Array.isArray(groups) ? groups : [];

  const totalClosedCount = safeLoans.length;
  const totalRecovered = safeLoans.reduce((acc, loan) => acc + (Number(loan.total_paid) || 0), 0);
  
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

  const currentTableData = safeLoans.filter(loan => {
    if (filterGroup !== 'All Groups' && loan.group_name !== filterGroup) return false;
    if (filterSearch && !loan.member_name?.toLowerCase().includes(filterSearch.toLowerCase()) && !loan.loan_no?.toLowerCase().includes(filterSearch.toLowerCase()) && !loan.member_code?.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    
    const targetDateStr = loan.last_payment_date;
    if (targetDateStr) {
      const loanDate = new Date(targetDateStr);
      if (isNaN(loanDate.getTime())) {
        return !fromDate && !toDate;
      }
      loanDate.setHours(0, 0, 0, 0);
      
      if (fromDate) {
        const from = new Date(fromDate);
        if (isNaN(from.getTime())) return true;
        from.setHours(0, 0, 0, 0);
        if (loanDate < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        if (isNaN(to.getTime())) return true;
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
      {/* Upper Section: Header & Small Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-3 sm:px-0">
        <div className="flex flex-wrap items-center gap-3">
           <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                 <CheckCircle className="w-4 h-4" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Closed Loans</h1>
           </div>

           {/* Compact Total Closed Card */}
           <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
             <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Closed:</span>
             <span className="text-sm font-black text-emerald-800">{totalClosedCount}</span>
           </div>

           {/* Compact Recovered Card */}
           <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
             <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Recovered:</span>
             <span className="text-sm font-black text-blue-800">₹{formatAmount(totalRecovered)}</span>
           </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 bg-[#3b434a] hover:bg-[#2a3035] active:scale-95 transition-all text-white px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide shadow-sm">
            <Download className="w-4 h-4" />
            EXCEL
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm mx-3 sm:mx-0">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div>
             <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Group</label>
             <select 
               value={filterGroup}
               onChange={(e) => setFilterGroup(e.target.value)}
               className="w-full h-[36px] px-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
             >
               <option value="All Groups">All Groups</option>
               {safeGroups.map(g => <option key={g.id} value={g.group_name}>{g.group_name}</option>)}
             </select>
          </div>
          <div>
             <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Search</label>
             <input 
               type="text" 
               placeholder="Search name, code..." 
               value={filterSearch}
               onChange={(e) => setFilterSearch(e.target.value)}
               className="w-full h-[36px] px-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 outline-none focus:border-indigo-500 placeholder:text-slate-400"
             />
          </div>
          <div>
             <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">From Date</label>
             <input 
               type="date" 
               value={fromDate}
               onChange={(e) => setFromDate(e.target.value)}
               className="w-full h-[36px] px-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 outline-none focus:border-indigo-500"
             />
          </div>
          <div>
             <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">To Date</label>
             <input 
               type="date" 
               value={toDate}
               onChange={(e) => setToDate(e.target.value)}
               className="w-full h-[36px] px-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 outline-none focus:border-indigo-500"
             />
          </div>
          <div className="flex items-end">
             <button 
               onClick={handleFind}
               className="w-full h-[36px] bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded font-semibold tracking-wide text-xs transition-all shadow-sm uppercase"
             >
               {isSearching ? '...' : 'FIND'}
             </button>
          </div>
          <div className="flex items-end">
             <button 
               onClick={handleReset}
               className="w-full h-[36px] bg-[#6c757d] hover:bg-slate-600 active:scale-[0.98] text-white rounded font-semibold tracking-wide text-xs transition-all shadow-sm uppercase"
             >
               RESET
             </button>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="w-full px-0 sm:px-0">
        <div className="bg-white rounded-none sm:rounded overflow-hidden shadow-sm border-t border-b sm:border border-slate-200">
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
                        <td className="py-3 px-3 text-slate-600">{formatDateSafe(loan.disbursed_date || loan.created_at)}</td>
                        <td className="py-3 px-3 text-emerald-600 font-bold">{formatDateSafe(loan.last_payment_date)}</td>
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
