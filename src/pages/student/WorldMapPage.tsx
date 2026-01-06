import { useState, useMemo, useEffect } from "react";
import { WorldsAPI } from "@/api/worlds.api";
import { useNavigate } from "react-router-dom";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { Map, Lock, ArrowLeft, Flame, Snowflake, Mountain, Zap, HelpCircle } from "lucide-react";
import { getLevelFromXP, getCurrentLevelProgress } from "@/utils/xpCurve";
import type { Realm, Level } from "@/models/worldMap.model";
import type { BattleEnemy } from "@/models/battle.model";

export default function WorldMapPage() {
    const { darkMode, accentColor } = useTheme();
    const { user } = useRealtimeUser();
    const theme = getThemeClasses(darkMode, accentColor);
    const navigate = useNavigate();
    const [selectedRealm, setSelectedRealm] = useState<Realm | null>(null);

    const userLevel = user?.stats?.xp ? getLevelFromXP(user.stats.xp) : 1;
    const userXP = user?.stats?.xp || 0;
    const worldMapProgress = user?.worldMapProgress || {};

    // Debug logging
    console.log("🗺️ WorldMapPage - User XP:", userXP);
    console.log("🗺️ WorldMapPage - Calculated level from XP:", userLevel);
    console.log("🗺️ WorldMapPage - Stored level (may be outdated):", user?.stats?.level);

    // State for API data
    const [apiWorlds, setApiWorlds] = useState<any[]>([]);
    const [realmStages, setRealmStages] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);

    // Fetch worlds on mount
    useEffect(() => {
        const fetchWorlds = async () => {
            try {
                const worlds = await WorldsAPI.list();
                setApiWorlds(worlds);

                // Fetch stages for all worlds
                const stagesPromises = worlds.map(w => WorldsAPI.stages(w.worldId).then(stages => ({ worldId: w.worldId, stages })));
                const stagesResults = await Promise.all(stagesPromises);

                const newStages: Record<string, any[]> = {};
                stagesResults.forEach(r => {
                    newStages[r.worldId] = r.stages;
                });
                setRealmStages(newStages);

            } catch (error) {
                console.error("Failed to fetch worlds:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchWorlds();
    }, []);

    // Helper to determine realm visuals based on name/id/element
    const getRealmTheme = (name: string, id: string, apiElement?: string): Partial<Realm> => {
        const lowerName = name.toLowerCase();
        const lowerId = id.toLowerCase();
        const element = (apiElement || "").toLowerCase();

        if (element === "fire" || lowerName.includes("fire") || lowerId.includes("fire") || lowerName.includes("inferno")) {
            return {
                element: "fire",
                color: "#ff5722",
                gradient: "linear-gradient(135deg, #ff5722 0%, #ff9800 100%)",
                icon: <Flame size={48} />,
            };
        } else if (element === "ice" || lowerName.includes("ice") || lowerId.includes("ice") || lowerName.includes("frost") || lowerName.includes("glacier")) {
            return {
                element: "ice",
                color: "#00bcd4",
                gradient: "linear-gradient(135deg, #00bcd4 0%, #03a9f4 100%)",
                icon: <Snowflake size={48} />,
            };
        } else if (element === "earth" || lowerName.includes("earth") || lowerId.includes("earth") || lowerName.includes("stone") || lowerName.includes("cave")) {
            return {
                element: "earth",
                color: "#795548",
                gradient: "linear-gradient(135deg, #795548 0%, #8d6e63 100%)",
                icon: <Mountain size={48} />,
            };
        } else if (element === "lightning" || lowerName.includes("storm") || lowerId.includes("lightning") || lowerName.includes("thunder")) {
            return {
                element: "lightning",
                color: "#9c27b0",
                gradient: "linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)",
                icon: <Zap size={48} />,
            };
        }

        // Default / Unknown
        return {
            element: "earth",
            color: "#607d8b",
            gradient: "linear-gradient(135deg, #607d8b 0%, #90a4ae 100%)",
            icon: <HelpCircle size={48} />,
        };
    };

    // Build realms from API data
    const realms: Realm[] = useMemo(() => {
        return apiWorlds.map((world) => {
            const themeProps = getRealmTheme(world.name, world.worldId || world.id || "", world.element || world.elementType);
            const completedLevels = worldMapProgress[world.worldId]?.completedLevels || [];

            const stages = realmStages[world.worldId] || [];
            const levelCount = stages.length > 0 ? stages.length : 10;

            const levels: Level[] = Array.from({ length: levelCount }, (_, i) => {
                const stageData = stages[i];
                const levelId = stageData?.stage || i + 1;
                const name = stageData?.name || `Level ${levelId}`;

                // Unlock logic
                // Simple: Unlocked if previous is completed OR it's level 1
                // We also check userXP based limit as before if desired, or just rely on completion.
                // Let's stick to the previous XP logic combined with sequential unlock.
                // Level 1: always unlocked.
                // Level N: unlocked if Level N-1 completed.
                // AND XP requirement.

                const isCompleted = completedLevels.includes(levelId);
                const prevCompleted = levelId === 1 || completedLevels.includes(levelId - 1);

                // Required XP: Level * 100 (example)
                // const xpReq = (levelId - 1) * 100;
                // const xpUnlocked = userXP >= xpReq;

                return {
                    id: levelId,
                    name: name,
                    completed: isCompleted,
                    locked: !prevCompleted // || !xpUnlocked
                };
            });

            return {
                id: world.worldId,
                name: world.name,
                description: world.description || "Explore this mysterious realm",
                requiredLevel: 1, // Could come from API
                levels,
                ...themeProps,
            } as Realm;
        });
    }, [apiWorlds, realmStages, worldMapProgress, userXP]);

    // Calculate total progress
    const totalLevels = realms.reduce((sum, realm) => sum + realm.levels.length, 0);
    const completedLevels = realms.reduce(
        (sum, realm) => sum + realm.levels.filter((l) => l.completed).length,
        0
    );

    // Realm Overview Component
    const RealmOverview = () => (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h2 className={`text-4xl font-bold ${theme.text} flex items-center gap-3`}>
                    <Map size={40} style={{ color: accentColor }} />
                    World Map
                </h2>
                <p className={`${theme.textSubtle} mt-2`}>
                    Choose your adventure across different realms
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
                            Hero Level {userLevel} • {(() => {
                                const progress = getCurrentLevelProgress(userXP, userLevel);
                                return `${progress.current} / ${progress.required} XP`;
                            })()}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: accentColor }}>
                            {completedLevels}
                        </p>
                        <p className={`${theme.textSubtle} text-sm`}>Levels Completed</p>
                    </div>
                </div>
            </div>

            {/* Realms Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {realms.map((realm) => {
                    const isLocked = userLevel < realm.requiredLevel;
                    const progress = realm.levels.filter((l) => l.completed).length;
                    const total = realm.levels.length;

                    return (
                        <div
                            key={realm.id}
                            className={`rounded-2xl p-6 transition-all ${isLocked ? "opacity-60" : "hover:scale-[1.02] cursor-pointer"
                                }`}
                            style={{
                                background: isLocked
                                    ? darkMode
                                        ? "rgba(88, 28, 135, 0.3)"
                                        : "rgba(139, 92, 246, 0.1)"
                                    : realm.gradient,
                                borderWidth: "1px",
                                borderStyle: "solid",
                                borderColor: isLocked
                                    ? `${accentColor}30`
                                    : `${realm.color}80`,
                            }}
                        >
                            {isLocked ? (
                                <div className="text-center py-8">
                                    <Lock size={48} className="mx-auto mb-4 text-white/60" />
                                    <h3 className="text-2xl font-bold text-white mb-2">Locked</h3>
                                    <p className="text-white/80">Requires Level {realm.requiredLevel}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="text-5xl">{realm.icon}</div>
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-bold text-white mb-1">
                                                {realm.name}
                                            </h3>
                                            <p className="text-sm text-white/90 capitalize">
                                                {realm.element} Element
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-white/90 mb-4 text-sm">{realm.description}</p>

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm text-white/90 mb-2">
                                            <span>Progress</span>
                                            <span>
                                                {progress} / {total}
                                            </span>
                                        </div>
                                        <div className="w-full bg-white/20 rounded-full h-2">
                                            <div
                                                className="bg-white rounded-full h-2 transition-all"
                                                style={{ width: `${(progress / total) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Enter Button */}
                                    <button
                                        onClick={() => setSelectedRealm(realm)}
                                        className="w-full py-3 px-4 rounded-xl font-semibold transition-all bg-white/20 hover:bg-white/30 text-white border border-white/30"
                                    >
                                        Enter World
                                    </button>
                                </>
                            )}
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
                    Tips for World Exploration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`${theme.inputBg} rounded-xl p-4 text-center`}>
                        <div className="text-3xl mb-2">💪</div>
                        <p className={`${theme.textSubtle} text-sm`}>
                            Gain XP to unlock new levels (100 XP per level)
                        </p>
                    </div>
                    <div className={`${theme.inputBg} rounded-xl p-4 text-center`}>
                        <div className="text-3xl mb-2">🔥</div>
                        <p className={`${theme.textSubtle} text-sm`}>
                            Each realm has unique elemental enemies
                        </p>
                    </div>
                    <div className={`${theme.inputBg} rounded-xl p-4 text-center`}>
                        <div className="text-3xl mb-2">🎁</div>
                        <p className={`${theme.textSubtle} text-sm`}>
                            Earn rewards for completing realms
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    // Realm Detail Component
    const RealmDetail = ({ realm }: { realm: Realm }) => {
        const completedCount = realm.levels.filter((l) => l.completed).length;
        const nextLevel = realm.levels.find((l) => !l.completed && !l.locked);

        // Navigate to battle with enemy data
        const startBattle = (level: Level) => {
            if (level.locked || level.completed) return;

            // Navigate to battle page with world and level info
            // The BattlePage will handle fetching the actual enemy via CombatAPI
            navigate('/dashboard/battle', {
                state: {
                    worldId: realm.id,
                    levelId: level.id,
                    levelName: level.name,
                    element: realm.element // Pass element for initial theming
                }
            });
        };

        return (
            <div>
                {/* Back Button */}
                <button
                    onClick={() => setSelectedRealm(null)}
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

                {/* Realm Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <span className="text-5xl">{realm.icon}</span>
                        <div>
                            <h2 className={`text-4xl font-bold ${theme.text}`}>{realm.name}</h2>
                            <p className={`${theme.textSubtle} mt-1`}>{realm.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="text-2xl">{realm.icon}</span>
                        <span className={`${theme.text} font-medium`}>
                            Recommended Level {realm.requiredLevel}
                        </span>
                    </div>
                </div>

                {/* Levels Grid */}
                <div
                    className="rounded-3xl p-8 mb-8"
                    style={{
                        background: realm.gradient,
                    }}
                >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {realm.levels.map((level) => (
                            <div
                                key={level.id}
                                onClick={() => !level.locked && !level.completed && startBattle(level)}
                                className={`rounded-2xl p-6 text-center transition-all ${level.locked
                                    ? "bg-black/30"
                                    : level.completed
                                        ? "bg-white/90"
                                        : "bg-white/70 hover:bg-white/80 cursor-pointer hover:scale-105"
                                    }`}
                                style={{
                                    borderWidth: "2px",
                                    borderStyle: "solid",
                                    borderColor: level.locked
                                        ? "rgba(255,255,255,0.2)"
                                        : level.completed
                                            ? "rgba(34,197,94,0.5)"
                                            : "rgba(255,255,255,0.3)",
                                }}
                            >
                                {level.locked ? (
                                    <>
                                        <Lock size={32} className="mx-auto mb-2 text-white/60" />
                                        <p className="text-sm text-white/60 font-medium">Locked</p>
                                        <p className="text-xs text-white/40 mt-1">
                                            {level.id * 100} XP needed
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="relative mb-2">
                                            <span className="text-3xl">⚔️</span>
                                            {level.completed && (
                                                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                                    <span className="text-white text-xs">✓</span>
                                                </div>
                                            )}
                                        </div>
                                        <p
                                            className="text-sm font-bold mb-1"
                                            style={{ color: realm.color }}
                                        >
                                            {level.id}
                                        </p>
                                        <p className="text-xs text-gray-700 font-medium">
                                            {level.name}
                                        </p>
                                    </>
                                )}
                            </div>
                        ))}
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
                        <h3 className={`${theme.textSubtle} text-sm mb-2`}>
                            Levels Completed
                        </h3>
                        <p className="text-3xl font-bold" style={{ color: accentColor }}>
                            {completedCount} / {realm.levels.length}
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
                            <span className="text-2xl">{realm.icon}</span>
                            <p className="text-xl font-bold capitalize" style={{ color: realm.color }}>
                                {realm.element}
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
                        <h3 className={`${theme.textSubtle} text-sm mb-2`}>Next Challenge</h3>
                        <p className="text-xl font-bold" style={{ color: accentColor }}>
                            {nextLevel ? `Level ${nextLevel.id}` : "All Complete!"}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            <main className="p-8 overflow-y-auto">
                {selectedRealm ? (
                    <RealmDetail realm={selectedRealm} />
                ) : (
                    <RealmOverview />
                )}
            </main>
        </div>
    );
}
