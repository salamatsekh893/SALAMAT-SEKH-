import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, MapPin, Navigation, Clock, Play, Square, 
  Plus, CheckCircle, Info, Landmark, History, 
  ArrowRight, ShieldCheck, Gauge, TrendingUp,
  Map as MapIcon, LocateFixed, Bike, Wallet, CalendarDays, ArrowLeft
} from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount, cn } from '../lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ImageUpload from '../components/ImageUpload';
import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

export default function FieldTracking() {
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<any[]>([]);
  const [currentLocationName, setCurrentLocationName] = useState<string>('লোকেশন খোঁজা হচ্ছে...');
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [stats, setStats] = useState<any>({ today: { km: 0, earnings: 0 }, month: { km: 0, earnings: 0 } });

  // Form states
  const [odometerValue, setOdometerValue] = useState('');
  const [odometerImage, setOdometerImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Visit Log state
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitPurpose, setVisitPurpose] = useState('');
  const [visitImage, setVisitImage] = useState('');

  // End Day state
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [manualRate, setManualRate] = useState('12');
  const [gpsDistance, setGpsDistance] = useState(0);

  useEffect(() => {
    loadActiveShift();
    fetchCurrentLocation();
    fetchFuelRate();
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeShift) {
      loadVisits(activeShift.id);
    }
  }, [activeShift]);

  useEffect(() => {
    if (activeShift && visits.length >= 0) {
      calculateGpsTotal();
    }
  }, [visits, activeShift, coords]);

  const fetchStats = async () => {
    try {
      const data = await fetchWithAuth('/travel/stats');
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch stats");
    }
  };

  const fetchFuelRate = async () => {
    try {
      const res = await fetchWithAuth('/settings/fuel_rate');
      if (res.value) setManualRate(res.value);
    } catch (e) {
      console.error("Failed to fetch fuel rate");
    }
  };

  const calculateGpsTotal = () => {
    if (!activeShift) return;
    
    let total = 0;
    const points: {lat: number, lng: number}[] = [];
    
    if (activeShift.start_lat && activeShift.start_lng) {
      points.push({ lat: parseFloat(activeShift.start_lat), lng: parseFloat(activeShift.start_lng) });
    }
    
    visits.forEach(v => {
      if (v.latitude && v.longitude) {
        points.push({ lat: parseFloat(v.latitude), lng: parseFloat(v.longitude) });
      }
    });

    // Add current live location as potential end point if calculating live
    if (coords) {
      points.push(coords);
    }

    for (let i = 0; i < points.length - 1; i++) {
      total += calculateDistanceBetween(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng);
    }
    
    setGpsDistance(parseFloat(total.toFixed(2)));
  };

  const calculateDistanceBetween = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const loadActiveShift = async () => {
    try {
      const shift = await fetchWithAuth('/travel/shifts/active');
      setActiveShift(shift);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadVisits = async (shiftId: number) => {
    try {
      const data = await fetchWithAuth(`/travel/shifts/${shiftId}/visits`);
      setVisits(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        
        if (API_KEY) {
           try {
             const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`);
             const data = await res.json();
             if (data.status === 'OK' && data.results[0]) {
               setCurrentLocationName(data.results[0].formatted_address);
             } else {
               setCurrentLocationName(`Point (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
             }
           } catch (e) {
             setCurrentLocationName(`Point (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
           }
        } else {
          setCurrentLocationName(`Point (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        }
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
        setCurrentLocationName('Location permission denied');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleStartShift = async () => {
    if (!odometerValue || !odometerImage) {
      toast.error('Odometer reading and photo are required to start');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetchWithAuth('/travel/shifts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_odometer: odometerValue,
          start_image: odometerImage,
          date: format(new Date(), 'yyyy-MM-dd'),
          latitude: coords?.lat,
          longitude: coords?.lng
        })
      });
      toast.success('Work started. Have a safe journey!');
      loadActiveShift();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogVisit = async () => {
    if (!visitPurpose || !visitImage) {
      toast.error('Purpose and photo are required');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetchWithAuth('/travel/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: activeShift.id,
          location_name: currentLocationName,
          latitude: coords?.lat,
          longitude: coords?.lng,
          purpose: visitPurpose,
          image_url: visitImage
        })
      });
      toast.success('Visit logged successfully');
      setShowVisitModal(false);
      setVisitPurpose('');
      setVisitImage('');
      loadVisits(activeShift.id);
    } catch (err: any) {
      toast.error('Failed to log visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndShift = async () => {
    if (!odometerValue || !odometerImage) {
      toast.error('Final odometer reading and photo are required');
      return;
    }

    if (parseFloat(odometerValue) <= parseFloat(activeShift.start_odometer)) {
       toast.error('End odometer must be greater than start odometer');
       return;
    }

    setIsSubmitting(true);
    try {
      await fetchWithAuth(`/travel/shifts/${activeShift.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          end_odometer: odometerValue,
          end_image: odometerImage,
          rate_per_km: manualRate,
          remarks: `Daily field tracking with ${visits.length} visits`,
          latitude: coords?.lat,
          longitude: coords?.lng,
          gps_km: gpsDistance
        })
      });
      toast.success('Day ended and submitted for approval');
      setActiveShift(null);
      setVisits([]);
      setOdometerValue('');
      setOdometerImage('');
      setShowEndDayModal(false);
      fetchStats();
      navigate('/travel/log');
    } catch (err: any) {
      toast.error('Failed to end shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Dark Header */}
      <div className="bg-[#1a1a1a] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/10 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
              <Landmark className="w-5 h-5 text-black" />
            </div>
            <span className="font-black text-sm uppercase tracking-tight">Aljooya Subidha</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(), 'dd MMM, yyyy')}</span>
           <span className="text-[8px] font-medium text-amber-400 uppercase tracking-widest">Active Session</span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Title Section */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Bike className="w-6 h-6 text-indigo-600" />
             </div>
             <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">দৈনিক ট্রাভেল লগ</h2>
           </div>
           <div className="bg-[#1a1a1a] text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
             {format(new Date(), 'dd MMM, yyyy')}
           </div>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-2 gap-4">
           {/* Today's Earning */}
           <div className="bg-white rounded-[24px] p-5 shadow-sm border border-indigo-100 flex flex-col items-center text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">আজকের আয়</p>
              <h3 className="text-2xl font-black text-indigo-600 tracking-tight">₹{formatAmount(stats.today.earnings)}</h3>
              <div className="mt-4 flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full">
                 <Navigation className="w-3 h-3 text-indigo-600" />
                 <span className="text-[10px] font-black text-indigo-600">{stats.today.km} KM</span>
              </div>
           </div>

           {/* Month's Earning */}
           <div className="bg-white rounded-[24px] p-5 shadow-sm border border-green-100 flex flex-col items-center text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">এই মাসে ({format(new Date(), 'MMM')})</p>
              <h3 className="text-2xl font-black text-green-600 tracking-tight">₹{formatAmount(stats.month.earnings)}</h3>
              <div className="mt-4 flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full">
                 <Navigation className="w-3 h-3 text-green-600" />
                 <span className="text-[10px] font-black text-green-600">{stats.month.km} KM</span>
              </div>
           </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100 space-y-6">
           {/* Start/Status Button */}
           {!activeShift ? (
             <button 
               disabled={isSubmitting}
               onClick={handleStartShift}
               className="w-full py-5 bg-[#e1faf2] text-[#008f5d] rounded-2xl font-black uppercase text-sm tracking-tight flex items-center justify-center gap-3 border border-[#008f5d]/20 shadow-sm active:scale-95 transition-transform"
             >
               <div className="bg-[#008f5d] rounded-full p-1">
                 <Play className="w-3 h-3 text-white fill-current" />
               </div>
               নতুন যাত্রা শুরু করুন (আউট)
             </button>
           ) : (
             <div className="flex gap-2">
               <button 
                 onClick={() => setShowVisitModal(true)}
                 className="flex-1 py-5 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-tight flex items-center justify-center gap-2 border border-indigo-100 active:scale-95"
               >
                 <MapIcon className="w-4 h-4" />
                 স্টপ লগ করুন
               </button>
               <button 
                 onClick={() => {
                   setOdometerValue('');
                   setOdometerImage('');
                   setShowEndDayModal(true);
                 }}
                 className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[10px] tracking-tight flex items-center justify-center gap-2 border border-rose-100 active:scale-95"
               >
                 <Square className="w-4 h-4 fill-current" />
                 দিন শেষ করুন
               </button>
             </div>
           )}

           {/* Current Location Display */}
           <div className="bg-[#f2fff9] p-3 rounded-xl border border-[#008f5d]/10 flex items-center justify-center gap-2 mx-auto max-w-[90%]">
              <MapPin className="w-4 h-4 text-[#008f5d] shrink-0" />
              <p className="text-[10px] font-bold text-[#008f5d] truncate leading-none">{currentLocationName}</p>
           </div>

           {/* Input Section */}
           <div className="space-y-6">
              {!activeShift || showEndDayModal ? (
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">বর্তমান মিটার রিডিং (KM) *</label>
                    <input 
                      type="number"
                      placeholder="e.g. 15420"
                      value={odometerValue}
                      onChange={(e) => setOdometerValue(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-100 rounded-xl px-4 py-4 text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-300"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">বাইকের মিটারের ছবি তুলুন *</label>
                    <ImageUpload 
                      label="ক্যামেরা খুলতে ট্যাপ করুন"
                      color="text-indigo-600"
                      icon={Camera}
                      onImageCaptured={setOdometerImage}
                      preview={odometerImage}
                      compact
                    />
                 </div>
              </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-6 text-center border border-dashed border-slate-200">
                   <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-indigo-600" />
                   </div>
                   <h4 className="text-sm font-black text-slate-900 uppercase">ট্র্যাকিং চলছে</h4>
                   <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">শিফট শুরু হয়েছে {format(new Date(activeShift.start_time), 'hh:mm a')}</p>
                   
                   <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-xl shadow-sm">
                         <p className="text-[8px] font-black text-slate-400 uppercase">শুরু রিডিং</p>
                         <p className="text-sm font-black text-slate-800">{activeShift.start_odometer} KM</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl shadow-sm">
                         <p className="text-[8px] font-black text-slate-400 uppercase">স্টপ</p>
                         <p className="text-sm font-black text-slate-800">{visits.length}</p>
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* Verification Alert */}
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
           <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
           <div>
              <p className="text-[10px] font-black text-blue-900 uppercase tracking-tight">ভেরিফিকেশন প্রোটোকল</p>
              <p className="text-[9px] font-medium text-blue-700 leading-relaxed mt-0.5">
                লোকেশন ট্র্যাকিং চলছে। GPS এবং ইন্টারনেট চালু রাখুন। সাইট ভিজিটের পরিষ্কার ছবি দিতে হবে।
              </p>
           </div>
        </div>
      </div>

      {/* Visit Dialog */}
      <AnimatePresence>
        {showVisitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVisitModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Punch Visit</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Evidence Required</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Purpose / Customer Name</label>
                  <input 
                    placeholder="Enter visit details..."
                    value={visitPurpose}
                    onChange={(e) => setVisitPurpose(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Site Photo</label>
                  <ImageUpload 
                    label="Camera: Visit Proof"
                    color="text-indigo-600"
                    icon={Camera}
                    onImageCaptured={setVisitImage}
                    preview={visitImage}
                    compact
                  />
                </div>

                <button 
                  onClick={handleLogVisit}
                  disabled={isSubmitting}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-sm tracking-[0.1em] shadow-xl shadow-indigo-100 mt-4 h-16 flex items-center justify-center active:scale-95"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Log Visit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showEndDayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEndDayModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 space-y-6"
            >
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                   <Square className="w-5 h-5 text-rose-600 fill-current" />
                 </div>
                 <div>
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Closing Shift</h3>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Final Odometer & Claim</p>
                 </div>
               </div>

               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Final Meter Reading (KM) *</label>
                     <input 
                       type="number"
                       placeholder="e.g. 15500"
                       value={odometerValue}
                       onChange={(e) => setOdometerValue(e.target.value)}
                       className="w-full bg-[#f8fafc] border border-slate-100 rounded-xl px-4 py-4 text-sm font-black text-slate-900 focus:ring-2 focus:ring-rose-500/10 placeholder:text-slate-300"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Take Photo of Bike Meter *</label>
                     <ImageUpload 
                       label="Tap to Open Camera"
                       color="text-rose-600"
                       icon={Camera}
                       onImageCaptured={setOdometerImage}
                       preview={odometerImage}
                       compact
                     />
                  </div>

                  {odometerValue && activeShift && parseFloat(odometerValue) > parseFloat(activeShift.start_odometer) && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                       <div className="flex justify-between items-center">
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase">GPS Distance</p>
                             <p className="text-xs font-black text-blue-600">{gpsDistance} KM</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[8px] font-black text-slate-400 uppercase">Claim Amount</p>
                             <p className="text-xs font-black text-indigo-600">₹{formatAmount((parseFloat(odometerValue) - parseFloat(activeShift.start_odometer)) * parseFloat(manualRate))}</p>
                          </div>
                       </div>
                    </div>
                  )}

                  <button 
                    onClick={handleEndShift}
                    disabled={isSubmitting}
                    className="w-full py-5 bg-slate-900 text-white rounded-[20px] font-black uppercase text-sm tracking-[0.1em] shadow-xl mt-4 h-16 flex items-center justify-center active:scale-95"
                  >
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm End Day'}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}