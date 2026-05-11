import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, X, Download } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount } from '../lib/utils';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function LoanApplicationView() {
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
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  };

  const c_name = company?.name || '';
  const c_addr = company?.address || '';
  const c_phone = company?.contact_no || '';
  const c_email = company?.email || '';
  const c_logo = company?.logo_url ? company.logo_url : '';

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
      pdf.save(`LoanApplication_${loan?.loan_no || id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Please try using the Print button instead.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading application...</div>;
  }

  if (!loan) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Application not found!</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Go Back</button>
      </div>
    );
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
          {/* A4 Page Container */}
          <div 
            ref={printRef}
            className="bg-white shadow-lg mx-auto print:shadow-none"
            style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: '"Times New Roman", Times, serif', fontSize: '14.5px', color: '#000' }}
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
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-2.5 mb-4">
            {c_logo && <img src={c_logo} alt="Logo" className="w-[60px] h-[60px] object-contain mx-auto mb-1" />}
            <h1 className="text-[26px] font-black uppercase tracking-wider m-0 leading-tight">{c_name}</h1>
            <p className="text-[13px] text-[#444] leading-tight m-0 mt-1">{c_addr}</p>
            <p className="text-[13px] text-[#444] leading-tight m-0">Helpline: {c_phone} | Email: {c_email}</p>
          </div>

          <div className="text-center mb-5">
            <span className="bg-black text-white px-6 py-1.5 text-base font-bold uppercase rounded-full inline-block">Loan Application Form</span>
            <div className="text-[13px] mt-1.5 font-bold">App ID: {loan.loan_no || `L${loan.id}`} | Date: {formatDate(loan.created_at)}</div>
          </div>

          {/* Applicant Details */}
          <div className="border border-black p-3 mb-4 relative">
            <span className="absolute -top-3 left-4 bg-white px-2 font-bold text-[13px] uppercase border border-black">Applicant Details</span>
            
            <div className="absolute top-4 right-4 w-[120px] h-[140px] border border-black flex items-center justify-center bg-[#f9f9f9] overflow-hidden">
              {loan.profile_image ? (
                <img src={loan.profile_image} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span className="text-[#9ca3af] text-xs text-center p-2">No Photo provided</span>
              )}
            </div>

            <div className="mr-[130px] space-y-1.5">
              <div className="flex items-baseline">
                <span className="font-bold w-[140px] shrink-0">Full Name:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.member_name}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[140px] shrink-0">Member Code:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.member_code}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[140px] shrink-0">Guardian:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.guardian_name} ({loan.guardian_type})</span>
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-baseline flex-1">
                  <span className="font-bold w-[90px] shrink-0">DOB:</span>
                  <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{formatDate(loan.dob)}</span>
                </div>
                <div className="flex items-baseline flex-1">
                  <span className="font-bold w-[80px] shrink-0">Mobile:</span>
                  <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.mobile_no}</span>
                </div>
              </div>

              <div className="flex items-baseline">
                <span className="font-bold w-[140px] shrink-0">Occupation:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.occupation}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[140px] shrink-0">Address:</span>
                <span className="flex-1 font-semibold text-[13px] border-b border-dotted border-[#6b7280] pl-1 leading-snug">
                  {loan.village ? `${loan.village}, ` : ''}{loan.post_office ? `PO: ${loan.post_office}, ` : ''}{loan.police_station ? `PS: ${loan.police_station}, ` : ''}{loan.district ? `${loan.district} - ` : ''}{loan.pin_code || ''}
                </span>
              </div>

              <div className="flex gap-4">
                <div className="flex items-baseline flex-1">
                  <span className="font-bold w-[90px] shrink-0">Aadhar:</span>
                  <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.aadhar_no}</span>
                </div>
                <div className="flex items-baseline flex-1">
                  <span className="font-bold w-[80px] shrink-0">Voter ID:</span>
                  <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.voter_id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Information */}
          <div className="border border-black p-3 mb-4 relative">
            <span className="absolute -top-3 left-4 bg-white px-2 font-bold text-[13px] uppercase border border-black">Loan Information</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
              <div className="flex items-baseline">
                <span className="font-bold w-[110px] shrink-0">Scheme:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.scheme_name}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[110px] shrink-0">Branch:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.branch_name}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[110px] shrink-0">Principal:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">₹ {formatAmount(loan.amount)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[110px] shrink-0">Interest:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">₹ {formatAmount(loan.interest)} ({loan.interest_rate || 0}%)</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[110px] shrink-0">Term:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.duration_weeks} {loan.emi_frequency || 'weeks'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[110px] shrink-0">EMI:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">₹ {formatAmount(loan.installment)}</span>
              </div>
              <div className="flex items-baseline col-span-2">
                <span className="font-bold w-[110px] shrink-0">Total Pay:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">₹ {formatAmount(loan.total_repayment || (Number(loan.amount)+Number(loan.interest)))} (Principal + Interest)</span>
              </div>
              <div className="flex items-baseline col-span-2">
                <span className="font-bold w-[110px] shrink-0">Installment Day:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">
                  Start: {formatDate(loan.start_date)} ({loan.emi_frequency}){loan.emi_frequency === 'monthly' && loan.collection_week ? ` - ${loan.collection_week}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Guarantor Information */}
          <div className="border border-black p-3 mb-4 relative">
            <span className="absolute -top-3 left-4 bg-white px-2 font-bold text-[13px] uppercase border border-black">Guarantor Information</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
              <div className="flex items-baseline">
                <span className="font-bold w-[90px] shrink-0">Name:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.guarantor_name || ''}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[90px] shrink-0">Relation:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.guarantor_relation || ''}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[90px] shrink-0">Mobile:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.guarantor_phone || ''}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[90px] shrink-0">Aadhar:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.guarantor_aadhar || ''}</span>
              </div>
              <div className="flex items-baseline col-span-2">
                <span className="font-bold w-[90px] shrink-0">Address:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{loan.guarantor_address || ''}</span>
              </div>
            </div>
          </div>

          <div className="border border-black p-3 mb-4 relative bg-[#fdfdfd]">
            <span className="absolute -top-3 left-4 bg-white px-2 font-bold text-[13px] uppercase border border-black">For Office Use Only</span>
            <div className="grid grid-cols-3 gap-4 mt-1">
              <div className="flex items-baseline">
                <span className="font-bold w-[70px] shrink-0">App Date:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">{formatDate(loan.created_at)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[70px] shrink-0">Status:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1 uppercase">{loan.status}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-[70px] shrink-0">Fee:</span>
                <span className="flex-1 font-semibold text-[15px] border-b border-dotted border-[#6b7280] pl-1">₹ {formatAmount(loan.processing_fee || 0)}</span>
              </div>
            </div>
          </div>

          <div className="text-[13px] text-justify mt-2.5 leading-[1.4] italic font-serif">
            <strong>Declaration:</strong> I/We hereby declare that all the information furnished above is true and correct. I/We promise to abide by the rules and regulations of <strong>{c_name}</strong> and repay the loan amount along with interest on time.
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-auto pt-5">
          <div className="text-center w-[200px]">
            <div className="border-t border-black mt-10 pt-1 font-bold text-[14px]">Applicant Signature</div>
          </div>
          <div className="text-center w-[200px]">
             <div className="border-t border-black mt-10 pt-1 font-bold text-[14px]">Guarantor Signature</div>
          </div>
          <div className="text-center w-[200px]">
            <div className="border-t border-black mt-10 pt-1 font-bold text-[14px]">Authorized By</div>
          </div>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
