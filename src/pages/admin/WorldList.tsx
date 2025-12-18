import React, { useEffect, useState } from 'react';
import { WorldsAPI } from "../../api/worlds.api";
import { World } from "../../models/world.model";
import { Globe, Edit3, X, Save, Ghost, Loader2 } from 'lucide-react';

const WorldList: React.FC = () => {
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

  useEffect(() => {
    loadWorlds();
  }, []);

  const handleSave = async () => {
    if (!selectedWorld) return;
    try {
      await WorldsAPI.patch(selectedWorld.worldId, selectedWorld);
      loadWorlds();
      setSelectedWorld(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-violet-50 p-8">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 italic uppercase">
          <Globe className="text-violet-500" size={32} /> World List
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="animate-spin text-violet-500" size={40} />
        </div>
      ) : (
        <div className="grid gap-4">
          {worlds.map((world) => (
            <div key={world.worldId} className="bg-white border border-violet-100 p-6 rounded-[2rem] flex items-center justify-between hover:shadow-md transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500 font-black border border-violet-100">
                  {world.name ? world.name[0] : '?'}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{world.name}</h3>
                  <p className="text-slate-500 text-sm italic">{world.element} realm</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stages</p>
                  <p className="font-bold text-slate-900">{world.stages?.length || 0} Levels</p>
                </div>
                <button 
                  onClick={() => setSelectedWorld(world)}
                  className="p-4 bg-violet-600 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                >
                  <Edit3 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWorld && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 p-8 overflow-y-auto border-l border-violet-100">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold">Edit {selectedWorld.name}</h2>
            <button onClick={() => setSelectedWorld(null)} className="p-2 hover:bg-violet-50 rounded-full text-slate-400">
              <X />
            </button>
          </div>

          <div className="space-y-6">
            {selectedWorld.stages?.map((stage, idx) => (
              stage && (
                <div key={idx} className="bg-violet-50 p-4 rounded-2xl border border-violet-100">
                  <p className="text-[10px] font-black text-violet-600 uppercase mb-3 tracking-widest">Level {idx}</p>
                  <div className="space-y-2">
                    {stage.values?.map((monsterId: string, mIdx: number) => (
                      <div key={mIdx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-violet-100">
                        <Ghost size={14} className="text-violet-400" />
                        <input 
                          className="text-xs font-medium w-full outline-none bg-transparent" 
                          value={monsterId}
                          onChange={(e) => {
                            const newStages = [...selectedWorld.stages!];
                            newStages[idx].values[mIdx] = e.target.value;
                            setSelectedWorld({...selectedWorld, stages: newStages});
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          <button 
            onClick={handleSave} 
            className="w-full mt-10 bg-violet-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
          >
            <Save size={20} /> Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default WorldList;