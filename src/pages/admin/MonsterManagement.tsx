import React, { useEffect, useState } from 'react';
import { MonstersAPI, MonstersQuery } from "../../api/monsters.api";
import { Monster, MonsterTier } from "../../models/monster.model";
import { Ghost, Plus, Search, Trash2, Edit3, Shield, Sword, X, Save, Loader2 } from 'lucide-react';

const MonsterManagement: React.FC = () => {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);

  const loadMonsters = async () => {
    setLoading(true);
    try {
      const data = await MonstersAPI.list();
      setMonsters(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonsters();
  }, []);

  const handleSave = async () => {
    if (!selectedMonster) return;
    try {
      await MonstersAPI.patch(selectedMonster.monsterId, selectedMonster);
      loadMonsters();
      setSelectedMonster(null);
    } catch (error) {
      console.error(error);
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
    <div className="min-h-screen bg-violet-50 p-8">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase">
            <Ghost className="text-violet-500" size={32} /> Bestiary
          </h1>
          <p className="text-slate-500 font-medium mt-1">Configure entity stats and combat tiers</p>
        </div>
        <button className="bg-violet-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all">
          <Plus size={20} /> Create Entity
        </button>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or ID..." 
          className="w-full bg-white border border-violet-100 rounded-[1.5rem] py-5 pl-14 pr-6 outline-none shadow-sm focus:ring-2 focus:ring-violet-500/20 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMonsters.map((monster) => (
            <div key={monster.monsterId} className="bg-white border border-violet-100 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-violet-300 transition-all">
              <div className="flex justify-between items-start mb-6">
                <span className={`text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${getTierStyle(monster.tier)}`}>
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
                <div className="w-20 h-20 bg-violet-50 rounded-3xl mb-4 flex items-center justify-center border border-violet-100 group-hover:scale-110 transition-transform">
                  <Ghost size={40} className="text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{monster.name}</h3>
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-tighter">{monster.monsterId}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-violet-50/50 p-3 rounded-2xl border border-violet-100 flex items-center gap-2">
                  <Shield size={14} className="text-violet-400" />
                  <span className="font-bold text-slate-700 text-xs">{monster.baseStats?.hp || 0} HP</span>
                </div>
                <div className="bg-violet-50/50 p-3 rounded-2xl border border-violet-100 flex items-center gap-2">
                  <Sword size={14} className="text-violet-400" />
                  <span className="font-bold text-slate-700 text-xs">{monster.baseStats?.attack || 0} ATK</span>
                </div>
              </div>

              <div className="pt-4 border-t border-violet-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{monster.elementType || 'Physical'}</span>
                <div className={`w-2 h-2 rounded-full ${monster.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMonster && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 p-10 overflow-y-auto border-l border-violet-100">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Edit Entity</h2>
            <button onClick={() => setSelectedMonster(null)} className="p-2 hover:bg-violet-50 rounded-full text-slate-400 transition-all"><X /></button>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Entity Tier</label>
              <div className="grid grid-cols-2 gap-2">
                {['normal', 'elite', 'miniBoss', 'boss'].map((t) => (
                  <button 
                    key={t}
                    onClick={() => setSelectedMonster({...selectedMonster, tier: t as MonsterTier})}
                    className={`p-3 border rounded-xl text-[10px] font-black uppercase transition-all ${selectedMonster.tier === t ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-white text-slate-400 border-violet-100 hover:border-violet-300'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-900 border-b border-violet-50 pb-2 tracking-widest">Combat Stats</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Base HP</label>
                  <input 
                    type="number" 
                    className="w-full bg-violet-50 border-none rounded-xl p-4 mt-2 font-bold text-slate-700 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    value={selectedMonster.baseStats?.hp || 0}
                    onChange={(e) => setSelectedMonster({...selectedMonster, baseStats: {...selectedMonster.baseStats!, hp: parseInt(e.target.value)}})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Base ATK</label>
                  <input 
                    type="number" 
                    className="w-full bg-violet-50 border-none rounded-xl p-4 mt-2 font-bold text-slate-700 focus:ring-2 focus:ring-violet-500/20 transition-all"
                    value={selectedMonster.baseStats?.attack || 0}
                    onChange={(e) => setSelectedMonster({...selectedMonster, baseStats: {...selectedMonster.baseStats!, attack: parseInt(e.target.value)}})}
                  />
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSave} className="w-full mt-12 bg-violet-600 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-2 shadow-xl shadow-violet-200 uppercase tracking-widest hover:bg-violet-700 transition-all">
            <Save size={20} /> Update Bestiary
          </button>
        </div>
      )}
    </div>
  );
};

export default MonsterManagement;