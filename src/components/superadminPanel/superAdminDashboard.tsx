import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, UsersRound, Banknote, Wallet, Coins, Clock, CheckSquare, 
  TrendingUp, Calendar, Calculator, ArrowRightLeft, Users, Sun, ClipboardList, CheckCircle, Activity, ShieldCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface SuperAdminDashboardProps {
  user: any;
  stats: any;
  hasPermission: (permission: string) => boolean;
}

export default function SuperAdminDashboard({ user, stats, hasPermission }: SuperAdminDashboardProps) {
  const navigate = useNavigate();

  const statCards = [
    { name: 'Total Branches', value: stats?.branches || 0, icon: Building2 },
    { name: 'Total Customers', value: stats?.customers || 0, icon: UsersRound },
    { name: 'Pending Loan Apps', value: stats?.pendingLoans || 0, icon: Clock },
    { name: 'Awaiting Disbursal', value: stats?.approvedLoans || 0, icon: CheckSquare },
    { name: 'Active Loans', value: stats?.activeLoans || 0, icon: Banknote },
    { name: 'Total Bank Balance', value: `₹${formatAmount(stats?.totalBankBalance || 0)}`, icon: Building2 },
    { name: 'Total Capital', value: `₹${formatAmount(stats?.totalCapital || 0)}`, icon: Coins },
    { name: 'Total Collection', value: `₹${formatAmount(stats?.collections || 0)}`, icon: Wallet },
  ];

  return (
    <div className="flex flex-col gap-4 pb-10">
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
          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-black text-indigo-200 uppercase tracking-widest">
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
        className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-4"
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
                idx % 4 === 0 ? "bg-gradient-to-br from-sky-500 to-sky-600 text-white" :
                idx % 4 === 1 ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" :
                idx % 4 === 2 ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white" :
                "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white"
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

      {/* Financial Portfolio Overview */}
      {hasPermission('sub_dash_portfolio') && stats?.financeStats && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-5 shadow-lg border border-slate-800 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                Active Portfolio Overview (সমগ্র পোর্টফোলিও)
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">কোম্পানির মোট আসোল, লাভ এবং বকেয়া তথ্যাদি</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-widest text-right">Running Outstanding</span>
              <span className="block text-base sm:text-lg font-black text-emerald-400 leading-none mt-1">₹{formatAmount(stats?.financeStats?.totalOutstanding || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 relative z-10">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm transition-all hover:bg-white/10">
              <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-widest mb-0.5">Total Principal</span>
              <span className="text-xs sm:text-sm font-black text-white">₹{formatAmount(stats?.financeStats?.totalPrincipal || 0)}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm transition-all hover:bg-white/10">
              <span className="block text-[8px] uppercase font-bold text-indigo-300 tracking-widest mb-0.5">Total Interest</span>
              <span className="text-xs sm:text-sm font-black text-indigo-100">₹{formatAmount(stats?.financeStats?.totalInterest || 0)}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm transition-all hover:bg-white/10">
              <span className="block text-[8px] uppercase font-bold text-slate-400 tracking-widest mb-0.5 text-nowrap">Target Collectible</span>
              <span className="text-xs sm:text-sm font-black text-white">₹{formatAmount(stats?.financeStats?.totalRepayment || 0)}</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 backdrop-blur-sm transition-all hover:bg-emerald-500/20">
              <span className="block text-[8px] uppercase font-bold text-emerald-400 tracking-widest mb-0.5">Collected</span>
              <span className="text-xs sm:text-sm font-black text-emerald-400">₹{formatAmount(stats?.financeStats?.totalPaid || 0)}</span>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 backdrop-blur-sm transition-all hover:bg-rose-500/20">
              <span className="block text-[8px] uppercase font-bold text-rose-300 tracking-widest mb-0.5">Interest Baki</span>
              <span className="text-xs sm:text-sm font-black text-rose-300">₹{formatAmount((stats?.financeStats?.totalInterest || 0) - ((stats?.financeStats?.totalPaid || 0) * ((stats?.financeStats?.totalInterest || 0) / (stats?.financeStats?.totalRepayment || 1))))}</span>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 backdrop-blur-sm transition-all hover:bg-orange-500/20">
              <span className="block text-[8px] uppercase font-bold text-orange-300 tracking-widest mb-0.5 text-nowrap">Asol Baki</span>
              <span className="text-xs sm:text-sm font-black text-orange-300">₹{formatAmount((stats?.financeStats?.totalPrincipal || 0) - ((stats?.financeStats?.totalPaid || 0) * ((stats?.financeStats?.totalPrincipal || 0) / (stats?.financeStats?.totalRepayment || 1))))}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions (HQ focused) */}
      <div>
        <h3 className="text-xs font-black text-slate-500 mb-3 tracking-widest uppercase flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-indigo-500" /> Superadmin Quick Console
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-7 gap-2">
          {hasPermission('sub_dash_quick_close') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-rose-500 to-rose-600 border border-rose-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/loans/closed')}
            >
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Closed Loans</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_loan') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 border border-indigo-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/loans/new')}
            >
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">New Loan</span>
            </button>
          )}

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

          {hasPermission('sub_dash_quick_group_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-purple-500 to-purple-600 border border-purple-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/shifting/group')}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Group Shift</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_staff_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-pink-500 to-pink-600 border border-pink-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/shifting/staff')}
            >
              <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Staff Shift</span>
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

          {hasPermission('sub_acc_daybook') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 border border-fuchsia-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/accounts/daybook')}
            >
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Day Book</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_day_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-amber-500 to-amber-600 border border-amber-600/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/shifting/day')}
            >
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Day Shift</span>
            </button>
          )}

          {hasPermission('sub_dash_quick_branch_shift') && (
            <button 
              className="flex flex-col items-center justify-center p-2 bg-gradient-to-br from-indigo-600 to-indigo-700 border border-indigo-700/30 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all group h-14 sm:h-16"
              onClick={() => navigate('/shifting/branch')}
            >
              <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-1.5" />
              <span className="text-[7.5px] font-black text-white uppercase tracking-wider text-center line-clamp-1 leading-none">Branch Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Collection Chart Trend */}
      {stats?.trends && stats.trends.length > 0 && hasPermission('sub_dash_chart_trend') && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-xs font-black text-slate-500 mb-4 tracking-widest uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Collection Trend (সংগ্রহের ট্রেন্ড)
          </h3>
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trends}>
                <defs>
                  <linearGradient id="colorColAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} dx={-10} tickFormatter={(val) => `₹${val}`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorColAdmin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
