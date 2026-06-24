import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  UserPlus, QrCode, MapPin, University, Camera, 
  Info, CheckCircle, AlertCircle, Loader2, Save
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchWithAuth } from '../lib/api';
import { voiceFeedback } from '../lib/voice';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ImageUpload from '../components/ImageUpload';
import SignaturePad from '../components/SignaturePad';
import AadharScanner from '../components/AadharScanner';
import { differenceInYears } from 'date-fns';
import confetti from 'canvas-confetti';

const memberSchema = z.object({
  aadhar_no: z.string()
    .min(12, 'আধার কার্ড ১২ সংখ্যার হওয়া আবশ্যক (Aadhar must be 12 digits)')
    .max(12, 'আধার কার্ড ১২ সংখ্যার বেশি হতে পারবে না (Aadhar can be max 12 digits)'),
  full_name: z.string()
    .min(3, 'কমপক্ষে ৩ অক্ষরের নাম লিখতে হবে (Full name must be at least 3 chars)'),
  guardian_name: z.string()
    .min(3, 'অভিভাবকের নাম আবশ্যক (Guardian name is required)'),
  guardian_type: z.string().min(1, 'অভিভাবকের ধরণ সিলেক্ট করুন (Guardian type required)'),
  marital_status: z.string().min(1, 'বৈবাহিক অবস্থা সিলেক্ট করুন'),
  gender: z.string().min(1, 'জেন্ডার বা লিঙ্গ সিলেক্ট করুন'),
  dob: z.string().min(1, 'জন্ম তারিখ আবশ্যক (DOB required)'),
  age: z.coerce.number().min(18, 'সদস্যের বয়স কমপক্ষে ১৮ বছর হওয়া লাগবে (Age must be >= 18)'),
  religion: z.string().optional().default('Islam'),
  category: z.string().optional().default('General'),
  education: z.string().optional().default('Secondary'),
  occupation: z.string().optional().default('Housewife'),
  monthly_income: z.coerce.number().min(500, 'মাসিক আয় কমপক্ষে ৫০০ হতে হবে'),
  family_members: z.coerce.number().min(1, 'পরিবারের সদস্য সংখ্যা কমপক্ষে ১ হতে হবে'),
  earning_members: z.coerce.number().min(1, 'উপার্জনকারী সদস্য সংখ্যা কমপক্ষে ১ হতে হবে'),
  house_type: z.string().optional().default('Owned'),
  residence_years: z.coerce.number().optional().nullable().default(1),
  mobile_no: z.string()
    .min(10, 'মোবাইল নম্বর কমপক্ষে ১০ ডিজিট হতে হবে')
    .max(10, 'মোবাইল নম্বর ১০ ডিজিটের বেশি হতে পারবে না'),
  alt_mobile_no: z.string().optional().nullable(),
  pin_code: z.string().min(6, 'পিনকোড আবশ্যক এবং ৬ সংখ্যার হতে হবে'),
  state: z.string().min(1, 'রাজ্যের নাম আবশ্যক'),
  district: z.string().min(1, 'জেলার নাম আবশ্যক'),
  post_office: z.string().min(1, 'পোস্ট অফিস সিলেক্ট করুন'),
  police_station: z.string().min(1, 'থানা আবশ্যক (Police Station required)'),
  village: z.string().min(1, 'গ্রাম/এলাকার নাম আবশ্যক (Village required)'),
  voter_id: z.string().optional().nullable(),
  pan_no: z.string().optional().nullable(),
  group_id: z.coerce.string().min(1, 'গ্রুপ সিলেক্ট করা আবশ্যক (Please select operation group JLG/SHG)'),
  mem_bank_ifsc: z.string().optional().nullable(),
  mem_bank_name: z.string().optional().nullable(),
  mem_bank_ac: z.string().optional().nullable(),
  nominee_name: z.string().optional().nullable(),
  nominee_relation: z.string().optional().nullable(),
  nominee_aadhar: z.string().optional().nullable(),
  nominee_dob: z.string().optional().nullable(),
  nominee_age: z.coerce.number().optional().nullable(),
  enable_portal_login: z.boolean().optional().default(true),
});

type MemberFormValues = z.infer<typeof memberSchema>;

export default function CreateMember() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [showScanner, setShowScanner] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [poList, setPoList] = useState<string[]>([]);
  const [poDropdownOpen, setPoDropdownOpen] = useState(false);
  const [images, setImages] = useState<Record<string, string | null>>({
    profile: null,
    house: null,
    aadhar_front: null,
    aadhar_back: null,
    voter_front: null,
    voter_back: null,
    signature: null,
    nominee_aadhar_front: null,
    nominee_aadhar_back: null
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      religion: 'Islam',
      category: 'General',
      education: 'Secondary',
      occupation: 'Housewife',
      guardian_type: 'Husband',
      marital_status: 'Married',
      gender: 'Female',
      house_type: 'Owned',
      state: 'West Bengal',
      enable_portal_login: true
    }
  });

  const dob = watch('dob');
  const nomineeDob = watch('nominee_dob');
  const pinCode = watch('pin_code');
  const ifscCode = watch('mem_bank_ifsc');

  useEffect(() => {
    if (dob && dob !== '0000-00-00') {
      const date = new Date(dob);
      if (!isNaN(date.getTime())) {
        const ageValue = differenceInYears(new Date(), date);
        setValue('age', isNaN(ageValue) ? 0 : ageValue);
      } else {
        setValue('age', 0);
      }
    }
  }, [dob, setValue]);

  useEffect(() => {
    if (nomineeDob && nomineeDob !== '0000-00-00') {
      const date = new Date(nomineeDob);
      if (!isNaN(date.getTime())) {
        const ageValue = differenceInYears(new Date(), date);
        setValue('nominee_age', isNaN(ageValue) ? 0 : ageValue);
      } else {
        setValue('nominee_age', 0);
      }
    }
  }, [nomineeDob, setValue]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await fetchWithAuth('/groups');
        setGroups(data);
      } catch (err: any) {
        console.error('Failed to fetch groups', err);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (pinCode?.length === 6) {
      fetch(`/api/pincode/${pinCode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0] && data[0].Status === 'Success') {
            const pos = data[0].PostOffice;
            if (pos && pos.length > 0) {
              setValue('state', pos[0].State);
              setValue('district', pos[0].District);
              setPoList(pos.map((p: any) => p.Name));
            }
          }
        })
        .catch(err => {
          console.error('Error auto-fetching pin code details:', err);
        });
    }
  }, [pinCode, setValue]);

  useEffect(() => {
    if (ifscCode?.length === 11) {
      fetch(`/api/ifsc/${ifscCode}`)
        .then(res => res.json())
        .then(data => {
          setValue('mem_bank_name', `${data.BANK}, ${data.BRANCH}`);
        })
        .catch(() => {});
    }
  }, [ifscCode, setValue]);

  useEffect(() => {
    if (id) {
      const fetchMember = async () => {
        try {
          const data = await fetchWithAuth(`/members/${id}`);
          // Ensure group_id is a string for the form
          if (data && data.group_id !== null && data.group_id !== undefined) {
            data.group_id = String(data.group_id);
          }
          // Fix dates for HTML date input
          if (data && data.dob) {
            if (data.dob.startsWith('0000-00-00')) {
              data.dob = '';
            } else {
              data.dob = data.dob.split('T')[0];
            }
          }
          if (data && data.nominee_dob) {
            if (data.nominee_dob.startsWith('0000-00-00')) {
              data.nominee_dob = '';
            } else {
              data.nominee_dob = data.nominee_dob.split('T')[0];
            }
          }
          if (data) {
            reset(data);
            setImages({
              profile: data.profile_image || null,
              house: data.house_image || null,
              aadhar_front: data.aadhar_image_front || null,
              aadhar_back: data.aadhar_image_back || null,
              voter_front: data.voter_image_front || null,
              voter_back: data.voter_image_back || null,
              signature: data.customer_signature || null,
              nominee_aadhar_front: data.nominee_aadhar_front || null,
              nominee_aadhar_back: data.nominee_aadhar_back || null
            });
          }
        } catch (err: any) {
          console.error('Failed to fetch member details');
        }
        setInitialLoading(false);
      };
      fetchMember();
    }
  }, [id, reset]);

  const handleScan = (data: any) => {
    if (data.aadhar_no) setValue('aadhar_no', data.aadhar_no);
    if (data.full_name) setValue('full_name', data.full_name);
    if (data.guardian_name) setValue('guardian_name', data.guardian_name);
    if (data.gender) setValue('gender', data.gender);
    if (data.dob) setValue('dob', data.dob);
    if (data.pin_code) setValue('pin_code', data.pin_code);
    if (data.district) setValue('district', data.district);
    if (data.state) setValue('state', data.state);
    if (data.village) setValue('village', data.village);
    if (data.post_office) setValue('post_office', data.post_office);
    setShowScanner(false);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        profile_image: images.profile,
        house_image: images.house,
        aadhar_image_front: images.aadhar_front,
        aadhar_image_back: images.aadhar_back,
        voter_image_front: images.voter_front,
        voter_image_back: images.voter_back,
        customer_signature: images.signature,
        nominee_aadhar_front: images.nominee_aadhar_front,
        nominee_aadhar_back: images.nominee_aadhar_back,
        status: 'Active'
      };

      const responseData = await fetchWithAuth(id ? `/members/${id}` : '/members', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#10b981', '#f59e0b']
      });

      voiceFeedback.success();

      navigate('/members');
    } catch (error: any) {
      voiceFeedback.error();
      const errorMsg = error?.message || 'Unknown error occurred during save';
      console.error('Save error message:', errorMsg);
      alert('Error saving member: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onValidationError = (errors: any) => {
    const findError = (errObj: any): { field: string, message: string } | null => {
      for (const key in errObj) {
        const error = errObj[key];
        if (error.message) {
          return { field: key, message: error.message };
        }
        if (typeof error === 'object' && error !== null) {
          const nested = findError(error);
          if (nested) return nested;
        }
      }
      return null;
    };

    const firstError = findError(errors);
    if (firstError) {
      // Beautify field name: aadhar_no -> Aadhar No
      const fieldName = firstError.field
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      alert(`Correction needed in [${fieldName}]: ${firstError.message}`);
    } else {
      alert('Correction needed: Please check all required fields.');
    }
  };

  if (initialLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-full lg:max-w-5xl mx-auto space-y-4 sm:space-y-8 pb-20">
      <div className="flex items-center justify-between px-4 sm:px-0 mt-4 sm:mt-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
              {id ? 'Update Profile' : 'New Member Registration'}
            </h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Beneficiary Onboarding Portal</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="space-y-4 sm:space-y-6">
        
        {/* Section 1: Basic Details */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white sm:rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent border-b border-slate-100 px-4 sm:px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-sky-500 text-white p-2.5 rounded-2xl shadow-md">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 tracking-wide uppercase">১. ব্যক্তিগত ও পরিচয় বিবরণী (1. Personal Details)</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Identification & Identity Credentials</p>
              </div>
            </div>
            {!id && (
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan Aadhar</span>
              </button>
            )}
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Aadhar Number */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Aadhar Card <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                {...register('aadhar_no')}
                maxLength={12}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all placeholder:text-slate-300 shadow-inner",
                  errors.aadhar_no ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
                placeholder="12 digit aadhar number"
              />
              {errors.aadhar_no?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.aadhar_no?.message)}</span>
                </div>
              )}
            </div>

            {/* Voter Card Number */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Voter Card No (ভোটার কার্ড নম্বর)
              </label>
              <input 
                {...register('voter_id')}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all placeholder:text-slate-300 shadow-inner uppercase",
                  errors.voter_id ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
                placeholder="VOTER CARD NUMBER"
              />
            </div>

            {/* Candidate Full Name */}
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Full Identity Name (সদস্যের নাম) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                {...register('full_name')}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner uppercase",
                  errors.full_name ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
                placeholder="AS PER GOVT RECORD"
              />
              {errors.full_name?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.full_name?.message)}</span>
                </div>
              )}
            </div>

            {/* Mobile Contact */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Mobile Contact <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                {...register('mobile_no')}
                maxLength={10}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.mobile_no ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
                placeholder="10 digit mobile number"
              />
              {errors.mobile_no?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.mobile_no?.message)}</span>
                </div>
              )}
            </div>

            {/* Portal Login Enable */}
            <div className="col-span-1 bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  {...register('enable_portal_login')}
                  className="w-4 h-4 text-amber-500 focus:ring-amber-500 border-slate-300 rounded"
                />
                <div>
                  <span className="block text-[11px] font-black text-slate-800 uppercase tracking-wide">
                    Enable Portal Login / কাস্টমার অ্যাপ লগইন
                  </span>
                  <span className="block text-[10px] font-bold text-slate-500 mt-0.5">
                    ID: <span className="text-indigo-600 font-black">{watch('mobile_no') || 'Mobile Number'}</span> | Pass: <span className="text-emerald-600 font-black">123456</span>
                  </span>
                </div>
              </label>
            </div>

            {/* Guardian Type */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Guardian Type <span className="text-rose-500 font-black">*</span>
              </label>
              <select 
                {...register('guardian_type')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
              >
                <option value="Husband">HUSBAND / স্বামী</option>
                <option value="Wife">WIFE / স্ত্রী</option>
                <option value="Father">FATHER / পিতা</option>
                <option value="Mother">MOTHER / মাতা</option>
                <option value="Son">SON / পুত্র</option>
                <option value="Daughter">DAUGHTER / কন্যা</option>
                <option value="Brother">BROTHER / ভাই</option>
                <option value="Other">OTHER / অন্যান্য</option>
              </select>
            </div>

            {/* Guardian Name */}
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Guardian Name (অভিভাবকের নাম) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                {...register('guardian_name')}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.guardian_name ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
                placeholder="GUARDIAN FULL NAME"
              />
              {errors.guardian_name?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.guardian_name?.message)}</span>
                </div>
              )}
            </div>

            {/* Gender */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Gender Identity <span className="text-rose-500 font-black">*</span>
              </label>
              <select 
                {...register('gender')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
              >
                <option value="Female">FEMALE / মহিলা</option>
                <option value="Male">MALE / পুরুষ</option>
                <option value="Other">OTHER / অন্যান্য</option>
              </select>
            </div>

            {/* Date Of Birth */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Date of Birth (জন্ম তারিখ) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                type="date"
                {...register('dob')}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.dob ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
              />
              {errors.dob?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.dob?.message)}</span>
                </div>
              )}
            </div>

            {/* Member Age */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Member Age (সদস্যের বয়স) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                readOnly
                {...register('age', { valueAsNumber: true })}
                className={cn(
                  "w-full bg-slate-100/50 text-slate-500 cursor-not-allowed border text-xs sm:text-[13px] font-bold rounded-2xl px-4 py-3.5 outline-none shadow-sm",
                  errors.age ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200"
                )}
                placeholder="AUTO CALCULATED"
              />
              {errors.age?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.age?.message)}</span>
                </div>
              )}
            </div>

            {/* Marital Status */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Marital Status <span className="text-rose-500 font-black">*</span>
              </label>
              <select 
                {...register('marital_status')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
              >
                <option value="Married">MARRIED / বিবাহিত</option>
                <option value="Unmarried">UNMARRIED / অবিবাহিত</option>
                <option value="Widow">WIDOW / বিধবা</option>
                <option value="Divorced">DIVORCED / বিবাহবিচ্ছেদ</option>
              </select>
            </div>

            {/* Category */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Category (শ্রেণী) <span className="text-rose-500 font-black">*</span>
              </label>
              <select 
                {...register('category')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
              >
                <option value="General">GENERAL</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="OBC-A">OBC-A</option>
                <option value="OBC-B">OBC-B</option>
              </select>
            </div>

            {/* Monthly Income */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Monthly Income (মাসিক আয়) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                type="number"
                {...register('monthly_income', { valueAsNumber: true })}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.monthly_income ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
                placeholder="MONTHLY INCOME (MIN 500)"
              />
              {errors.monthly_income?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.monthly_income?.message)}</span>
                </div>
              )}
            </div>

            {/* Occupation */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Occupation (পেশা) <span className="text-rose-500 font-black">*</span>
              </label>
              <select 
                {...register('occupation')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
              >
                <option value="Housewife">HOUSEWIFE / গৃহিনী</option>
                <option value="Business">BUSINESS / ব্যবসা</option>
                <option value="Service">SERVICE / চাকুরী</option>
                <option value="Agriculture">AGRICULTURE / কৃষি</option>
                <option value="Labour">LABOUR / শ্রমিক</option>
                <option value="Retired">RETIRED / অবসরপ্রাপ্ত</option>
                <option value="Student">STUDENT / ছাত্র</option>
                <option value="Other">OTHER / অন্যান্য</option>
              </select>
            </div>

            {/* Education */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Education (শিক্ষা) <span className="text-rose-500 font-black">*</span>
              </label>
              <select 
                {...register('education')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
              >
                <option value="Illiterate">ILLITERATE / অশিক্ষিত</option>
                <option value="Primary">PRIMARY / প্রাথমিক</option>
                <option value="Secondary">SECONDARY / মাধ্যমিক</option>
                <option value="Higher Secondary">HIGHER SECONDARY / উচ্চ মাধ্যমিক</option>
                <option value="Graduate">GRADUATE / স্নাতক</option>
                <option value="Post Graduate">POST GRADUATE / স্নাতকোত্তর</option>
              </select>
            </div>

            {/* Religion */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Religion (ধর্ম) <span className="text-rose-500 font-black">*</span>
              </label>
              <select 
                {...register('religion')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
              >
                <option value="Islam">ISLAM / ইসলাম</option>
                <option value="Hinduism">HINDUISM / হিন্দু</option>
                <option value="Christianity">CHRISTIANITY / খ্রিষ্টান</option>
                <option value="Sikhism">SIKHISM / শিখ</option>
                <option value="Buddhism">BUDDHISM / বৌদ্ধ</option>
                <option value="Other">OTHER / অন্যান্য</option>
              </select>
            </div>

            {/* Family Members */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Family Members (পরিবারের সদস্য) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                type="number"
                {...register('family_members', { valueAsNumber: true })}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.family_members ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
                placeholder="NO OF FAMILY MEMBERS"
              />
              {errors.family_members?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.family_members?.message)}</span>
                </div>
              )}
            </div>

            {/* Earning Members */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Earning Members (উপার্জনকারী সদস্য) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                type="number"
                {...register('earning_members', { valueAsNumber: true })}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.earning_members ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
                placeholder="NO OF EARNING MEMBERS"
              />
              {errors.earning_members?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.earning_members?.message)}</span>
                </div>
              )}
            </div>

            {/* House Type */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                House Type (বাড়ির ধরণ) <span className="text-rose-500 font-black">*</span>
              </label>
              <select 
                {...register('house_type')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
              >
                <option value="Owned">OWNED / নিজস্ব</option>
                <option value="Rented">RENTED / ভাড়া</option>
                <option value="Company">COMPANY / কোম্পানী</option>
                <option value="Other">OTHER / অন্যান্য</option>
              </select>
            </div>

            {/* Residence Years */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Residence Years (কত বছর বাস করছেন)
              </label>
              <input 
                type="number"
                {...register('residence_years', { valueAsNumber: true })}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.residence_years ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                )}
                placeholder="Ex. 5"
              />
            </div>
          </div>
        </motion.div>

        {/* Section 2: Address & JLG */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white sm:rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-slate-100 px-4 sm:px-6 py-5 flex items-center gap-3">
            <div className="bg-emerald-500 text-white p-2.5 rounded-2xl shadow-md">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-wide uppercase">২. স্থায়ী ঠিকানা ও সমিতি তথ্য (2. Address & Group)</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Residential & Area Allocation</p>
            </div>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Pin Code */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Pin Code (পিন কোড) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                {...register('pin_code')}
                maxLength={6}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.pin_code ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
                )}
                placeholder="6 DIGIT PIN"
              />
              {errors.pin_code?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.pin_code?.message)}</span>
                </div>
              )}
            </div>

            {/* State */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                State (রাজ্য) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                {...register('state')}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.state ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
                )}
              />
              {errors.state?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.state?.message)}</span>
                </div>
              )}
            </div>

            {/* District */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                District (জেলা) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                {...register('district')}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner",
                  errors.district ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
                )}
              />
              {errors.district?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.district?.message)}</span>
                </div>
              )}
            </div>

            {/* Post Office */}
            <div className="col-span-1 relative">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Post Office (পোস্ট অফিস) <span className="text-rose-500 font-black">*</span>
              </label>
              <div className="relative">
                <input 
                  {...register('post_office')}
                  onFocus={() => setPoDropdownOpen(true)}
                  className={cn(
                    "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner uppercase",
                    errors.post_office ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
                  )}
                  placeholder="TYPE OR SELECT PO"
                  autoComplete="off"
                />
                
                {poDropdownOpen && poList.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto bg-white border border-slate-250 shadow-2xl rounded-2xl p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {poList.map((po) => (
                      <button
                        key={po}
                        type="button"
                        onClick={() => {
                          setValue('post_office', po.toUpperCase());
                          setPoDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs sm:text-[13px] font-bold text-slate-800 rounded-xl transition-all hover:translate-x-1"
                      >
                        {po.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Invisible overlay to close dropdown on click outside */}
              {poDropdownOpen && (
                <div 
                  className="fixed inset-0 z-45" 
                  onClick={() => setPoDropdownOpen(false)} 
                />
              )}
              
              {errors.post_office?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.post_office?.message)}</span>
                </div>
              )}
            </div>

            {/* Police Station */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Police Station (থানা) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                {...register('police_station')}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner uppercase",
                  errors.police_station ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
                )}
                placeholder="Police Station Location"
              />
              {errors.police_station?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.police_station?.message)}</span>
                </div>
              )}
            </div>

            {/* Village / Para */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Village / Para (গ্রাম বা পাড়া) <span className="text-rose-500 font-black">*</span>
              </label>
              <input 
                {...register('village')}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner uppercase",
                  errors.village ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
                )}
                placeholder="Village / Para Name"
              />
              {errors.village?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.village?.message)}</span>
                </div>
              )}
            </div>

            {/* Operation Group */}
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Operation Group (সমিতি বা দল) <span className="text-rose-500 font-black">*</span>
              </label>
              <select 
                {...register('group_id')}
                disabled={!!id && ['fo'].includes(user?.role || '')}
                className={cn(
                  "w-full border text-xs sm:text-[13px] font-bold outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500",
                  errors.group_id ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200",
                  !!id && ["fo"].includes(user?.role || "") ? "bg-slate-100/50 text-slate-500 cursor-not-allowed border-slate-200" : "bg-slate-50 focus:bg-white text-slate-800"
                )}
              >
                <option value="">-- SELECT GROUP --</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.group_name} ({g.group_code})</option>)}
              </select>
              {errors.group_id?.message && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase ml-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{String(errors.group_id?.message)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Section 3: Bank & Nominee */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white sm:rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border-b border-slate-100 px-4 sm:px-6 py-5 flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2.5 rounded-2xl shadow-md">
              <University className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-wide uppercase">৩. ব্যাংক একাউন্ট ও নমিনির বিবরণী (3. Banking & Nominee)</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Financial & nominee inheritance</p>
            </div>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* IFSC Retrieve */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Bank IFSC (আইএফএসসি কোড)
              </label>
              <input 
                {...register('mem_bank_ifsc')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 uppercase"
                placeholder="IFSC CODE"
              />
            </div>

            {/* Bank Branch Identification */}
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Bank & Branch Name (ব্যাংক ও শাখা)
              </label>
              <input 
                readOnly
                {...register('mem_bank_name')}
                className="w-full bg-slate-100/50 text-slate-500 cursor-not-allowed border border-slate-200 text-xs sm:text-[13px] font-bold rounded-2xl px-4 py-3.5 outline-none shadow-sm"
                placeholder="AUTO IDENTIFIED"
              />
            </div>

            {/* Account Number */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Account Number (অ্যাকাউন্ট নম্বর)
              </label>
              <input 
                {...register('mem_bank_ac')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500"
                placeholder="SAVINGS A/C NO"
              />
            </div>

            {/* Nominee Full Name */}
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Nominee Full Name (নমিনির নাম)
              </label>
              <input 
                {...register('nominee_name')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 uppercase"
                placeholder="NOMINATE NAME"
              />
            </div>

            {/* Nominee Aadhar Number */}
            <div className="col-span-1 lg:col-span-2">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Nominee Aadhar (নমিনির আধার নম্বর)
              </label>
              <input 
                {...register('nominee_aadhar')}
                maxLength={12}
                className={cn(
                  "w-full bg-slate-50 focus:bg-white border text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all placeholder:text-slate-300 shadow-inner",
                  errors.nominee_aadhar ? "border-rose-500 ring-2 ring-rose-500/10" : "border-slate-200 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500"
                )}
                placeholder="12 digit aadhar number"
              />
            </div>

            {/* Inheritance Relation */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Nominee Relation (নমিনির সাথে সম্পর্ক)
              </label>
              <select 
                {...register('nominee_relation')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-sm focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500"
              >
                <option value="Husband">HUSBAND / স্বামী</option>
                <option value="Wife">WIFE / স্ত্রী</option>
                <option value="Son">SON / পুত্র</option>
                <option value="Daughter">DAUGHTER / কন্যা</option>
                <option value="Father">FATHER / পিতা</option>
                <option value="Mother">MOTHER / মাতা</option>
                <option value="Other">OTHER / অন্যান্য</option>
              </select>
            </div>

            {/* Nominee DOB */}
            <div className="col-span-1">
              <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">
                Nominee DOB (নমিনির জন্ম তারিখ)
              </label>
              <input 
                type="date"
                {...register('nominee_dob')}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 text-xs sm:text-[13px] font-bold text-slate-800 outline-none rounded-2xl px-4 py-3.5 transition-all shadow-inner focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Section 4: Documentation */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white sm:rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-slate-500/10 via-slate-500/5 to-transparent border-b border-slate-100 px-4 sm:px-6 py-5 flex items-center gap-3">
            <div className="bg-slate-700 text-white p-2.5 rounded-2xl shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-wide uppercase">৪. প্রয়োজনীয় নথি ও স্বাক্ষর আপলোড (4. Documentation)</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Verification Assets & Customer Authorizations</p>
            </div>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 sm:gap-6">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <ImageUpload 
                label="Profile" 
                icon={UserPlus} 
                color="text-indigo-600" 
                preview={images.profile}
                onImageCaptured={(url) => setImages(prev => ({ ...prev, profile: url }))} 
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <ImageUpload 
                label="House" 
                icon={MapPin} 
                color="text-emerald-600" 
                preview={images.house}
                onImageCaptured={(url) => setImages(prev => ({ ...prev, house: url }))} 
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <ImageUpload 
                label="Aadhar F" 
                icon={QrCode} 
                color="text-sky-600" 
                preview={images.aadhar_front}
                onImageCaptured={(url) => setImages(prev => ({ ...prev, aadhar_front: url }))} 
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <ImageUpload 
                label="Aadhar B" 
                icon={QrCode} 
                color="text-sky-600" 
                preview={images.aadhar_back}
                onImageCaptured={(url) => setImages(prev => ({ ...prev, aadhar_back: url }))} 
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <ImageUpload 
                label="Voter F" 
                icon={Info} 
                color="text-amber-600" 
                preview={images.voter_front}
                onImageCaptured={(url) => setImages(prev => ({ ...prev, voter_front: url }))} 
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <ImageUpload 
                label="Voter B" 
                icon={Info} 
                color="text-amber-600" 
                preview={images.voter_back}
                onImageCaptured={(url) => setImages(prev => ({ ...prev, voter_back: url }))} 
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <ImageUpload 
                label="Nominee Aadhar F" 
                icon={QrCode} 
                color="text-teal-600" 
                preview={images.nominee_aadhar_front}
                onImageCaptured={(url) => setImages(prev => ({ ...prev, nominee_aadhar_front: url }))} 
              />
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col items-center">
              <ImageUpload 
                label="Nominee Aadhar B" 
                icon={QrCode} 
                color="text-teal-600" 
                preview={images.nominee_aadhar_back}
                onImageCaptured={(url) => setImages(prev => ({ ...prev, nominee_aadhar_back: url }))} 
              />
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-8 pb-8 px-4 sm:px-6">
            <div className="flex flex-col items-center">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
                Authentication Signature (সদস্যের ডিজিটাল স্বাক্ষর)
              </label>
              <div className="w-full max-w-2xl bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner">
                <SignaturePad 
                  savedSignature={images.signature}
                  onSave={(url) => setImages(prev => ({ ...prev, signature: url }))} 
                  onClear={() => setImages(prev => ({ ...prev, signature: null }))}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating/Sticky Action Bar */}
        <div className="sticky bottom-4 z-40 bg-white/90 backdrop-blur-md border border-slate-200/80 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 mt-6">
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all border border-slate-200"
          >
            Abort / বাতিল করুন
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:max-w-xs bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                {id ? 'Commit Changes' : 'Confirm & Save / সংরক্ষণ করুন'}
              </>
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showScanner && (
          <AadharScanner 
            onScan={handleScan} 
            onClose={() => setShowScanner(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
