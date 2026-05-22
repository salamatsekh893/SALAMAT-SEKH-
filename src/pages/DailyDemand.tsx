import React, { useState, useEffect } from 'react';
import { Filter, Printer, Calendar, Clock, DollarSign, Activity } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { format, differenceInWeeks, differenceInDays } from 'date-fns';

export default function DailyDemand() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    branch_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [branchesData, loansData] = await Promise.all([
        fetchWithAuth('/branches'),
        fetchWithAuth('/loans?status=active')
      ]);
      
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setLoans(Array.isArray(loansData) ? loansData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();
  today.setHours(0,0,0,0);
  const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' });

  const filteredLoans = loans.filter(loan => {
    if (loan.status !== 'active') return false;
    // Must have balance
    const balance = Number(loan.total_repayment || 0) - Number(loan.total_paid || 0);
    if (balance <= 0) return false;
    
    if (filters.branch_id && String(loan.branch_id) !== String(filters.branch_id)) return false;

    // Check if expected to collect today
    let collectToday = false;
    if (loan.emi_frequency === 'daily') {
      collectToday = todayDay !== 'Sunday'; // Assume no collection on Sunday
    } else {
      // Weekly or default
      collectToday = loan.meeting_day === todayDay;
    }

    if (!collectToday) return false;

    // IF collected today or in advance, don't show
    // Logic: check paid_emi_count vs expected_emi_count
    const startDate = loan.start_date ? new Date(loan.start_date) : new Date(loan.created_at);
    startDate.setHours(0,0,0,0);
    
    let expectedCount = 0;
    if (loan.emi_frequency === 'daily') {
      const days = differenceInDays(today, startDate);
      // rough approx subtracting Sundays
      const sundays = Math.floor((days + startDate.getDay()) / 7);
      expectedCount = (days - sundays) + 1; 
    } else {
      // Weekly
      const weeks = differenceInWeeks(today, startDate);
      expectedCount = weeks + 1; // +1 for the current period 
    }

    // if they have paid up to or more than expected, don't show
    if ((loan.paid_emi_count || 0) >= expectedCount) {
      return false;
    }
    
    // Check last_payment_date to see if they literally just paid today or within a few days
    if (loan.last_payment_date) {
      const lastPay = new Date(loan.last_payment_date);
      lastPay.setHours(0,0,0,0);
      
      if (loan.emi_frequency === 'daily') {
        if (lastPay.getTime() >= today.getTime()) return false;
      } else {
        // if weekly, and they paid within the last 6 days and NOT on a previous meeting day... this gets tricky.
        // It's safer to just rely on the paid_emi_count trick, but additionally check if they paid *today* just in case
        if (lastPay.getTime() >= today.getTime()) return false;
        
        // Also if last_payment_date > today - 6 days, they paid this week's quota early
        const diff = differenceInDays(today, lastPay);
        if (diff > 0 && diff <= 6) {
           return false;
        }
      }
    }

    return true;
  });

  filteredLoans.sort((a, b) => (a.member_name || '').localeCompare(b.member_name || ''));

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <style>{`
        @media print {
          @page { size: portrait; margin: 8mm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print-hidden { display: none !important; }
        }
      `}</style>

      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-indigo-100 mb-6 print-hidden p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Daily Demand (Pending)
            </h1>
            <p className="text-slate-500 text-xs mt-1">Shows ONLY today's pending EMI collections.</p>
          </div>
          
          <div className="flex flex-row items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 shrink-0 scrollbar-hide">
            <div className="flex items-center gap-1 text-slate-700 font-semibold text-sm shrink-0">
              <Filter className="w-4 h-4 text-indigo-500" />
            </div>
            
            <select
              value={filters.branch_id}
              onChange={(e) => setFilters(f => ({ ...f, branch_id: e.target.value }))}
              className="bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2 sm:px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shrink-0 min-w-[120px]"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
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
        <div className="text-center py-12 text-slate-500 font-medium">Loading demand data...</div>
      ) : filteredLoans.length === 0 ? (
        <div className="bg-white/80 rounded-2xl border border-slate-100 p-12 text-center print-hidden shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
            <Activity className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Pending Demand Today!</h3>
          <p className="text-slate-500">All scheduled EMI collections have either been approved or paid in advance.</p>
        </div>
      ) : (
        <div className="bg-white border text-slate-950 border-slate-200 rounded-xl px-0 py-0 sm:px-6 sm:py-6 print:border-none print:p-0 print:shadow-none shadow-sm overflow-hidden">
          <div className="text-center mb-4 hidden print:block text-slate-950">
            <h1 className="text-2xl font-bold uppercase tracking-wider mb-1 text-slate-900">ALJOOYA SUBIDHA SERVICES</h1>
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-700">Daily Demand Sheet</h2>
            <div className="mt-2 text-sm">Date: {format(today, 'dd-MMM-yyyy')} | Day: {todayDay}</div>
          </div>

          <div className="overflow-x-auto w-full print:overflow-visible">
            <table className="w-full text-left text-[13px] border-collapse min-w-[700px] print:min-w-full">
              <thead>
                <tr className="bg-indigo-50 print:bg-slate-100 text-indigo-900 border-y border-indigo-100 print:text-black">
                  <th className="px-3 py-2.5 print:px-2 print:py-2 border-r border-indigo-100 print:border-slate-300 font-bold w-12 text-center text-xs uppercase tracking-wider">Sl.</th>
                  <th className="px-3 py-2.5 print:px-2 print:py-2 border-r border-indigo-100 print:border-slate-300 font-bold text-xs uppercase tracking-wider">Member Details</th>
                  <th className="px-3 py-2.5 print:px-2 print:py-2 border-r border-indigo-100 print:border-slate-300 font-bold text-xs uppercase tracking-wider text-center">Mobile No.</th>
                  <th className="px-3 py-2.5 print:px-2 print:py-2 border-r border-indigo-100 print:border-slate-300 font-bold text-xs uppercase tracking-wider">Group</th>
                  <th className="px-3 py-2.5 print:px-2 print:py-2 border-r border-indigo-100 print:border-slate-300 font-bold text-xs uppercase tracking-wider text-right">Target Demand (EMI)</th>
                  <th className="px-3 py-2.5 print:px-2 print:py-2 border-r border-indigo-100 print:border-slate-300 font-bold text-xs uppercase tracking-wider text-right print:w-20">Amount Collected</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan, idx) => (
                  <tr key={loan.id} className="border-b border-slate-100 group hover:bg-slate-50/50 print:hover:bg-transparent transition-colors">
                    <td className="px-3 py-3 print:px-2 print:py-2 border-r border-slate-100 print:border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-3 print:px-2 print:py-2 border-r border-slate-100 print:border-slate-300">
                      <div className="font-black text-slate-900 uppercase tracking-tight text-[13px]">{loan.member_name || 'Unknown'}</div>
                      <div className="text-[10px] font-bold text-indigo-600 mt-0.5 tracking-widest">{loan.member_code || loan.customer_id} • LOAN #{loan.loan_no || loan.id}</div>
                    </td>
                    <td className="px-3 py-3 print:px-2 print:py-2 border-r border-slate-100 print:border-slate-300 text-slate-700 font-bold text-center tracking-wider text-xs">{loan.member_mobile || loan.mobile_no || '-'}</td>
                    <td className="px-3 py-3 print:px-2 print:py-2 border-r border-slate-100 print:border-slate-300 text-slate-700 font-bold uppercase text-[11px]">{loan.group_name || 'N/A'}</td>
                    <td className="px-3 py-3 print:px-2 print:py-2 border-r border-slate-100 print:border-slate-300 text-right">
                       <span className="font-black text-indigo-700 bg-indigo-50 print:bg-transparent px-2.5 py-1 rounded text-sm print:text-xs tracking-wider">
                         ₹{formatAmount(Number(loan.installment))}
                       </span>
                    </td>
                    <td className="px-3 py-3 print:px-2 print:py-2 print:border-r border-slate-300 bg-slate-50/30 print:bg-transparent"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
