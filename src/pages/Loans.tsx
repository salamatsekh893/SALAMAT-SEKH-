import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { Trash2, Edit3, Printer, FileText, CreditCard, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { voiceFeedback } from '../lib/voice';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { usePermissions } from '../hooks/usePermissions';

export default function Loans() {
  const { user } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    setLoading(true);
    fetchWithAuth('/loans')
      .then((loanData) => setLoans(loanData.filter((l: any) => l.status === 'active')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filteredLoans = loans.filter(loan => 
    loan.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.loan_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.member_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.branch_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const data = filteredLoans.map((loan, idx) => ({
      'SL': idx + 1,
      'LOAN ID': loan.loan_no || `L-${loan.id}`,
      'FREQUENCY': loan.emi_frequency || 'WEEKLY',
      'TERM': loan.duration_weeks,
      'MEMBER NAME': loan.member_name,
      'MEMBER CODE': loan.member_code,
      'MOBILE': loan.mobile_no,
      'GROUP': loan.group_name || 'INDIVIDUAL',
      'PRINCIPAL': parseFloat(loan.amount),
      'INTEREST': parseFloat(loan.interest || 0),
      'TOTAL REPAYABLE': parseFloat(loan.total_repayment || (parseFloat(loan.amount) + parseFloat(loan.interest || 0))),
      'LAUNCH DATE': loan.start_date ? format(new Date(loan.start_date), 'dd-MM-yyyy') : '',
      'STATUS': loan.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Active Loans");
    XLSX.writeFile(wb, `Loans_Portfolio_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  const totalPrincipal = loans.reduce((acc, loan) => acc + (parseFloat(loan.amount) || 0), 0);
  const totalReceivable = loans.reduce((acc, loan) => acc + (parseFloat(loan.total_repayment || (parseFloat(loan.amount) + parseFloat(loan.interest || 0))) || 0), 0);

  if (loading) return (
    <div className="p-20 text-center">
      <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Portfolio...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 w-full">
      {/* Summary Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4">
        <div className="grid grid-cols-3 gap-2 w-full xl:w-auto">
          <div className="bg-[#3b82f6] text-white px-1 sm:px-4 py-2 sm:py-3 rounded shadow-md border-b-4 border-blue-700 flex flex-col justify-center items-center">
             <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider opacity-90 text-center mb-1">Active Loans</div>
             <div className="text-sm sm:text-lg lg:text-2xl font-black text-center leading-none">{loans.length}</div>
          </div>
          <div className="bg-[#8b5cf6] text-white px-1 sm:px-4 py-2 sm:py-3 rounded shadow-md border-b-4 border-violet-700 flex flex-col justify-center items-center">
             <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider opacity-90 text-center mb-1">Principal</div>
             <div className="text-sm sm:text-lg lg:text-2xl font-black text-center leading-none flex items-center">₹{formatAmount(totalPrincipal)}</div>
          </div>
          <div className="bg-[#10b981] text-white px-1 sm:px-4 py-2 sm:py-3 rounded shadow-md border-b-4 border-emerald-700 flex flex-col justify-center items-center">
             <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider opacity-90 text-center mb-1">Receivable</div>
             <div className="text-sm sm:text-lg lg:text-2xl font-black text-center leading-none flex items-center">₹{formatAmount(totalReceivable)}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full xl:w-auto mt-1 xl:mt-0 xl:self-end">
          <div className="flex items-center justify-between xl:justify-end gap-3 mb-0.5">
            <div className="flex flex-col items-start xl:items-end leading-none">
              <span className="text-[#3b82f6] font-black text-[12px] uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                Active Accounts
              </span>
              <span className="text-slate-400 text-[9px] font-black uppercase mt-1">Total {loans.length} Records Found</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full xl:w-80">
              <input 
                type="text" 
                placeholder="Search accounts..."
                className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-300 rounded text-xs outline-none font-bold text-slate-700 h-[38px] placeholder:text-slate-400 focus:border-blue-500 transition-colors shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <button 
              onClick={exportToExcel}
              className="bg-[#10b981] text-white px-4 h-[38px] rounded font-bold text-[11px] uppercase flex items-center gap-2 shadow-md border-b-2 border-emerald-700 hover:bg-emerald-600 transition-colors"
            >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               Excel
            </button>
            {canCreate && (
              <Link to="/loans/new" className="bg-[#3b82f6] text-white px-5 h-[38px] rounded font-bold text-[11px] uppercase flex items-center shadow-md border-b-2 border-blue-700 hover:bg-blue-600 transition-colors">
                 + Originate
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="px-0 lg:px-4 overflow-hidden">
        <div className="overflow-x-auto border-y lg:border border-[#233b7e]/30 bg-white">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gradient-to-r from-orange-400 to-pink-500 text-white divide-x divide-white/20">
                <th className="text-center text-[10px] font-black uppercase tracking-wider p-2.5 w-[50px]">SL NO</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2.5 w-[130px]">LOAN ID</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2.5">MEMBER INFO</th>
                <th className="text-left text-[10px] font-black uppercase tracking-wider p-2.5 w-[180px]">GROUP</th>
                <th className="text-right text-[10px] font-black uppercase tracking-wider p-2.5 w-[130px]">PRINCIPAL</th>
                <th className="text-right text-[10px] font-black uppercase tracking-wider p-2.5 w-[130px]">PAYABLE</th>
                <th className="text-right text-[10px] font-black uppercase tracking-wider p-2.5 w-[130px]">O/S</th>
                <th className="text-center text-[10px] font-black uppercase tracking-wider p-2.5 w-[90px]">STATUS</th>
                <th className="text-center text-[10px] font-black uppercase tracking-wider p-2.5 w-[160px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.map((loan, idx) => {
                const payable = Math.round(parseFloat(loan.total_repayment || (parseFloat(loan.amount) + parseFloat(loan.interest || 0))));

                return (
                  <tr key={loan.id} className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-100 group">
                    <td className="p-2.5 text-center">
                      <span className="text-[12px] font-black text-slate-500">{idx + 1}</span>
                    </td>
                    <td className="p-2.5">
                      <div className="flex flex-col leading-tight">
                        <span className="text-[12px] font-black text-blue-700 uppercase group-hover:underline cursor-pointer">{loan.loan_no || `L-${loan.id}`}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">{loan.emi_frequency || 'WEEKLY'} - {loan.duration_weeks}</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                          {loan.profile_image ? (
                            <img src={loan.profile_image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400 font-bold text-[10px]">
                              {loan.member_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[12px] text-slate-800 font-black uppercase leading-none">{loan.member_name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 opacity-80">
                            <span className="text-[9px] font-bold text-blue-600 font-mono tracking-tighter">{loan.member_code}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 004.815 4.815l.773-1.548a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg> 
                              {loan.mobile_no}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="flex flex-col leading-tight">
                         <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                           <svg className="w-2.5 h-2.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg> 
                           {loan.group_name || 'INDIVIDUAL'}
                         </span>
                         <div className="flex items-center gap-1 mt-1">
                            {loan.emi_frequency === 'monthly' ? (
                              <span className="bg-amber-50 text-amber-700 px-1 py-0.5 rounded-[3px] text-[8px] font-black uppercase flex items-center gap-1 border border-amber-100">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> 
                                {loan.collection_week || 'Every Month'}
                              </span>
                            ) : (
                              <span className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded-[3px] text-[8px] font-black uppercase flex items-center gap-1 border border-blue-100 opacity-60">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
                                {loan.emi_frequency || 'Weekly'}
                              </span>
                            )}
                         </div>
                      </div>
                    </td>
                    <td className="p-2.5 text-right">
                      <span className="text-[13px] text-slate-800 font-black">₹{formatAmount(loan.amount)}</span>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-[13px] font-black text-emerald-600">₹{formatAmount(payable)}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">{loan.start_date ? format(new Date(loan.start_date), 'dd MMM, yy') : '-'}</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-right">
                      <span className="text-[13px] font-black text-rose-600">₹{formatAmount(payable)}</span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="inline-flex px-1.5 py-0.5 rounded-[3px] text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                        {loan.status}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/loans/view/${loan.id}`} className="p-1 px-1.5 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded transition-colors" title="Form">
                          <Printer className="w-3.5 h-3.5" />
                        </Link>
                        <Link to={`/loans/card/${loan.id}`} className="p-1 px-1.5 text-emerald-700 hover:bg-emerald-700 hover:text-white border border-emerald-200 rounded transition-colors" title="Passbook">
                          <CreditCard className="w-3.5 h-3.5" />
                        </Link>
                        <Link to={`/loans/agreement/${loan.id}`} className="p-1 px-1.5 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded transition-colors" title="Agreement">
                          <FileText className="w-3.5 h-3.5" />
                        </Link>
                        {canEdit && (
                          <button className="p-1 px-1.5 text-amber-600 hover:bg-amber-600 hover:text-white border border-amber-200 rounded transition-colors" title="Edit">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLoans.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-20 text-slate-400 text-center text-[10px] font-black uppercase tracking-[0.2em] opacity-50 bg-slate-50 border-t border-slate-200">Zero Accounts Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
