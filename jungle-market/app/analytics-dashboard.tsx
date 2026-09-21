import React, { useState, useEffect } from 'react';
import { fetchPlatformAnalytics } from '../lib/api';

interface AnalyticsData {
  metrics: { total_appraisals: number; average_item_value: number; gross_inventory_value: number };
  category_mix: { [key: string]: number };
  trends: Array<{ date: string; price: number; label: string }>;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      const result = await fetchPlatformAnalytics();
      if (result && result.source === "database") {
        setData({metrics:{total_appraisals:Number(result.verified_products||0),average_item_value:0,gross_inventory_value:0},category_mix:{},trends:[]});
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-400 text-sm">Gathering your craft statistics...</p>
      </div>
    );
  }

  // Calculate dynamic heights for our timeline SVG chart lanes safely
  const maxPrice = data && data.trends.length > 0 ? Math.max(...data.trends.map(t => t.price), 100) : 100;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 space-y-8 flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">
              Your Craft Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">See how your crafts are doing and track your hard work.</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl font-semibold text-xs hover:bg-gray-850 transition-all">
            🔄 Refresh Stats
          </button>
        </div>

        {/* --- HIGH-IMPACT KPI PLATES BAR --- */}
        {data && (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
              <span className="text-xs text-gray-500 font-bold block mb-1">TOTAL CRAFTS LISTED</span>
              <p className="text-3xl font-black text-white">{data.metrics.total_appraisals} <span className="text-sm text-gray-500 font-normal">items</span></p>
            </div>
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/10">
              <span className="text-xs text-emerald-500 font-bold block mb-1">TOTAL VALUE OF YOUR CRAFTS</span>
              <p className="text-3xl font-black text-emerald-400">₹{data.metrics.gross_inventory_value.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
              <span className="text-xs text-blue-400 font-bold block mb-1">AVERAGE PRICE PER CRAFT</span>
              <p className="text-3xl font-black text-blue-400">₹{data.metrics.average_item_value.toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}

        {/* --- INTERACTIVE TREND LINE CHART SECTION --- */}
        {data && data.trends.length > 0 && (
          <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">📈 Your Earnings & Value Over Time</h3>
            
            <div className="w-full h-64 bg-gray-950 rounded-2xl border border-gray-850 relative p-4 flex items-end justify-between overflow-hidden">
              <div className="absolute inset-0 grid grid-rows-4 pointer-events-none p-4 opacity-5">
                <div className="border-b border-white"></div><div className="border-b border-white"></div><div className="border-b border-white"></div>
              </div>
              
              {data.trends.map((item, index) => {
                const fillHeightPercent = (item.price / maxPrice) * 80 + 10;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 group relative cursor-pointer mx-1">
                    <div className="absolute bottom-full mb-2 bg-gray-800 border border-gray-700 text-[10px] px-2 py-1 rounded shadow-xl hidden group-hover:block z-50 whitespace-nowrap text-center">
                      <span className="font-bold text-white block">{item.label}</span>
                      <span className="text-emerald-400 font-mono">₹{item.price.toFixed(2)}</span>
                    </div>
                    <div 
                      style={{ height: `${fillHeightPercent}%` }} 
                      className="w-full max-w-[12px] bg-gradient-to-t from-emerald-600 via-teal-500 to-blue-400 rounded-t-sm group-hover:opacity-80 transition-all"
                    ></div>
                    <span className="text-[9px] text-gray-600 font-mono mt-2 transform -rotate-45 origin-top-left">{item.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- CATEGORY BREAKDOWN BARS ENGINE --- */}
        {data && (
          <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">📦 What You Are Making</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(data.category_mix).map(([cat, count]) => {
                const totalItems = data.metrics.total_appraisals || 1;
                const progressWidth = (count / totalItems) * 100;
                return (
                  <div key={cat} className="bg-gray-950 p-4 rounded-xl border border-gray-850 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-300">{cat.toUpperCase()}</span>
                      <span className="font-mono text-gray-500">{count} item(s) ({Math.round(progressWidth)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                      <div style={{ width: `${progressWidth}%` }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
