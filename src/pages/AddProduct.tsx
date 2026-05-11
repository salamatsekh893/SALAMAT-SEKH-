import React, { useState } from 'react';
import { voiceFeedback } from '../lib/voice';
import { ArrowLeft, PackagePlus, Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    product_code: 'P' + Date.now().toString().slice(-6),
    price: '',
    stock_quantity: '0',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const text = await res.text();
        let err;
        try {
          err = JSON.parse(text);
        } catch {
           throw new Error('Failed to parse error response: ' + text.substring(0, 50));
        }
        throw new Error(err.error || 'Failed to add product');
      }
      
      voiceFeedback.success();

      
      navigate('/products');
    } catch (err: any) {
      voiceFeedback.error();

      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-10 pt-4">
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-3 text-indigo-600">
          <button onClick={() => navigate('/products')} className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shadow-sm">
            <PackagePlus className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">Add Product</h1>
        </div>
      </div>

      <div className="bg-white sm:rounded-[20px] shadow-lg border-y sm:border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4">
          <h2 className="text-white font-bold tracking-wide uppercase flex items-center gap-2 text-sm sm:text-base">
            <PackagePlus className="w-5 h-5"/> Product Details
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Product Name *</label>
              <input required type="text" value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] text-slate-700 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="e.g. Sewing Machine" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Product Code</label>
              <input type="text" value={formData.product_code} onChange={e => setFormData({...formData, product_code: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] font-mono text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Price (₹) *</label>
              <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] text-slate-700 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="0.00" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Initial Stock Quantity *</label>
              <input required type="number" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] text-slate-700 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 md:mb-2">Description</label>
              <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-[12px] text-slate-700 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="Add detailed product description here..."></textarea>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-3 border border-slate-300 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
