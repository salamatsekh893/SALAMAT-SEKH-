import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatAmount } from '../lib/utils';

export default function NOCView() {
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
      console.error('Failed to load NOC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      setGeneratingPDF(true);
      const element = printRef.current;
      
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc, clonedElement) => {
          // STRATEGY: Remove all stylesheets and inject a clean one to avoid oklch parsing errors
          const links = clonedDoc.getElementsByTagName('link');
          const styles = clonedDoc.getElementsByTagName('style');
          
          while (links.length > 0) links[0].parentNode?.removeChild(links[0]);
          while (styles.length > 0) styles[0].parentNode?.removeChild(styles[0]);

          const cleanStyle = clonedDoc.createElement('style');
          cleanStyle.innerHTML = `
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .relative { position: relative; }
            .absolute { position: absolute; }
            .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
            .inset-4 { top: 16px; right: 16px; bottom: 16px; left: 16px; }
            .inset-8 { top: 32px; right: 32px; bottom: 32px; left: 32px; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .items-end { align-items: flex-end; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }
            .uppercase { text-transform: uppercase; }
            .italic { font-style: italic; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .font-semibold { font-weight: 600; }
            .leading-relaxed { line-height: 1.625; }
            .tracking-tighter { letter-spacing: -0.05em; }
            .tracking-widest { letter-spacing: 0.1em; }
            .tracking-wider { letter-spacing: 0.05em; }
            .text-3xl { font-size: 30px; }
            .text-2xl { font-size: 24px; }
            .text-lg { font-size: 18px; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .text-\\[10px\\] { font-size: 10px; }
            .w-24 { width: 96px; }
            .w-40 { width: 160px; }
            .w-56 { width: 224px; }
            .h-px { height: 1px; }
            .h-20 { height: 80px; }
            .my-8 { margin-top: 32px; margin-bottom: 32px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-12 { margin-bottom: 48px; }
            .mb-20 { margin-bottom: 80px; }
            .mt-1 { margin-top: 4px; }
            .mt-4 { margin-top: 16px; }
            .px-1 { padding-left: 4px; padding-right: 4px; }
            .px-4 { padding-left: 16px; padding-right: 16px; }
            .px-6 { padding-left: 24px; padding-right: 24px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .border-b { border-bottom-width: 1px; border-bottom-style: solid; }
            .border-t { border-top-width: 1px; border-top-style: solid; }
            .border-y-2 { border-top-width: 2px; border-bottom-width: 2px; border-top-style: solid; border-bottom-style: solid; }
            .border-4 { border-width: 4px; border-style: solid; }
            .border-double { border-style: double; }
            .space-y-6 > * + * { margin-top: 24px; }
            .space-y-4 > * + * { margin-top: 16px; }
            .min-w-\\[100px\\] { min-width: 100px; }
            .inline-block { display: inline-block; }
            .z-10 { z-index: 10; }
            .overflow-hidden { overflow: hidden; }
          `;
          clonedDoc.head.appendChild(cleanStyle);
        }
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`NOC_${loan?.member_code || id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Generating Certificate...</div>;
  }

  if (!loan) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Loan not found!</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-4">
      {/* Controls */}
      <div className="print:hidden w-full max-w-4xl mx-auto px-4 mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 transition-colors shadow-sm">
                <X className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-lg font-bold text-slate-700">No Objection Certificate</h1>
        </div>
        <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all transform active:scale-95 text-sm">
                <Printer className="w-4 h-4" /> Print NOC
            </button>
            <button onClick={handleDownloadPDF} disabled={generatingPDF} className={`flex items-center justify-center gap-2 ${generatingPDF ? 'bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all transform active:scale-95 text-sm`}>
                {generatingPDF ? 'Wait...' : <><Download className="w-4 h-4" /> Download PDF</>}
            </button>
        </div>
      </div>

      {/* Certificate Content */}
      <div className="flex-1 overflow-auto px-4 pb-12">
        <div 
          ref={printRef}
          className="mx-auto relative overflow-hidden"
          style={{ width: '210mm', minHeight: '297mm', fontFamily: 'serif', backgroundColor: '#ffffff', padding: '80px', boxShadow: 'none' }}
        >
            {/* Border decoration */}
            <div className="absolute inset-4 border-4 border-double pointer-events-none" style={{ borderColor: '#e2e8f0' }}></div>
            <div className="absolute inset-8 border pointer-events-none" style={{ borderColor: '#f1f5f9' }}></div>

            <div className="absolute inset-0 flex items-center justify-center select-none" style={{ opacity: 0.03, pointerEvents: 'none' }}>
                <ShieldCheck className="w-[400px] h-[400px]" style={{ color: '#000000' }} />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="text-center" style={{ marginBottom: '48px' }}>
                    {company?.logo && <img src={company.logo} alt="Logo" style={{ height: '80px', margin: '0 auto 16px auto' }} />}
                    <h1 className="text-3xl font-black uppercase tracking-tighter" style={{ color: '#0f172a', marginBottom: '4px' }}>{company?.name || 'ALJOOYA SUBIDHA SERVICES'}</h1>
                    <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#475569' }}>{company?.address}</p>
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b', marginTop: '4px' }}>CIN: {company?.cin || 'N/A'} | REG NO: {company?.reg_no || 'N/A'}</p>
                    
                    <div className="flex items-center justify-center gap-4" style={{ margin: '32px 0' }}>
                        <div className="h-px w-24" style={{ backgroundColor: '#cbd5e1' }}></div>
                        <h2 className="text-2xl font-bold px-6 py-2 tracking-[0.2em] font-sans" style={{ color: '#1e293b', backgroundColor: '#f8fafc', borderTop: '2px solid #94a3b8', borderBottom: '2px solid #94a3b8' }}>NO OBJECTION CERTIFICATE</h2>
                        <div className="h-px w-24" style={{ backgroundColor: '#cbd5e1' }}></div>
                    </div>
                </div>

                {/* Date & Ref */}
                <div className="flex justify-between items-start font-sans text-sm font-bold px-4" style={{ color: '#334155', marginBottom: '48px' }}>
                    <div>Ref No: <span style={{ color: '#0f172a', borderBottom: '1px solid #94a3b8' }} className="min-w-[100px] inline-block">{`ASS/NOC/${loan.id}/${format(new Date(), 'yy')}`}</span></div>
                    <div>Date: <span style={{ color: '#0f172a', borderBottom: '1px solid #94a3b8' }} className="min-w-[100px] inline-block">{format(new Date(), 'dd/MM/yyyy')}</span></div>
                </div>

                {/* Body */}
                <div className="px-6 text-lg leading-relaxed text-justify space-y-6" style={{ color: '#1e293b', marginBottom: '80px' }}>
                    <p>
                        This is to certify and confirm that <span className="font-bold px-1 uppercase" style={{ color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>{loan.member_name}</span>,
                        son/daughter/wife of <span className="font-bold px-1 uppercase" style={{ color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>{loan.guardian_name || loan.husband_name || loan.father_name || 'N/A'}</span>,
                        residing at <span className="font-bold px-1 uppercase" style={{ color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>{loan.village || loan.district}, {loan.state || 'West Bengal'}</span>,
                        bearing Member Code <span className="font-bold px-1 tracking-wider" style={{ color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>{loan.member_code}</span>,
                        has successfully cleared the full outstanding amount of the loan facility sanctioned under account number <span className="font-bold px-1 tracking-wider" style={{ color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>{loan.loan_no || `L-${loan.id}`}</span>.
                    </p>

                    <p>
                        We further confirm that total principal amount of <span className="font-bold" style={{ color: '#0f172a' }}>₹ {formatAmount(loan.amount)}</span> along with 
                        all applicable interest and other charges have been fully recovered by <span className="font-black" style={{ color: '#312e81' }}>{company?.name || 'ALJOOYA SUBIDHA SERVICES'}</span> as on <span className="font-bold px-1" style={{ color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>{format(new Date(), 'dd MMMM yyyy')}</span>.
                    </p>

                    <p>
                        As of the date of this certificate, there are no outstanding dues, liabilities, or claims pending against the aforesaid member in respect of the mentioned loan account. We hereby release any 
                        encumbrance or security interest (if any) held by us in relation to this facility.
                    </p>
                    
                    <p>
                        This certificate is issued at the request of the borrower for their record purposes.
                    </p>
                </div>

                {/* Footer / Signatures */}
                <div className="px-4 flex justify-between items-end" style={{ marginTop: '112px' }}>
                    <div className="text-center font-sans">
                        <div className="w-40 border-b mb-2 mx-auto" style={{ borderColor: '#1e293b' }}></div>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#475569' }}>Borrower's Acknowledgement</p>
                    </div>
                    
                    <div className="text-center font-sans space-y-4">
                        <div className="italic text-sm mb-4" style={{ color: '#94a3b8' }}>Digitally Signed & Verified</div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: '#64748b' }}>For and on behalf of</p>
                            <p className="text-sm font-black uppercase tracking-tighter" style={{ color: '#1e293b', marginBottom: '64px' }}>{company?.name || 'ALJOOYA SUBIDHA SERVICES'}</p>
                            <div className="w-56 h-px mb-2 ml-auto" style={{ backgroundColor: '#1e293b' }}></div>
                            <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: '#334155' }}>Authorized Signatory</p>
                        </div>
                    </div>
                </div>

                {/* Corporate Footer */}
                <div className="pt-12 text-center text-[10px] tracking-widest font-sans uppercase" style={{ borderTop: '1px solid #f1f5f9', color: '#94a3b8', marginTop: '80px' }}>
                    This is a system generated document and does not require a physical signature unless explicitly requested.
                </div>
            </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background-color: white; }
          .min-h-screen { background-color: white; padding-top: 0; }
          @page { size: portrait; margin: 0; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
