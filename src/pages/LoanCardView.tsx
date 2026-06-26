import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, X, Download, BookOpen, ShieldCheck, PhoneCall, Landmark } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { format, addWeeks, addDays, addMonths, parseISO } from 'date-fns';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function LoanCardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [viewMode, setViewMode] = useState<'cover' | 'schedule'>('cover'); // Default to cover so the beautiful cover page is shown first!
  const printRef = useRef<HTMLDivElement>(null);

  const [collections, setCollections] = useState<any[]>([]);
  const [leftSplitMax, setLeftSplitMax] = useState<number>(24);
  const [passbookMode, setPassbookMode] = useState<'real' | 'blank'>('real');
  const [signatureMode, setSignatureMode] = useState<'digital' | 'manual'>('digital');

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
        // collections endpoint might return { data: [...] } or just [...]
        setCollections(Array.isArray(collectionsData) ? collectionsData : collectionsData.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load agreement:', err);
    } finally {
      setLoading(false);
    }
  };

  const c_name = company?.name || 'ALJOOYA SUBIDHA SERVICES';
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
      const element = printRef.current;
      const dataUrl = await toPng(element, { quality: 0.98, pixelRatio: 2 });
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210);
      pdf.save(`LoanCard_${viewMode}_${loan?.loan_no || id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Please try using the Print button instead.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading loan card...</div>;
  }

  if (!loan) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Card not found!</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg">Go Back</button>
      </div>
    );
  }

  // Generate Installment Rows
  const numInstallments = parseInt(loan.duration_weeks) || parseInt(loan.no_of_emis) || 12;
  const rows = [];
  const baseDateStr = loan.start_date || loan.disbursement_date;
  let currentDate = baseDateStr ? parseISO(baseDateStr) : new Date();

  const totalPrincipal = Math.round(Number(loan.amount) || 0);
  const totalRepayment = Math.round(Number(loan.total_repayment || (totalPrincipal + Number(loan.interest || 0))));
  
  const baseEMI = loan.installment ? Math.round(Number(loan.installment)) : Math.round(totalRepayment / numInstallments);
  const basePrincipal = Math.round(totalPrincipal / numInstallments);
  
  let remainingPrincipal = totalPrincipal;
  let remainingOutstanding = totalRepayment;

  // Distribute collections across EMIs
  let collectionPool = collections
    .filter(c => c.status !== 'rejected' && c.remarks !== 'Late Payment Penalty/Fine')
    .map(c => {
       const pd = c.payment_date ? parseISO(c.payment_date) : new Date();
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

      recvDate = currentColl.date; // Mark the date of the payment that covered this
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
      // Default weekly
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

  const leftSplitIndex = Math.min(leftSplitMax, processedRows.length);
  const leftRows = processedRows.slice(0, leftSplitIndex);
  const rightRows = processedRows.slice(leftSplitIndex);

  return (
    <div className="min-h-screen bg-slate-900 print:bg-white flex flex-col">
      {/* Controls & Mode Toggler - Hidden during print */}
      <div className="print:hidden w-full p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-pink-600 p-2.5 rounded-xl text-white">
            {company?.logo_url ? (
              <img src={company.logo_url} className="w-5 h-5 object-contain" alt="" />
            ) : (
              <Landmark className="w-5 h-5" />
            )}
          </div>
          <div>
            <h1 className="text-white font-black text-sm uppercase tracking-wider">{c_name}</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-[9px]">Loan Passbook & Identity System</p>
          </div>
        </div>

        {/* Dynamic View Selector - Premium Styled Pin Accent Buttons */}
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1">
          <button 
            type="button"
            onClick={() => setViewMode('cover')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black tracking-wider uppercase transition-all ${
              viewMode === 'cover' 
                ? 'bg-pink-600 text-white shadow-xl shadow-pink-600/20 scale-105' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" /> 📔 ফ্রন্ট কভার / Cover Page
          </button>
          
          <button 
            type="button"
            onClick={() => setViewMode('schedule')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black tracking-wider uppercase transition-all ${
              viewMode === 'schedule' 
                ? 'bg-pink-600 text-white shadow-xl shadow-pink-600/20 scale-105' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Printer className="w-4 h-4" /> 📊 পেমেন্ট কার্ড / Payment Schedule
          </button>
        </div>

        {/* Print & Return Buttons */}
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all">
            <Printer className="w-4 h-4" /> Print Card
          </button>
          <button onClick={handleDownloadPDF} disabled={generatingPDF} className={`flex items-center justify-center gap-2 ${generatingPDF ? 'bg-pink-500/50 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'} text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all`}>
            {generatingPDF ? 'Generating PDF...' : <><Download className="w-4 h-4" /> Download PDF</>}
          </button>
          <button onClick={() => navigate(-1)} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-slate-700">
            <X className="w-4 h-4" /> Close
          </button>
        </div>
      </div>

      {viewMode === 'schedule' && (
        <div className="print:hidden w-full px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            
            {/* Split Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">বাম কলাম পরিমাণ (Left Rows Max):</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 animate-fade-in">
                {[8, 12, 15, 18, 20, 22, 24, 25, 26, 28, 30].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLeftSplitMax(val)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      leftSplitMax === val
                        ? 'bg-pink-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Mode */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">ডাটা মোড (Data Type):</span>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPassbookMode('real')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md uppercase transition-all ${
                    passbookMode === 'real'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📡 ডিজিটাল রিয়েল ডাটা
                </button>
                <button
                  type="button"
                  onClick={() => setPassbookMode('blank')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md uppercase transition-all ${
                    passbookMode === 'blank'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✍️ ফাঁকা খাতা তৈরি (Blank)
                </button>
              </div>
            </div>

            {/* Signature Indicator Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">কর্মী সই (Field Sign):</span>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSignatureMode('digital')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md uppercase transition-all ${
                    signatureMode === 'digital'
                      ? 'bg-pink-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ✓ অটো "Paid" সই
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('manual')}
                  className={`px-3 py-1 text-[10px] font-black rounded-md uppercase transition-all ${
                    signatureMode === 'manual'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🖊️ ফাঁকা রাখুন (Sign Box)
                </button>
              </div>
            </div>

          </div>
          
          <div className="text-[9px] font-black bg-pink-950/45 text-pink-300 border border-pink-900/40 px-3 py-1.5 rounded-xl uppercase tracking-widest leading-none">
            ✨ MAGIC CONTROLS ACTIVE
          </div>
        </div>
      )}

      <div className="w-full h-full flex-1 overflow-auto bg-slate-900 print:bg-white print:overflow-visible py-8 print:py-0 print:my-0">
        <div className="w-fit min-w-full mx-auto px-4 print:p-0 print:m-0">
          
          {/* Print Ready Container */}
          <div 
            id="loan-card-print-area"
            ref={printRef}
            className="bg-white shadow-2xl print:shadow-none mx-auto rounded-[2px] print:rounded-none"
            style={{ 
              width: '297mm', 
              height: '200mm', 
              maxHeight: '200mm',
              overflow: 'hidden',
              fontFamily: 'sans-serif', 
              color: '#000',
              boxSizing: 'border-box'
            }}
          >
            <style>{`
              @media print {
                @page {
                  size: A4 landscape;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                  background-color: #fff !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
                html, body, #root {
                  height: auto !important;
                  min-height: auto !important;
                }
                #loan-card-print-area {
                  border: none !important;
                  box-shadow: none !important;
                  background-color: #fff !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  width: 297mm !important;
                  height: 200mm !important;
                  max-height: 200mm !important;
                  overflow: hidden !important; 
                }
              }
            `}</style>
            
            {viewMode === 'cover' ? (
              /* ========================================================================= */
              /* FRONT & BACK FOLDABLE PASSBOOK COVER PAGE LAYOUT - PINK/ROSE THEME        */
              /* ========================================================================= */
              <div className="flex w-full h-[200mm] p-[10mm] gap-6 select-none relative bg-white overflow-hidden box-border">
                
                {/* LEFT CONVOLUTION: BACK COVER - নিয়মাবলী / Support */}
                <div className="w-[48.5%] h-full border-[3px] border-dashed border-pink-200 rounded-3xl p-6 flex flex-col justify-between bg-pink-50/15 relative">
                  
                  {/* Premium Corner Aesthetics */}
                  <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-pink-900"></div>
                  <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-pink-900"></div>
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-pink-900"></div>
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-pink-900"></div>

                  <div>
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <ShieldCheck className="w-5 h-5 text-pink-700 shrink-0" />
                        <h3 className="font-black text-[13px] uppercase tracking-wider text-pink-950">ঋণ গ্রহীতার নিয়মাবলী ও নির্দেশিকা</h3>
                      </div>
                      <p className="text-[9px] text-pink-600 font-bold uppercase tracking-wider">Passbook Security Rules & Compliance Code</p>
                      <div className="w-20 h-0.5 bg-pink-600 mx-auto mt-2 rounded-full"></div>
                    </div>

                    <ul className="space-y-4 text-[11px] text-slate-800 font-bold px-1 select-none">
                      <li className="flex gap-2.5 items-start">
                        <span className="text-pink-600 font-black bg-pink-100 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-[10px]">১</span>
                        <span className="leading-relaxed font-sans">কিস্তির টাকা দেওয়ার সময় সর্বদা এই <strong className="text-pink-950">পাসবই / ঋণ কার্ডটি</strong> সাথে নিয়ে আসবেন এবং উপস্থিত কর্মীর সই মিলিয়ে নেবেন।</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="text-pink-600 font-black bg-pink-100 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-[10px]">২</span>
                        <span className="leading-relaxed font-sans">টাকা জমা দেওয়ার পর সর্বদা মাঠ কর্মীর স্বাক্ষর এবং কিস্তির সঠিক নম্বর ও আদায়ের পরিমাণ এই বইয়ের তালিকায় সই করিয়ে নেবেন।</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="text-pink-600 font-black bg-pink-100 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-[10px]">৩</span>
                        <span className="leading-relaxed font-sans">কোনো অগ্রিম কিস্তি জমা দিতে চাইলে তা আগে থেকেই আপনার নির্ধারিত মাঠ কর্মী অথবা সরাসরি ব্রাঞ্চ অফিসে যোগাযোগ করে বইয়ে নথিভুক্ত করুন।</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="text-pink-600 font-black bg-pink-100 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-[10px]">৪</span>
                        <span className="leading-relaxed font-sans">এই পাসবই / ঋণ কার্ডটি গ্রাহকের একটি অতি গুরুত্বপূর্ণ অফিসিয়াল ডকুমেন্ট। এটিকে যত্ন সহকারে রাখুন; নষ্ট বা হারিয়ে গেলে অবিলম্বে ব্রাঞ্চে জানান।</span>
                      </li>
                      <li className="flex gap-2.5 items-start">
                        <span className="text-pink-600 font-black bg-pink-100 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-[10px]">৫</span>
                        <span className="leading-relaxed font-sans">যৌথ দায়বদ্ধ দলের (JLG) নিয়ম অনুযায়ী, দলের বা সমিতির যেকোনো সদস্য কিস্তি দিতে ব্যর্থ হলে গ্রুপের বাকি সদস্যরা যৌথভাবে দায়বদ্ধ থাকবেন।</span>
                      </li>
                    </ul>
                  </div>

                  {/* Help Support Section with high end visual outline */}
                  <div className="bg-pink-50/40 p-4 rounded-[20px] border border-pink-100/80">
                    <div className="flex items-center gap-1.5 text-pink-950 font-black text-[10px] uppercase tracking-wide mb-2 pb-1 border-b border-pink-100/50">
                      <PhoneCall className="w-3.5 h-3.5 text-pink-600" />
                      <span>যোগাযোগ ও সহযোগিতা (Support Helpdesk)</span>
                    </div>
                    <div className="space-y-1.5 text-[10px] text-slate-700 font-bold">
                      <div className="truncate">🏢 কার্যালয়: {c_address}</div>
                      <div className="flex justify-between items-center">
                        <div>📞 ফোন: {c_phone}</div>
                        <div className="truncate">📧 ইমেল: <span className="font-mono">{c_email}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Corporate Disclaimer footer */}
                  <div className="text-center">
                    <p className="text-[8px] font-black text-pink-400 tracking-[0.2em] uppercase">
                      Official Document Issuance of {c_name}
                    </p>
                  </div>
                </div>

                {/* MIDDLE SEPARATOR: FOLD HERE */}
                <div className="w-[3%] h-full flex flex-col items-center justify-center relative select-none">
                  <div className="h-full border-l-[2px] border-dashed border-pink-200"></div>
                  <div className="absolute bg-white px-2 py-4 text-[8px] font-black text-rose-400/90 rotate-90 whitespace-nowrap tracking-[0.25em] uppercase flex items-center gap-1.5 rounded-full border border-pink-100 shadow-sm">
                    ✂️ Fold Booklet / ভাঁজ করার রেখা
                  </div>
                </div>

                {/* RIGHT CONVOLUTION: FRONT COVER / পাসবই */}
                <div className="w-[48.5%] h-full border-4 border-double border-pink-950 rounded-3xl p-6 flex flex-col justify-between bg-gradient-to-br from-pink-50/10 via-transparent to-white relative box-border">
                  
                  {/* Premium Corner Accents */}
                  <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-pink-950"></div>
                  <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-pink-950"></div>
                  <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-pink-950"></div>
                  <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-pink-950"></div>

                  {/* Header Organization details */}
                  <div className="text-center pt-2">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      {company?.logo_url ? (
                        <img src={company.logo_url} className="w-8 h-8 object-contain shrink-0" alt="Logo" />
                      ) : (
                        <Landmark className="w-8 h-8 text-pink-950 shrink-0" />
                      )}
                      <h1 className="font-black text-xl uppercase tracking-widest text-pink-950 leading-none">{c_name}</h1>
                    </div>
                    <p className="text-[8px] text-pink-800 font-extrabold uppercase tracking-[0.22em] mb-1 leading-none font-sans">
                      Integrated Microfinance Institution Network
                    </p>
                    <p className="text-[11px] text-pink-700 font-extrabold tracking-tight">
                      "সঞ্চয় ও সহযোগিতা আমাদের সমৃদ্ধির মূল ভিত্তি"
                    </p>
                    
                    <div className="mt-3.5 inline-block bg-pink-950 px-8 py-2 rounded-full shadow-lg shadow-pink-950/20">
                      <p className="text-[11px] font-black tracking-[0.28em] text-white uppercase">
                        ঋণ পাসবই • LOAN PASSBOOK
                      </p>
                    </div>
                  </div>

                  {/* Inside Identification Grid Section */}
                  <div className="grid grid-cols-12 gap-3 my-2 items-center">
                    {/* Identification Values list with underscored layout */}
                    <div className="col-span-8 space-y-2 text-[11px] text-slate-800 font-bold">
                      <div className="flex items-center">
                        <span className="w-24 shrink-0 text-pink-800 font-black">ঋণ হিসাব নং:</span>
                        <span className="bg-pink-50/80 text-pink-950 px-2.5 py-1 rounded-lg font-black border border-pink-100 flex-1 truncate font-mono text-xs">
                          {loan.loan_no || `L${loan.id}`}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-24 shrink-0 text-pink-850 font-black">সদস্য কোড:</span>
                        <span className="border-b-[1.5px] border-slate-300 pb-0.5 flex-1 text-slate-900 font-black font-mono truncate">
                          {loan.member_code || `CID-0${loan.customer_id}`}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-24 shrink-0 text-pink-850 font-black">সদস্যের নাম:</span>
                        <span className="border-b-[1.5px] border-slate-300 pb-0.5 flex-1 text-slate-950 font-black font-sans uppercase truncate">
                          {loan.member_name}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-24 shrink-0 text-pink-850 font-black">{loan.guardian_type || 'গার্ডিয়ান'}:</span>
                        <span className="border-b-[1.5px] border-slate-300 pb-0.5 flex-1 text-slate-900 font-bold uppercase truncate">
                          {loan.guardian_name || loan.husband_name || loan.father_name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-24 shrink-0 text-pink-850 font-black">দল / সমিতি:</span>
                        <span className="border-b-[1.5px] border-slate-300 pb-0.5 flex-1 text-pink-900 font-black uppercase truncate">
                          {loan.group_name || 'Individual Client'}
                        </span>
                      </div>
                    </div>

                    {/* Member photo slot */}
                    <div className="col-span-4 flex flex-col items-center justify-center">
                      <div className="w-[85px] h-[95px] border-2 border-pink-950 p-1 bg-white shadow-md rounded-md overflow-hidden relative">
                        {loan.profile_image ? (
                          <img src={loan.profile_image} className="w-full h-full object-cover rounded-sm" alt="Profile" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-[9px] text-pink-400 font-bold text-center border border-dashed border-pink-200 rounded-sm">
                            পাসপোর্ট<br/>সাইজ ফটো<br/>লাগানোর স্থান
                          </div>
                        )}
                      </div>
                      <span className="text-[8px] font-black text-pink-500 uppercase tracking-wider mt-1.5">AFFIX PHOTO</span>
                    </div>
                  </div>

                  {/* Financial Stats strip */}
                  <div className="bg-pink-950 text-white p-3.5 rounded-2xl shadow-inner my-2">
                    <div className="grid grid-cols-3 gap-2 text-center text-white">
                      <div className="border-r border-pink-800">
                        <span className="block text-[8px] uppercase tracking-wider text-pink-300 font-extrabold mb-0.5">মঞ্জুরীকৃত ঋণ</span>
                        <span className="block text-[13px] font-black text-white font-mono">₹ {formatAmount(totalPrincipal)}</span>
                      </div>
                      <div className="border-r border-pink-800">
                        <span className="block text-[8px] uppercase tracking-wider text-pink-300 font-extrabold mb-0.5">মোট পরিশোধযোগ্য</span>
                        <span className="block text-[13px] font-black text-white font-mono">₹ {formatAmount(totalRepayment)}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-pink-300 font-extrabold mb-0.5">ধার্য কিস্তি</span>
                        <span className="block text-[13px] font-black text-pink-200 font-mono">₹ {formatAmount(baseEMI)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Address and support vectors */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] text-slate-800 font-bold px-1 my-1">
                    <div className="flex items-center"><span className="text-pink-800 w-16 shrink-0">ঠিকানা/পাড়া:</span> <span className="border-b border-rose-100 flex-1 truncate font-medium">{loan.village || 'N/A'}</span></div>
                    <div className="flex items-center"><span className="text-pink-800 w-16 shrink-0">মোবাইল নং:</span> <span className="border-b border-rose-100 flex-1 font-mono">{loan.mobile_no || 'N/A'}</span></div>
                    <div className="flex items-center"><span className="text-pink-800 w-16 shrink-0">শুরুর তারিখ:</span> <span className="border-b border-rose-100 flex-1 font-medium">{formatDate(loan.start_date)}</span></div>
                    <div className="flex items-center"><span className="text-pink-800 w-16 shrink-0">পরিশোধ চক্র:</span> <span className="border-b border-rose-100 flex-1 font-medium uppercase text-pink-700">{loan.emi_frequency || 'weekly'}</span></div>
                  </div>

                  {/* Traditional Authentication Signatures */}
                  <div className="flex justify-between items-end px-3 mt-3">
                    <div className="text-center w-24">
                      <div className="h-6 flex items-center justify-center">
                        <div className="w-[30px] h-[30px] rounded-full border border-dashed border-pink-300 text-[6px] text-pink-300 flex items-center justify-center">SEAL</div>
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
              /* DETAILED EMI PAYMENT SCHEDULE TABLE LAYOUT - LANDSCAPE DOUBLE COLUMN      */
              /* ========================================================================= */
              <div className="flex w-full h-[200mm] p-[10mm] gap-6 select-none relative bg-white overflow-hidden box-border">
                
                {/* LEFT CONVOLUTION: Part 1 - Installments 1 to Math.ceil(rows.length / 2) */}
                <div className="w-[48.5%] h-full border-2 border-slate-300 rounded-3xl p-4 flex flex-col justify-between bg-slate-50/15 relative">
                  
                  {/* Outer Frame Accents */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-slate-450"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-slate-450"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-slate-450"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-slate-450"></div>

                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Header */}
                      <div className="text-center mb-2">
                        <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-wider">{company?.company_name || 'ALJOOYA SUBIDHA SERVICES'}</h2>
                        <span className="text-[8px] font-extrabold text-pink-600 uppercase tracking-widest block leading-none">কিস্তি আদায়পত্র (গ্রাহক কপি) / Payment Schedule Records</span>
                      </div>

                      {/* Client Brief Profile - Real information from database */}
                      <div className="grid grid-cols-4 gap-1.5 bg-slate-100 rounded-xl p-2 text-[8.5px] font-semibold text-slate-700 border border-slate-200 mb-2">
                        <div className="col-span-2 truncate">👤 নাম: <span className="font-extrabold text-slate-900">{loan.member_name}</span></div>
                        <div className="col-span-2 font-mono text-right truncate">🆔 ঋণ নং: <span className="font-extrabold text-slate-900">{loan.loan_no || `L${loan.id}`}</span></div>
                        <div className="col-span-2 truncate">📱 মোবাইল: <span className="font-bold text-slate-900">{loan.mobile_no || 'N/A'}</span></div>
                        <div className="col-span-2 text-right truncate">🏢 শাখা: <span className="font-bold text-slate-900">{loan.branch_name || 'N/A'}</span></div>
                        <div className="col-span-2">💰 ঋণ টাকা: <span className="font-bold text-slate-900">₹{formatAmount(totalPrincipal)}</span></div>
                        <div className="col-span-2 text-right">💵 কিস্তি: <span className="font-bold text-pink-700 font-sans">₹{formatAmount(baseEMI)}</span></div>
                      </div>

                      {/* Left Table Panel */}
                      <div className="overflow-hidden">
                        <table className="w-full border-collapse border border-slate-400 print:border-slate-800 text-[8px]">
                          <thead>
                            <tr className="bg-slate-800 text-white font-black uppercase text-[7.5px]">
                              <th className="border border-slate-500 print:border-slate-800 p-1 text-center w-6">নং</th>
                              <th className="border border-slate-500 print:border-slate-800 p-1 text-center w-16">নির্ধারিত তারিখ</th>
                              <th className="border border-slate-500 print:border-slate-800 p-1 text-right w-12">কিস্তি টাকা</th>
                              <th className="border border-slate-500 print:border-slate-800 p-1 text-center w-16">আদায় তারিখ</th>
                              <th className="border border-slate-500 print:border-slate-800 p-1 text-right w-14">আদায় টাকা</th>
                              <th className="border border-slate-500 print:border-slate-800 p-1 text-center w-12">কর্মী সই</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leftRows.map((row) => (
                              <tr key={row.instNo} className="bg-white hover:bg-slate-50">
                                <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-center font-bold text-slate-550">{row.instNo}</td>
                                <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-center font-bold font-mono text-slate-750">{row.date}</td>
                                <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-right font-black font-mono text-slate-900">₹{formatAmount(row.amount)}</td>
                                <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-center text-[7.5px] font-bold text-emerald-700 font-mono text-slate-800">
                                  {row.collectedAmt ? row.recvDate : <span className="text-slate-300 print:text-slate-500 block text-center font-light leading-none">..........</span>}
                                </td>
                                <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-right text-[7.5px] font-black text-emerald-700 font-mono text-slate-800">
                                  {row.collectedAmt ? `₹${row.collectedAmt}` : <span className="text-slate-300 print:text-slate-500 block text-center font-light leading-none">..........</span>}
                                </td>
                                <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-center text-[7px] font-extrabold text-emerald-600">
                                  {row.isPaid && signatureMode === 'digital' ? (
                                    <span className="text-emerald-700 font-black">✓ Paid</span>
                                  ) : (
                                    <span className="text-slate-300 print:text-slate-500 block text-center font-light leading-none">..........</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[7px] text-slate-400 font-bold uppercase mt-1 tracking-wider">
                      <div>Member ID: {loan.member_code || 'N/A'}</div>
                      <div>ALJOOYA SYSTEM • PAGE 1</div>
                    </div>
                  </div>
                </div>

                {/* MIDDLE SEPARATOR: FOLD HERE */}
                <div className="w-[3%] h-full flex flex-col items-center justify-center relative select-none">
                  <div className="h-full border-l-[2px] border-dashed border-slate-300"></div>
                  <div className="absolute bg-white px-2 py-4 text-[8px] font-black text-slate-400 rotate-90 whitespace-nowrap tracking-[0.25em] uppercase flex items-center gap-1.5 rounded-full border border-slate-200 shadow-sm">
                    ✂️ Fold Booklet / ভাঁজ করার রেখা
                  </div>
                </div>

                {/* RIGHT CONVOLUTION: Part 2 - Installments Math.ceil(rows.length / 2) to end */}
                <div className="w-[48.5%] h-full border-2 border-slate-300 rounded-3xl p-4 flex flex-col justify-between bg-slate-50/15 relative">
                  
                  {/* Outer Frame Accents */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-slate-450"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-slate-450"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-slate-450"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-slate-450"></div>

                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Header */}
                      <div className="text-center mb-2">
                        <span className="text-[12px] font-black text-slate-900 uppercase tracking-wider">{company?.company_name || 'ALJOOYA SUBIDHA SERVICES'}</span>
                        <span className="text-[8px] font-extrabold text-pink-600 block leading-none mt-0.5">পরিশোধ কিস্তি সূচী ২য় ভাগ / Repayment Records Part 2</span>
                      </div>

                      {/* Client Brief Profile Part 2 - More real information from database */}
                      <div className="grid grid-cols-4 gap-1.5 bg-rose-50/40 rounded-xl p-2 text-[8.5px] font-semibold text-slate-700 border border-pink-100 mb-2">
                        <div className="col-span-2 truncate">🆔 সদস্য কোড: <span className="font-extrabold text-slate-900">{loan.member_code || `CID-${loan.customer_id}`}</span></div>
                        <div className="col-span-2 text-right truncate">👥 সমিতি/গ্রুপ: <span className="font-bold text-slate-900">{loan.group_name || 'Individual'}</span></div>
                        <div className="col-span-2 truncate">👨‍👩‍👦 অভিভাবক: <span className="font-bold text-slate-900">{loan.guardian_name || 'N/A'}</span></div>
                        <div className="col-span-2 text-right truncate">📈 স্কিম: <span className="font-bold text-slate-900">{loan.scheme_name || 'N/A'}</span></div>
                        <div className="col-span-2">📅 চক্র: <span className="font-extrabold text-pink-700 uppercase">{loan.emi_frequency || 'weekly'}</span></div>
                        <div className="col-span-2 text-right">🕒 মোট কিস্তি: <span className="font-bold text-slate-900">{loan.duration_weeks} টি</span></div>
                      </div>

                      {/* Right Table Panel */}
                      {rightRows.length > 0 ? (
                        <div className="overflow-hidden">
                          <table className="w-full border-collapse border border-slate-400 print:border-slate-800 text-[8px]">
                            <thead>
                              <tr className="bg-slate-800 text-white font-black uppercase text-[7.5px]">
                                <th className="border border-slate-500 print:border-slate-800 p-1 text-center w-6">নং</th>
                                <th className="border border-slate-500 print:border-slate-800 p-1 text-center w-16">নির্ধারিত তারিখ</th>
                                <th className="border border-slate-500 print:border-slate-800 p-1 text-right w-12">কিস্তি টাকা</th>
                                <th className="border border-slate-500 print:border-slate-800 p-1 text-center w-16">আদায় তারিখ</th>
                                <th className="border border-slate-500 print:border-slate-800 p-1 text-right w-14">আদায় টাকা</th>
                                <th className="border border-slate-500 print:border-slate-800 p-1 text-center w-12">কর্মী সই</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rightRows.map((row) => (
                                <tr key={row.instNo} className="bg-white hover:bg-slate-50">
                                  <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-center font-bold text-slate-500">{row.instNo}</td>
                                  <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-center font-bold font-mono text-slate-750">{row.date}</td>
                                  <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-right font-black font-mono text-slate-900">₹{formatAmount(row.amount)}</td>
                                  <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-center text-[7.5px] font-bold text-emerald-700 font-mono text-slate-800">
                                    {row.collectedAmt ? row.recvDate : <span className="text-slate-300 print:text-slate-500 block text-center font-light leading-none">..........</span>}
                                  </td>
                                  <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-right text-[7.5px] font-black text-emerald-700 font-mono text-slate-800">
                                    {row.collectedAmt ? `₹${row.collectedAmt}` : <span className="text-slate-300 print:text-slate-500 block text-center font-light leading-none">..........</span>}
                                  </td>
                                  <td className="border border-slate-400 print:border-slate-800 py-1.5 px-0.5 print:py-1 text-center text-[7px] font-extrabold text-emerald-600">
                                    {row.isPaid && signatureMode === 'digital' ? (
                                      <span className="text-emerald-700 font-black">✓ Paid</span>
                                    ) : (
                                      <span className="text-slate-300 print:text-slate-500 block text-center font-light leading-none">..........</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 flex-1 h-[250px] flex flex-col justify-between text-slate-700 select-none">
                          <div>
                            <div className="text-center pb-1.5 border-b border-slate-200 mb-2.5">
                              <span className="text-[10px] font-black text-pink-700 uppercase tracking-widest block mb-0.5">অফিসিয়াল নিরীক্ষণ ও সুপারভাইজার মন্তব্য</span>
                              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Supervisor Official Audit & Field Inspection Notes</span>
                            </div>
                            
                            <div className="space-y-3 pt-1">
                              <div className="flex border-b border-slate-200 pb-1 text-[8px] font-bold">
                                <span className="text-slate-500 w-24">পরিদর্শন তারিখ (Date):</span>
                                <span className="text-slate-300 font-light">....................................................................</span>
                              </div>
                              <div className="flex border-b border-slate-200 pb-1 text-[8px] font-bold">
                                <span className="text-slate-500 w-24">নিরীক্ষকের মন্তব্য (Remark):</span>
                                <span className="text-slate-300 font-light">....................................................................</span>
                              </div>
                              <div className="flex border-b border-slate-200 pb-1 text-[8px] font-bold">
                                <span className="text-slate-500 w-24">তদন্তকারী সুপারভাইজার সই:</span>
                                <span className="text-slate-300 font-light">....................................................................</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-center border-t border-slate-200/60 pt-2 text-[7px] font-black text-slate-400 font-sans">
                            📝 সংগৃহীত তথ্য ও ক্যাশ ব্যালেন্স মেলাবার জন্য এই স্থান সংরক্ষিত।
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[7px] text-slate-400 font-bold uppercase mt-1 tracking-wider">
                      <div>Generated: {new Date().toLocaleDateString()}</div>
                      <div>ALJOOYA SYSTEM • PAGE 2</div>
                    </div>
                  </div>
                </div>

              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
