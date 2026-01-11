import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { Swords, Play, RotateCcw, ArrowLeft, Crown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BattleEnemy, BattlePlayer, BattleState, BattleLog } from "@/models/battle.model";
import { CombatAPI } from "@/api/combat.api";
import { MonstersAPI } from "@/api/monsters.api";
import { WorldsAPI } from "@/api/worlds.api";
import { UsersAPI } from "@/api/users.api";
import { apiFetch } from "@/api/client";
import { getWorldBackground, getWorldEndingQuote } from "@/data/worlds";
import heroImage from "@/assets/heroes/hero_female.png";
import monsterFireImage from "@/assets/monsters/monster_fire.png";
import monsterWaterImage from "@/assets/monsters/monster_water.png";
import monsterWindImage from "@/assets/monsters/monster_wind.png";
import monsterEarthImage from "@/assets/monsters/monster_earth.png";
import { Trophy, Sparkles } from "lucide-react";

export default function AutoBattlePage() {
    const { darkMode, accentColor } = useTheme();
    const { user } = useRealtimeUser();
    const theme = getThemeClasses(darkMode, accentColor);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get monster data from navigation state (if coming from WorldMapPage)
    const { worldId: stateWorldId, monsterId: stateMonsterId, monsterName: stateMonsterName, element: stateElement } = location.state || {};

    const [worldId, setWorldId] = useState<string | null>(null);
    const [stage, setStage] = useState<number>(1);
    const [combatId, setCombatId] = useState<string | null>(null);
    const [enemy, setEnemy] = useState<BattleEnemy | null>(null);
    const [player, setPlayer] = useState<BattlePlayer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [monsterTier, setMonsterTier] = useState<'normal' | 'elite' | 'miniBoss' | 'boss'>('normal');
    const [showBossAnimation, setShowBossAnimation] = useState(false);
    const [battleRewards, setBattleRewards] = useState<{ xp: number; gold: number; leveledUp?: boolean; newLevel?: number; levelUpRewards?: any } | null>(null);
    const [hpLost, setHpLost] = useState<number>(0);
    const [showWorldCompletion, setShowWorldCompletion] = useState(false);
    const [completedWorldName, setCompletedWorldName] = useState<string>("");
    
    // Animation states for Tekken-style combat
    const [playerBump, setPlayerBump] = useState(false);
    const [enemyBump, setEnemyBump] = useState(false);
    const [playerHit, setPlayerHit] = useState(false);
    const [enemyHit, setEnemyHit] = useState(false);
    const [damageNumbers, setDamageNumbers] = useState<Array<{ id: number; damage: number; x: number; y: number; isPlayer: boolean }>>([]);

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

                // 1. Check if monster data is provided from navigation state
                if (!stateWorldId || !stateMonsterId) {
                    setError("No monster selected. Please select a monster from the world map.");
                    setLoading(false);
                    return;
                }

                const battleWorldId = stateWorldId;
                const targetMonsterId = stateMonsterId;
                let initialStage: number = 1;
                
                console.log(`🎯 Using specific monster from navigation: ${stateMonsterName} (${stateMonsterId}) in world ${battleWorldId}`);
                
                // Try to determine stage from monster position in world
                // Get the world to find monster's position
                try {
                    const world = await WorldsAPI.get(battleWorldId);
                    const stages = (world as any).stages || [];
                    
                    // Find which stage contains this monster
                    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
                        const stage = stages[stageIndex];
                        if (stage && stage.values && Array.isArray(stage.values)) {
                            if (stage.values.includes(stateMonsterId)) {
                                // Stage numbers are 1-indexed (stage 1, 2, 3, etc.)
                                initialStage = stageIndex + 1;
                                console.log(`📍 Found monster at stage ${initialStage} in world ${battleWorldId}`);
                                break;
                            }
                        }
                    }
                } catch (worldErr) {
                    console.warn("Could not determine stage from world, using default stage 1:", worldErr);
                    initialStage = 1;
                }

                setWorldId(battleWorldId);
                setStage(initialStage);

                // 2. Get player stats (includes equipped items via total stats)
                const baseStats = await apiFetch<{
                    level: number;
                    attack: number;
                    defense: number;
                    health: number;
                    magic: number;
                    magicResist: number;
                }>(`/combat/player-stats/${user.stats?.level || 1}`);

                let totalStats: Record<string, number> = {};
                try {
                    totalStats = await apiFetch<Record<string, number>>(`/combat/player-stats-total/${user.uid}`);
                } catch (err) {
                    console.warn("/combat/player-stats-total missing, using base stats", err);
                }

                const finalStats = (totalStats && Object.keys(totalStats).length > 0)
                    ? totalStats
                    : {
                        hp: baseStats.health,
                        attack: baseStats.attack,
                        defense: baseStats.defense,
                        magicAttack: baseStats.magic,
                        magicResist: baseStats.magicResist,
                        speed: 50 + (baseStats.level ?? 1) * 3,
                        critChance: 0,
                        critDamage: 0,
                        goldBonus: 0,
                        xpBonus: 0,
                    };

                const newPlayer: BattlePlayer = {
                    name: user.displayName || "Hero",
                    level: baseStats.level,
                    hp: finalStats.hp || baseStats.health,
                    maxHP: finalStats.hp || baseStats.health,
                    attack: finalStats.attack || baseStats.attack,
                    defense: finalStats.defense || baseStats.defense,
                    speed: finalStats.speed || (50 + baseStats.level * 3),
                    emoji: "⚔️",
                };
                setPlayer(newPlayer);
                setBattleState(prev => ({ ...prev, playerHP: newPlayer.hp }));

                // 3. Start combat session
                const combat = await CombatAPI.start({
                    worldId: battleWorldId,
                    stage: initialStage,
                    monsterId: targetMonsterId,
                });
                setCombatId(combat.combatId);

                // 4. Get monster stats WITH user level and equipped items for scaling
                const userLevel = user.stats?.level || 1;
                
                // Count equipped items
                const equippedItems = user?.inventory?.equiped || {};
                let equippedItemsCount = 0;
                if (equippedItems.weapon) equippedItemsCount++;
                if (equippedItems.armor && Object.keys(equippedItems.armor).length > 0) equippedItemsCount += Object.keys(equippedItems.armor).length;
                if (equippedItems.pets && Object.keys(equippedItems.pets).length > 0) equippedItemsCount += Object.keys(equippedItems.pets).length;
                if (equippedItems.accessoiries && Object.keys(equippedItems.accessoiries).length > 0) equippedItemsCount += Object.keys(equippedItems.accessoiries).length;
                
                // 5. Fetch the specific monster that was clicked
                let selectedMonster;
                try {
                    selectedMonster = await MonstersAPI.get(targetMonsterId);
                    console.log(`✅ Found specific monster: ${selectedMonster.name} (${selectedMonster.monsterId})`);
                    
                    // Update tier based on actual monster tier
                    if (selectedMonster.tier) {
                        setMonsterTier(selectedMonster.tier as 'normal' | 'elite' | 'miniBoss' | 'boss');
                    }
                } catch (monsterErr) {
                    console.error(`Failed to fetch monster ${targetMonsterId}:`, monsterErr);
                    setError(`Monster not found: ${stateMonsterName || targetMonsterId}`);
                    setLoading(false);
                    return;
                }

                const monsterStats = await apiFetch<{
                    worldId: string;
                    stage: number;
                    attack: number;
                    hp: number;
                    defense: number;
                    speed: number;
                    magic: number;
                    magicResist: number;
                }>(`/combat/monster-stats/${battleWorldId}/${initialStage}/${userLevel}?monsterId=${selectedMonster.monsterId}&equippedItemsCount=${equippedItemsCount}`);

                // Use monster's tier for animation
                const monsterTierForAnimation = selectedMonster.tier || 'normal';
                setMonsterTier(monsterTierForAnimation as 'normal' | 'elite' | 'miniBoss' | 'boss');

                const newEnemy: BattleEnemy = {
                    id: selectedMonster.monsterId,
                    name: selectedMonster.name, // Use actual monster name from database
                    level: initialStage,
                    element: (selectedMonster.elementType as any) || stateElement || 'fire',
                    hp: monsterStats.hp,
                    maxHP: monsterStats.hp,
                    attack: monsterStats.attack,
                    defense: monsterStats.defense, // Use scaled defense
                    speed: monsterStats.speed, // Use scaled speed
                    emoji: "👾", // Default emoji, will be replaced by image
                    realmId: battleWorldId,
                    levelId: initialStage,
                    tier: monsterTierForAnimation as 'normal' | 'elite' | 'miniBoss' | 'boss',
                };
                setEnemy(newEnemy);
                setBattleState(prev => ({ ...prev, enemyHP: newEnemy.maxHP }));

                // Show boss animation if it's a boss or miniBoss (based on monster tier)
                if (monsterTierForAnimation === 'boss' || monsterTierForAnimation === 'miniBoss') {
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

                // Trigger animations
                setPlayerBump(true);
                setTimeout(() => setPlayerBump(false), 200);
                setTimeout(() => {
                    setEnemyHit(true);
                    if (damage > 0) {
                        setDamageNumbers(prev => [...prev, { 
                            id: Date.now(), 
                            damage, 
                            x: 65, // Right side (enemy position)
                            y: 50, 
                            isPlayer: false 
                        }]);
                    }
                    setTimeout(() => setEnemyHit(false), 300);
                }, 200);

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

                    // Trigger animations
                    setEnemyBump(true);
                    setTimeout(() => setEnemyBump(false), 200);
                    setTimeout(() => {
                        setPlayerHit(true);
                        if (enemyDamage > 0) {
                            setDamageNumbers(prev => [...prev, { 
                                id: Date.now() + 1, 
                                damage: enemyDamage, 
                                x: 30, // Left side (player position)
                                y: 0, 
                                isPlayer: true 
                            }]);
                        }
                        setTimeout(() => setPlayerHit(false), 300);
                    }, 200);

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
                }, 800);
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

                // Trigger animations
                setEnemyBump(true);
                setTimeout(() => setEnemyBump(false), 200);
                setTimeout(() => {
                    setPlayerHit(true);
                    if (enemyDamage > 0) {
                        setDamageNumbers(prev => [...prev, { 
                            id: Date.now(), 
                            damage: enemyDamage, 
                            x: 30, 
                            y: 0, 
                            isPlayer: true 
                        }]);
                    }
                    setTimeout(() => setPlayerHit(false), 300);
                }, 200);

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

                    // Trigger animations
                    setPlayerBump(true);
                    setTimeout(() => setPlayerBump(false), 200);
                    setTimeout(() => {
                        setEnemyHit(true);
                        if (damage > 0) {
                            setDamageNumbers(prev => [...prev, { 
                                id: Date.now() + 1, 
                                damage, 
                                x: 70, 
                                y: 0, 
                                isPlayer: false 
                            }]);
                        }
                        setTimeout(() => setEnemyHit(false), 300);
                    }, 200);

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
                }, 800);
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

        setBattleState(prev => {
            console.log('📊 Setting battle state winner to:', winner);
            return {
                ...prev,
                isActive: false,
                winner,
            };
        });

        if (winner === 'player') {
            addLog(`Victory! ${enemy?.name} has been defeated!`, 'victory');

            // Resolve on backend
            if (combatId) {
                try {
                    addLog("Saving progress...", 'info');
                    const result = await CombatAPI.resolve(combatId);
                    if (result.reward) {
                        // Backend returns xp and gold rewards
                        const xp = (result.reward as any).xp || (result.reward as any).xpGained || 0;
                        const gold = (result.reward as any).gold || (result.reward as any).goldGained || 0;
                        
                        addLog(`🎉 You earned ${xp} XP and ${gold} Gold!`, 'victory');
                        
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
                                        xp,
                                        gold,
                                        worldId,
                                        stage,
                                        monsterName: enemy?.name,
                                        battleLogs
                                    })
                                });

                                // Check if level up occurred
                                if (response.leveledUp) {
                                    addLog(`⭐ LEVEL UP! You are now level ${response.newLevel}!`, 'levelup');
                                    addLog(`💰 Rewards (${response.rewardMultipliers?.totalMultiplier?.toFixed(2)}x multiplier)`, 'levelup');
                                    setBattleRewards({ 
                                        xp: response.xpGained, 
                                        gold,
                                        leveledUp: true,
                                        newLevel: response.newLevel,
                                        levelUpRewards: response.levelUpRewards
                                    });
                                } else {
                                    setBattleRewards({ 
                                        xp: response.xpGained, 
                                        gold,
                                        leveledUp: false
                                    });
                                }
                            } catch (statsErr) {
                                console.error("Failed to update user stats:", statsErr);
                                // Still show rewards even if database update fails
                                setBattleRewards({ xp, gold, leveledUp: false });
                            }
                        }
                        
                        // If user wins against a boss, show world completion animation
                        if (worldId && monsterTier === 'boss') {
                            try {
                                const world = await WorldsAPI.get(worldId);
                                setCompletedWorldName((world as any).name || worldId);
                                setShowWorldCompletion(true);
                                console.log(`🎉 Boss defeated! Showing world completion animation for ${worldId}`);
                            } catch (checkErr) {
                                console.error("Could not fetch world name:", checkErr);
                                // Still show animation with worldId as fallback
                                setCompletedWorldName(worldId);
                                setShowWorldCompletion(true);
                            }
                        }
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
    
    // Get background image for the world
    const bgImage = worldId ? getWorldBackground(worldId) : undefined;
    
    // Get monster image based on element
    const getMonsterImage = (element: string) => {
        const elem = element?.toLowerCase();
        switch(elem) {
            case 'fire':
                return monsterFireImage;
            case 'water':
            case 'ice':
                return monsterWaterImage;
            case 'wind':
            case 'lightning':
                return monsterWindImage;
            case 'earth':
                return monsterEarthImage;
            default:
                return monsterFireImage; // Fallback to fire
        }
    };
    
    const monsterImage = enemy ? getMonsterImage(enemy.element) : null;

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            {/* World Completion Animation */}
            <AnimatePresence>
                {showWorldCompletion && worldId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                        onClick={() => {
                            setShowWorldCompletion(false);
                            navigate('/student/world-map');
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 50 }}
                            transition={{ type: "spring", duration: 0.8 }}
                            className="relative max-w-2xl w-full mx-4 p-12 text-center border-4 border-white"
                            style={{
                                background: '#1a1a1a',
                                fontFamily: 'monospace',
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
                                style={{ textShadow: '3px 3px 0px #000' }}
                            >
                                {completedWorldName}
                            </motion.h2>

                            {/* Completion text */}
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className="text-2xl md:text-3xl text-purple-200 mb-8"
                                style={{ textShadow: '2px 2px 0px #000' }}
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
                                <p className="text-xl md:text-2xl italic text-white/90 font-light px-8" style={{ textShadow: '2px 2px 0px #000' }}>
                                    "{getWorldEndingQuote(worldId)}"
                                </p>
                                <Sparkles className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-yellow-400" size={24} />
                            </motion.div>

                            {/* Close button */}
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.1 }}
                                onClick={() => {
                                    setShowWorldCompletion(false);
                                    navigate('/student/world-map');
                                }}
                                className="mt-8 px-8 py-3 font-bold text-white border-2 border-white"
                                style={{
                                    background: accentColor,
                                    fontFamily: 'monospace',
                                }}
                            >
                                CONTINUE
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                    className="w-32 h-32 mx-auto mb-4 flex items-center justify-center"
                                    style={{
                                        filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))',
                                    }}
                                >
                                    {monsterImage ? (
                                        <img 
                                            src={monsterImage} 
                                            alt={enemy.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <span className="text-5xl">{enemy.emoji}</span>
                                    )}
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

                <div className="space-y-6">
                    {/* Battle Arena - Tekken Style */}
                    <div>
                        <div
                            className="relative overflow-hidden"
                            style={{
                                background: bgImage 
                                    ? `url(${bgImage})`
                                    : darkMode ? '#1a1a1a' : '#2a2a2a',
                                backgroundSize: bgImage ? 'cover' : 'auto',
                                backgroundPosition: bgImage ? 'center' : 'center',
                                minHeight: '500px',
                                imageRendering: 'pixelated',
                            }}
                        >
                            {/* Ground strip */}
                            <div 
                                className="absolute bottom-0 left-0 right-0 h-1"
                                style={{
                                    background: darkMode ? '#333' : '#444',
                                }}
                            />
                            
                            {/* HP Bars at Top - Centered */}
                            <div className="absolute top-4 left-0 right-0 flex justify-center gap-32 z-10">
                                {/* Player HP */}
                                <div className="w-64">
                                    <div className="flex justify-between text-sm mb-1 text-white" style={{ textShadow: '2px 2px 0px #000' }}>
                                        <span className="font-bold">{player.name}</span>
                                        <span>
                                            {Math.max(0, Math.floor(battleState.playerHP))} / {player.maxHP}
                                        </span>
                                    </div>
                                    <div className="w-full bg-black border-2 border-white" style={{ height: '20px' }}>
                                        <div
                                            className="bg-green-500 h-full transition-all duration-500"
                                            style={{ width: `${playerHPPercent}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-white" style={{ textShadow: '1px 1px 0px #000' }}>
                                            Lv.{player.level}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Enemy HP */}
                                <div className="w-64 text-right">
                                    <div className="flex justify-between text-sm mb-1 text-white" style={{ textShadow: '2px 2px 0px #000' }}>
                                        <span>
                                            {Math.max(0, Math.floor(battleState.enemyHP))} / {enemy.maxHP}
                                        </span>
                                        <span className="font-bold">{enemy.name}</span>
                                    </div>
                                    <div className="w-full bg-black border-2 border-white" style={{ height: '20px' }}>
                                        <div
                                            className="bg-red-500 h-full transition-all duration-500 ml-auto"
                                            style={{ width: `${enemyHPPercent}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-2 mt-1">
                                        <span
                                            className="px-2 py-0.5 text-xs font-semibold text-white capitalize border border-white"
                                            style={{
                                                backgroundColor: enemy.element === 'fire' ? '#ff5722'
                                                    : enemy.element === 'ice' ? '#00bcd4'
                                                        : enemy.element === 'earth' ? '#795548'
                                                            : '#9c27b0',
                                                textShadow: '1px 1px 0px #000',
                                            }}
                                        >
                                            {enemy.element}
                                        </span>
                                        <span className="text-xs text-white" style={{ textShadow: '1px 1px 0px #000' }}>
                                            Lv.{enemy.level}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Floating Damage Numbers */}
                            <AnimatePresence>
                                {damageNumbers.map((dmg) => (
                                    <motion.div
                                        key={dmg.id}
                                        initial={{ opacity: 1, y: dmg.y, x: `${dmg.x}%` }}
                                        animate={{ opacity: 0, y: dmg.y - 50, x: `${dmg.x}%` }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 1 }}
                                        className="absolute pointer-events-none"
                                        style={{
                                            fontSize: '24px',
                                            fontWeight: 'bold',
                                            color: dmg.isPlayer ? '#ff4444' : '#44ff44',
                                            textShadow: '2px 2px 0px #000',
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        -{dmg.damage}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            
                            {/* Characters - Tekken Style */}
                            <div className="absolute bottom-1 left-0 right-0 flex justify-center items-end gap-32" style={{ height: '300px' }}>
                                {/* Player - Left Side, Facing Right */}
                                <motion.div
                                    animate={{
                                        x: playerBump ? 3 : playerHit ? [0, -2, 2, -2, 2, 0] : 0,
                                        filter: playerHit ? 'brightness(2) saturate(0)' : 'brightness(1) saturate(1)',
                                    }}
                                    transition={{ 
                                        duration: playerHit ? 0.3 : 0.2, 
                                        ease: 'easeOut',
                                        times: playerHit ? [0, 0.2, 0.4, 0.6, 0.8, 1] : undefined,
                                    }}
                                    className="relative"
                                    style={{
                                        transform: 'scaleX(1)', // Facing right
                                        imageRendering: 'pixelated',
                                    }}
                                >
                                    <img 
                                        src={heroImage} 
                                        alt={player.name}
                                        className="w-64 h-64 object-contain"
                                        style={{
                                            imageRendering: 'pixelated',
                                            filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.5))',
                                        }}
                                    />
                                </motion.div>

                                {/* Enemy - Right Side, Facing Left */}
                                <motion.div
                                    animate={{
                                        x: enemyBump ? -3 : enemyHit ? [0, 2, -2, 2, -2, 0] : 0,
                                        filter: enemyHit ? 'brightness(2) saturate(0)' : 'brightness(1) saturate(1)',
                                    }}
                                    transition={{ 
                                        duration: enemyHit ? 0.3 : 0.2, 
                                        ease: 'easeOut',
                                        times: enemyHit ? [0, 0.2, 0.4, 0.6, 0.8, 1] : undefined,
                                    }}
                                    className="relative"
                                    style={{
                                        transform: 'scaleX(-1)', // Facing left (flip horizontally)
                                        imageRendering: 'pixelated',
                                    }}
                                >
                                    {monsterImage ? (
                                        <img 
                                            src={monsterImage} 
                                            alt={enemy.name}
                                            className="w-64 h-64 object-contain"
                                            style={{
                                                imageRendering: 'pixelated',
                                                filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.5))',
                                            }}
                                        />
                                    ) : (
                                        <div className="w-64 h-64 flex items-center justify-center text-6xl">
                                            {enemy.emoji}
                                        </div>
                                    )}
                                </motion.div>
                            </div>

                            {/* Battle Results Display - Pixel Style */}
                            {battleState.winner && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="absolute inset-0 flex items-center justify-center z-20"
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.8)',
                                    }}
                                >
                                    {battleState.winner === 'player' && (
                                        <div
                                            className="p-8 text-center border-4 border-white"
                                            style={{
                                                background: '#1a1a1a',
                                                fontFamily: 'monospace',
                                            }}
                                        >
                                            <h3 className="text-4xl font-bold text-green-500 mb-6" style={{ textShadow: '3px 3px 0px #000' }}>VICTORY!</h3>
                                            {battleRewards ? (
                                                <div className="flex items-center justify-center gap-8">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-4xl">⭐</span>
                                                        <div>
                                                            <p className="text-sm text-white mb-1">XP</p>
                                                            <p className="text-3xl font-bold text-green-500" style={{ textShadow: '2px 2px 0px #000' }}>+{battleRewards.xp}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-4xl">🪙</span>
                                                        <div>
                                                            <p className="text-sm text-white mb-1">GOLD</p>
                                                            <p className="text-3xl font-bold text-yellow-500" style={{ textShadow: '2px 2px 0px #000' }}>+{battleRewards.gold}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-white mb-6">Loading rewards...</p>
                                            )}
                                            <div className="mt-6 flex gap-4 justify-center">
                                                <button
                                                    onClick={resetBattle}
                                                    className="px-6 py-3 font-bold text-white border-2 border-white"
                                                    style={{
                                                        background: '#333',
                                                        fontFamily: 'monospace',
                                                    }}
                                                >
                                                    RETRY
                                                </button>
                                                <button
                                                    onClick={() => navigate('/student/world-map')}
                                                    className="px-6 py-3 font-bold text-white border-2 border-white"
                                                    style={{
                                                        background: accentColor,
                                                        fontFamily: 'monospace',
                                                    }}
                                                >
                                                    EXIT
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {battleState.winner === 'enemy' && (
                                        <div
                                            className="p-8 text-center border-4 border-white"
                                            style={{
                                                background: '#1a1a1a',
                                                fontFamily: 'monospace',
                                            }}
                                        >
                                            <h3 className="text-4xl font-bold text-red-500 mb-6" style={{ textShadow: '3px 3px 0px #000' }}>DEFEAT!</h3>
                                            {hpLost > 0 && (
                                                <div className="flex items-center justify-center gap-3 mb-6">
                                                    <span className="text-4xl">❤️</span>
                                                    <div>
                                                        <p className="text-sm text-white mb-1">HP LOST</p>
                                                        <p className="text-3xl font-bold text-red-500" style={{ textShadow: '2px 2px 0px #000' }}>-{hpLost}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-6 flex gap-4 justify-center">
                                                <button
                                                    onClick={resetBattle}
                                                    className="px-6 py-3 font-bold text-white border-2 border-white"
                                                    style={{
                                                        background: '#333',
                                                        fontFamily: 'monospace',
                                                    }}
                                                >
                                                    RETRY
                                                </button>
                                                <button
                                                    onClick={() => navigate('/student/world-map')}
                                                    className="px-6 py-3 font-bold text-white border-2 border-white"
                                                    style={{
                                                        background: accentColor,
                                                        fontFamily: 'monospace',
                                                    }}
                                                >
                                                    EXIT
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Battle Log - Below Fight */}
                    <div>
                        <div
                            className={`${theme.card} rounded-2xl p-6 flex flex-col`}
                            style={{
                                ...theme.borderStyle,
                                borderWidth: "1px",
                                borderStyle: "solid",
                            }}
                        >
                            <h3 className="text-xl font-bold text-white mb-4" style={{ textShadow: '2px 2px 0px #000', fontFamily: 'monospace' }}>BATTLE LOG</h3>

                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                {battleState.logs.length === 0 ? (
                                    <p className={`${theme.textSubtle} text-sm text-center py-8`}>
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

                            {/* Current Enemy Info - Pixel Style */}
                            {enemy && (
                                <div className="mt-4 pt-4 border-t-2 border-white">
                                    <h4 className="text-sm mb-2 text-white" style={{ textShadow: '1px 1px 0px #000', fontFamily: 'monospace' }}>ENEMY</h4>
                                    <div className="flex items-center gap-3">
                                        {monsterImage ? (
                                            <img 
                                                src={monsterImage} 
                                                alt={enemy.name}
                                                className="w-12 h-12 object-contain"
                                                style={{ imageRendering: 'pixelated' }}
                                            />
                                        ) : (
                                            <span className="text-3xl">{enemy.emoji}</span>
                                        )}
                                        <div>
                                            <p className="font-bold text-white" style={{ textShadow: '1px 1px 0px #000' }}>{enemy.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-white" style={{ textShadow: '1px 1px 0px #000' }}>Lv.{enemy.level}</span>
                                                <span
                                                    className="px-2 py-0.5 text-xs font-semibold text-white capitalize border border-white"
                                                    style={{
                                                        backgroundColor: enemy.element === 'fire' ? '#ff5722'
                                                            : enemy.element === 'ice' ? '#00bcd4'
                                                                : enemy.element === 'earth' ? '#795548'
                                                                    : '#9c27b0',
                                                        textShadow: '1px 1px 0px #000',
                                                    }}
                                                >
                                                    {enemy.element}
                                                </span>
                                            </div>
                                        </div>
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

