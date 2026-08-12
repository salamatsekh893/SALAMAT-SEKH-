import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Calendar, Building2, FileSpreadsheet, X, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { fetchWithAuth } from '../lib/api';

interface MonthlyDayBookExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export default function MonthlyDayBookExportModal({ isOpen, onClose, user }: MonthlyDayBookExportModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isMultiBranchUser = !user || user.role === 'superadmin' || user.role === 'admin' || user.role === 'manager';

  useEffect(() => {
    if (isOpen) {
      if (isMultiBranchUser) {
        loadBranches();
      } else if (user?.branchId || user?.branch_id) {
        setBranchId(String(user.branchId || user.branch_id));
      }
    }
  }, [isOpen, user]);

  const loadBranches = async () => {
    try {
      const bList = await fetchWithAuth('/branches');
      setBranches(bList || []);
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  };

  const handleDownload = async (reportType: 'disbursement' | 'daybook' | 'all' = 'all') => {
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      let url = `/daybook/monthly-report?month=${selectedMonth}`;
      if (branchId) {
        url += `&branch_id=${branchId}`;
      }

      const reportData = await fetchWithAuth(url);

      if (!reportData) {
        throw new Error('No data received for monthly report');
      }

      const branchName = branchId 
        ? (branches.find(b => String(b.id) === String(branchId))?.branch_name || `Branch_${branchId}`)
        : 'All_Branches';

      // --- SHEET 1: Monthly Daily Balances Summary ---
      const summarySheetData: any[] = [
        ['Aljooya Subidha Services - Monthly Day Book Summary Report'],
        [`Month: ${selectedMonth}`, `Branch: ${branchName}`],
        [],
        ['Date (তারিখ)', 'Branch (ব্রাঞ্চ)', 'Opening Balance (প্রারম্ভিক ₹)', 'Total Inflow (মোট জমা ₹)', 'Total Outflow (মোট খরচ ₹)', 'Closing Balance (সমাপনী ₹)', 'Status (স্ট্যাটাস)']
      ];

      let totInflow = 0;
      let totOutflow = 0;

      if (reportData.dailyBalances && reportData.dailyBalances.length > 0) {
        reportData.dailyBalances.forEach((item: any) => {
          const inflow = Math.round(Number(item.total_inflow || 0));
          const outflow = Math.round(Number(item.total_outflow || 0));
          totInflow += inflow;
          totOutflow += outflow;

          summarySheetData.push([
            item.date ? format(new Date(item.date), 'dd-MMM-yyyy') : '',
            item.branch_name || 'HO',
            Math.round(Number(item.opening_balance || 0)),
            inflow,
            outflow,
            Math.round(Number(item.closing_balance || 0)),
            (item.status || 'closed').toUpperCase()
          ]);
        });
      } else {
        summarySheetData.push(['No daily close records found for this month.', '', 0, 0, 0, 0, '']);
      }

      summarySheetData.push([]);
      summarySheetData.push([
        'MONTHLY TOTALS',
        '',
        '',
        totInflow,
        totOutflow,
        totInflow - totOutflow,
        ''
      ]);

      // --- SHEET 2: Dedicated Loan Disbursements (মাসিক ঋণ প্রদান বিবরণী) ---
      const loanDisbursementSheetData: any[] = [
        ['Aljooya Subidha Services - Monthly Loan Disbursement Report'],
        [`Month: ${selectedMonth}`, `Branch: ${branchName}`],
        [],
        [
          'Sl No (ক্রমিক)',
          'Loan No (লোন নম্বর)',
          'Disbursement Date (বিতরণের তারিখ)',
          '1st EMI Date (প্রথম কিস্তির তারিখ)',
          'Branch (ব্রাঞ্চ)',
          'Customer Name (কাস্টমার নাম)',
          'Customer Code (সদস্য কোড)',
          'Mobile No (মোবাইল নম্বর)',
          'Scheme Name (স্কিম)',
          'Loan Amount (লোনের পরিমাণ ₹)',
          'Processing Fee (প্রসেসিং ফি ₹)',
          'Interest Rate (%)',
          'EMI Amount (কিস্তি ₹)',
          'Duration (Weeks)',
          'Total Payable (মোট প্রদেয় ₹)',
          'Status (স্ট্যাটাস)'
        ]
      ];

      let totalLoanDisbursed = 0;
      let totalProcessingFees = 0;
      let totalPayableSum = 0;

      (reportData.disbursements || []).forEach((d: any, index: number) => {
        const amt = Math.round(Number(d.loan_amount || d.amount || 0));
        const pFee = Math.round(Number(d.processing_fee || 0));
        const tPayable = Math.round(Number(d.total_payable || amt));

        totalLoanDisbursed += amt;
        totalProcessingFees += pFee;
        totalPayableSum += tPayable;

        loanDisbursementSheetData.push([
          index + 1,
          d.loan_no || `L-${d.loan_id || index + 1}`,
          d.loan_date || d.date || '',
          d.first_emi_date || d.loan_date || '-',
          d.branch_name || 'HO',
          d.member_name || 'Unknown',
          d.member_code || '-',
          d.member_mobile || '-',
          d.scheme_name || 'General Loan',
          amt,
          pFee,
          d.interest_rate || 0,
          Math.round(Number(d.emi_amount || 0)),
          d.duration_weeks || 0,
          tPayable,
          (d.loan_status || 'active').toUpperCase()
        ]);
      });

      loanDisbursementSheetData.push([]);
      loanDisbursementSheetData.push([
        'TOTALS',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        totalLoanDisbursed,
        totalProcessingFees,
        '',
        '',
        '',
        totalPayableSum,
        ''
      ]);

      // --- SHEET 3: Inflows Ledger (জমা হিসাব) ---
      const inflowsSheetData: any[] = [
        ['Sl No', 'Transaction Date (তারিখ)', 'Branch (ব্রাঞ্চ)', 'Category (ক্যাটাগরি)', 'Customer Name (কাস্টমার নাম)', 'Customer Code (সদস্য কোড)', 'Loan Date (লোনের তারিখ)', 'Loan Amount (লোনের পরিমাণ ₹)', 'Description (বিবরণ)', 'Inflow Amount (জমা ₹)']
      ];

      let totalInflowLedger = 0;
      let inflowSl = 1;

      // Collections
      (reportData.collections || []).forEach((c: any) => {
        const amt = Math.round(Number(c.amount || 0));
        totalInflowLedger += amt;
        inflowsSheetData.push([
          inflowSl++,
          c.date,
          c.branch_name,
          c.category,
          c.member_name || '',
          c.member_code || '',
          c.loan_date || '',
          c.loan_amount ? Math.round(Number(c.loan_amount)) : '',
          c.description,
          amt
        ]);
      });

      // Product Sales
      (reportData.sales || []).forEach((s: any) => {
        const amt = Math.round(Number(s.amount || 0));
        totalInflowLedger += amt;
        inflowsSheetData.push([
          inflowSl++,
          s.date,
          s.branch_name,
          s.category,
          s.member_name || '',
          s.member_code || '',
          '',
          '',
          s.description,
          amt
        ]);
      });

      // Savings Deposits
      (reportData.savingsTxns || []).filter((st: any) => st.type === 'deposit').forEach((st: any) => {
        const amt = Math.round(Number(st.amount || 0));
        totalInflowLedger += amt;
        inflowsSheetData.push([
          inflowSl++,
          st.date,
          st.branch_name,
          st.category,
          st.member_name || '',
          st.member_code || '',
          '',
          '',
          st.description,
          amt
        ]);
      });

      // Bank to Cash Funding
      (reportData.bankTxns || []).filter((bt: any) => bt.type === 'withdrawal').forEach((bt: any) => {
        const amt = Math.round(Number(bt.amount || 0));
        totalInflowLedger += amt;
        inflowsSheetData.push([
          inflowSl++,
          bt.date,
          bt.branch_name,
          bt.category,
          '-',
          '-',
          '',
          '',
          bt.description,
          amt
        ]);
      });

      inflowsSheetData.push([]);
      inflowsSheetData.push(['TOTAL INFLOWS', '', '', '', '', '', '', '', '', totalInflowLedger]);

      // --- SHEET 4: Outflows Ledger (খরচ/প্রদান হিসাব) ---
      const outflowsSheetData: any[] = [
        ['Sl No', 'Transaction Date (তারিখ)', 'Branch (ব্রাঞ্চ)', 'Category (ক্যাটাগরি)', 'Customer / Payee Name (গ্রহীতা/কাস্টমার নাম)', 'Customer Code (সদস্য কোড)', 'Loan Date (লোনের তারিখ)', 'Loan Amount (লোনের পরিমাণ ₹)', 'Description (বিবরণ)', 'Outflow Amount (খরচ ₹)']
      ];

      let totalOutflowLedger = 0;
      let outflowSl = 1;

      // Loan Disbursements
      (reportData.disbursements || []).forEach((d: any) => {
        const amt = Math.round(Number(d.amount || 0));
        totalOutflowLedger += amt;
        outflowsSheetData.push([
          outflowSl++,
          d.date,
          d.branch_name,
          d.category,
          d.member_name || '',
          d.member_code || '',
          d.loan_date || d.date,
          Math.round(Number(d.loan_amount || d.amount)),
          d.description,
          amt
        ]);
      });

      // Expenses
      (reportData.expenses || []).forEach((e: any) => {
        const amt = Math.round(Number(e.amount || 0));
        totalOutflowLedger += amt;
        outflowsSheetData.push([
          outflowSl++,
          e.date,
          e.branch_name,
          e.category,
          '-',
          '-',
          '',
          '',
          e.description,
          amt
        ]);
      });

      // Salaries
      (reportData.salaries || []).forEach((sal: any) => {
        const amt = Math.round(Number(sal.amount || 0));
        totalOutflowLedger += amt;
        outflowsSheetData.push([
          outflowSl++,
          sal.date,
          sal.branch_name,
          sal.category,
          sal.member_name || 'Staff',
          '-',
          '',
          '',
          sal.description,
          amt
        ]);
      });

      // Savings Withdrawals
      (reportData.savingsTxns || []).filter((st: any) => st.type === 'withdrawal').forEach((st: any) => {
        const amt = Math.round(Number(st.amount || 0));
        totalOutflowLedger += amt;
        outflowsSheetData.push([
          outflowSl++,
          st.date,
          st.branch_name,
          st.category,
          st.member_name || '',
          st.member_code || '',
          '',
          '',
          st.description,
          amt
        ]);
      });

      // Cash to Bank Deposits
      (reportData.bankTxns || []).filter((bt: any) => bt.type === 'deposit').forEach((bt: any) => {
        const amt = Math.round(Number(bt.amount || 0));
        totalOutflowLedger += amt;
        outflowsSheetData.push([
          outflowSl++,
          bt.date,
          bt.branch_name,
          bt.category,
          '-',
          '-',
          '',
          '',
          bt.description,
          amt
        ]);
      });

      outflowsSheetData.push([]);
      outflowsSheetData.push(['TOTAL OUTFLOWS', '', '', '', '', '', '', '', '', totalOutflowLedger]);

      // Create Workbook
      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
      const wsLoans = XLSX.utils.aoa_to_sheet(loanDisbursementSheetData);
      const wsInflows = XLSX.utils.aoa_to_sheet(inflowsSheetData);
      const wsOutflows = XLSX.utils.aoa_to_sheet(outflowsSheetData);

      const timeStamp = format(new Date(), 'HHmmss');

      if (reportType === 'disbursement') {
        XLSX.utils.book_append_sheet(wb, wsLoans, 'Loan Disbursements');
        const fileName = `Monthly_Disbursements_${selectedMonth}_${branchName}_${timeStamp}.xlsx`;
        XLSX.writeFile(wb, fileName);
        setSuccessMsg(`Monthly Loan Disbursement report exported! (${fileName})`);
      } else if (reportType === 'daybook') {
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Daily Summary');
        XLSX.utils.book_append_sheet(wb, wsInflows, 'Inflows (জমা)');
        XLSX.utils.book_append_sheet(wb, wsOutflows, 'Outflows (খরচ)');
        const fileName = `Monthly_DayBook_${selectedMonth}_${branchName}_${timeStamp}.xlsx`;
        XLSX.writeFile(wb, fileName);
        setSuccessMsg(`Monthly Day Book report exported! (${fileName})`);
      } else {
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Daily Summary');
        XLSX.utils.book_append_sheet(wb, wsLoans, 'Loan Disbursements');
        XLSX.utils.book_append_sheet(wb, wsInflows, 'Inflows (জমা)');
        XLSX.utils.book_append_sheet(wb, wsOutflows, 'Outflows (খরচ)');
        const fileName = `Monthly_Complete_DayBook_${selectedMonth}_${branchName}_${timeStamp}.xlsx`;
        XLSX.writeFile(wb, fileName);
        setSuccessMsg(`Combined Monthly Day Book & Disbursement report exported! (${fileName})`);
      }
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate Excel report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <FileSpreadsheet className="w-6 h-6 text-emerald-100" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight leading-tight">Monthly DB Excel Report</h3>
                <p className="text-[11px] text-emerald-100 font-medium">মাসিক ডে বুক এক্সেল রিপোর্ট ডাউনলোড</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Month Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" /> সিলেক্ট মাস (Select Month)
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm font-bold text-slate-800 outline-none transition-all bg-slate-50/50"
              />
            </div>

            {/* Branch Selector (If admin/superadmin) */}
            {isMultiBranchUser && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" /> সিলেক্ট ব্রাঞ্চ (Select Branch)
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-sm font-bold text-slate-800 outline-none transition-all bg-slate-50/50"
                >
                  <option value="">🏢 সমস্ত ব্রাঞ্চ (All Branches)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.branch_name} ({b.branch_code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notification messages */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Note box */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed font-medium space-y-1">
              <p>💡 <strong>লোন বিতরণ রিপোর্ট:</strong> লোন নম্বর, কাস্টমার নাম, কাস্টমার কোড, স্কিম, প্রসেসিং ফি, কিস্তি পরিমাণ, সুদের হার ও মোট প্রদেয়।</p>
              <p>💡 <strong>ডে বুক রিপোর্ট:</strong> দৈনিক ক্যাশ সামারি, জমার লেজার ও খরচের লেজার।</p>
            </div>

            {/* Action Buttons - 2 Dedicated Download Buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload('disbursement')}
                  disabled={loading}
                  className="py-3 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 text-blue-200" />
                      <span>1. লোন বিতরণ এক্সেল</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('daybook')}
                  disabled={loading}
                  className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                      <span>2. ডে বুক এক্সেল</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleDownload('all')}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow hover:shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-300" />
                <span>3. সব রিপোর্ট একত্রে (All-in-One Excel)</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
