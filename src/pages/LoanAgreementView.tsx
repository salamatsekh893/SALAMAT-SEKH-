import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, X, Download } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function LoanAgreementView() {
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
  const c_addr = company?.address || '';

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
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
      pdf.save(`LoanAgreement_${loan?.loan_no || id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Please try using the Print button instead.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading agreement...</div>;
  }

  if (!loan) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Agreement not found!</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Go Back</button>
      </div>
    );
  }

  const currentDate = new Date();

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
          {/* A4 Page Container */}
          <div 
            ref={printRef}
            className="bg-white shadow-lg mx-auto print:shadow-none"
            style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: '"Times New Roman", Times, serif', fontSize: '15px', color: '#000', lineHeight: '1.6' }}
          >
        <style>{`
          @media print {
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
              padding: 10mm;
              width: 210mm;
              height: 296mm;
            }
          }
        `}</style>
        
        <div>
          <h1 className="text-center font-bold text-[24px] uppercase underline mb-8 mt-2">LOAN AGREEMENT</h1>
          
          <div className="text-justify space-y-6">
            <p>
              This Loan Agreement (hereinafter referred to as the "Agreement") is made and entered into on this <strong>{format(currentDate, 'do')} day of {format(currentDate, 'MMMM yyyy')}</strong>, 
              by and between:
            </p>

            <div className="pl-6 border-l-2 border-[rgba(0,0,0,0.1)]">
              <p>
                <strong>{c_name}</strong>, a company/organization having its office at <strong>{c_addr}</strong>, 
                hereinafter referred to as the <strong>"Lender"</strong> (which expression shall, unless it be repugnant to the context or meaning thereof, be deemed to mean and include its successors and assigns).
              </p>
              <div className="text-center my-2 font-bold uppercase tracking-widest text-[12px]">AND</div>
              <p>
                <strong>Mr./Mrs./Ms. {loan.member_name}</strong>, son/daughter/wife of <strong>{loan.father_name || loan.husband_name || '______________'}</strong>, 
                residing at <strong>{loan.village ? `${loan.village}, ` : ''}{loan.post_office ? `PO: ${loan.post_office}, ` : ''}{loan.district ? `${loan.district} - ` : ''}{loan.pin_code || ''}</strong>, 
                holder of Aadhar No. <strong>{loan.aadhar_no || '______________'}</strong> and Voter ID <strong>{loan.voter_id || '______________'}</strong>, 
                hereinafter referred to as the <strong>"Borrower"</strong> (which expression shall, unless it be repugnant to the context or meaning thereof, be deemed to mean and include his/her heirs, executors, administrators and assigns).
              </p>
              {loan.guarantor_name && (
                <>
                  <div className="text-center my-2 font-bold uppercase tracking-widest text-[12px]">AND</div>
                  <p>
                    <strong>Mr./Mrs./Ms. {loan.guarantor_name}</strong>, relation: <strong>{loan.guarantor_relation}</strong>, residing at <strong>{loan.guarantor_address || '___________________________'}</strong>, 
                    holder of Aadhar No. <strong>{loan.guarantor_aadhar || '______________'}</strong>, 
                    hereinafter referred to as the <strong>"Guarantor"</strong>.
                  </p>
                </>
              )}
            </div>

            <p>
              <strong>WHEREAS:</strong><br/>
              A. The Borrower has approached the Lender for a loan for personal/business use.<br/>
              B. The Lender has agreed to grant a loan of <strong>₹{formatAmount(loan.amount)}</strong> (Rupees {Number(loan.amount)} only) to the Borrower subject to the terms and conditions set forth herein.<br/>
            </p>

            <p>
              <strong>NOW, THEREFORE, IT IS HEREBY AGREED AS FOLLOWS:</strong>
            </p>

            <ol className="list-decimal pl-6 space-y-3">
              <li>
                <strong>Loan Amount & Disbursal:</strong> The Lender agrees to advance a loan of <strong>₹{formatAmount(loan.amount)}</strong> to the Borrower.
              </li>
              <li>
                <strong>Interest Rate:</strong> The loan shall carry an interest rate of <strong>{loan.interest_rate || 0}%</strong> for the entire term. The total interest payable is estimated at <strong>₹{formatAmount(loan.interest)}</strong>.
              </li>
              <li>
                <strong>Repayment:</strong> The Borrower agrees to repay the total amount of <strong>₹{formatAmount(loan.total_repayment || (Number(loan.amount) + Number(loan.interest)))}</strong> in <strong>{loan.duration_weeks} {loan.emi_frequency || 'weeks'}</strong>. The equated installment amounts to <strong>₹{formatAmount(loan.installment)}</strong> per installment {loan.emi_frequency === 'monthly' && loan.collection_week ? `(Collection: ${loan.collection_week})` : ''}.
              </li>
              <li>
                <strong>Default & Penalties:</strong> In the event of default in payment of any installment, the Borrower shall be liable to pay penal interest as per the prevailing rules of the Lender. The Lender reserves the right to initiate legal recovery proceedings.
              </li>
              <li>
                <strong>Guarantor's Liability:</strong> (If applicable) The Guarantor hereby unconditionally guarantees the due repayment of the Loan by the Borrower. In case of default, the Guarantor is equally liable to clear all pending dues.
              </li>
              <li>
                <strong>Jurisdiction:</strong> Any disputes arising out of this Agreement shall be subject to the exclusive jurisdiction of the courts near the Lender's Head Office.
              </li>
            </ol>
            
            <p>
              IN WITNESS WHEREOF, the parties hereto have set their hands on the day and year first above written.
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-12 pt-8">
          <div className="text-center w-[180px]">
            <div className="border-t border-black mt-16 pt-2 font-bold text-[14px]">Signature of Borrower</div>
            <div className="text-[12px] mt-1">{loan.member_name}</div>
          </div>
          {loan.guarantor_name && (
            <div className="text-center w-[180px]">
              <div className="border-t border-black mt-16 pt-2 font-bold text-[14px]">Signature of Guarantor</div>
              <div className="text-[12px] mt-1">{loan.guarantor_name}</div>
            </div>
          )}
          <div className="text-center w-[180px]">
            <div className="border-t border-black mt-16 pt-2 font-bold text-[14px]">Authorized Signatory</div>
            <div className="text-[12px] mt-1">For {c_name}</div>
          </div>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
