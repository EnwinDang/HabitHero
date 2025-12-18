import React, { useEffect, useState } from 'react';
import { WorldsAPI } from "../../api/worlds.api";
import { MonstersAPI } from "../../api/monsters.api";
import { ItemsAPI } from "../../api/items.api";
import { World } from "../../models/world.model";
import { Globe, Ghost, Sword, Plus, Flame, Droplets, Leaf, Zap, Trash2, ChevronRight, Loader2 } from 'lucide-react';

const WorldManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'worlds' | 'monsters' | 'items'>('worlds');
  const [worlds, setWorlds] = useState<World[]>([]);
  const [monsters, setMonsters] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'worlds') {
        const data = await WorldsAPI.list();
        setWorlds(data);
      } else if (activeTab === 'monsters') {
        const data = await MonstersAPI.list();
        setMonsters(data);
      } else if (activeTab === 'items') {
        const data = await ItemsAPI.list();
        setItems(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

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
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Globe className="text-violet-500" size={32} />
            Worlds & Assets
          </h1>
          <p className="text-slate-600 font-medium mt-1">Manage realms, creatures, and equipment</p>
        </div>
        <button className="bg-violet-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-violet-500 transition-all shadow-md shadow-violet-200">
          <Plus size={20} /> {activeTab === 'worlds' ? 'Create Realm' : activeTab === 'monsters' ? 'Add Monster' : 'Add Item'}
        </button>
      </div>

      {/* Tabs */}
      <nav className="flex gap-4 mb-8 bg-white p-2 rounded-2xl border border-violet-100 w-fit">
        <button onClick={() => setActiveTab('worlds')} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'worlds' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-violet-600'}`}>
          <Globe size={18} /> World List
        </button>
        <button onClick={() => setActiveTab('monsters')} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'monsters' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-violet-600'}`}>
          <Ghost size={18} /> Monsters
        </button>
        <button onClick={() => setActiveTab('items')} className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'items' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-violet-600'}`}>
          <Sword size={18} /> Items
        </button>
      </nav>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-violet-500" size={40} /></div>
      ) : activeTab === 'worlds' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {worlds.map((world) => (
            <div
              key={world.worldId}
              className="group relative bg-white border border-violet-100 rounded-[2.5rem] p-8 overflow-hidden hover:border-violet-300 hover:shadow-md transition-all"
            >
              {/* Background Glow based on element */}
              <div
                className={`absolute -right-10 -top-10 w-32 h-32 blur-[80px] opacity-30 pointer-events-none ${
                  world.element === 'fire'
                    ? 'bg-orange-200'
                    : world.element === 'water'
                    ? 'bg-sky-200'
                    : 'bg-violet-200'
                }`}
              ></div>

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="p-3 bg-white rounded-2xl border border-violet-100 shadow-sm">
                  {getElementIcon(world.element || "")}
                </div>
                <button className="text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>

              <h3 className="text-2xl font-semibold text-slate-900 mb-2 relative z-10">{world.name}</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-8 line-clamp-2 relative z-10">
                {world.description}
              </p>

              <div className="flex items-center justify-between pt-6 border-t border-violet-100 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-500">Stages</span>
                  <span className="text-lg font-bold text-slate-900">10 Levels</span>
                </div>
                <button className="w-12 h-12 bg-white border border-violet-100 rounded-full flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-all shadow-sm">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'monsters' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monsters.map((monster: any) => (
            <div key={monster.monsterId} className="bg-white p-6 rounded-[2rem] border border-violet-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500">
                  <Ghost size={24} />
                </div>
                <div className={`w-2 h-2 rounded-full ${monster.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              </div>
              <h3 className="font-bold text-lg text-slate-900">{monster.name}</h3>
              <p className="text-[10px] font-black text-violet-400 uppercase tracking-tighter mb-4">{monster.monsterId}</p>
              {monster.rarity && <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase">{monster.rarity}</span>}
            </div>
          ))}
          <button className="border-2 border-dashed border-violet-200 rounded-[2rem] flex flex-col items-center justify-center p-8 text-violet-300 hover:border-violet-400 hover:text-violet-400 transition-all">
            <Plus size={32} />
            <span className="font-bold mt-2 uppercase text-sm tracking-widest">Add New</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any) => (
            <div key={item.itemId} className="bg-white p-6 rounded-[2rem] border border-violet-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500">
                  <Sword size={24} />
                </div>
                <div className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              </div>
              <h3 className="font-bold text-lg text-slate-900">{item.name}</h3>
              <p className="text-[10px] font-black text-violet-400 uppercase tracking-tighter mb-4">{item.itemId}</p>
              {item.rarity && <span className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase">{item.rarity}</span>}
            </div>
          ))}
          <button className="border-2 border-dashed border-violet-200 rounded-[2rem] flex flex-col items-center justify-center p-8 text-violet-300 hover:border-violet-400 hover:text-violet-400 transition-all">
            <Plus size={32} />
            <span className="font-bold mt-2 uppercase text-sm tracking-widest">Add New</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default WorldManagement;
