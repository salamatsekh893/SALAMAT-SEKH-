import { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, X, RotateCw, Check, Image as ImageIcon, Smartphone, Info } from 'lucide-react';
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
  const [aspect, setAspect] = useState<number | undefined>(undefined);

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (!imgRef.current) return;
    
    const { width, height } = imgRef.current;
    
    if (newAspect === undefined) {
      const initialCrop: Crop = {
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0
      };
      setCrop(initialCrop);
    } else {
      let cropWidth = 100;
      let cropHeight = 100;
      const imageAspect = width / height;
      
      if (newAspect > imageAspect) {
        cropWidth = 100;
        cropHeight = (100 / newAspect) * imageAspect;
      } else {
        cropHeight = 100;
        cropWidth = (100 * newAspect) / imageAspect;
      }
      
      const newCrop: Crop = {
        unit: '%',
        width: cropWidth,
        height: cropHeight,
        x: (100 - cropWidth) / 2,
        y: (100 - cropHeight) / 2,
      };
      setCrop(newCrop);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const defaultPixelCrop: PixelCrop = {
      unit: 'px',
      x: 0,
      y: 0,
      width: width,
      height: height
    };
    setCompletedCrop(defaultPixelCrop);

    const defaultCrop: Crop = {
      unit: '%',
      width: 100,
      height: 100,
      x: 0,
      y: 0
    };
    setCrop(defaultCrop);
    setAspect(undefined); // Reset aspect ratio selector on load
  };

  // Modern HTML5 Inline Camera States
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
      if (!image) {
        setShowCropper(false);
        setImage(null);
        return;
      }
      
      let pixelCrop = completedCrop;
      if ((!pixelCrop || pixelCrop.width === 0 || pixelCrop.height === 0) && imgRef.current) {
        const { width, height } = imgRef.current;
        pixelCrop = {
          unit: 'px',
          x: 0,
          y: 0,
          width: width,
          height: height
        };
      }
      
      if (!pixelCrop || pixelCrop.width === 0 || pixelCrop.height === 0) {
        setShowCropper(false);
        setImage(null);
        return;
      }
      
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(image, pixelCrop);
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

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowLiveCamera(false);
  }, [stream]);

  // Clean stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Start inline HTML5 camera preview
  const startCamera = async (mode: 'environment' | 'user' = 'environment') => {
    setCameraLoading(true);
    setCameraError(null);
    setShowLiveCamera(true);
    setCameraFacingMode(mode);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      // Delay slightly to ensure video element is mounted in the DOM
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      }, 150);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("ইনলাইন ক্যামেরা চালু করার সময় ত্রুটি হয়েছে। অনুগ্রহ করে ব্রাউজারের ক্যামেরা পারমিশন চেক করুন অথবা সরাসরি ফাইল সিলেক্ট করুন।");
    } finally {
      setCameraLoading(false);
    }
  };

  // Toggle front/back camera direction
  const toggleCameraDirection = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Snapshot from video to canvas
  const captureSnapshot = () => {
    const video = videoRef.current;
    if (video) {
       try {
         const canvas = document.createElement('canvas');
         canvas.width = video.videoWidth || 640;
         canvas.height = video.videoHeight || 480;
         const ctx = canvas.getContext('2d');
         if (ctx) {
           ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
           const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
           setImage(dataUrl);
           setShowOptions(false);
           setShowCropper(true);
           stopCamera();
         }
       } catch (err) {
         console.error("Snapshot error:", err);
       }
    }
  };

  const handleCameraSelect = () => {
    setShowOptions(false);
    startCamera('environment');
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
          <img src={preview} alt={label} className="w-full h-full object-contain bg-slate-50/50 p-1" />
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
      
      {/* Fallback hidden file uploaders (no heavy "capture" parameter to avoid Android OS crashes) */}
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
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900">Live Camera</span>
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

      {/* Inline HTML5 Live Camera System (No Native Intent/Crash Safe) */}
      <AnimatePresence>
         {showLiveCamera && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[110] bg-slate-950 flex flex-col h-[100dvh] w-screen overflow-hidden"
           >
              {/* Header */}
              <div className="p-5 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                   <h3 className="text-xs font-bold uppercase tracking-widest drop-shadow-md">লাইভ: {label}</h3>
                </div>
                <button 
                  type="button" 
                  onClick={stopCamera} 
                  className="p-2.5 bg-black/40 hover:bg-black/60 rounded-full transition-all border border-white/10"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Viewport */}
              <div className="absolute inset-0 w-full h-full z-0 bg-neutral-950">
                 {cameraLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white z-10 bg-neutral-950/80">
                       <span className="w-10 h-10 border-4 border-indigo-500 border-t-white rounded-full animate-spin" />
                       <span className="text-xs font-bold tracking-widest text-slate-300">ক্যামেরা চালু হচ্ছে...</span>
                    </div>
                 )}

                 {cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4 text-white z-10 bg-neutral-950">
                       <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mb-2">
                          <Info className="w-6 h-6" />
                       </div>
                       <p className="text-sm font-bold leading-relaxed">{cameraError}</p>
                       <button 
                         type="button"
                         onClick={handleGallerySelect}
                         className="px-6 py-3 bg-indigo-600 rounded-xl font-bold uppercase text-xs tracking-widest text-white shadow-lg active:scale-95 transition-all"
                       >
                          গ্যালারি থেকে ফাইল সিলেক্ট করুন
                       </button>
                    </div>
                 ) : (
                    <video 
                      ref={videoRef}
                      playsInline
                      autoPlay
                      muted
                      className="w-full h-full object-cover"
                    />
                 )}
              </div>

              {/* Shutter panel at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex items-center justify-between z-20 text-white px-10">
                 <button 
                   type="button"
                   onClick={toggleCameraDirection}
                   disabled={cameraLoading || !!cameraError}
                   className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all disabled:opacity-30 active:scale-90"
                   title="Switch Camera Direction"
                 >
                    <RotateCw className="w-5 h-5" />
                 </button>

                 <button 
                   type="button"
                   onClick={captureSnapshot}
                   disabled={cameraLoading || !!cameraError}
                   className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/30 active:scale-90 transition-all disabled:opacity-30 disabled:scale-100"
                   title="Capture Photo"
                 >
                    <div className="w-11 h-11 rounded-full bg-white transition-all shadow-md active:bg-slate-100" />
                 </button>

                 <button 
                   type="button"
                   onClick={() => {
                      stopCamera();
                      handleGallerySelect();
                   }}
                   className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-90"
                   title="Browse Files"
                 >
                    <ImageIcon className="w-5 h-5 text-emerald-400" />
                 </button>
              </div>
           </motion.div>
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
            className="fixed inset-0 z-[120] bg-zinc-950 flex flex-col h-[100dvh] w-screen select-none overflow-hidden text-white"
          >
            {/* Top Navigation Bar resembling Android Toolbar */}
            <div className="p-4 flex items-center justify-between bg-zinc-900/90 border-b border-zinc-800 absolute top-0 left-0 right-0 z-10 backdrop-blur-md">
              <button 
                type="button" 
                onClick={() => {
                  setShowCropper(false);
                  setImage(null);
                }} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5 text-zinc-300" />
              </button>
              <div className="text-center">
                <h3 className="text-sm font-bold tracking-wide">ছবি রিসাইজ ও ক্রপ করুন</h3>
                <p className="text-[10px] text-zinc-400">Android Style Fast Document Scanner</p>
              </div>
              <div className="w-10 h-10 flex items-center justify-center text-zinc-400 bg-zinc-800/40 rounded-full text-xs font-bold font-mono">
                HD
              </div>
            </div>
            
            {/* Viewport Canvas area */}
            <div className="flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden w-full h-full pt-20 pb-44 px-4">
               {image && (
                 <ReactCrop
                    crop={crop}
                    aspect={aspect}
                    onChange={(c, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    className="max-w-full max-h-full flex items-center justify-center"
                 >
                    <img 
                      ref={imgRef} 
                      src={image} 
                      alt="Crop" 
                      onLoad={onImageLoad}
                      className="max-w-full max-h-full object-contain"
                      style={{ maxHeight: 'calc(100dvh - 240px)' }}
                    />
                 </ReactCrop>
               )}
            </div>

            {/* Bottom Panel containing Android Lightroom style presets and Primary Action Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-zinc-800 z-10 flex flex-col gap-4">
              
              {/* Preset Aspect Ratios Slider */}
              <div className="w-full">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest text-center mb-2.5 font-bold">ক্রপ সাইজ সিলেক্ট করুন (Aspect Ratio)</p>
                <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                  <button
                    type="button"
                    onClick={() => handleAspectChange(undefined)}
                    className={cn(
                      "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all border shrink-0",
                      aspect === undefined 
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750"
                    )}
                  >
                    মুক্ত ক্রপ (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAspectChange(1)}
                    className={cn(
                      "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all border shrink-0",
                      aspect === 1 
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750"
                    )}
                  >
                    প্রোফাইল (1:1)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAspectChange(3 / 4)}
                    className={cn(
                      "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all border shrink-0",
                      aspect === (3 / 4) 
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750"
                    )}
                  >
                    ডকুমেন্ট (3:4)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAspectChange(4 / 3)}
                    className={cn(
                      "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all border shrink-0",
                      aspect === (4 / 3) 
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750"
                    )}
                  >
                    আইডি কার্ড (4:3)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAspectChange(1 / 1.414)}
                    className={cn(
                      "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all border shrink-0",
                      Math.abs((aspect || 0) - (1 / 1.414)) < 0.01
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750"
                    )}
                  >
                    A4 কাগজ (1:√2)
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleCropDone}
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl font-bold uppercase text-xs tracking-[0.15em] shadow-xl shadow-emerald-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <Check className="w-5 h-5 text-white" />
                {isProcessing ? 'প্রসেসিং হচ্ছে...' : 'ক্রপ সম্পন্ন করুন (Apply)'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

