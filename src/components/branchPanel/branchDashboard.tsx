import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, UsersRound, Banknote, Wallet, Coins, Clock, CheckSquare, 
  TrendingUp, Calendar, Calculator, ArrowRightLeft, Users, Sun, ClipboardList, CheckCircle, Activity, FileSpreadsheet
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';
import MonthlyDayBookExportModal from '../MonthlyDayBookExportModal';

interface BranchDashboardProps {
  user: any;
  stats: any;
  hasPermission: (permission: string) => boolean;
}

export default function BranchDashboard({ user, stats, hasPermission }: BranchDashboardProps) {
  const navigate = useNavigate();
  const [showMonthlyDBModal, setShowMonthlyDBModal] = useState(false);

  const statCards = [
    { name: 'Branch Customers', value: stats?.customers || 0, icon: UsersRound },
    { name: 'Pending Loan Apps', value: stats?.pendingLoans || 0, icon: Clock },
    { name: 'Awaiting Disbursal', value: stats?.approvedLoans || 0, icon: CheckSquare },
    { name: 'Active Loans', value: stats?.activeLoans || 0, icon: Banknote },
    { name: "Today Closing Balance", value: `₹${formatAmount(stats?.todayCloseBalance ?? stats?.branchCloseBalance ?? 0)}`, icon: Wallet },
    { name: 'Last Close Balance', value: `₹${formatAmount(stats?.branchCloseBalance || 0)}`, icon: Coins },
    { name: 'Total Collection', value: `₹${formatAmount(stats?.collections || 0)}`, icon: Wallet },
  ];

  return (
    <div className="flex flex-col gap-3 sm:gap-4 pb-10 bg-slate-100/60 min-h-screen">
      {/* Welcome Hero Banner with Branch Info */}
      <div className="relative bg-gradient-to-r from-[#172337] via-[#1e2e4a] to-[#2874f0] rounded-2xl p-4 sm:p-5 shadow-lg border border-blue-400/30 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/40 px-2.5 py-0.5 rounded-full text-yellow-300 text-[10px] font-black uppercase tracking-widest w-fit mb-2">
              <Building2 className="w-3.5 h-3.5 text-yellow-400" /> Branch Command Center
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">{user?.branch_name || 'Branch Office'}</h1>
            <p className="text-blue-100/90 text-xs mt-0.5 max-w-xl font-medium">
              আপনার ব্রাঞ্চের দৈনিক কালেকশন, নতুন মেম্বার অ্যাডমিশন এবং ঋণ আবেদনসমূহের সর্বশেষ অবস্থা এখান থেকে পরিচালনা করুন।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowMonthlyDBModal(true)}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-md hover:shadow-emerald-500/20 active:scale-95 transition-all text-xs font-black cursor-pointer border border-emerald-400/40"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-100" />
              <span>Disbursement & DayBook Excel</span>
            </button>
            {stats?.branchWalletBalance !== undefined && (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 shadow-inner text-yellow-300 cursor-pointer" onClick={() => navigate('/accounts/branch-wallet')}>
                <Wallet className="w-4 h-4 text-yellow-400" />
                <div className="flex flex-col">
                  <span className="text-[7px] font-black uppercase tracking-wider text-yellow-200/90 leading-none">ওয়ালেট ব্যালেন্স</span>
                  <span className="text-xs sm:text-sm font-black mt-0.5 leading-none text-white">₹{formatAmount(stats?.branchWalletBalance || 0)}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-yellow-400/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-yellow-400/30 shadow-inner text-yellow-300">
              <Wallet className="w-4 h-4 text-yellow-400" />
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase tracking-wider text-yellow-300 leading-none">আজকের ক্লোজিং ব্যালেন্স</span>
                <span className="text-xs sm:text-sm font-black mt-0.5 leading-none text-white">₹{formatAmount(stats?.todayCloseBalance ?? stats?.branchCloseBalance ?? 0)}</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15">
              <Calendar className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Glossy Animated Special Closing Balance Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.99, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2874f0] via-[#1a5bc4] to-[#172337] p-0.5 shadow-lg border border-blue-400/40 group"
      >
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-yellow-400/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="relative z-10 bg-[#172337]/90 backdrop-blur-md rounded-[14px] p-3.5 sm:p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl text-slate-950 font-black shadow-md shrink-0 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"></span>
                  আজকের ব্রাঞ্চ ক্যাশ ক্লোজিং ব্যালেন্স
                </span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                  Live Today
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  ₹{formatAmount(stats?.todayCloseBalance ?? stats?.branchCloseBalance ?? 0)}
                </span>
                <span className="text-[11px] text-yellow-200/80 font-medium hidden sm:inline">
                  (ব্রাঞ্চের আজকের চলমান ক্যাশ ইন-হ্যান্ড)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-0.5 md:pb-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-700/60">
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-1.5 flex flex-col min-w-[120px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">সর্বশেষ ক্লোজড ব্যালেন্স</span>
              <span className="text-xs sm:text-sm font-black text-yellow-300 mt-0.5">
                ₹{formatAmount(stats?.branchCloseBalance || 0)}
              </span>
            </div>
            {stats?.branchWalletBalance !== undefined && (
              <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-1.5 flex flex-col min-w-[110px] cursor-pointer" onClick={() => navigate('/accounts/branch-wallet')}>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">ওয়ালেট ব্যালেন্স</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5">
                  ₹{formatAmount(stats?.branchWalletBalance || 0)}
                </span>
              </div>
            )}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-1.5 flex flex-col min-w-[110px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">মোট কালেকশন</span>
              <span className="text-xs sm:text-sm font-black text-sky-400 mt-0.5">
                ₹{formatAmount(stats?.collections || 0)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards - Compact & High Density */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.03 }
          }
        }}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5"
      >
        {statCards.map((stat, idx) => {
          const isTodayCard = stat.name === "Today Closing Balance";

          return (
            <motion.div 
              key={stat.name} 
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -2, transition: { duration: 0.12 } }}
              className={cn(
                "group relative p-2 sm:p-2.5 rounded-xl shadow-2xs border flex justify-between items-center transition-all overflow-hidden min-h-[58px] sm:min-h-[64px] bg-white hover:shadow-md cursor-pointer",
                isTodayCard ? "bg-gradient-to-br from-amber-50 to-orange-50/80 border-amber-300 ring-1 ring-amber-400/30" :
                idx % 2 === 0 ? "border-slate-200 hover:border-blue-400" :
                "border-slate-200 hover:border-emerald-400"
              )}
            >
              <div className="absolute right-0 top-0 -mt-2 -mr-2 w-16 h-16 bg-blue-500/10 rounded-full blur-lg transform group-hover:scale-125 transition-transform duration-300 pointer-events-none"></div>
              
              <div className="card-info relative z-10 pr-1">
                <h3 className={cn(
                  "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider line-clamp-1 mb-0.5",
                  isTodayCard ? "text-amber-800" : "text-slate-500"
                )}>{stat.name}</h3>
                <h1 className={cn(
                  "text-xs sm:text-base font-black tracking-tight leading-none",
                  isTodayCard ? "text-amber-950" : "text-slate-900"
                )}>{stat.value}</h1>
              </div>
              <div className={cn(
                "transition-transform group-hover:scale-110 duration-200 ml-1 relative z-10 shrink-0 p-1.5 sm:p-2 rounded-lg",
                isTodayCard ? "bg-amber-400 text-slate-950 font-black shadow-2xs" :
                idx % 2 === 0 ? "bg-blue-50 text-blue-600" :
                "bg-emerald-50 text-emerald-600"
              )}>
                <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xs font-black text-slate-500 mb-3 tracking-widest uppercase flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-500" /> Branch Quick Console
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-7 gap-2">
          {hasPermission('sub_dash_quick_loan') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 border border-emerald-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/loans/new')}
            >
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">New Loan</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_col') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-teal-500 to-teal-600 border border-teal-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/collections')}
            >
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Collection</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_col') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 border border-cyan-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/collections/daily-demand')}
            >
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Daily Demand</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_member') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-blue-500 to-blue-600 border border-blue-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/members/new')}
            >
              <UsersRound className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">New Member</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_group_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-purple-500 to-purple-600 border border-purple-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/shifting/group')}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Group Shift</span>
            </button>
          )}

          {hasPermission('sub_acc_daybook') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 border border-fuchsia-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/accounts/daybook')}
            >
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Day Book</span>
            </button>
          )}

          <button 
            className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-emerald-600 to-teal-700 border border-emerald-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16 cursor-pointer"
            onClick={() => setShowMonthlyDBModal(true)}
          >
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
            <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Disbursement & DB Excel</span>
          </button>

          {hasPermission('sub_dash_quick_day_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-amber-500 to-amber-600 border border-amber-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/shifting/day')}
            >
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Day Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Collection Chart Trend */}
      {stats?.trends && stats.trends.length > 0 && hasPermission('sub_dash_chart_trend') && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-xs font-black text-slate-500 mb-4 tracking-widest uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Branch Collection Trend (কালেকশন গ্রাফ)
          </h3>
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trends}>
                <defs>
                  <linearGradient id="colorColBranch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dx={-10} tickFormatter={(val) => `₹${val}`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorColBranch)" />
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
