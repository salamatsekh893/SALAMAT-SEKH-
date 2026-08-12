import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, UsersRound, Banknote, Wallet, Coins, Clock, CheckSquare, 
  TrendingUp, Calendar, Calculator, ArrowRightLeft, Users, Sun, ClipboardList, CheckCircle, Activity, ShieldCheck, FileSpreadsheet, Download
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';
import MonthlyDayBookExportModal from '../MonthlyDayBookExportModal';

interface SuperAdminDashboardProps {
  user: any;
  stats: any;
  hasPermission: (permission: string) => boolean;
}

export default function SuperAdminDashboard({ user, stats, hasPermission }: SuperAdminDashboardProps) {
  const navigate = useNavigate();
  const [showMonthlyDBModal, setShowMonthlyDBModal] = useState(false);

  const statCards = [
    { name: 'Total Branches', value: stats?.branches || 0, icon: Building2 },
    { name: 'Total Customers', value: stats?.customers || 0, icon: UsersRound },
    { name: 'Pending Loan Apps', value: stats?.pendingLoans || 0, icon: Clock },
    { name: 'Awaiting Disbursal', value: stats?.approvedLoans || 0, icon: CheckSquare },
    { name: 'Active Loans', value: stats?.activeLoans || 0, icon: Banknote },
    { name: "Today Closing Balance", value: `₹${formatAmount(stats?.totalTodayCloseBalance ?? stats?.todayCloseBalance ?? 0)}`, icon: Wallet, highlight: true },
    { name: 'Last Close Balance', value: `₹${formatAmount(stats?.totalBranchCloseBalance || 0)}`, icon: Coins },
    { name: 'Total Bank Balance', value: `₹${formatAmount(stats?.totalBankBalance || 0)}`, icon: Building2 },
    { name: 'Total Capital', value: `₹${formatAmount(stats?.totalCapital || 0)}`, icon: Coins },
    { name: 'Total Collection', value: `₹${formatAmount(stats?.collections || 0)}`, icon: Wallet },
  ];

  return (
    <div className="flex flex-col gap-4 pb-10 bg-slate-50/50 min-h-screen">
      {/* Welcome Hero Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 shadow-xl border border-indigo-500/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-widest w-fit mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> HQ Control Center
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Super Admin Dashboard</h1>
            <p className="text-indigo-200 text-xs mt-1 max-w-xl font-medium">
              Aljooya Subidha Services-এর হেড অফিস কন্ট্রোল পোর্টাল। এখান থেকে সমগ্র কোম্পানির সমস্ত ব্রাঞ্চ, কালেকশন এবং পোর্টফোলিও পর্যবেক্ষণ করতে পারবেন।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowMonthlyDBModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-2xl shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all text-xs font-black cursor-pointer border border-emerald-400/40"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-100" />
              <span>Disbursement & DayBook Excel</span>
            </button>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-black text-indigo-200 uppercase tracking-widest">
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flipkart Style Animated Special Closing Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-0.5 shadow-xl shadow-orange-500/10 group"
      >
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-yellow-300/30 rounded-full blur-2xl animate-pulse"></div>
        <div className="relative z-10 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 rounded-[14px] p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0 group-hover:scale-110 transition-transform">
              <Wallet className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400/20 border border-amber-400/40 text-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  আজকের ক্যাশ ক্লোজিং ব্যালেন্স (Today's Closing Balance)
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                  Real-time
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  ₹{formatAmount(stats?.totalTodayCloseBalance ?? stats?.todayCloseBalance ?? 0)}
                </span>
                <span className="text-xs text-amber-300/80 font-semibold">
                  (সমগ্র ব্রাঞ্চের আজকের লাইভ স্থিতি)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2 flex flex-col min-w-[130px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">সর্বশেষ ক্লোজড ব্যালেন্স</span>
              <span className="text-sm font-black text-amber-300 mt-0.5">
                ₹{formatAmount(stats?.totalBranchCloseBalance || 0)}
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2 flex flex-col min-w-[120px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">ব্যাংক ব্যালেন্স</span>
              <span className="text-sm font-black text-emerald-400 mt-0.5">
                ₹{formatAmount(stats?.totalBankBalance || 0)}
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2 flex flex-col min-w-[120px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">মোট কালেকশন</span>
              <span className="text-sm font-black text-sky-400 mt-0.5">
                ₹{formatAmount(stats?.collections || 0)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid of Stats */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.04 }
          }
        }}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3"
      >
        {statCards.map((stat, idx) => {
          if (stat.name === 'Total Branches' && !hasPermission('sub_dash_stat_branches')) return null;
          if (stat.name === 'Total Customers' && !hasPermission('sub_dash_stat_customers')) return null;
          if (stat.name === 'Pending Loan Apps' && !hasPermission('sub_dash_stat_loans_pending')) return null;
          if (stat.name === 'Awaiting Disbursal' && !hasPermission('sub_dash_stat_loans_awaiting')) return null;
          if (stat.name === 'Active Loans' && !hasPermission('sub_dash_stat_loans_active')) return null;
          if (stat.name === 'Total Bank Balance' && !hasPermission('sub_dash_stat_bank')) return null;
          if (stat.name === 'Total Capital' && !hasPermission('sub_dash_stat_capital')) return null;
          if (stat.name === 'Total Collection' && !hasPermission('sub_dash_stat_collection')) return null;

          const isTodayCard = stat.name === "Today Closing Balance";

          return (
            <motion.div 
              key={stat.name} 
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className={cn(
                "group relative p-2.5 sm:p-3 rounded-2xl shadow-xs border flex justify-between items-center transition-all overflow-hidden min-h-[68px] sm:min-h-[76px] bg-white hover:shadow-md",
                isTodayCard ? "bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-300 ring-2 ring-amber-400/20" :
                idx % 4 === 0 ? "border-sky-200/60 hover:border-sky-300" :
                idx % 4 === 1 ? "border-emerald-200/60 hover:border-emerald-300" :
                idx % 4 === 2 ? "border-orange-200/60 hover:border-orange-300" :
                "border-indigo-200/60 hover:border-indigo-300"
              )}
            >
              <div className={cn(
                "absolute top-0 right-0 w-20 h-20 rounded-full blur-xl -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-150",
                isTodayCard ? "bg-amber-500/20" :
                idx % 4 === 0 ? "bg-sky-500/10" :
                idx % 4 === 1 ? "bg-emerald-500/10" :
                idx % 4 === 2 ? "bg-orange-500/10" :
                "bg-indigo-500/10"
              )}></div>
              
              <div className="card-info relative z-10 pr-1">
                <h3 className={cn(
                  "text-[9px] sm:text-[10px] mb-0.5 font-bold uppercase tracking-wider line-clamp-1",
                  isTodayCard ? "text-amber-800" : "text-slate-500"
                )}>{stat.name}</h3>
                <h1 className={cn(
                  "text-sm sm:text-lg font-black tracking-tight",
                  isTodayCard ? "text-amber-950" :
                  idx % 4 === 0 ? "text-sky-950" :
                  idx % 4 === 1 ? "text-emerald-950" :
                  idx % 4 === 2 ? "text-orange-950" :
                  "text-indigo-950"
                )}>{stat.value}</h1>
              </div>
              <div className={cn(
                "transition-transform group-hover:scale-110 group-hover:-rotate-6 duration-200 ml-1.5 relative z-10 shrink-0 p-2 rounded-xl",
                isTodayCard ? "bg-amber-500 text-slate-950 font-black shadow-xs" :
                idx % 4 === 0 ? "bg-sky-50 text-sky-600" :
                idx % 4 === 1 ? "bg-emerald-50 text-emerald-600" :
                idx % 4 === 2 ? "bg-orange-50 text-orange-600" :
                "bg-indigo-50 text-indigo-600"
              )}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Financial Portfolio Overview */}
      {hasPermission('sub_dash_portfolio') && stats?.financeStats && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a] rounded-3xl p-5 shadow-2xl border border-slate-800/60 relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Banknote className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Active Portfolio Overview <span className="text-indigo-400/80 font-bold ml-1 text-sm">(সমগ্র পোর্টফোলিও)</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">কোম্পানির মোট আসোল, লাভ এবং বকেয়া তথ্যাদি</p>
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/5 flex flex-col items-end shadow-inner">
              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest text-right mb-0.5">Running Outstanding</span>
              <span className="block text-xl sm:text-2xl font-black text-emerald-400 leading-none">
                ₹{formatAmount(Math.round(stats?.financeStats?.totalOutstanding || 0))}
              </span>
            </div>
          </div>

          {/* Collection Progress Bar */}
          <div className="relative z-10 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Collection Progress</span>
                <span className="text-white font-black text-sm">
                  ₹{formatAmount(Math.round(stats?.financeStats?.totalPaid || 0))} 
                  <span className="text-slate-500 font-bold mx-1">/</span> 
                  <span className="text-slate-300">₹{formatAmount(Math.round(stats?.financeStats?.totalRepayment || 0))}</span>
                </span>
              </div>
              <span className="text-emerald-400 font-black text-xl">
                {stats?.financeStats?.totalRepayment > 0 ? Math.round(((stats?.financeStats?.totalPaid || 0) / stats?.financeStats?.totalRepayment) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats?.financeStats?.totalRepayment > 0 ? Math.min(100, ((stats?.financeStats?.totalPaid || 0) / stats?.financeStats?.totalRepayment) * 100) : 0}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full relative"
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 backdrop-blur-sm transition-all hover:bg-slate-800/60 group">
              <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1 group-hover:text-slate-300">Total Principal</span>
              <span className="text-lg sm:text-xl font-black text-white">₹{formatAmount(Math.round(stats?.financeStats?.totalPrincipal || 0))}</span>
            </div>
            <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-4 backdrop-blur-sm transition-all hover:bg-indigo-900/30 group">
              <span className="block text-[9px] uppercase font-bold text-indigo-400 tracking-widest mb-1 group-hover:text-indigo-300">Total Interest</span>
              <span className="text-lg sm:text-xl font-black text-indigo-200">₹{formatAmount(Math.round(stats?.financeStats?.totalInterest || 0))}</span>
            </div>
            <div className="bg-rose-900/20 border border-rose-500/20 rounded-2xl p-4 backdrop-blur-sm transition-all hover:bg-rose-900/30 group">
              <span className="block text-[9px] uppercase font-bold text-rose-400 tracking-widest mb-1 group-hover:text-rose-300">Interest Due (লাভ বকেয়া)</span>
              <span className="text-lg sm:text-xl font-black text-rose-300">
                ₹{formatAmount(Math.round((stats?.financeStats?.totalInterest || 0) - ((stats?.financeStats?.totalPaid || 0) * ((stats?.financeStats?.totalInterest || 0) / (stats?.financeStats?.totalRepayment || 1)))))}
              </span>
            </div>
            <div className="bg-orange-900/20 border border-orange-500/20 rounded-2xl p-4 backdrop-blur-sm transition-all hover:bg-orange-900/30 group">
              <span className="block text-[9px] uppercase font-bold text-orange-400 tracking-widest mb-1 group-hover:text-orange-300 text-nowrap">Principal Due (আসোল বকেয়া)</span>
              <span className="text-lg sm:text-xl font-black text-orange-300">
                ₹{formatAmount(Math.round((stats?.financeStats?.totalPrincipal || 0) - ((stats?.financeStats?.totalPaid || 0) * ((stats?.financeStats?.totalPrincipal || 0) / (stats?.financeStats?.totalRepayment || 1)))))}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Branch-wise Cash Closing Balances Breakdown */}
      {stats?.branchCloseBalances && stats.branchCloseBalances.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-100/80 rounded-2xl text-emerald-600">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
                  ব্রাঞ্চ-ভিত্তিক ক্লোজিং ব্যালেন্স (Branch Closing Balances)
                </h3>
                <p className="text-xs text-slate-500 font-medium">প্রত্যেক ব্রাঞ্চের ক্যাশ ডে বুকের সর্বশেষ হিসাব স্থিতি</p>
              </div>
            </div>
            <div className="text-left sm:text-right bg-emerald-50 px-3.5 py-1.5 rounded-2xl border border-emerald-200/60">
              <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block">মোট কন্টেইনার ক্লোজিং ব্যালেন্স</span>
              <span className="text-base font-black text-emerald-700 leading-none">₹{formatAmount(stats?.totalBranchCloseBalance || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {stats.branchCloseBalances.map((b: any) => (
              <div 
                key={b.branch_id}
                className="p-3.5 bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200/80 rounded-2xl flex justify-between items-center shadow-xs hover:border-emerald-300 transition-all"
              >
                <div>
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{b.branch_name}</span>
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-medium text-slate-500">
                      {b.last_date ? `তারিখ: ${b.last_date}` : 'রেকর্ড নেই'}
                    </span>
                    {b.last_status && b.last_status !== 'N/A' && (
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase",
                        b.last_status === 'closed' ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {b.last_status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-emerald-700 block">
                    ₹{formatAmount(b.closing_balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions (HQ focused) */}
      <div>
        <h3 className="text-[11px] font-black text-slate-500 mb-4 tracking-widest uppercase flex items-center gap-1.5 pl-1">
          <Activity className="w-4 h-4 text-indigo-500" /> Superadmin Quick Console
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {hasPermission('sub_dash_quick_close') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-rose-300 hover:bg-rose-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/loans/closed')}
            >
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center mb-2 group-hover:bg-rose-500 transition-colors">
                <CheckSquare className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-rose-700">Closed Loans</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_loan') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/loans/new')}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mb-2 group-hover:bg-indigo-500 transition-colors">
                <Banknote className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-indigo-700">New Loan</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_col') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/collections')}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mb-2 group-hover:bg-emerald-500 transition-colors">
                <Wallet className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-emerald-700">Collection</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_col') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-cyan-300 hover:bg-cyan-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/collections/daily-demand')}
            >
              <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center mb-2 group-hover:bg-cyan-500 transition-colors">
                <Activity className="w-4 h-4 text-cyan-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-cyan-700">Daily Demand</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_member') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/members/new')}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2 group-hover:bg-blue-500 transition-colors">
                <UsersRound className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-blue-700">New Member</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_group_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-300 hover:bg-purple-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/shifting/group')}
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mb-2 group-hover:bg-purple-500 transition-colors">
                <Users className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-purple-700">Group Shift</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_staff_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-pink-300 hover:bg-pink-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/shifting/staff')}
            >
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center mb-2 group-hover:bg-pink-500 transition-colors">
                <ArrowRightLeft className="w-4 h-4 text-pink-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-pink-700">Staff Shift</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_travel_log') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/travel/log')}
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-2 group-hover:bg-slate-600 transition-colors">
                <ClipboardList className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-slate-800">Travel Log</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_travel_approve') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-300 hover:bg-amber-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/travel/approvals')}
            >
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mb-2 group-hover:bg-amber-500 transition-colors">
                <CheckCircle className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-amber-700">Approvals</span>
            </button>
          )}

          {hasPermission('sub_acc_daybook') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-fuchsia-300 hover:bg-fuchsia-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/accounts/daybook')}
            >
              <div className="w-8 h-8 rounded-full bg-fuchsia-100 flex items-center justify-center mb-2 group-hover:bg-fuchsia-500 transition-colors">
                <Calculator className="w-4 h-4 text-fuchsia-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-fuchsia-700">Day Book</span>
            </button>
          )}

          <button 
            className="flex flex-col items-center justify-center p-3 bg-white border border-emerald-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-400 hover:bg-emerald-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
            onClick={() => setShowMonthlyDBModal(true)}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mb-2 group-hover:bg-emerald-600 transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-emerald-800">Disbursement & DB Excel</span>
          </button>

          {hasPermission('sub_dash_quick_day_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-300 hover:bg-orange-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/shifting/day')}
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mb-2 group-hover:bg-orange-500 transition-colors">
                <Sun className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-orange-700">Day Shift</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_branch_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-400 hover:bg-indigo-50/50 active:scale-[0.98] transition-all group min-h-[80px]"
              onClick={() => navigate('/shifting/branch')}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mb-2 group-hover:bg-indigo-600 transition-colors">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider text-center line-clamp-1 leading-none group-hover:text-indigo-800">Branch Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Collection Chart Trend */}
      {stats?.trends && stats.trends.length > 0 && hasPermission('sub_dash_chart_trend') && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-black text-slate-500 tracking-widest uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Collection Trend <span className="text-slate-400 font-bold">(সংগ্রহের ট্রেন্ড)</span>
            </h3>
            <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold">
              Last 6 Months
            </div>
          </div>
          <div className="flex-1 h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorColAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} dx={-10} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px', fontWeight: 'bold' }} 
                  itemStyle={{ color: '#4f46e5', fontWeight: 900 }}
                  labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorColAdmin)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Day Book Export Modal */}
      <MonthlyDayBookExportModal
        isOpen={showMonthlyDBModal}
        onClose={() => setShowMonthlyDBModal(false)}
        user={user}
      />
    </div>
  );
}
