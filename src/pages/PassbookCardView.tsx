import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, X, Download, PiggyBank } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { formatAmount } from '../lib/utils';

export default function PassbookCardView() {
  const { type, id } = useParams(); // type can be 'saving' or 'rd'
  const navigate = useNavigate();
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
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
      const [accData, txnData, companiesData] = await Promise.all([
        fetchWithAuth(`/savings/${id}`),
        fetchWithAuth(`/savings/${id}/transactions`),
        fetchWithAuth('/companies')
      ]);
      setAccount(accData);
      setTransactions(txnData);
      if (companiesData && companiesData.length > 0) {
        setCompany(companiesData[0]);
      }
    } catch (err: any) {
      console.error('Failed to load passbook card:', err);
    } finally {
      setLoading(false);
    }
  };

  const c_name = company?.name || 'ALJOOYA SUBIDHA SERVICES';

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
      pdf.save(`PassbookCard_${account?.account_no || id}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Please try using the Print button instead.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading passbook card...</div>;
  }

  if (!account) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Account not found!</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Go Back</button>
      </div>
    );
  }

  // Create grid rows (Fixed number for Excel look, say 25 rows)
  const totalRows = 25;
  const displayRows = [...transactions];
  while (displayRows.length < totalRows) {
    displayRows.push(null);
  }

  return (
    <div className="min-h-screen bg-white print:bg-white flex flex-col">
      {/* Controls - Hidden during print */}
      <div className="print:hidden w-full p-3 md:p-4 flex flex-wrap justify-center gap-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition text-sm">
          <Printer className="w-4 h-4" /> Print Passbook Card
        </button>
        <button onClick={handleDownloadPDF} disabled={generatingPDF} className={`flex items-center justify-center gap-2 ${generatingPDF ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-2 rounded-lg font-bold shadow-sm transition text-sm`}>
          {generatingPDF ? 'Generating PDF...' : <><Download className="w-4 h-4 text-sm" /> Download PDF</>}
        </button>
        <button onClick={() => navigate(-1)} className="flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition text-sm">
          <X className="w-4 h-4" /> Close
        </button>
      </div>

      <div className="w-full flex-1 overflow-x-auto bg-gray-100 print:bg-white print:overflow-visible">
        <div className="w-fit min-w-full mx-auto p-4 sm:p-8 print:p-0">
          <div 
            ref={printRef}
            className="bg-white shadow-lg print:shadow-none mx-auto border border-gray-300"
            style={{ width: '297mm', minHeight: '210mm', fontFamily: 'sans-serif', color: '#000' }}
          >
            <style>{`
              @media print {
                @page { size: landscape; margin: 0; }
                body * { visibility: hidden; }
                #passbook-print-area, #passbook-print-area * { visibility: visible; }
                #passbook-print-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  margin: 0;
                  padding: 0;
                  width: 297mm;
                  height: 210mm;
                  border: none !important;
                }
              }
            `}</style>
            
            <div id="passbook-print-area" className="flex w-full h-full p-[8mm] relative">
              {/* Left Side: Information */}
              <div className="w-[35%] border-r-2 border-slate-800 pr-[6mm] flex flex-col pt-2 relative">
                <div className="text-center mb-6">
                  {company?.logo_url && (
                    <img src={company.logo_url} className="h-10 mx-auto mb-2 object-contain" alt="Logo" referrerPolicy="no-referrer" />
                  )}
                  <h1 className="font-black text-[18px] uppercase tracking-tight text-indigo-900 leading-tight">{c_name}</h1>
                  <div className="w-12 h-0.5 bg-emerald-500 mx-auto mt-1 mb-1 rounded-full"></div>
                  <p className="font-bold text-[11px] uppercase tracking-widest text-gray-500">
                    {account.account_type === 'rd' ? 'Recurring Deposit' : 'Savings Account'} Passbook
                  </p>
                </div>
                
                <div className="flex justify-center mb-6">
                  <div className="w-[80px] h-[90px] border-2 border-indigo-100 p-1 bg-white shadow-sm rounded-md overflow-hidden">
                    {account.profile_image ? (
                      <img src={account.profile_image} className="w-full h-full object-cover rounded-sm" alt="Profile" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center text-[10px] text-gray-400 font-semibold text-center border border-dashed border-gray-200 rounded-sm">
                        Customer<br/>Photo
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4 text-[11px]">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h3 className="text-[10px] font-black text-indigo-700 uppercase mb-2 tracking-widest border-b border-indigo-100 pb-1">Customer Identity</h3>
                    <div className="space-y-2">
                       <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">Name:</span> <span className="font-bold border-b border-gray-400 flex-1 uppercase pb-0.5 truncate">{account.member_name}</span></div>
                       <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">Relative:</span> <span className="font-bold border-b border-gray-400 flex-1 uppercase pb-0.5 truncate">{account.guardian_name || 'N/A'}</span></div>
                       <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">Address:</span> <span className="font-bold border-b border-gray-400 flex-1 uppercase pb-0.5 truncate">{account.village || 'N/A'}</span></div>
                       <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">Mobile:</span> <span className="font-bold border-b border-gray-400 flex-1 pb-0.5">{account.mobile_no || 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100">
                    <h3 className="text-[10px] font-black text-emerald-700 uppercase mb-2 tracking-widest border-b border-emerald-100 pb-1">Account Particulars</h3>
                    <div className="space-y-2">
                       <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">A/C No:</span> <span className="font-black border-b border-gray-400 flex-1 pb-0.5 text-indigo-700">{account.account_no}</span></div>
                       <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">Type:</span> <span className="font-bold border-b border-gray-400 flex-1 pb-0.5 uppercase">{account.account_type === 'rd' ? 'Recurring Deposit' : 'Savings'}</span></div>
                       <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">Opened:</span> <span className="font-bold border-b border-gray-400 flex-1 pb-0.5">{formatDate(account.created_at)}</span></div>
                       {account.account_type === 'rd' && (
                         <>
                           <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">Deposit:</span> <span className="font-bold border-b border-gray-400 flex-1 pb-0.5">₹ {formatAmount(account.monthly_deposit)}</span></div>
                           <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">Tenure:</span> <span className="font-bold border-b border-gray-400 flex-1 pb-0.5">{account.duration_months} Months</span></div>
                         </>
                       )}
                       <div className="flex items-end"><span className="w-20 font-bold text-slate-500 uppercase tracking-tight">Interest:</span> <span className="font-bold border-b border-gray-400 flex-1 pb-0.5">{account.interest_rate}% P.A.</span></div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-2 left-0 right-0 px-2 mt-auto">
                    <div className="flex justify-between items-end gap-4 mb-4">
                      <div className="text-center flex-1">
                         <div className="border-t border-black mb-1"></div>
                         <p className="text-[9px] font-black uppercase text-gray-500">Member Sign</p>
                      </div>
                      <div className="text-center flex-1">
                         <div className="border-t border-black mb-1"></div>
                         <p className="text-[9px] font-black uppercase text-gray-500">Authorized Sign</p>
                      </div>
                    </div>
                    <p className="text-[8px] text-gray-400 text-center uppercase tracking-widest font-bold">This is a system generated statement of account.</p>
                </div>
              </div>

              {/* Right Side: Ledger Table */}
              <div className="w-[65%] pl-[6mm] flex flex-col pt-2">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-[14px] font-black text-indigo-900 uppercase tracking-widest border-b-2 border-indigo-100 pb-1">Ledger Statement</h2>
                  <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                    BALANCE: ₹ {formatAmount(account.balance)}
                  </div>
                </div>

                <table className="w-full border-collapse text-[9px] border-2 border-slate-800">
                  <thead>
                    <tr className="bg-slate-800 text-white uppercase font-black tracking-widest">
                      <th className="border-r border-slate-600 p-2 text-center w-10">No</th>
                      <th className="border-r border-slate-600 p-2 text-center w-24">Date</th>
                      <th className="border-r border-slate-600 p-2 text-left">Particulars</th>
                      <th className="border-r border-slate-600 p-2 text-right w-20">Deposit (₹)</th>
                      <th className="border-r border-slate-600 p-2 text-right w-20">Withdraw (₹)</th>
                      <th className="border-r border-slate-600 p-2 text-right w-24">Balance (₹)</th>
                      <th className="p-2 text-center w-16">Sign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Calculate running balance for the ledger */}
                    {(() => {
                      let runningBalance = 0;
                      return displayRows.map((txn, idx) => {
                        if (txn) {
                          if (txn.type === 'deposit' || txn.type === 'interest') {
                            runningBalance += parseFloat(txn.amount);
                          } else {
                            runningBalance -= parseFloat(txn.amount);
                          }
                        }
                        
                        return (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                             <td className="border border-gray-400 p-1.5 text-center font-bold text-gray-500">{idx + 1}</td>
                             <td className="border border-gray-400 p-1.5 text-center text-gray-800 font-medium">
                               {txn ? formatDate(txn.date) : ''}
                             </td>
                             <td className="border border-gray-400 p-1.5 text-left text-gray-800 font-bold uppercase truncate max-w-[150px]">
                               {txn ? (txn.remarks || txn.type) : ''}
                             </td>
                             <td className="border border-gray-400 p-1.5 text-right font-black text-emerald-700">
                               {txn && (txn.type === 'deposit' || txn.type === 'interest') ? formatAmount(txn.amount) : ''}
                             </td>
                             <td className="border border-gray-400 p-1.5 text-right font-black text-rose-700">
                               {txn && txn.type === 'withdrawal' ? formatAmount(txn.amount) : ''}
                             </td>
                             <td className="border border-gray-400 p-1.5 text-right font-black text-indigo-900 bg-indigo-50/30">
                               {txn ? formatAmount(runningBalance) : ''}
                             </td>
                             <td className="border border-gray-400 p-1.5"></td>
                          </tr>
                        );
                      });
                    })()}
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
