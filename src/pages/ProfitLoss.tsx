import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp, TrendingDown, Calendar, Filter, PieChart, Activity, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { formatAmount } from '../lib/utils';

export default function ProfitLoss() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadPL();
  }, [startDate, endDate, branchId]);

  const loadBranches = async () => {
    try {
      const res = await fetch('/api/branches');
      if (res.ok) setBranches(await res.json());
    } catch (err) {}
  };

  const loadPL = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (branchId) qs.append('branch_id', branchId);
      
      const res = await fetch(`/api/pl?${qs.toString()}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return <div className="p-10 text-center text-slate-500">Loading Profit & Loss Data...</div>;
  }

  const income = data?.income || {};
  const expenses = data?.expenses || {};

  const totalIncome = parseFloat(income.processing_fees || 0) + 
                      parseFloat(income.insurance_fees || 0) + 
                      parseFloat(income.interest_collected || 0);

  const totalExpenses = parseFloat(expenses.salary_expenses || 0) + 
                        parseFloat(expenses.other_expenses || 0);

  const netProfit = totalIncome - totalExpenses;
  const isProfit = netProfit >= 0;

  const exportToExcel = () => {
    const wsData = [
      ['Profit & Loss Statement'],
      ['Period:', `${format(new Date(startDate), 'dd MMM yyyy')} to ${format(new Date(endDate), 'dd MMM yyyy')}`],
      ['Branch:', branchId ? branches.find(b => b.id == branchId)?.branch_name : 'All Branches'],
      [],
      ['INCOME', ''],
      ['Interest Collected', formatAmount(income.interest_collected || 0)],
      ['Processing Fees', formatAmount(income.processing_fees || 0)],
      ['Insurance Fees', formatAmount(income.insurance_fees || 0)],
      ['Total Income', formatAmount(totalIncome)],
      [],
      ['EXPENSES', ''],
      ['Salary Expenses', formatAmount(expenses.salary_expenses || 0)],
      ...((expenses.expense_breakdown || []).map((e: any) => [
        `Expense - ${e.category}`, formatAmount(e.amount || 0)
      ])),
      ['Total Expenses', formatAmount(totalExpenses)],
      [],
      [isProfit ? 'NET PROFIT' : 'NET LOSS', formatAmount(Math.abs(netProfit))]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'P&L Statement');
    XLSX.writeFile(wb, `Profit_Loss_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-xl">
            <PieChart className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Profit & Loss</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Statement</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none w-[110px]"
            />
            <span className="text-slate-400 font-bold text-xs uppercase">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none w-[110px]"
            />
          </div>

          {(user?.role === 'superadmin' || user?.role === 'manager') && (
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
              <Filter className="w-4 h-4 text-slate-500" />
              <select 
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none max-w-[120px] truncate"
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branch_name}</option>
                ))}
              </select>
            </div>
          )}

          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Top Highlight */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          className={`p-6 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden ${
            isProfit ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}
        >
          <div className="relative z-10 flex items-center gap-4">
            <div className={`p-4 rounded-full ${isProfit ? 'bg-emerald-100' : 'bg-rose-100'}`}>
              {isProfit ? <TrendingUp className={`w-8 h-8 text-emerald-600`} /> : <TrendingDown className={`w-8 h-8 text-rose-600`} />}
            </div>
            <div>
              <div className={`text-xs font-black uppercase tracking-widest mb-1 ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isProfit ? 'Net Profit' : 'Net Loss'}
              </div>
              <div className={`text-4xl font-black ${isProfit ? 'text-emerald-900' : 'text-rose-900'}`}>
                ₹{formatAmount(Math.abs(netProfit))}
              </div>
            </div>
          </div>
          <div className="relative z-10 bg-white/50 backdrop-blur-sm px-6 py-4 rounded-xl border border-white/20 text-center sm:text-right">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Operating Margin</div>
            <div className="text-xl font-bold text-slate-800">
              {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </motion.div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Side */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Income
              </h3>
            </div>
            <div className="p-0 flex-1">
              <div className="divide-y divide-slate-100">
                <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-600">Interest Collected</span>
                  <span className="text-sm font-black text-slate-800">₹{formatAmount(income.interest_collected || 0)}</span>
                </div>
                <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-600">Processing Fees</span>
                  <span className="text-sm font-black text-slate-800">₹{formatAmount(income.processing_fees || 0)}</span>
                </div>
                <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-bold text-slate-600">Insurance Fees</span>
                  <span className="text-sm font-black text-slate-800">₹{formatAmount(income.insurance_fees || 0)}</span>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Total Income</span>
              <span className="text-xl font-black text-emerald-600">₹{formatAmount(totalIncome)}</span>
            </div>
          </motion.div>

          {/* Expense Side */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" /> Expenses
              </h3>
            </div>
            <div className="p-0 flex-1">
              <div className="divide-y divide-slate-100">
                <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors bg-blue-50/30">
                  <span className="text-sm font-bold text-slate-600">Total Salary Paid</span>
                  <span className="text-sm font-black text-slate-800">₹{formatAmount(expenses.salary_expenses || 0)}</span>
                </div>
                {(expenses.expense_breakdown || []).map((e: any, i: number) => (
                  <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-bold text-slate-600">{e.category || 'Other'} Expense</span>
                    <span className="text-sm font-black text-slate-800">₹{formatAmount(e.amount || 0)}</span>
                  </div>
                ))}
                {expenses.expense_breakdown?.length === 0 && (
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-bold text-slate-600">Other Expenses</span>
                    <span className="text-sm font-black text-slate-800">₹0</span>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Total Expenses</span>
              <span className="text-xl font-black text-rose-600">₹{formatAmount(totalExpenses)}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
