import React, { useState, useEffect } from 'react';
import { Filter, Printer, FileSpreadsheet, Download } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import * as XLSX from 'xlsx';

export default function DemandSheet() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    branch_id: '',
    group_id: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
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
        const repayable = parseFloat(l.total_repayment) > 0 
          ? parseFloat(l.total_repayment) 
          : (parseFloat(l.installment) * (parseInt(l.duration_weeks) || parseInt(l.no_of_emis) || 0));
        const balance = repayable - parseFloat(l.total_paid || 0);
        return l.status === 'active' && balance > 1.0;
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

  const getDemandCyclesInPeriod = (loan: any, startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    
    if (start > end) return [];

    const matches: string[] = [];
    const current = new Date(start);
    
    // Safety guard to avoid locking up browser thread
    let safetyCounter = 0;
    while (current <= end && safetyCounter < 366) {
      safetyCounter++;
      const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'long' });
      let isMatch = false;
      
      if (loan.emi_frequency === 'daily') {
        if (dayOfWeek !== 'Sunday') isMatch = true; 
      } else if (loan.emi_frequency === 'weekly' || !loan.emi_frequency) {
        if (loan.meeting_day && loan.meeting_day === dayOfWeek) isMatch = true;
      } else if (loan.emi_frequency === 'monthly') {
        if (loan.start_date) {
          const lStartDate = new Date(loan.start_date);
          if (lStartDate.getDate() === current.getDate()) isMatch = true;
        }
      }

      if (isMatch) {
        matches.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return matches;
  };

  const processedLoans = loans.map(loan => {
    const matchingDates = getDemandCyclesInPeriod(loan, filters.startDate, filters.endDate);
    const matchCount = matchingDates.length;
    const individualInstallment = Number(loan.installment || 0);
    const totalDemand = individualInstallment * matchCount;
    
    return {
      ...loan,
      matchCount,
      matchingDates,
      calculatedDemand: totalDemand,
    };
  });

  const filteredLoans = processedLoans.filter(loan => {
    if (filters.branch_id && String(loan.branch_id) !== String(filters.branch_id)) return false;
    if (filters.group_id && String(loan.group_id) !== String(filters.group_id)) return false;
    return loan.matchCount > 0;
  });

  const exportToExcel = () => {
    const exportData = filteredLoans.map((loan, idx) => {
      const balance = Number(loan.total_repayment || 0) - Number(loan.total_paid || 0);
      return {
        'Sl. No.': idx + 1,
        'Member ID': loan.member_code || loan.customer_id || '-',
        'Member Name': loan.member_name || 'Unknown',
        'Loan Account No.': loan.loan_no || '-',
        'Mobile No.': loan.member_mobile || loan.mobile_no || 'N/A',
        'Nominee Name': loan.nominee_name || '-',
        'Group': loan.group_name || '-',
        'Group Day': loan.meeting_day || '-',
        'Disbursement Date': formatDate(loan.created_at),
        'First EMI Date': formatDate(loan.start_date),
        'EMIs (Paid/Total)': `${loan.paid_emi_count || 0}/${loan.duration_weeks || 0}`,
        'Balance (INR)': Math.round(balance * 100) / 100,
        'Demand (INR)': Math.round(Number(loan.calculatedDemand || 0) * 100) / 100,
        'Arrear (INR)': '',
        'Collected (INR)': '',
        'Signature': ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demand_Sheet");

    // Set column widths so columns don't overlap in Excel
    const wscols = [
      {wch: 8},  // Sl. No.
      {wch: 15}, // Member ID
      {wch: 25}, // Member Name
      {wch: 18}, // Loan Account No.
      {wch: 14}, // Mobile No.
      {wch: 20}, // Nominee Name
      {wch: 15}, // Group
      {wch: 12}, // Group Day
      {wch: 18}, // Disbursement Date
      {wch: 15}, // First EMI Date
      {wch: 18}, // EMIs (Paid/Total)
      {wch: 15}, // Balance (INR)
      {wch: 15}, // Demand (INR)
      {wch: 12}, // Arrear (INR)
      {wch: 15}, // Collected (INR)
      {wch: 14}  // Signature
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Demand_Sheet_${filters.startDate}_to_${filters.endDate}.xlsx`);
  };

  // Sort by meeting time, then group name, then member name
  filteredLoans.sort((a, b) => {
    const timeA = a.meeting_time || '23:59:59';
    const timeB = b.meeting_time || '23:59:59';
    const timeCompare = timeA.localeCompare(timeB);
    if (timeCompare !== 0) return timeCompare;

    const groupCompare = (a.group_name || '').localeCompare(b.group_name || '');
    if (groupCompare !== 0) return groupCompare;
    
    return (a.member_name || '').localeCompare(b.member_name || '');
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <style>{`
          @media print {
            @page { size: landscape; margin: 8mm; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 mb-6 print:hidden p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Demand Sheet
            </h1>
            <p className="text-slate-500 text-xs mt-1">Generate collection demand</p>
          </div>
          
          <div className="flex flex-row items-center gap-3 w-full lg:w-auto overflow-x-auto pb-1 shrink-0 scrollbar-hide">
            <div className="flex items-center gap-1 text-slate-700 font-bold text-sm shrink-0">
              <Filter className="w-4 h-4 text-slate-500" />
              <span>Filters:</span>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">From</span>
              <input
                 type="date"
                 value={filters.startDate}
                 onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                 className="bg-white border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-bold shadow-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">To</span>
              <input
                 type="date"
                 value={filters.endDate}
                 onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                 className="bg-white border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-bold shadow-sm"
              />
            </div>
            
            <select
              value={filters.branch_id}
              onChange={(e) => setFilters(f => ({ ...f, branch_id: e.target.value }))}
              className="bg-white border border-slate-300 text-slate-900 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shrink-0 min-w-[120px] font-semibold"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>
            
            <select
              value={filters.group_id}
              onChange={(e) => setFilters(f => ({ ...f, group_id: e.target.value }))}
              className="bg-white border border-slate-300 text-slate-900 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shrink-0 min-w-[120px] font-semibold"
            >
              <option value="">All Groups</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.group_name}</option>
              ))}
            </select>

            <button 
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm shrink-0 print:hidden"
            >
              <Download className="w-4 h-4" />
              Excel Export
            </button>
            
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shrink-0 print:hidden"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading demand data...</div>
      ) : filteredLoans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-250 p-12 text-center print:hidden shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No collections found</h3>
          <p className="text-slate-500">Adjust filters to see demand details.</p>
        </div>
      ) : (
        <div className="bg-white border text-black border-slate-200 rounded-xl p-6 print:border-none print:p-0 print:shadow-none shadow-sm">
          {/* Print Header */}
          <div className="text-center mb-4 hidden print:block text-black">
            <h1 className="text-2xl font-bold uppercase tracking-wider mb-1 text-slate-900">ALJOOYA SUBIDHA SERVICES</h1>
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-700">Demand Sheet</h2>
            
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm font-semibold border-b-2 border-black pb-2 text-left">
              <div>
                <p>
                  Date: {filters.startDate === filters.endDate 
                    ? new Date(filters.startDate).toLocaleDateString('en-IN') 
                    : `${new Date(filters.startDate).toLocaleDateString('en-IN')} to ${new Date(filters.endDate).toLocaleDateString('en-IN')}`
                  }
                </p>
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

          <div className="overflow-x-auto w-full print:overflow-visible">
            <table className="w-full text-left text-[13px] border-collapse border border-slate-400 print:border-slate-800 print:text-[9.5px]">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-100 text-black border-b border-slate-400 print:border-slate-800">
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold w-12 text-center text-[11px] print:text-[9px]">Sl. No.</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold whitespace-nowrap text-[11px] print:text-[9px]">Member ID</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold whitespace-nowrap text-[11px] print:text-[9px]">Member Name</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold whitespace-nowrap text-[11px] print:text-[9px]">Mobile No.</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold whitespace-nowrap text-[11px] print:text-[9px]">Nominee Name</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold whitespace-nowrap text-[11px] print:text-[9px]">Group</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold whitespace-nowrap text-[11px] print:text-[9px]">Group Day</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold whitespace-nowrap text-[11px] print:text-[9px]">Disbursement</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold whitespace-nowrap text-[11px] print:text-[9px]">First EMI</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold text-center text-[11px] print:text-[9px]">EMIs</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold text-right text-[11px] print:text-[9px]">Balance</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold text-right text-[11px] print:text-[9px]">Demand</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold text-right print:w-16 text-[11px] print:text-[9px]">Arrear</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold text-right print:w-16 text-[11px] print:text-[9px]">Collected</th>
                  <th className="px-2 py-2 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 font-extrabold text-center print:w-16 text-[11px] print:text-[9px]">Signature</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan, idx) => (
                  <tr key={loan.id} className="border-b border-slate-200 print:border-slate-800 group hover:bg-slate-50 print:hover:bg-transparent">
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-center font-bold text-slate-800">{idx + 1}</td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-black font-bold font-mono">{loan.member_code || loan.customer_id}</td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800">
                      <div className="font-extrabold text-black leading-tight text-[13.5px]">{loan.member_name || 'Unknown'}</div>
                      <div className="text-[10px] print:text-[7.5px] text-slate-500 font-semibold uppercase">{loan.loan_no}</div>
                    </td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-black font-semibold whitespace-nowrap text-xs print:text-[9px]">{loan.member_mobile || loan.mobile_no || 'N/A'}</td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-black font-medium uppercase text-xs print:text-[9px] truncate max-w-[100px]">{loan.nominee_name || '-'}</td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-black font-semibold">
                      <div>{loan.group_name || '-'}</div>
                      <div className="text-[9px] text-slate-500 font-black">{loan.meeting_time ? String(loan.meeting_time).slice(0, 5) : ''}</div>
                    </td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-black font-semibold">{loan.meeting_day || '-'}</td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-black font-medium whitespace-nowrap">{formatDate(loan.created_at)}</td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-black font-medium whitespace-nowrap">{formatDate(loan.start_date)}</td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-center text-[10px] print:text-[9.5px] font-bold text-black print:whitespace-nowrap">
                      {loan.paid_emi_count || 0}/{loan.duration_weeks || 0}
                      {((loan.paid_emi_count || 0) >= (loan.duration_weeks || 0)) && (
                        <div className="text-[9px] print:text-[8px] text-red-600 font-bold mt-0.5 whitespace-nowrap">OVER</div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-right font-bold text-black">₹{formatAmount(Number(loan.total_repayment || 0) - Number(loan.total_paid || 0))}</td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-right font-black text-black bg-slate-50/80 print:bg-transparent">
                      ₹{formatAmount(Number(loan.calculatedDemand))}
                      {loan.matchCount > 1 && (
                        <div className="text-[9.5px] text-slate-600 font-extrabold">({loan.matchCount} × ₹{formatAmount(Number(loan.installment))})</div>
                      )}
                    </td>
                    {/* Empty columns for printing */}
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 bg-white print:bg-transparent"></td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 bg-white print:bg-transparent"></td>
                    <td className="px-2 py-2.5 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 bg-white print:bg-transparent"></td>
                  </tr>
                ))}
                {filteredLoans.length > 0 && (
                  <tr className="bg-slate-100 print:bg-slate-100 font-black text-black">
                    <td colSpan={10} className="px-2 py-3 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-right uppercase tracking-wider text-xs font-extrabold font-black">TOTAL</td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-right text-black font-black">
                      ₹{formatAmount(filteredLoans.reduce((sum, l) => sum + (Number(l.total_repayment || 0) - Number(l.total_paid || 0)), 0))}
                    </td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-400 print:border-slate-800 text-right text-black font-black">
                      ₹{formatAmount(filteredLoans.reduce((sum, l) => sum + Number(l.calculatedDemand || 0), 0))}
                    </td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-400 print:border-slate-800"></td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-400 print:border-slate-800"></td>
                    <td className="px-2 py-3 print:px-1 print:py-1 border border-slate-400 print:border-slate-800"></td>
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
