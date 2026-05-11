import React, { useState, useEffect } from 'react';
import { Filter, Printer, FileSpreadsheet } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';

export default function DemandSheet() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    branch_id: '',
    group_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [branchesData, loansData, groupsData] = await Promise.all([
        fetchWithAuth('/branches'),
        fetchWithAuth('/loans?status=active'),
        fetchWithAuth('/groups')
      ]);
      
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      // Only keep active loans for demand or loans where balance > 0
      setLoans(Array.isArray(loansData) ? loansData.filter((l: any) => {
        const balance = Number(l.total_repayment || 0) - Number(l.total_paid || 0);
        return l.status === 'active' && balance > 0;
      }) : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredLoans = loans.filter(loan => {
    if (filters.branch_id && String(loan.branch_id) !== String(filters.branch_id)) return false;
    if (filters.group_id && String(loan.group_id) !== String(filters.group_id)) return false;
    
    // Filter by date
    const selectedDate = new Date(filters.date);
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (loan.emi_frequency === 'daily') {
      if (dayOfWeek === 'Sunday') return false; // Assuming no collection on Sunday
    } else if (loan.emi_frequency === 'weekly' || !loan.emi_frequency) {
      // Default to weekly logic if frequency not specified
      if (loan.meeting_day && loan.meeting_day !== dayOfWeek) return false;
    } else if (loan.emi_frequency === 'monthly') {
      if (loan.start_date) {
        const startDate = new Date(loan.start_date);
        if (startDate.getDate() !== selectedDate.getDate()) return false;
      }
    }

    return true;
  });

  // Sort by member name or group
  filteredLoans.sort((a, b) => (a.member_name || '').localeCompare(b.member_name || ''));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 print:hidden p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Demand Sheet
            </h1>
            <p className="text-slate-500 text-xs mt-1">Generate collection demand</p>
          </div>
          
          <div className="flex flex-row items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 shrink-0 scrollbar-hide">
            <div className="flex items-center gap-1 text-slate-600 font-semibold text-sm shrink-0">
              <Filter className="w-4 h-4 text-indigo-500" />
            </div>
            
            <input
               type="date"
               value={filters.date}
               onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))}
               className="bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shrink-0"
            />
            
            <select
              value={filters.branch_id}
              onChange={(e) => setFilters(f => ({ ...f, branch_id: e.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shrink-0 min-w-[120px]"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>
            
            <select
              value={filters.group_id}
              onChange={(e) => setFilters(f => ({ ...f, group_id: e.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shrink-0 min-w-[120px]"
            >
              <option value="">All Groups</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.group_name}</option>
              ))}
            </select>
            
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shrink-0"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading demand data...</div>
      ) : filteredLoans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center print:hidden">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No collections found</h3>
          <p className="text-slate-500">Adjust filters to see demand details.</p>
        </div>
      ) : (
        <div className="bg-white border text-black border-slate-300 rounded-lg p-6 print:border-none print:p-0 print:shadow-none shadow-sm">
          {/* Print Header */}
          <div className="text-center mb-4 hidden print:block">
            <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">ALJOOYA SUBIDHA SERVICES</h1>
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-700">Demand Sheet</h2>
            
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm font-semibold border-b-2 border-black pb-2 text-left">
              <div>
                <p>Date: {new Date(filters.date).toLocaleDateString('en-IN')}</p>
                <p>Branch: {filters.branch_id ? branches.find((b:any) => String(b.id) === String(filters.branch_id))?.branch_name : 'All Branches'}</p>
              </div>
              <div className="text-right">
                <p>Group: {filters.group_id ? groups.find((g:any) => String(g.id) === String(filters.group_id))?.group_name : 'All Groups'}</p>
                {filters.group_id && (
                  <p>Day: {groups.find((g:any) => String(g.id) === String(filters.group_id))?.meeting_day || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse border border-slate-300 print:text-[10px]">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200 text-slate-800 border-b border-slate-300">
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold w-12 text-center">Sl. No.</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold whitespace-nowrap">Member ID</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold whitespace-nowrap">Member Name</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold whitespace-nowrap">Group</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold whitespace-nowrap">Group Day</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold whitespace-nowrap">Disbursement</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold whitespace-nowrap">First EMI</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold text-center">EMIs</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold text-right">Balance</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold text-right">Demand (EMI)</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold text-right print:w-16">Arrear</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold text-right print:w-16">Collected</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-300 font-bold text-center print:w-16">Signature</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan, idx) => (
                  <tr key={loan.id} className="border-b border-slate-300 group hover:bg-slate-50 print:hover:bg-transparent">
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-center font-medium text-slate-500">{idx + 1}</td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-slate-800 font-medium">{loan.member_code || loan.customer_id}</td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300">
                      <div className="font-bold text-slate-900">{loan.member_name || 'Unknown'}</div>
                      <div className="text-[10px] print:text-[8px] text-slate-500 uppercase">{loan.loan_no}</div>
                    </td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-slate-600">{loan.group_name || '-'}</td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-slate-600">{loan.meeting_day || '-'}</td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-slate-600 whitespace-nowrap">{formatDate(loan.created_at)}</td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-slate-600 whitespace-nowrap">{formatDate(loan.start_date)}</td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-center text-[11px] font-medium print:whitespace-nowrap">
                      {loan.paid_emi_count || 0}/{loan.duration_weeks || 0}
                      {((loan.paid_emi_count || 0) >= (loan.duration_weeks || 0)) && (
                        <div className="text-[9px] print:text-[8px] text-red-600 font-bold mt-0.5 whitespace-nowrap">TENURE OVER</div>
                      )}
                    </td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-right font-medium text-slate-700">₹{formatAmount(Number(loan.total_repayment || 0) - Number(loan.total_paid || 0))}</td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-right font-bold text-slate-900">₹{formatAmount(Number(loan.installment))}</td>
                    {/* Empty columns for printing */}
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 bg-red-50/20 print:bg-transparent"></td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 bg-green-50/20 print:bg-transparent"></td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 bg-slate-50/50 print:bg-transparent"></td>
                  </tr>
                ))}
                {filteredLoans.length > 0 && (
                  <tr className="bg-slate-100 print:bg-slate-200 font-bold text-slate-900">
                    <td colSpan={8} className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-right">TOTAL</td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-right">
                      ₹{formatAmount(filteredLoans.reduce((sum, l) => sum + (Number(l.total_repayment || 0) - Number(l.total_paid || 0)), 0))}
                    </td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300 text-right text-indigo-700">
                      ₹{formatAmount(filteredLoans.reduce((sum, l) => sum + Number(l.installment || 0), 0))}
                    </td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300"></td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300"></td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-300"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="hidden print:flex justify-between items-end mt-24 px-12 pb-8">
            <div className="text-center font-bold text-sm border-t-2 border-black w-48 pt-2">
              Collection Officer
            </div>
            <div className="text-center font-bold text-sm border-t-2 border-black w-48 pt-2">
              Branch Manager
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
