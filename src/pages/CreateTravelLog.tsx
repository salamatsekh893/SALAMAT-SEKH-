import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, Check, MapPin, Navigation, Plus, Target, Gauge, Flag, StopCircle, CarFront } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '../lib/api';
import ImageUpload from '../components/ImageUpload';
import { format } from 'date-fns';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function PlacesAutocomplete({ 
  onPlaceSelect, 
  placeholder,
  fallback = false,
  value
}: { 
  onPlaceSelect: (place: google.maps.places.PlaceResult | null, text: string) => void,
  placeholder: string,
  fallback?: boolean,
  value: string
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = fallback ? null : useMapsLibrary('places');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (fallback || !places || !inputRef.current) return;
    const options = {
      fields: ['geometry', 'name', 'formatted_address'],
    };
    const newAutocomplete = new places.Autocomplete(inputRef.current, options);
    setAutocomplete(newAutocomplete);
  }, [places, fallback]);

  useEffect(() => {
    if (!autocomplete) return;
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.name) {
        onPlaceSelect(place, place.name);
      }
    });
  }, [autocomplete]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => {
        onPlaceSelect(null, e.target.value);
      }}
      placeholder={placeholder}
      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
      required
    />
  );
}

function CreateTravelLogInner({ offline }: { offline?: boolean }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Start Form
  const [startMeter, setStartMeter] = useState('');
  const [startPhoto, setStartPhoto] = useState<string | null>(null);

  // Trip Entry Form
  const [showTripForm, setShowTripForm] = useState(false);
  const [tripForm, setTripForm] = useState({
    from_location: '',
    to_location: '',
    purpose: '',
    estimated_km: ''
  });

  // End Form
  const [showEndForm, setShowEndForm] = useState(false);
  const [endMeter, setEndMeter] = useState('');
  const [endPhoto, setEndPhoto] = useState<string | null>(null);
  const routes = offline ? null : useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);

  useEffect(() => {
    if (routes) {
      setDirectionsService(new routes.DirectionsService());
    }
  }, [routes]);

  const loadActiveSession = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/travel_v2/sessions/active');
      setActiveSession(res);
    } catch (err) {
      toast.error('Failed to load active session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveSession();
  }, []);

  const calculateDistance = async (from: string, to: string) => {
    if (!directionsService || !from || !to) return;
    try {
      const results = await directionsService.route({
        origin: from,
        destination: to,
        travelMode: google.maps.TravelMode.DRIVING,
      });
      if (results.routes.length > 0) {
        const route = results.routes[0];
        let totalDistance = 0;
        route.legs.forEach(leg => {
          totalDistance += leg.distance?.value || 0;
        });
        setTripForm(prev => ({ ...prev, estimated_km: (totalDistance / 1000).toFixed(2) }));
      }
    } catch (e) {
      console.log('Could not calculate distance:', e);
    }
  };

  const getStampingData = async (): Promise<{ lat: number, lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handleStartSession = async () => {
    if (!startPhoto) return toast.error('Start meter photo is required');
    if (!startMeter) return toast.error('Start meter value is required');

    setIsSubmitting(true);
    const loc = await getStampingData();

    try {
      await fetchWithAuth('/travel_v2/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          start_meter: startMeter,
          start_meter_image: startPhoto,
          start_lat: loc?.lat,
          start_lng: loc?.lng
        })
      });
      toast.success('Travel Session Started');
      await loadActiveSession();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTrip = async () => {
    if (!tripForm.from_location || !tripForm.to_location || !tripForm.purpose) {
      return toast.error('Please fill all required trip fields');
    }

    setIsSubmitting(true);
    try {
      await fetchWithAuth(`/travel_v2/sessions/${activeSession.id}/entries`, {
        method: 'POST',
        body: JSON.stringify(tripForm)
      });
      toast.success('Trip entry added');
      setTripForm({ from_location: '', to_location: '', purpose: '', estimated_km: '' });
      setShowTripForm(false);
      await loadActiveSession();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndSession = async () => {
    if (!endPhoto) return toast.error('End meter photo is required');
    if (!endMeter) return toast.error('End meter value is required');
    if (Number(endMeter) < Number(activeSession.start_meter)) {
      return toast.error('End meter cannot be less than start meter');
    }

    setIsSubmitting(true);
    const loc = await getStampingData();

    try {
      await fetchWithAuth(`/travel_v2/sessions/${activeSession.id}/end`, {
        method: 'PUT',
        body: JSON.stringify({
          end_meter: endMeter,
          end_meter_image: endPhoto,
          end_lat: loc?.lat,
          end_lng: loc?.lng
        })
      });
      toast.success('Travel Session Submitted for Approval');
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to end session');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Daily Travel Log</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
        </div>
      </div>

      {!activeSession ? (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-6 pb-5 border-b border-dashed border-slate-200">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                 <Flag className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                 <h2 className="text-lg font-bold text-slate-800">Start Travel Session</h2>
                 <p className="text-xs font-medium text-slate-500">Record your starting odometer to begin.</p>
              </div>
           </div>

           <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Camera className="w-3 h-3 text-indigo-400" />
                  Start Odometer Photo *
                </label>
                <ImageUpload 
                  label="Capture Start Odometer"
                  color="text-indigo-600"
                  icon={Camera}
                  onImageCaptured={setStartPhoto}
                  preview={startPhoto}
                  compact
                  stampLocation
                  disableGallery
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Gauge className="w-3 h-3 text-indigo-400" />
                  Start Odometer Reading *
                </label>
                <input 
                  type="number"
                  placeholder="e.g. 15420"
                  value={startMeter}
                  onChange={(e) => setStartMeter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700"
                />
             </div>

             <button 
               onClick={handleStartSession}
               disabled={isSubmitting || !startPhoto || !startMeter}
               className="w-full bg-indigo-600 text-white rounded-xl py-4 font-bold uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
             >
               <Flag className="w-4 h-4" />
               Start Session
             </button>
           </div>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="bg-indigo-600 rounded-3xl p-6 shadow-xl shadow-indigo-600/10 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
             
             <div className="flex justify-between items-start relative z-10">
               <div>
                  <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">Session Active</p>
                  <div className="flex items-end gap-3">
                     <span className="text-3xl font-black">{activeSession.start_meter}</span>
                     <span className="text-indigo-200 font-bold mb-1">KM (Start)</span>
                  </div>
               </div>
               {activeSession.start_meter_image && (
                 <img src={activeSession.start_meter_image} className="w-16 h-16 rounded-xl object-cover border-2 border-white/20 shadow-sm bg-white" />
               )}
             </div>
           </div>

           <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
             <div className="flex items-center justify-between mb-6 pb-5 border-b border-dashed border-slate-200">
                <div className="flex items-center flex-1 pr-4 gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                     <MapPin className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Trips Log</h2>
                    <p className="text-xs font-medium text-slate-500">Record your movements</p>
                  </div>
                </div>
                {!showEndForm && (
                <button 
                  onClick={() => setShowTripForm(!showTripForm)}
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl px-4 py-2 font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  Add Trip
                </button>
                )}
             </div>

             {showTripForm && (
               <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-200 space-y-4">
                 <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                   <Navigation className="w-4 h-4 text-emerald-500" />
                   New Trip Entry
                 </h3>
                 <div className="space-y-3 relative">
                    <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200 z-0"></div>
                    <div className="flex gap-3 relative z-10">
                      <div className="w-12 shrink-0 flex flex-col items-center pt-3">
                         <div className="w-3 h-3 rounded-full bg-emerald-500 border-[3px] border-emerald-100 shadow-sm z-10"></div>
                      </div>
                      <div className="flex-1 flex gap-2">
                         <PlacesAutocomplete 
                           fallback={offline}
                           value={tripForm.from_location}
                           placeholder="From Location"
                           onPlaceSelect={(_p, text) => {
                              setTripForm(prev => ({...prev, from_location: text}));
                              calculateDistance(text, tripForm.to_location);
                           }}
                         />
                         <button 
                           onClick={async () => {
                             const loc = await getStampingData();
                             if (loc) {
                               toast.success('Location fetched, reverse geocoding...');
                               try {
                                 const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`);
                                 const data = await res.json();
                                 setTripForm(prev => ({...prev, from_location: data.display_name}));
                               } catch (e) {
                                 setTripForm(prev => ({...prev, from_location: `${loc.lat}, ${loc.lng}`}));
                               }
                             } else {
                               toast.error('Location mapping failed.');
                             }
                           }}
                           className="p-3 bg-indigo-50 rounded-xl text-indigo-500 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                           title="Get Current Location"
                         >
                           <MapPin className="w-5 h-5" />
                         </button>
                      </div>
                    </div>
                    <div className="flex gap-3 relative z-10">
                      <div className="w-12 shrink-0 flex flex-col items-center pt-3">
                         <div className="w-3 h-3 rounded-full bg-rose-500 border-[3px] border-rose-100 shadow-sm z-10"></div>
                      </div>
                      <div className="flex-1 flex gap-2">
                         <PlacesAutocomplete 
                           fallback={offline}
                           value={tripForm.to_location}
                           placeholder="To Location"
                           onPlaceSelect={(_p, text) => {
                              setTripForm(prev => ({...prev, to_location: text}));
                              calculateDistance(tripForm.from_location, text);
                           }}
                         />
                         <button 
                           onClick={async () => {
                             const loc = await getStampingData();
                             if (loc) {
                               toast.success('Location fetched, reverse geocoding...');
                               try {
                                 const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`);
                                 const data = await res.json();
                                 setTripForm(prev => ({...prev, to_location: data.display_name}));
                                 calculateDistance(tripForm.from_location, data.display_name);
                               } catch (e) {
                                 const locStr = `${loc.lat}, ${loc.lng}`;
                                 setTripForm(prev => ({...prev, to_location: locStr}));
                                 calculateDistance(tripForm.from_location, locStr);
                               }
                             } else {
                               toast.error('Location mapping failed.');
                             }
                           }}
                           className="p-3 bg-rose-50 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-100 transition-colors shrink-0"
                           title="Get Current Location"
                         >
                           <MapPin className="w-5 h-5" />
                         </button>
                      </div>
                    </div>
                 </div>

                 <div className="pl-12 space-y-3 pt-2">
                   {offline && (
                     <input 
                       type="number"
                       placeholder="Estimated Distance (KM)"
                       value={tripForm.estimated_km}
                       onChange={e => setTripForm(prev => ({...prev, estimated_km: e.target.value}))}
                       className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                     />
                   )}
                   {!offline && tripForm.estimated_km && (
                     <p className="text-xs font-bold text-slate-500 px-1">Est. Route Distance: <span className="text-indigo-600">{tripForm.estimated_km} KM</span></p>
                   )}
                   <input 
                     placeholder="Purpose of visit"
                     value={tripForm.purpose}
                     onChange={e => setTripForm(prev => ({...prev, purpose: e.target.value}))}
                     className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                   />
                   <div className="flex gap-3 pt-2">
                     <button onClick={() => setShowTripForm(false)} className="flex-1 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                     <button onClick={handleAddTrip} disabled={isSubmitting} className="flex-1 py-3 text-xs font-bold text-white uppercase tracking-wider bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2">
                       <Check className="w-4 h-4" /> Save
                     </button>
                   </div>
                 </div>
               </div>
             )}

             {(!activeSession.entries || activeSession.entries.length === 0) && !showTripForm ? (
               <div className="text-center py-8">
                 <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                   <Target className="w-6 h-6 text-slate-400" />
                 </div>
                 <p className="text-sm font-bold text-slate-500">No trips recorded yet</p>
                 <p className="text-xs text-slate-400 mt-1">Add your trips as you travel.</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {activeSession.entries?.map((trip: any, idx: number) => (
                   <div key={trip.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-4">
                     <div className="w-8 shrink-0 flex flex-col items-center py-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mb-1 z-10"></div>
                        <div className="w-0.5 flex-1 bg-slate-200 my-0.5"></div>
                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 z-10"></div>
                     </div>
                     <div className="flex-1">
                        <p className="text-xs font-bold text-slate-700">{trip.from_location}</p>
                        <div className="h-6"></div>
                        <p className="text-xs font-bold text-slate-700">{trip.to_location}</p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {trip.estimated_km && (
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">{trip.estimated_km} KM</span>
                          )}
                          <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest truncate max-w-[200px]">{trip.purpose}</span>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>

           {!showEndForm ? (
             <button 
               onClick={() => setShowEndForm(true)}
               className="w-full bg-rose-600 text-white rounded-xl py-4 font-bold uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 flex items-center justify-center gap-2"
             >
               <StopCircle className="w-4 h-4" />
               End Travel Session
             </button>
           ) : (
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
               <div className="flex items-center gap-3 mb-6 pb-5 border-b border-dashed border-slate-200">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                     <StopCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                     <h2 className="text-lg font-bold text-slate-800">End Session</h2>
                     <p className="text-xs font-medium text-slate-500">Record ending odometer to submit.</p>
                  </div>
               </div>

               <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Camera className="w-3 h-3 text-rose-400" />
                      End Odometer Photo *
                    </label>
                    <ImageUpload 
                      label="Capture End Odometer"
                      color="text-rose-600"
                      icon={Camera}
                      onImageCaptured={setEndPhoto}
                      preview={endPhoto}
                      compact
                      stampLocation
                      disableGallery
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Gauge className="w-3 h-3 text-rose-400" />
                      End Odometer Reading *
                    </label>
                    <input 
                      type="number"
                      placeholder={`e.g. ${Number(activeSession.start_meter || 0) + 15}`}
                      value={endMeter}
                      onChange={(e) => setEndMeter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold text-slate-700"
                    />
                 </div>

                 <div className="flex gap-3">
                   <button 
                     onClick={() => setShowEndForm(false)}
                     className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-4 font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleEndSession}
                     disabled={isSubmitting || !endPhoto || !endMeter}
                     className="flex-[2] bg-rose-600 text-white rounded-xl py-4 font-bold uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                   >
                     Submit Session
                   </button>
                 </div>
               </div>
             </div>
           )}

        </div>
      )}

    </div>
  );
}

export default function CreateTravelLog() {
  if (!API_KEY) {
    return <CreateTravelLogInner offline={true} />;
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <CreateTravelLogInner />
    </APIProvider>
  );
}
