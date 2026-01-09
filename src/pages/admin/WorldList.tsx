import React, { useEffect, useState } from 'react';
import { WorldsAPI } from "../../api/worlds.api";
import { MonstersAPI } from "../../api/monsters.api";
import { World } from "../../models/world.model";
import { Monster } from "../../models/monster.model";
import { Globe, X, Save, Loader2, AlertTriangle, Trash2, Flame, Droplets, Leaf, Zap, Search, Edit3, Copy } from 'lucide-react';

const WorldList: React.FC = () => {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [availableMonsters, setAvailableMonsters] = useState<Monster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<World | null>(null);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(1);

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
      console.error(error);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!selectedWorld) return;
    try {
      await WorldsAPI.patch(selectedWorld.worldId, selectedWorld);
      await loadData();
      setSelectedWorld(null);
    } catch (error) {
      console.error(error);
      alert("Update mislukt");
    }
  };

  const handleCopyStage = (fromIndex: number) => {
    if (!selectedWorld || !selectedWorld.stages) return;
    const targetIndex = window.prompt(`Kopieer monsters van Stage ${fromIndex} naar welk stage nummer?`);
    if (!targetIndex) return;
    
    const targetIdx = parseInt(targetIndex);
    if (isNaN(targetIdx) || targetIdx <= 0 || targetIdx >= (selectedWorld.stages?.length || 0)) {
      alert("Ongeldig stage nummer");
      return;
    }

    const newStages = [...selectedWorld.stages];
    newStages[targetIdx] = { 
      ...newStages[targetIdx], 
      monsters: [...(newStages[fromIndex]?.monsters || [])] 
    };
    
    setSelectedWorld({ ...selectedWorld, stages: newStages });
    setActiveStageIndex(targetIdx);
  };

  const getElementIcon = (element: string | null | undefined) => {
    switch (element?.toLowerCase()) {
      case 'fire': return <Flame className="text-orange-500" size={20} />;
      case 'water': return <Droplets className="text-sky-400" size={20} />;
      case 'earth': return <Leaf className="text-emerald-500" size={20} />;
      default: return <Zap className="text-violet-500" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-[#1a1c2e]">
      <div className="mb-10">
        <h1 className="text-3xl font-black flex items-center gap-3 italic uppercase tracking-tight text-slate-900">
          <Globe className="text-violet-500" size={32} /> Monster Spawns
        </h1>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Beheer monster spawns per stage • Controleer element matching
        </p>
      </div>

      <div className="relative mb-10">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or ID..." 
          className="w-full bg-white border border-violet-100 rounded-[1.5rem] py-5 pl-14 pr-6 outline-none shadow-sm focus:ring-2 focus:ring-violet-500/20 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" size={40} /></div>
      ) : error ? (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-8 text-center">
          <p className="text-rose-700 font-semibold mb-4">⚠️ {error}</p>
          <p className="text-rose-600 text-sm mb-6">Make sure you're logged in as an admin</p>
          <button 
            onClick={loadData}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all font-semibold"
          >
             Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {worlds.map((world) => (
            <div 
              key={world.worldId} 
              className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-violet-100 relative group transition-all hover:border-violet-300"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 bg-slate-50 rounded-[1.25rem]">
                  {getElementIcon(world.element)}
                </div>
                
                {/* Edit knop overgenomen van monster management */}
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedWorld(world);
                    setActiveStageIndex(1);
                  }}
                  className="text-slate-300 hover:text-violet-600 transition-colors p-1"
                >
                  <Edit3 size={18} />
                </button>
              </div>

              <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-slate-900">{world.name}</h3>
              <p className="text-slate-500 text-sm font-medium mb-12 leading-relaxed line-clamp-2">
                {world.description}
              </p>

              <div className="pt-8 border-t border-violet-50 flex justify-between items-center">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stages</span>
                  <span className="text-xl font-black italic text-slate-900">{(world.stages?.length || 1) - 1} Levels</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                  <div className={`w-2 h-2 rounded-full ${world.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
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
              {selectedWorld.stages?.map((_, idx) => idx !== 0 && (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveStageIndex(idx)}
                  className={`py-3 rounded-xl font-black text-xs transition-all ${activeStageIndex === idx ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  S{idx}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
                  Stage {activeStageIndex} Monsters
                </h4>
                <button 
                  onClick={() => handleCopyStage(activeStageIndex)}
                  className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase hover:text-violet-600 transition-colors"
                >
                  <Copy size={14} /> Duplicate
                </button>
              </div>

              {(selectedWorld.stages?.[activeStageIndex]?.monsters || []).map((mId: string, mIdx: number) => {
                const monsterObj = availableMonsters.find(m => m.monsterId === mId);
                const isMismatched = monsterObj && monsterObj.elementType?.toLowerCase() !== selectedWorld.element?.toLowerCase();

                return (
                  <div key={mIdx} className="space-y-2">
                    <div className="flex gap-4 items-center">
                      <select 
                        className={`flex-1 bg-violet-50 border-none rounded-xl p-4 font-bold text-slate-700 text-sm outline-none focus:ring-2 ${isMismatched ? 'ring-rose-500' : 'focus:ring-violet-500'}`}
                        value={mId}
                        onChange={(e) => {
                          if (!selectedWorld.stages) return;
                          const newStages = [...selectedWorld.stages];
                          if (!newStages[activeStageIndex]) newStages[activeStageIndex] = { monsters: [] };
                          newStages[activeStageIndex].monsters[mIdx] = e.target.value;
                          setSelectedWorld({...selectedWorld, stages: newStages});
                        }}
                      >
                        <option value="">Select Monster...</option>
                        {availableMonsters.map(m => (
                          <option key={m.monsterId} value={m.monsterId}>{m.name} ({m.elementType})</option>
                        ))}
                      </select>
                      <button 
                        type="button"
                        onClick={() => {
                          if (!selectedWorld.stages) return;
                          const newStages = [...selectedWorld.stages];
                          newStages[activeStageIndex].monsters.splice(mIdx, 1);
                          setSelectedWorld({...selectedWorld, stages: newStages});
                        }}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {isMismatched && (
                      <div className="flex items-center gap-2 text-rose-500 px-5">
                        <AlertTriangle size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Element mismatch: Monster is {monsterObj?.elementType}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              <button 
                type="button"
                onClick={() => {
                  if (!selectedWorld.stages) return;
                  const newStages = [...selectedWorld.stages];
                  if (!newStages[activeStageIndex]) newStages[activeStageIndex] = { monsters: [] };
                  if (!newStages[activeStageIndex].monsters) newStages[activeStageIndex].monsters = [];
                  newStages[activeStageIndex].monsters.push("");
                  setSelectedWorld({...selectedWorld, stages: newStages});
                }}
                className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-violet-300 hover:text-violet-600 transition-all"
              >
                + Voeg Monster Toe
              </button>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleSave} 
            className="w-full mt-12 bg-violet-600 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-2 shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all uppercase tracking-widest active:scale-[0.98]"
          >
            <Save size={20} /> Update Database
          </button>
        </div>
      )}
    </div>
  );
};

export default WorldList;