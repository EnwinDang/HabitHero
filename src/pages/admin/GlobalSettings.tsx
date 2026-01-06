import React, { useState, useEffect } from 'react';
import { Settings, Sword, Battery, Coins, Save } from 'lucide-react';
import { apiFetch } from '../../api/client';

interface MonsterScaling {
  baseHp: { [worldId: string]: number };
  baseAttack: { [worldId: string]: number };
  scalingFormula: string;
}

interface StaminaSystem {
  maxStamina: number;
  regenerationRate: number; // minutes per point
  stageCost: number;
}

interface ProgressionMultipliers {
  perStageMultiplier: number[];
  xpMultiplier: number;
  goldMultiplier: number;
}

interface PlayerBalance {
  levelCap: number;
  inventoryLimit: number;
  rerollCost: number;
}

const GlobalSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'combat' | 'energy' | 'economy'>('combat');
  const [monsterScaling, setMonsterScaling] = useState<MonsterScaling | null>(null);
  const [staminaSystem, setStaminaSystem] = useState<StaminaSystem | null>(null);
  const [progressionMultipliers, setProgressionMultipliers] = useState<ProgressionMultipliers | null>(null);
  const [playerBalance, setPlayerBalance] = useState<PlayerBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [monster, stamina, progression, player] = await Promise.all([
          apiFetch<MonsterScaling>('/worldConfig/monsterScaling'),
          apiFetch<StaminaSystem>('/worldConfig/staminaSystem'),
          apiFetch<ProgressionMultipliers>('/worldConfig/progressionMultipliers'),
          apiFetch<PlayerBalance>('/worldConfig/playerBalance'),
        ]);
        setMonsterScaling(monster);
        setStaminaSystem(stamina);
        setProgressionMultipliers(progression);
        setPlayerBalance(player);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        apiFetch('/worldConfig/monsterScaling', { method: 'PUT', body: JSON.stringify(monsterScaling) }),
        apiFetch('/worldConfig/staminaSystem', { method: 'PUT', body: JSON.stringify(staminaSystem) }),
        apiFetch('/worldConfig/progressionMultipliers', { method: 'PUT', body: JSON.stringify(progressionMultipliers) }),
        apiFetch('/worldConfig/playerBalance', { method: 'PUT', body: JSON.stringify(playerBalance) }),
      ]);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-violet-50 p-8 flex items-center justify-center">
        <div className="text-violet-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-violet-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="text-violet-500" size={32} />
            Global Settings
          </h1>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-violet-600 text-white px-6 py-3 rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('combat')}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
              activeTab === 'combat' ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600 hover:bg-violet-50'
            }`}
          >
            <Sword size={20} />
            Combat Balance
          </button>
          <button
            onClick={() => setActiveTab('energy')}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
              activeTab === 'energy' ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600 hover:bg-violet-50'
            }`}
          >
            <Battery size={20} />
            Energy System
          </button>
          <button
            onClick={() => setActiveTab('economy')}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
              activeTab === 'economy' ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600 hover:bg-violet-50'
            }`}
          >
            <Coins size={20} />
            Economy
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'combat' && monsterScaling && progressionMultipliers && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-4">Global Monster Scaling</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Base HP per World</label>
                  <textarea
                    value={JSON.stringify(monsterScaling.baseHp, null, 2)}
                    onChange={(e) => setMonsterScaling({ ...monsterScaling, baseHp: JSON.parse(e.target.value) })}
                    className="w-full p-3 border rounded-xl"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Base Attack per World</label>
                  <textarea
                    value={JSON.stringify(monsterScaling.baseAttack, null, 2)}
                    onChange={(e) => setMonsterScaling({ ...monsterScaling, baseAttack: JSON.parse(e.target.value) })}
                    className="w-full p-3 border rounded-xl"
                    rows={4}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Scaling Formula</label>
                <input
                  type="text"
                  value={monsterScaling.scalingFormula}
                  onChange={(e) => setMonsterScaling({ ...monsterScaling, scalingFormula: e.target.value })}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-4">Progression Multipliers</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Stage Multipliers</label>
                  <textarea
                    value={progressionMultipliers.perStageMultiplier.join(', ')}
                    onChange={(e) => setProgressionMultipliers({
                      ...progressionMultipliers,
                      perStageMultiplier: e.target.value.split(',').map(v => parseFloat(v.trim()))
                    })}
                    className="w-full p-3 border rounded-xl"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">XP Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={progressionMultipliers.xpMultiplier}
                    onChange={(e) => setProgressionMultipliers({ ...progressionMultipliers, xpMultiplier: parseFloat(e.target.value) })}
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Gold Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={progressionMultipliers.goldMultiplier}
                    onChange={(e) => setProgressionMultipliers({ ...progressionMultipliers, goldMultiplier: parseFloat(e.target.value) })}
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'energy' && staminaSystem && (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Stamina System</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max Stamina</label>
                <input
                  type="number"
                  value={staminaSystem.maxStamina}
                  onChange={(e) => setStaminaSystem({ ...staminaSystem, maxStamina: parseInt(e.target.value) })}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Regeneration Rate (minutes per point)</label>
                <input
                  type="number"
                  step="0.1"
                  value={staminaSystem.regenerationRate}
                  onChange={(e) => setStaminaSystem({ ...staminaSystem, regenerationRate: parseFloat(e.target.value) })}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stage Cost</label>
                <input
                  type="number"
                  value={staminaSystem.stageCost}
                  onChange={(e) => setStaminaSystem({ ...staminaSystem, stageCost: parseInt(e.target.value) })}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'economy' && playerBalance && (
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Player & Economy Balance</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Level Cap</label>
                <input
                  type="number"
                  value={playerBalance.levelCap}
                  onChange={(e) => setPlayerBalance({ ...playerBalance, levelCap: parseInt(e.target.value) })}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Inventory Limit</label>
                <input
                  type="number"
                  value={playerBalance.inventoryLimit}
                  onChange={(e) => setPlayerBalance({ ...playerBalance, inventoryLimit: parseInt(e.target.value) })}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Reroll Cost</label>
                <input
                  type="number"
                  value={playerBalance.rerollCost}
                  onChange={(e) => setPlayerBalance({ ...playerBalance, rerollCost: parseInt(e.target.value) })}
                  className="w-full p-3 border rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSettings;