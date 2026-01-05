import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { Swords, Play, RotateCcw } from "lucide-react";
import type { BattleEnemy, BattlePlayer, BattleState, BattleLog } from "@/models/battle.model";

export default function BattlePage() {
    const { darkMode, accentColor } = useTheme();
    const { user } = useRealtimeUser();
    const theme = getThemeClasses(darkMode, accentColor);
    const navigate = useNavigate();
    const location = useLocation();

    // Get enemy data from navigation state
    const enemy = location.state?.enemy as BattleEnemy | undefined;

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

    // Battle state
    const [battleState, setBattleState] = useState<BattleState>({
        playerHP: player.hp,
        enemyHP: enemy?.hp || 100,
        isActive: false,
        isPaused: false,
        winner: null,
        logs: [],
        turn: 0,
    });

    const battleInterval = useRef<number | null>(null);

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
        return Math.max(1, baseDamage + Math.floor(Math.random() * 5)); // Add some randomness
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

        battleInterval.current = setInterval(() => {
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
    const endBattle = (winner: 'player' | 'enemy') => {
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
            // TODO: Update world map progress and award rewards
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

    // Reset battle
    const resetBattle = () => {
        if (battleInterval.current) {
            clearInterval(battleInterval.current);
        }

        setBattleState({
            playerHP: player.hp,
            enemyHP: enemy?.hp || 100,
            isActive: false,
            isPaused: false,
            winner: null,
            logs: [],
            turn: 0,
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (battleInterval.current) {
                clearInterval(battleInterval.current);
            }
        };
    }, []);

    // If no enemy, show error
    if (!enemy) {
        return (
            <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
                <main className="p-8">
                    <div className={`${theme.card} rounded-2xl p-8 text-center`}>
                        <Swords size={64} className="mx-auto mb-4" style={{ color: accentColor }} />
                        <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>No Enemy Selected</h2>
                        <p className={`${theme.textSubtle} mb-6`}>
                            Please select an enemy from the World Map to start a battle.
                        </p>
                        <button
                            onClick={() => navigate('/dashboard/world-map')}
                            className="px-6 py-3 rounded-xl font-semibold transition-all"
                            style={{
                                backgroundColor: accentColor,
                                color: 'white',
                            }}
                        >
                            Go to World Map
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
                        Fight monsters and earn rewards
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
                                        <p className={theme.textSubtle}>
                                            Rewards: 💰 {enemy.level * 10} | ⭐ {enemy.level * 20}
                                        </p>
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
