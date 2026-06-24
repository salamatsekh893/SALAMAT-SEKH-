import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Phone, MapPin, BadgeCheck,
  Wallet, PiggyBank, HandCoins, ArrowDownRight, ArrowUpRight, 
  Clock, CheckCircle, FileText, Calendar, HelpCircle
} from 'lucide-react';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';
import MembarLoanAcount from './membarLoanAcount';

interface CustomerDashboardProps {
  user: any;
  stats: any;
}

export default function CustomerDashboard({ user, stats }: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'savings' | 'loans'>('savings');
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);

  // Parse enhanced stats
  const member = stats?.member || {
    member_code: 'N/A',
    full_name: user?.name || 'N/A',
    mobile_no: user?.phone || 'N/A',
    village: 'N/A',
    aadhar_no: 'N/A',
    voter_id: 'N/A',
    guardian_name: 'N/A'
  };

  const loans = stats?.loans || [];
  const savingsAccounts = stats?.savingsAccounts || [];
  const savingsTransactions = stats?.savingsTransactions || [];
  const loanPayments = stats?.loanPayments || [];

  // Filter accounts
  const savingAccountsOnly = savingsAccounts.filter((sa: any) => sa.account_type === 'saving');
  const rdAccountsOnly = savingsAccounts.filter((sa: any) => sa.account_type === 'rd');

  // Math aggregates
  const totalSavingsBalance = savingAccountsOnly.reduce((sum: number, sa: any) => sum + (sa.balance || 0), 0);
  const totalRDBalance = rdAccountsOnly.reduce((sum: number, sa: any) => sum + (sa.balance || 0), 0);

  const activeLoans = loans.filter((l: any) => l.status === 'active');
  const totalOutstanding = activeLoans.reduce((sum: number, loan: any) => {
    return sum + Math.max(0, loan.total_repayment - loan.paid);
  }, 0);
  const totalLoanPaid = loans.reduce((sum: number, loan: any) => sum + (loan.paid || 0), 0);

  const nextDueDate = activeLoans.length > 0 ? activeLoans[0].nextDue : 'N/A';
  const nextDueAmount = activeLoans.length > 0 ? activeLoans[0].installment : 0;

  if (selectedLoan) {
    return (
      <div className="py-2">
        <MembarLoanAcount 
          loans={loans} 
          loanPayments={loanPayments} 
          member={member} 
          selectedLoan={selectedLoan}
          setSelectedLoan={setSelectedLoan}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* Welcome Premium Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 rounded-2xl p-4 lg:p-5 shadow-xl border border-purple-500/10 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {/* Member Profile Image inside Banner */}
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-white/10 p-1 border border-white/20 overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-bold shadow-lg">
              {member.profile_image ? (
                <img src={member.profile_image} alt={member.full_name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
              ) : user?.photo_url ? (
                <img src={user.photo_url} alt={member.full_name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xl font-black">{member.full_name?.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="flex items-center gap-1 bg-fuchsia-500/20 border border-fuchsia-500/30 px-2.5 py-0.5 rounded-full text-fuchsia-300 text-[9px] font-black uppercase tracking-wider">
                  <BadgeCheck className="w-3 h-3 text-fuchsia-400" /> কাস্টমার অ্যাকাউন্ট পোর্টাল
                </span>
                <span className="bg-slate-850 border border-slate-700 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  মেম্বার আইডি: {member.member_code}
                </span>
              </div>
              
              <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight">
                স্বাগতম, {member.full_name} <span className="text-fuchsia-400 font-normal">👋</span>
              </h1>
              <p className="text-slate-300 text-xs mt-1 max-w-xl font-medium leading-relaxed">
                আপনার আলজুয়া সুবিধা সার্ভিসেস পোর্টালটি সম্পূর্ণ সুরক্ষিত। আপনার আমানত ও লোন কিস্তির রিয়েল-টাইম তথ্য নিচে দেওয়া হলো।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 shadow-inner shrink-0">
            <Calendar className="h-4 w-4 text-fuchsia-400" />
            <div>
              <span className="block text-[8px] uppercase tracking-widest font-black text-fuchsia-300 leading-none mb-1">আজকের তারিখ</span>
              <span className="text-xs font-black text-fuchsia-100 block leading-none">
                {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Financial Dashboard with premium gradient effects and interactive hover scale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Savings Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          whileHover={{ y: -6, scale: 1.02 }}
          className="bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/10 rounded-2xl p-5 border-2 border-slate-200/80 shadow-md hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-indigo-500 to-blue-500" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">সঞ্চয় আমানত (Savings Balance)</span>
              <h2 className="text-2xl font-black text-indigo-950 tracking-tight">₹{formatAmount(totalSavingsBalance)}</h2>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300">
              <Wallet className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3.5 border-t border-slate-100">
            <span className="font-semibold">আমানত খাতা: <span className="font-extrabold text-slate-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{savingAccountsOnly.length} টি</span></span>
            <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Active
            </span>
          </div>
        </motion.div>

        {/* RD Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -6, scale: 1.02 }}
          className="bg-gradient-to-br from-white via-slate-50/50 to-rose-50/10 rounded-2xl p-5 border-2 border-slate-200/80 shadow-md hover:shadow-xl hover:border-rose-300 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-rose-500 to-pink-500" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">আরডি ব্যালেন্স (RD Deposits)</span>
              <h2 className="text-2xl font-black text-rose-950 tracking-tight">₹{formatAmount(totalRDBalance)}</h2>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shadow-sm group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all duration-300">
              <PiggyBank className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3.5 border-t border-slate-100">
            <span className="font-semibold">RD স্কিম: <span className="font-extrabold text-slate-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">{rdAccountsOnly.length} টি</span></span>
            <span className="font-black text-rose-600 bg-rose-50 border border-rose-200/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Recurring
            </span>
          </div>
        </motion.div>

        {/* Loan Outstanding Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          whileHover={{ y: -6, scale: 1.02 }}
          className="bg-gradient-to-br from-white via-slate-50/50 to-amber-50/10 rounded-2xl p-5 border-2 border-slate-200/80 shadow-md hover:shadow-xl hover:border-amber-300 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">বকেয়া ঋণ (Loan Outstanding)</span>
              <h2 className="text-2xl font-black text-amber-950 tracking-tight">₹{formatAmount(totalOutstanding)}</h2>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shadow-sm group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-all duration-300">
              <HandCoins className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3.5 border-t border-slate-100">
            <span className="font-semibold">কিস্তি: <span className="font-extrabold text-slate-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">₹{formatAmount(nextDueAmount)}</span></span>
            <span className="font-black text-rose-600 bg-rose-50 border border-rose-200/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              তারিখ: {nextDueDate}
            </span>
          </div>
        </motion.div>

        {/* Loan Paid Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ y: -6, scale: 1.02 }}
          className="bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/10 rounded-2xl p-5 border-2 border-slate-200/80 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">পরিশোধিত ঋণ (Total Repaid)</span>
              <h2 className="text-2xl font-black text-emerald-950 tracking-tight">₹{formatAmount(totalLoanPaid)}</h2>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all duration-300">
              <CheckCircle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3.5 border-t border-slate-100">
            <span className="font-semibold">মোট লোন হিসাব: <span className="font-extrabold text-slate-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{loans.length} টি</span></span>
            <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Secure
            </span>
          </div>
        </motion.div>
      </div>

      {/* Main Grid: Details Layout & Profile Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column - 2 Span: Financial Accounts Detail & Passbooks */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Section Navigation Tabs with elegant fuchsia-themed pill badges */}
          <div className="bg-slate-200/70 p-1.5 rounded-2xl flex gap-1.5 border border-slate-300/80 shadow-inner w-full sm:w-fit backdrop-blur-xs">
            <button
              onClick={() => {
                setActiveTab('savings');
                setSelectedLoan(null);
              }}
              className={cn(
                "flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
                activeTab === 'savings' 
                  ? "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md transform scale-[1.03] border-t border-fuchsia-400" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              )}
            >
              <PiggyBank className="w-4.5 h-4.5" /> সঞ্চয় ও আরডি অ্যাকাউন্ট
            </button>
            <button
              onClick={() => {
                setActiveTab('loans');
                setSelectedLoan(null);
              }}
              className={cn(
                "flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
                activeTab === 'loans' 
                  ? "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md transform scale-[1.03] border-t border-fuchsia-400" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              )}
            >
              <HandCoins className="w-4.5 h-4.5" /> লোন বা ঋণ অ্যাকাউন্ট
            </button>
          </div>

          {/* Conditional Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'savings' ? (
              <motion.div
                key="savings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                id="savings-section"
                className="space-y-4"
              >
                {savingsAccounts.length > 0 ? (
                  savingsAccounts.map((account: any) => (
                    <div 
                      key={account.id}
                      className="bg-white border-2 border-slate-200/80 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 rounded-2xl p-5 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-indigo-500 group-hover:bg-fuchsia-500 transition-all duration-300" />
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs border",
                            account.account_type === 'saving' 
                              ? "bg-indigo-50 text-indigo-600 border-indigo-150" 
                              : "bg-rose-50 text-rose-600 border-rose-150"
                          )}>
                            {account.account_type === 'saving' ? 'SV' : 'RD'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                {account.account_type === 'saving' ? 'সঞ্চয়ী আমানত খাতা' : 'রিকারিং ডিপোজিট খাতা (RD)'}
                              </span>
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2 py-0.5 rounded border",
                                account.status === 'active' 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              )}>
                                {account.status}
                              </span>
                            </div>
                            <span className="text-xs text-indigo-600 font-mono mt-1 font-bold block">অ্যাকাউন্ট নং: {account.account_no}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">বর্তমান ব্যালেন্স</span>
                          <span className="block text-xl font-black text-slate-950 font-mono">₹{formatAmount(account.balance)}</span>
                        </div>
                      </div>

                      {/* RD specific metadata */}
                      {account.account_type === 'rd' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] mb-4 shadow-inner">
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">মাসিক জমা</span>
                            <span className="font-extrabold text-slate-800">₹{formatAmount(account.monthly_deposit || 0)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">মেয়াদ (মাস)</span>
                            <span className="font-extrabold text-slate-800">{account.duration_months} মাস</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">সুদের হার</span>
                            <span className="font-extrabold text-emerald-600">{account.interest_rate}% p.a.</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider font-bold">ম্যাচুরিটি পরিমাণ</span>
                            <span className="font-extrabold text-slate-900 text-xs">₹{formatAmount(account.maturity_amount || 0)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" /> ডিপোজিট ফ্রিকোয়েন্সি: <span className="font-bold text-slate-800 uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{account.deposit_frequency || 'monthly'}</span>
                        </span>
                        {account.maturity_date && (
                          <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded border border-amber-200 font-black text-[10px] tracking-wide">
                            ম্যাচুরিটি তারিখ: {account.maturity_date}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gradient-to-br from-white via-slate-50/50 to-slate-50 rounded-2xl p-10 border-2 border-dashed border-slate-200 text-center relative overflow-hidden">
                    <div className="p-4 bg-indigo-50 text-indigo-500 rounded-full w-fit mx-auto mb-3 shadow-inner">
                      <PiggyBank className="w-8 h-8 animate-bounce" />
                    </div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">কোনো সেভিংস বা আরডি অ্যাকাউন্ট নেই</h3>
                    <p className="text-xs text-slate-500 font-medium mt-2 max-w-sm mx-auto">
                      আপনার নামে কোনো সঞ্চয়ী বা রিকারিং ডিপোজিট অ্যাকাউন্ট লিঙ্ক করা নেই। অনুগ্রহ করে নিকটস্থ ব্রাঞ্চ অফিসে যোগাযোগ করুন।
                    </p>
                  </div>
                )}

                {/* Savings Transactions Passbook */}
                <div className="bg-white border-2 border-slate-200/80 shadow-xs rounded-2xl p-5">
                  <h3 className="text-xs font-black text-slate-500 mb-4 tracking-widest uppercase flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <FileText className="w-4 h-4 text-fuchsia-500 animate-pulse" /> শেষ ১০টি সঞ্চয় লেনদেন বিবরণী (Transaction Passbook)
                  </h3>
                  
                  {savingsTransactions.length > 0 ? (
                    <div className="divide-y divide-slate-150 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/20 shadow-inner">
                      {savingsTransactions.map((txn: any) => (
                        <div key={txn.id} className="p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-xs",
                              txn.type === 'deposit' || txn.type === 'interest'
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                : "bg-rose-50 text-rose-600 border-rose-100"
                            )}>
                              {txn.type === 'deposit' || txn.type === 'interest' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-850 text-xs">
                                  {txn.type === 'deposit' ? 'জমা (Deposit)' : txn.type === 'interest' ? 'সুদ (Interest)' : 'উত্তোলন (Withdrawal)'}
                                </span>
                                <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono font-black">
                                  {txn.account_no}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-1 font-medium">{txn.remarks || 'সঞ্চয় কিস্তি'}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={cn(
                              "font-black text-sm block",
                              txn.type === 'deposit' || txn.type === 'interest' ? "text-emerald-600" : "text-rose-500"
                            )}>
                              {txn.type === 'deposit' || txn.type === 'interest' ? '+' : '-'} ₹{formatAmount(txn.amount)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-1">{txn.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50/30 rounded-xl border border-slate-200">
                      কোনো সঞ্চয় লেনদেনের তথ্য পাওয়া যায়নি।
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="loans"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                id="loans-section"
              >
                <MembarLoanAcount loans={loans} loanPayments={loanPayments} member={member} selectedLoan={selectedLoan} setSelectedLoan={setSelectedLoan} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column - 1 Span: Member Registered Profile Details & Support */}
        <div className="space-y-5">
          
          {/* Member Details Panel styled like a VIP Membership ID Card */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl shadow-md p-5 relative overflow-hidden group hover:border-fuchsia-300 transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[6px] bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600" />
            
            <h3 className="text-xs font-black text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <User className="w-4.5 h-4.5 text-fuchsia-500 animate-pulse" /> নিবন্ধিত প্রোফাইল তথ্য (Profile Details)
            </h3>
            
            {/* Elegant Pass Holder Header Row */}
            <div className="flex items-center gap-4 mb-5 p-3.5 bg-gradient-to-br from-fuchsia-50/60 to-indigo-50/30 rounded-2xl border border-fuchsia-100/60 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-fuchsia-500/5 rounded-full blur-lg pointer-events-none" />
              <div className="w-14 h-14 rounded-2xl bg-white p-0.5 border-2 border-fuchsia-200 overflow-hidden shrink-0 shadow-sm flex items-center justify-center text-fuchsia-800 font-black relative group-hover:scale-105 transition-all duration-300">
                {member.profile_image ? (
                  <img src={member.profile_image} alt={member.full_name} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                ) : user?.photo_url ? (
                  <img src={user.photo_url} alt={member.full_name} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xl">{member.full_name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-fuchsia-400 block mb-0.5">মেম্বার পুরো নাম</span>
                <span className="font-black text-slate-900 block text-sm leading-tight tracking-tight">{member.full_name}</span>
                <span className="text-[10px] text-indigo-600 font-mono font-bold mt-1 block">আইডি: {member.member_code}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-700 font-medium">
              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-black mb-0.5">অভিভাবক (Guardian)</span>
                <span className="font-extrabold text-slate-800 block text-xs">
                  {member.guardian_name} ({member.guardian_type || 'পিতা'})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-black mb-1">মোবাইল নম্বর</span>
                  <span className="font-extrabold text-slate-850 text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3 text-fuchsia-500" /> {member.mobile_no}
                  </span>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-black mb-1">পিন কোড (Pin)</span>
                  <span className="font-extrabold text-slate-850 text-xs font-mono">{member.pin_code || '742301'}</span>
                </div>
              </div>

              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 shadow-xs">
                <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-black mb-1">গ্রাম / ঠিকানা (Village Address)</span>
                <span className="font-bold text-slate-800 text-xs flex items-start gap-1.5 leading-relaxed">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-bounce" /> 
                  <span>{member.village || 'N/A'}, পোস্ট: {member.post_office || 'N/A'}, থানা: {member.police_station || 'N/A'}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 bg-fuchsia-50/20 p-3 rounded-xl border border-fuchsia-100 shadow-xs">
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-fuchsia-600 font-black mb-1">আধার নম্বর</span>
                  <span className="font-black text-slate-850 font-mono text-xs">{member.aadhar_no || '•••• •••• ••••'}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-indigo-600 font-black mb-1">ভোটার আইডি</span>
                  <span className="font-black text-slate-850 font-mono text-xs">{member.voter_id || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Support & Helpline Box */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-5 border-2 border-purple-500/10 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-all duration-300">
            <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-all duration-500"></div>
            
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-fuchsia-300">
                <HelpCircle className="w-4.5 h-4.5 text-fuchsia-400 animate-pulse" />
                <h4 className="text-xs font-black uppercase tracking-wider">জরুরি সহায়তা প্রয়োজন? (Support)</h4>
              </div>
              <p className="text-[11px] text-indigo-100/90 leading-relaxed font-semibold">
                আপনার পাসবইয়ের হিসাব বা কিস্তির পরিশোধিত রশিদের সাথে কোনো অমিল থাকলে অনুগ্রহ করে আপনার ফিল্ড অফিসার (FO) অথবা ব্রাঞ্চ অফিসে যোগাযোগ করুন।
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-5 shadow-inner">
              <span className="block text-[8px] uppercase tracking-widest font-black text-fuchsia-300">হেড অফিস কাস্টমার কেয়ার</span>
              <span className="block text-xs font-black text-white mt-1">support@aljooyasubidha.com</span>
              <span className="block text-[10px] text-indigo-200/80 mt-1 font-bold">হেল্পলাইন: +৮৮০-১৭xxxxxxxx</span>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
