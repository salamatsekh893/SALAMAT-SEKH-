import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, CheckCircle, PenTool, X, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  savedSignature?: string | null;
}

export default function SignaturePad({ onSave, onClear, savedSignature }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);

  // Resize canvas when drawing modal is opened
  useEffect(() => {
    const resizeCanvas = () => {
      if (isDrawing && sigCanvas.current) {
        // Force resize to match container
        const canvas = sigCanvas.current.getCanvas();
        // save content
        const data = sigCanvas.current.toData();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        sigCanvas.current.fromData(data);
      }
    };

    if (isDrawing) {
      // Try to go fullscreen and lock orientation to landscape on mobile
      const lockLandscape = async () => {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          }
          const orientation = window.screen?.orientation as any;
          if (orientation?.lock) {
            await orientation.lock('landscape');
          }
        } catch (err) {
          console.warn('Fullscreen/Orientation lock not supported or denied', err);
        }
      };
      lockLandscape();

      // Small timeout to allow container to render
      setTimeout(resizeCanvas, 100);
      window.addEventListener('resize', resizeCanvas);
    } else {
      const unlock = async () => {
        try {
          if (window.screen?.orientation?.unlock) {
            window.screen.orientation.unlock();
          }
          if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen();
          }
        } catch (err) {
          console.warn('Exit fullscreen failed', err);
        }
      };
      unlock();
    }
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (isDrawing) {
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock();
        }
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
  }, [isDrawing]);


  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) return;
    const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
      setIsDrawing(false);
    }
  };

  const handleClearSaved = () => {
    onClear?.();
  };

  return (
    <>
      <div className="space-y-4">
        {savedSignature ? (
          <div className="relative border-2 border-dashed border-emerald-200 rounded-2xl overflow-hidden bg-emerald-50/50 aspect-video md:aspect-[4/1] flex flex-col items-center justify-center p-4">
            <img src={savedSignature} alt="Signature Preview" className="max-h-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-white/80 backdrop-blur-sm border-t border-emerald-100 flex justify-center gap-4">
               <button
                  type="button"
                  onClick={() => setIsDrawing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-200 transition-colors"
               >
                 <Edit2 className="w-3.5 h-3.5" />
                 Edit Sign
               </button>
               <button
                  type="button"
                  onClick={handleClearSaved}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-rose-200 transition-colors"
               >
                 <Eraser className="w-3.5 h-3.5" />
                 Remove
               </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsDrawing(true)}
            className="relative h-40 w-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-all group overflow-hidden"
          >
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
              <PenTool className="w-6 h-6" />
            </div>
            <span className="text-[12px] font-bold uppercase tracking-widest text-slate-600">Add Signature</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isDrawing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-slate-900 flex flex-col md:p-8 sm:p-4 p-0"
          >
            <div className="bg-white flex-1 md:rounded-[32px] sm:rounded-2xl rounded-none shadow-2xl flex flex-col overflow-hidden relative">
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Draw Signature</h3>
                    <p className="text-xs text-slate-500">Please sign inside the canvas area</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsDrawing(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Canvas Area - forcing landscape via flex-1 */}
              <div className="flex-1 relative bg-slate-50 p-4 md:p-8">
                <div className="absolute inset-4 md:inset-8 border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-white shadow-inner">
                  <SignatureCanvas
                    ref={sigCanvas}
                    onBegin={() => setIsEmpty(false)}
                    penColor="#1e293b"
                    canvasProps={{
                      className: "w-full h-full cursor-crosshair"
                    }}
                  />
                  {isEmpty && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      <span className="font-black text-4xl uppercase tracking-[0.2em] text-slate-400">Sign Here</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-white flex justify-between gap-4">
                <button
                  type="button"
                  onClick={clear}
                  className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-rose-100 text-rose-600 font-bold uppercase text-xs tracking-widest hover:bg-rose-50 hover:border-rose-200 transition-all"
                >
                  <Eraser className="w-4 h-4" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={isEmpty}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-md",
                    isEmpty 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200"
                  )}
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Signature
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
