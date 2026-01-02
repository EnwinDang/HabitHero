import React, { useEffect, useState } from 'react';
import { WorldsAPI } from "../../api/worlds.api";
import { World } from "../../models/world.model";
import { Globe, Plus, Flame, Droplets, Leaf, Zap, Trash2, ChevronRight, Edit3, X, Save, Ghost } from 'lucide-react';

const WorldManagement: React.FC = () => {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorld, setSelectedWorld] = useState<World | null>(null);

  const loadWorlds = async () => {
    setLoading(true);
    try {
      const data = await WorldsAPI.list();
      setWorlds(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWorlds(); }, []);

  const handleSaveStages = async () => {
    if (!selectedWorld) return;
    try {
      await WorldsAPI.patch(selectedWorld.id || selectedWorld.worldId, { 
        stages: selectedWorld.stages 
      });
      loadWorlds();
      setSelectedWorld(null);
    } catch (error) {
      console.error(error);
    }
  };

  const getElementIcon = (element: string) => {
    switch (element?.toLowerCase()) {
      case 'fire': return <Flame className="text-orange-400" size={20} />;
      case 'water': return <Droplets className="text-sky-400" size={20} />;
      case 'earth': return <Leaf className="text-emerald-500" size={20} />;
      default: return <Zap className="text-violet-500" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-violet-50 p-8 text-slate-900">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Globe className="text-violet-500" size={32} />
            World Engine
          </h1>
          <p className="text-slate-600 font-medium mt-1">Configure the realms of HabitHero</p>
        </div>
        <button className="bg-violet-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-violet-500 transition-all shadow-md shadow-violet-200">
          <Plus size={20} /> Create Realm
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {worlds.map((world) => (
            <div key={world.worldId || world.id} className="group relative bg-white border border-violet-100 rounded-[2.5rem] p-8 overflow-hidden hover:border-violet-300 hover:shadow-md transition-all">
              <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[80px] opacity-30 pointer-events-none ${
                  world.element === 'fire' ? 'bg-orange-200' : world.element === 'water' ? 'bg-sky-200' : 'bg-violet-200'
              }`}></div>

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="p-3 bg-white rounded-2xl border border-violet-100 shadow-sm">
                  {getElementIcon(world.element || "")}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedWorld(world)} className="text-slate-400 hover:text-violet-600 transition-colors">
                    <Edit3 size={18} />
                  </button>
                  <button className="text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-2xl font-semibold text-slate-900 mb-2 relative z-10">{world.name}</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-8 line-clamp-2 relative z-10">{world.description}</p>

              <div className="flex items-center justify-between pt-6 border-t border-violet-100 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-500">Stages</span>
                  <span className="text-lg font-bold text-slate-900">{world.stages?.length || 0} Levels</span>
                </div>
                <button onClick={() => setSelectedWorld(world)} className="w-12 h-12 bg-white border border-violet-100 rounded-full flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-all shadow-sm">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWorld && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 p-8 overflow-y-auto border-l border-violet-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Edit Stages</h2>
              <p className="text-sm text-slate-500 uppercase font-bold tracking-tighter">{selectedWorld.name}</p>
            </div>
            <button onClick={() => setSelectedWorld(null)} className="p-2 hover:bg-violet-50 rounded-full text-slate-400"><X /></button>
          </div>

          <div className="space-y-6">
            {selectedWorld.stages?.map((stage, index) => (
              <div key={index} className="bg-violet-50/50 border border-violet-100 p-5 rounded-[2rem]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-violet-600 uppercase tracking-widest">Level {index}</span>
                  <button className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] text-slate-400 uppercase font-black">Monsters</label>
                  {stage?.values?.map((monsterId: string, mIdx: number) => (
                    <div key={mIdx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-violet-100 shadow-sm">
                      <Ghost size={14} className="text-violet-400" />
                      <input 
                        className="bg-transparent border-none text-xs text-slate-700 focus:ring-0 w-full font-medium"
                        value={monsterId}
                        onChange={(e) => {
                          const newStages = [...(selectedWorld.stages || [])];
                          newStages[index].values[mIdx] = e.target.value;
                          setSelectedWorld({...selectedWorld, stages: newStages});
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleSaveStages}
            className="w-full mt-10 bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-[2rem] flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Save size={20} /> Save Configuration
          </button>
        </div>
      )}
    </div>
  );
};

export default WorldManagement;
