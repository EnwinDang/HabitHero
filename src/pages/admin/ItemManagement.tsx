import React, { useState, useEffect } from 'react';
import { Sword, Shield, Dog, Package, Trophy, Plus, Edit3, EyeOff, Coins, Loader2, Target, Search } from 'lucide-react';
import { ItemsAPI } from '../../api/items.api';
import { LootboxesAPI } from '../../api/lootboxes.api';
import { AchievementsAPI } from '../../api/achievements.api';
import AddItemModal from './AddItemModal';

const ItemManagement = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'lootboxes' | 'achievements'>('items');
  const [activeCollection, setActiveCollection] = useState('items_weapons');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'items') {
        const res = await ItemsAPI.list({ collection: activeCollection });
        setData(res.data || []);
      } else if (activeTab === 'lootboxes') {
        const res = await LootboxesAPI.list();
        setData(res || []);
      } else {
        const res = await AchievementsAPI.list();
        setData(res.data || []);
      }
    } catch (err) {
      console.error("Fout bij laden:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeTab, activeCollection]);

  const filteredData = data.filter((entry) => {
    const searchLower = searchTerm.toLowerCase();
    const name = (entry.name || entry.title || '').toLowerCase();
    const id = (entry.itemId || entry.lootboxId || entry.achievementId || '').toLowerCase();
    const rarity = (entry.rarity || '').toLowerCase();
    const element = (entry.element || '').toLowerCase();

    return name.includes(searchLower) || id.includes(searchLower) || rarity.includes(searchLower) || element.includes(searchLower);
  });

  const getElementColor = (element: string) => {
    switch (element?.toLowerCase()) {
      case 'fire': return 'text-orange-500 bg-orange-50 border-orange-100';
      case 'water': return 'text-blue-500 bg-blue-50 border-blue-100';
      case 'wind': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'earth': return 'text-amber-700 bg-amber-50 border-amber-100';
      case 'arcane': return 'text-purple-500 bg-purple-50 border-purple-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const renderAttributes = (item: any) => {
    const attributes = item.buffs || item.stats;
    if (!attributes) return null;
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
        {Object.entries(attributes).map(([key, value]: [string, any]) => {
          if (value === 0 || value === "0") return null;
          return (
            <div key={key} className="flex justify-between items-center bg-slate-50/50 px-2 py-1 rounded-lg border border-slate-100/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase truncate">{key}</span>
              <span className="text-[10px] font-black text-violet-600">+{typeof value === 'number' && value < 1 ? `${(value * 100).toFixed(0)}%` : value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLootboxDetails = (box: any) => (
    <div className="space-y-3 mt-4">
      <div className="space-y-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Drop Rates</p>
        <div className="grid grid-cols-2 gap-1">
          {box.dropChances && Object.entries(box.dropChances).map(([rarity, chance]: [string, any]) => (
            <div key={rarity} className="flex justify-between bg-slate-50 px-2 py-0.5 rounded text-[9px] border border-slate-100">
              <span className="capitalize text-slate-500 font-bold">{rarity}</span>
              <span className="text-violet-600 font-black">{(chance * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAchievementDetails = (ach: any) => (
    <div className="space-y-3 mt-4">
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <Target size={12} className="text-slate-400" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Condition</p>
        </div>
        <p className="text-[10px] font-bold text-slate-600 leading-tight">{ach.description || "No description provided"}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rewards</p>
        <div className="flex flex-wrap gap-1">
          {ach.reward?.xp && <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded border border-blue-100">{ach.reward.xp} XP</span>}
          {ach.reward?.gold && <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded border border-amber-100">{ach.reward.gold} GOLD</span>}
          {ach.reward?.lootbox && <span className="bg-purple-50 text-purple-600 text-[8px] font-black px-2 py-0.5 rounded border border-purple-100 uppercase">{ach.reward.lootbox.replace('_', ' ')}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-violet-50/40 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Asset Manager</h1>
          <p className="text-slate-500 font-medium">Beheer alle world content</p>
        </div>
        <button onClick={() => { setEditItem(null); setIsModalOpen(true); }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-violet-200 uppercase tracking-widest text-xs transition-all">
          <Plus size={18} /> Add Entry
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex gap-4 bg-white p-2 rounded-[2rem] w-fit shadow-sm border border-violet-100">
          {['items', 'lootboxes', 'achievements'].map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab as any); setActiveCollection('items_weapons'); setSearchTerm(''); }}
              className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
              {tab === 'items' ? <Sword size={14} /> : tab === 'lootboxes' ? <Package size={14} /> : <Trophy size={14} />}
              {tab}
            </button>
          ))}
        </div>

        <div className="relative group flex-grow max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder={`Search in ${activeTab}...`}
            className="bg-white border border-violet-100 rounded-[2rem] py-3.5 pl-12 pr-6 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all w-full shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {activeTab === 'items' && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[{ id: 'items_weapons', label: 'Weapons', icon: Sword }, { id: 'items_armor', label: 'Armor', icon: Shield }, { id: 'items_pets', label: 'Pets', icon: Dog }].map((col) => (
            <button key={col.id} onClick={() => { setActiveCollection(col.id); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all border-2 whitespace-nowrap ${activeCollection === col.id ? 'bg-white text-violet-600 border-violet-600' : 'bg-transparent text-slate-400 border-transparent'}`}>
              <col.icon size={14} /> {col.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-600" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredData.length > 0 ? filteredData.map((entry) => (
            <div key={entry.itemId || entry.lootboxId || entry.achievementId} 
              className={`bg-white p-6 rounded-[2.5rem] border border-violet-100 shadow-sm flex flex-col h-full transition-all group hover:border-violet-300 ${entry.enable === false ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${activeTab === 'items' ? getElementColor(entry.element) : activeTab === 'lootboxes' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-violet-50 border-violet-100 text-violet-600'}`}>
                  {activeTab === 'items' ? (activeCollection === 'items_pets' ? <Dog size={20} /> : <Sword size={20} />) : 
                   activeTab === 'lootboxes' ? <Package size={20} /> : <Trophy size={20} />}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-1">
                    {/* Badge aangepast naar Inactief met grijze look */}
                    {entry.enable === false && (
                      <span className="bg-slate-100 text-slate-500 text-[7px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                        <EyeOff size={8} /> Inactief
                      </span>
                    )}
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${entry.rarity === 'legendary' || entry.category === 'world' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                      {entry.rarity || entry.category || 'General'}
                    </span>
                  </div>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest text-right">
                    {activeTab === 'achievements' ? entry.achievementId : (entry.element || (entry.count ? `${entry.count} Items` : ''))}
                  </span>
                </div>
              </div>

              <h3 className="font-black text-slate-900 uppercase italic text-base leading-tight mb-1">{entry.title || entry.name}</h3>
              {entry.passive && <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-3 italic">"{entry.passive}"</p>}
              
              <div className="flex-grow">
                {activeTab === 'items' ? renderAttributes(entry) : 
                 activeTab === 'lootboxes' ? renderLootboxDetails(entry) : 
                 activeTab === 'achievements' ? renderAchievementDetails(entry) : null}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg">
                  <Coins size={12} className="text-amber-500" />
                  <span className="text-[10px] font-black text-amber-700">
                    {entry.reward?.gold || entry.sellValue || entry.priceGold || 0}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditItem({ item: entry, collection: activeTab === 'items' ? activeCollection : activeTab }); setIsModalOpen(true); }}
                    className="p-2 hover:bg-violet-50 rounded-xl text-slate-300 hover:text-violet-600 transition-colors"
                    title="Bewerk status of details"
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No assets found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}
      <AddItemModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditItem(null); }} onSuccess={loadData} activeTab={activeTab} editData={editItem} />
    </div>
  );
};

export default ItemManagement;