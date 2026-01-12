import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Fingerprint } from 'lucide-react';
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

  const sanitizeId = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')           
      .replace(/[^a-z0-9_]/g, '');
  };

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData(editData.item);
      } else {
        setFormData({
          title: '',
          category: 'module',
          description: '',
          reward: { xp: 100, gold: 100 },
          enable: true // Standaard op actief
        });
      }
    }
  }, [isOpen, editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let finalData = { ...formData };

    if (!editData) {
      const baseName = finalData.name || finalData.title || 'new_asset';
      const cleanId = sanitizeId(baseName);

      if (activeTab === 'items') finalData.itemId = cleanId;
      else if (activeTab === 'lootboxes') finalData.lootboxId = cleanId;
      else if (activeTab === 'achievements') {
        finalData.achievementId = cleanId;
        finalData.id = cleanId; 
      }
    }

    try {
      if (activeTab === 'achievements') {
        if (editData) {
          const safeId = encodeURIComponent(finalData.achievementId || finalData.id);
          await AchievementsAPI.patch(safeId, finalData);
        } else {
          await AchievementsAPI.create(finalData);
        }
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Opslaan mislukt:", err);
      alert("Fout bij opslaan.");
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
        
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-violet-50/30">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic">
              {editData ? 'Edit Achievement' : 'New Achievement'}
            </h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="achievement-title" className="text-[10px] font-black text-slate-400 uppercase ml-2">Display Name</label>
              <input 
                id="achievement-title"
                name="achievement-title"
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                value={formData.title || ''}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
              {!editData && formData.title && (
                <div className="mt-2 px-3 py-2 bg-slate-100/80 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    ID in Database: {sanitizeId(formData.title)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="achievement-category" className="text-[10px] font-black text-slate-400 uppercase ml-2">Category</label>
              <select 
                id="achievement-category"
                name="achievement-category"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                value={formData.category || 'module'}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {['difficulty', 'combat', 'module', 'streak', 'world'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* STATUS TOGGLE */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Status</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, enable: true })}
                className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${
                  formData.enable !== false 
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' 
                    : 'bg-white text-slate-400 border-slate-100'
                }`}
              >
                Actief
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, enable: false })}
                className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${
                  formData.enable === false 
                    ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-100' 
                    : 'bg-white text-slate-400 border-slate-100'
                }`}
              >
                Inactief
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="achievement-desc" className="text-[10px] font-black text-blue-400 uppercase block border-b border-blue-100 pb-1">Condition</label>
            <textarea 
              id="achievement-desc"
              name="achievement-desc"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold min-h-[80px]"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
            <p className="text-[9px] font-black text-blue-400 uppercase mb-3 text-center tracking-widest">Rewards</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="reward-xp" className="sr-only">XP</label>
                <input 
                  id="reward-xp"
                  name="reward-xp"
                  type="number" 
                  placeholder="XP" 
                  className="w-full bg-white rounded-xl px-3 py-2 text-xs font-bold" 
                  value={formData.reward?.xp || 0} 
                  onChange={(e) => updateNested('reward', 'xp', parseInt(e.target.value))} 
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="reward-gold" className="sr-only">Gold</label>
                <input 
                  id="reward-gold"
                  name="reward-gold"
                  type="number" 
                  placeholder="Gold" 
                  className="w-full bg-white rounded-xl px-3 py-2 text-xs font-bold" 
                  value={formData.reward?.gold || 0} 
                  onChange={(e) => updateNested('reward', 'gold', parseInt(e.target.value))} 
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-[2] bg-violet-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {editData ? 'Update Achievement' : 'Create Achievement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;