import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { ItemsAPI } from '../../api/items.api';
import { AchievementsAPI } from '../../api/achievements.api';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeTab: 'items' | 'pets' | 'lootboxes' | 'achievements';
  editData?: { item: any; collection: string } | null;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onSuccess, activeTab, editData }) => {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    rarity: 'common',
    collection: 'items_weapons',
    goldReward: 100,
    category: 'difficulty',
    element: 'none',
    sellValue: 0,
    passive: ''
  });

  useEffect(() => {
    if (editData && editData.item) {
      const { item } = editData;
      setFormData({
        name: item.name || '',
        title: item.title || '',
        description: item.description || item.condition?.description || '',
        rarity: item.rarity || 'common',
        collection: editData.collection || 'items_weapons',
        goldReward: item.reward?.gold || 100,
        category: item.category || 'difficulty',
        element: item.element || 'none',
        sellValue: item.sellValue || 0,
        passive: item.passive || ''
      });
    } else {
      setFormData({
        name: '',
        title: '',
        description: '',
        rarity: 'common',
        collection: activeTab === 'items' ? 'items_weapons' : (activeTab === 'pets' ? 'items_pets' : 'lootboxes'),
        goldReward: 100,
        category: 'difficulty',
        element: 'none',
        sellValue: 0,
        passive: ''
      });
    }
  }, [editData, isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemId = editData?.item?.itemId || editData?.item?.achievementId || editData?.item?.id;

      if (activeTab === 'achievements') {
        const data = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          reward: { gold: formData.goldReward, xp: formData.goldReward * 1.5 }
        };
        if (editData && itemId) {
          await AchievementsAPI.replace(itemId, data as any);
        } else {
          await AchievementsAPI.create(data as any);
        }
      } else {
        const data = {
          name: formData.name,
          rarity: formData.rarity,
          element: formData.element !== 'none' ? formData.element : undefined,
          sellValue: formData.sellValue,
          passive: formData.passive
        };
        if (editData && itemId) {
          await ItemsAPI.replace(itemId, data as any, formData.collection);
        } else {
          await ItemsAPI.create(data as any, formData.collection);
        }
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-violet-100">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic">
              {editData ? 'Edit' : 'Add'} {activeTab}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            {activeTab === 'achievements' ? (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Title</label>
                  <input required className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                    value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Description</label>
                  <textarea className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                    value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Gold Reward</label>
                    <input type="number" className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                      value={formData.goldReward} onChange={(e) => setFormData({...formData, goldReward: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Category</label>
                    <input className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                      value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Name</label>
                  <input required className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                {activeTab === 'pets' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Passive Ability</label>
                    <input className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                      value={formData.passive} onChange={(e) => setFormData({...formData, passive: e.target.value})} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Rarity</label>
                    <select className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none" 
                      value={formData.rarity} onChange={(e) => setFormData({...formData, rarity: e.target.value})}>
                      <option value="common">Common</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Collection</label>
                    <select disabled={!!editData} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none disabled:opacity-50" 
                      value={formData.collection} onChange={(e) => setFormData({...formData, collection: e.target.value})}>
                      <option value="items_weapons">Weapons</option>
                      <option value="items_armor">Armor</option>
                      <option value="items_arcane">Arcane</option>
                      <option value="items_pets">Pets</option>
                      <option value="pets_arcane">Pets Arcane</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Element</label>
                    <select className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none" 
                      value={formData.element} onChange={(e) => setFormData({...formData, element: e.target.value})}>
                      <option value="none">None</option>
                      <option value="fire">Fire</option>
                      <option value="water">Water</option>
                      <option value="earth">Earth</option>
                      <option value="air">Air</option>
                      <option value="arcane">Arcane</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Sell Value</label>
                    <input type="number" className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                      value={formData.sellValue} onChange={(e) => setFormData({...formData, sellValue: parseInt(e.target.value)})} />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
              <Save size={20} /> {editData ? 'Update' : 'Deploy'} Database
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;