import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, UsersRound, Banknote, Wallet, Coins, Clock, CheckSquare, 
  TrendingUp, Calendar, Calculator, ArrowRightLeft, Users, Sun, ClipboardList, CheckCircle, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface BranchDashboardProps {
  user: any;
  stats: any;
  hasPermission: (permission: string) => boolean;
}

export default function BranchDashboard({ user, stats, hasPermission }: BranchDashboardProps) {
  const navigate = useNavigate();

  const statCards = [
    { name: 'Branch Customers', value: stats?.customers || 0, icon: UsersRound },
    { name: 'Pending Loan Apps', value: stats?.pendingLoans || 0, icon: Clock },
    { name: 'Awaiting Disbursal', value: stats?.approvedLoans || 0, icon: CheckSquare },
    { name: 'Active Loans', value: stats?.activeLoans || 0, icon: Banknote },
    { name: 'Total Collection', value: `₹${formatAmount(stats?.collections || 0)}`, icon: Wallet },
  ];

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Welcome Hero Banner with Branch Info */}
      <div className="relative bg-gradient-to-br from-teal-950 via-emerald-950 to-slate-900 rounded-3xl p-6 shadow-xl border border-emerald-500/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-300 text-[10px] font-black uppercase tracking-widest w-fit mb-3">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Branch Command Center
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{user?.branch_name || 'Branch Office'}</h1>
            <p className="text-emerald-200 text-xs mt-1 max-w-xl font-medium">
              আপনার ব্রাঞ্চের দৈনিক কালেকশন, নতুন মেম্বার অ্যাডমিশন এবং ঋণ আবেদনসমূহের সর্বশেষ অবস্থা এখান থেকে পরিচালনা করুন।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {stats?.branchWalletBalance !== undefined && (
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg text-emerald-300 cursor-pointer" onClick={() => navigate('/accounts/branch-wallet')}>
                <Wallet className="w-4 h-4 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-[7px] font-black uppercase tracking-widest text-emerald-400/80 leading-none">ওয়ালেট ব্যালেন্স</span>
                  <span className="text-sm font-black mt-0.5 leading-none">₹{formatAmount(stats?.branchWalletBalance || 0)}</span>
                </div>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-black text-emerald-200 uppercase tracking-widest">
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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
        className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-4"
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
                idx % 2 === 0 ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" : "bg-gradient-to-br from-teal-500 to-teal-600 text-white"
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
    </div>
  );
}
