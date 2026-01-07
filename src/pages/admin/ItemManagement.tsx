import React, { useState, useEffect } from 'react';
import { ItemsAPI } from "../../api/items.api";
import { AchievementsAPI } from "../../api/achievements.api";
import { LootboxesAPI } from "../../api/lootboxes.api";
import { Sword, Dog, Gift, Trophy, Plus, Loader2, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
import AddItemModal from './AddItemModal';

const ItemManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'pets' | 'lootboxes' | 'achievements'>('items');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{item: any, collection: string} | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'items') {
        const [weaponsRes, armorRes, arcaneRes] = await Promise.all([
          ItemsAPI.list({ collection: "items_weapons" }),
          ItemsAPI.list({ collection: "items_armor" }),
          ItemsAPI.list({ collection: "items_arcane" })
        ]);
        setData([...(weaponsRes.data || []), ...(armorRes.data || []), ...(arcaneRes.data || [])]);
      } else if (activeTab === 'pets') {
        const [normalPetsRes, arcanePetsRes] = await Promise.all([
          ItemsAPI.list({ collection: "items_pets" }),
          ItemsAPI.list({ collection: "pets_arcane" })
        ]);
        setData([...(normalPetsRes.data || []), ...(arcanePetsRes.data || [])]);
      } else if (activeTab === 'lootboxes') {
        const response = await LootboxesAPI.list();
        setData(Array.isArray(response) ? response : []);
      } else if (activeTab === 'achievements') {
        const response = await AchievementsAPI.list();
        const finalData = Array.isArray(response) ? response : (response as any).data || [];
        setData(finalData);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
      setData([]);
    }
    setLoading(false);
  };

  const handleToggleLootboxStatus = async (lootbox: any) => {
    try {
      const newStatus = lootbox.enable === false; 
      await LootboxesAPI.patch(lootbox.lootboxId, { enable: newStatus });
      await fetchData();
    } catch (e) {
      console.error("Toggle failed", e);
    }
  };

  const handleDelete = async (itemId: string, itemData: any) => {
    if (!window.confirm(`Weet je zeker dat je wilt verwijderen?`)) return;
    try {
      if (activeTab === 'lootboxes') {
        await LootboxesAPI.delete(itemId);
      } else {
        await ItemsAPI.delete(itemId, activeTab);
      }
      await fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (item: any) => {
    const itemId = item.lootboxId || item.itemId || item.id || item.achievementId;
    setEditingItem({ item, collection: activeTab });
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-violet-50 p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase italic">
          Rewards & Treasury
        </h1>
        <nav className="flex gap-4 mt-6 bg-white p-2 rounded-2xl border border-violet-100 w-fit">
          {['items', 'pets', 'lootboxes', 'achievements'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)} 
              className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all capitalize ${activeTab === tab ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-violet-600'}`}
            >
              {tab === 'items' && <Sword size={18} />}
              {tab === 'pets' && <Dog size={18} />}
              {tab === 'lootboxes' && <Gift size={18} />}
              {tab === 'achievements' && <Trophy size={18} />}
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="animate-spin text-violet-500" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((item: any, index: number) => {
            const uniqueId = item.lootboxId || item.id || item.itemId || item.achievementId || `item-${index}`;
            const displayName = item.name || item.title || uniqueId.replace(/_/g, ' ');

            return (
              <div key={`${activeTab}-${uniqueId}`} className={`bg-white p-6 rounded-[2rem] border border-violet-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full group ${item.enable === false ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500">
                    {activeTab === 'items' && <Sword size={24} />}
                    {activeTab === 'pets' && <Dog size={24} />}
                    {activeTab === 'lootboxes' && <Gift size={24} />}
                    {activeTab === 'achievements' && <Trophy size={24} />}
                  </div>
                  <div className="flex items-center gap-1">
                    {activeTab === 'lootboxes' && (
                      <button onClick={() => handleToggleLootboxStatus(item)} className="p-2 text-slate-400 hover:text-violet-600 transition-all">
                        {item.enable === false ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                    <button onClick={() => handleEdit(item)} className="p-2 text-slate-300 hover:text-violet-600 transition-all opacity-0 group-hover:opacity-100">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(uniqueId, item)} className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                    <div className={`w-2 h-2 rounded-full ml-1 ${item.enable !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  </div>
                </div>

                <h3 className="font-bold text-lg text-slate-900 leading-tight capitalize">
                  {displayName}
                </h3>
                
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-tighter mb-2">
                  {uniqueId}
                </p>

                {/* Beschrijving wordt alleen getoond bij Achievements */}
                {activeTab === 'achievements' && item.description && (
                  <p className="text-xs text-slate-500 mb-4 line-clamp-3 italic">
                    {item.description}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap mt-auto pt-2">
                  {item.rarity && (
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase">
                      {item.rarity}
                    </span>
                  )}
                  {(item.priceGold || item.price) && (
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-amber-50 text-amber-600 uppercase">
                      {item.priceGold || item.price} Gold
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="border-2 border-dashed border-violet-200 rounded-[2rem] flex flex-col items-center justify-center p-8 text-violet-300 hover:border-violet-400 transition-all min-h-[200px]">
            <Plus size={32} />
            <span className="font-bold mt-2 uppercase text-sm tracking-widest">Add New {activeTab.slice(0, -1)}</span>
          </button>
        </div>
      )}

      <AddItemModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
        onSuccess={fetchData} 
        activeTab={activeTab}
        editData={editingItem}
      />
    </div>
  );
};

export default ItemManagement;