import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, Calendar, ArrowDownLeft, ArrowUpRight, Filter, Download, Lock, Unlock, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';

export default function DayBook() {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  // Checklist for Day Close
  const [confirmCollections, setConfirmCollections] = useState(false);
  const [confirmDisbursements, setConfirmDisbursements] = useState(false);
  const [confirmExpenses, setConfirmExpenses] = useState(false);
  const [confirmBank, setConfirmBank] = useState(false);
  const [confirmSavings, setConfirmSavings] = useState(false);
  const [confirmProducts, setConfirmProducts] = useState(false);
  const [confirmCapital, setConfirmCapital] = useState(false);
  const [confirmProcessing, setConfirmProcessing] = useState(false);
  const [confirmInsurance, setConfirmInsurance] = useState(false);

  useEffect(() => {
    loadBranches();
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const data = await fetchWithAuth('/banks');
      setBanks(data);
    } catch (err) {}
  };

  useEffect(() => {
    loadDayBook();
  }, [date, branchId]);

  const loadBranches = async () => {
    try {
      const data = await fetchWithAuth('/branches');
      setBranches(data);
    } catch (err) {}
  };

  const loadDayBook = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ date, _t: Date.now().toString() });
      if (branchId) qs.append('branch_id', branchId);
      
      const data = await fetchWithAuth(`/daybook?${qs.toString()}`);
      setData(data);
    } catch (err: any) {
      console.error(err);
      alert("Error fetching data: " + (err.message || "Could not connect to database. Please check your Hostinger configuration."));
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDayBook = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (transferAmount && !selectedBank) {
      voiceFeedback.error();
      alert("Please select a bank account to deposit into.");
      return;
    }
    const depositAmtNum = parseFloat(transferAmount || '0');
    if (depositAmtNum > closingBalance) {
      voiceFeedback.error();
      alert("Deposit amount cannot exceed Final Closing Balance");
      return;
    }

    setClosing(true);
    try {
      await fetchWithAuth('/daybook/close', {
        method: 'POST',
        body: JSON.stringify({
          date,
          branch_id: branchId || null,
          opening_balance: openingBalance,
          total_inflow: totalInflows,
          total_outflow: totalOutflows,
          closing_balance: closingBalance,
          deposit_amount: depositAmtNum > 0 ? depositAmtNum : undefined,
          bank_id: depositAmtNum > 0 ? selectedBank : undefined
        })
      });
      setShowCloseModal(false);
      setTransferAmount('');
      setSelectedBank('');
      await loadDayBook();
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message || "Failed to close Day Book");
    } finally {
      setClosing(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const depositAmtNum = parseFloat(transferAmount || '0');
    if (depositAmtNum <= 0) {
       voiceFeedback.error();
       alert("Please enter a valid amount.");
       return;
    }
    if (depositAmtNum > closingBalance) {
      voiceFeedback.error();
      alert("Transfer amount cannot exceed Current Cash in Hand");
      return;
    }
    if (!selectedBank) {
      voiceFeedback.error();
      alert("Please select a bank account.");
      return;
    }

    setClosing(true);
    try {
      await fetchWithAuth('/daybook/transfer', {
        method: 'POST',
        body: JSON.stringify({
          date,
          branch_id: branchId || null,
          amount: depositAmtNum,
          bank_id: selectedBank
        })
      });
      setShowTransferModal(false);
      setTransferAmount('');
      setSelectedBank('');
      await loadDayBook();
    } catch (err: any) {
      voiceFeedback.error();
      alert(err.message || "Failed to make transfer");
    } finally {
      setClosing(false);
    }
  };

  const handleOpenDayBook = async () => {
    if (user?.role !== 'superadmin' && user?.role !== 'admin' && user?.role !== 'manager') {
      voiceFeedback.error();
      alert("Only an admin can re-open a closed Day Book");
      return;
    }
    if (!branchId) {
      voiceFeedback.error();
      alert("Please select a specific branch to re-open the Day Book. You cannot re-open 'All Branches' at once.");
      return;
    }
    if (!window.confirm("Are you sure you want to re-open the Day Book?")) return;
    setClosing(true);
    try {
      await fetchWithAuth('/daybook/open', {
        method: 'POST',
        body: JSON.stringify({ date, branch_id: branchId })
      });
      await loadDayBook();
      voiceFeedback.success();
      alert('Day Book Re-Opened successfully.');
    } catch (err: any) {
      voiceFeedback.error();
      alert('Failed to Re-Open Day Book. ' + err.message);
    } finally {
      setClosing(false);
    }
  };

  const openCloseModal = () => {
    if (!branchId) {
      voiceFeedback.error();

      alert("Please select a specific branch to perform Day Close. You cannot close 'All Branches' at once.");
      return;
    }
    const pendingCollections = collections.filter((c: any) => c.status === 'pending');
    if (pendingCollections.length > 0) {
      voiceFeedback.error();

      alert(`There are ${pendingCollections.length} pending collections. Please approve them before closing the day.`);
      return;
    }
    const disbs = data?.disbursements || [];
    const totalProc = disbs.reduce((sum: number, d: any) => sum + parseFloat(d.processing_fee || 0), 0);
    const totalInsu = disbs.reduce((sum: number, d: any) => sum + parseFloat(d.insurance_fee || 0), 0);

    setConfirmCollections(collections.length === 0);
    setConfirmDisbursements(disbursements.length === 0);
    setConfirmProcessing(totalProc === 0);
    setConfirmInsurance(totalInsu === 0);
    setConfirmExpenses((expenses.length + salaries.length) === 0);
    setConfirmBank(bankTxns.length === 0);
    setConfirmSavings(savingsTxns.length === 0);
    setConfirmProducts(sales.length === 0);
    setConfirmCapital(capital.length === 0);
    setShowCloseModal(true);
  };

  if (loading && !data) {
    return <div className="p-10 text-center text-slate-500">Loading Day Book...</div>;
  }

  const collections = data?.collections || [];
  const disbursements = data?.disbursements || [];
  const salaries = data?.salaries || [];
  const capital = data?.capital || [];
  const bankTxns = data?.bankTxns || [];
  const expenses = data?.expenses || [];
  const savingsTxns = data?.savingsTxns || [];
  const sales = data?.sales || [];

  const dayBookStatus = data?.dayBookStatus;
  const isClosed = dayBookStatus?.status === 'closed';
  const openingBalance = data?.opening_balance || 0;

  // Calculate totals
  const totalCollections = collections.reduce((sum: number, c: any) => sum + parseFloat(c.amount_paid || 0), 0);
  const totalProcessingFees = disbursements.reduce((sum: number, d: any) => sum + parseFloat(d.processing_fee || 0), 0);
  const totalInsuranceFees = disbursements.reduce((sum: number, d: any) => sum + parseFloat(d.insurance_fee || 0), 0);
  
  const totalSavingDeposits = savingsTxns
    .filter((t: any) => t.type === 'deposit' && t.account_type === 'saving')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

  const totalRDDeposits = savingsTxns
    .filter((t: any) => t.type === 'deposit' && t.account_type === 'rd')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

  const totalSavingsDeposits = totalSavingDeposits + totalRDDeposits;

  const totalProductSales = sales
    .filter((s: any) => s.payment_method?.toLowerCase() === 'cash')
    .reduce((sum: number, s: any) => sum + parseFloat(s.total_amount || 0), 0);

  const totalCapitalIn = capital.filter((c:any) => c.payment_method === 'cash').reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
  const totalBankWithdrawals = bankTxns.filter((t:any) => t.type === 'withdrawal').reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
  
  const totalInflows = totalCollections + totalProcessingFees + totalInsuranceFees + totalSavingsDeposits + totalProductSales + totalCapitalIn + totalBankWithdrawals;

  const totalDisbursements = disbursements.reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0);
  
  const totalSavingWithdrawals = savingsTxns
    .filter((t: any) => t.type === 'withdrawal' && t.account_type === 'saving')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

  const totalRDWithdrawals = savingsTxns
    .filter((t: any) => t.type === 'withdrawal' && t.account_type === 'rd')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);

  const totalSavingsWithdrawals = totalSavingWithdrawals + totalRDWithdrawals;

  const totalSalaries = salaries.reduce((sum: number, s: any) => sum + parseFloat(s.net_salary || 0), 0);
  const totalCapitalOut = 0; // Not handling cash expenses broadly yet
  const totalBankDeposits = bankTxns.filter((t:any) => t.type === 'deposit').reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
  const totalExpensesPaid = expenses.filter((e:any) => e.payment_method === 'cash').reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);

  const totalOutflows = totalDisbursements + totalSavingsWithdrawals + totalSalaries + totalCapitalOut + totalBankDeposits + totalExpensesPaid;

  const netCashFlow = totalInflows - totalOutflows;
  const closingBalance = openingBalance + netCashFlow;

  // Compile Transactions for Ledger View
  let ledger: any[] = [];
  
  collections.forEach((c: any) => {
    ledger.push({
      time: c.created_at,
      description: `Loan EMI Collection - ${c.member_name || 'Member'}`,
      type: 'inflow',
      amount: parseFloat(c.amount_paid)
    });
  });

  capital.forEach((c: any) => {
    if(c.payment_method === 'cash') {
      ledger.push({
        time: c.created_at,
        description: `Capital Introduced - ${c.source_name || 'Self'}`,
        type: 'inflow',
        amount: parseFloat(c.amount)
      });
    }
  });

  savingsTxns.forEach((t: any) => {
    const actType = t.account_type === 'rd' ? 'RD' : 'Savings';
    ledger.push({
      time: t.created_at,
      description: `${actType} ${t.type === 'deposit' ? 'Deposit' : 'Withdrawal'} - ${t.member_name} (${t.account_no})`,
      type: t.type === 'deposit' ? 'inflow' : 'outflow',
      amount: parseFloat(t.amount)
    });
  });

  bankTxns.forEach((t: any) => {
    if(t.type === 'withdrawal') {
      ledger.push({
        time: t.created_at,
        description: `Bank Withdrawal - ${t.bank_name}`,
        type: 'inflow',
        amount: parseFloat(t.amount)
      });
    } else {
      ledger.push({
        time: t.created_at,
        description: `Bank Deposit - ${t.bank_name}`,
        type: 'outflow',
        amount: parseFloat(t.amount)
      });
    }
  });

  disbursements.forEach((d: any) => {
    const txnTime = d.disbursement_date || d.start_date || d.created_at;
    // 1. Principal Outflow
    ledger.push({
      time: txnTime,
      description: `Loan Disbursement - ${d.member_name || 'Member'}`,
      type: 'outflow',
      amount: parseFloat(d.amount)
    });

    // 2. Processing Fee Inflow
    if (parseFloat(d.processing_fee || 0) > 0) {
      ledger.push({
        time: txnTime,
        description: `Processing Fee Collected - ${d.member_name || 'Member'}`,
        type: 'inflow',
        amount: parseFloat(d.processing_fee)
      });
    }

    // 3. Insurance Fee Inflow
    if (parseFloat(d.insurance_fee || 0) > 0) {
      ledger.push({
        time: txnTime,
        description: `Insurance Fee Collected - ${d.member_name || 'Member'}`,
        type: 'inflow',
        amount: parseFloat(d.insurance_fee)
      });
    }
  });

  sales.forEach((s: any) => {
    if (s.payment_method?.toLowerCase() === 'cash') {
      ledger.push({
        time: s.created_at || s.sale_date,
        description: `Product Sale - ${s.product_name} - ${s.member_name || 'Member'}`,
        type: 'inflow',
        amount: parseFloat(s.total_amount)
      });
    }
  });

  salaries.forEach((s: any) => {
    ledger.push({
      time: s.created_at,
      description: `Salary Paid - ${s.employee_name || 'Employee'}`,
      type: 'outflow',
      amount: parseFloat(s.net_salary)
    });
  });

  expenses.forEach((e: any) => {
    if(e.payment_method === 'cash') {
      ledger.push({
        time: e.created_at,
        description: `Expense Paid - ${e.category}`,
        type: 'outflow',
        amount: parseFloat(e.amount)
      });
    }
  });

  const formatTimeSafe = (timeVal: any) => {
    if (!timeVal) return '--:--';
    const d = new Date(timeVal);
    if (isNaN(d.getTime())) return '--:--';
    try {
      return format(d, 'hh:mm a');
    } catch (e) {
      return '--:--';
    }
  };

  ledger.sort((a, b) => {
    const timeA = a.time ? new Date(a.time).getTime() : 0;
    const timeB = b.time ? new Date(b.time).getTime() : 0;
    const valA = isNaN(timeA) ? 0 : timeA;
    const valB = isNaN(timeB) ? 0 : timeB;
    return valA - valB;
  });

  const exportToExcel = () => {
    const wsData = [
      ['Date', date],
      ['Branch', branchId ? branches.find(b => b.id == branchId)?.branch_name : 'All Branches'],
      [],
      ['Total Inflows', totalInflows],
      ['Total Outflows', totalOutflows],
      ['Net Cash Flow', netCashFlow],
      [],
      ['Time', 'Description', 'Type', 'Amount']
    ];

    ledger.forEach(item => {
      wsData.push([
        formatTimeSafe(item.time),
        item.description,
        item.type.toUpperCase(),
        item.amount
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DayBook');
    XLSX.writeFile(wb, `DayBook_${date}.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] min-h-screen">
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 p-1.5 rounded-full">
            <BookOpen className="w-4 h-4 text-purple-700" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight uppercase text-purple-600">Day Book Pro</h1>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-sm ml-auto sm:ml-0"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="p-2 sm:p-4 space-y-2.5 max-w-7xl mx-auto w-full">
        {!isClosed && date < format(new Date(), 'yyyy-MM-dd') && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2.5">
            <Lock className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-red-700 font-black text-sm">SYSTEM LOCKED!</h3>
              <p className="text-red-600 text-xs font-medium mt-0.5">Warning: Account for {format(new Date(date), 'dd-MMM-yyyy')} is not closed! System Locked.</p>
            </div>
          </motion.div>
        )}

        {/* Date and Branch Selectors + Actions */}
        <div className="flex flex-col md:flex-row justify-between items-stretch gap-2.5">
          <div className="flex gap-2 flex-1 relative">
             <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-2.5 overflow-hidden shadow-sm">
                <Calendar className="w-4 h-4 text-rose-500 mr-1.5 flex-shrink-0" />
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full py-1.5 bg-transparent text-slate-800 font-bold text-xs sm:text-sm focus:outline-none"
                />
             </div>
             {(user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'manager') && (
               <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-2.5 overflow-hidden shadow-sm">
                  <Building2 className="w-4 h-4 text-blue-500 mr-1.5 flex-shrink-0" />
                  <select 
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full py-1.5 bg-transparent text-slate-800 font-bold text-xs sm:text-sm focus:outline-none appearance-none"
                  >
                    <option value="">ALL BRANCHES</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.branch_name.toUpperCase()}</option>
                    ))}
                  </select>
               </div>
             )}
          </div>

          <div className="flex gap-2 shrink-0 flex-col sm:flex-row">
             {collections.filter((c: any) => c.status === 'pending').length > 0 && !isClosed && branchId && (
                <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1.5 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5" /> {collections.filter((c: any) => c.status === 'pending').length} Pending
                </div>
             )}
             {branchId && (
             <div className="flex gap-2">
               <button onClick={() => setShowTransferModal(true)} disabled={closing || isClosed} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors shadow-sm text-nowrap disabled:opacity-50">
                 <RefreshCw className="w-3.5 h-3.5" /> Transfer
               </button>
               {isClosed ? (
                 (user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'manager') && (
                   <button onClick={handleOpenDayBook} disabled={closing} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 text-nowrap">
                     <Unlock className="w-3.5 h-3.5" /> Re-Open
                   </button>
                 )
               ) : (
                 <button onClick={openCloseModal} disabled={closing} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#f43f5e] hover:bg-[#e11d48] text-white px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 text-nowrap relative overflow-hidden">
                   {collections.filter((c: any) => c.status === 'pending').length > 0 && (
                     <div className="absolute inset-0 bg-slate-800/20"></div>
                   )}
                   <Lock className="w-3.5 h-3.5" /> Close
                 </button>
               )}
             </div>
             )}
          </div>
        </div>

        {/* 4 Main Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-[#0ea5e9] px-3 py-2.5 sm:py-3.5 rounded-lg shadow-sm text-white flex flex-col items-center justify-center text-center">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-90 mb-0.5">Opening Balance</div>
            <div className="text-sm sm:text-lg font-black leading-none">₹{formatAmount(openingBalance)}</div>
          </div>
          <div className="bg-[#10b981] px-3 py-2.5 sm:py-3.5 rounded-lg shadow-sm text-white flex flex-col items-center justify-center text-center">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-90 mb-0.5">Total Cash In</div>
            <div className="text-sm sm:text-lg font-black leading-none">+ ₹{formatAmount(totalInflows)}</div>
          </div>
          <div className="bg-[#f97316] px-3 py-2.5 sm:py-3.5 rounded-lg shadow-sm text-white flex flex-col items-center justify-center text-center">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-90 mb-0.5">Total Cash Out</div>
            <div className="text-sm sm:text-lg font-black leading-none">- ₹{formatAmount(totalOutflows)}</div>
          </div>
          <div className="bg-[#a855f7] px-3 py-2.5 sm:py-3.5 rounded-lg shadow-sm text-white flex flex-col items-center justify-center text-center">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-90 mb-0.5">Net Hand Cash</div>
            <div className="text-sm sm:text-lg font-black leading-none">₹{formatAmount(closingBalance)}</div>
          </div>
        </div>

        {/* Sub-breakdown Stats (like standard app view) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-1">Daily Activity Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-center">
            
            {/* EMI Collection */}
            <div className="border border-green-150 rounded-lg bg-green-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-green-700 tracking-wider">EMI Collection</div>
              <div className="text-sm font-black text-green-600 mt-1">+₹{formatAmount(totalCollections)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{collections.length} Txns</div>
            </div>

            {/* Processing Fees */}
            <div className="border border-emerald-150 rounded-lg bg-emerald-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Processing Fee</div>
              <div className="text-sm font-black text-emerald-600 mt-1">+₹{formatAmount(totalProcessingFees)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">Disb. Fees</div>
            </div>

            {/* Insurance Fees */}
            <div className="border border-emerald-150 rounded-lg bg-emerald-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Insurance Fee</div>
              <div className="text-sm font-black text-emerald-600 mt-1">+₹{formatAmount(totalInsuranceFees)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">Disb. Fees</div>
            </div>

            {/* Savings Deposit */}
            <div className="border border-teal-150 rounded-lg bg-teal-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-teal-700 tracking-wider">Savings Deposit</div>
              <div className="text-sm font-black text-teal-600 mt-1">+₹{formatAmount(totalSavingDeposits)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{savingsTxns.filter((t: any) => t.type === 'deposit' && t.account_type === 'saving').length} Txns</div>
            </div>

            {/* RD Deposit */}
            <div className="border border-purple-150 rounded-lg bg-purple-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-purple-700 tracking-wider">RD Deposit</div>
              <div className="text-sm font-black text-purple-600 mt-1">+₹{formatAmount(totalRDDeposits)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{savingsTxns.filter((t: any) => t.type === 'deposit' && t.account_type === 'rd').length} Txns</div>
            </div>

            {/* Product Sells */}
            <div className="border border-amber-150 rounded-lg bg-amber-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Product Sales</div>
              <div className="text-sm font-black text-amber-600 mt-1">+₹{formatAmount(totalProductSales)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{sales.length} Sales</div>
            </div>

            {/* Loan Disbursements */}
            <div className="border border-rose-150 rounded-lg bg-rose-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-rose-700 tracking-wider">Loans Disbursed</div>
              <div className="text-sm font-black text-rose-600 mt-1">-₹{formatAmount(totalDisbursements)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{disbursements.length} Loans</div>
            </div>

            {/* Savings Withdrawal */}
            <div className="border border-red-150 rounded-lg bg-red-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-red-700 tracking-wider">Savings Withdraw</div>
              <div className="text-sm font-black text-red-600 mt-1">-₹{formatAmount(totalSavingWithdrawals)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{savingsTxns.filter((t: any) => t.type === 'withdrawal' && t.account_type === 'saving').length} Txns</div>
            </div>

            {/* RD Withdrawal */}
            <div className="border border-fuchsia-150 rounded-lg bg-fuchsia-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-fuchsia-700 tracking-wider">RD Withdraw</div>
              <div className="text-sm font-black text-fuchsia-600 mt-1">-₹{formatAmount(totalRDWithdrawals)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{savingsTxns.filter((t: any) => t.type === 'withdrawal' && t.account_type === 'rd').length} Txns</div>
            </div>

            {/* Capital In */}
            <div className="border border-sky-150 rounded-lg bg-sky-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-sky-700 tracking-wider">Capital In</div>
              <div className="text-sm font-black text-sky-600 mt-1">+₹{formatAmount(totalCapitalIn)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{capital.length} Inflows</div>
            </div>

            {/* Base Expenses & Salaries */}
            <div className="border border-orange-150 rounded-lg bg-orange-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-orange-700 tracking-wider">Expenses & Salaries</div>
              <div className="text-sm font-black text-orange-600 mt-1">-₹{formatAmount(totalExpensesPaid + totalSalaries)}</div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{expenses.length + salaries.length} Items</div>
            </div>

            {/* Bank Net */}
            <div className="border border-indigo-150 rounded-lg bg-indigo-50/20 p-2 flex flex-col justify-between shadow-sm">
              <div className="text-[9px] font-black uppercase text-indigo-700 tracking-wider">Bank Net</div>
              <div className="text-sm font-black text-indigo-600 mt-1">
                {totalBankWithdrawals - totalBankDeposits >= 0 ? '+' : ''}₹{formatAmount(totalBankWithdrawals - totalBankDeposits)}
              </div>
              <div className="text-[8px] font-bold text-slate-400 mt-0.5">{bankTxns.length} Txns</div>
            </div>

          </div>
        </div>

        {/* Detailed Table view */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-1 max-h-[350px] overflow-y-auto">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr className="bg-[#e83e8c] text-white">
                    <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-r border-[#c2286e] w-24">Type</th>
                    <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-r border-[#c2286e]">Entity / Name</th>
                    <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-r border-[#c2286e]">Details</th>
                    <th className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-[#c2286e] text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-1.5 tracking-wider text-[10px] font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] inline-block ${item.type === 'inflow' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.type === 'inflow' ? 'CR (+)' : 'DR (-)'}
                        </span>
                        <div className="text-[9px] text-slate-400 mt-0.5">{formatTimeSafe(item.time)}</div>
                      </td>
                      <td className="px-3 py-1.5">
                         <div className="text-[11px] font-black text-slate-800 uppercase leading-snug">
                           {item.description.split(' - ')[1] || item.description}
                         </div>
                      </td>
                      <td className="px-3 py-1.5">
                         <div className="text-[9px] font-bold text-slate-500 uppercase">
                           {item.description.split(' - ')[0]}
                         </div>
                      </td>
                      <td className={`px-3 py-1.5 text-right text-xs font-black ${item.type === 'inflow' ? 'text-green-600' : 'text-red-500'}`}>
                        {item.type === 'inflow' ? '+' : '-'}₹{formatAmount(item.amount)}
                      </td>
                    </tr>
                  ))}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        No Transactions Found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>

      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200">
            <div className="bg-[#0ea5e9] px-6 py-4 flex items-center justify-between text-white">
              <h2 className="text-lg font-black tracking-wider flex items-center gap-2"><RefreshCw className="w-5 h-5" /> TRANSFER CASH TO BANK</h2>
              <button onClick={() => setShowTransferModal(false)} className="opacity-70 hover:opacity-100 transition-opacity"><ArrowDownLeft className="w-5 h-5 rotate-45" /></button>
            </div>
            <div className="p-6 space-y-5 bg-[#f8f9fa]">
              <div className="bg-white border text-[#0ea5e9] border-[#0ea5e9]/20 px-4 py-6 rounded-xl flex justify-between items-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Current Cash In Hand</span>
                <span className="text-3xl font-black">₹{formatAmount(closingBalance)}</span>
              </div>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1">Select Bank Account <span className="text-red-500">*</span></label>
                   <select 
                     required
                     value={selectedBank}
                     onChange={(e) => setSelectedBank(e.target.value)}
                     className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9]"
                   >
                     <option value="">-- Choose Account --</option>
                     {banks.map(b => (
                       <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                     ))}
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Amount <span className="text-red-500">*</span></label>
                   <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#0ea5e9]/20 focus-within:border-[#0ea5e9]">
                     <div className="bg-[#0ea5e9] text-white px-4 py-3 font-bold flex items-center justify-center">Rs</div>
                     <input 
                       required
                       type="number" 
                       value={transferAmount}
                       onChange={(e) => setTransferAmount(e.target.value)}
                       className="w-full px-4 py-3 text-lg font-black text-slate-800 outline-none"
                       placeholder="0"
                     />
                   </div>
                </div>
                <button type="submit" disabled={closing} className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 mt-2">
                  <RefreshCw className="w-5 h-5" /> Send to Bank
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Close Day Book Modal (Full Page Overlay) */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#f8f9fa] overflow-y-auto w-full h-full">
          <div className="bg-[#f43f5e] px-4 sm:px-8 py-6 flex items-center justify-between text-white shadow-md sticky top-0 z-10">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-wider flex items-center gap-3">
                <Lock className="w-8 h-8" /> SECURE DAY CLOSE
              </h2>
              <p className="text-rose-100 font-bold mt-1 tracking-wide">Summary for {format(new Date(date), 'dd MMMM yyyy')}</p>
            </div>
            <button onClick={() => setShowCloseModal(false)} className="bg-white/20 hover:bg-white/30 p-2 sm:p-3 rounded-full transition-colors">
              <ArrowDownLeft className="w-6 h-6 rotate-45" />
            </button>
          </div>

          <div className="flex-1 p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
            
            {/* Day's Activities Summary Box */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Today's Performance Summary</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse whitespace-nowrap">
                   <thead>
                     <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500 font-bold">
                       <th className="px-6 py-4">Category</th>
                       <th className="px-6 py-4 text-center">Count</th>
                       <th className="px-6 py-4 text-right">Amount</th>
                       <th className="px-6 py-4 text-center">Confirm</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     <tr className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm font-bold text-slate-700">Collections Received</td>
                       <td className="px-6 py-4 text-center text-lg font-black text-[#10b981]">{collections.length}</td>
                       <td className="px-6 py-4 text-right text-base font-bold text-slate-800">₹{formatAmount(totalCollections)}</td>
                       <td className="px-6 py-4">
                         <label className="flex items-center justify-center cursor-pointer">
                           <input type="checkbox" checked={confirmCollections} onChange={e=>setConfirmCollections(e.target.checked)} className="w-5 h-5 text-[#10b981] rounded border-slate-300 focus:ring-[#10b981]" />
                         </label>
                       </td>
                     </tr>
                     <tr className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm font-bold text-slate-700">Loans Disbursed</td>
                       <td className="px-6 py-4 text-center text-lg font-black text-[#0ea5e9]">{disbursements.length}</td>
                       <td className="px-6 py-4 text-right text-base font-bold text-slate-800">₹{formatAmount(totalDisbursements)}</td>
                       <td className="px-6 py-4">
                         <label className="flex items-center justify-center cursor-pointer">
                           <input type="checkbox" checked={confirmDisbursements} onChange={e=>setConfirmDisbursements(e.target.checked)} className="w-5 h-5 text-[#0ea5e9] rounded border-slate-300 focus:ring-[#0ea5e9]" />
                         </label>
                       </td>
                     </tr>
                     <tr className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm font-bold text-slate-700">Processing Fee Collected</td>
                       <td className="px-6 py-4 text-center text-lg font-black text-emerald-600">
                         {disbursements.filter((d: any) => parseFloat(d.processing_fee || 0) > 0).length}
                       </td>
                       <td className="px-6 py-4 text-right text-base font-bold text-slate-800">₹{formatAmount(totalProcessingFees)}</td>
                       <td className="px-6 py-4">
                         <label className="flex items-center justify-center cursor-pointer">
                           <input type="checkbox" checked={confirmProcessing} onChange={e=>setConfirmProcessing(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600" />
                         </label>
                       </td>
                     </tr>
                     <tr className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm font-bold text-slate-700">Insurance Fee Collected</td>
                       <td className="px-6 py-4 text-center text-lg font-black text-emerald-600">
                         {disbursements.filter((d: any) => parseFloat(d.insurance_fee || 0) > 0).length}
                       </td>
                       <td className="px-6 py-4 text-right text-base font-bold text-slate-800">₹{formatAmount(totalInsuranceFees)}</td>
                       <td className="px-6 py-4">
                         <label className="flex items-center justify-center cursor-pointer">
                           <input type="checkbox" checked={confirmInsurance} onChange={e=>setConfirmInsurance(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-600" />
                         </label>
                       </td>
                     </tr>
                     <tr className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm font-bold text-slate-700">Expenses / Salary</td>
                       <td className="px-6 py-4 text-center text-lg font-black text-[#f97316]">{expenses.length + salaries.length}</td>
                       <td className="px-6 py-4 text-right text-base font-bold text-slate-800">₹{formatAmount(totalExpensesPaid + totalSalaries)}</td>
                       <td className="px-6 py-4">
                         <label className="flex items-center justify-center cursor-pointer">
                           <input type="checkbox" checked={confirmExpenses} onChange={e=>setConfirmExpenses(e.target.checked)} className="w-5 h-5 text-[#f97316] rounded border-slate-300 focus:ring-[#f97316]" />
                         </label>
                       </td>
                     </tr>
                     <tr className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm font-bold text-slate-700">Bank Transfers (In / Out)</td>
                       <td className="px-6 py-4 text-center text-lg font-black text-[#8b5cf6]">{bankTxns.length}</td>
                       <td className="px-6 py-4 text-right text-base font-bold text-slate-800">
                         +₹{formatAmount(totalBankWithdrawals)} / -₹{formatAmount(totalBankDeposits)}
                       </td>
                       <td className="px-6 py-4">
                         <label className="flex items-center justify-center cursor-pointer">
                           <input type="checkbox" checked={confirmBank} onChange={e=>setConfirmBank(e.target.checked)} className="w-5 h-5 text-[#8b5cf6] rounded border-slate-300 focus:ring-[#8b5cf6]" />
                         </label>
                       </td>
                     </tr>
                     <tr className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm font-bold text-slate-700">Savings / Deposits (Saving & RD)</td>
                       <td className="px-6 py-4 text-center text-lg font-black text-[#ec4899]">{savingsTxns.length}</td>
                       <td className="px-6 py-4 text-right text-base font-bold text-slate-800">
                         +₹{formatAmount(totalSavingsDeposits)} / -₹{formatAmount(totalSavingsWithdrawals)}
                       </td>
                       <td className="px-6 py-4">
                         <label className="flex items-center justify-center cursor-pointer">
                           <input type="checkbox" checked={confirmSavings} onChange={e=>setConfirmSavings(e.target.checked)} className="w-5 h-5 text-[#ec4899] rounded border-slate-300 focus:ring-[#ec4899]" />
                         </label>
                       </td>
                     </tr>
                     <tr className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4 text-sm font-bold text-slate-700">Product Sell (Cash)</td>
                       <td className="px-6 py-4 text-center text-lg font-black text-[#eab308]">{sales.length}</td>
                       <td className="px-6 py-4 text-right text-base font-bold text-slate-800">₹{formatAmount(totalProductSales)}</td>
                       <td className="px-6 py-4">
                         <label className="flex items-center justify-center cursor-pointer">
                           <input type="checkbox" checked={confirmProducts} onChange={e=>setConfirmProducts(e.target.checked)} className="w-5 h-5 text-[#eab308] rounded border-slate-300 focus:ring-[#eab308]" />
                          </label>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">Capital Introduced (Cash)</td>
                        <td className="px-6 py-4 text-center text-lg font-black text-[#0284c7]">{capital.length}</td>
                        <td className="px-6 py-4 text-right text-base font-bold text-slate-800">₹{formatAmount(totalCapitalIn)}</td>
                        <td className="px-6 py-4">
                          <label className="flex items-center justify-center cursor-pointer">
                            <input type="checkbox" checked={confirmCapital} onChange={e=>setConfirmCapital(e.target.checked)} className="w-5 h-5 text-[#0284c7] rounded border-slate-300 focus:ring-[#0284c7]" />
                          </label>
                        </td>
                      </tr>
                      <tr className="hidden">
                        <td>
                          <label>
                            <input type="checkbox" style={{display:'none'}} />
                         </label>
                       </td>
                     </tr>
                   </tbody>
                 </table>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               
               {/* Financial Breakdown */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Financial Breakdown</h3>
                 </div>
                 <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                      <span className="text-sm font-bold text-slate-600">Opening Balance</span>
                      <span className="text-lg font-black text-slate-800">₹{formatAmount(openingBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                      <span className="text-sm font-bold text-[#10b981]">Total Cash In (+)</span>
                      <span className="text-lg font-black text-[#10b981]">₹{formatAmount(totalInflows)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                      <span className="text-sm font-bold text-[#f43f5e]">Total Cash Out (-)</span>
                      <span className="text-lg font-black text-[#f43f5e]">₹{formatAmount(totalOutflows)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-black uppercase text-slate-800">Final Closing Balance</span>
                      <span className="text-3xl font-black text-[#0ea5e9]">₹{formatAmount(closingBalance)}</span>
                    </div>
                 </div>
               </div>

               {/* Closing Actions */}
               <div className="bg-white rounded-2xl shadow-sm border border-rose-200 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#f43f5e]"></div>
                  <div className="px-6 py-5 border-b border-slate-100 bg-rose-50/30">
                    <h3 className="text-sm font-black uppercase text-rose-800 tracking-widest">Execute Day Close</h3>
                  </div>
                  
                  <form onSubmit={handleCloseDayBook} className="p-6 space-y-6">
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
                       <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                       <div className="text-xs font-bold text-rose-800 leading-relaxed">
                         Closing the Day Book will <b>LOCK</b> all transactions for this date. Ensure all cash matches the Final Closing Balance physically. Action cannot be easily undone.
                       </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Deposit Cash to Bank? <span className="text-slate-400 font-medium normal-case">(Optional)</span></label>
                         <select 
                           value={selectedBank}
                           onChange={(e) => setSelectedBank(e.target.value)}
                           className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#f43f5e]/20 focus:border-[#f43f5e] transition-all"
                         >
                           <option value="">-- No Deposit --</option>
                           {banks.map(b => (
                             <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>
                           ))}
                         </select>
                      </div>
                      
                      {selectedBank && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                           <label className="block text-xs font-bold text-[#10b981] mb-2 uppercase tracking-wider">Deposit Amount *</label>
                           <div className="flex bg-white border border-[#10b981] rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-[#10b981]/20 transition-shadow">
                             <div className="bg-[#10b981] text-white px-5 py-4 font-black flex items-center justify-center">Rs</div>
                             <input 
                               type="number" 
                               value={transferAmount}
                               onChange={(e) => setTransferAmount(e.target.value)}
                               required={!!selectedBank}
                               className="w-full px-5 py-4 text-xl font-black text-[#10b981] outline-none bg-transparent"
                               placeholder="0"
                             />
                           </div>
                           {parseFloat(transferAmount || '0') > closingBalance && (
                             <div className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Cannot exceed Final Closing Balance!</div>
                           )}
                        </motion.div>
                      )}
                    </div>

                    {selectedBank && transferAmount && parseFloat(transferAmount) > 0 && parseFloat(transferAmount) <= closingBalance && (
                      <div className="bg-slate-800 text-white border border-slate-900 px-5 py-4 rounded-xl shadow-inner mt-4 flex items-center justify-between">
                         <div>
                           <div className="text-xs font-black uppercase tracking-wider text-slate-300">Net Hand Cash</div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Carried Forward</div>
                         </div>
                         <div className="text-2xl font-black text-emerald-400">
                           ₹{formatAmount(Math.max(0, closingBalance - parseFloat(transferAmount || '0')))}
                         </div>
                      </div>
                    )}

                    <div className="flex gap-4 pt-6 border-t border-slate-100">
                      <button type="button" onClick={() => setShowCloseModal(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={!confirmCollections || !confirmDisbursements || !confirmProcessing || !confirmInsurance || !confirmExpenses || !confirmBank || !confirmSavings || !confirmProducts || !confirmCapital || closing || parseFloat(transferAmount || '0') > closingBalance} className="flex-[2] bg-[#f43f5e] hover:bg-[#e11d48] text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-md shadow-rose-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg">
                        <Lock className="w-5 h-5" /> Confirm Day Close
                      </button>
                    </div>
                  </form>
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
