import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Filter, 
  PieChart as LucidePieChart, 
  Activity, 
  Download, 
  DollarSign, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight,
  Calculator,
  Percent,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { formatAmount } from '../lib/utils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  CartesianGrid
} from 'recharts';

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

  const income = data?.income || {};
  const expenses = data?.expenses || {};

  // Real Calculated Logic sum
  const totalIncome = parseFloat(income.interest_collected || 0) + 
                      parseFloat(income.processing_fees || 0) + 
                      parseFloat(income.insurance_fees || 0) +
                      parseFloat(income.product_sales || 0);

  const totalExpenses = parseFloat(expenses.salary_expenses || 0) + 
                        parseFloat(expenses.other_expenses || 0) +
                        parseFloat(expenses.savings_interest || 0);

  const netProfit = totalIncome - totalExpenses;
  const isProfit = netProfit >= 0;

  // Operating profit margin calculation
  const operatingMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0';

  // Format Recharts data sets
  const comparisonData = [
    {
      name: 'আয় (Income)',
      amount: totalIncome,
      color: '#10b981'
    },
    {
      name: 'ব্যয় (Expenses)',
      amount: totalExpenses,
      color: '#f43f5e'
    },
    {
      name: 'নীট লাভ/ক্ষতি',
      amount: Math.abs(netProfit),
      color: isProfit ? '#0284c7' : '#ec4899'
    }
  ];

  const incomeComposition = [
    { name: 'Collected Interest', value: parseFloat(income.interest_collected || 0), color: '#3b82f6', bangla: 'সংগৃহীত ঋণ সুদ' },
    { name: 'Processing Fees', value: parseFloat(income.processing_fees || 0), color: '#10b981', bangla: 'প্রসেসিং ফি' },
    { name: 'Insurance Fees', value: parseFloat(income.insurance_fees || 0), color: '#8b5cf6', bangla: 'ইন্সুরেন্স ফি' },
    { name: 'Product Sales Revenue', value: parseFloat(income.product_sales || 0), color: '#f59e0b', bangla: 'পণ্য বিক্রয় আয়' },
  ].filter(item => item.value > 0);

  const expenseBreakdownData = [
    { name: 'Salaries paid', value: parseFloat(expenses.salary_expenses || 0), color: '#f43f5e', bangla: 'কর্মচারীর বেতন' },
    { name: 'Savings Interest Paid', value: parseFloat(expenses.savings_interest || 0), color: '#fd974f', bangla: 'গ্রাহকের আমানতে সুদ' },
  ];

  // Append other categories from response
  (expenses.expense_breakdown || []).forEach((e: any, idx: number) => {
    expenseBreakdownData.push({
      name: `${e.category || 'Other'} Expense`,
      value: parseFloat(e.amount || 0),
      color: ['#ec4899', '#6366f1', '#14b8a6', '#a855f7', '#6b7280'][idx % 5] || '#94a3b8',
      bangla: `${e.category || 'অন্যান্য'} খরচ`
    });
  });

  const activeExpenses = expenseBreakdownData.filter(item => item.value > 0);

  const exportToExcel = () => {
    const wsData = [
      ['ALJOOYA SUBIDHA MICRO FINANCE - PROFIT & LOSS STATEMENT'],
      ['Period (সময়কাল):', `${format(new Date(startDate), 'dd MMM yyyy')} to ${format(new Date(endDate), 'dd MMM yyyy')}`],
      ['Branch (ব্রাঞ্চ):', branchId ? branches.find(b => b.id == branchId)?.branch_name : 'All Branches (সকল শাখা)'],
      [],
      ['REVENUE / INCOME (আয় সমূহ)', 'AMOUNT in ₹ (টাকা)'],
      ['1. Interest Collected on Loans (সংগৃহীত ঋণের সুদ)', parseFloat(income.interest_collected || 0)],
      ['2. Loan Processing Fees (লোন প্রসেসিং ফি)', parseFloat(income.processing_fees || 0)],
      ['3. Loan Insurance Fees (লোন ইন্সুরেন্স ফি)', parseFloat(income.insurance_fees || 0)],
      ['4. Product Sales Revenue (পণ্য বিক্রয় জনিত আয়)', parseFloat(income.product_sales || 0)],
      ['TOTAL INCOME (সর্বমোট আয়)', totalIncome],
      [],
      ['OPERATING EXPENSES (ব্যয় সমূহ)', 'AMOUNT in ₹ (টাকা)'],
      ['1. Employee Salaries Paid (কর্মচারীদের বেতন)', parseFloat(expenses.salary_expenses || 0)],
      ['2. Interest Credited on Savings (সঞ্চয় আমানতের সুদ)', parseFloat(expenses.savings_interest || 0)],
      ...((expenses.expense_breakdown || []).map((e: any) => [
        `3. Other Expense - ${e.category} (${e.category || 'অন্যান্য'} খরচ)`, parseFloat(e.amount || 0)
      ])),
      ['TOTAL EXPENSES (সর্বমোট ব্যয়)', totalExpenses],
      [],
      [isProfit ? 'NET OPERATING PROFIT (নীট লাভ)' : 'NET OPERATING LOSS (নীট ক্ষতি)', netProfit],
      ['OPERATING MARGIN (% লাভ মার্জিন)', `${operatingMargin}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss Statement');
    // Set widths
    const wscols = [
      {wch: 55},
      {wch: 25}
    ];
    ws['!cols'] = wscols;
    XLSX.writeFile(wb, `PL_Statement_Aljooya_${startDate}_to_${endDate}.xlsx`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs font-bold font-sans text-white">
          <p className="mb-1 uppercase tracking-wider text-slate-400">{payload[0].name}</p>
          <p className="text-sm font-black text-white">₹{formatAmount(payload[0].value || payload[0].payload.amount)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-h-screen font-sans">
      {/* Dynamic Filter Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-[#0f172a] text-[#38bdf8] p-3 rounded-2xl shadow-md border border-slate-800">
            <Calculator className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Profit & Loss Statement <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Real-time Logic</span>
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              লাভ-ক্ষতির আর্থিক বিবরণী এবং রেটিনাল বিশ্লেষণ
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Date Selectors with labels */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none w-[115px] focus:ring-0"
            />
            <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none w-[115px] focus:ring-0"
            />
          </div>

          {(user?.role === 'superadmin' || user?.role === 'manager' || user?.role === 'dm' || user?.role === 'am') && (
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Filter className="w-4 h-4 text-slate-500" />
              <select 
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none max-w-[130px] truncate"
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
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 hover:scale-102 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-widest uppercase transition-all shadow-md shadow-emerald-100 uppercase"
          >
            <Download className="w-4 h-4" /> Export Report (ভাউচার)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">P&L হিসাব লোড করা হচ্ছে, একটু অপেক্ষা করুন...</p>
        </div>
      ) : (
        <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">

          {/* Visual Showcase Glassmorphic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Income Summary Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 0.05 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden relative group/income"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full filter blur-2xl -mr-10 -mt-10 transition-transform group-hover/income:scale-110"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full">Total Revenue</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">
                  ₹{formatAmount(totalIncome)}
                </div>
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">
                  সর্বমোট সংগৃহীত আয়
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Interest & Product sells</span>
                  <span className="font-extrabold text-emerald-600">
                     {incomeComposition.length} Sources
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Expenses Summary Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden relative group/expense"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full filter blur-2xl -mr-10 -mt-10 transition-transform group-hover/expense:scale-110"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase text-rose-600 tracking-widest bg-rose-50 px-2.5 py-1 rounded-full">Total Costs</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">
                  ₹{formatAmount(totalExpenses)}
                </div>
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mt-1">
                  সর্বমোট মোট খরচ ও ব্যয়
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Salary, Savings & Other</span>
                  <span className="font-extrabold text-rose-600">
                     {activeExpenses.length} Accounts
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Net Profit Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 0.15 }}
              className={`border rounded-3xl p-6 shadow-md overflow-hidden relative group/net ${
                isProfit ? 'bg-gradient-to-br from-emerald-900 to-teal-950 border-emerald-950 text-white' : 'bg-gradient-to-br from-rose-950 to-red-950 border-rose-950 text-white'
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full filter blur-xl -mr-10 -mt-10"></div>
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                    isProfit ? 'bg-emerald-800/50 text-emerald-200 border border-emerald-600/30' : 'bg-rose-800/50 text-rose-200 border border-rose-600/30'
                  }`}>
                    {isProfit ? 'Net Operating Profit' : 'Net Operating Loss'}
                  </span>
                  <div className={`p-2 rounded-xl ${isProfit ? 'bg-emerald-800/80 text-emerald-300' : 'bg-rose-800/80 text-rose-300'}`}>
                    {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                </div>
                <div className="text-3xl font-black tracking-tight font-sans">
                  ₹{formatAmount(Math.abs(netProfit))}
                </div>
                <div className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mt-1">
                  {isProfit ? 'সর্বমোট নীট লাভ বা প্রফিট' : 'সর্বমোট নীট আর্থিক ক্ষতি'}
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span className="opacity-80">Operating Margin (লাভের অনুপাত)</span>
                  <span className={`font-black px-2 py-0.5 rounded ${isProfit ? 'bg-[#10b981]/20 text-[#34d399]' : 'bg-[#f43f5e]/20 text-[#fca5a5]'}`}>
                    {operatingMargin}%
                  </span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Interactive Recharts Graphical Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Bar Chart: Comparative Ledger */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 0.2 }}
              className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Financial Comparison Graph
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">আয়, ব্যয় এবং নীট লাভের তুলনামূলক চার্ট</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <Activity className="w-4 h-4 text-indigo-600" /> Matrix Analysis
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" tickLine={false} style={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <YAxis stroke="#64748b" tickLine={false} style={{ fontSize: '10px' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={55}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Income Breakdown Pie Chart */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 0.25 }}
              className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Revenue Composition
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">কোম্পানির মোট আয়ের উৎস সমূহের শতকরা ভাগ</p>
                </div>
                <LucidePieChart className="w-4 h-4 text-indigo-600" />
              </div>

              {incomeComposition.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center py-10">
                  <HelpCircle className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400 text-center font-bold">এই সময়সীমার মধ্যে কোনো আয়ের ডেটা পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col sm:flex-row justify-around items-center gap-4">
                  <div className="w-[150px] h-[150px]/ sm:h-[150px] relative">
                    <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                      <RechartsPieChart>
                        <Pie
                          data={incomeComposition}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {incomeComposition.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Inflows</p>
                      <p className="text-[10px] font-black text-slate-500 mt-1 uppercase leading-none">সুদ ও পণ্য</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center gap-2">
                    {incomeComposition.map((item, idx) => {
                      const percent = totalIncome > 0 ? ((item.value / totalIncome) * 100).toFixed(0) : 0;
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 font-bold block max-w-[125px] truncate">
                              {item.bangla}
                            </span>
                          </div>
                          <span className="font-black text-slate-800 text-right min-w-[50px]">
                            {percent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>

          </div>

          {/* Detailed Double-Entry Balance Style Financial Register Sheet */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:divide-x lg:divide-slate-200 bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm">
            
            {/* LEFT COLUMN: INCOME GENERAL LEDGER */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-lg">
                    CR
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Income Items (ক্রেডিট / জমা)
                    </h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">তহবিল আগমনী খাত বা মোট উপার্জন</p>
                  </div>
                </div>
                <span className="text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full">
                  Inflows
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {/* 1. Interest Collected */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Interest Collected on Loans</p>
                    <p className="text-[11px] font-extrabold text-slate-500">ঋণের সংগৃহীত সুদ ও মুনাফা সংগ্রহ</p>
                    <p className="text-[9px] text-slate-400">Collections EMI interest logic</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">₹{formatAmount(income.interest_collected || 0)}</p>
                    <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">Credit (+)</span>
                  </div>
                </div>

                {/* 2. Processing Fees */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Loan Processing Fees</p>
                    <p className="text-[11px] font-extrabold text-slate-500">ঋণ প্রসেসিং বা ফাইল চার্জ বাবদ সংগ্রহ</p>
                    <p className="text-[9px] text-slate-400">Assessed directly at disbursement</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">₹{formatAmount(income.processing_fees || 0)}</p>
                    <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">Credit (+)</span>
                  </div>
                </div>

                {/* 3. Insurance Fees */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Loan Insurance Fees</p>
                    <p className="text-[11px] font-extrabold text-slate-500">ঋণের ইন্সুরেন্স বা বীমা প্রিমিয়াম ফান্ড</p>
                    <p className="text-[9px] text-slate-400">Premium deductions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">₹{formatAmount(income.insurance_fees || 0)}</p>
                    <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">Credit (+)</span>
                  </div>
                </div>

                {/* 4. Product Sales Revenue */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Product Sales Revenue</p>
                    <p className="text-[11px] font-extrabold text-slate-500">পণ্য বিক্রয় ও সার্ভিস থেকে মোট ক্যাশ আয়</p>
                    <p className="text-[9px] text-slate-400">Cash product sales</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">₹{formatAmount(income.product_sales || 0)}</p>
                    <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">Credit (+)</span>
                  </div>
                </div>
              </div>

              {/* Total Income Footer inside left side */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">সর্বমোট আয়ের যোগফল</span>
                <span className="text-lg font-black text-emerald-600">₹{formatAmount(totalIncome)}</span>
              </div>
            </div>

            {/* RIGHT COLUMN: EXPENSES GENERAL LEDGER */}
            <div className="space-y-6 lg:pl-8 mt-8 lg:mt-0">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-black text-lg">
                    DR
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Expenses / Costs (ডেবিট / ব্যয়)
                    </h3>
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-0.5">পরিচালনা ব্যয়, বেতন এবং অন্যান্য ক্ষতি</p>
                  </div>
                </div>
                <span className="text-xs font-black bg-rose-50 text-rose-800 border border-rose-100 px-3 py-1 rounded-full">
                  Outflows
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {/* 1. Salaries paid */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Staff Salaries Paid</p>
                    <p className="text-[11px] font-extrabold text-slate-500">অফিস স্টাফ এবং মাঠকর্মীদের মাসিক বেতন</p>
                    <p className="text-[9px] text-slate-400">Payroll payouts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">₹{formatAmount(expenses.salary_expenses || 0)}</p>
                    <span className="text-[10px] text-rose-600 font-extrabold block mt-0.5">Debit (-)</span>
                  </div>
                </div>

                {/* 2. Savings Account Interest */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Savings Interest Credited</p>
                    <p className="text-[11px] font-extrabold text-slate-500">গ্রাহকদের সঞ্চয়ী আমানত ও ডিপিএস-এ লভ্যাংশ প্রদান</p>
                    <p className="text-[9px] text-slate-400">Member savings transaction interest</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">₹{formatAmount(expenses.savings_interest || 0)}</p>
                    <span className="text-[10px] text-rose-600 font-extrabold block mt-0.5">Debit (-)</span>
                  </div>
                </div>

                {/* 3. Expense breakdown items */}
                {(expenses.expense_breakdown || []).map((e: any, idx: number) => (
                  <div key={idx} className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider">{e.category || 'Other'} Office cost</p>
                      <p className="text-[11px] font-extrabold text-slate-500">শাখার অন্যান্য সাধারণ পরিচালনা ব্যয়: ক্যাটেগরি {e.category}</p>
                      <p className="text-[9px] text-slate-400">Regular petty cash expense</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">₹{formatAmount(e.amount || 0)}</p>
                      <span className="text-[10px] text-rose-600 font-extrabold block mt-0.5">Debit (-)</span>
                    </div>
                  </div>
                ))}

                {/* If no other expense breakdowns */}
                {(!expenses.expense_breakdown || expenses.expense_breakdown.length === 0) && (
                  <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Other Petty Expenses</p>
                      <p className="text-[11px] font-extrabold text-slate-500">শাখার অন্যান্য সাধারণ ও কার্যাবলী বাবদ খরচ</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">₹{formatAmount(expenses.other_expenses || 0)}</p>
                      <span className="text-[10px] text-rose-600 font-extrabold block mt-0.5">Debit (-)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Expenses Footer inside right side */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">সর্বমোট ব্যয়ের যোগফল</span>
                <span className="text-lg font-black text-rose-600">₹{formatAmount(totalExpenses)}</span>
              </div>
            </div>

          </div>

          {/* Audit Verification Note */}
          <div className="bg-slate-900 text-slate-400 p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-[#38bdf8] flex-shrink-0" />
              <div className="text-xs font-bold leading-relaxed">
                <span className="text-white">Financial Statement Audit Integrity:</span> সর্বমোট সংগৃহীত প্রসেসিং ফি, লোন ইন্সুরেন্স, সংগৃহীত সাপ্তাহিক ঋণের কিস্তির ইন্টারেস্ট মার্জিন এবং প্রোডাক্ট বিক্রয়ের ক্যাশ আয়ের ওপর ভিত্তি করে এই বিবরণী সম্পূর্ণ রিয়েল-টাইমে মেলানো হয়েছে।
              </div>
            </div>
            <div className="text-[10px] font-black uppercase bg-slate-800 text-slate-300 tracking-widest px-3 py-1 rounded border border-slate-700">
              System Auditor v1.5
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
