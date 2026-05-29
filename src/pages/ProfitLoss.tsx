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
import { formatAmount, cn } from '../lib/utils';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger'>('overview');

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
      
      {/* Premium Navigation and Dynamic Filter Header - Compact Style */}
      <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-[#38bdf8] p-2 rounded-xl shadow-md border border-slate-800">
            <Calculator className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-950 tracking-tight flex items-center gap-2 leading-none">
              Profit & Loss Account
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live Audit Stream
              </span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Financial performance analysis and balance sheet tracking
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Selectors with labels */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-700 outline-none w-[110px] focus:ring-0 cursor-pointer"
            />
            <span className="text-slate-300 font-black text-[9px] uppercase tracking-wider">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-700 outline-none w-[110px] focus:ring-0 cursor-pointer"
            />
          </div>

          {(user?.role === 'superadmin' || user?.role === 'manager' || user?.role === 'dm' || user?.role === 'am') && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none max-w-[120px] truncate cursor-pointer bg-none"
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
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl text-[11px] font-black tracking-wider uppercase transition-all shadow-md active:scale-98"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">
            Recalculating ledger records, please wait...
          </p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="p-4 space-y-4 w-full"
        >

          {/* Premium Showcase Compact KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Income Card with Glowing Elements */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.2 } }}
              className="card-glowing-wrapper rounded-2xl cursor-pointer shadow-md shadow-emerald-500/10"
              style={{
                '--glow-color-1': '#34d399',
                '--glow-color-2': '#0ea5e9'
              } as React.CSSProperties}
            >
              <div className="card-glowing-inner bg-gradient-to-br from-emerald-600 via-emerald-750 to-teal-800 text-white p-4 overflow-hidden relative group/income flex flex-col justify-between h-full space-y-2 rounded-[14px]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full filter blur-2xl -mr-6 -mt-6 transition-transform group-hover/income:scale-125 duration-500"></div>
                <div className="relative z-10 flex flex-col justify-between h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-white tracking-wider bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
                      Gross Revenue / মোট রাজস্ব
                    </span>
                    <div className="p-1.5 bg-white/10 text-emerald-100 rounded-xl">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white tracking-tight font-mono">
                      ₹{formatAmount(totalIncome)}
                    </div>
                    <div className="text-[9px] font-extrabold text-emerald-100/90 uppercase tracking-widest mt-0.5">
                      TOTAL OPERATIONAL INFLOWS
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-100/80 font-semibold">
                    <span>Interest & Commissions</span>
                    <span className="font-extrabold text-white">
                      {incomeComposition.length} Sources / সোর্স
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Expense Card with Glowing Elements */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.2 } }}
              className="card-glowing-wrapper rounded-2xl cursor-pointer shadow-md shadow-rose-500/10"
              style={{
                '--glow-color-1': '#f43f5e',
                '--glow-color-2': '#f97316'
              } as React.CSSProperties}
            >
              <div className="card-glowing-inner bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 text-white p-4 overflow-hidden relative group/expense flex flex-col justify-between h-full space-y-2 rounded-[14px]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full filter blur-2xl -mr-6 -mt-6 transition-transform group-hover/expense:scale-125 duration-500"></div>
                <div className="relative z-10 flex flex-col justify-between h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-white tracking-wider bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
                      Gross Outflow / মোট ব্যয়
                    </span>
                    <div className="p-1.5 bg-white/10 text-rose-100 rounded-xl">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white tracking-tight font-mono">
                      ₹{formatAmount(totalExpenses)}
                    </div>
                    <div className="text-[9px] font-extrabold text-rose-100/90 uppercase tracking-widest mt-0.5">
                      TOTAL EXPENDITURES PAID
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-rose-100/80 font-semibold">
                    <span>Staff, Savings & Operations</span>
                    <span className="font-extrabold text-white">
                      {activeExpenses.length} Debits / ডেবিট
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Profit & Loss Card with Ultra Glow Premium Gradients */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.2 } }}
              className="card-glowing-wrapper rounded-2xl cursor-pointer shadow-md"
              style={{
                '--glow-color-1': isProfit ? '#3b82f6' : '#dc2626',
                '--glow-color-2': isProfit ? '#a855f7' : '#f43f5e'
              } as React.CSSProperties}
            >
              <div className={`card-glowing-inner p-4 overflow-hidden relative group/net flex flex-col justify-between h-full space-y-2 rounded-[14px] ${
                isProfit 
                  ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white' 
                  : 'bg-gradient-to-br from-red-950 via-rose-950 to-slate-950 text-white'
              }`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full filter blur-xl -mr-6 -mt-6 transition-transform group-hover/net:scale-125 duration-500"></div>
                <div className="relative z-10 flex flex-col justify-between h-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isProfit 
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}>
                      {isProfit ? 'Net Profit / নীট লাভ' : 'Net Loss / নীট লোকসান'}
                    </span>
                    <div className={`p-1.5 rounded-xl ${
                      isProfit ? 'bg-indigo-900/60 text-indigo-300' : 'bg-rose-900/60 text-rose-300'
                    }`}>
                      {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black tracking-tight font-mono text-white">
                      ₹{formatAmount(Math.abs(netProfit))}
                    </div>
                    <div className="text-[9px] font-extrabold text-slate-300 uppercase tracking-widest mt-0.5">
                      {isProfit ? 'NET OPERATING BALANCE' : 'NET OPERATING DEFICIT'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                    <span className="opacity-80">Profit Margin / মার্জিন</span>
                    <span className={`font-black tracking-wide px-2 py-0.5 rounded-md text-[10px] ${
                      isProfit ? 'bg-emerald-400/20 text-[#34d399]' : 'bg-rose-400/20 text-[#fca5a5]'
                    }`}>
                      {operatingMargin}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Compact Section Switcher Tabs to avoid vertical scroll completely */}
          <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl w-fit border border-slate-200/30">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                activeTab === 'overview'
                  ? "bg-slate-900 text-white shadow-md scale-100"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              <Activity className="w-3.5 h-3.5" />
              Overview / সারসংক্ষেপ
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all",
                activeTab === 'ledger'
                  ? "bg-slate-900 text-white shadow-md scale-100"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Detailed Ledger / লেজার রেজিস্টার
            </button>
          </div>

          {/* Tab Content 1: Overview and Charts */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Comparative Chart */}
              <div className="lg:col-span-7 bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Ledger Comparison Analytics
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">
                      Inflows, outflows, and net earnings compared.
                    </p>
                  </div>
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                </div>

                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                      <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '9px' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={45}>
                        {comparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Composition Chart */}
              <div className="lg:col-span-5 bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Revenue Composition
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">
                      Breakdown percentage of active revenue channels.
                    </p>
                  </div>
                  <LucidePieChart className="w-3.5 h-3.5 text-indigo-500" />
                </div>

                {incomeComposition.length === 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-center py-8 text-center text-slate-400">
                    <HelpCircle className="w-8 h-8 text-slate-300 mb-1" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      No revenue data for selection.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col sm:flex-row justify-around items-center gap-3">
                    <div className="w-[110px] h-[110px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={incomeComposition}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={48}
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
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Sources</p>
                        <p className="text-[9px] font-black text-slate-850 mt-0.5 uppercase leading-none">Inflows</p>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-1.5">
                      {incomeComposition.map((item, idx) => {
                        const percent = totalIncome > 0 ? ((item.value / totalIncome) * 100).toFixed(0) : 0;
                        return (
                          <div key={idx} className="flex justify-between items-center text-[10px] pb-1 border-b border-slate-50 last:border-b-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                              <span className="text-slate-600 font-extrabold max-w-[110px] truncate">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-extrabold text-slate-900 text-right font-mono min-w-[35px]">
                              {percent}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab Content 2: Raw CR/DR Ledgers */}
          {activeTab === 'ledger' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:divide-x lg:divide-slate-200 bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
              
              {/* CREDIT GENERAL LEDGER */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-black text-xs font-mono">
                      CR
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Income Items (Credit Ledger)
                      </h3>
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                        Earnings & Collections
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-full font-mono">
                    Credit In
                  </span>
                </div>

                <div className="divide-y divide-slate-100 text-xs text-slate-700">
                  {/* 1. Interest Collected */}
                  <div className="py-2.5 flex justify-between items-start hover:bg-slate-50/50 px-1 rounded-lg transition-all">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[11px]">Interest Collected on Loans</p>
                      <p className="text-[10px] font-bold text-slate-400">Total collection emi interest portions (Approved only)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800 font-mono">₹{formatAmount(income.interest_collected || 0)}</p>
                      <span className="text-[9px] text-emerald-600 font-black block mt-0.5">Credit (+)</span>
                    </div>
                  </div>

                  {/* 2. Processing Fees */}
                  <div className="py-2.5 flex justify-between items-start hover:bg-slate-50/50 px-1 rounded-lg transition-all">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[11px]">Loan Processing Fees</p>
                      <p className="text-[10px] font-bold text-slate-400">Standard file charges collected on disbursal date</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800 font-mono">₹{formatAmount(income.processing_fees || 0)}</p>
                      <span className="text-[9px] text-emerald-600 font-black block mt-0.5">Credit (+)</span>
                    </div>
                  </div>

                  {/* 3. Insurance Fees */}
                  <div className="py-2.5 flex justify-between items-start hover:bg-slate-50/50 px-1 rounded-lg transition-all">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[11px]">Loan Insurance Fees</p>
                      <p className="text-[10px] font-bold text-slate-400">Mandatory premium charges gathered on disbursal</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800 font-mono">₹{formatAmount(income.insurance_fees || 0)}</p>
                      <span className="text-[9px] text-emerald-600 font-black block mt-0.5">Credit (+)</span>
                    </div>
                  </div>

                  {/* 4. Product Sales */}
                  <div className="py-2.5 flex justify-between items-start hover:bg-slate-50/50 px-1 rounded-lg transition-all">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[11px]">Product Sales Revenue</p>
                      <p className="text-[10px] font-bold text-slate-400">Direct secondary revenue from cash products</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800 font-mono">₹{formatAmount(income.product_sales || 0)}</p>
                      <span className="text-[9px] text-emerald-600 font-black block mt-0.5">Credit (+)</span>
                    </div>
                  </div>
                </div>

                {/* CR Balance Sum */}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">CR Cash Balance Sum</span>
                  <span className="text-sm font-black text-emerald-600 font-mono">₹{formatAmount(totalIncome)}</span>
                </div>
              </div>

              {/* DEBIT GENERAL LEDGER */}
              <div className="space-y-4 lg:pl-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center font-black text-xs font-mono">
                      DR
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Expense Ledger (Debit Entries)
                      </h3>
                      <p className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">
                        Outflows & Office Bills
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-800 border border-rose-100 px-2 py-0.5 rounded-full font-mono">
                    Debit Out
                  </span>
                </div>

                <div className="divide-y divide-slate-100 text-xs text-slate-700">
                  {/* 1. Salaries Paid */}
                  <div className="py-2.5 flex justify-between items-start hover:bg-slate-50/50 px-1 rounded-lg transition-all">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[11px]">Staff Salaries Paid</p>
                      <p className="text-[10px] font-bold text-slate-400 font-medium">Internal payroll and office staffing payouts</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800 font-mono">₹{formatAmount(expenses.salary_expenses || 0)}</p>
                      <span className="text-[9px] text-rose-600 font-black block mt-0.5">Debit (-)</span>
                    </div>
                  </div>

                  {/* 2. Savings Interest Paid */}
                  <div className="py-2.5 flex justify-between items-start hover:bg-slate-50/50 px-1 rounded-lg transition-all">
                    <div>
                      <p className="font-black text-slate-800 uppercase text-[11px]">Savings Interest Credited</p>
                      <p className="text-[10px] font-bold text-slate-400">Dividends credited to members' savings balances</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-800 font-mono">₹{formatAmount(expenses.savings_interest || 0)}</p>
                      <span className="text-[9px] text-rose-600 font-black block mt-0.5">Debit (-)</span>
                    </div>
                  </div>

                  {/* Office expense breakdowns */}
                  {(expenses.expense_breakdown || []).map((e: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex justify-between items-start hover:bg-slate-50/50 px-1 rounded-lg transition-all">
                      <div>
                        <p className="font-black text-slate-800 uppercase text-[11px]">{e.category || 'Office'} Overheads</p>
                        <p className="text-[10px] font-bold text-slate-400">Category-specific branch expenditures</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-800 font-mono">₹{formatAmount(e.amount || 0)}</p>
                        <span className="text-[9px] text-rose-600 font-black block mt-0.5">Debit (-)</span>
                      </div>
                    </div>
                  ))}

                  {(!expenses.expense_breakdown || expenses.expense_breakdown.length === 0) && (
                    <div className="py-2.5 flex justify-between items-start hover:bg-slate-50/50 px-1 rounded-lg transition-all">
                      <div>
                        <p className="font-black text-slate-800 uppercase text-[11px]">General Petty Expenses</p>
                        <p className="text-[10px] font-bold text-slate-400">Regular petty and branch overhead charges</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-800 font-mono">₹{formatAmount(expenses.other_expenses || 0)}</p>
                        <span className="text-[9px] text-rose-600 font-black block mt-0.5">Debit (-)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* DR Balance Sum */}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">DR Cash Balance Sum</span>
                  <span className="text-sm font-black text-rose-600 font-mono">₹{formatAmount(totalExpenses)}</span>
                </div>
              </div>

            </div>
          )}

          {/* Compact Verified Stamp Footer */}
          <motion.div 
            variants={cardVariants}
            className="bg-[#0f172a] text-slate-400 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10 shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-bold leading-normal">
                <p className="text-white text-xs font-black tracking-wide">Financial Statement Audit Integrity Verification</p>
                <span className="text-[#94a3b8] opacity-85 block mt-0.5">
                  All disbursal fees, approved repayments, local staffing expenditures and savings interest allocations are audited and reconciled.
                </span>
              </div>
            </div>
            <div className="text-[9px] font-black uppercase bg-slate-800 text-slate-300 tracking-widest px-3 py-1.5 rounded-xl border border-slate-700 font-mono shrink-0">
              Auditor v1.5 [Signed]
            </div>
          </motion.div>

        </motion.div>
      )}
    </div>
  );
}
