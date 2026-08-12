import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, UsersRound, Banknote, Wallet, Coins, Clock, CheckSquare, 
  Calendar, ClipboardList, CheckCircle, Activity, ShieldCheck, FileSpreadsheet
} from 'lucide-react';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';
import MonthlyDayBookExportModal from '../MonthlyDayBookExportModal';

interface EmployeeDashboardProps {
  user: any;
  stats: any;
  hasPermission: (permission: string) => boolean;
}

export default function EmployeeDashboard({ user, stats, hasPermission }: EmployeeDashboardProps) {
  const navigate = useNavigate();
  const [showMonthlyDBModal, setShowMonthlyDBModal] = useState(false);

  const getRoleLabel = () => {
    switch(user?.role) {
      case 'dm': return 'Divisional Manager Dashboard';
      case 'am': return 'Area Manager Dashboard';
      case 'fo': return 'Field Officer Console';
      default: return 'Employee Console';
    }
  };

  const statCards = [
    { name: 'Customers Assigned', value: stats?.customers || 0, icon: UsersRound },
    { name: 'Pending Approvals', value: stats?.pendingLoans || 0, icon: Clock },
    { name: 'Active Loans', value: stats?.activeLoans || 0, icon: Banknote },
    { name: "Today Closing Balance", value: `₹${formatAmount(stats?.todayCloseBalance ?? stats?.branchCloseBalance ?? 0)}`, icon: Wallet },
    { name: 'Last Close Balance', value: `₹${formatAmount(stats?.branchCloseBalance || 0)}`, icon: Coins },
    { name: 'Total Collection', value: `₹${formatAmount(stats?.collections || 0)}`, icon: Wallet },
  ];

  return (
    <div className="flex flex-col gap-3 sm:gap-4 pb-10 bg-slate-100/60 min-h-screen">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-[#172337] via-[#1e2e4a] to-[#2874f0] rounded-2xl p-4 sm:p-5 shadow-lg border border-blue-400/30 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5 bg-yellow-400/20 border border-yellow-400/40 px-2.5 py-0.5 rounded-full text-yellow-300 text-[10px] font-black uppercase tracking-widest w-fit mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" /> {getRoleLabel()}
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">Welcome back, {user?.name}</h1>
            <p className="text-blue-100/90 text-xs mt-0.5 max-w-xl font-medium">
              আপনার ফিল্ড ডিউটি, দৈনিক কিস্তি সংগ্রহ, এবং ট্রাভেলিং লগ মডিউলগুলো নিচের কুইক অ্যাকশন থেকে সহজে অ্যাক্সেস করুন।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowMonthlyDBModal(true)}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-md hover:shadow-emerald-500/20 active:scale-95 transition-all text-xs font-black cursor-pointer border border-emerald-400/40"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-100" />
              <span>Disbursement & DB Excel</span>
            </button>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 shadow-inner">
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
                  আজকের ক্যাশ ক্লোজিং ব্যালেন্স (Today's Closing Balance)
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                  Real-time
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  ₹{formatAmount(stats?.todayCloseBalance ?? stats?.branchCloseBalance ?? 0)}
                </span>
                <span className="text-[11px] text-yellow-200/80 font-medium hidden sm:inline">
                  (আজকের ডে বুকের চলমান হিসাব স্থিতি)
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
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-1.5 flex flex-col min-w-[110px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">মোট কালেকশন</span>
              <span className="text-xs sm:text-sm font-black text-sky-400 mt-0.5">
                ₹{formatAmount(stats?.collections || 0)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid of Stats - Compact & High Density */}
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
                "border-slate-200 hover:border-indigo-400"
              )}
            >
              <div className="absolute right-0 top-0 -mt-2 -mr-2 w-16 h-16 bg-blue-500/10 rounded-full blur-lg transform group-hover:scale-125 transition-transform duration-300 pointer-events-none"></div>
              
              <div className="card-info relative z-10 pr-1">
                <h3 className={cn(
                  "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider line-clamp-1 mb-0.5",
                  isTodayCard ? "text-amber-800" : "text-slate-500"
                )}>{stat.name}</h3>
                <h1 className={cn(
                  "text-sm sm:text-lg font-black tracking-tight",
                  isTodayCard ? "text-white" : "text-slate-900"
                )}>{stat.value}</h1>
              </div>
              <div className={cn(
                "transition-transform group-hover:scale-110 group-hover:-rotate-6 duration-200 ml-1.5 relative z-10 shrink-0 p-2 rounded-xl",
                isTodayCard ? "bg-white/20 text-white font-black" :
                idx % 2 === 0 ? "bg-blue-50 text-blue-600" :
                "bg-indigo-50 text-indigo-600"
              )}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Quick Actions (Employee Focused) */}
      <div>
        <h3 className="text-xs font-black text-slate-500 mb-3 tracking-widest uppercase flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-blue-500" /> Employee Quick Console
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-2">
          {hasPermission('sub_dash_quick_col') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 border border-emerald-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
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

          {hasPermission('sub_dash_quick_travel_log') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-700/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/travel/log')}
            >
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Travel Log</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_travel_approve') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-orange-500 to-orange-600 border border-orange-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/travel/approvals')}
            >
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Approvals</span>
            </button>
          )}
        </div>
      </div>

      <MonthlyDayBookExportModal 
        isOpen={showMonthlyDBModal} 
        onClose={() => setShowMonthlyDBModal(false)} 
        user={user}
      />
    </div>
  );
}
