import React, { useState } from 'react';
import { X, Save, Ghost } from 'lucide-react';
import { MonstersAPI } from '../../api/monsters.api';
import { MonsterTier } from '../../models/monster.model';

interface CreateMonsterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateMonsterModal: React.FC<CreateMonsterModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    tier: 'normal' as MonsterTier,
    elementType: 'physical',
    hp: 100,
    attack: 10,
    isActive: false
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await MonstersAPI.create({
        name: formData.name,
        tier: formData.tier,
        elementType: formData.elementType,
        isActive: formData.isActive,
        baseStats: {
          hp: formData.hp,
          attack: formData.attack
        }
      });
      onSuccess();
      onClose();
      setFormData({ name: '', tier: 'normal', elementType: 'physical', hp: 100, attack: 10, isActive: false });
    } catch (error) {
      console.error(error);
      alert("Fout bij het aanmaken van monster");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-violet-100">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic">Create Entity</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Entity Name</label>
              <input 
                required 
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                placeholder="e.g. Abyss Tidecaller"
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Tier</label>
                <select 
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none"
                  value={formData.tier} 
                  onChange={(e) => setFormData({...formData, tier: e.target.value as MonsterTier})}
                >
                  <option value="normal">Normal</option>
                  <option value="elite">Elite</option>
                  <option value="miniBoss">MiniBoss</option>
                  <option value="boss">Boss</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Element</label>
                <select 
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none"
                  value={formData.elementType} 
                  onChange={(e) => setFormData({...formData, elementType: e.target.value})}
                >
                  <option value="physical">Physical</option>
                  <option value="fire">Fire</option>
                  <option value="water">Water</option>
                  <option value="wind">Wind</option>
                  <option value="earth">Earth</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Base HP</label>
                <input 
                  type="number" 
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                  value={formData.hp} 
                  onChange={(e) => setFormData({...formData, hp: parseInt(e.target.value)})} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Base ATK</label>
                <input 
                  type="number" 
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:border-violet-400" 
                  value={formData.attack} 
                  onChange={(e) => setFormData({...formData, attack: parseInt(e.target.value)})} 
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-violet-50 rounded-2xl border border-violet-100 mt-2">
              <span className="text-xs font-black uppercase text-slate-900">Activate Immediately</span>
              <button 
                type="button"
                onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                className={`w-12 h-6 rounded-full transition-all relative ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <button type="submit" className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
              <Save size={20} /> Create Entity
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMonsterModal;