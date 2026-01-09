import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { MonstersAPI } from '../../api/monsters.api';
import { MonsterTier } from '../../models/monster.model';

// Importeer monster afbeeldingen voor de preview
import monsterFire from "../../assets/monsters/monster_fire.png";
import monsterWater from "../../assets/monsters/monster_water.png";
import monsterEarth from "../../assets/monsters/monster_earth.png";
import monsterWind from "../../assets/monsters/monster_wind.png";

interface CreateMonsterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateMonsterModal: React.FC<CreateMonsterModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    tier: 'normal' as MonsterTier,
    elementType: 'water',
    hp: 100,
    attack: 10,
    isActive: false
  });

  if (!isOpen) return null;

  const getMonsterImage = (element: string) => {
    switch (element?.toLowerCase()) {
      case 'fire': return monsterFire;
      case 'water': return monsterWater;
      case 'earth': return monsterEarth;
      case 'wind': return monsterWind;
      default: return monsterEarth;
    }
  };

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
      setFormData({ name: '', tier: 'normal', elementType: 'water', hp: 100, attack: 10, isActive: false });
    } catch (error) {
      console.error(error);
      alert("Fout bij het aanmaken van monster");
    }
  };

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1.25rem center',
    backgroundSize: '1rem'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-violet-100 animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Create Entity</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Afbeelding Preview */}
            <div className="flex justify-center mb-2">
              <div className="w-32 h-32 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-slate-100 p-5">
                <img src={getMonsterImage(formData.elementType)} alt="" className="w-full h-full object-contain" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Entity Name</label>
              <input 
                required 
                className="w-full px-6 py-4 rounded-2xl bg-violet-50/50 border-2 border-transparent font-bold text-slate-700 outline-none focus:bg-white focus:border-violet-100 transition-all" 
                placeholder="Enter name..."
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Tier</label>
                <select 
                  className="w-full px-6 py-4 rounded-2xl bg-violet-50/50 border-2 border-transparent font-bold text-slate-700 outline-none appearance-none transition-all focus:bg-white focus:border-violet-100"
                  style={selectStyle}
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
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Element</label>
                <select 
                  className="w-full px-6 py-4 rounded-2xl bg-violet-50/50 border-2 border-transparent font-bold text-slate-700 outline-none appearance-none transition-all focus:bg-white focus:border-violet-100"
                  style={selectStyle}
                  value={formData.elementType} 
                  onChange={(e) => setFormData({...formData, elementType: e.target.value})}
                >
                  <option value="water">Water</option>
                  <option value="fire">Fire</option>
                  <option value="wind">Wind</option>
                  <option value="earth">Earth</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Base HP</label>
                <input 
                  type="number" 
                  className="w-full px-6 py-4 rounded-2xl bg-violet-50/50 border-2 border-transparent font-bold text-slate-700 outline-none focus:bg-white focus:border-violet-100 transition-all" 
                  value={formData.hp} 
                  onChange={(e) => setFormData({...formData, hp: parseInt(e.target.value)})} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Base ATK</label>
                <input 
                  type="number" 
                  className="w-full px-6 py-4 rounded-2xl bg-violet-50/50 border-2 border-transparent font-bold text-slate-700 outline-none focus:bg-white focus:border-violet-100 transition-all" 
                  value={formData.attack} 
                  onChange={(e) => setFormData({...formData, attack: parseInt(e.target.value)})} 
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-violet-50/50 rounded-2xl border border-violet-100">
              <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Activate Immediately</span>
              <button 
                type="button"
                onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                className={`w-12 h-6 rounded-full transition-all relative ${formData.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <button type="submit" className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-violet-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98]">
              <Save size={20} /> Create Entity
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMonsterModal;