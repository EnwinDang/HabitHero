import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { Map, Lock, ArrowLeft, Flame, Snowflake, Mountain, Zap } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import type { Realm, Level } from "@/models/worldMap.model";
import type { World } from "@/models/world.model";
import type { Monster } from "@/models/monster.model";

export default function WorldMapPage() {
    const { darkMode, accentColor } = useTheme();
    const { user } = useRealtimeUser();
    const theme = getThemeClasses(darkMode, accentColor);
    const navigate = useNavigate();
    const [selectedWorld, setSelectedWorld] = useState<{ world: World; monsters: Monster[] } | null>(null);

    const userLevel = user?.stats?.level || 1;
    const userXP = user?.stats?.xp || 0;
    const worldMapProgress = user?.worldMapProgress || {};

    // State for Firestore data
    const [worlds, setWorlds] = useState<World[]>([]);
    const [worldMonsters, setWorldMonsters] = useState<Record<string, Monster[]>>({});
    const [loading, setLoading] = useState(true);

    // Fetch worlds and monsters from Firestore
    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log("🔍 Fetching worlds from Firestore...");
                
                // Get all worlds (try without isActive filter first)
                const worldsSnapshot = await getDocs(collection(db, "worlds"));
                console.log("📦 Found", worldsSnapshot.docs.length, "worlds total");
                
                const worldsData = worldsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log("🌍 World:", doc.id, data);
                    return {
                        worldId: doc.id,
                        ...data
                    } as World;
                });
                
                setWorlds(worldsData);

                // Get monsters for each world in parallel
                const monstersPromises = worldsData.map(async (world) => {
                    console.log("🔍 Fetching monsters for world:", world.worldId);
                    const monstersSnapshot = await getDocs(
                        query(
                            collection(db, "monsters"),
                            where("worldId", "==", world.worldId)
                        )
                    );
                    console.log("👹 Found", monstersSnapshot.docs.length, "monsters for", world.name);
                    
                    const monsters = monstersSnapshot.docs.map(doc => ({
                        monsterId: doc.id,
                        ...doc.data()
                    } as Monster));
                    
                    return { worldId: world.worldId, monsters };
                });

                const monstersResults = await Promise.all(monstersPromises);
                const monstersMap: Record<string, Monster[]> = {};
                monstersResults.forEach(({ worldId, monsters }) => {
                    monstersMap[worldId] = monsters;
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
    }, []);

    // World element themes - 4 elements
    const getWorldTheme = (element: string) => {
        const elem = element.toLowerCase();
        
        switch(elem) {
            case "fire":
                return {
                    element: "fire",
                    color: "#ff5722",
                    gradient: "linear-gradient(135deg, #ff5722 0%, #ff9800 100%)",
                    icon: <Flame size={48} />,
                };
            case "water":
                return {
                    element: "water",
                    color: "#00bcd4",
                    gradient: "linear-gradient(135deg, #00bcd4 0%, #03a9f4 100%)",
                    icon: <Snowflake size={48} />,
                };
            case "earth":
                return {
                    element: "earth",
                    color: "#795548",
                    gradient: "linear-gradient(135deg, #795548 0%, #8d6e63 100%)",
                    icon: <Mountain size={48} />,
                };
            case "wind":
                return {
                    element: "wind",
                    color: "#9c27b0",
                    gradient: "linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)",
                    icon: <Zap size={48} />,
                };
            default:
                return {
                    element: "fire",
                    color: "#ff5722",
                    gradient: "linear-gradient(135deg, #ff5722 0%, #ff9800 100%)",
                    icon: <Flame size={48} />,
                };
        }
    };

    // Calculate total progress
    const totalMonsters = Object.values(worldMonsters).reduce((sum, monsters) => sum + monsters.length, 0);
    const unlockedMonsters = Object.values(worldMonsters).reduce((sum, monsters) => {
        // First 2 monsters of each world are unlocked
        return sum + Math.min(monsters.length, 2);
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

    // World Overview Component
    const WorldOverview = () => (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h2 className={`text-4xl font-bold ${theme.text} flex items-center gap-3`}>
                    <Map size={40} style={{ color: accentColor }} />
                    World Map
                </h2>
                <p className={`${theme.textSubtle} mt-2`}>
                    Explore 4 elemental worlds and defeat their monsters
                </p>
            </div>

            {/* Progress Summary */}
            <div
                className="mb-8 p-6 rounded-2xl"
                style={{
                    background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 100%)`,
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
                    const unlockedCount = Math.min(monsters.length, 2);

                    return (
                        <div
                            key={world.worldId}
                            className="rounded-2xl p-6 transition-all hover:scale-[1.02] cursor-pointer"
                            style={{
                                background: worldTheme.gradient,
                                borderWidth: "1px",
                                borderStyle: "solid",
                                borderColor: `${worldTheme.color}80`,
                            }}
                            onClick={() => setSelectedWorld({ world, monsters })}
                        >
                            <div className="flex items-start gap-4 mb-4">\
                                <div className="text-white text-5xl">{worldTheme.icon}</div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-white mb-1">
                                        {world.name}
                                    </h3>
                                    <p className="text-sm text-white/90 capitalize">
                                        {worldTheme.element} Element
                                    </p>
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
                                className="w-full py-3 px-4 rounded-xl font-semibold transition-all bg-white/20 hover:bg-white/30 text-white border border-white/30"
                            >
                                Enter World
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

        // Navigate to battle with monster data
        const startBattle = (monster: Monster, isLocked: boolean) => {
            if (isLocked) return;

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
                        background: worldTheme.gradient,
                    }}
                >
                    <h3 className="text-2xl font-bold text-white mb-6">Monsters</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {monsters.map((monster, index) => {
                            const isUnlocked = index < 2; // First 2 unlocked
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
                                            <Lock size={32} className="mx-auto mb-2 text-white/60" />
                                            <p className="text-sm text-white/60 font-medium">Locked</p>
                                            <p className="text-xs text-white/40 mt-1">Defeat previous</p>
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
                            {Math.min(monsters.length, 2)} / {monsters.length}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
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
