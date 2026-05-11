import React, { useState, useEffect } from 'react';
import { voiceFeedback } from '../lib/voice';
import { Plus, Search, ShoppingCart, Loader2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatAmount } from '../lib/utils';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Network response was not ok');
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setProducts(data);
      } catch (err) {
        console.error("Failed to parse JSON:", text.substring(0, 100));
        throw err;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Stock List
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Manage your products and inventory</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white shadow-sm w-full md:w-64"
            />
          </div>
          <button
            onClick={() => navigate('/products/add')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-xs font-black text-slate-500 uppercase tracking-wider p-4">Code</th>
                  <th className="text-left text-xs font-black text-slate-500 uppercase tracking-wider p-4">Product Name</th>
                  <th className="text-right text-xs font-black text-slate-500 uppercase tracking-wider p-4">Price</th>
                  <th className="text-right text-xs font-black text-slate-500 uppercase tracking-wider p-4">Stock</th>
                  <th className="text-left text-xs font-black text-slate-500 uppercase tracking-wider p-4">Added On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="font-medium">No products found</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 font-mono">
                          {p.product_code || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{p.product_name}</div>
                        {p.description && <div className="text-xs text-slate-500 truncate max-w-xs">{p.description}</div>}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        ₹{formatAmount(p.price)}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          Number(p.stock_quantity) <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600 font-medium">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
