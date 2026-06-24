import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Phone, MapPin, BadgeCheck,
  Wallet, PiggyBank, HandCoins, ArrowDownRight, ArrowUpRight, 
  Clock, CheckCircle, FileText, Calendar, HelpCircle
} from 'lucide-react';
import { formatAmount } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface CustomerDashboardProps {
  user: any;
  stats: any;
}

export default function CustomerDashboard({ user, stats }: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'savings' | 'loans'>('savings');

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

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* Welcome Premium Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950 rounded-2xl p-4 lg:p-5 shadow-xl border border-amber-500/10 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

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
                <span className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-amber-300 text-[9px] font-black uppercase tracking-wider">
                  <BadgeCheck className="w-3 h-3 text-amber-400" /> কাস্টমার অ্যাকাউন্ট পোর্টাল
                </span>
                <span className="bg-slate-850 border border-slate-700 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  মেম্বার আইডি: {member.member_code}
                </span>
              </div>
              
              <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight">
                স্বাগতম, {member.full_name} <span className="text-amber-400 font-normal">👋</span>
              </h1>
              <p className="text-slate-300 text-xs mt-1 max-w-xl font-medium leading-relaxed">
                আপনার আলজুয়া সুবিধা সার্ভিসেস পোর্টালটি সম্পূর্ণ সুরক্ষিত। আপনার আমানত ও লোন কিস্তির রিয়েল-টাইম তথ্য নিচে দেওয়া হলো।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 shadow-inner shrink-0">
            <Calendar className="h-4 w-4 text-amber-400" />
            <div>
              <span className="block text-[8px] uppercase tracking-widest font-black text-amber-300 leading-none mb-1">আজকের তারিখ</span>
              <span className="text-xs font-black text-amber-100 block leading-none">
                {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Financial Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Savings Card */}
        <div className="bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60 shadow-xs relative overflow-hidden group transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500" />
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">সঞ্চয় আমানত (Savings Balance)</span>
              <h2 className="text-2xl font-black text-indigo-950 mt-1">₹{formatAmount(totalSavingsBalance)}</h2>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-100">
            <span>অ্যাকাউন্ট: <span className="font-bold text-slate-800">{savingAccountsOnly.length} টি</span></span>
            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">● Active</span>
          </div>
        </div>

        {/* RD Card */}
        <div className="bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60 shadow-xs relative overflow-hidden group transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-rose-500" />
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">আরডি ব্যালেন্স (RD Deposits)</span>
              <h2 className="text-2xl font-black text-rose-950 mt-1">₹{formatAmount(totalRDBalance)}</h2>
            </div>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-100">
            <span>RD স্কিম: <span className="font-bold text-slate-800">{rdAccountsOnly.length} টি</span></span>
            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">● Recurring</span>
          </div>
        </div>

        {/* Loan Outstanding Card */}
        <div className="bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60 shadow-xs relative overflow-hidden group transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500" />
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">বকেয়া ঋণ (Loan Outstanding)</span>
              <h2 className="text-2xl font-black text-amber-950 mt-1">₹{formatAmount(totalOutstanding)}</h2>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-100">
            <span>কিস্তি: <span className="font-bold text-slate-800">₹{formatAmount(nextDueAmount)}</span></span>
            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">তারিখ: {nextDueDate}</span>
          </div>
        </div>

        {/* Loan Paid Card */}
        <div className="bg-white hover:bg-slate-50/50 rounded-2xl p-4 border border-slate-200/60 shadow-xs relative overflow-hidden group transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">পরিশোধিত ঋণ (Total Repaid)</span>
              <h2 className="text-2xl font-black text-emerald-950 mt-1">₹{formatAmount(totalLoanPaid)}</h2>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-3 border-t border-slate-100">
            <span>মোট লোন হিসাব: <span className="font-bold text-slate-800">{loans.length} টি</span></span>
            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Secure</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Details Layout & Profile Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left column - 2 Span: Financial Accounts Detail & Passbooks */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Section Navigation Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200 shadow-inner w-fit">
            <button
              onClick={() => setActiveTab('savings')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all duration-200 flex items-center gap-1.5",
                activeTab === 'savings' 
                  ? "bg-white text-slate-950 shadow-sm font-black" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <PiggyBank className="w-4 h-4 text-indigo-600" /> সঞ্চয় ও আরডি অ্যাকাউন্ট
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all duration-200 flex items-center gap-1.5",
                activeTab === 'loans' 
                  ? "bg-white text-slate-950 shadow-sm font-black" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <HandCoins className="w-4 h-4 text-amber-600" /> লোন বা ঋণ অ্যাকাউন্ট
            </button>
          </div>

          {/* Conditional Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'savings' ? (
              <motion.div
                key="savings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                id="savings-section"
                className="space-y-4"
              >
                {savingsAccounts.length > 0 ? (
                  savingsAccounts.map((account: any) => (
                    <div 
                      key={account.id}
                      className="bg-white border border-slate-200/60 shadow-xs hover:shadow-md transition-all rounded-2xl p-4"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                            account.account_type === 'saving' 
                              ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                              : "bg-rose-50 text-rose-600 border border-rose-100"
                          )}>
                            {account.account_type === 'saving' ? 'SV' : 'RD'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                {account.account_type === 'saving' ? 'সঞ্চয়ী আমানত খাতা' : 'রিকারিং ডিপোজিট খাতা (RD)'}
                              </span>
                              <span className={cn(
                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                                account.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                              )}>
                                {account.status}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 font-mono mt-0.5 block">অ্যাকাউন্ট নং: {account.account_no}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">বর্তমান ব্যালেন্স</span>
                          <span className="block text-lg font-black text-slate-950">₹{formatAmount(account.balance)}</span>
                        </div>
                      </div>

                      {/* RD specific metadata */}
                      {account.account_type === 'rd' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] mb-3">
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase">মাসিক জমা</span>
                            <span className="font-bold text-slate-850">₹{formatAmount(account.monthly_deposit || 0)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase">মেয়াদ (মাস)</span>
                            <span className="font-bold text-slate-850">{account.duration_months} মাস</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase">সুদের হার</span>
                            <span className="font-bold text-emerald-600">{account.interest_rate}% p.a.</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase font-bold">ম্যাচুরিটি পরিমাণ</span>
                            <span className="font-bold text-slate-850">₹{formatAmount(account.maturity_amount || 0)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" /> ডিপোজিট ফ্রিকোয়েন্সি: <span className="font-bold text-slate-800 uppercase">{account.deposit_frequency || 'monthly'}</span>
                        </span>
                        {account.maturity_date && (
                          <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100 font-bold text-[10px]">
                            ম্যাচুরিটি তারিখ: {account.maturity_date}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center">
                    <PiggyBank className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-xs font-black text-slate-700 uppercase">কোনো সেভিংস বা আরডি অ্যাকাউন্ট নেই</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">আপনার নামে কোনো সঞ্চয়ী অ্যাকাউন্ট লিঙ্ক করা নেই।</p>
                  </div>
                )}

                {/* Savings Transactions Passbook */}
                <div className="bg-white border border-slate-200/60 shadow-xs rounded-2xl p-4">
                  <h3 className="text-xs font-black text-slate-500 mb-3 tracking-widest uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-500" /> শেষ ১০টি সঞ্চয় লেনদেন বিবরণী
                  </h3>
                  
                  {savingsTransactions.length > 0 ? (
                    <div className="divide-y divide-slate-100 overflow-hidden">
                      {savingsTransactions.map((txn: any) => (
                        <div key={txn.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                              txn.type === 'deposit' || txn.type === 'interest'
                                ? "bg-emerald-50 text-emerald-600" 
                                : "bg-rose-50 text-rose-600"
                            )}>
                              {txn.type === 'deposit' || txn.type === 'interest' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-850 text-xs">
                                  {txn.type === 'deposit' ? 'জমা (Deposit)' : txn.type === 'interest' ? 'সুদ (Interest)' : 'উত্তোলন (Withdrawal)'}
                                </span>
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                  {txn.account_no}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{txn.remarks || 'সঞ্চয় কিস্তি'}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={cn(
                              "font-black text-xs",
                              txn.type === 'deposit' || txn.type === 'interest' ? "text-emerald-600" : "text-rose-500"
                            )}>
                              {txn.type === 'deposit' || txn.type === 'interest' ? '+' : '-'} ₹{formatAmount(txn.amount)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{txn.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 font-bold text-xs">
                      কোনো সঞ্চয় লেনদেনের তথ্য পাওয়া যায়নি।
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="loans"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                id="loans-section"
                className="space-y-4"
              >
                {loans.length > 0 ? (
                  loans.map((loan: any) => {
                    const percentPaid = loan.total_repayment > 0 ? Math.min(100, Math.round((loan.paid / loan.total_repayment) * 100)) : 0;
                    return (
                      <div 
                        key={loan.id}
                        className="bg-white border border-slate-200/60 shadow-xs hover:shadow-md transition-all rounded-2xl p-4"
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-850 uppercase tracking-wide">সক্রিয় লোন নম্বর</span>
                              <span className={cn(
                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                                loan.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              )}>
                                {loan.status}
                              </span>
                            </div>
                            <span className="text-xs text-indigo-600 font-black font-mono mt-0.5 block">{loan.loan_no}</span>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">অবशिष्ट পরিশোধযোগ্য</span>
                            <span className="block text-lg font-black text-rose-500">
                              ₹{formatAmount(Math.max(0, loan.total_repayment - loan.paid))}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar of loan payment */}
                        <div className="mb-3">
                          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                            <span className="font-medium">ঋণ পরিশোধ অগ্রগতি</span>
                            <span className="font-bold text-slate-800">{percentPaid}% সম্পন্ন</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200 shadow-inner">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-550" 
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                        </div>

                        {/* Loan details row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] mb-3">
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase">লোন আসল টাকা</span>
                            <span className="font-bold text-slate-850">₹{formatAmount(loan.principal)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase">মোট সুদ</span>
                            <span className="font-bold text-slate-850">₹{formatAmount(loan.interest)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase font-bold">ইতিমধ্যে পরিশোধিত</span>
                            <span className="font-black text-emerald-600">₹{formatAmount(loan.paid)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase">লোন মেয়াদ</span>
                            <span className="font-bold text-slate-850">{loan.duration_weeks} সপ্তাহ</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" /> পরবর্তী কিস্তির তারিখ: <span className="font-bold text-rose-500">{loan.nextDue}</span>
                          </span>
                          <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100/60 font-black text-[10px]">
                            কিস্তির পরিমান: ₹{formatAmount(loan.installment)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-6 text-center">
                    <HandCoins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-xs font-black text-slate-700 uppercase">কোনো সক্রিয় লোন পাওয়া যায়নি</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">আপনার নামে কোনো একটিভ লোন বা ঋণ নেই।</p>
                  </div>
                )}

                {/* Loan Installment Payments Approved Receipts */}
                <div className="bg-white border border-slate-200/60 shadow-xs rounded-2xl p-4">
                  <h3 className="text-xs font-black text-slate-500 mb-3 tracking-widest uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" /> কিস্তির রশিদ তালিকা (Receipt History)
                  </h3>
                  
                  {loanPayments.length > 0 ? (
                    <div className="divide-y divide-slate-100 overflow-hidden">
                      {loanPayments.map((p: any) => (
                        <div key={p.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                              ₹
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-850 text-xs">কিস্তি পেমেন্ট রিসিভ</span>
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                                  {p.loan_no}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">রশিদ আইডি: Col-{p.id}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-xs text-emerald-600">+ ₹{formatAmount(p.amount_paid)}</span>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{p.payment_date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 font-bold text-xs">
                      লোন কিস্তি পরিশোধের কোনো ইতিহাস নেই।
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column - 1 Span: Member Registered Profile Details & Support */}
        <div className="space-y-4">
          
          {/* Member Details Panel with Profile Image */}
          <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-4 relative overflow-hidden">
            <h3 className="text-xs font-black text-slate-500 tracking-widest uppercase mb-3.5 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
              <User className="w-4 h-4 text-rose-500" /> নিবন্ধিত প্রোফাইল তথ্য (Profile Details)
            </h3>
            
            {/* Elegant Profile Header Row */}
            <div className="flex items-center gap-3.5 mb-4 p-2.5 bg-rose-50/40 rounded-xl border border-rose-100/50">
              <div className="w-12 h-12 rounded-xl bg-white p-0.5 border border-rose-200 overflow-hidden shrink-0 shadow-sm flex items-center justify-center text-rose-800 font-black">
                {member.profile_image ? (
                  <img src={member.profile_image} alt={member.full_name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                ) : user?.photo_url ? (
                  <img src={user.photo_url} alt={member.full_name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-lg">{member.full_name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">মেম্বার পুরো নাম</span>
                <span className="font-bold text-slate-900 block text-xs leading-tight">{member.full_name}</span>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">আইডি: {member.member_code}</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 font-medium">
              <div>
                <span className="block text-[8px] uppercase tracking-widest text-slate-400">অভিভাবক (Guardian)</span>
                <span className="font-bold text-slate-800 block text-xs">
                  {member.guardian_name} ({member.guardian_type || 'পিতা'})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400">মোবাইল নম্বর</span>
                  <span className="font-bold text-slate-850 text-xs flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {member.mobile_no}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400">পিন কোড (Pin)</span>
                  <span className="font-bold text-slate-850 text-xs font-mono">{member.pin_code || '742301'}</span>
                </div>
              </div>

              <div>
                <span className="block text-[8px] uppercase tracking-widest text-slate-400">গ্রাম / ঠিকানা (Village Address)</span>
                <span className="font-bold text-slate-800 text-xs flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" /> 
                  <span>{member.village || 'N/A'}, পোস্ট: {member.post_office || 'N/A'}, থানা: {member.police_station || 'N/A'}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-bold">আধার নম্বর</span>
                  <span className="font-bold text-slate-850 font-mono text-[10px]">{member.aadhar_no || '•••• •••• ••••'}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-widest text-slate-400 font-bold">ভোটার আইডি</span>
                  <span className="font-bold text-slate-850 font-mono text-[10px]">{member.voter_id || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Support & Helpline Box */}
          <div className="bg-gradient-to-br from-slate-900 to-amber-950 text-white rounded-2xl p-4 border border-amber-500/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 top-0 -mt-6 -mr-6 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
            
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 text-amber-400">
                <HelpCircle className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-wider">জরুরি সহায়তা প্রয়োজন? (Support)</h4>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed font-medium">
                আপনার পাসবইয়ের হিসাব বা কিস্তির পরিশোধিত রশিদের সাথে কোনো অমিল থাকলে অনুগ্রহ করে আপনার ফিল্ড অফিসার (FO) অথবা ব্রাঞ্চ অফিসে যোগাযোগ করুন।
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mt-4">
              <span className="block text-[8px] uppercase tracking-widest font-black text-amber-300">হেড অফিস কাস্টমার কেয়ার</span>
              <span className="block text-xs font-bold text-white mt-0.5">support@aljooyasubidha.com</span>
              <span className="block text-[10px] text-amber-200/60 mt-0.5 font-semibold">হেল্পলাইন: +৮৮০-১৭xxxxxxxx</span>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
