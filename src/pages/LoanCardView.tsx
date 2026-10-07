import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, X, Download, BookOpen, ShieldCheck, PhoneCall, Landmark, CheckCircle, Sparkles } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { format, addWeeks, addDays, addMonths } from 'date-fns';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function LoanCardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [viewMode, setViewMode] = useState<'cover' | 'schedule'>('cover');
  const printRef = useRef<HTMLDivElement>(null);

  const [collections, setCollections] = useState<any[]>([]);
  const [passbookMode, setPassbookMode] = useState<'real' | 'blank'>('real');
  const [signatureMode, setSignatureMode] = useState<'digital' | 'manual'>('digital');
  const [activeSheetTab, setActiveSheetTab] = useState<'all' | number>('all');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loanData, companiesData, collectionsData] = await Promise.all([
        fetchWithAuth(`/loans/${id}`),
        fetchWithAuth('/companies'),
        fetchWithAuth(`/collections?loan_id=${id}`).catch(() => [])
      ]);
      setLoan(loanData);
      if (companiesData && companiesData.length > 0) {
        setCompany(companiesData[0]);
      }
      if (collectionsData) {
        setCollections(Array.isArray(collectionsData) ? collectionsData : collectionsData.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load loan card:', err);
    } finally {
      setLoading(false);
    }
  };

  const c_name = company?.company_name || company?.name || 'ALJOOYA SUBIDHA SERVICES';
  const c_address = company?.address || 'প্রধান কার্যালয়, পশ্চিমবঙ্গ';
  const c_phone = company?.contact_no || 'উপলব্ধ নয় (N/A)';
  const c_email = company?.email || `support@${c_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'aljooya'}.com`;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd-MM-yyyy');
    } catch (e) {
      return '-';
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      setGeneratingPDF(true);
      const sheetElements = printRef.current.querySelectorAll('.loan-card-sheet');
      if (sheetElements.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < sheetElements.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }
        const element = sheetElements[i] as HTMLElement;
        const dataUrl = await toPng(element, { quality: 0.98, pixelRatio: 2 });
        pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210);
      }

      pdf.save(`LoanCard_${viewMode}_${loan?.loan_no || id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('PDF তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে Print Card বাটন ব্যবহার করুন।');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-['Hind_Siliguri'] text-sm tracking-widest font-semibold uppercase">লোন কার্ড লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
        <h2 className="text-xl font-bold font-['Hind_Siliguri']">কার্ড পাওয়া যায়নি!</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-5 py-2.5 bg-pink-600 text-white rounded-xl font-semibold">ফিরে যান</button>
      </div>
    );
  }

  // Generate Installment Rows
  const numInstallments = parseInt(loan.duration_weeks) || parseInt(loan.no_of_emis) || 12;
  const rows = [];
  const baseDateStr = loan.start_date || loan.disbursement_date;
  let currentDate = baseDateStr ? new Date(baseDateStr) : new Date();

  const totalPrincipal = Math.round(Number(loan.amount) || 0);
  const totalRepaymentRaw = Number(loan.total_repayment);
  const totalRepayment = totalRepaymentRaw > 0 
    ? Math.round(totalRepaymentRaw)
    : Math.round(Number(loan.installment) * numInstallments) || Math.round(totalPrincipal + Number(loan.interest || 0));
  
  const baseEMI = loan.installment ? Math.round(Number(loan.installment)) : Math.round(totalRepayment / numInstallments);
  const basePrincipal = Math.round(totalPrincipal / numInstallments);
  
  let remainingPrincipal = totalPrincipal;
  let remainingOutstanding = totalRepayment;

  // Distribute collections across EMIs
  let collectionPool = collections
    .filter(c => c.status !== 'rejected' && c.remarks !== 'Late Payment Penalty/Fine')
    .map(c => {
       const pd = c.payment_date ? new Date(c.payment_date) : new Date();
       return {
         rawDate: pd.getTime(),
         date: format(pd, 'dd-MMM-yy'),
         avail: Number(c.amount_paid)
       };
    })
    .sort((a, b) => a.rawDate - b.rawDate);

  for (let i = 1; i <= numInstallments; i++) {
    const isLast = i === numInstallments;
    
    // Adjust last EMI so total matches exactly
    const emiPrincipal = isLast ? remainingPrincipal : basePrincipal;
    const emiAmount = isLast ? remainingOutstanding : baseEMI;
    const emiInterest = emiAmount - emiPrincipal;
    
    remainingPrincipal -= emiPrincipal;
    remainingOutstanding -= emiAmount;
    
    // Fill from collectionPool
    let collectedForThisEmi = 0;
    let recvDate = '';
    let amountNeeded = emiAmount;

    while (amountNeeded > 0 && collectionPool.length > 0) {
      let currentColl = collectionPool[0];
      if (currentColl.avail <= 0) {
        collectionPool.shift();
        continue;
      }

      recvDate = currentColl.date;
      if (currentColl.avail >= amountNeeded) {
        collectedForThisEmi += amountNeeded;
        currentColl.avail -= amountNeeded;
        amountNeeded = 0;
      } else {
        collectedForThisEmi += currentColl.avail;
        amountNeeded -= currentColl.avail;
        currentColl.avail = 0;
        collectionPool.shift();
      }
    }

    rows.push({
      instNo: i,
      date: format(currentDate, 'dd-MMM-yyyy'),
      amount: emiAmount,
      principal: emiPrincipal,
      interest: emiInterest,
      outstanding: remainingOutstanding,
      recvDate: collectedForThisEmi > 0 ? recvDate : '',
      collectedAmt: collectedForThisEmi > 0 ? formatAmount(collectedForThisEmi) : '',
      isPaid: collectedForThisEmi >= emiAmount
    });

    const freq = (loan.emi_frequency || 'weekly').toLowerCase();
    if (freq === 'daily') {
      currentDate = addDays(currentDate, 1);
    } else if (freq.includes('bi')) {
      currentDate = addWeeks(currentDate, 2);
    } else if (freq === 'monthly') {
      currentDate = addMonths(currentDate, 1);
    } else {
      currentDate = addWeeks(currentDate, 1);
    }
  }

  const processedRows = rows.map(r => {
    if (passbookMode === 'blank') {
      return {
        ...r,
        recvDate: '',
        collectedAmt: '',
        isPaid: false
      };
    }
    return r;
  });

  // =========================================================================
  // AUTOMATIC & INTELLIGENT SHEET/COLUMN BALANCING (No manual guesswork needed)
  // Up to 52 EMIs per A4 Landscape sheet (26 on Left, 26 on Right)
  // For 52 EMIs: Left has 1-26, Right has 27-52 -> Both sides end at exact same height!
  // For 104 EMIs: Sheet 1 has 1-52, Sheet 2 has 53-104 -> Both sheets completely filled!
  // =========================================================================
  const rowsPerSheet = 52;
  const totalSheets = Math.max(1, Math.ceil(processedRows.length / rowsPerSheet));
  const sheets: any[] = [];

  for (let s = 0; s < totalSheets; s++) {
    const sheetSlice = processedRows.slice(s * rowsPerSheet, (s + 1) * rowsPerSheet);
    
    // Balanced split:
    // If sheet has > 26 rows (e.g. 52 rows): split evenly into 26 left and 26 right!
    // If sheet has <= 26 rows: keep all on left, and right gets the official inspection box!
    let leftCount = 26;
    if (sheetSlice.length <= 26) {
      leftCount = sheetSlice.length;
    } else {
      // Balance evenly so both columns match in height
      leftCount = Math.ceil(sheetSlice.length / 2);
    }

    const leftRows = sheetSlice.slice(0, leftCount);
    const rightRows = sheetSlice.slice(leftCount);
    const startNo = s * rowsPerSheet + 1;
    const endNo = s * rowsPerSheet + sheetSlice.length;

    sheets.push({
      sheetIndex: s + 1,
      totalSheets,
      leftRows,
      rightRows,
      startNo,
      endNo,
      rangeText: `কিস্তি ${startNo} - ${endNo}`
    });
  }

  return (
    <div className="min-h-screen bg-slate-900 print:bg-white flex flex-col font-['Hind_Siliguri',sans-serif]">
      {/* Top Navbar / Controls Bar - Clean, modern, high-contrast (Hidden during print) */}
      <div className="print:hidden w-full px-5 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 sticky top-0 z-20 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-2.5 rounded-xl text-white shadow-lg shadow-pink-600/30">
            {company?.logo_url ? (
              <img src={company.logo_url} className="w-5 h-5 object-contain" alt="" />
            ) : (
              <Landmark className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-black text-sm tracking-wide uppercase">{c_name}</h1>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 font-bold px-2 py-0.5 rounded-full border border-pink-500/30">
                {numInstallments} কিস্তি ({totalSheets} পাতা)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">অফিসিয়াল ঋণ পাসবই ও পরিশোধ রেকর্ড কার্ড</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-inner">
          <button 
            type="button"
            onClick={() => setViewMode('cover')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
              viewMode === 'cover' 
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 scale-102' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> 📔 পাসবই কভার পেজ
          </button>
          
          <button 
            type="button"
            onClick={() => setViewMode('schedule')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
              viewMode === 'schedule' 
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 scale-102' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> 💳 কিস্তি শিডিউল কার্ড
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-pink-600/25 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> প্রিন্ট কার্ড (Print)
          </button>
          <button 
            onClick={handleDownloadPDF} 
            disabled={generatingPDF} 
            className={`flex items-center gap-2 ${generatingPDF ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'} px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer`}
          >
            {generatingPDF ? 'পিডিএফ তৈরি হচ্ছে...' : <><Download className="w-4 h-4 text-pink-400" /> ডাউনলোড PDF</>}
          </button>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center justify-center p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700/60"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-bar for schedule view (Data mode, Signature mode, Sheet selection) */}
      {viewMode === 'schedule' && (
        <div className="print:hidden w-full px-5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            
            {/* Sheet Tabs for 104 EMI */}
            {totalSheets > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold text-[11px]">পাতা নির্বাচন:</span>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveSheetTab('all')}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      activeSheetTab === 'all' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    সব পাতা ({totalSheets})
                  </button>
                  {sheets.map((sh) => (
                    <button
                      key={sh.sheetIndex}
                      type="button"
                      onClick={() => setActiveSheetTab(sh.sheetIndex)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        activeSheetTab === sh.sheetIndex ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      পাতা {sh.sheetIndex} ({sh.rangeText})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Real vs Blank Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold text-[11px]">ডাটা মোড:</span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPassbookMode('real')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    passbookMode === 'real' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✓ রিয়েল আদায় ডাটা
                </button>
                <button
                  type="button"
                  onClick={() => setPassbookMode('blank')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    passbookMode === 'blank' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✍️ ফাঁকা খাতা (Blank)
                </button>
              </div>
            </div>

            {/* Digital Sign Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold text-[11px]">কর্মী সই:</span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSignatureMode('digital')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    signatureMode === 'digital' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✓ ডিজিটাল সই
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('manual')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    signatureMode === 'manual' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🖊️ ফাঁকা সই বক্স
                </button>
              </div>
            </div>

          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            স্বয়ংক্রিয় ব্যালেন্সিং সক্রিয় • বাম ও ডান পাতা সমানভাবে পূর্ণ
          </div>
        </div>
      )}

      {/* Main Print Ready Display Area */}
      <div className="w-full flex-1 overflow-auto bg-slate-900 print:bg-white print:overflow-visible py-8 print:py-0 print:my-0">
        <div className="w-fit min-w-full mx-auto px-4 print:p-0 print:m-0 flex flex-col items-center gap-10 print:gap-0">
          
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 0mm;
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: #fff !important;
                font-family: 'Hind Siliguri', sans-serif !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              html, body, #root {
                height: auto !important;
                min-height: auto !important;
              }
              .loan-card-sheet {
                page-break-after: always !important;
                break-after: page !important;
                width: 297mm !important;
                height: 200mm !important;
                max-height: 200mm !important;
                box-shadow: none !important;
                border: none !important;
                overflow: hidden !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .loan-card-sheet:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            }
          `}</style>

          <div ref={printRef} className="flex flex-col items-center gap-10 print:gap-0 w-fit">
            
            {viewMode === 'cover' ? (
              /* ========================================================================= */
              /* FRONT & BACK FOLDABLE PASSBOOK COVER PAGE - ELEGANT BANK-GRADE THEME      */
              /* ========================================================================= */
              <div 
                className="loan-card-sheet bg-white shadow-2xl print:shadow-none mx-auto rounded-[3px] print:rounded-none flex w-[297mm] h-[200mm] max-h-[200mm] p-[8mm] gap-5 select-none relative overflow-hidden box-border font-['Hind_Siliguri',sans-serif]"
                style={{ width: '297mm', height: '200mm', maxHeight: '200mm', color: '#0f172a' }}
              >
                {/* LEFT HALF: BACK COVER - নিয়মাবলী ও নির্দেশিকা */}
                <div className="w-[48.5%] h-full border-2 border-indigo-900/80 rounded-2xl p-5 flex flex-col justify-between bg-gradient-to-b from-indigo-50/30 to-white relative box-border">
                  
                  {/* Security Corner Accents */}
                  <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-900"></div>
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-900"></div>
                  <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-900"></div>
                  <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-900"></div>

                  <div>
                    {/* Title */}
                    <div className="text-center mb-4 pb-2 border-b border-indigo-200">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <ShieldCheck className="w-5 h-5 text-indigo-800" />
                        <h3 className="font-black text-sm tracking-wide text-indigo-950 uppercase">ঋণ গ্রহীতার নিয়মাবলী ও নির্দেশিকা</h3>
                      </div>
                      <p className="text-[10px] text-indigo-700 font-bold tracking-wider">Passbook Rules & Compliance Guidelines</p>
                    </div>

                    {/* Rules list */}
                    <ul className="space-y-3.5 text-[11px] text-slate-800 font-semibold px-1">
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-indigo-900 text-white w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black">১</span>
                        <span className="leading-snug">কিস্তির টাকা দেওয়ার সময় সর্বদা এই <strong className="text-indigo-950 font-black">পাসবই / ঋণ কার্ডটি</strong> সাথে নিয়ে আসবেন এবং কর্মীর সই মিলিয়ে নেবেন।</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-indigo-900 text-white w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black">২</span>
                        <span className="leading-snug">টাকা জমা দেওয়ার পর সর্বদা মাঠ কর্মীর স্বাক্ষর এবং আদায়ের সঠিক পরিমাণ এই কার্ডের তালিকায় নথিভুক্ত করিয়ে নেবেন।</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-indigo-900 text-white w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black">৩</span>
                        <span className="leading-snug">কোনো অগ্রিম কিস্তি জমা দিতে চাইলে আগে থেকেই আপনার নির্ধারিত মাঠ কর্মী অথবা সরাসরি ব্রাঞ্চ অফিসে যোগাযোগ করুন।</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-indigo-900 text-white w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black">৪</span>
                        <span className="leading-snug">এই পাসবইটি গ্রাহকের একটি অতি গুরুত্বপূর্ণ অফিসিয়াল ডকুমেন্ট। যত্ন সহকারে রাখুন; হারিয়ে গেলে অবিলম্বে ব্রাঞ্চে জানান।</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="bg-indigo-900 text-white w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black">৫</span>
                        <span className="leading-snug">যৌথ দায়বদ্ধ দল (JLG) নিয়ম অনুযায়ী, সমিতির যেকোনো সদস্য কিস্তি দিতে ব্যর্থ হলে গ্রুপের বাকি সদস্যরা যৌথভাবে দায়বদ্ধ থাকবেন।</span>
                      </li>
                    </ul>
                  </div>

                  {/* Contact Info Card */}
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-sm">
                    <div className="flex items-center gap-1.5 text-indigo-950 font-black text-[11px] mb-1.5 pb-1 border-b border-indigo-100">
                      <PhoneCall className="w-3.5 h-3.5 text-indigo-700" />
                      <span>যোগাযোগ ও ব্রাঞ্চ সহায়তা (Support Helpdesk)</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-slate-700 font-semibold leading-snug">
                      <div className="truncate">🏢 কার্যালয়: <span className="text-slate-900">{c_address}</span></div>
                      <div className="flex justify-between items-center">
                        <div>📞 হেল্পলাইন: <span className="font-mono font-bold text-indigo-900">{c_phone}</span></div>
                        <div className="truncate">📧 ইমেল: <span className="font-mono text-slate-800">{c_email}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-[8px] font-bold text-slate-400 tracking-[0.2em] uppercase">
                      OFFICIAL PASSBOOK DOCUMENT • {c_name}
                    </p>
                  </div>
                </div>

                {/* MIDDLE SEPARATOR: FOLD HERE */}
                <div className="w-[3%] h-full flex flex-col items-center justify-center relative select-none">
                  <div className="h-full border-l-[2px] border-dashed border-indigo-300"></div>
                  <div className="absolute bg-white px-2 py-3.5 text-[8px] font-black text-indigo-700 rotate-90 whitespace-nowrap tracking-[0.25em] uppercase flex items-center gap-1 rounded-full border border-indigo-200 shadow-sm">
                    ✂️ Fold Here / ভাঁজ করার রেখা
                  </div>
                </div>

                {/* RIGHT HALF: FRONT COVER - মূল পাসবই কভার */}
                <div className="w-[48.5%] h-full border-2 border-indigo-900/80 rounded-2xl p-5 flex flex-col justify-between bg-gradient-to-b from-indigo-50/30 to-white relative box-border">
                  
                  {/* Security Corner Accents */}
                  <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-900"></div>
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-900"></div>
                  <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-900"></div>
                  <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-900"></div>

                  <div>
                    {/* Institutional Header with Logo */}
                    <div className="text-center mb-3 pb-2.5 border-b-2 border-indigo-100">
                      <div className="flex items-center justify-center gap-2.5 mb-1.5">
                        {company?.logo_url ? (
                          <img src={company.logo_url} className="w-9 h-9 object-contain" alt="" />
                        ) : (
                          <div className="bg-indigo-900 text-white p-2 rounded-xl">
                            <Landmark className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h2 className="text-[15px] font-black tracking-wide text-indigo-950 uppercase leading-none">{c_name}</h2>
                          <span className="text-[9px] font-bold text-indigo-700 tracking-wider">মাইক্রোফাইন্যান্স ও ক্ষুদ্রঋণ পরিষেবা</span>
                        </div>
                      </div>
                      <span className="inline-block bg-indigo-950 text-white text-[9px] font-black uppercase px-4 py-1 rounded-full tracking-widest shadow-sm">
                        লোন পাসবুক ও পরিশোধ কার্ড / LOAN PASSBOOK
                      </span>
                    </div>

                    {/* Member Information & Photo */}
                    <div className="grid grid-cols-12 gap-3 my-2 items-center">
                      <div className="col-span-8 space-y-2 text-[11px] text-slate-800 font-semibold">
                        <div className="flex items-center">
                          <span className="w-24 shrink-0 text-indigo-950 font-black">ঋণ হিসাব নং:</span>
                          <span className="bg-indigo-100/80 text-indigo-950 px-2.5 py-0.5 rounded font-mono font-black border border-indigo-200 flex-1 truncate text-xs">
                            {loan.loan_no || `L${loan.id}`}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 shrink-0 text-indigo-950 font-black">সদস্য কোড:</span>
                          <span className="border-b border-slate-300 pb-0.5 flex-1 font-mono font-bold text-slate-900 truncate">
                            {loan.member_code || `CID-0${loan.customer_id}`}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 shrink-0 text-indigo-950 font-black">সদস্যের নাম:</span>
                          <span className="border-b border-slate-300 pb-0.5 flex-1 font-bold text-slate-950 uppercase truncate">
                            {loan.member_name}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 shrink-0 text-indigo-950 font-black">{loan.guardian_type || 'অভিভাবক'}:</span>
                          <span className="border-b border-slate-300 pb-0.5 flex-1 font-medium text-slate-800 uppercase truncate">
                            {loan.guardian_name || loan.husband_name || loan.father_name || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 shrink-0 text-indigo-950 font-black">দল / সমিতি:</span>
                          <span className="border-b border-slate-300 pb-0.5 flex-1 font-bold text-indigo-900 uppercase truncate">
                            {loan.group_name || 'Individual Client'}
                          </span>
                        </div>
                      </div>

                      {/* Photo slot */}
                      <div className="col-span-4 flex flex-col items-center justify-center">
                        <div className="w-[82px] h-[92px] border-2 border-indigo-950 p-0.5 bg-white shadow-md rounded-md overflow-hidden relative">
                          {loan.profile_image ? (
                            <img src={loan.profile_image} className="w-full h-full object-cover rounded-sm" alt="Profile" />
                          ) : (
                            <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-[8px] text-indigo-400 font-bold text-center border border-dashed border-indigo-200 rounded-sm leading-tight">
                              পাসপোর্ট<br/>সাইজ ফটো<br/>লাগানোর স্থান
                            </div>
                          )}
                        </div>
                        <span className="text-[7.5px] font-black text-indigo-600 uppercase tracking-wider mt-1">AFFIX PHOTO</span>
                      </div>
                    </div>

                    {/* Financial Stats strip */}
                    <div className="bg-indigo-950 text-white p-3 rounded-xl shadow-md my-2.5">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="border-r border-indigo-800">
                          <span className="block text-[8px] uppercase tracking-wider text-indigo-200 font-bold">মঞ্জুরীকৃত ঋণ</span>
                          <span className="block text-[13px] font-black text-white font-mono">₹{formatAmount(totalPrincipal)}</span>
                        </div>
                        <div className="border-r border-indigo-800">
                          <span className="block text-[8px] uppercase tracking-wider text-indigo-200 font-bold">মোট পরিশোধযোগ্য</span>
                          <span className="block text-[13px] font-black text-white font-mono">₹{formatAmount(totalRepayment)}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider text-indigo-200 font-bold">ধার্য কিস্তি</span>
                          <span className="block text-[13px] font-black text-amber-300 font-mono">₹{formatAmount(baseEMI)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Address & Scheme details */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9.5px] text-slate-800 font-semibold px-1 my-1">
                      <div className="flex items-center"><span className="text-indigo-950 font-bold w-18 shrink-0">ঠিকানা:</span> <span className="border-b border-slate-200 flex-1 truncate">{loan.village || 'N/A'}</span></div>
                      <div className="flex items-center"><span className="text-indigo-950 font-bold w-18 shrink-0">মোবাইল নং:</span> <span className="border-b border-slate-200 flex-1 font-mono font-bold text-slate-900">{loan.mobile_no || 'N/A'}</span></div>
                      <div className="flex items-center"><span className="text-indigo-950 font-bold w-18 shrink-0">শুরুর তারিখ:</span> <span className="border-b border-slate-200 flex-1 font-medium">{formatDate(loan.start_date)}</span></div>
                      <div className="flex items-center"><span className="text-indigo-950 font-bold w-18 shrink-0">কিস্তি চক্র:</span> <span className="border-b border-slate-200 flex-1 font-bold text-indigo-800 uppercase">{numInstallments} টি ({loan.emi_frequency || 'weekly'})</span></div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="flex justify-between items-end px-3 mt-1 pt-1 border-t border-indigo-100">
                    <div className="text-center w-24">
                      <div className="h-6 flex items-center justify-center">
                        <div className="w-[28px] h-[28px] rounded-full border border-dashed border-indigo-300 text-[6px] text-indigo-400 flex items-center justify-center font-bold">SEAL</div>
                      </div>
                      <div className="border-t border-slate-400 pt-0.5 text-[8px] font-black text-slate-700 uppercase tracking-wider">
                        গ্রাহকের স্বাক্ষর
                      </div>
                    </div>

                    <div className="text-center w-28">
                      <div className="h-6"></div>
                      <div className="border-t border-slate-400 pt-0.5 text-[8px] font-black text-slate-700 uppercase tracking-wider">
                        ব্যবস্থাপক স্বাক্ষর
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* DETAILED EMI PAYMENT SCHEDULE SHEETS - BALANCED & HIGH-END DESIGN         */
              /* (Sheet 1: 1-52 EMIs, Sheet 2: 53-104 EMIs) - ZERO CUT-OFF & EQUAL HEIGHT  */
              /* ========================================================================= */
              sheets
                .filter(sh => activeSheetTab === 'all' || activeSheetTab === sh.sheetIndex)
                .map((sheet) => (
                  <div 
                    key={sheet.sheetIndex}
                    className="loan-card-sheet bg-white shadow-2xl print:shadow-none mx-auto rounded-[3px] print:rounded-none flex w-[297mm] h-[200mm] max-h-[200mm] p-[6mm] gap-3.5 select-none relative overflow-hidden box-border font-['Hind_Siliguri',sans-serif]"
                    style={{ width: '297mm', height: '200mm', maxHeight: '200mm', color: '#0f172a' }}
                  >
                    {/* LEFT PAGE: 26 Rows (or balanced half) */}
                    <div className="w-[48.5%] h-full border-2 border-indigo-900/80 rounded-xl p-2.5 flex flex-col justify-between bg-white relative box-border">
                      <div className="flex flex-col h-full justify-between">
                        <div>
                          {/* Slim Header */}
                          <div className="flex items-center justify-between pb-1 mb-1 border-b-2 border-indigo-100">
                            <div>
                              <h2 className="text-[12px] font-black text-indigo-950 uppercase tracking-wide leading-none">{c_name}</h2>
                              <span className="text-[8px] font-bold text-indigo-700 block leading-tight mt-0.5">
                                কিস্তি আদায়পত্র • {sheet.rangeText} (১ম অংশ)
                              </span>
                            </div>
                            <div className="text-right text-[8px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              ঋণ নং: <span className="font-extrabold text-indigo-950">{loan.loan_no || `L${loan.id}`}</span>
                            </div>
                          </div>

                          {/* Member Compact Summary Strip */}
                          <div className="grid grid-cols-6 gap-1 bg-gradient-to-r from-indigo-50/60 via-slate-50 to-indigo-50/60 rounded-md px-2 py-1 text-[8px] font-semibold text-slate-700 border border-indigo-100/80 mb-1 leading-tight">
                            <div className="col-span-2 truncate">👤 নাম: <b className="text-slate-950 font-bold">{loan.member_name}</b></div>
                            <div className="col-span-2 truncate">📱 ফোন: <b className="text-slate-950 font-mono font-bold">{loan.mobile_no || 'N/A'}</b></div>
                            <div className="col-span-2 text-right truncate">🏢 শাখা: <b className="text-slate-950">{loan.branch_name || 'N/A'}</b></div>
                            <div className="col-span-2">💰 ঋণ: <b className="text-indigo-950 font-mono">₹{formatAmount(totalPrincipal)}</b></div>
                            <div className="col-span-2">💵 কিস্তি: <b className="text-rose-700 font-mono font-bold">₹{formatAmount(baseEMI)}</b></div>
                            <div className="col-span-2 text-right">🕒 মোট কিস্তি: <b className="text-slate-950">{numInstallments} টি</b></div>
                          </div>

                          {/* Decimal Notice */}
                          <div className="text-[7px] text-indigo-800 font-bold text-center bg-indigo-50/50 rounded px-1 py-0.5 border border-indigo-100 mb-1 leading-none">
                            📢 অবশিষ্ট ভগ্নাংশ টাকা শেষ কিস্তির টাকার সাথে সমন্বয় করা হয়েছে।
                          </div>

                          {/* Left Table Panel */}
                          <div className="overflow-hidden">
                            <table className="w-full border-collapse border border-slate-300 print:border-slate-700 text-[8px]">
                              <thead>
                                <tr className="bg-slate-900 text-white font-black uppercase text-[7.5px] tracking-wider">
                                  <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-center w-6">নং</th>
                                  <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-center w-16">নির্ধারিত তারিখ</th>
                                  <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-right w-12">কিস্তির টাকা</th>
                                  <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-center w-14">আদায়ের তারিখ</th>
                                  <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-right w-13">আদায়ের টাকা</th>
                                  <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-center w-11">কর্মী সই</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sheet.leftRows.map((row: any, idx: number) => (
                                  <tr key={row.instNo} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                    <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-0.5 text-center font-bold text-slate-700 text-[8px] print:text-[7.5px] leading-tight font-mono">{row.instNo}</td>
                                    <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-0.5 text-center font-bold font-mono text-slate-800 text-[8px] print:text-[7.5px] leading-tight">{row.date}</td>
                                    <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-1 text-right font-black font-mono text-slate-950 text-[8px] print:text-[7.5px] leading-tight">₹{formatAmount(row.amount)}</td>
                                    <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-0.5 text-center font-bold text-emerald-800 font-mono text-[7.5px] print:text-[7px] leading-tight">
                                      {row.collectedAmt ? row.recvDate : <span className="text-slate-300 print:text-slate-400 block text-center font-light leading-none">________</span>}
                                    </td>
                                    <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-1 text-right font-black text-emerald-800 font-mono text-[7.5px] print:text-[7px] leading-tight">
                                      {row.collectedAmt ? `₹${row.collectedAmt}` : <span className="text-slate-300 print:text-slate-400 block text-center font-light leading-none">________</span>}
                                    </td>
                                    <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-0.5 text-center font-black text-[7px] print:text-[6.5px] leading-tight">
                                      {row.isPaid && signatureMode === 'digital' ? (
                                        <span className="text-emerald-700 font-black">✓ Paid</span>
                                      ) : (
                                        <span className="text-slate-300 print:text-slate-400 block text-center font-light leading-none">____</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Page Footer */}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[7px] text-slate-500 font-bold uppercase mt-1 tracking-wider leading-none">
                          <div>সদস্য কোড: <span className="font-mono text-slate-800">{loan.member_code || 'N/A'}</span></div>
                          <div>ALJOOYA MFI • SHEET {sheet.sheetIndex} PAGE 1</div>
                        </div>
                      </div>
                    </div>

                    {/* MIDDLE SEPARATOR: FOLD HERE */}
                    <div className="w-[3%] h-full flex flex-col items-center justify-center relative select-none">
                      <div className="h-full border-l-[2px] border-dashed border-indigo-300"></div>
                      <div className="absolute bg-white px-1.5 py-3 text-[7.5px] font-black text-indigo-700 rotate-90 whitespace-nowrap tracking-[0.25em] uppercase flex items-center gap-1 rounded-full border border-indigo-200 shadow-sm">
                        ✂️ Fold Here / ভাঁজ করার রেখা
                      </div>
                    </div>

                    {/* RIGHT PAGE: 26 Rows (or balanced remainder + inspection) */}
                    <div className="w-[48.5%] h-full border-2 border-indigo-900/80 rounded-xl p-2.5 flex flex-col justify-between bg-white relative box-border">
                      <div className="flex flex-col h-full justify-between">
                        <div>
                          {/* Slim Header */}
                          <div className="flex items-center justify-between pb-1 mb-1 border-b-2 border-indigo-100">
                            <div>
                              <span className="text-[12px] font-black text-indigo-950 uppercase tracking-wide leading-none">{c_name}</span>
                              <span className="text-[8px] font-bold text-indigo-700 block leading-tight mt-0.5">
                                কিস্তি আদায়পত্র • {sheet.rangeText} (২য় অংশ)
                              </span>
                            </div>
                            <div className="text-right text-[8px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              গ্রুপ: <span className="font-extrabold text-indigo-950 truncate">{loan.group_name || 'Individual'}</span>
                            </div>
                          </div>

                          {/* Member Compact Summary Strip */}
                          <div className="grid grid-cols-6 gap-1 bg-gradient-to-r from-rose-50/60 via-slate-50 to-rose-50/60 rounded-md px-2 py-1 text-[8px] font-semibold text-slate-700 border border-rose-100/80 mb-1 leading-tight">
                            <div className="col-span-2 truncate">🆔 সদস্য: <b className="text-slate-950 font-mono font-bold">{loan.member_code || `CID-${loan.customer_id}`}</b></div>
                            <div className="col-span-2 truncate">👨‍👩‍👦 অভিভাবক: <b className="text-slate-950 font-bold">{loan.guardian_name || 'N/A'}</b></div>
                            <div className="col-span-2 text-right truncate">📈 স্কিম: <b className="text-slate-950">{loan.scheme_name || 'Regular'}</b></div>
                            <div className="col-span-2">📅 চক্র: <b className="text-indigo-950 font-bold uppercase">{loan.emi_frequency || 'weekly'}</b></div>
                            <div className="col-span-2">💵 কিস্তি: <b className="text-rose-700 font-mono font-bold">₹{formatAmount(baseEMI)}</b></div>
                            <div className="col-span-2 text-right">📄 পাতা: <b className="text-slate-950">{sheet.sheetIndex} / {sheet.totalSheets}</b></div>
                          </div>

                          {/* Decimal Notice */}
                          <div className="text-[7px] text-indigo-800 font-bold text-center bg-indigo-50/50 rounded px-1 py-0.5 border border-indigo-100 mb-1 leading-none">
                            📢 Official Ledger: Authorized representative must verify receipt on every installment.
                          </div>

                          {/* Right Table Panel */}
                          {sheet.rightRows.length > 0 ? (
                            <div>
                              <div className="overflow-hidden">
                                <table className="w-full border-collapse border border-slate-300 print:border-slate-700 text-[8px]">
                                  <thead>
                                    <tr className="bg-slate-900 text-white font-black uppercase text-[7.5px] tracking-wider">
                                      <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-center w-6">নং</th>
                                      <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-center w-16">নির্ধারিত তারিখ</th>
                                      <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-right w-12">কিস্তির টাকা</th>
                                      <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-center w-14">আদায়ের তারিখ</th>
                                      <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-right w-13">আদায়ের টাকা</th>
                                      <th className="border border-slate-400 print:border-slate-700 py-1 px-0.5 text-center w-11">কর্মী সই</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sheet.rightRows.map((row: any, idx: number) => (
                                      <tr key={row.instNo} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                        <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-0.5 text-center font-bold text-slate-700 text-[8px] print:text-[7.5px] leading-tight font-mono">{row.instNo}</td>
                                        <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-0.5 text-center font-bold font-mono text-slate-800 text-[8px] print:text-[7.5px] leading-tight">{row.date}</td>
                                        <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-1 text-right font-black font-mono text-slate-950 text-[8px] print:text-[7.5px] leading-tight">₹{formatAmount(row.amount)}</td>
                                        <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-0.5 text-center font-bold text-emerald-800 font-mono text-[7.5px] print:text-[7px] leading-tight">
                                          {row.collectedAmt ? row.recvDate : <span className="text-slate-300 print:text-slate-400 block text-center font-light leading-none">________</span>}
                                        </td>
                                        <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-1 text-right font-black text-emerald-800 font-mono text-[7.5px] print:text-[7px] leading-tight">
                                          {row.collectedAmt ? `₹${row.collectedAmt}` : <span className="text-slate-300 print:text-slate-400 block text-center font-light leading-none">________</span>}
                                        </td>
                                        <td className="border border-slate-300 print:border-slate-600 py-[2.5px] print:py-[2px] px-0.5 text-center font-black text-[7px] print:text-[6.5px] leading-tight">
                                          {row.isPaid && signatureMode === 'digital' ? (
                                            <span className="text-emerald-700 font-black">✓ Paid</span>
                                          ) : (
                                            <span className="text-slate-300 print:text-slate-400 block text-center font-light leading-none">____</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Clean Official Inspection Notes below remaining rows to eliminate any empty gap */}
                              {sheet.rightRows.length < 20 && (
                                <div className="mt-3 bg-indigo-50/30 border border-dashed border-indigo-200 rounded-lg p-2.5 text-slate-700">
                                  <div className="text-center pb-1 border-b border-indigo-100 mb-1.5">
                                    <span className="text-[8px] font-black text-indigo-900 uppercase tracking-widest block leading-tight">
                                      মাঠ পরিদর্শন ও অফিসিয়াল নোট / FIELD INSPECTION NOTES
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-[7.5px] font-semibold">
                                    <div className="border-b border-indigo-100 pb-0.5">পরিদর্শন তারিখ: <span className="text-slate-400 font-light">......................</span></div>
                                    <div className="border-b border-indigo-100 pb-0.5">কর্মীর স্বাক্ষর: <span className="text-slate-400 font-light">......................</span></div>
                                    <div className="col-span-2 border-b border-indigo-100 pb-0.5">মন্তব্য: <span className="text-slate-400 font-light">........................................................................</span></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Full Audit Box when right side has no EMI rows */
                            <div className="bg-gradient-to-b from-indigo-50/40 to-white border border-dashed border-indigo-300 rounded-xl p-4 flex-1 h-[240px] flex flex-col justify-between text-slate-700 select-none">
                              <div>
                                <div className="text-center pb-2 border-b border-indigo-200 mb-3">
                                  <span className="text-[10px] font-black text-indigo-950 uppercase tracking-widest block">অফিসিয়াল নিরীক্ষণ ও সুপারভাইজার মন্তব্য</span>
                                  <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-wider block font-sans">Supervisor Audit & Field Inspection Notes</span>
                                </div>
                                
                                <div className="space-y-3 pt-1 text-[8.5px] font-bold">
                                  <div className="flex border-b border-slate-200 pb-1">
                                    <span className="text-indigo-950 w-28">পরিদর্শন তারিখ:</span>
                                    <span className="text-slate-300 font-light">....................................................................</span>
                                  </div>
                                  <div className="flex border-b border-slate-200 pb-1">
                                    <span className="text-indigo-950 w-28">নিরীক্ষকের মন্তব্য:</span>
                                    <span className="text-slate-300 font-light">....................................................................</span>
                                  </div>
                                  <div className="flex border-b border-slate-200 pb-1">
                                    <span className="text-indigo-950 w-28">সুপারভাইজার সই:</span>
                                    <span className="text-slate-300 font-light">....................................................................</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-center border-t border-indigo-200/60 pt-2 text-[7.5px] font-bold text-slate-400 font-sans">
                                📝 সংগৃহীত তথ্য ও ক্যাশ ব্যালেন্স মেলাবার জন্য এই স্থান সংরক্ষিত।
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Page Footer */}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[7px] text-slate-500 font-bold uppercase mt-1 tracking-wider leading-none">
                          <div>তারিখ: {new Date().toLocaleDateString('en-GB')}</div>
                          <div>ALJOOYA MFI • SHEET {sheet.sheetIndex} PAGE 2</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
