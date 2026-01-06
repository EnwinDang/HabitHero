import React, { useState, useEffect } from 'react';
import { ItemsAPI } from "../../api/items.api";
import { AchievementsAPI } from "../../api/achievements.api";
import { Sword, Dog, Gift, Trophy, Plus, Loader2, Trash2, Edit2 } from 'lucide-react';
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

        setData([
          ...(weaponsRes.data || []),
          ...(armorRes.data || []),
          ...(arcaneRes.data || [])
        ]);
      } else if (activeTab === 'pets') {
        const [normalPetsRes, arcanePetsRes] = await Promise.all([
          ItemsAPI.list({ collection: "items_pets" }),
          ItemsAPI.list({ collection: "pets_arcane" })
        ]);

        setData([
          ...(normalPetsRes.data || []),
          ...(arcanePetsRes.data || [])
        ]);
      } else if (activeTab === 'lootboxes') {
        const [standardRes] = await Promise.all([
          ItemsAPI.list({ collection: "lootboxes" }),
        ]);

        setData([
          ...(standardRes.data || []),
        ]);
      } else if (activeTab === 'achievements') {
        const response = await AchievementsAPI.list();
        const finalData = Array.isArray(response) ? response : (response as any).data || [];
        setData(finalData);
      }
    } catch (e: any) {
      const errorMsg = e?.message || "Failed to load items";
      console.error(e);
      setError(errorMsg);
      setData([]);
    }
    setLoading(false);
  };

  const getCollectionForItem = (itemId: string, itemData: any) => {
    if (activeTab === 'achievements') return "achievements";
    if (activeTab === 'pets') return itemData.element === 'arcane' || itemData.arcaneBonus ? "pets_arcane" : "items_pets";
    if (activeTab === 'lootboxes') return itemData.arcaneBonus ? "lootboxesArcaneTweaks" : "lootboxes";
    if (itemId.includes('weapon')) return "items_weapons";
    if (itemId.includes('armor')) return "items_armor";
    return "items_arcane";
  };

  const handleDelete = async (itemId: string, itemData: any) => {
    if (!window.confirm(`Weet je zeker dat je "${itemData.title || itemData.name || itemId}" wilt verwijderen?`)) return;
    try {
      const collection = getCollectionForItem(itemId, itemData);
      await ItemsAPI.delete(itemId, collection);
      await fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (item: any) => {
    const itemId = item.itemId || item.achievementId || item.id;
    const collection = getCollectionForItem(itemId, item);
    setEditingItem({ item, collection });
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
      ) : error ? (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-8 text-center">
          <p className="text-rose-700 font-semibold mb-4">⚠️ {error}</p>
          <p className="text-rose-600 text-sm mb-6">Make sure you're logged in as an admin</p>
          <button 
            onClick={fetchData}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all font-semibold"
          >
            🔄 Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((item: any, index: number) => {
            const uniqueId = item.itemId || item.achievementId || item.id || `item-${index}`;
            const itemKey = `${activeTab}-${uniqueId}-${index}`;

            return (
              <div key={itemKey} className="bg-white p-6 rounded-[2rem] border border-violet-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500">
                    {activeTab === 'items' && <Sword size={24} />}
                    {activeTab === 'pets' && <Dog size={24} />}
                    {activeTab === 'lootboxes' && <Gift size={24} />}
                    {activeTab === 'achievements' && <Trophy size={24} />}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEdit(item)}
                      className="p-2 text-slate-300 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(uniqueId, item)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className={`w-2 h-2 rounded-full ml-1 ${item.isActive || item.enabled || item.reward ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  </div>
                </div>

                <h3 className="font-bold text-lg text-slate-900 leading-tight">
                  {item.title || item.name || item.id || "Unnamed"}
                </h3>
                
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-tighter mb-2">
                  {uniqueId}
                </p>

                {(item.passive || item.description || item.condition?.description) && (
                  <p className="text-xs text-slate-500 mb-4 line-clamp-3 italic">
                    {item.passive || item.description || item.condition?.description}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap mt-auto pt-2">
                  {item.rarity && (
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase">
                      {item.rarity}
                    </span>
                  )}
                  {item.element && (
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-blue-50 text-blue-500 uppercase">
                      {item.element}
                    </span>
                  )}
                  {item.sellValue && (
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-amber-50 text-amber-600 uppercase">
                      {item.sellValue} Gold
                    </span>
                  )}
                  {item.reward?.gold && (
                    <span className="text-[10px] font-black px-2 py-1 rounded bg-emerald-50 text-emerald-600 uppercase">
                      Reward: {item.reward.gold}G
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          
          <button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="border-2 border-dashed border-violet-200 rounded-[2rem] flex flex-col items-center justify-center p-8 text-violet-300 hover:border-violet-400 hover:text-violet-400 transition-all min-h-[200px]"
          >
            <Plus size={32} />
            <span className="font-bold mt-2 uppercase text-sm tracking-widest">Add New</span>
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