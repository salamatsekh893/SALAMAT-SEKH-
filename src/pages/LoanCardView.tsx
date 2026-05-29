import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, X, Download, BookOpen, ShieldCheck, PhoneCall, Landmark } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'cover' | 'schedule'>('cover'); // Default to cover so the beautiful cover page is shown first!
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loanData, companiesData] = await Promise.all([
        fetchWithAuth(`/loans/${id}`),
        fetchWithAuth('/companies')
      ]);
      setLoan(loanData);
      if (companiesData && companiesData.length > 0) {
        setCompany(companiesData[0]);
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
  const numInstallments = loan.duration_weeks || 12;
  const rows = [];
  let currentDate = loan.start_date ? new Date(loan.start_date) : new Date();

  const totalPrincipal = Math.floor(Number(loan.amount) || 0);
  const totalRepayment = Math.floor(Number(loan.total_repayment || (totalPrincipal + Number(loan.interest || 0))));
  
  const baseEMI = loan.installment ? Math.floor(Number(loan.installment)) : Math.floor(totalRepayment / numInstallments);
  const basePrincipal = Math.floor(totalPrincipal / numInstallments);
  
  let remainingPrincipal = totalPrincipal;
  let remainingOutstanding = totalRepayment;

  for (let i = 1; i <= numInstallments; i++) {
    const isLast = i === numInstallments;
    
    // Adjust last EMI so total matches exactly
    const emiPrincipal = isLast ? remainingPrincipal : basePrincipal;
    const emiAmount = isLast ? remainingOutstanding : baseEMI;
    const emiInterest = emiAmount - emiPrincipal;
    
    remainingPrincipal -= emiPrincipal;
    remainingOutstanding -= emiAmount;

    rows.push({
      instNo: i,
      date: format(currentDate, 'dd-MMM-yyyy'),
      amount: emiAmount,
      principal: emiPrincipal,
      interest: emiInterest,
      outstanding: remainingOutstanding
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

      <div className="w-full flex-1 overflow-x-auto bg-slate-900 print:bg-white print:overflow-visible py-8">
        <div className="w-fit min-w-full mx-auto px-4 print:p-0">
          
          {/* Landscape A4 Page Container */}
          <div 
            id="loan-card-print-area"
            ref={printRef}
            className="bg-white shadow-2xl print:shadow-none mx-auto rounded-[24px] overflow-hidden"
            style={{ width: '297mm', height: '210mm', fontFamily: 'sans-serif', color: '#000' }}
          >
            <style>{`
              @media print {
                @page {
                  size: landscape;
                  margin: 0;
                }
                body {
                  background-color: #fff !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #loan-card-print-area, #loan-card-print-area * {
                  visibility: visible !important;
                }
                #loan-card-print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 297mm !important;
                  height: 210mm !important;
                  border: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                  background-color: #fff !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `}</style>
            
            {viewMode === 'cover' ? (
              /* ========================================================================= */
              /* FRONT & BACK FOLDABLE PASSBOOK COVER PAGE LAYOUT - PINK/ROSE THEME        */
              /* ========================================================================= */
              <div className="flex w-full h-[210mm] p-[10mm] gap-6 select-none relative bg-white overflow-hidden box-border">
                
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
              /* DETAILED EMI PAYMENT SCHEDULE TABLE LAYOUT - PINK/ROSE THEME              */
              /* ========================================================================= */
              <div className="flex w-full h-[210mm] p-[10mm] relative bg-white flex-row overflow-hidden box-border">
                
                {/* Left Side: Information Card */}
                <div className="w-[38%] border-r-2 border-pink-950 pr-[8mm] flex flex-col justify-between pt-1 h-full box-border">
                  <div>
                    <div className="text-center mb-3">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        {company?.logo_url ? (
                          <img src={company.logo_url} className="w-6 h-6 object-contain" alt="" />
                        ) : (
                          <Landmark className="w-5 h-5 text-pink-950" />
                        )}
                        <h1 className="font-black text-lg uppercase tracking-wider text-pink-950 leading-tight">{c_name}</h1>
                      </div>
                      <p className="font-bold text-[10px] uppercase tracking-widest text-[9px] text-pink-600 leading-none">Loan Passbook Profile</p>
                    </div>
                    
                    <div className="flex justify-center mb-3">
                      <div className="w-[80px] h-[90px] border-2 border-pink-950 p-1 bg-white shadow-sm rounded-md overflow-hidden">
                        {loan.profile_image ? (
                          <img src={loan.profile_image} className="w-full h-full object-cover rounded-sm" alt="Profile" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-[9px] text-pink-300 font-bold text-center border border-dashed border-pink-200 rounded-sm leading-tight">
                            Customer<br/>Profile<br/>Photo
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-[10.5px]">
                      <div className="bg-pink-50/30 p-2 rounded-lg border border-pink-50">
                        <h3 className="text-[9px] font-black text-pink-600 uppercase mb-1 tracking-wider border-b border-pink-100 pb-0.5">Member details</h3>
                        <div className="space-y-1">
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Name:</span> <span className="font-bold border-b border-slate-300 flex-1 uppercase pb-0.5 text-slate-900 truncate">{loan.member_name}</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">{loan.guardian_type || 'C/o'}:</span> <span className="font-bold border-b border-slate-300 flex-1 uppercase pb-0.5 text-slate-900 truncate">{loan.guardian_name || loan.husband_name || loan.father_name || 'N/A'}</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Member ID:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 font-mono">{loan.member_code || `CID: ${loan.customer_id}`}</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Group:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 truncate uppercase font-sans">{loan.group_name || 'INDIVIDUAL'}</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Nominee:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 truncate uppercase">{loan.nominee_name || 'N/A'} ({loan.nominee_relation || ''})</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Address:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 truncate">{loan.village || loan.district || 'N/A'}</span></div>
                        </div>
                      </div>

                      <div className="bg-rose-50/20 p-2 rounded-lg border border-rose-100/45">
                        <h3 className="text-[9px] font-black text-pink-700 uppercase mb-1 tracking-wider border-b border-pink-100 pb-0.5">Loan agreement</h3>
                        <div className="space-y-1">
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Loan A/C:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 font-mono">{loan.loan_no || `L${loan.id}`}</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Interest:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">{loan.interest_rate || loan.interest}% FIXED</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Scheme:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 truncate uppercase">{loan.scheme_name}</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Amount:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 font-mono">₹ {formatAmount(totalPrincipal)}</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Total Repay:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 font-mono">₹ {formatAmount(totalRepayment)}</span></div>
                          <div className="flex items-end"><span className="w-22 font-bold text-pink-800">Term Mode:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 uppercase">{loan.duration_weeks} {loan.emi_frequency || 'weeks'}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-1 border border-dashed border-pink-200 rounded-lg text-center bg-pink-50/20 text-[8px] font-bold text-pink-600 uppercase tracking-wider my-2">
                    Keep this card safe. Bring it during every EMI payment.
                  </div>

                  <div className="border-t-2 border-pink-950 pt-3 flex justify-between px-2 pb-1">
                    <div className="text-center w-24 border-t border-slate-400 pt-0.5 text-[8.5px] font-black text-slate-600">Verified By</div>
                    <div className="text-center w-24 border-t border-slate-400 pt-0.5 text-[8.5px] font-black text-slate-600">Auth. Signatory</div>
                  </div>
                </div>

                {/* Right Side: Installment Ledger Schedule */}
                <div className="w-[62%] pl-[8mm] flex flex-col justify-between pt-1 h-full box-border">
                  <div>
                    <h2 className="text-[14px] font-black text-pink-950 uppercase tracking-wider mb-2.5 border-b-2 border-pink-100 pb-1.5 flex justify-between items-center">
                      <span>EMI payment schedule</span>
                      <span className="text-[11px] text-pink-700 font-black font-mono">EMI: ₹ {formatAmount(baseEMI)}</span>
                    </h2>

                    <table className="w-full border-collapse select-none text-[9.5px]">
                      <thead>
                        <tr className="bg-pink-950 text-white border border-pink-400 uppercase font-black">
                          <th className="border border-pink-300 p-1 text-center w-8">No</th>
                          <th className="border border-pink-300 p-1 text-center w-18">Date</th>
                          <th className="border border-pink-300 p-1 text-right w-14">Prin (₹)</th>
                          <th className="border border-pink-300 p-1 text-right w-12">Int (₹)</th>
                          <th className="border border-pink-300 p-1 text-right w-14">EMI (₹)</th>
                          <th className="border border-pink-300 p-1 text-right w-16">Bal (₹)</th>
                          <th className="border border-pink-300 p-1 text-center w-18">Recv Date</th>
                          <th className="border border-pink-300 p-1 text-right w-14">Coll (₹)</th>
                          <th className="border border-pink-300 p-1 text-center min-w-[50px]">Sign</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 16).map((row, idx) => (
                          <tr key={row.instNo} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-pink-50/10'}`}>
                            <td className="border border-pink-100 p-0.5 text-center font-bold text-slate-700">{row.instNo}</td>
                            <td className="border border-pink-100 p-0.5 text-center whitespace-nowrap text-slate-600 font-mono">{row.date}</td>
                            <td className="border border-pink-100 p-0.5 text-semibold text-right text-slate-500 font-mono">{formatAmount(row.principal)}</td>
                            <td className="border border-pink-100 p-0.5 text-semibold text-right text-slate-500 font-mono">{formatAmount(row.interest)}</td>
                            <td className="border border-pink-100 p-0.5 text-right font-bold text-pink-700 font-mono">{formatAmount(row.amount)}</td>
                            <td className="border border-pink-100 p-0.5 text-right font-black text-pink-950 font-mono">{formatAmount(row.outstanding)}</td>
                            <td className="border border-pink-100 p-0.5"></td>
                            <td className="border border-pink-100 p-0.5"></td>
                            <td className="border border-pink-100 p-0.5"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {rows.length > 16 && (
                    <div className="text-[8px] italic text-rose-600 font-bold tracking-tight text-center bg-rose-50 border border-rose-100 p-1 rounded-md">
                      ⚠️ displaying first 16 installments only, download PDF or print to check entire ledger list.
                    </div>
                  )}

                  <div className="py-2 border-t border-pink-100 flex justify-between items-center text-[8.5px] font-bold text-pink-400">
                    <div>RECORD ID: {loan.id}</div>
                    <div>PAGE 1 OF 1</div>
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
