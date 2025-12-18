import React, { useState, useEffect } from 'react';
import { ItemsAPI } from "../../api/items.api";
import { PetsAPI } from "../../api/pets.api";
import { LootboxesAPI } from "../../api/lootboxes.api";
import { AchievementsAPI } from "../../api/achievements.api";
import { Sword, Dog, Gift, Trophy, Plus, Search, Loader2 } from 'lucide-react';

const ItemManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'pets' | 'lootboxes' | 'achievements'>('items');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'items') setData(await ItemsAPI.list());
        if (activeTab === 'pets') setData(await PetsAPI.list());
        if (activeTab === 'lootboxes') setData(await LootboxesAPI.list());
        if (activeTab === 'achievements') setData(await AchievementsAPI.list());
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-violet-50 p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase italic">
          Rewards & Treasury
        </h1>
        <nav className="flex gap-4 mt-6 bg-white p-2 rounded-2xl border border-violet-100 w-fit">
          <button onClick={() => setActiveTab('items')} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'items' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-violet-600'}`}>
            <Sword size={18} /> Equipment
          </button>
          <button onClick={() => setActiveTab('pets')} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'pets' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-violet-600'}`}>
            <Dog size={18} /> Pets
          </button>
          <button onClick={() => setActiveTab('lootboxes')} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'lootboxes' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-violet-600'}`}>
            <Gift size={18} /> Lootboxes
          </button>
          <button onClick={() => setActiveTab('achievements')} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'achievements' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-violet-600'}`}>
            <Trophy size={18} /> Achievements
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-violet-500" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((item: any) => (
            <div key={item.itemId || item.petId || item.lootboxId || item.achievementId} className="bg-white p-6 rounded-[2rem] border border-violet-100 shadow-sm hover:shadow-md transition-all">
               <div className="flex justify-between items-start mb-4">
                 <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500">
                    {activeTab === 'items' && <Sword size={24} />}
                    {activeTab === 'pets' && <Dog size={24} />}
                    {activeTab === 'lootboxes' && <Gift size={24} />}
                    {activeTab === 'achievements' && <Trophy size={24} />}
                 </div>
                 <div className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
               </div>
               <h3 className="font-bold text-lg text-slate-900">{item.name}</h3>
               <p className="text-[10px] font-black text-violet-400 uppercase tracking-tighter mb-4">{item.itemId || item.petId || item.lootboxId || item.achievementId}</p>
               {item.rarity && <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase">{item.rarity}</span>}
            </div>
          ))}
          <button className="border-2 border-dashed border-violet-200 rounded-[2rem] flex flex-col items-center justify-center p-8 text-violet-300 hover:border-violet-400 hover:text-violet-400 transition-all">
            <Plus size={32} />
            <span className="font-bold mt-2 uppercase text-sm tracking-widest">Add New</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemManagement;