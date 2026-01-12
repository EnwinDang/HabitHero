import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { Swords, Play, RotateCcw } from "lucide-react";
import type { BattleEnemy, BattlePlayer, BattleState, BattleLog } from "@/models/battle.model";
import { CombatAPI } from "@/api/combat.api";
import { MonstersAPI } from "@/api/monsters.api";
import { UsersAPI } from "@/api/users.api";
import { apiFetch } from "@/api/client";
import heroMaleImage from "@/assets/heroes/hero_male.png";
import heroFemaleImage from "@/assets/heroes/hero_female.png";

export default function BattlePage() {
    const { darkMode, accentColor } = useTheme();
    const { user } = useRealtimeUser();
    const theme = getThemeClasses(darkMode, accentColor);
    const navigate = useNavigate();
    const location = useLocation();

    // Get world data from navigation
    const { worldId, levelId, element } = location.state || {};
    // enemy is now fetched from API

    // Initialize player stats from user data
    const player: BattlePlayer = {
        name: user?.displayName || "Hero",
        level: user?.stats?.level || 1,
        hp: 100 + (user?.stats?.level || 1) * 20,
        maxHP: 100 + (user?.stats?.level || 1) * 20,
        attack: 10 + (user?.stats?.level || 1) * 5,
        defense: 5 + (user?.stats?.level || 1) * 2,
        speed: 50 + (user?.stats?.level || 1) * 3,
        emoji: "⚔️",
    };

    const [combatId, setCombatId] = useState<string | null>(null);
    const [enemy, setEnemy] = useState<BattleEnemy | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Battle state
    const [battleState, setBattleState] = useState<BattleState>({
        playerHP: player.hp,
        enemyHP: 100, // Placeholder until enemy loads
        isActive: false,
        isPaused: false,
        winner: null,
        logs: [],
        turn: 0,
    });

    const battleInterval = useRef<number | null>(null);
    
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

    // Initial setup: Start combat session and fetch monster
    useEffect(() => {
        const initBattle = async () => {
            if (!worldId || !levelId) {
                setError("Invalid battle configuration");
                setLoading(false);
                return;
            }

            try {
                // 1. Check stamina before starting combat (tier-based cost)
                // Note: We don't know the tier yet, so we'll use the maximum cost (boss: 20) for the check
                // The backend will do the actual check with the correct tier
                if (user) {
                    try {
                        const staminaData = await UsersAPI.getStamina(user.uid);
                        
                        // Use maximum cost (boss) for frontend check to be safe
                        const getMaxStaminaCost = (): number => {
                            if (!gameConfig?.stamina?.battleCost) return 20; // Fallback to max
                            return gameConfig.stamina.battleCost.boss || 20;
                        };
                        
                        const MAX_STAMINA_COST = getMaxStaminaCost();

                        if (staminaData.currentStamina < MAX_STAMINA_COST) {
                            setError(`You need at least ${MAX_STAMINA_COST} stamina to fight. Treat this like a test — review before retrying. You have ${staminaData.currentStamina} stamina.`);
                            setLoading(false);
                            return;
                        }
                    } catch (staminaErr: any) {
                        console.warn("Could not check stamina, proceeding anyway:", staminaErr);
                        // Continue if stamina check fails (backward compatibility)
                    }
                }

                // 2. Start Combat Session (backend will also check and consume stamina)
                let combat;
                try {
                    combat = await CombatAPI.start({
                        worldId,
                        stage: Number(levelId)
                    });
                    
                    // Refresh stamina after successful battle start
                    if (user) {
                        try {
                            await UsersAPI.getStamina(user.uid);
                        } catch (err) {
                            console.warn("Could not refresh stamina:", err);
                        }
                    }
                } catch (combatErr: any) {
                    // Handle stamina errors from backend
                    if (combatErr.response?.status === 403 || combatErr.message?.includes('stamina')) {
                        const errorData = combatErr.response?.data || {};
                        const monsterTier = errorData.monsterTier || 'normal';
                        
                        // Get stamina cost from game config based on tier, or use errorData.required, or fallback to max
                        const getStaminaCostForTier = (tier: string): number => {
                            if (errorData.required) return errorData.required;
                            if (!gameConfig?.stamina?.battleCost) return 20; // Fallback to max (boss)
                            const costs = gameConfig.stamina.battleCost;
                            switch (tier) {
                                case 'boss': return costs.boss || 20;
                                case 'miniBoss': return costs.miniBoss || 12;
                                case 'elite': return costs.elite || 8;
                                case 'normal': return costs.normal || 5;
                                default: return costs.boss || 20; // Default to max if unknown tier
                            }
                        };
                        
                        const requiredStamina = getStaminaCostForTier(monsterTier);
                        setError(`You need at least ${requiredStamina} stamina to fight this ${monsterTier} monster. Treat this like a test — review before retrying. ${errorData.deficit ? `You need ${errorData.deficit} more stamina.` : ''}`);
                        setLoading(false);
                        return;
                    }
                    throw combatErr; // Re-throw other errors
                }

                setCombatId(combat.combatId);

                // 3. Fetch Monster Details
                if (combat.monsterId) {
                    const monsterData = await MonstersAPI.get(combat.monsterId);
                    const userLevel = user?.stats?.level || 1;
                    
                    // Count equipped items
                    const equippedItems = user?.inventory?.equiped || {};
                    let equippedItemsCount = 0;
                    if (equippedItems.weapon) equippedItemsCount++;
                    if (equippedItems.armor && Object.keys(equippedItems.armor).length > 0) equippedItemsCount += Object.keys(equippedItems.armor).length;
                    if (equippedItems.pets && Object.keys(equippedItems.pets).length > 0) equippedItemsCount += Object.keys(equippedItems.pets).length;
                    if (equippedItems.accessoiries && Object.keys(equippedItems.accessoiries).length > 0) equippedItemsCount += Object.keys(equippedItems.accessoiries).length;
                    
                    // Fetch monster stats with user level and equipped items for scaling
                    const monsterStats = await apiFetch<{
                        attack: number;
                        hp: number;
                        defense: number;
                        speed: number;
                        magic: number;
                        magicResist: number;
                    }>(`/combat/monster-stats/${worldId}/${levelId}/${userLevel}?monsterId=${monsterData.monsterId}&equippedItemsCount=${equippedItemsCount}`);

                    // Map generic Monster to BattleEnemy
                    const newEnemy: BattleEnemy = {
                        id: monsterData.monsterId,
                        name: monsterData.name,
                        level: Number(levelId), // Assume monster level matches stage for now
                        element: (monsterData.elementType as any) || element || 'fire',
                        hp: monsterStats.hp,
                        maxHP: monsterStats.hp,
                        attack: monsterStats.attack, // Use scaled stats from endpoint
                        defense: monsterStats.defense, // Use scaled defense
                        speed: monsterStats.speed, // Use scaled speed
                        emoji: "👾", // Default emoji, could be mapped from type
                        realmId: worldId,
                        levelId: Number(levelId)
                    };

                    setEnemy(newEnemy);
                    setBattleState(prev => ({ ...prev, enemyHP: newEnemy.maxHP }));
                } else {
                    // Fallback if no monster ID ? 
                    setError("No monster found for this level.");
                }

            } catch (err: any) {
                console.error("Battle Init Error:", err);
                setError("Failed to initialize battle. " + (err.message || ""));
            } finally {
                setLoading(false);
            }
        };

        if (worldId && levelId && !combatId) {
            initBattle();
        }
    }, [worldId, levelId]);


    // Add log entry
    const addLog = (message: string, type: BattleLog['type'] = 'info') => {
        setBattleState(prev => ({
            ...prev,
            logs: [...prev.logs, { message, timestamp: Date.now(), type }],
        }));
    };

    // Calculate damage with critical, block, and miss mechanics
    const calculateDamageWithModifiers = (attacker: { attack: number }, defender: { defense: number }) => {
        const rand = Math.random() * 100;
        const missChance = 5;
        const blockChance = 8;
        const critChance = 10;

        if (rand < missChance) {
            return { damage: 0, type: 'miss' };
        }
        
        if (rand < missChance + blockChance) {
            return { damage: 0, type: 'blocked' };
        }

        const baseDamage = attacker.attack - defender.defense;
        const normalDamage = Math.max(1, baseDamage + Math.floor(Math.random() * 5));
        
        if (rand < missChance + blockChance + critChance) {
            return { damage: Math.floor(normalDamage * 1.5), type: 'critical' };
        }
        
        return { damage: normalDamage, type: 'normal' };
    };

    // Battle simulation
    const runBattle = () => {
        if (!enemy) return;

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
        const battleLog: Array<{ type: string; attacker: string; defender: string; damage: number; hitType: string }> = [];

        battleInterval.current = window.setInterval(() => {
            turn++;

            // Determine who attacks first based on speed
            const playerFirst = player.speed >= enemy.speed;

            if (playerFirst) {
                // Player attacks
                const attackResult = calculateDamageWithModifiers(player, enemy);
                const damage = attackResult.damage;
                currentEnemyHP -= damage;

                // Log attack with modifier type
                battleLog.push({
                    type: 'attack',
                    attacker: player.name,
                    defender: enemy.name,
                    damage,
                    hitType: attackResult.type
                });

                // Add appropriate log message based on hit type
                if (attackResult.type === 'miss') {
                    addLog(`${player.name} attacks but ${enemy.name} dodges!`, 'attack');
                } else if (attackResult.type === 'blocked') {
                    addLog(`${player.name} attacks but ${enemy.name} blocks!`, 'attack');
                } else if (attackResult.type === 'critical') {
                    addLog(`⚡ ${player.name} CRITICAL HIT ${enemy.name} for ${damage} damage!`, 'attack');
                } else {
                    addLog(`${player.name} attacks ${enemy.name} for ${damage} damage!`, 'attack');
                }

                setBattleState(prev => ({ ...prev, enemyHP: Math.max(0, currentEnemyHP), turn }));

                if (currentEnemyHP <= 0) {
                    endBattle('player', battleLog);
                    return;
                }

                // Enemy attacks back
                setTimeout(() => {
                    const enemyAttackResult = calculateDamageWithModifiers(enemy, player);
                    const enemyDamage = enemyAttackResult.damage;
                    currentPlayerHP -= enemyDamage;

                    // Log attack with modifier type
                    battleLog.push({
                        type: 'attack',
                        attacker: enemy.name,
                        defender: player.name,
                        damage: enemyDamage,
                        hitType: enemyAttackResult.type
                    });

                    setBattleState(prev => ({ ...prev, playerHP: Math.max(0, currentPlayerHP) }));
                    
                    // Add appropriate log message based on hit type
                    if (enemyAttackResult.type === 'miss') {
                        addLog(`${enemy.name} attacks but ${player.name} dodges!`, 'damage');
                    } else if (enemyAttackResult.type === 'blocked') {
                        addLog(`${enemy.name} attacks but ${player.name} blocks!`, 'damage');
                    } else if (enemyAttackResult.type === 'critical') {
                        addLog(`⚡ ${enemy.name} CRITICAL HIT ${player.name} for ${enemyDamage} damage!`, 'damage');
                    } else {
                        addLog(`${enemy.name} attacks ${player.name} for ${enemyDamage} damage!`, 'damage');
                    }

                    if (currentPlayerHP <= 0) {
                        endBattle('enemy', battleLog);
                    }
                }, 500);
            } else {
                // Enemy attacks first
                const enemyAttackResult = calculateDamageWithModifiers(enemy, player);
                const enemyDamage = enemyAttackResult.damage;
                currentPlayerHP -= enemyDamage;

                // Log attack with modifier type
                battleLog.push({
                    type: 'attack',
                    attacker: enemy.name,
                    defender: player.name,
                    damage: enemyDamage,
                    hitType: enemyAttackResult.type
                });

                setBattleState(prev => ({ ...prev, playerHP: Math.max(0, currentPlayerHP), turn }));
                
                // Add appropriate log message based on hit type
                if (enemyAttackResult.type === 'miss') {
                    addLog(`${enemy.name} attacks but ${player.name} dodges!`, 'damage');
                } else if (enemyAttackResult.type === 'blocked') {
                    addLog(`${enemy.name} attacks but ${player.name} blocks!`, 'damage');
                } else if (enemyAttackResult.type === 'critical') {
                    addLog(`⚡ ${enemy.name} CRITICAL HIT ${player.name} for ${enemyDamage} damage!`, 'damage');
                } else {
                    addLog(`${enemy.name} attacks ${player.name} for ${enemyDamage} damage!`, 'damage');
                }

                if (currentPlayerHP <= 0) {
                    endBattle('enemy', battleLog);
                    return;
                }

                // Player attacks back
                setTimeout(() => {
                    const playerAttackResult = calculateDamageWithModifiers(player, enemy);
                    const damage = playerAttackResult.damage;
                    currentEnemyHP -= damage;

                    // Log attack with modifier type
                    battleLog.push({
                        type: 'attack',
                        attacker: player.name,
                        defender: enemy.name,
                        damage,
                        hitType: playerAttackResult.type
                    });

                    setBattleState(prev => ({ ...prev, enemyHP: Math.max(0, currentEnemyHP) }));
                    
                    // Add appropriate log message based on hit type
                    if (playerAttackResult.type === 'miss') {
                        addLog(`${player.name} attacks but ${enemy.name} dodges!`, 'attack');
                    } else if (playerAttackResult.type === 'blocked') {
                        addLog(`${player.name} attacks but ${enemy.name} blocks!`, 'attack');
                    } else if (playerAttackResult.type === 'critical') {
                        addLog(`⚡ ${player.name} CRITICAL HIT ${enemy.name} for ${damage} damage!`, 'attack');
                    } else {
                        addLog(`${player.name} attacks ${enemy.name} for ${damage} damage!`, 'attack');
                    }

                    if (currentEnemyHP <= 0) {
                        endBattle('player', battleLog);
                    }
                }, 500);
            }
        }, 1500); // Battle speed: 1.5 seconds per turn
    };
    // End battle
    const endBattle = async (winner: 'player' | 'enemy', battleLogs: Array<{ type: string; attacker: string; defender: string; damage: number; hitType: string }> = []) => {
        console.log('🏁 EndBattle called with winner:', winner);
        console.log('📜 Battle logs:', battleLogs);
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
                        const xpGained = (result.reward as any).xpGained || (result.reward as any).xp || 0;
                        const goldGained = (result.reward as any).goldGained || (result.reward as any).gold || 0;
                        
                        addLog(`🎉 You earned ${xpGained} XP and ${goldGained} Gold!`, 'victory');
                        
                        // Update user stats in database with battle rewards
                        if (user?.uid) {
                            try {
                                const response = await apiFetch<{
                                    xpGained: number;
                                    newXp: number;
                                    newLevel: number;
                                    leveledUp: boolean;
                                    levelUpRewards?: any;
                                    rewardMultipliers?: any;
                                }>(`/users/${user.uid}/battle-rewards`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        xp: xpGained,
                                        gold: goldGained,
                                        worldId,
                                        stage: levelId,
                                        monsterName: enemy?.name,
                                        battleLogs
                                    })
                                });

                                // Check if level up occurred
                                if (response.leveledUp) {
                                    addLog(`⭐ LEVEL UP! You are now level ${response.newLevel}!`, 'levelup');
                                    addLog(`💰 Rewards (${response.rewardMultipliers?.totalMultiplier?.toFixed(2)}x multiplier)`, 'levelup');
                                }
                            } catch (statsErr) {
                                console.error("Failed to update user stats:", statsErr);
                                // Continue even if database update fails
                            }
                        }
                    }

                    // Update local progress for immediate UI feedback if needed
                    if (user && worldId && levelId) {
                        const currentProgress = user.worldMapProgress?.[worldId]?.completedLevels || [];
                        if (!currentProgress.includes(Number(levelId))) {
                            const newCompleted = [...currentProgress, Number(levelId)];
                            // We might want to patch this to backend if not automatically handled
                            // Assuming UsersAPI.patch exists and works
                            await UsersAPI.patch(user.uid, {
                                // @ts-ignore - worldMapProgress is custom
                                worldMapProgress: {
                                    ...user.worldMapProgress,
                                    [worldId]: {
                                        realmId: worldId,
                                        completedLevels: newCompleted,
                                        totalLevels: 10 // assumption
                                    }
                                }
                            });
                        }
                    }

                } catch (err) {
                    console.error("Failed to resolve combat:", err);
                    addLog("Error saving results to server.", 'defeat');
                }
            }

        } else {
            addLog(`Defeat! ${player.name} has been defeated!`, 'defeat');
        }
    };

    // Pause/Resume battle
    const togglePause = () => {
        setBattleState(prev => ({ ...prev, isPaused: !prev.isPaused }));
        if (battleState.isPaused && battleInterval.current) {
            // Resume
            runBattle();
        } else if (battleInterval.current) {
            // Pause
            clearInterval(battleInterval.current);
        }
    };

    // Reset battle (Retry)
    const resetBattle = () => {
        // Reload page to start fresh session
        window.location.reload();
    };

    // Handle beforeunload to warn about leaving during an active battle
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Only show warning if battle is active or not yet won (final battle not done)
            if (battleState.isActive || !battleState.winner) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [battleState.isActive, battleState.winner]);

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

    if (error || !enemy) {
        return (
            <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
                <main className="p-8">
                    <div className={`${theme.card} rounded-2xl p-8 text-center`}>
                        <Swords size={64} className="mx-auto mb-4" style={{ color: accentColor }} />
                        <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>
                            {error || "No Enemy Loaded"}
                        </h2>
                        <button
                            onClick={() => navigate('/dashboard/world-map')}
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
            <main className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h2 className={`text-4xl font-bold ${theme.text} flex items-center gap-3`}>
                        <Swords size={40} style={{ color: accentColor }} />
                        Battle Arena
                    </h2>
                    <p className={`${theme.textSubtle} mt-2`}>
                        {worldId} - Level {levelId}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Battle Arena - Left/Center */}
                    <div className="lg:col-span-2">
                        <div
                            className="rounded-3xl p-8 min-h-[500px] flex flex-col"
                            style={{
                                background: `${accentColor}20`,
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
                                        className="w-32 h-32 rounded-2xl flex items-center justify-center mb-4 mx-auto overflow-hidden"
                                        style={{
                                            backgroundColor: darkMode ? "rgba(100, 116, 139, 0.5)" : "rgba(148, 163, 184, 0.3)",
                                            borderWidth: "2px",
                                            borderStyle: "solid",
                                            borderColor: `${accentColor}80`,
                                        }}
                                    >
                                        {(() => {
                                            const heroImage = user?.heroType === "male" ? heroMaleImage : heroFemaleImage;
                                            return (
                                                <img
                                                    src={heroImage}
                                                    alt={player.name}
                                                    className="w-full h-full object-contain"
                                                    style={{
                                                        imageRendering: 'pixelated',
                                                        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
                                                    }}
                                                />
                                            );
                                        })()}
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
                                                ? '#ff5722'
                                                : enemy.element === 'ice'
                                                    ? '#00bcd4'
                                                    : enemy.element === 'earth'
                                                        ? '#795548'
                                                        : '#9c27b0',
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

                            {/* Battle Controls */}
                            <div className="mt-8 flex gap-4 justify-center">
                                {!battleState.isActive && !battleState.winner && (
                                    <button
                                        onClick={runBattle}
                                        className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all hover:scale-105"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        <Play size={20} />
                                        Start Auto-Battle
                                    </button>
                                )}

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
                                            onClick={() => navigate('/dashboard/world-map')}
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
                                        {/* Rewards display could go here */}
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
