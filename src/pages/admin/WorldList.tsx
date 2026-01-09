import React, { useEffect, useState } from 'react';
import { WorldsAPI } from "../../api/worlds.api";
import { MonstersAPI } from "../../api/monsters.api";
import { World } from "../../models/world.model";
import { Monster } from "../../models/monster.model";
import { Globe, X, Save, Loader2, AlertTriangle, Trash2, Search, Edit3, Copy } from 'lucide-react';

// Wereld afbeeldingen
import worldFire from "../../assets/worlds/world_fire.png";
import worldWater from "../../assets/worlds/world_water.png";
import worldEarth from "../../assets/worlds/world_earth.png";
import worldWind from "../../assets/worlds/world_wind.png";

// Monster afbeeldingen op basis van element
import monsterFire from "../../assets/monsters/monster_fire.png";
import monsterWater from "../../assets/monsters/monster_water.png";
import monsterEarth from "../../assets/monsters/monster_earth.png";
import monsterWind from "../../assets/monsters/monster_wind.png";

const WorldList: React.FC = () => {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [availableMonsters, setAvailableMonsters] = useState<Monster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<any | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState<string>("1");
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [worldsData, monstersData] = await Promise.all([
        WorldsAPI.list(),
        MonstersAPI.list()
      ]);
      setWorlds(worldsData);
      setAvailableMonsters(monstersData);
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to load worlds";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const getWorldImage = (element: string | null | undefined) => {
    switch (element?.toLowerCase()) {
      case 'fire': return worldFire;
      case 'water': return worldWater;
      case 'earth': return worldEarth;
      case 'wind': return worldWind;
      default: return worldEarth;
    }
  };

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
    if (!selectedWorld) return;
    try {
      await WorldsAPI.patch(selectedWorld.worldId, selectedWorld);
      await loadData();
      setSelectedWorld(null);
    } catch (error) {
      alert("Update mislukt");
    }
  };

  const handleCopyStage = (fromKey: string) => {
    if (!selectedWorld || !selectedWorld.stages) return;
    const targetKey = window.prompt(`Kopieer monsters van Stage ${fromKey} naar welk stage nummer?`);
    if (!targetKey) return;
    
    const newStages = { ...selectedWorld.stages };
    newStages[targetKey] = { 
      ...newStages[targetKey], 
      values: [...(newStages[fromKey]?.values || [])] 
    };
    
    setSelectedWorld({ ...selectedWorld, stages: newStages });
    setActiveStageIndex(targetKey);
  };

  const filteredWorlds = worlds.filter(w => 
    w.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.worldId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-[#1a1c2e]">
      <div className="mb-10">
        <h1 className="text-3xl font-black flex items-center gap-3 italic uppercase tracking-tight text-slate-900">
          <Globe className="text-violet-500" size={32} /> Monster Spawns
        </h1>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Beheer monster spawns per stage | Controleer element matching
        </p>
      </div>

      <div className="relative mb-10 group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Search worlds by name or ID..." 
          className="w-full bg-white border border-violet-100 rounded-[2rem] py-5 pl-16 pr-8 outline-none shadow-sm focus:ring-4 focus:ring-violet-500/5 focus:border-violet-200 transition-all font-bold text-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredWorlds.map((world) => (
            <div key={world.worldId} className="bg-white rounded-[2.5rem] shadow-sm border border-violet-100 relative transition-all hover:border-violet-300 overflow-hidden group flex flex-col">
              <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                <img 
                  src={getWorldImage(world.element)} 
                  alt={world.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                <button 
                  onClick={() => { setSelectedWorld(world); setActiveStageIndex("1"); }}
                  className="absolute top-5 right-5 p-3 bg-white/90 backdrop-blur-sm text-slate-400 hover:text-violet-600 rounded-2xl shadow-sm transition-all"
                >
                  <Edit3 size={18} />
                </button>
              </div>

              <div className="p-10 pt-2 flex-1 flex flex-col">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-slate-900">{world.name}</h3>
                <p className="text-slate-500 text-xs font-medium mb-12 line-clamp-2 leading-relaxed">{world.description}</p>
                <div className="mt-auto pt-8 border-t border-violet-50 flex justify-between items-center">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stages</span>
                    <span className="text-xl font-black italic text-slate-900">
                      {world.stages ? Object.keys(world.stages).filter(k => k !== "0").length : 0} Levels
                    </span>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {world.element}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWorld && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 p-10 overflow-y-auto border-l border-violet-100 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Monster Spawns</h2>
            <button onClick={() => setSelectedWorld(null)} className="p-2 hover:bg-violet-50 rounded-full text-slate-400 transition-all"><X size={24} /></button>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-5 gap-2 bg-slate-50 p-2 rounded-[2rem]">
              {selectedWorld.stages && Object.keys(selectedWorld.stages).sort((a,b) => Number(a)-Number(b)).map((key) => key !== "0" && (
                <button
                  key={key}
                  onClick={() => setActiveStageIndex(key)}
                  className={`py-3 rounded-xl font-black text-[10px] tracking-widest transition-all ${activeStageIndex === key ? 'bg-violet-600 text-white shadow-lg shadow-violet-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  S{key}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Stage {activeStageIndex} Monsters</h4>
                <button onClick={() => handleCopyStage(activeStageIndex)} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase hover:text-violet-600 transition-colors">
                  <Copy size={14} /> Duplicate
                </button>
              </div>

              {(selectedWorld.stages?.[activeStageIndex]?.values || []).map((mId: string, mIdx: number) => {
                const monsterObj = availableMonsters.find(m => m.monsterId === mId);
                const isMismatched = monsterObj && monsterObj.elementType?.toLowerCase() !== selectedWorld.element?.toLowerCase();

                return (
                  <div key={mIdx} className="space-y-2">
                    <div className="flex gap-4 items-center">
                      {/* Monster Thumbnail */}
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                        <img src={getMonsterImage(monsterObj?.elementType)} alt="" className="w-full h-full object-contain p-1" />
                      </div>
                      
                      <div className="relative flex-1 group">
                        <select 
                          className={`w-full bg-violet-50/50 border-2 border-transparent rounded-[1.25rem] p-4 pr-12 font-bold text-slate-700 text-sm outline-none transition-all cursor-pointer appearance-none hover:bg-violet-100/50 focus:border-violet-200 focus:bg-white ${
                            isMismatched ? 'border-rose-200 bg-rose-50/30' : ''
                          }`}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 1.25rem center',
                            backgroundSize: '1rem'
                          }}
                          value={mId}
                          onChange={(e) => {
                            const newStages = {...selectedWorld.stages};
                            if (!newStages[activeStageIndex]) newStages[activeStageIndex] = { values: [] };
                            newStages[activeStageIndex].values[mIdx] = e.target.value;
                            setSelectedWorld({...selectedWorld, stages: newStages});
                          }}
                        >
                          <option value="">Select Monster...</option>
                          {availableMonsters.map(m => (
                            <option key={m.monsterId} value={m.monsterId}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        onClick={() => {
                          const newStages = {...selectedWorld.stages};
                          newStages[activeStageIndex].values.splice(mIdx, 1);
                          setSelectedWorld({...selectedWorld, stages: newStages});
                        }} 
                        className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {isMismatched && (
                      <div className="flex items-center gap-2 text-rose-500 px-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertTriangle size={12} />
                        <span className="text-[9px] font-black uppercase tracking-wider">Element mismatch: {monsterObj?.elementType}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              <button 
                onClick={() => {
                  const newStages = {...selectedWorld.stages};
                  if (!newStages[activeStageIndex]) newStages[activeStageIndex] = { values: [] };
                  newStages[activeStageIndex].values.push("");
                  setSelectedWorld({...selectedWorld, stages: newStages});
                }}
                className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-violet-300 hover:text-violet-600 transition-all"
              >
                + Voeg Monster Toe
              </button>
            </div>
          </div>

          <button onClick={handleSave} className="w-full mt-12 bg-violet-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all uppercase tracking-widest active:scale-[0.98]">
            <Save size={20} className="inline mr-2" /> Update Database
          </button>
        </div> 
      )}
    </div>
  );
};

export default WorldList;