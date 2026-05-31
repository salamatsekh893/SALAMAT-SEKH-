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
    fetchWithAuth('/loans?status=active')
      .then((loanData) => {
        const activeUnpaid = loanData.filter((l: any) => {
          const repayable = parseFloat(l.total_repayment) > 0 
            ? parseFloat(l.total_repayment) 
            : (parseFloat(l.installment) * (parseInt(l.duration_weeks) || parseInt(l.no_of_emis) || 0));
          const totalPaid = parseFloat(l.total_paid || 0);
          return (repayable - totalPaid) > 1.0;
        });
        setLoans(activeUnpaid);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are You Sure You Want To Delete This Loan?')) return;
    try {
      await fetchWithAuth(`/loans/${id}`, { method: 'DELETE' });
      voiceFeedback.success();
      loadData();
    } catch (err: any) {
      voiceFeedback.error();
      console.error(err);
    }
  };

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
    <div className="space-y-4 pb-10 w-full animate-in fade-in duration-500">
      {/* Summary Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 px-4 sm:px-6 pt-4">
        <div className="flex gap-2 w-full xl:w-auto">
          <div className="bg-[#3b82f6] text-white px-6 py-2 rounded-md shadow-sm border-b-4 border-blue-700/30 flex flex-col items-center justify-center min-w-[120px]">
             <div className="text-[10px] font-black uppercase tracking-wider opacity-90 mb-0.5">Active Loans</div>
             <div className="text-xl font-black">{loans.length}</div>
          </div>
          <div className="bg-[#8b5cf6] text-white px-6 py-2 rounded-md shadow-sm border-b-4 border-violet-700/30 flex flex-col items-center justify-center min-w-[150px]">
             <div className="text-[10px] font-black uppercase tracking-wider opacity-90 mb-0.5">Principal</div>
             <div className="text-xl font-black">₹{formatAmount(totalPrincipal)}</div>
          </div>
          <div className="bg-[#10b981] text-white px-6 py-2 rounded-md shadow-sm border-b-4 border-emerald-700/30 flex flex-col items-center justify-center min-w-[150px]">
             <div className="text-[10px] font-black uppercase tracking-wider opacity-90 mb-0.5">Receivable</div>
             <div className="text-xl font-black">₹{formatAmount(totalReceivable)}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full xl:w-auto mt-2 xl:mt-0">
          <div className="flex items-center justify-between xl:justify-end gap-4">
            <div className="flex flex-col items-start xl:items-end leading-none">
              <span className="text-slate-800 font-black text-sm uppercase tracking-tight flex items-center gap-2">
                <div className="bg-blue-100 p-1 rounded-full text-blue-600">
                  <Search className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
                Active Accounts
              </span>
              <span className="text-slate-400 text-[10px] font-bold uppercase mt-1 tracking-wider">Total {loans.length} Records</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full xl:w-72">
              <input 
                type="text" 
                placeholder="Search accounts..."
                className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <button 
              onClick={exportToExcel}
              className="bg-[#10b981] text-white px-4 py-2 rounded-lg font-black text-[11px] uppercase flex items-center gap-2 shadow-sm hover:brightness-110 active:scale-95 transition-all"
            >
               <FileText className="w-4 h-4" />
               Excel
            </button>
            {canCreate && (
              <Link to="/loans/new" className="bg-[#3b82f6] text-white px-4 py-2 rounded-lg font-black text-[11px] uppercase flex items-center shadow-sm hover:brightness-110 active:scale-95 transition-all whitespace-nowrap">
                 + New Loan
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="px-0 lg:px-6 overflow-hidden">
        <div className="overflow-x-auto shadow-xl shadow-slate-200/50 rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[#233b7e] text-white">
                <th className="text-left text-[11px] font-black uppercase p-3 tracking-wider pl-6">Loan ID</th>
                <th className="text-left text-[11px] font-black uppercase p-3 tracking-wider">Member Info</th>
                <th className="text-left text-[11px] font-black uppercase p-3 tracking-wider">Group</th>
                <th className="text-right text-[11px] font-black uppercase p-3 tracking-wider">Principal</th>
                <th className="text-right text-[11px] font-black uppercase p-3 tracking-wider">Payable / O/S</th>
                <th className="text-center text-[11px] font-black uppercase p-3 tracking-wider">First EMI Date</th>
                <th className="text-center text-[11px] font-black uppercase p-3 tracking-wider pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.map((loan, idx) => {
                const payable = Math.round(parseFloat(loan.total_repayment || (parseFloat(loan.amount) + parseFloat(loan.interest || 0))));
                const outstanding = payable; // For now assuming full outstanding if nothing paid yet

                return (
                  <tr key={loan.id} className="hover:bg-slate-50 transition-all duration-200">
                    <td className="p-3 pl-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-blue-600 tracking-tight uppercase leading-none mb-1">{loan.loan_no || `L-${String(loan.id).padStart(4, '0')}`}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{loan.amount / 1000}K EMI {Math.round(payable/loan.duration_weeks)} WEEK {loan.duration_weeks}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-0.5 rounded-full border-2 border-slate-100 shadow-sm">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                            {loan.profile_image ? (
                              <img src={loan.profile_image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-xs uppercase">
                                {loan.member_name?.substring(0, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800 uppercase leading-none mb-1">{loan.member_name}</span>
                          <div className="flex items-center gap-2">
                             <span className="text-[11px] font-black text-blue-600 leading-none">{loan.member_code}</span>
                             <span className="text-slate-300">|</span>
                             <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 leading-none">
                               <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 004.815 4.815l.773-1.548a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg> 
                               {loan.mobile_no}
                             </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col space-y-1">
                        <div className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase inline-flex items-center gap-1.5 border border-slate-200/50 w-fit">
                          <div className="w-1 h-1 rounded-full bg-slate-400 animate-pulse"></div>
                          {loan.group_name || 'INDIVIDUAL'}
                        </div>
                        <div className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase inline-flex items-center gap-1.5 border border-amber-100 w-fit">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Every Week
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-base font-black text-slate-800">₹{formatAmount(loan.amount)}</span>
                    </td>
                    <td className="p-3 text-right space-y-0.5">
                      <div className="text-base font-black text-emerald-600 leading-none">₹{formatAmount(payable)}</div>
                      <div className="text-xs font-black text-rose-500 leading-none">O/S: ₹{formatAmount(outstanding)}</div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-[11px] font-black border border-pink-100 shadow-sm shadow-pink-100/50">
                        <div className="w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center text-white">
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                        {loan.start_date ? format(new Date(loan.start_date), 'dd MMM, yyyy') : '-'}
                      </div>
                    </td>
                    <td className="p-3 pr-6">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={`/loans/view/${loan.id}`} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100 active:scale-90" title="Application Form">
                          <Printer className="w-3.5 h-3.5" strokeWidth={3} />
                        </Link>
                        <Link to={`/loans/card/${loan.id}`} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100 active:scale-90" title="Passbook">
                          <CreditCard className="w-3.5 h-3.5" strokeWidth={3} />
                        </Link>
                        <Link to={`/loans/agreement/${loan.id}`} className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all shadow-sm border border-orange-100 active:scale-90" title="Agreement">
                          <FileText className="w-3.5 h-3.5" strokeWidth={3} />
                        </Link>
                        {canEdit && (
                          <Link to={`/loans/edit/${loan.id}`} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 active:scale-90" title="Edit Loan">
                            <Edit3 className="w-3.5 h-3.5" strokeWidth={3} />
                          </Link>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDelete(loan.id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-200 active:scale-90"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLoans.length === 0 && (
            <div className="p-20 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-slate-800 font-black uppercase tracking-widest text-sm mb-1">Zero Accounts Found</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Try searching with different credentials</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
