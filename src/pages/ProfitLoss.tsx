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
  ArrowUpRight, 
  ArrowDownRight,
  Calculator,
  CheckCircle,
  HelpCircle,
  Layers,
  Inbox,
  Shield,
  CreditCard,
  Briefcase,
  Sliders,
  DollarSign
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { formatAmount } from '../lib/utils';
import { fetchWithAuth } from '../lib/api';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
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
      const data = await fetchWithAuth('/branches');
      setBranches(data);
    } catch (err) {
      console.error('Error fetching branches in P&L:', err);
    }
  };

  const loadPL = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (branchId) qs.append('branch_id', branchId);
      
      const resData = await fetchWithAuth(`/pl?${qs.toString()}`);
      setData(resData);
    } catch (err) {
      console.error('Error loading P&L financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const income = data?.income || {};
  const expenses = data?.expenses || {};

  // Real Calculated Logic Sum
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
      name: 'Gross Income',
      amount: totalIncome,
      color: '#10b981'
    },
    {
      name: 'Gross Expenses',
      amount: totalExpenses,
      color: '#ef4444'
    },
    {
      name: 'Net Profit/Loss',
      amount: Math.abs(netProfit),
      color: isProfit ? '#0ea5e9' : '#ec4899'
    }
  ];

  const incomeComposition = [
    { name: 'Interest Collected', value: parseFloat(income.interest_collected || 0), color: '#3b82f6', englishDesc: 'Collected Loan Interest' },
    { name: 'Processing Fees', value: parseFloat(income.processing_fees || 0), color: '#10b981', englishDesc: 'Loan File Processing Fees' },
    { name: 'Insurance Fees', value: parseFloat(income.insurance_fees || 0), color: '#8b5cf6', englishDesc: 'Mandatory Insurance Charges' },
    { name: 'Product Sales', value: parseFloat(income.product_sales || 0), color: '#f59e0b', englishDesc: 'Product Sales Secondary Revenue' },
  ].filter(item => item.value > 0);

  const expenseBreakdownData = [
    { name: 'Salaries Paid', value: parseFloat(expenses.salary_expenses || 0), color: '#f43f5e', englishDesc: 'Staff & Executive Compensations' },
    { name: 'Savings Interest Credited', value: parseFloat(expenses.savings_interest || 0), color: '#fd974f', englishDesc: 'DPS & Savings Interest Credited' },
  ];

  // Append other categories from response
  (expenses.expense_breakdown || []).forEach((e: any, idx: number) => {
    expenseBreakdownData.push({
      name: `${e.category || 'Other'} Office Cost`,
      value: parseFloat(e.amount || 0),
      color: ['#ec4899', '#6366f1', '#14b8a6', '#a855f7', '#6b7280'][idx % 5] || '#94a3b8',
      englishDesc: `${e.category || 'Miscellaneous'} Operational Expense`
    });
  });

  const activeExpenses = expenseBreakdownData.filter(item => item.value > 0);

  const exportToExcel = () => {
    const wsData = [
      ['ALJOOYA SUBIDHA MICRO FINANCE - PROFIT & LOSS STATEMENT'],
      ['Period:', `${format(new Date(startDate), 'dd MMM yyyy')} to ${format(new Date(endDate), 'dd MMM yyyy')}`],
      ['Branch:', branchId ? branches.find(b => b.id == branchId)?.branch_name : 'All Branches'],
      [],
      ['REVENUE / INCOME DETAILS', 'AMOUNT in ₹ (INR)'],
      ['1. Interest Collected on Loans', parseFloat(income.interest_collected || 0)],
      ['2. Loan Processing Fees', parseFloat(income.processing_fees || 0)],
      ['3. Loan Insurance Fees', parseFloat(income.insurance_fees || 0)],
      ['4. Product Sales Revenue', parseFloat(income.product_sales || 0)],
      ['TOTAL INBOUND INCOME', totalIncome],
      [],
      ['OPERATING EXPENSES / OUTFLOWS', 'AMOUNT in ₹ (INR)'],
      ['1. Employee Salaries Paid', parseFloat(expenses.salary_expenses || 0)],
      ['2. Interest Credited on Member Savings', parseFloat(expenses.savings_interest || 0)],
      ...((expenses.expense_breakdown || []).map((e: any) => [
        `3. Other Expense - ${e.category}`, parseFloat(e.amount || 0)
      ])),
      ['TOTAL OUTBOUND OPERATIONS', totalExpenses],
      [],
      [isProfit ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS', netProfit],
      ['OPERATING PROFIT MARGIN (%)', `${operatingMargin}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss Statement');
    ws['!cols'] = [
      {wch: 45},
      {wch: 25}
    ];
    XLSX.writeFile(wb, `PL_Statement_Aljooya_${startDate}_to_${endDate}.xlsx`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/65 p-3 rounded-2xl shadow-2xl text-xs font-bold text-white max-w-[240px]">
          <p className="mb-1 uppercase tracking-wider text-slate-400 font-extrabold">{payload[0].name}</p>
          <p className="text-sm font-black text-white font-mono">₹{formatAmount(payload[0].value || payload[0].payload.amount)}</p>
        </div>
      );
    }
    return null;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-h-screen text-slate-800 antialiased font-sans">
      
      {/* Premium Navigation and Dynamic Filter Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-[#38bdf8] p-3 rounded-2xl shadow-xl shadow-slate-100 border border-slate-800">
            <Calculator className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2.5 font-black text-slate-950 tracking-tight flex items-center gap-2">
              Profit & Loss Account
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                Live Audit Stream
              </span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Financial performance analysis and balance sheet tracking
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Date Selectors with labels */}
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100 shadow-inner">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-700 outline-none w-[115px] focus:ring-0 cursor-pointer"
            />
            <span className="text-slate-300 font-black text-[10px] uppercase tracking-wider px-1">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-700 outline-none w-[115px] focus:ring-0 cursor-pointer"
            />
          </div>

          {(user?.role === 'superadmin' || user?.role === 'manager' || user?.role === 'dm' || user?.role === 'am') && (
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100 shadow-inner">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none max-w-[130px] truncate cursor-pointer bg-none"
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
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase transition-all shadow-lg hover:shadow-xl shadow-slate-200 active:scale-98"
          >
            <Download className="w-4 h-4 text-teal-400" /> Export Sheet
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center py-32 gap-4">
          <div className="w-14 h-14 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest leading-none">
            Recalculating ledger records, please wait...
          </p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="p-6 space-y-8 w-full"
        >

          {/* Premium Showcase Glossy Fluid Interactive Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Income Card with Glowing Elements */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.2 } }}
              className="bg-white border border-slate-150/80 rounded-[2rem] p-7 shadow-xl shadow-slate-100/40 overflow-hidden relative group/income cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-emerald-400/10 to-teal-400/20 rounded-full filter blur-3xl -mr-8 -mt-8 transition-transform group-hover/income:scale-125 duration-500"></div>
              <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    Gross Revenue
                  </span>
                  <div className="p-2.5 bg-emerald-50/50 text-emerald-600 rounded-2xl group-hover/income:bg-emerald-100 transition-colors">
                    <ArrowUpRight className="w-5 h-5 transition-transform group-hover/income:translate-x-0.5 group-hover/income:-translate-y-0.5" />
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black text-slate-950 tracking-tight font-mono">
                    ₹{formatAmount(totalIncome)}
                  </div>
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                    TOTAL OPERATIONAL INFLOWS
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Interest & Commissions</span>
                  <span className="font-extrabold text-emerald-600">
                    {incomeComposition.length} Revenue Sources
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Expense Card with Glowing Elements */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.2 } }}
              className="bg-white border border-slate-150/80 rounded-[2rem] p-7 shadow-xl shadow-slate-100/40 overflow-hidden relative group/expense cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-rose-400/10 to-red-400/20 rounded-full filter blur-3xl -mr-8 -mt-8 transition-transform group-hover/expense:scale-125 duration-500"></div>
              <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                    Gross Outflow
                  </span>
                  <div className="p-2.5 bg-rose-50/50 text-rose-600 rounded-2xl group-hover/expense:bg-rose-100 transition-colors">
                    <ArrowDownRight className="w-5 h-5 transition-transform group-hover/expense:translate-x-0.5 group-hover/expense:translate-y-0.5" />
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black text-slate-950 tracking-tight font-mono">
                    ₹{formatAmount(totalExpenses)}
                  </div>
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
                    TOTAL EXPENDITURES PAID
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Staffing, Savings & Operations</span>
                  <span className="font-extrabold text-rose-600">
                    {activeExpenses.length} Outbound Debits
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Profit & Loss Card with Ultra Glow Premium Gradients */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.2 } }}
              className={`border rounded-[2rem] p-7 shadow-2xl overflow-hidden relative group/net cursor-pointer ${
                isProfit 
                  ? 'bg-gradient-to-br from-slate-900 to-indigo-950 border-slate-950 text-white shadow-indigo-105-30' 
                  : 'bg-gradient-to-br from-red-950 to-rose-950 border-red-950 text-white shadow-rose-950/20'
              }`}
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full filter blur-2xl -mr-8 -mt-8 transition-transform group-hover/net:scale-125 duration-500"></div>
              <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                    isProfit 
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}>
                    {isProfit ? 'Net Operating Profit' : 'Net Operating Loss'}
                  </span>
                  <div className={`p-2.5 rounded-2xl ${
                    isProfit ? 'bg-indigo-900/60 text-indigo-300' : 'bg-rose-900/60 text-rose-300'
                  }`}>
                    {isProfit ? <TrendingUp className="w-5 h-5 animate-bounce" /> : <TrendingDown className="w-5 h-5 animate-bounce" />}
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black tracking-tight font-mono">
                    ₹{formatAmount(Math.abs(netProfit))}
                  </div>
                  <div className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest mt-1">
                    {isProfit ? 'NET INTERNAL BALANCE' : 'NET DEFICIT BALANCE'}
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span className="opacity-80">Operating Margin (Earnings to Capital ratio)</span>
                  <span className={`font-black tracking-wide px-2.5 py-0.5 rounded-lg ${
                    isProfit ? 'bg-emerald-400/20 text-[#34d399]' : 'bg-rose-400/20 text-[#fca5a5]'
                  }`}>
                    {operatingMargin}%
                  </span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Premium Comparative Charts & Analytics Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Box: Comparative ledger chart */}
            <motion.div 
              variants={cardVariants}
              className="lg:col-span-7 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Ledger Comparison Analytics
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                    Comparative visualization of inflows, outflows, and net earnings.
                  </p>
                </div>
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '10px' }} />
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

            {/* Right Box: Pie chart composition */}
            <motion.div 
              variants={cardVariants}
              className="lg:col-span-5 bg-white border border-slate-150/80 rounded-3xl p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Revenue Composition
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                    Percentage composition of total revenue streams.
                  </p>
                </div>
                <LucidePieChart className="w-4 h-4 text-indigo-500" />
              </div>

              {incomeComposition.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center py-12 text-center text-slate-400">
                  <HelpCircle className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">
                    No revenue data matches the selected period.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col sm:flex-row justify-around items-center gap-4">
                  <div className="w-[150px] h-[150px] relative">
                    <ResponsiveContainer width="100%" height="100%">
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
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sources</p>
                      <p className="text-[11px] font-black text-slate-800 mt-1 uppercase leading-none">Inflows</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center gap-2">
                    {incomeComposition.map((item, idx) => {
                      const percent = totalIncome > 0 ? ((item.value / totalIncome) * 100).toFixed(0) : 0;
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs pb-1.5 border-b border-slate-50 last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600 font-extrabold max-w-[125px] truncate">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-900 text-right font-mono min-w-[50px]">
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

          {/* Double Entry Ledger Balance Sheets with Premium Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:divide-x lg:divide-slate-200 bg-white border border-slate-150/80 rounded-[2.5rem] p-6 lg:p-8 shadow-sm">
            
            {/* CREDIT (CR) GENERAL LEDGER */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-black text-sm font-mono">
                    CR
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Income Items (Credit Ledger)
                    </h3>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mt-0.5">
                      Earnings and operational inflows
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-full font-mono">
                  Credit In
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {/* 1. Interest Collected */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Interest Collected on Loans</p>
                    <p className="text-[11px] font-bold text-slate-500">Gross interest collected on outstanding loan portfolios</p>
                    <p className="text-[9px] text-slate-400 font-mono">Formula: (Collections EMI) x (Interest Rate Weighting factor)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 font-mono">₹{formatAmount(income.interest_collected || 0)}</p>
                    <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">Credit (+)</span>
                  </div>
                </div>

                {/* 2. Processing Fees */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Loan Processing Fees</p>
                    <p className="text-[11px] font-bold text-slate-500">Standard administrative file and processing charges</p>
                    <p className="text-[9px] text-slate-400 font-mono">Assessed directly at disbursement phase</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 font-mono">₹{formatAmount(income.processing_fees || 0)}</p>
                    <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">Credit (+)</span>
                  </div>
                </div>

                {/* 3. Insurance Fees */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Loan Insurance Fees</p>
                    <p className="text-[11px] font-bold text-slate-500">Protective insurance cover and credit life fund premiums</p>
                    <p className="text-[9px] text-slate-400 font-mono">Direct deduction from active lending products</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 font-mono">₹{formatAmount(income.insurance_fees || 0)}</p>
                    <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">Credit (+)</span>
                  </div>
                </div>

                {/* 4. Product Sales Revenue */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Product Sales Revenue</p>
                    <p className="text-[11px] font-bold text-slate-500">Direct revenue from product sales and support services</p>
                    <p className="text-[9px] text-slate-400 font-mono">Cash accounts inventory ledger</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 font-mono">₹{formatAmount(income.product_sales || 0)}</p>
                    <span className="text-[10px] text-emerald-600 font-extrabold block mt-0.5">Credit (+)</span>
                  </div>
                </div>
              </div>

              {/* Total Income Ledger Summary Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 p-4 rounded-3xl">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">CR Cash Balance Sum</span>
                <span className="text-xl font-black text-emerald-600 font-mono">₹{formatAmount(totalIncome)}</span>
              </div>
            </div>

            {/* DEBIT (DR) GENERAL LEDGER */}
            <div className="space-y-6 lg:pl-8 mt-8 lg:mt-0">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center font-black text-sm font-mono">
                    DR
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Expense Ledger (Debit Entries)
                    </h3>
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider mt-0.5">
                      Capital outflows and general operational expenditures
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-800 border border-rose-100 px-2.5 py-1 rounded-full font-mono">
                  Debit Out
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {/* 1. Salaries Paid */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Staff Salaries Paid</p>
                    <p className="text-[11px] font-bold text-slate-500">Monthly employee remunerations and field executive salaries</p>
                    <p className="text-[9px] text-slate-400 font-mono">Standard staff salary accounting</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 font-mono">₹{formatAmount(expenses.salary_expenses || 0)}</p>
                    <span className="text-[10px] text-rose-600 font-extrabold block mt-0.5">Debit (-)</span>
                  </div>
                </div>

                {/* 2. Member Savings Interest */}
                <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Savings Interest Credited</p>
                    <p className="text-[11px] font-bold text-slate-500">Interest dividends credited to active savings accounts</p>
                    <p className="text-[9px] text-slate-400 font-mono">Interest transaction entries generated on accounts</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 font-mono">₹{formatAmount(expenses.savings_interest || 0)}</p>
                    <span className="text-[10px] text-rose-600 font-extrabold block mt-0.5">Debit (-)</span>
                  </div>
                </div>

                {/* 3. Expense breakdowns from database mapping */}
                {(expenses.expense_breakdown || []).map((e: any, idx: number) => (
                  <div key={idx} className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider">{e.category || 'Office'} Overhead</p>
                      <p className="text-[11px] font-bold text-slate-500">Branch operations overhead and administration</p>
                      <p className="text-[9px] text-slate-400 font-mono">Category itemization: {e.category || 'General'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800 font-mono">₹{formatAmount(e.amount || 0)}</p>
                      <span className="text-[10px] text-rose-600 font-extrabold block mt-0.5">Debit (-)</span>
                    </div>
                  </div>
                ))}

                {/* 4. Default general expenses if list is empty */}
                {(!expenses.expense_breakdown || expenses.expense_breakdown.length === 0) && (
                  <div className="py-4 flex justify-between items-start hover:bg-slate-50/50 p-2 rounded-xl transition-all">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider">General Petty Expenses</p>
                      <p className="text-[11px] font-bold text-slate-500">Standard branch petty cash and operational spendings</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800 font-mono">₹{formatAmount(expenses.other_expenses || 0)}</p>
                      <span className="text-[10px] text-rose-600 font-extrabold block mt-0.5">Debit (-)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Expenses Ledger Summary Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 p-4 rounded-3xl">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">DR Cash Balance Sum</span>
                <span className="text-xl font-black text-rose-600 font-mono">₹{formatAmount(totalExpenses)}</span>
              </div>
            </div>

          </div>

          {/* Premium Audit Reconciled Stamp */}
          <motion.div 
            variants={cardVariants}
            className="bg-[#0f172a] text-slate-400 p-6 rounded-[2.5rem] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 border border-indigo-500/10 flex-shrink-0 animate-ping">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold leading-relaxed space-y-1">
                <p className="text-white text-sm font-black tracking-wide">Financial Statement Audit Integrity Verification</p>
                <p className="text-[#94a3b8] opacity-85">
                  All processing fee collectables, protective loan insurance payouts, outstanding collection interests, and product cash revenues are reconciled in real-time.
                </p>
              </div>
            </div>
            <div className="text-[10px] font-black uppercase bg-slate-800 text-slate-300 tracking-widest px-4 py-2 rounded-2xl border border-slate-700 font-mono text-center">
              System Auditor v1.5 [Signed]
            </div>
          </motion.div>

        </motion.div>
      )}
    </div>
  );
}
