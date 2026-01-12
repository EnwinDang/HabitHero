import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { Map, Lock, ArrowLeft, Flame, Snowflake, Mountain, Zap, Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WorldsAPI } from "@/api/worlds.api";
import { MonstersAPI } from "@/api/monsters.api";
import { UsersAPI } from "@/api/users.api";
import { apiFetch } from "@/api/client";
import { getWorldEndingQuote } from "@/data/worlds";
import { StaminaBar } from "@/components/StaminaBar";
import type { Realm, Level } from "@/models/worldMap.model";
import type { World } from "@/models/world.model";
import type { Monster } from "@/models/monster.model";

export default function WorldMapPage() {
    const { darkMode, accentColor } = useTheme();
    const { user } = useRealtimeUser();
    const theme = getThemeClasses(darkMode, accentColor);
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedWorld, setSelectedWorld] = useState<{ world: World; monsters: Monster[] } | null>(null);
    
    // Check if we're returning from a battle with world completion
    const { showWorldCompletion, completedWorldId, completedWorldName } = location.state || {};

    const userLevel = user?.stats?.level || 1;
    const userXP = user?.stats?.xp || 0;
    const worldMapProgress = user?.worldMapProgress || {};

    // State for Firestore data
    const [worlds, setWorlds] = useState<World[]>([]);
    const [worldMonsters, setWorldMonsters] = useState<Record<string, Monster[]>>({});
    const [loading, setLoading] = useState(true);
    const [completedWorld, setCompletedWorld] = useState<{ world: World; worldName: string } | null>(null);
    const previousCompletionCounts = useRef<Record<string, number>>({});
    const hasCheckedInitialState = useRef(false);
    const lastCheckedWorldProgress = useRef<Record<string, number>>({});
    
    // Stamina state
    const [staminaData, setStaminaData] = useState<{
        currentStamina: number;
        maxStamina: number;
        nextRegenIn: number;
    } | null>(null);
    
    // Game config for tier-based stamina costs
    const [gameConfig, setGameConfig] = useState<{
        stamina: {
            battleCost: {
                normal: number;
                elite: number;
                miniBoss: number;
                boss: number;
            };
        };
    } | null>(null);

    // Fetch stamina data
    useEffect(() => {
        const fetchStamina = async () => {
            if (!user) return;
            
            try {
                const data = await UsersAPI.getStamina(user.uid);
                setStaminaData({
                    currentStamina: data.currentStamina,
                    maxStamina: data.maxStamina,
                    nextRegenIn: data.nextRegenIn,
                });
            } catch (err) {
                console.warn("Failed to fetch stamina:", err);
            }
        };

        fetchStamina();
        // Update stamina every 60 seconds
        const interval = setInterval(fetchStamina, 60000);
        return () => clearInterval(interval);
    }, [user]);
    
    // Fetch game config for tier-based stamina costs
    useEffect(() => {
        const fetchGameConfig = async () => {
            try {
                const config = await apiFetch<{ main: { stamina: { battleCost: any } } }>('/game-config');
                if (config.main?.stamina) {
                    setGameConfig({ stamina: config.main.stamina });
                }
            } catch (err) {
                console.warn("Failed to fetch game config:", err);
            }
        };
        fetchGameConfig();
    }, []);

    // Fetch worlds and monsters from API
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            
            try {
                console.log("🔍 Fetching worlds from API...");
                
                // Get all worlds with unlock status from API
                const worldsData = await WorldsAPI.list(user.uid);
                console.log("📦 Found", worldsData.length, "worlds total");
                
                worldsData.forEach((world: any) => {
                    console.log("🌍 World:", world.worldId, "Unlocked:", world.isUnlocked, "Required Level:", world.requiredLevel);
                });
                
                setWorlds(worldsData);

                // Get ALL monsters from API
                const allMonsters = await MonstersAPI.list();
                console.log("📦 Total monsters in database:", allMonsters.length);

                // For each world, extract monster IDs from stages IN ORDER and match with monster data
                const monstersMap: Record<string, Monster[]> = {};
                
                worldsData.forEach((world) => {
                    const worldData = world as any;
                    const stages = worldData.stages || [];
                    const monsterIdsInOrder: string[] = [];
                    
                    // Extract monster IDs in order from stages (first appearance only)
                    stages.forEach((stage: any) => {
                        if (stage && stage.values && Array.isArray(stage.values)) {
                            stage.values.forEach((id: string) => {
                                if (id && !monsterIdsInOrder.includes(id)) {
                                    monsterIdsInOrder.push(id);
                                }
                            });
                        }
                    });
                    
                    // Match monster IDs with actual monster data, KEEPING THE ORDER
                    const worldMonsters = monsterIdsInOrder.map(id => 
                        allMonsters.find(m => m.monsterId === id)
                    ).filter(m => m !== undefined) as Monster[];
                    
                    monstersMap[world.worldId] = worldMonsters;
                    
                    // Get completed monsters for this world
                    const worldProgress = worldMapProgress[world.worldId];
                    const completedMonsterIndices = worldProgress?.completedLevels || [];
                    console.log("👹", world.name, "has", worldMonsters.length, "monsters, completed:", completedMonsterIndices.length);
                    console.log("📋 Completed indices for", world.name, ":", completedMonsterIndices);
                    console.log("📋 Monster order for", world.name, ":", worldMonsters.map((m, i) => `${i}: ${m.name} (${m.tier})`));
                });
                
                setWorldMonsters(monstersMap);
                console.log("✅ Loaded", worldsData.length, "worlds with monsters");

            } catch (error) {
                console.error("❌ Failed to fetch worlds/monsters:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    // Initialize previous completion counts on first load (don't show animation for already completed worlds)
    useEffect(() => {
        if (!user || !worlds.length || !Object.keys(worldMonsters).length || hasCheckedInitialState.current) return;

        worlds.forEach((world) => {
            const monsters = worldMonsters[world.worldId] || [];
            if (monsters.length <= 2) return;

            const worldProgress = worldMapProgress[world.worldId];
            const completedIndices = worldProgress?.completedLevels || [];
            const completedMonsters = completedIndices.length;
            
            // Store initial state - don't show animation for worlds that were already complete
            previousCompletionCounts.current[world.worldId] = completedMonsters;
        });
        
        hasCheckedInitialState.current = true;
    }, [user, worlds, worldMonsters, worldMapProgress]);

    // Check for newly completed worlds (only when completion count increases)
    useEffect(() => {
        // Don't check until we've initialized the previous counts
        if (!user || !worlds.length || !Object.keys(worldMonsters).length || !hasCheckedInitialState.current) return;

        worlds.forEach((world) => {
            const monsters = worldMonsters[world.worldId] || [];
            if (monsters.length <= 2) return; // Need at least 3 monsters to have a completion

            const worldProgress = worldMapProgress[world.worldId];
            const completedIndices = worldProgress?.completedLevels || [];
            
            // A world is complete when all monsters are defeated
            // First 2 monsters (index 0, 1) are always unlocked, so they don't need to be in completedLevels
            // To unlock monster at index N, we need index N-1 in completedLevels
            // So for a world with 10 monsters (indices 0-9), we need indices 1-8 in completedLevels
            // (index 0 and 1 are always unlocked, index 9 is unlocked when index 8 is completed)
            // Total monsters to complete = monsters.length - 2
            const totalMonstersToComplete = monsters.length - 2;
            const completedMonsters = completedIndices.length;
            
            // Get previous count - if not set, use current count (world was already complete)
            const previousCount = previousCompletionCounts.current[world.worldId];
            const lastCheckedCount = lastCheckedWorldProgress.current[world.worldId] ?? completedMonsters;
            
            // Show animation every time the last monster (boss) is defeated
            // Check if world is complete AND we just detected a change in progress
            const isNowComplete = completedMonsters >= totalMonstersToComplete;
            const isNewCompletion = completedMonsters > lastCheckedCount;
            const justCompletedLastMonster = isNowComplete && completedMonsters === totalMonstersToComplete;
            
            // Show animation if:
            // 1. World is complete (last monster defeated)
            // 2. Progress changed since last check (new monster defeated)
            // 3. This is the last monster (completedMonsters === totalMonstersToComplete)
            if (justCompletedLastMonster && isNewCompletion && totalMonstersToComplete > 0) {
                console.log(`🎉 World ${world.name} just completed! Showing animation...`);
                console.log(`📊 Progress: ${lastCheckedCount} -> ${completedMonsters}, Total needed: ${totalMonstersToComplete}`);
                setCompletedWorld({ world, worldName: world.name });
            }
            
            // Update both tracking refs
            if (previousCount !== undefined) {
                previousCompletionCounts.current[world.worldId] = completedMonsters;
            }
            lastCheckedWorldProgress.current[world.worldId] = completedMonsters;
        });
    }, [user, worlds, worldMonsters, worldMapProgress]);

    // World element themes - 4 elements
    const getWorldTheme = (element: string) => {
        const elem = element.toLowerCase();
        
        switch(elem) {
            case "fire":
                return {
                    element: "fire",
                    color: "#ff5722",
                    gradient: "#ff5722",
                    icon: <Flame size={48} />,
                };
            case "water":
                return {
                    element: "water",
                    color: "#00bcd4",
                    gradient: "#00bcd4",
                    icon: <Snowflake size={48} />,
                };
            case "earth":
                return {
                    element: "earth",
                    color: "#795548",
                    gradient: "#795548",
                    icon: <Mountain size={48} />,
                };
            case "wind":
                return {
                    element: "wind",
                    color: "#9c27b0",
                    gradient: "#9c27b0",
                    icon: <Zap size={48} />,
                };
            default:
                return {
                    element: "fire",
                    color: "#ff5722",
                    gradient: "#ff5722",
                    icon: <Flame size={48} />,
                };
        }
    };

    // Calculate total progress
    const totalMonsters = Object.values(worldMonsters).reduce((sum, monsters) => sum + monsters.length, 0);
    const unlockedMonsters = Object.values(worldMonsters).reduce((sum, monsters) => {
        // Count unlocked monsters per world (first 2 + completed)
        return sum + monsters.reduce((count, monster, index) => {
            const worldId = Object.keys(worldMonsters).find(wid => worldMonsters[wid] === monsters) || '';
            const worldProgress = worldMapProgress[worldId];
            const completedIndices = worldProgress?.completedLevels || [];
            const isUnlocked = index < 2 || completedIndices.includes(index - 1);
            return count + (isUnlocked ? 1 : 0);
        }, 0);
    }, 0);

    if (loading) {
        return (
            <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: accentColor }}></div>
                    <p className={theme.textSubtle}>Loading worlds...</p>
                </div>
            </div>
        );
    }

    // Show message if no worlds
    if (worlds.length === 0) {
        return (
            <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
                <main className="p-8">
                    <div className="mb-8">
                        <h2 className={`text-4xl font-bold ${theme.text} flex items-center gap-3`}>
                            <Map size={40} style={{ color: accentColor }} />
                            World Map
                        </h2>
                    </div>
                    <div className={`${theme.card} rounded-2xl p-12 text-center`}>
                        <p className={`${theme.textSubtle} text-lg mb-4`}>No worlds found in database</p>
                        <p className={`${theme.textSubtle} text-sm`}>
                            Add worlds to the 'worlds' collection in Firestore with fields: name, elementType, isActive
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    console.log("🎨 Rendering", worlds.length, "worlds");

    // World Completion Animation Component
    const WorldCompletionAnimation = () => {
        if (!completedWorld) return null;

        // Get inspirational quote from worlds.ts based on world ID
        const quote = getWorldEndingQuote(completedWorld.world.worldId);

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setCompletedWorld(null)}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ type: "spring", duration: 0.8 }}
                        className="relative max-w-2xl w-full mx-4 p-12 rounded-3xl text-center"
                        style={{
                            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)",
                            border: "2px solid rgba(139, 92, 246, 0.5)",
                            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sparkle effects */}
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                }}
                                animate={{
                                    scale: [0, 1, 0],
                                    opacity: [0, 1, 0],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 2,
                                }}
                            />
                        ))}

                        {/* Trophy icon */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            className="mb-6"
                        >
                            <Trophy size={80} className="mx-auto text-yellow-400" />
                        </motion.div>

                        {/* World name */}
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-4xl md:text-5xl font-bold text-white mb-4"
                        >
                            {completedWorld.worldName}
                        </motion.h2>

                        {/* Completion text */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="text-2xl md:text-3xl text-purple-200 mb-8"
                        >
                            World Conquered!
                        </motion.p>

                        {/* Inspirational quote */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 }}
                            className="relative"
                        >
                            <Sparkles className="absolute -left-8 top-1/2 transform -translate-y-1/2 text-yellow-400" size={24} />
                            <p className="text-xl md:text-2xl italic text-white/90 font-light px-8">
                                "{quote}"
                            </p>
                            <Sparkles className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-yellow-400" size={24} />
                        </motion.div>

                        {/* Close button */}
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                            onClick={() => setCompletedWorld(null)}
                            className="mt-8 px-8 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                            style={{
                                background: `linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%)`,
                                boxShadow: `0 4px 20px ${accentColor}80`,
                            }}
                        >
                            Continue Your Journey
                        </motion.button>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    };

    // World Overview Component
    const WorldOverview = () => (
        <div>
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className={`text-4xl font-bold ${theme.text} flex items-center gap-3`}>
                            <Map size={40} style={{ color: accentColor }} />
                            World Map
                        </h2>
                        <p className={`${theme.textSubtle} mt-2`}>
                            Explore 4 elemental worlds and defeat their monsters
                        </p>
                    </div>
                    {staminaData && (
                        <div className="flex-shrink-0" style={{ minWidth: '300px' }}>
                            <StaminaBar
                                currentStamina={staminaData.currentStamina}
                                maxStamina={staminaData.maxStamina}
                                nextRegenIn={staminaData.nextRegenIn}
                                showTimer={true}
                                size="medium"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Summary */}
            <div
                className="mb-8 p-6 rounded-2xl"
                style={{
                    background: `${accentColor}10`,
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: `${accentColor}40`,
                }}
            >
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className={`text-xl font-bold ${theme.text}`}>Your Progress</h3>
                        <p className={`${theme.textSubtle} text-sm mt-1`}>
                            Hero Level {userLevel} • {userXP} XP
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: accentColor }}>
                            {unlockedMonsters} / {totalMonsters}
                        </p>
                        <p className={`${theme.textSubtle} text-sm`}>Monsters Unlocked</p>
                    </div>
                </div>
            </div>

            {/* Worlds Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {worlds.map((world) => {
                    const monsters = worldMonsters[world.worldId] || [];
                    // Get element from world data
                    const element = (world as any).element || world.elementType || "fire";
                    const worldTheme = getWorldTheme(element);
                    const worldProgress = worldMapProgress[world.worldId];
                    const completedIndices = worldProgress?.completedLevels || [];
                    const unlockedCount = monsters.reduce((count, monster, index) => {
                        const isUnlocked = index < 2 || completedIndices.includes(index - 1);
                        return count + (isUnlocked ? 1 : 0);
                    }, 0);
                    
                    // Check if world is unlocked (from API response or calculate)
                    const worldData = world as any;
                    const isWorldUnlocked = worldData.isUnlocked !== undefined 
                        ? worldData.isUnlocked 
                        : (world.requiredLevel || 1) <= userLevel;
                    const requiredLevel = world.requiredLevel || 1;

                    return (
                        <div
                            key={world.worldId}
                            className={`rounded-2xl p-6 transition-all ${
                                isWorldUnlocked ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-not-allowed opacity-75'
                            }`}
                            style={{
                                background: worldTheme.color,
                                borderWidth: "1px",
                                borderStyle: "solid",
                                borderColor: `${worldTheme.color}80`,
                            }}
                            onClick={() => isWorldUnlocked && setSelectedWorld({ world, monsters })}
                        >
                            <div className="flex items-start gap-4 mb-4">
                                <div className="text-white text-5xl">{worldTheme.icon}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-2xl font-bold text-white mb-1">
                                            {world.name}
                                        </h3>
                                        {!isWorldUnlocked && (
                                            <Lock size={20} className="text-white/80" />
                                        )}
                                    </div>
                                    <p className="text-sm text-white/90 capitalize">
                                        {worldTheme.element} Element
                                    </p>
                                    {!isWorldUnlocked && (
                                        <p className="text-xs text-white/70 mt-1">
                                            Requires Level {requiredLevel}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <p className="text-white/90 mb-4 text-sm">{world.description || "A mysterious elemental realm"}</p>

                            {/* Monsters Progress */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-white/90 mb-2">
                                    <span>Monsters</span>
                                    <span>
                                        {unlockedCount} / {monsters.length} Unlocked
                                    </span>
                                </div>
                                <div className="w-full bg-white/20 rounded-full h-2">
                                    <div
                                        className="bg-white rounded-full h-2 transition-all"
                                        style={{ width: `${monsters.length > 0 ? (unlockedCount / monsters.length) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Enter Button */}
                            <button
                                disabled={!isWorldUnlocked}
                                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all border ${
                                    isWorldUnlocked
                                        ? 'bg-white/20 hover:bg-white/30 text-white border-white/30'
                                        : 'bg-white/10 text-white/50 border-white/10 cursor-not-allowed'
                                }`}
                            >
                                {isWorldUnlocked ? 'Enter World' : `Locked (Level ${requiredLevel} required)`}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Tips Section */}
            <div
                className={`${theme.card} rounded-2xl p-6`}
                style={{
                    ...theme.borderStyle,
                    borderWidth: "1px",
                    borderStyle: "solid",
                }}
            >
                <h3 className={`text-xl font-bold ${theme.text} mb-4`}>
                    World Exploration Tips
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`${theme.inputBg} rounded-xl p-4 text-center`}>
                        <div className="text-3xl mb-2">🔓</div>
                        <p className={`${theme.textSubtle} text-sm`}>
                            First 2 monsters unlocked in each world
                        </p>
                    </div>
                    <div className={`${theme.inputBg} rounded-xl p-4 text-center`}>
                        <div className="text-3xl mb-2">🔥</div>
                        <p className={`${theme.textSubtle} text-sm`}>
                            Each world has unique elemental monsters
                        </p>
                    </div>
                    <div className={`${theme.inputBg} rounded-xl p-4 text-center`}>
                        <div className="text-3xl mb-2">⚔️</div>
                        <p className={`${theme.textSubtle} text-sm`}>
                            Defeat monsters to unlock rewards
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    // World Detail Component
    const WorldDetail = ({ world, monsters }: { world: World; monsters: Monster[] }) => {
        const element = (world as any).element || world.elementType || "fire";
        const worldTheme = getWorldTheme(element);
        
        // Calculate unlocked monsters count from worldMapProgress
        const worldProgress = worldMapProgress[world.worldId];
        const completedIndices = worldProgress?.completedLevels || [];
        const unlockedCount = monsters.reduce((count, monster, index) => {
            const isUnlocked = index < 2 || completedIndices.includes(index - 1);
            return count + (isUnlocked ? 1 : 0);
        }, 0);

        // Navigate to battle with monster data
        const startBattle = async (monster: Monster, isLocked: boolean) => {
            if (isLocked) return;
            
            // Get tier-based stamina cost
            const getStaminaCost = (tier: string): number => {
                if (!gameConfig?.stamina?.battleCost) {
                    // Fallback to default costs if config not available
                    switch (tier) {
                        case 'boss': return 20;
                        case 'miniBoss': return 12;
                        case 'elite': return 8;
                        case 'normal': return 5;
                        default: return 20; // Default to max if unknown tier
                    }
                }
                const costs = gameConfig.stamina.battleCost;
                switch (tier) {
                    case 'boss': return costs.boss || 20;
                    case 'miniBoss': return costs.miniBoss || 12;
                    case 'elite': return costs.elite || 8;
                    case 'normal': return costs.normal || 5;
                    default: return costs.boss || 20; // Default to max if unknown tier
                }
            };
            
            const STAMINA_COST = getStaminaCost(monster.tier || 'normal');
            
            if (user) {
                // Get fresh stamina data
                try {
                    const freshStaminaData = await UsersAPI.getStamina(user.uid);
                    if (freshStaminaData.currentStamina < STAMINA_COST) {
                        alert(`You need at least ${STAMINA_COST} stamina to fight this ${monster.tier || 'normal'} monster. Treat this like a test — review before retrying. You have ${freshStaminaData.currentStamina} stamina.`);
                        return;
                    }
                } catch (err) {
                    console.warn("Could not check stamina, proceeding anyway:", err);
                    // Continue if stamina check fails (backend will also check)
                }
            }

            navigate('/dashboard/battle', {
                state: {
                    worldId: world.worldId,
                    monsterId: monster.monsterId,
                    monsterName: monster.name,
                    element: worldTheme.element
                }
            });
        };

        return (
            <div>
                {/* Back Button */}
                <button
                    onClick={() => setSelectedWorld(null)}
                    className={`mb-6 flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${theme.text}`}
                    style={{
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: `${accentColor}50`,
                        color: accentColor,
                    }}
                >
                    <ArrowLeft size={20} />
                    Back to Map
                </button>

                {/* World Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <span className="text-white text-5xl">{worldTheme.icon}</span>
                        <div>
                            <h2 className={`text-4xl font-bold ${theme.text}`}>{world.name}</h2>
                            <p className={`${theme.textSubtle} mt-1 capitalize`}>{worldTheme.element} Element World</p>
                        </div>
                    </div>
                </div>

                {/* Monsters Grid */}
                <div
                    className="rounded-3xl p-8 mb-8"
                    style={{
                        background: worldTheme.color,
                    }}
                >
                    <h3 className="text-2xl font-bold text-white mb-6">Monsters</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {monsters.map((monster, index) => {
                            // First 2 are always unlocked, plus any completed monsters unlock the next one
                            const worldProgress = worldMapProgress[world.worldId];
                            const completedIndices = worldProgress?.completedLevels || [];
                            const isProgressUnlocked = index < 2 || completedIndices.includes(index - 1);
                            
                            // Get tier-based stamina cost
                            const getStaminaCost = (tier: string): number => {
                                if (!gameConfig?.stamina?.battleCost) return 10; // Fallback
                                const costs = gameConfig.stamina.battleCost;
                                switch (tier) {
                                    case 'boss': return costs.boss || 20;
                                    case 'miniBoss': return costs.miniBoss || 12;
                                    case 'elite': return costs.elite || 8;
                                    case 'normal': return costs.normal || 5;
                                    default: return costs.normal || 5;
                                }
                            };
                            
                            const STAMINA_COST = getStaminaCost(monster.tier || 'normal');
                            const hasEnoughStamina = staminaData ? staminaData.currentStamina >= STAMINA_COST : true;
                            const isUnlocked = isProgressUnlocked && hasEnoughStamina;
                            
                            // Debug logging for boss/miniboss
                            if (monster.tier === 'boss' || monster.tier === 'miniBoss') {
                                console.log(`🔍 [WorldMap] Monster unlock check:`, {
                                    monsterName: monster.name,
                                    monsterId: monster.monsterId,
                                    index,
                                    tier: monster.tier,
                                    completedIndices,
                                    isUnlocked,
                                    check: `index < 2 (${index < 2}) || completedIndices.includes(${index - 1}) (${completedIndices.includes(index - 1)})`
                                });
                            }
                            const tierEmojis = {
                                normal: "⚔️",
                                elite: "🗡️",
                                miniBoss: "👹",
                                boss: "💀"
                            };
                            
                            return (
                                <div
                                    key={monster.monsterId}
                                    onClick={() => startBattle(monster, !isUnlocked)}
                                    className={`rounded-2xl p-6 text-center transition-all ${
                                        !isUnlocked
                                            ? "bg-black/40 cursor-not-allowed"
                                            : "bg-white/80 hover:bg-white/90 cursor-pointer hover:scale-105"
                                    }`}
                                    style={{
                                        borderWidth: "2px",
                                        borderStyle: "solid",
                                        borderColor: !isUnlocked
                                            ? "rgba(255,255,255,0.2)"
                                            : "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    {!isUnlocked ? (
                                        <>
                                            <div className="relative mb-2">
                                                <Lock size={32} className="mx-auto text-white/60" />
                                            </div>
                                            <p className="text-sm text-white/80 font-medium">{monster.name}</p>
                                            <p className="text-xs text-white/50 mt-1 capitalize">{monster.tier}</p>
                                            {!isProgressUnlocked ? (
                                                <p className="text-xs text-white/40 mt-2">🔒 Locked</p>
                                            ) : !hasEnoughStamina && staminaData ? (
                                                <p className="text-xs text-white/40 mt-2">
                                                    ⚡ Need {STAMINA_COST} stamina
                                                </p>
                                            ) : null}
                                        </>
                                    ) : (
                                        <>
                                            <div className="relative mb-2">
                                                <span className="text-3xl">{tierEmojis[monster.tier] || "⚔️"}</span>
                                            </div>
                                            <p
                                                className="text-sm font-bold mb-1"
                                                style={{ color: worldTheme.color }}
                                            >
                                                {monster.name}
                                            </p>
                                            <p className="text-xs text-gray-600 font-medium capitalize">
                                                {monster.tier}
                                            </p>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div
                        className={`${theme.card} rounded-2xl p-6`}
                        style={{
                            ...theme.borderStyle,
                            borderWidth: "1px",
                            borderStyle: "solid",
                        }}
                    >
                        <h3 className={`${theme.textSubtle} text-sm mb-2`}>Total Monsters</h3>
                        <p className="text-3xl font-bold" style={{ color: accentColor }}>
                            {monsters.length}
                        </p>
                    </div>

                    <div
                        className={`${theme.card} rounded-2xl p-6`}
                        style={{
                            ...theme.borderStyle,
                            borderWidth: "1px",
                            borderStyle: "solid",
                        }}
                    >
                        <h3 className={`${theme.textSubtle} text-sm mb-2`}>Element Type</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl text-white">{worldTheme.icon}</span>
                            <p className="text-xl font-bold capitalize" style={{ color: worldTheme.color }}>
                                {worldTheme.element}
                            </p>
                        </div>
                    </div>

                    <div
                        className={`${theme.card} rounded-2xl p-6`}
                        style={{
                            ...theme.borderStyle,
                            borderWidth: "1px",
                            borderStyle: "solid",
                        }}
                    >
                        <h3 className={`${theme.textSubtle} text-sm mb-2`}>Unlocked</h3>
                        <p className="text-xl font-bold" style={{ color: accentColor }}>
                            {unlockedCount} / {monsters.length}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            <WorldCompletionAnimation />
            <main className="p-8 overflow-y-auto">
                {selectedWorld ? (
                    <WorldDetail world={selectedWorld.world} monsters={selectedWorld.monsters} />
                ) : (
                    <WorldOverview />
                )}
            </main>
        </div>
    );
}
