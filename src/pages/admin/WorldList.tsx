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

  const getElementIcon = (element: string | null | undefined) => {
    switch (element?.toLowerCase()) {
      case 'fire': return <Flame className="text-orange-500" size={20} />;
      case 'water': return <Droplets className="text-sky-400" size={20} />;
      case 'earth': return <Leaf className="text-emerald-500" size={20} />;
      default: return <Zap className="text-violet-500" size={20} />;
    }
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
        {/* Lettertype aangepast naar de vorige medium stijl */}
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
      ) : error ? (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[2rem] p-10 text-center">
          <p className="text-rose-700 font-black uppercase tracking-widest text-xs mb-4">Fout bij laden: {error}</p>
          <button onClick={loadData} className="px-8 py-3 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100">
            Opnieuw proberen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredWorlds.map((world) => (
            <div key={world.worldId} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-violet-100 relative transition-all hover:border-violet-300">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 bg-slate-50 rounded-[1.25rem]">{getElementIcon(world.element)}</div>
                <button 
                  onClick={() => { setSelectedWorld(world); setActiveStageIndex("1"); }}
                  className="text-slate-300 hover:text-violet-600 transition-colors p-1"
                >
                  <Edit3 size={18} />
                </button>
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-slate-900">{world.name}</h3>
              <p className="text-slate-500 text-xs font-medium mb-12 line-clamp-2 leading-relaxed">{world.description}</p>
              <div className="pt-8 border-t border-violet-50 flex justify-between items-center">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stages</span>
                  <span className="text-xl font-black italic text-slate-900">
                    {world.stages ? Object.keys(world.stages).filter(k => k !== "0").length : 0} Levels
                  </span>
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
                            <option key={m.monsterId} value={m.monsterId}>{m.name} ({m.elementType})</option>
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