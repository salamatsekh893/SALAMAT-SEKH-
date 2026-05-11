import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface AadharScannerProps {
  onScan: (data: any) => void;
  onClose: () => void;
}

export default function AadharScanner({ onScan, onClose }: AadharScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('aadhar-reader');
    
    const config = { 
      fps: 30, 
      qrbox: { width: 280, height: 280 },
      aspectRatio: 1.0 
    };

    scannerRef.current.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        parseAadharData(decodedText);
      },
      (_errorMessage) => {
        // Just scanning...
      }
    ).catch(err => {
      setError('Could not start camera. Please ensure permissions are granted.');
      console.error(err);
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const parseAadharData = (text: string) => {
    try {
      // Basic check for Aadhar XML format or raw text
      if (text.includes('uid=') || text.includes('PrintLetterBarcodeData')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const root = xmlDoc.getElementsByTagName('PrintLetterBarcodeData')[0] || 
                     xmlDoc.documentElement;

        const data: any = {};
        for (let i = 0; i < root.attributes.length; i++) {
          const attr = root.attributes[i];
          data[attr.name] = attr.value;
        }

        // Standardize keys
        const standardized: any = {
          aadhar_no: data.uid,
          full_name: data.name,
          gender: data.gender === 'M' || data.gender === 'Male' ? 'Male' : data.gender === 'F' || data.gender === 'Female' ? 'Female' : 'Other',
          dob: data.dob,
          yob: data.yob,
          guardian_name: data.co?.replace(/^(S\/O|D\/O|W\/O|C\/O)[\s:]*/i, ''),
          village: data.vtc || data.loc,
          post_office: data.po,
          district: data.dist,
          state: data.state,
          pin_code: data.pc
        };

        // Handle DOB format
        if (standardized.dob) {
          if (standardized.dob.includes('/')) {
            const [d, m, y] = standardized.dob.split('/');
            standardized.dob = `${y}-${m}-${d}`;
          } else if (standardized.dob.includes('-') && standardized.dob.split('-')[0].length === 2) {
            const [d, m, y] = standardized.dob.split('-');
            standardized.dob = `${y}-${m}-${d}`;
          }
        } else if (standardized.yob) {
          standardized.dob = `${standardized.yob}-01-01`;
        }

        scannerRef.current?.stop().then(() => {
          onScan(standardized);
        });
      } else {
        // Fallback for raw text (just Aadhar number)
        const aadharNo = text.replace(/\D/g, '').substring(0, 12);
        if (aadharNo.length === 12) {
          scannerRef.current?.stop().then(() => {
            onScan({ aadhar_no: aadharNo });
          });
        }
      }
    } catch (e) {
      console.error('Parsing error', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black flex flex-col">
      <div className="p-4 flex items-center justify-between text-white border-b border-white/10">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-black uppercase tracking-widest">Aadhar Scanner</h3>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
          <XCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center p-6">
        <div id="aadhar-reader" className="w-full max-w-[400px] aspect-square rounded-3xl overflow-hidden border-2 border-indigo-500/50 shadow-[0_0_50px_rgba(79,70,229,0.2)] bg-slate-900" />
        
        {/* Scanning Overlay UI */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="w-[280px] h-[280px] border-2 border-dashed border-indigo-400/50 rounded-2xl relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
          </div>
          <p className="mt-8 text-indigo-200 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Align Aadhar QR in the box</p>
        </div>
      </div>

      {error && (
        <div className="p-4 mx-6 mb-6 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-200 text-[10px] font-bold uppercase text-center tracking-widest">
          {error}
        </div>
      )}

      <div className="p-8 pb-12 bg-slate-950 border-t border-white/5 text-center">
        <p className="text-slate-500 text-[11px] font-medium leading-relaxed max-w-[280px] mx-auto italic">
          Scans Aadhar QR code to auto-populate profile details like name, address, and gender.
        </p>
      </div>
    </div>
  );
}
