import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, X, Download } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { format, addWeeks, addDays, addMonths } from 'date-fns';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function LoanCardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
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

  const c_name = company?.name || '';

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
      pdf.save(`LoanCard_${loan?.loan_no || id}.pdf`);
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
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Go Back</button>
      </div>
    );
  }

  // Generate Installment Rows
  const numInstallments = loan.duration_weeks || 12;
  const rows = [];
  let currentDate = loan.start_date ? new Date(loan.start_date) : new Date();

  const totalPrincipal = Math.floor(Number(loan.amount) || 0);
  const totalRepayment = Math.floor(Number(loan.total_repayment || (totalPrincipal + Number(loan.interest || 0))));
  
  const basePrincipal = Math.floor(totalPrincipal / numInstallments);
  const baseEMI = Math.floor(totalRepayment / numInstallments);
  
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

    if (loan.emi_frequency === 'daily') {
      currentDate = addDays(currentDate, 1);
    } else if (loan.emi_frequency === 'monthly') {
      currentDate = addMonths(currentDate, 1);
    } else {
      // Default weekly
      currentDate = addWeeks(currentDate, 1);
    }
  }

  return (
    <div className="min-h-screen bg-white print:bg-white flex flex-col">
      {/* Controls - Hidden during print */}
      <div className="print:hidden w-full p-3 md:p-4 flex flex-wrap justify-center gap-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition text-sm">
          <Printer className="w-4 h-4 md:w-5 md:h-5" /> Print
        </button>
        <button onClick={handleDownloadPDF} disabled={generatingPDF} className={`flex items-center justify-center gap-2 ${generatingPDF ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-2 rounded-lg font-bold shadow-sm transition text-sm`}>
          {generatingPDF ? 'Generating PDF...' : <><Download className="w-4 h-4 md:w-5 md:h-5" /> Download PDF</>}
        </button>
        <button onClick={() => navigate(-1)} className="flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition text-sm">
          <X className="w-4 h-4 md:w-5 md:h-5" /> Close
        </button>
      </div>

      <div className="w-full flex-1 overflow-x-auto bg-gray-100 print:bg-white print:overflow-visible">
        <div className="w-fit min-w-full mx-auto p-4 sm:p-8 print:p-0">
          {/* Landscape A4 Page Container */}
          <div 
            ref={printRef}
            className="bg-white shadow-lg print:shadow-none mx-auto"
            style={{ width: '297mm', minHeight: '210mm', fontFamily: 'sans-serif', color: '#000' }}
          >
        <style>{`
          @media print {
            @page {
              size: landscape;
              margin: 0;
            }
            body * {
              visibility: hidden;
            }
            .bg-white > div:nth-child(2), .bg-white > div:nth-child(2) * {
              visibility: visible;
            }
            .bg-white > div:nth-child(2) {
              position: absolute;
              left: 0;
              top: 0;
              margin: 0;
              padding: 0;
              width: 297mm;
              height: 210mm;
            }
          }
        `}</style>
        
        <div className="flex w-full h-full p-[10mm] relative">
          {/* Left Side: Information */}
          <div className="w-[38%] border-r-2 border-slate-800 pr-[8mm] flex flex-col pt-2">
            <div className="text-center mb-4">
              <h1 className="font-black text-[22px] uppercase tracking-widest text-indigo-900 leading-tight">{c_name}</h1>
              <div className="w-16 h-1 bg-emerald-500 mx-auto mt-2 mb-2 rounded-full"></div>
              <p className="font-bold text-[13px] uppercase tracking-widest text-gray-500">Loan Passbook</p>
            </div>
            
            <div className="flex justify-center mb-4">
              <div className="w-[85px] h-[95px] border-2 border-indigo-100 p-1 bg-white shadow-sm rounded-md overflow-hidden">
                {loan.profile_image ? (
                  <img src={loan.profile_image} className="w-full h-full object-cover rounded-sm" alt="Profile" />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-[10px] text-gray-400 font-semibold text-center border border-dashed border-gray-200 rounded-sm">
                    Customer<br/>Photo
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 text-[11px]">
              <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-50">
                <h3 className="text-[10px] font-bold text-indigo-500 uppercase mb-1.5 tracking-wider border-b border-indigo-100 pb-1">Member Details</h3>
                <div className="space-y-1.5">
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Name:</span> <span className="font-bold border-b border-slate-300 flex-1 uppercase pb-0.5 text-slate-900 truncate">{loan.member_name}</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">{loan.guardian_type || 'C/o'}:</span> <span className="font-bold border-b border-slate-300 flex-1 uppercase pb-0.5 text-slate-900 truncate">{loan.guardian_name || loan.husband_name || loan.father_name || 'N/A'}</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Member ID:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">{loan.member_code || `CID: ${loan.customer_id}`}</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Group:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 truncate uppercase">{loan.group_name || 'INDIVIDUAL'}</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Nominee:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 truncate uppercase">{loan.nominee_name || 'N/A'} ({loan.nominee_relation || ''})</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Nominee Aad:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">{loan.nominee_aadhar || 'N/A'}</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Address:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 truncate">{loan.village || loan.district || 'N/A'}</span></div>
                </div>
              </div>

              <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-50">
                <h3 className="text-[10px] font-bold text-emerald-600 uppercase mb-1.5 tracking-wider border-b border-emerald-100 pb-1">Loan Details</h3>
                <div className="space-y-1.5">
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Loan A/C:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">{loan.loan_no || `L${loan.id}`}</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Interest:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">{loan.interest_rate || loan.interest}% FIXED</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Scheme:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 truncate">{loan.scheme_name}</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Amount:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">₹ {formatAmount(totalPrincipal)}</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Total Repay:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">₹ {formatAmount(totalRepayment)}</span></div>
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Term:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">{loan.duration_weeks} {loan.emi_frequency || 'weeks'}</span></div>
                  {loan.emi_frequency === 'monthly' && loan.collection_week && (
                    <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Collect Wk:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">{loan.collection_week}</span></div>
                  )}
                  <div className="flex items-end"><span className="w-22 sm:w-24 font-bold text-slate-700">Start Date:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">{formatDate(loan.start_date)}</span></div>
                </div>
              </div>

              {(loan.guarantor_name || loan.processing_fee) && (
                <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-50">
                  <h3 className="text-[10px] font-bold text-amber-600 uppercase mb-1.5 tracking-wider border-b border-amber-100 pb-1">Other Info</h3>
                  <div className="space-y-1.5">
                    {loan.guarantor_name && (
                      <>
                        <div className="flex items-end"><span className="w-24 font-bold text-slate-700">Guarantor:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900 truncate uppercase">{loan.guarantor_name}</span></div>
                        <div className="flex items-end"><span className="w-24 font-bold text-slate-700">G. Mobile:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">{loan.guarantor_phone || 'N/A'}</span></div>
                      </>
                    )}
                    {loan.processing_fee && (
                      <div className="flex items-end"><span className="w-24 font-bold text-slate-700">Proc. Fee:</span> <span className="font-bold border-b border-slate-300 flex-1 pb-0.5 text-slate-900">₹ {formatAmount(Number(loan.processing_fee))}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 text-[9px] text-slate-500 p-2 text-center uppercase tracking-wide font-bold border-t border-dashed border-slate-300 pt-3">
              Keep this card safe. Bring it during every EMI payment.
            </div>
            
            <div className="mt-4 border-t-2 border-slate-800 pt-6 flex justify-between px-2">
              <div className="text-center w-24 border-t border-slate-600 pt-1 text-[9px] font-bold text-slate-700">Verified By</div>
              <div className="text-center w-24 border-t border-slate-600 pt-1 text-[9px] font-bold text-slate-700">Auth. Signatory</div>
            </div>
          </div>

          {/* Right Side: Table */}
          <div className="w-[62%] pl-[8mm] flex flex-col pt-2">
            <h2 className="text-[14px] font-bold text-indigo-900 uppercase tracking-widest mb-3 border-b-2 border-indigo-100 pb-2 flex justify-between items-center">
              <span>EMI Payment Schedule</span>
              <span className="text-[11px] text-gray-500 font-medium">EMI: ₹ {formatAmount(baseEMI)}</span>
            </h2>

            <table className="w-full border-collapse select-none text-[10px]">
              <thead>
                <tr className="bg-indigo-50 text-indigo-900 border border-slate-300 print:border-black uppercase font-bold">
                  <th className="border border-slate-300 print:border-black p-1.5 text-center w-8">No</th>
                  <th className="border border-slate-300 print:border-black p-1.5 text-center w-20">Date</th>
                  <th className="border border-slate-300 print:border-black p-1.5 text-right w-14">Prin (₹)</th>
                  <th className="border border-slate-300 print:border-black p-1.5 text-right w-14">Int (₹)</th>
                  <th className="border border-slate-300 print:border-black p-1.5 text-right w-16">EMI (₹)</th>
                  <th className="border border-slate-300 print:border-black p-1.5 text-right w-16">Bal (₹)</th>
                  <th className="border border-slate-300 print:border-black p-1.5 text-center w-20">Recv Dt</th>
                  <th className="border border-slate-300 print:border-black p-1.5 text-right w-16">Recv (₹)</th>
                  <th className="border border-slate-300 print:border-black p-1.5 text-center min-w-[70px]">Sign</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.instNo} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} print:bg-white`}>
                    <td className="border border-slate-300 print:border-black p-1 text-center font-bold text-slate-700 print:text-black">{row.instNo}</td>
                    <td className="border border-slate-300 print:border-black p-1 text-center whitespace-nowrap text-slate-600 print:text-black">{row.date}</td>
                    <td className="border border-slate-300 print:border-black p-1 text-right text-slate-500 print:text-black">{formatAmount(row.principal)}</td>
                    <td className="border border-slate-300 print:border-black p-1 text-right text-slate-500 print:text-black">{formatAmount(row.interest)}</td>
                    <td className="border border-slate-300 print:border-black p-1 text-right font-bold text-emerald-700 print:text-black">{formatAmount(row.amount)}</td>
                    <td className="border border-slate-300 print:border-black p-1 text-right font-bold text-indigo-900 print:text-black">{formatAmount(row.outstanding)}</td>
                    <td className="border border-slate-300 print:border-black p-1"></td>
                    <td className="border border-slate-300 print:border-black p-1"></td>
                    <td className="border border-slate-300 print:border-black p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        </div>
        </div>
      </div>
    </div>
  );
}
