import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { ItemsAPI } from '../../api/items.api';
import { LootboxesAPI } from '../../api/lootboxes.api';
import { AchievementsAPI } from '../../api/achievements.api';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeTab: 'items' | 'lootboxes' | 'achievements';
  editData?: { item: any, collection: string } | null;
}

const AddItemModal = ({ isOpen, onClose, onSuccess, activeTab, editData }: AddItemModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Reset of vul data bij openen
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData(editData.item);
      } else {
        // Standaard waarden voor nieuwe entries
        const defaults: any = { rarity: 'common', element: 'arcane', enable: true };
        if (activeTab === 'items') defaults.stats = {};
        if (activeTab === 'lootboxes') defaults.dropChances = { common: 0.7, uncommon: 0.2, rare: 0.1 };
        if (activeTab === 'achievements') {
          defaults.reward = { xp: 100, gold: 100 };
          defaults.condition = { type: 'counter', value: 10, key: '' };
        }
        setFormData(defaults);
      }
    }
  }, [isOpen, editData, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeTab === 'items') {
        const collection = editData?.collection || 'items_weapons';
        if (editData) {
          await ItemsAPI.patch(formData.itemId || formData.id, formData, collection);
        } else {
          await ItemsAPI.create(formData, collection);
        }
      } else if (activeTab === 'lootboxes') {
        if (editData) {
          await LootboxesAPI.patch(formData.lootboxId, formData);
        } else {
          await LootboxesAPI.create(formData);
        }
      } else if (activeTab === 'achievements') {
        if (editData) {
          await AchievementsAPI.patch(formData.achievementId, formData);
        } else {
          await AchievementsAPI.create(formData);
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Opslaan mislukt:", err);
      alert("Er is een fout opgetreden bij het opslaan.");
    } finally {
      setLoading(false);
    }
  };

  const updateNested = (parent: string, key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-violet-50/30">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic">
              {editData ? 'Edit Entry' : `New ${activeTab.slice(0, -1)}`}
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{editData?.collection || activeTab}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-slate-400 transition-all shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* Basis Velden */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Display Name</label>
              <input 
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                value={formData.name || formData.title || ''}
                onChange={(e) => setFormData({...formData, [activeTab === 'achievements' ? 'title' : 'name']: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Rarity / Category</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                value={formData.rarity || formData.category || ''}
                onChange={(e) => setFormData({...formData, [activeTab === 'achievements' ? 'category' : 'rarity']: e.target.value})}
              >
                {activeTab === 'achievements' ? (
                  ['difficulty', 'combat', 'module', 'streak', 'world'].map(c => <option key={c} value={c}>{c}</option>)
                ) : (
                  ['common', 'uncommon', 'rare', 'epic', 'legendary'].map(r => <option key={r} value={r}>{r}</option>)
                )}
              </select>
            </div>
          </div>

          {/* Items: Stats of Buffs */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-violet-400 uppercase block border-b border-violet-100 pb-1">
                {editData?.collection === 'items_pets' ? 'Pet Buffs' : 'Weapon Stats'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['attack', 'defense', 'hp', 'magicAttack', 'magicResist', 'critChance'].map((stat) => (
                  <div key={stat} className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{stat}</p>
                    <input 
                      type="number" step="0.01"
                      className="w-full bg-transparent text-sm font-black text-violet-600 outline-none"
                      value={(formData.buffs || formData.stats)?.[stat] || 0}
                      onChange={(e) => updateNested(formData.buffs ? 'buffs' : 'stats', stat, parseFloat(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lootboxes: Drop Chances */}
          {activeTab === 'lootboxes' && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-amber-400 uppercase block border-b border-amber-100 pb-1">Drop Chances (0.0 - 1.0)</label>
              <div className="grid grid-cols-2 gap-3">
                {['common', 'uncommon', 'rare', 'epic', 'legendary'].map((rarity) => (
                  <div key={rarity} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-500 uppercase">{rarity}</span>
                    <input 
                      type="number" step="0.01"
                      className="w-20 text-right bg-transparent text-sm font-black text-amber-600 outline-none"
                      value={formData.dropChances?.[rarity] || 0}
                      onChange={(e) => updateNested('dropChances', rarity, parseFloat(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements: Rewards & Conditions */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-blue-400 uppercase block border-b border-blue-100 pb-1">Condition</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold min-h-[80px]"
                  placeholder="Beschrijving van de voorwaarde..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-400 uppercase mb-3 text-center">Rewards</p>
                  <div className="space-y-3">
                    <input type="number" placeholder="XP" className="w-full bg-white rounded-xl px-3 py-2 text-xs font-bold" 
                      value={formData.reward?.xp || 0} onChange={(e) => updateNested('reward', 'xp', parseInt(e.target.value))} />
                    <input type="number" placeholder="Gold" className="w-full bg-white rounded-xl px-3 py-2 text-xs font-bold" 
                      value={formData.reward?.gold || 0} onChange={(e) => updateNested('reward', 'gold', parseInt(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Acties */}
          <div className="flex gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button" onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" disabled={loading}
              className="flex-[2] bg-violet-600 hover:bg-violet-700 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {editData ? 'Update Asset' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;