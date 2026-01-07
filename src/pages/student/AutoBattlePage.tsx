import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { Swords, Play, RotateCcw, ArrowLeft, Crown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleEnemy, BattlePlayer, BattleState, BattleLog } from "@/models/battle.model";
import { CombatAPI } from "@/api/combat.api";
import { MonstersAPI } from "@/api/monsters.api";
import { WorldsAPI } from "@/api/worlds.api";
import { apiFetch } from "@/api/client";

export default function AutoBattlePage() {
    const { darkMode, accentColor } = useTheme();
    const { user } = useRealtimeUser();
    const theme = getThemeClasses(darkMode, accentColor);
    const navigate = useNavigate();

    const [worldId, setWorldId] = useState<string | null>(null);
    const [stage, setStage] = useState<number>(1);
    const [combatId, setCombatId] = useState<string | null>(null);
    const [enemy, setEnemy] = useState<BattleEnemy | null>(null);
    const [player, setPlayer] = useState<BattlePlayer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [monsterTier, setMonsterTier] = useState<'normal' | 'elite' | 'miniBoss' | 'boss'>('normal');
    const [showBossAnimation, setShowBossAnimation] = useState(false);
    const [battleRewards, setBattleRewards] = useState<{ xp: number; gold: number } | null>(null);
    const [hpLost, setHpLost] = useState<number>(0);

    // Battle state
    const [battleState, setBattleState] = useState<BattleState>({
        playerHP: 100,
        enemyHP: 100,
        isActive: false,
        isPaused: false,
        winner: null,
        logs: [],
        turn: 0,
    });

    const battleInterval = useRef<number | null>(null);

    // Initialize battle data
    useEffect(() => {
        const initBattle = async () => {
            if (!user) return;

            try {
                setLoading(true);
                setError(null);

                // 1. Get available worlds
                const worlds = await WorldsAPI.list();
                if (worlds.length === 0) {
                    setError("No worlds available");
                    setLoading(false);
                    return;
                }

                const firstWorld = worlds[0];
                setWorldId(firstWorld.worldId);
                // Default to stage 1, but can be changed
                const initialStage = 1;
                setStage(initialStage);

                // 2. Get player stats from API
                const playerStats = await apiFetch<{
                    level: number;
                    attack: number;
                    defense: number;
                    health: number;
                    magic: number;
                    magicResist: number;
                }>(`/combat/player-stats/${user.stats?.level || 1}`);

                const newPlayer: BattlePlayer = {
                    name: user.displayName || "Hero",
                    level: playerStats.level,
                    hp: playerStats.health,
                    maxHP: playerStats.health,
                    attack: playerStats.attack,
                    defense: playerStats.defense,
                    speed: 50 + playerStats.level * 3,
                    emoji: "⚔️",
                };
                setPlayer(newPlayer);
                setBattleState(prev => ({ ...prev, playerHP: newPlayer.hp }));

                // Determine monster tier based on stage number
                // Levels 1-4: normal, Level 5: miniBoss, Levels 6-9: elite, Level 10: boss
                const determineTierFromStage = (stage: number): 'normal' | 'elite' | 'miniBoss' | 'boss' => {
                    if (stage === 10) return 'boss';
                    if (stage === 5) return 'miniBoss';
                    if (stage >= 6 && stage <= 9) return 'elite';
                    return 'normal'; // stages 1-4
                };

                const requiredTier = determineTierFromStage(initialStage);
                console.log(`Stage ${initialStage} requires tier: ${requiredTier}`);

                // 3. Start combat session
                const combat = await CombatAPI.start({
                    worldId: firstWorld.worldId,
                    stage: initialStage,
                });
                setCombatId(combat.combatId);

                // 4. Get monster stats
                const monsterStats = await apiFetch<{
                    worldId: string;
                    stage: number;
                    attack: number;
                    hp: number;
                }>(`/combat/monster-stats/${firstWorld.worldId}/${initialStage}`);

                // 5. Get monsters from the world, filtered by required tier
                let monsters = await MonstersAPI.list({ worldId: firstWorld.worldId });
                
                // If no monsters found for this world, try getting all active monsters
                if (monsters.length === 0) {
                    console.log(`No monsters found for world ${firstWorld.worldId}, trying all monsters...`);
                    monsters = await MonstersAPI.list();
                }
                
                // Filter to only active monsters with the required tier
                const activeMonsters = monsters.filter(m => 
                    m.isActive !== false && m.tier === requiredTier
                );
                
                // If no monsters with exact tier, try to get any active monsters as fallback
                if (activeMonsters.length === 0) {
                    console.warn(`No ${requiredTier} monsters found, trying any active monsters...`);
                    const anyActiveMonsters = monsters.filter(m => m.isActive !== false);
                    if (anyActiveMonsters.length === 0) {
                        setError("No monsters available in the database. Please add monsters first.");
                        setLoading(false);
                        return;
                    }
                    // Use first available monster but keep the required tier for display
                    activeMonsters.push(anyActiveMonsters[0]);
                }

                // Select a random monster from available monsters with correct tier
                const selectedMonster = activeMonsters[Math.floor(Math.random() * activeMonsters.length)];
                
                console.log(`Selected monster: ${selectedMonster.name} (${selectedMonster.monsterId}), tier: ${selectedMonster.tier}, required tier: ${requiredTier}`);

                // Store monster tier (use required tier for consistency)
                setMonsterTier(requiredTier);

                const newEnemy: BattleEnemy = {
                    id: selectedMonster.monsterId,
                    name: selectedMonster.name, // Use actual monster name from database
                    level: initialStage,
                    element: (selectedMonster.elementType as any) || 'fire',
                    hp: monsterStats.hp,
                    maxHP: monsterStats.hp,
                    attack: monsterStats.attack,
                    defense: selectedMonster.baseStats?.defense || 5,
                    speed: selectedMonster.baseStats?.speed || 10,
                    emoji: "👾",
                    realmId: firstWorld.worldId,
                    levelId: initialStage,
                };
                setEnemy(newEnemy);
                setBattleState(prev => ({ ...prev, enemyHP: newEnemy.maxHP }));

                // Show boss animation if it's a boss or miniBoss (based on stage, not monster tier)
                if (requiredTier === 'boss' || requiredTier === 'miniBoss') {
                    setShowBossAnimation(true);
                }

            } catch (err: any) {
                console.error("Battle Init Error:", err);
                setError("Failed to initialize battle. " + (err.message || ""));
            } finally {
                setLoading(false);
            }
        };

        if (user && !combatId) {
            initBattle();
        }
    }, [user, combatId]);

    // Auto-start battle when ready (after boss animation if applicable)
    useEffect(() => {
        if (!loading && player && enemy && !battleState.isActive && !battleState.winner && !showBossAnimation) {
            // Auto-start after a short delay
            const timer = setTimeout(() => {
                runBattle();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading, player, enemy, battleState.isActive, battleState.winner, showBossAnimation]);

    // Add log entry
    const addLog = (message: string, type: BattleLog['type'] = 'info') => {
        setBattleState(prev => ({
            ...prev,
            logs: [...prev.logs, { message, timestamp: Date.now(), type }],
        }));
    };

    // Calculate damage
    const calculateDamage = (attacker: { attack: number }, defender: { defense: number }) => {
        const baseDamage = attacker.attack - defender.defense;
        return Math.max(1, baseDamage + Math.floor(Math.random() * 5));
    };

    // Battle simulation
    const runBattle = () => {
        if (!enemy || !player) return;

        setBattleState(prev => ({
            ...prev,
            isActive: true,
            isPaused: false,
            winner: null,
            logs: [],
        }));

        addLog(`A wild ${enemy.name} appears!`, 'info');
        addLog('Auto-battle started!', 'info');

        let currentPlayerHP = player.hp;
        let currentEnemyHP = enemy.hp;
        let turn = 0;

        battleInterval.current = window.setInterval(() => {
            turn++;

            // Determine who attacks first based on speed
            const playerFirst = player.speed >= enemy.speed;

            if (playerFirst) {
                // Player attacks
                const damage = calculateDamage(player, enemy);
                currentEnemyHP -= damage;

                setBattleState(prev => ({ ...prev, enemyHP: Math.max(0, currentEnemyHP), turn }));
                addLog(`${player.name} attacks ${enemy.name} for ${damage} damage!`, 'attack');

                if (currentEnemyHP <= 0) {
                    endBattle('player');
                    return;
                }

                // Enemy attacks back
                setTimeout(() => {
                    const enemyDamage = calculateDamage(enemy, player);
                    currentPlayerHP -= enemyDamage;

                    setBattleState(prev => ({ ...prev, playerHP: Math.max(0, currentPlayerHP) }));
                    addLog(`${enemy.name} attacks ${player.name} for ${enemyDamage} damage!`, 'damage');

                    if (currentPlayerHP <= 0) {
                        endBattle('enemy');
                    }
                }, 500);
            } else {
                // Enemy attacks first
                const enemyDamage = calculateDamage(enemy, player);
                currentPlayerHP -= enemyDamage;

                setBattleState(prev => ({ ...prev, playerHP: Math.max(0, currentPlayerHP), turn }));
                addLog(`${enemy.name} attacks ${player.name} for ${enemyDamage} damage!`, 'damage');

                if (currentPlayerHP <= 0) {
                    endBattle('enemy');
                    return;
                }

                // Player attacks back
                setTimeout(() => {
                    const damage = calculateDamage(player, enemy);
                    currentEnemyHP -= damage;

                    setBattleState(prev => ({ ...prev, enemyHP: Math.max(0, currentEnemyHP) }));
                    addLog(`${player.name} attacks ${enemy.name} for ${damage} damage!`, 'attack');

                    if (currentEnemyHP <= 0) {
                        endBattle('player');
                    }
                }, 500);
            }
        }, 1500); // Battle speed: 1.5 seconds per turn
    };

    // End battle
    const endBattle = async (winner: 'player' | 'enemy') => {
        if (battleInterval.current) {
            clearInterval(battleInterval.current);
        }

        setBattleState(prev => ({
            ...prev,
            isActive: false,
            winner,
        }));

        if (winner === 'player') {
            addLog(`Victory! ${enemy?.name} has been defeated!`, 'victory');

            // Resolve on backend
            if (combatId) {
                try {
                    addLog("Saving progress...", 'info');
                    const result = await CombatAPI.resolve(combatId);
                    if (result.reward) {
                        // Backend returns xp and gold, but interface expects xpGained and goldGained
                        const xp = (result.reward as any).xp || (result.reward as any).xpGained || 0;
                        const gold = (result.reward as any).gold || (result.reward as any).goldGained || 0;
                        
                        // Store rewards for display
                        setBattleRewards({ xp, gold });
                        
                        addLog(`🎉 You earned ${xp} XP and ${gold} Gold!`, 'victory');
                    }
                } catch (err) {
                    console.error("Failed to resolve combat:", err);
                    addLog("Error saving results to server.", 'defeat');
                }
            }
        } else {
            // Calculate HP lost
            if (player) {
                const lost = player.maxHP - battleState.playerHP;
                setHpLost(lost);
                addLog(`💔 You lost ${lost} HP!`, 'defeat');
            }
            addLog(`Defeat! ${player?.name} has been defeated!`, 'defeat');
        }
    };

    // Reset battle (Retry)
    const resetBattle = () => {
        if (battleInterval.current) {
            clearInterval(battleInterval.current);
        }
        setCombatId(null);
        setBattleRewards(null);
        setHpLost(0);
        setBattleState({
            playerHP: player?.hp || 100,
            enemyHP: enemy?.maxHP || 100,
            isActive: false,
            isPaused: false,
            winner: null,
            logs: [],
            turn: 0,
        });
        // Reload to reinitialize
        window.location.reload();
    };

    // Handle boss animation completion
    useEffect(() => {
        if (showBossAnimation) {
            // Hide animation after 3 seconds and start battle
            const timer = setTimeout(() => {
                setShowBossAnimation(false);
                // Start battle after animation
                setTimeout(() => {
                    runBattle();
                }, 500);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showBossAnimation]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (battleInterval.current) {
                clearInterval(battleInterval.current);
            }
        };
    }, []);

    // Loading / Error States
    if (loading) {
        return (
            <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
                <div className="text-center">
                    <Swords size={64} className={`mx-auto mb-4 animate-pulse`} style={{ color: accentColor }} />
                    <h2 className={`text-2xl font-bold ${theme.text}`}>Preparing Battle...</h2>
                </div>
            </div>
        );
    }

    if (error || !enemy || !player) {
        return (
            <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
                <main className="p-8">
                    <div className={`${theme.card} rounded-2xl p-8 text-center`}>
                        <Swords size={64} className="mx-auto mb-4" style={{ color: accentColor }} />
                        <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>
                            {error || "No Enemy or Player Loaded"}
                        </h2>
                        <button
                            onClick={() => navigate('/student/world-map')}
                            className="px-6 py-3 rounded-xl font-semibold transition-all"
                            style={{
                                backgroundColor: accentColor,
                                color: 'white',
                            }}
                        >
                            Back to World Map
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const playerHPPercent = (battleState.playerHP / player.maxHP) * 100;
    const enemyHPPercent = (battleState.enemyHP / enemy.maxHP) * 100;

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            {/* Boss Animation Overlay */}
            <AnimatePresence>
                {showBossAnimation && enemy && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{
                            background: 'rgba(0, 0, 0, 0.9)',
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-center"
                        >
                            {/* Boss Title */}
                            <motion.div
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mb-8"
                            >
                                {monsterTier === 'boss' ? (
                                    <Crown size={80} className="mx-auto mb-4" style={{ color: '#FFD700' }} />
                                ) : (
                                    <AlertTriangle size={80} className="mx-auto mb-4" style={{ color: '#FF6B6B' }} />
                                )}
                                <h1
                                    className="text-6xl font-bold mb-4"
                                    style={{
                                        color: monsterTier === 'boss' ? '#FFD700' : '#FF6B6B',
                                        textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
                                    }}
                                >
                                    {monsterTier === 'boss' ? 'BOSS BATTLE!' : 'MINI BOSS!'}
                                </h1>
                            </motion.div>

                            {/* Monster Name */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="mb-8"
                            >
                                <div
                                    className="text-5xl mb-4"
                                    style={{
                                        filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))',
                                    }}
                                >
                                    {enemy.emoji}
                                </div>
                                <h2
                                    className="text-4xl font-bold"
                                    style={{
                                        color: '#FFFFFF',
                                        textShadow: '0 0 15px rgba(255, 255, 255, 0.8)',
                                    }}
                                >
                                    {enemy.name}
                                </h2>
                            </motion.div>

                            {/* Warning Text */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="text-xl"
                                style={{ color: '#FFD700' }}
                            >
                                Prepare for an epic battle!
                            </motion.div>

                            {/* Pulsing Effect */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/student/world-map')}
                        className="flex items-center gap-2 mb-4 text-sm hover:opacity-80 transition-opacity"
                        style={{ color: accentColor }}
                    >
                        <ArrowLeft size={20} />
                        Back to World Map
                    </button>
                    <h2 className={`text-4xl font-bold ${theme.text} flex items-center gap-3`}>
                        <Swords size={40} style={{ color: accentColor }} />
                        Auto Battle Arena
                    </h2>
                    <p className={`${theme.textSubtle} mt-2`}>
                        {worldId} - Stage {stage}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Battle Arena - Left/Center */}
                    <div className="lg:col-span-2">
                        <div
                            className="rounded-3xl p-8 min-h-[500px] flex flex-col"
                            style={{
                                background: `linear-gradient(135deg, ${accentColor}40 0%, ${accentColor}20 100%)`,
                                borderWidth: "2px",
                                borderStyle: "solid",
                                borderColor: `${accentColor}60`,
                            }}
                        >
                            {/* VS Display */}
                            <div className="flex-1 flex items-center justify-around">
                                {/* Player */}
                                <div className="text-center">
                                    <div
                                        className="w-32 h-32 rounded-2xl flex items-center justify-center mb-4 mx-auto"
                                        style={{
                                            backgroundColor: darkMode ? "rgba(100, 116, 139, 0.5)" : "rgba(148, 163, 184, 0.3)",
                                            borderWidth: "2px",
                                            borderStyle: "solid",
                                            borderColor: `${accentColor}80`,
                                        }}
                                    >
                                        <span className="text-6xl">{player.emoji}</span>
                                    </div>
                                    <h3 className={`text-2xl font-bold ${theme.text} mb-1`}>
                                        {player.name}
                                    </h3>
                                    <p className={`${theme.textSubtle} text-sm mb-4`}>
                                        Level {player.level} Hero
                                    </p>

                                    {/* Player HP Bar */}
                                    <div className="w-48">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className={theme.text}>HP</span>
                                            <span className={theme.text}>
                                                {Math.max(0, Math.floor(battleState.playerHP))} / {player.maxHP}
                                            </span>
                                        </div>
                                        <div className={`w-full ${theme.inputBg} rounded-full h-3`}>
                                            <div
                                                className="bg-green-500 rounded-full h-3 transition-all duration-500"
                                                style={{ width: `${playerHPPercent}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-4 mt-3 text-xs">
                                            <span className={theme.textSubtle}>⚔️ {player.attack}</span>
                                            <span className={theme.textSubtle}>🛡️ {player.defense}</span>
                                            <span className={theme.textSubtle}>⚡ {player.speed}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* VS Badge */}
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                                    style={{
                                        backgroundColor: 'white',
                                        color: accentColor,
                                        boxShadow: `0 0 30px ${accentColor}50`,
                                    }}
                                >
                                    VS
                                </div>

                                {/* Enemy */}
                                <div className="text-center">
                                    <div
                                        className="w-32 h-32 rounded-2xl flex items-center justify-center mb-4 mx-auto"
                                        style={{
                                            background: enemy.element === 'fire'
                                                ? 'linear-gradient(135deg, #ff5722 0%, #ff9800 100%)'
                                                : enemy.element === 'ice'
                                                    ? 'linear-gradient(135deg, #00bcd4 0%, #03a9f4 100%)'
                                                    : enemy.element === 'earth'
                                                        ? 'linear-gradient(135deg, #795548 0%, #8d6e63 100%)'
                                                        : 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
                                            borderWidth: "2px",
                                            borderStyle: "solid",
                                            borderColor: 'rgba(255,255,255,0.5)',
                                        }}
                                    >
                                        <span className="text-6xl">{enemy.emoji}</span>
                                    </div>
                                    <h3 className={`text-2xl font-bold ${theme.text} mb-1`}>
                                        {enemy.name}
                                    </h3>
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <p className={`${theme.textSubtle} text-sm`}>
                                            Level {enemy.level}
                                        </p>
                                        <span
                                            className="px-2 py-1 rounded text-xs font-semibold text-white capitalize"
                                            style={{
                                                backgroundColor: enemy.element === 'fire' ? '#ff5722'
                                                    : enemy.element === 'ice' ? '#00bcd4'
                                                        : enemy.element === 'earth' ? '#795548'
                                                            : '#9c27b0',
                                            }}
                                        >
                                            {enemy.element}
                                        </span>
                                    </div>

                                    {/* Enemy HP Bar */}
                                    <div className="w-48">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className={theme.text}>HP</span>
                                            <span className={theme.text}>
                                                {Math.max(0, Math.floor(battleState.enemyHP))} / {enemy.maxHP}
                                            </span>
                                        </div>
                                        <div className={`w-full ${theme.inputBg} rounded-full h-3`}>
                                            <div
                                                className="bg-red-500 rounded-full h-3 transition-all duration-500"
                                                style={{ width: `${enemyHPPercent}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-4 mt-3 text-xs">
                                            <span className={theme.textSubtle}>⚔️ {enemy.attack}</span>
                                            <span className={theme.textSubtle}>🛡️ {enemy.defense}</span>
                                            <span className={theme.textSubtle}>⚡ {enemy.speed}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Battle Results Display */}
                            {battleState.winner && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="mb-6"
                                >
                                    {battleState.winner === 'player' && battleRewards && (
                                        <div
                                            className="rounded-2xl p-6 text-center"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
                                                borderWidth: "2px",
                                                borderStyle: "solid",
                                                borderColor: '#22c55e',
                                            }}
                                        >
                                            <h3 className="text-2xl font-bold text-green-600 mb-4">🎉 Victory!</h3>
                                            <div className="flex items-center justify-center gap-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-3xl">⭐</span>
                                                    <div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">XP Earned</p>
                                                        <p className="text-2xl font-bold text-green-600">+{battleRewards.xp}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-3xl">🪙</span>
                                                    <div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">Gold Earned</p>
                                                        <p className="text-2xl font-bold text-yellow-600">+{battleRewards.gold}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {battleState.winner === 'enemy' && hpLost > 0 && (
                                        <div
                                            className="rounded-2xl p-6 text-center"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
                                                borderWidth: "2px",
                                                borderStyle: "solid",
                                                borderColor: '#ef4444',
                                            }}
                                        >
                                            <h3 className="text-2xl font-bold text-red-600 mb-4">💔 Defeat!</h3>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-3xl">❤️</span>
                                                <div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">HP Lost</p>
                                                    <p className="text-2xl font-bold text-red-600">-{hpLost}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Battle Controls */}
                            <div className="mt-8 flex gap-4 justify-center">
                                {battleState.winner && (
                                    <>
                                        <button
                                            onClick={resetBattle}
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all"
                                            style={{
                                                borderWidth: "2px",
                                                borderStyle: "solid",
                                                borderColor: `${accentColor}80`,
                                                color: accentColor,
                                            }}
                                        >
                                            <RotateCcw size={20} />
                                            Retry Battle
                                        </button>
                                        <button
                                            onClick={() => navigate('/student/world-map')}
                                            className="px-6 py-3 rounded-xl font-semibold text-white transition-all"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            Back to World Map
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Battle Log - Right */}
                    <div>
                        <div
                            className={`${theme.card} rounded-2xl p-6 h-[500px] flex flex-col`}
                            style={{
                                ...theme.borderStyle,
                                borderWidth: "1px",
                                borderStyle: "solid",
                            }}
                        >
                            <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Battle Log</h3>

                            <div className="flex-1 overflow-y-auto space-y-2">
                                {battleState.logs.length === 0 ? (
                                    <p className={`${theme.textSubtle} text-sm text-center mt-8`}>
                                        Battle log will appear here...
                                    </p>
                                ) : (
                                    battleState.logs.map((log, index) => (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg text-sm ${log.type === 'victory' ? 'bg-green-500/20 text-green-600' :
                                                log.type === 'defeat' ? 'bg-red-500/20 text-red-600' :
                                                    log.type === 'attack' ? `${theme.inputBg}` :
                                                        log.type === 'damage' ? `${theme.inputBg}` :
                                                            `${theme.inputBg}`
                                                }`}
                                        >
                                            {log.type === 'info' && '📢 '}
                                            {log.type === 'attack' && '⚔️ '}
                                            {log.type === 'damage' && '💥 '}
                                            {log.type === 'victory' && '🎉 '}
                                            {log.type === 'defeat' && '💀 '}
                                            {log.message}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Current Enemy Info */}
                            {enemy && (
                                <div className={`mt-4 pt-4 border-t`} style={{ borderColor: `${accentColor}30` }}>
                                    <h4 className={`${theme.textSubtle} text-sm mb-2`}>Current Enemy</h4>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{enemy.emoji}</span>
                                        <div>
                                            <p className={`font-bold ${theme.text}`}>{enemy.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`${theme.textSubtle} text-xs`}>Level {enemy.level}</span>
                                                <span
                                                    className="px-2 py-0.5 rounded text-xs font-semibold text-white capitalize"
                                                    style={{
                                                        backgroundColor: enemy.element === 'fire' ? '#ff5722'
                                                            : enemy.element === 'ice' ? '#00bcd4'
                                                                : enemy.element === 'earth' ? '#795548'
                                                                    : '#9c27b0',
                                                    }}
                                                >
                                                    {enemy.element}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs space-y-1">
                                        <p className={theme.textSubtle}>Damage: {enemy.attack}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

