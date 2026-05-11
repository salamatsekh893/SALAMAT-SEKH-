import { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '../lib/api';
import { UserPlus, Pencil, FileText, IdCard, X, Printer, Download, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatAmount } from '../lib/utils';
import { voiceFeedback } from '../lib/voice';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showDoc, setShowDoc] = useState<{ type: 'joining' | 'icard', employee: any } | null>(null);
  const printRef = useRef(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const handleDownload = async () => {
    if (!printRef.current) return;
    try {
      const imgData = await htmlToImage.toJpeg(printRef.current, { 
        quality: 1.0, 
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => { img.onload = resolve; });

      let pdf;
      // Joining Letter is A4, ID Card is custom size
      if (showDoc?.type === 'joining') {
        pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } else {
        // A standard ID Card is roughly 54mm x 86mm, but we'll use auto size
        pdf = new jsPDF('p', 'mm', [54, 86]);
        pdf.addImage(imgData, 'JPEG', 0, 0, 54, 86);
      }
      
      pdf.save(`${showDoc?.employee?.name || 'document'}_${showDoc?.type}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('There was a problem downloading the PDF.');
    }
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchWithAuth('/employees'),
      fetchWithAuth('/branches')
    ]).then(([empData, branchData]) => {
      setEmployees(empData);
      setBranches(branchData);
    }).finally(() => setLoading(false));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to terminate this staff record?')) return;
    try {
      await fetchWithAuth(`/employees/${id}`, { method: 'DELETE' });
      voiceFeedback.success();
      loadData();
    } catch (err: any) {
      alert(err.message);
      voiceFeedback.error();
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-8 pb-10">
      <div className="bg-white -mx-4 sm:mx-0 rounded-none sm:rounded-[40px] p-4 sm:p-10 shadow-xl shadow-indigo-500/5 border sm:border border-indigo-50 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 border-b border-slate-100 pb-8 px-2 sm:px-0">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Team Directory</h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5 uppercase tracking-widest leading-none">Managing privileges & site assignments</p>
          </div>
          <button 
            onClick={() => navigate('/employees/new')} 
            className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-indigo-500/30 transition-all active:scale-95 shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Provision Staff
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 sm:-mx-10 px-4 sm:px-10">
          <div className="hidden md:block">
            <table className="w-full border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20 rounded-tl-xl">Staff Identity</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Contact Data</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Clearance</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Compensation</th>
                  <th className="text-left text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20">Home Station</th>
                  <th className="text-right text-white text-[11px] font-black uppercase tracking-[0.2em] p-6 border-b border-indigo-500/20 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="group hover:bg-slate-50 transition-all duration-300">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        {emp.photo_url ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm group-hover:scale-110 transition-transform border-2 border-white">
                            <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[14px] font-bold uppercase shadow-sm group-hover:scale-110 transition-transform">
                            {emp.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-[15px] text-slate-900 font-black tracking-tight uppercase">{emp.name}</div>
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-70">EMP ID {String(emp.id).padStart(4, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="text-[14px] text-slate-700 font-black tracking-tight">{emp.phone}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1 opacity-70">{emp.email || 'NO EMAIL LOGGED'}</div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col items-start gap-2">
                        <span className={cn(
                          "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm",
                          emp.role === 'superadmin' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : 
                          emp.role === 'manager' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                          {emp.role === 'superadmin' ? 'Super Admin' : (emp.role === 'fo' || emp.role === 'collector') ? 'Field Officer' : emp.role === 'branch_manager' ? 'Branch Manager' : emp.role === 'am' ? 'Area Manager' : emp.role === 'dm' ? 'Divisional Manager' : emp.role === 'manager' ? 'General Manager' : emp.role}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="text-[13px] text-slate-900 font-black leading-none uppercase">₹{formatAmount(emp.salary)}</div>
                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-70">Join: {emp.join_date ? new Date(emp.join_date).toLocaleDateString('en-GB') : 'N/A'}</div>
                    </td>
                    <td className="p-6">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                        {emp.branch_name || 'Global HQ'}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2 text-nowrap">
                        <button 
                          onClick={() => setShowDoc({ type: 'joining', employee: emp })}
                          className="w-10 h-10 flex items-center justify-center bg-white text-cyan-600 hover:text-white hover:bg-cyan-600 border border-cyan-100 rounded-xl transition-all shadow-sm"
                          title="Joining Letter"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setShowDoc({ type: 'icard', employee: emp })}
                          className="w-10 h-10 flex items-center justify-center bg-white text-violet-600 hover:text-white hover:bg-violet-600 border border-violet-100 rounded-xl transition-all shadow-sm"
                          title="ID Card"
                        >
                          <IdCard className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => navigate(`/employees/edit/${emp.id}`)}
                          className="w-10 h-10 flex items-center justify-center bg-white text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-100 rounded-xl transition-all shadow-sm"
                          title="Edit Info"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(emp.id)}
                          className="w-10 h-10 flex items-center justify-center bg-white text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 rounded-xl transition-all shadow-sm"
                          title="Delete Staff"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="block md:hidden space-y-4">
            {employees.length === 0 ? (
               <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs bg-slate-50 rounded-xl border border-slate-100">
                 No Staff Records Found
               </div>
            ) : (
              employees.map((emp) => (
                <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex justify-between items-start">
                    <div className="flex gap-4">
                      {emp.photo_url ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-white/20 shrink-0">
                          <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white text-[14px] font-bold uppercase shadow-sm shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-black uppercase tracking-tight text-lg leading-tight mb-1">{emp.name}</h3>
                        <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-lg border border-white/20 uppercase">EMP ID {String(emp.id).padStart(4, '0')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p>
                      <p className="text-sm font-black text-slate-900">{emp.phone}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase overflow-hidden text-ellipsis">{emp.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clearance</p>
                      <span className={cn(
                          "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border inline-block",
                          emp.role === 'superadmin' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : 
                          emp.role === 'manager' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}>
                         {emp.role === 'superadmin' ? 'Super Admin' : (emp.role === 'fo' || emp.role === 'collector') ? 'Field Officer' : emp.role === 'branch_manager' ? 'Branch Manager' : emp.role === 'am' ? 'Area Manager' : emp.role === 'dm' ? 'Divisional Manager' : emp.role === 'manager' ? 'General Manager' : emp.role}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Compensation</p>
                      <p className="text-sm font-black text-slate-900">₹{formatAmount(emp.salary)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Station</p>
                      <p className="text-xs font-bold text-slate-600 uppercase pt-1 line-clamp-2">{emp.branch_name || 'Global HQ'}</p>
                    </div>
                  </div>
                  
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                     <button 
                        onClick={() => setShowDoc({ type: 'joining', employee: emp })}
                        className="w-10 h-10 flex items-center justify-center bg-white text-cyan-600 hover:bg-cyan-50 border border-cyan-200 rounded-xl transition-all shadow-sm flex-1 max-w-[3rem]"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setShowDoc({ type: 'icard', employee: emp })}
                        className="w-10 h-10 flex items-center justify-center bg-white text-violet-600 hover:bg-violet-50 border border-violet-200 rounded-xl transition-all shadow-sm flex-1 max-w-[3rem]"
                      >
                        <IdCard className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => navigate(`/employees/edit/${emp.id}`)}
                        className="h-10 flex items-center justify-center bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 transition-all shadow-sm font-bold text-xs uppercase tracking-widest flex-1"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id)}
                        className="h-10 w-10 flex items-center justify-center bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl py-2 transition-all shadow-sm flex-1 max-w-[3rem]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDoc && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full max-w-5xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    {showDoc.type === 'joining' ? <FileText className="h-5 w-5" /> : <IdCard className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-indigo-700 tracking-tight uppercase">
                      {showDoc.type === 'joining' ? 'Joining Letter' : 'Staff ID Card'}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Document Preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleDownload()}
                    className="flex items-center justify-center p-3 sm:px-6 bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Download</span>
                  </button>
                  <button 
                    onClick={() => handlePrint()}
                    className="flex items-center justify-center p-3 sm:px-6 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                    title="Print Document"
                  >
                    <Printer className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Print</span>
                  </button>
                  <button 
                    onClick={() => setShowDoc(null)}
                    className="p-3 bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-2 sm:p-10 bg-slate-100/30 w-full flex justify-center items-start">
                <div className="[zoom:0.45] sm:[zoom:0.65] md:[zoom:0.8] lg:[zoom:1] transition-all transform origin-top md:scale-100">
                  <div ref={printRef} className="print-area bg-white shadow-xl shadow-slate-200/50">
                    {showDoc.type === 'joining' ? (
                      <JoiningLetter employee={showDoc.employee} />
                    ) : (
                      <IDCard employee={showDoc.employee} />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          .print-area {
            padding: 0 !important;
            margin: 0 !important;
          }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

function JoiningLetter({ employee }: { employee: any }) {
  const today = new Date().toLocaleDateString('en-GB');
  return (
    <div className="bg-white w-[210mm] min-h-[297mm] p-[30mm] shadow-sm text-slate-800 font-serif leading-relaxed">
      <div className="text-center mb-16 border-b-2 border-indigo-600 pb-10">
        <h1 className="text-4xl font-black text-indigo-700 tracking-tighter uppercase mb-2">ALJOOYA SUBIDHA SERVICES</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.4em] mb-4">Financial Empowerment • Growth • Trust</p>
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-sans font-bold uppercase tracking-wider">
          <span>{employee.branch_name ? `Branch: ${employee.branch_name}` : 'Corporate Headquarters'}</span>
          <span className="w-1.5 h-1.5 bg-indigo-200 rounded-full"></span>
          <span>Contact: {employee.phone}</span>
        </div>
      </div>

      <div className="flex justify-between items-start mb-12 font-sans">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference No</p>
          <p className="text-sm font-bold uppercase">AS/HR/JL/{new Date().getFullYear()}/{employee.id ? String(employee.id).padStart(4, '0') : ''}</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Issue</p>
          <p className="text-sm font-bold">{today}</p>
        </div>
      </div>

      <div className="mb-12 font-sans">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">To Candidate,</p>
        <h3 className="text-xl font-bold text-indigo-900 uppercase tracking-tight">{employee.name}</h3>
        <p className="text-sm text-slate-600 font-bold max-w-sm mt-1">{employee.address || 'Address not provided'}</p>
        <p className="text-sm font-black text-slate-800 mt-2">Mobile: {employee.phone}</p>
      </div>

      <div className="mb-10 text-center">
        <h2 className="text-2xl font-black uppercase text-indigo-700 tracking-widest border-y-2 border-slate-100 py-4">Appointment Letter</h2>
      </div>

      <div className="space-y-6 text-base text-slate-700">
        <p>Dear <span className="font-bold underline text-slate-900">{employee.name}</span>,</p>
        
        <p>
          Following our recent interview and selection process, we are delighted to offer you employment at <span className="font-bold">Aljooya Subidha Services</span>. 
          We believe your skills and experience will be a valuable asset to our growing microfinance family.
        </p>

        <div className="bg-slate-50 p-10 rounded-[32px] border-2 border-slate-100 font-sans grid grid-cols-2 gap-y-8 gap-x-12 my-10">
          <div>
            <p className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest mb-1">Position / Grade</p>
            <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{employee.role}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest mb-1">Monthly Gross (CTC)</p>
            <p className="text-2xl font-black text-indigo-700 tracking-tighter">₹{formatAmount(employee.salary)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest mb-1">Branch / Location</p>
            <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{employee.branch_name || 'Corp Headquarters'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest mb-1">Reporting Date</p>
            <p className="text-lg font-black text-slate-900">{employee.join_date ? new Date(employee.join_date).toLocaleDateString('en-GB') : today}</p>
          </div>
        </div>

        <p>
          In your role as a <span className="font-bold uppercase">{employee.role}</span>, you will be expected to maintain the highest standards of financial integrity and ethics. 
          Your duties will involve <span className="font-semibold">{employee.role === 'fo' ? 'ensuring timely collections and maintaining healthy client relations' : 'oversight of branch operations and staff coordination'}</span>.
        </p>

        <p>
          We look forward to having you on board and wish you a successful tenure with us. Please sign and return a copy of this letter as a token of your acceptance.
        </p>
      </div>

      <div className="mt-32 flex justify-between items-end font-sans">
        <div className="text-center w-64">
          <div className="h-px bg-slate-200 mb-4"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Employee Signature</p>
          <p className="text-[8px] font-bold text-slate-300 tracking-tighter uppercase">(Authorized by Candidate)</p>
        </div>
        <div className="text-center w-64">
           <div className="mb-6 h-12 flex items-center justify-center opacity-30">
              <span className="text-indigo-600 font-serif italic text-2xl font-black">Authorized</span>
           </div>
          <div className="h-px bg-slate-200 mb-4"></div>
          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em] mb-1">HR Operations</p>
          <p className="text-[8px] font-bold text-slate-400 tracking-tighter uppercase">ALJOOYA SUBIDHA SERVICES</p>
        </div>
      </div>
    </div>
  );
}

function IDCard({ employee }: { employee: any }) {
  return (
    <div className="flex flex-col items-center gap-12 py-10 scale-125 origin-top">
      {/* FRONT SIDE */}
      <div className="w-[54mm] h-[86mm] bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden relative font-sans flex flex-col group transition-all">
        {/* Animated Background */}
        <div className="absolute top-0 inset-x-0 h-[38mm] bg-pink-700">
           <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-pink-700 to-rose-950 opacity-90"></div>
           <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] [background-size:12px_12px]"></div>
        </div>

        {/* Company Header */}
        <div className="relative pt-6 px-4 text-center z-10">
          <h1 className="text-[10px] font-black text-white leading-none uppercase tracking-tighter mb-0.5">ALJOOYA SUBIDHA SERVICES</h1>
          <p className="text-[5px] text-pink-200 font-black uppercase tracking-[0.3em]">Corporate ID Card</p>
        </div>

        {/* Profile Section */}
        <div className="relative z-20 flex-1 flex flex-col items-center mt-4">
          <div className="w-[24mm] h-[24mm] shrink-0 rounded-[20px] bg-slate-50 border-4 border-white shadow-2xl overflow-hidden shadow-pink-900/20">
             {employee.photo_url ? (
               <img src={employee.photo_url} alt="Staff" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-pink-50">
                  <span className="text-4xl font-black text-pink-300 uppercase">{employee.name.charAt(0)}</span>
               </div>
             )}
          </div>

          <div className="mt-3 text-center px-4 w-full shrink-0">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5 break-words">{employee.name}</h2>
            <div className="inline-block px-3 py-1 bg-pink-500 rounded-full">
              <span className="text-[6.5px] font-black text-white uppercase tracking-widest">{employee.role}</span>
            </div>
          </div>

          <div className="mt-auto pt-2 grid grid-cols-2 gap-x-2 gap-y-2 px-6 w-full opacity-90 shrink-0 mb-3">
             <div className="space-y-0.5">
               <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest">EMP ID</p>
               <p className="text-[7px] font-black text-slate-800">{employee.id ? String(employee.id).padStart(4, '0') : 'NEW'}</p>
             </div>
             <div className="space-y-0.5 text-right flex flex-col items-end">
               <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest">BRANCH</p>
               <p className="text-[6.5px] font-black text-pink-600 uppercase leading-snug text-right max-w-[80px]">{employee.branch_name || 'HEAD OFF'}</p>
             </div>
             <div className="space-y-0.5 pt-2 border-t border-slate-50">
               <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest">DATE OF BIRTH</p>
               <p className="text-[7px] font-black text-slate-800">{employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString('en-GB') : 'N/A'}</p>
             </div>
             <div className="space-y-0.5 pt-2 border-t border-slate-50 text-right">
               <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest">EMERGENCY NO.</p>
               <p className="text-[7px] font-black text-slate-800">{employee.emergency_contact || employee.phone || 'N/A'}</p>
             </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="h-8 bg-slate-900 flex items-center justify-center px-4 relative">
           <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-pink-950"></div>
           <span className="relative z-10 text-[6px] font-black text-pink-200 uppercase tracking-[0.4em]">Official Employee Card</span>
        </div>
      </div>

      {/* BACK SIDE */}
      <div className="w-[54mm] h-[86mm] bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden relative font-sans flex flex-col p-6">
        <div className="text-center mb-6">
           <p className="text-[9px] font-black text-pink-600 uppercase tracking-widest border-b-2 border-pink-50 pb-2 mb-4">Instructions</p>
           <ul className="text-[6px] text-slate-500 font-bold text-left space-y-1.5 list-disc pl-4">
             <li>This card is non-transferable and should be worn at all times while on duty.</li>
             <li>Loss of this card should be reported to the HR department immediately.</li>
             <li>In case of finding, please return to the Corporate Headquarters.</li>
           </ul>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col items-center text-center">
           <p className="text-[7px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Company Details</p>
           <p className="text-[5.5px] text-slate-500 font-bold leading-relaxed mb-3 uppercase tracking-tighter px-2">
             ALJOOYA SUBIDHA SERVICES<br/>
             {employee.branch_name ? employee.branch_name + ' Branch' : 'Main Branch'}<br/>
             Contact: 9883672737
           </p>

           <div className="w-full flex flex-col items-center">
              <div className="w-24 h-6 border uppercase text-[8px] font-black flex items-center justify-center tracking-widest text-slate-300 mb-2 border-slate-100">SIGNATURE</div>
              <p className="text-[5px] font-black text-pink-500 uppercase tracking-widest">HR Manager</p>
           </div>
        </div>

        {/* Bottom Safety Strip */}
        <div className="absolute bottom-0 inset-x-0 h-1 flex">
           <div className="flex-1 bg-pink-500"></div>
           <div className="flex-1 bg-pink-400"></div>
           <div className="flex-1 bg-slate-900"></div>
        </div>
      </div>
    </div>
  );
}
