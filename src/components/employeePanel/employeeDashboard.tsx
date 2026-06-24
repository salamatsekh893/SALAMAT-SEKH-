import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, UsersRound, Banknote, Wallet, Coins, Clock, CheckSquare, 
  Calendar, ClipboardList, CheckCircle, Activity, ShieldCheck
} from 'lucide-react';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface EmployeeDashboardProps {
  user: any;
  stats: any;
  hasPermission: (permission: string) => boolean;
}

export default function EmployeeDashboard({ user, stats, hasPermission }: EmployeeDashboardProps) {
  const navigate = useNavigate();

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
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-black text-blue-200 uppercase tracking-widest">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Stats */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
          }
        }}
        className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4"
      >
        {statCards.map((stat, idx) => {
          return (
            <motion.div 
              key={stat.name} 
              variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className={cn(
                "group relative p-3 rounded-2xl shadow-md flex justify-between items-center transition-transform overflow-hidden min-h-[75px] sm:min-h-[85px]",
                idx % 2 === 0 ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" : "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
              )}
            >
              <div className="absolute right-0 top-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full blur-xl transform group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="card-info relative z-10">
                <h3 className="text-[9px] text-white/90 mb-0.5 font-bold uppercase tracking-wider line-clamp-1">{stat.name}</h3>
                <h1 className="text-base sm:text-xl font-black tracking-tight">{stat.value}</h1>
              </div>
              <div className="text-white/20 transition-transform group-hover:scale-110 group-hover:-rotate-12 duration-300 ml-1 relative z-10 shrink-0">
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2.5} />
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
    </div>
  );
}
