import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ArrowLeft, Navigation, Car, Save, Locate, Navigation2, Camera, User } from 'lucide-react';
import { fetchWithAuth } from '../lib/api';
import { formatAmount, cn } from '../lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ImageUpload from '../components/ImageUpload';

export default function CreateTravelLog() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    source: '',
    destination: '',
    distance_km: '',
    purpose: '',
    vehicle_type_id: '',
    rate_per_km_used: '0',
    image_url: ''
  });

  const [isManualRate, setIsManualRate] = useState(false);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const vehiclesRes = await fetchWithAuth('/travel/vehicles');
        setVehicles(vehiclesRes);
      } catch (err) {
        toast.error('Failed to load vehicle types');
      } finally {
        setLoading(false);
      }
    };
    loadVehicles();
  }, []);

  const handleVehicleChange = (vId: string) => {
    const selected = vehicles.find(v => v.id.toString() === vId);
    setFormData(prev => ({
      ...prev,
      vehicle_type_id: vId,
      rate_per_km_used: selected ? selected.rate_per_km.toString() : '0'
    }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Simple display of coordinates or reverse geocode if API available
        // For now, let's just set the source as Lat/Lng or try to get a name if we had a maps API
        setFormData(prev => ({
          ...prev,
          source: `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        }));
        setLocating(false);
        toast.success('Location updated');
      },
      (error) => {
        console.error(error);
        setLocating(false);
        toast.error('Failed to get location');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.source || !formData.destination || !formData.distance_km || !formData.vehicle_type_id) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    const amount = parseFloat(formData.distance_km) * parseFloat(formData.rate_per_km_used);

    try {
      await fetchWithAuth('/travel/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount
        })
      });
      toast.success('Travel log submitted successfully');
      navigate('/travel/log');
    } catch (err) {
      toast.error('Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-100 flex items-center h-16 px-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="ml-2">
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Record Movement</h1>
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none">New Entry Log</p>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* General Info */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
             <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                 <Car className="w-4 h-4 text-teal-600" />
               </div>
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Travel Basics</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-black text-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle Type</label>
                  <select
                    value={formData.vehicle_type_id}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-black text-slate-900 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Distance (KM)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.distance_km}
                      onChange={(e) => setFormData({...formData, distance_km: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-black text-slate-900 focus:ring-2 focus:ring-teal-500/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">KM</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate (Per KM)</label>
                    <button 
                      type="button"
                      onClick={() => setIsManualRate(!isManualRate)}
                      className={cn(
                        "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border transition-colors",
                        isManualRate ? "bg-amber-100 border-amber-200 text-amber-700" : "bg-slate-100 border-slate-200 text-slate-500"
                      )}
                    >
                      {isManualRate ? 'Manual' : 'System'}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      step="0.01"
                      readOnly={!isManualRate}
                      value={formData.rate_per_km_used}
                      onChange={(e) => setFormData({...formData, rate_per_km_used: e.target.value})}
                      className={cn(
                        "w-full border-none rounded-2xl px-4 py-3.5 text-sm font-black focus:ring-2",
                        isManualRate ? "bg-amber-50 text-amber-700 focus:ring-amber-500/20" : "bg-slate-50 text-slate-400 focus:ring-teal-500/20 cursor-not-allowed"
                      )}
                    />
                    <span className="absolute left-10 text-xs font-black text-slate-400">/ KM</span>
                  </div>
                </div>
             </div>
          </div>

          {/* Route Section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                   <Navigation2 className="w-4 h-4 text-indigo-600" />
                 </div>
                 <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Travel Route</h3>
               </div>
               <button 
                type="button"
                onClick={getCurrentLocation}
                disabled={locating}
                className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100 shadow-sm"
               >
                 <Locate className={cn("w-3 h-3", locating && "animate-spin")} />
                 {locating ? 'Locating...' : 'Get Location'}
               </button>
             </div>

             <div className="space-y-4 p-4 bg-slate-50/50 border border-slate-100 rounded-3xl">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Source (From)</label>
                  <input 
                    placeholder="Enter starting point"
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                    className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  />
                </div>

                <div className="flex items-center justify-center relative py-1">
                   <div className="absolute left-1/2 -translate-x-1/2 h-8 w-0.5 border-l-2 border-dotted border-slate-200" />
                   <div className="bg-white p-2 rounded-full border border-slate-100 shadow-sm relative z-1">
                     <Navigation className="w-3 h-3 text-slate-400 rotate-180" />
                   </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Destination (To)</label>
                  <input 
                    placeholder="Enter ending point"
                    value={formData.destination}
                    onChange={(e) => setFormData({...formData, destination: e.target.value})}
                    className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  />
                </div>
             </div>
          </div>

          {/* Photo & Purpose */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
             <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                 <Camera className="w-4 h-4 text-orange-600" />
               </div>
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Evidence & Purpose</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attachment (Photo)</label>
                  <ImageUpload 
                    label="Capture Odometer/Visit"
                    color="text-orange-500"
                    icon={Camera}
                    onImageCaptured={(url) => setFormData({...formData, image_url: url})}
                    preview={formData.image_url}
                  />
                </div>

                <div className="space-y-2 flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose of Visit</label>
                  <textarea 
                    rows={4}
                    placeholder="Describe the reason for this travel (e.g. Loan verification for customer X)..."
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    className="w-full h-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500/20 resize-none placeholder:text-slate-300"
                  />
                </div>
             </div>
          </div>

          {/* Summary Tooltip */}
          {formData.distance_km && formData.rate_per_km_used && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-teal-600 p-6 rounded-3xl text-white shadow-xl shadow-teal-100 flex justify-between items-center"
            >
               <div>
                 <p className="text-[9px] font-black text-teal-100 uppercase tracking-[0.3em] mb-1">Total Estimated Claim</p>
                 <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-black tracking-tighter">₹{formatAmount(parseFloat(formData.distance_km) * parseFloat(formData.rate_per_km_used))}</span>
                   <span className="text-[10px] font-bold text-teal-100 uppercase">({formData.distance_km} KM × ₹{formData.rate_per_km_used})</span>
                 </div>
               </div>
               <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                 <Save className="w-6 h-6" />
               </div>
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full py-5 rounded-3xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3",
              isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-900 text-white shadow-slate-200 hover:bg-black"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-b-transparent rounded-full animate-spin" />
                Submitting Log...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Confirm & Submit Log
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const Check = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
