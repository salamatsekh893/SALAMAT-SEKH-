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
    <div className="flex flex-col gap-4 pb-10">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 shadow-xl border border-blue-500/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full text-blue-300 text-[10px] font-black uppercase tracking-widest w-fit mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> {getRoleLabel()}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Welcome back, {user?.name}</h1>
            <p className="text-blue-200 text-xs mt-1 max-w-xl font-medium">
              আপনার ফিল্ড ডিউটি, দৈনিক কিস্তি সংগ্রহ, এবং ট্রাভেলিং লগ মডিউলগুলো নিচের কুইক অ্যাকশন থেকে সহজে অ্যাক্সেস করুন।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowMonthlyDBModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-2xl shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all text-xs font-black cursor-pointer border border-emerald-400/40"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-100" />
              <span>Disbursement & DB Excel</span>
            </button>
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-black text-blue-200 uppercase tracking-widest">
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flipkart Style Animated Special Closing Balance Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-xl shadow-blue-500/10 group"
      >
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-300/30 rounded-full blur-2xl animate-pulse"></div>
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
                  ₹{formatAmount(stats?.todayCloseBalance ?? stats?.branchCloseBalance ?? 0)}
                </span>
                <span className="text-xs text-amber-300/80 font-semibold">
                  (আজকের ডে বুকের চলমান হিসাব স্থিতি)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2 flex flex-col min-w-[130px]">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">সর্বশেষ ক্লোজড ব্যালেন্স</span>
              <span className="text-sm font-black text-amber-300 mt-0.5">
                ₹{formatAmount(stats?.branchCloseBalance || 0)}
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
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3"
      >
        {statCards.map((stat, idx) => {
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
                isTodayCard ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400 ring-2 ring-amber-400/20" :
                idx % 2 === 0 ? "border-blue-200/60 hover:border-blue-300" :
                "border-indigo-200/60 hover:border-indigo-300"
              )}
            >
              <div className="absolute right-0 top-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full blur-xl transform group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="card-info relative z-10 pr-1">
                <h3 className={cn(
                  "text-[9px] sm:text-[10px] mb-0.5 font-bold uppercase tracking-wider line-clamp-1",
                  isTodayCard ? "text-amber-100" : "text-slate-500"
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
