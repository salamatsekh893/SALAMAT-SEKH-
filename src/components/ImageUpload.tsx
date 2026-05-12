import { useState, useCallback, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, X, RotateCw, Check, Image as ImageIcon, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

interface ImageUploadProps {
  label: string;
  icon: any;
  color: string;
  onImageCaptured: (dataUrl: string) => void;
  preview?: string | null;
  compact?: boolean;
  stampLocation?: boolean;
  disableGallery?: boolean;
}

export default function ImageUpload({ label, icon: Icon, color, onImageCaptured, preview, compact, stampLocation, disableGallery }: ImageUploadProps) {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getStampingData = async (): Promise<{ address: string, lat: number, lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
             const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
             const osmData = await osmRes.json();
             if (osmData && osmData.display_name) {
               resolve({ address: osmData.display_name, lat, lng });
             } else {
               resolve({ address: `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng });
             }
          } catch (err) {
             resolve({ address: `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng });
          }
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: PixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Compress high quality limit maximum width to 800px
    const MAX_WIDTH = 800;
    const scale = pixelCrop.width > MAX_WIDTH ? MAX_WIDTH / pixelCrop.width : 1;

    canvas.width = pixelCrop.width * scale;
    canvas.height = pixelCrop.height * scale;

    ctx.scale(scale, scale);

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    if (stampLocation) {
       const stampInfo = await getStampingData();
       // we need native canvas width/height to draw correctly text sizes and bg
       const w = pixelCrop.width;
       const h = pixelCrop.height;
       
       const padding = w * 0.02;
       ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
       ctx.fillRect(0, h - (h * 0.15), w, h * 0.15);
       
       ctx.fillStyle = 'white';
       ctx.font = `bold ${w * 0.03}px sans-serif`;
       ctx.textBaseline = 'top';
       
       const now = new Date();
       const timeStr = now.toLocaleString('en-IN');
       ctx.fillText(`Timestamp: ${timeStr}`, padding, h - (h * 0.15) + padding);
       
       if (stampInfo) {
          ctx.font = `${w * 0.025}px sans-serif`;
          ctx.fillText(`Lat/Lng: ${stampInfo.lat.toFixed(6)}, ${stampInfo.lng.toFixed(6)}`, padding, h - (h * 0.15) + padding + (w * 0.035));
          
          // Truncate address if too long
          const maxAddrStr = stampInfo.address.length > 80 ? stampInfo.address.substring(0, 80) + '...' : stampInfo.address;
          ctx.fillText(`Loc: ${maxAddrStr}`, padding, h - (h * 0.15) + padding + (w * 0.065));
       }
    }

    return canvas.toDataURL('image/jpeg', 0.6); // 60% quality output
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setShowOptions(false);
        setShowCropper(true);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropDone = async () => {
    try {
      if (!completedCrop || !image) {
        setShowCropper(false);
        setImage(null);
        return;
      }
      
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(image, completedCrop);
      if (croppedImage) {
        onImageCaptured(croppedImage);
        setShowCropper(false);
        setImage(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraSelect = () => {
    document.getElementById(`upload-camera-${label.replace(/\s+/g, '-')}`)?.click();
  };

  const handleGallerySelect = () => {
    document.getElementById(`upload-gallery-${label.replace(/\s+/g, '-')}`)?.click();
  };

  return (
    <div className="w-full">
      <div 
        onClick={() => {
          if (disableGallery) {
             handleCameraSelect();
          } else {
             setShowOptions(true);
          }
        }}
        className={cn(
          "relative w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group/box",
          compact ? "h-20" : "h-32",
          preview ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-white hover:bg-slate-50"
        )}
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <>
            <Icon className={cn(compact ? "w-6 h-6 mb-1" : "w-8 h-8 mb-2", color)} />
            <span className={cn("font-bold uppercase tracking-widest text-slate-500", compact ? "text-[8px]" : "text-[10px]")}>{label}</span>
          </>
        )}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/box:opacity-100 flex items-center justify-center transition-opacity">
          <Camera className="text-white w-6 h-6" />
        </div>
      </div>
      
      <input 
        id={`upload-camera-${label.replace(/\s+/g, '-')}`}
        type="file" 
        accept="image/*" 
        capture
        onChange={handleFileChange}
        className="hidden"
      />
      <input 
        id={`upload-gallery-${label.replace(/\s+/g, '-')}`}
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Options Popup */}
      <AnimatePresence>
        {showOptions && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
             >
                <button 
                  onClick={() => setShowOptions(false)} 
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-base font-black uppercase tracking-widest mb-6 text-center text-slate-800">Select Source</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={handleCameraSelect}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all group"
                  >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900">Camera</span>
                  </button>

                  <button 
                    type="button"
                    onClick={handleGallerySelect}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all group"
                  >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">File / Gallery</span>
                  </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cropper Full Screen */}
      <AnimatePresence>
        {showCropper && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col h-[100dvh] w-screen"
          >
            <div className="p-4 flex items-center justify-between text-white bg-black/50 absolute top-0 left-0 right-0 z-10">
              <h3 className="text-sm font-black uppercase tracking-widest">Crop {label}</h3>
              <button type="button" onClick={() => setShowCropper(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-hidden w-full h-full pt-16 pb-24">
               {image && (
                 <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    className="max-w-full max-h-full h-full flex items-center justify-center"
                 >
                    <img 
                      ref={imgRef} 
                      src={image} 
                      alt="Crop" 
                      className="max-w-full max-h-full object-contain"
                      style={{ maxHeight: 'calc(100dvh - 160px)' }}
                    />
                 </ReactCrop>
               )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-slate-900 border-t border-white/10 z-10">
              <button
                type="button"
                onClick={handleCropDone}
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                {isProcessing ? 'Processing Stamp...' : 'Apply Free Crop'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
