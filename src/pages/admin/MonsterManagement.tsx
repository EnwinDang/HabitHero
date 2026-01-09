import React, { useEffect, useState } from 'react';
import { MonstersAPI } from "../../api/monsters.api";
import { Monster, MonsterTier } from "../../models/monster.model";
import CreateMonsterModal from './CreateMonsterModal';
import { Plus, Search, Trash2, Edit3, Shield, Sword, X, Save, Loader2, AlertTriangle } from 'lucide-react';

// Importeer monster afbeeldingen per element
import monsterFire from "../../assets/monsters/monster_fire.png";
import monsterWater from "../../assets/monsters/monster_water.png";
import monsterEarth from "../../assets/monsters/monster_earth.png";
import monsterWind from "../../assets/monsters/monster_wind.png";

const MonsterManagement: React.FC = () => {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadMonsters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await MonstersAPI.list();
      setMonsters(data);
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to load monsters";
      console.error(error);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonsters();
  }, []);

  const getMonsterImage = (element: string | null | undefined) => {
    switch (element?.toLowerCase()) {
      case 'fire': return monsterFire;
      case 'water': return monsterWater;
      case 'earth': return monsterEarth;
      case 'wind': return monsterWind;
      default: return monsterEarth;
    }
  };

  const handleSave = async () => {
    if (!selectedMonster) return;
    try {
      await MonstersAPI.patch(selectedMonster.monsterId, selectedMonster);
      await loadMonsters();
      setSelectedMonster(null);
    } catch (error) {
      console.error(error);
      alert("Opslaan mislukt.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this entity from the bestiary?")) return;
    try {
      await MonstersAPI.delete(id);
      loadMonsters();
    } catch (error) {
      console.error(error);
    }
  };

  const getTierStyle = (tier: MonsterTier) => {
    switch (tier) {
      case 'boss': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'miniBoss': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'elite': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  const filteredMonsters = monsters.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.monsterId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-[#1a1c2e]">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tight">
            Entity Manager
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Configure entity stats and combat tiers
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-violet-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Create Entity
        </button>
      </div>

      <div className="relative mb-10 group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or ID..." 
          className="w-full bg-white border border-violet-100 rounded-[2rem] py-5 pl-16 pr-8 outline-none shadow-sm focus:ring-4 focus:ring-violet-500/5 focus:border-violet-200 transition-all font-bold text-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" size={40} /></div>
      ) : error ? (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[2rem] p-10 text-center">
          <p className="text-rose-700 font-black uppercase tracking-widest text-xs mb-4">Error: {error}</p>
          <button onClick={loadMonsters} className="px-8 py-3 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100">
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMonsters.map((monster) => (
            <div key={monster.monsterId} className="bg-white border border-violet-100 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-violet-300 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <span className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${getTierStyle(monster.tier as MonsterTier)}`}>
                  {monster.tier}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedMonster(monster)} className="text-slate-300 hover:text-violet-600 transition-colors p-1">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(monster.monsterId)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center mb-8">
                {/* Grotere afbeelding container: w-32 h-32 */}
                <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] mb-6 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform overflow-hidden p-5">
                  <img src={getMonsterImage(monster.elementType)} alt="" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">{monster.name}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{monster.monsterId}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8 mt-auto">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <Shield size={16} className="text-violet-400" />
                  <div>
                    <p className="text-[7px] font-black text-slate-400 uppercase leading-none">Health</p>
                    <p className="text-xs font-black text-slate-700">{monster.baseStats?.hp || 0}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <Sword size={16} className="text-violet-400" />
                  <div>
                    <p className="text-[7px] font-black text-slate-400 uppercase leading-none">Attack</p>
                    <p className="text-xs font-black text-slate-700">{monster.baseStats?.attack || 0}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-violet-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="italic">{monster.elementType || 'Physical'}</span>
                <div className="flex items-center gap-2">
                   <span className="text-[8px]">Status</span>
                   <div className={`w-2 h-2 rounded-full ${monster.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMonster && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 p-10 overflow-y-auto border-l border-violet-100 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Edit Entity</h2>
            <button onClick={() => setSelectedMonster(null)} className="p-2 hover:bg-violet-50 rounded-full text-slate-400 transition-all"><X size={24} /></button>
          </div>

          <div className="space-y-8">
            {/* Geselecteerde afbeelding preview in de sidebar */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <img src={getMonsterImage(selectedMonster.elementType)} alt="" className="w-32 h-32 object-contain" />
            </div>

            <div className="flex items-center justify-between p-5 bg-violet-50/50 rounded-2xl border border-violet-100">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Visibility</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">
                  {selectedMonster.isActive ? 'Live in-game' : 'Internal only'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedMonster({...selectedMonster, isActive: !selectedMonster.isActive})}
                className={`w-12 h-6 rounded-full transition-all relative ${selectedMonster.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedMonster.isActive ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Entity Name</label>
              <input 
                type="text" 
                className="w-full bg-violet-50/50 border-2 border-transparent rounded-2xl p-4 font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-violet-100 transition-all"
                value={selectedMonster.name}
                onChange={(e) => setSelectedMonster({...selectedMonster, name: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Tier Classification</label>
              <div className="grid grid-cols-2 gap-2">
                {['normal', 'elite', 'miniBoss', 'boss'].map((t) => (
                  <button 
                    key={t}
                    onClick={() => setSelectedMonster({...selectedMonster, tier: t as MonsterTier})}
                    className={`py-4 border-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedMonster.tier === t ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-100' : 'bg-white text-slate-400 border-violet-50 hover:border-violet-100'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Elemental Type</label>
              <div className="relative">
                <select 
                  className="w-full bg-violet-50/50 border-2 border-transparent rounded-2xl p-4 pr-12 font-bold text-slate-700 text-sm outline-none appearance-none transition-all focus:bg-white focus:border-violet-100"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1.25rem center',
                    backgroundSize: '1rem'
                  }}
                  value={selectedMonster.elementType || 'water'}
                  onChange={(e) => setSelectedMonster({...selectedMonster, elementType: e.target.value})}
                >
                  <option value="water">Water</option>
                  <option value="fire">Fire</option>
                  <option value="wind">Wind</option>
                  <option value="earth">Earth</option>
                  <option value="magic">Magic</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase text-slate-900 border-b border-violet-50 pb-2 tracking-widest">Base Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">HP Points</label>
                  <input 
                    type="number" 
                    className="w-full bg-violet-50/50 border-2 border-transparent rounded-2xl p-4 font-bold text-slate-700 outline-none focus:bg-white focus:border-violet-100 transition-all"
                    value={selectedMonster.baseStats?.hp || 0}
                    onChange={(e) => setSelectedMonster({...selectedMonster, baseStats: {...selectedMonster.baseStats!, hp: parseInt(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Attack Power</label>
                  <input 
                    type="number" 
                    className="w-full bg-violet-50/50 border-2 border-transparent rounded-2xl p-4 font-bold text-slate-700 outline-none focus:bg-white focus:border-violet-100 transition-all"
                    value={selectedMonster.baseStats?.attack || 0}
                    onChange={(e) => setSelectedMonster({...selectedMonster, baseStats: {...selectedMonster.baseStats!, attack: parseInt(e.target.value)}})}
                  />
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSave} className="w-full mt-12 bg-violet-600 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-2 shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all uppercase tracking-widest active:scale-[0.98]">
            <Save size={20} /> Update Bestiary
          </button>
        </div>
      )}

      <CreateMonsterModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={loadMonsters} 
      />
    </div>
  );
};

export default MonsterManagement;