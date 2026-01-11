import { useEffect, useMemo, useState } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { LootboxesAPI } from "@/api/lootboxes.api";
import { UsersAPI } from "@/api/users.api";
import type { Lootbox } from "@/models/lootbox.model";
import {
    Gift,
    Box,
    Gem,
    Sparkles,
    TrendingUp,
    Zap,
    Coins,
    Lock,
    Check
} from "lucide-react";
import "./lootbox-animation.css";

// Lootbox visual tier types
type LootboxType = "common" | "rare" | "epic";

// UI item types used in fallback mode
type ItemType = "weapon" | "armor" | "accessory" | "pet";
type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface GeneratedItem {
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    icon: string;
    isEquipped: boolean;
    level: number;
    bonus?: Record<string, number> | null;
}

// Backend lootbox shape (subset of fields used by UI)
interface BackendLootbox {
    lootboxId: string;
    name: string;
    description?: string | null;
    enable?: boolean;
    priceGold?: number;
    dropChances?: Record<string, number>;
    itemPools?: Record<string, string[]>;
    petChance?: number;
    petRarityChances?: Record<string, number>;
}

// Display model for the card UI
interface DisplayLootbox {
    id: string; // equals lootboxId
    type: LootboxType;
    name: string;
    price: number;
    quality: string;
    rewards: string[];
    gradient: string;
    glowColor: string;
}

export default function LootboxesPage() {
    const { user, loading: userLoading } = useRealtimeUser();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    // Lootboxes from API
    const [lootboxes, setLootboxes] = useState<Lootbox[]>([]);
    const [lootboxesLoading, setLootboxesLoading] = useState(true);
    
    // Opening state
    const [openingBox, setOpeningBox] = useState<string | null>(null);
    const [revealedItems, setRevealedItems] = useState<GeneratedItem[]>([]);
    const [showRewards, setShowRewards] = useState(false);
    const [pendingLootbox, setPendingLootbox] = useState<DisplayLootbox | null>(null);
    const [showOpenChoice, setShowOpenChoice] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [savedLootboxName, setSavedLootboxName] = useState("");
    const [showChestOpening, setShowChestOpening] = useState(false);
    const [openingLootbox, setOpeningLootbox] = useState<DisplayLootbox | null>(null);
    const [backendLootboxes, setBackendLootboxes] = useState<BackendLootbox[]>([]);
    const [loadingBoxes, setLoadingBoxes] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;
        const fetchLootboxes = async () => {
            try {
                setLoadingBoxes(true);
                const list = await LootboxesAPI.list();
                if (mounted) setBackendLootboxes(list as any);
            } catch (e) {
                console.error("Failed to fetch lootboxes from API:", e);
            } finally {
                if (mounted) setLoadingBoxes(false);
            }
        };
        fetchLootboxes();
        return () => {
            mounted = false;
        };
    }, []);

    // Map backend lootboxes to display cards
    const displayLootboxes: DisplayLootbox[] = useMemo(() => {
        const mapTier = (id: string, name?: string): LootboxType => {
            const key = `${id} ${name || ""}`.toLowerCase();
            if (key.includes("epic") || key.includes("legendary")) return "epic";
            if (key.includes("rare") || key.includes("advanced")) return "rare";
            return "common";
        };

        const tierStyles: Record<LootboxType, { gradient: string; glowColor: string; quality: string; rewards: string[] }> = {
            common: {
                gradient: "from-purple-600 to-purple-700",
                glowColor: "#9333ea",
                quality: "Common Quality",
                rewards: ["+1 random item", "+Slightly extra chance", "+Common quality loot"],
            },
            rare: {
                gradient: "from-orange-600 to-orange-700",
                glowColor: "#ea580c",
                quality: "Rare Quality",
                rewards: ["+2 random items", "+Higher rarity chance", "+Guaranteed rare+ item"],
            },
            epic: {
                gradient: "from-yellow-600 to-yellow-700",
                glowColor: "#ca8a04",
                quality: "Epic Quality",
                rewards: ["+3 random items", "+Higher rarity chance", "+Guaranteed epic+ item"],
            },
        };

        const mapped = backendLootboxes.map((lb) => {
            const type = mapTier(lb.lootboxId, lb.name);
            const style = tierStyles[type];
            const price = typeof lb.priceGold === "number" ? lb.priceGold : (type === "epic" ? 500 : type === "rare" ? 250 : 100);
            return {
                id: lb.lootboxId,
                type,
                name: lb.name || lb.lootboxId,
                price,
                quality: style.quality,
                rewards: style.rewards,
                gradient: style.gradient,
                glowColor: style.glowColor,
            } as DisplayLootbox;
        });

        // Sort by tier: common < rare < epic
        const tierOrder: Record<LootboxType, number> = { common: 0, rare: 1, epic: 2 };
        return mapped.sort((a, b) => tierOrder[a.type] - tierOrder[b.type]);
    }, [backendLootboxes]);

    // Load lootboxes from API
    useEffect(() => {
        const loadLootboxes = async () => {
            try {
                setLootboxesLoading(true);
                const data = await LootboxesAPI.list();
                setLootboxes(data);
            } catch (err) {
                console.error("Failed to load lootboxes:", err);
            } finally {
                setLootboxesLoading(false);
            }
        };
        loadLootboxes();
    }, []);

    if (userLoading || lootboxesLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl animate-pulse" style={theme.accentText}>
                    Loading...
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const handleOpenChest = async (lootbox: DisplayLootbox) => {
        if (user.stats.gold < lootbox.price) {
            alert("Niet genoeg goud!");
            return;
        }

        setPendingLootbox(lootbox);
        setShowOpenChoice(true);
    };

    const handleOpenNow = async () => {
        if (!pendingLootbox) return;
        
        const lootbox = pendingLootbox;
        setShowOpenChoice(false);

        try {
            // Show chest opening modal
            setOpeningLootbox(lootbox);
            setShowChestOpening(true);
            setOpeningBox(lootbox.id);
            
            // Shake animation
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Backend-only (strict)
            console.log("🔄 Opening lootbox via backend API...");
            const result = await LootboxesAPI.open(lootbox.id);

            // Chest opening animation
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Map backend result to display items
            const items = result.results.map((r: any) => {
                console.log("Backend item:", r);
                console.log("Has bonus?", r.bonus);
                return {
                    name: r.name || "Unknown Item",
                    type: (r.type as ItemType) || "weapon",
                    rarity: (r.rarity as ItemRarity) || "common",
                    icon: r.icon || getDefaultIcon((r.type as ItemType) || "weapon"),
                    isEquipped: false,
                    level: 1,
                    ...(r.stats ? { stats: r.stats } : {}),
                    bonus: r.bonus || null // Include bonus stats
                };
            });

            console.log("✅ Backend lootbox opening successful");
            
            // Hide chest opening modal and show rewards
            setShowChestOpening(false);
            setOpeningLootbox(null);
            setOpeningBox(null);
            setRevealedItems(items);
            setShowRewards(true);
            setPendingLootbox(null);

            // User data will auto-refresh via useRealtimeUser hook
        } catch (error: any) {
            console.error("Failed to open lootbox:", error);
            alert(error.message || "Failed to open lootbox. Please try again.");
            setOpeningBox(null);
            setPendingLootbox(null);
        }
    };

    const handleSaveForLater = async () => {
        if (!pendingLootbox || !user) return;

        const lootbox = pendingLootbox;
        setShowOpenChoice(false);

        try {
            console.log("💾 Saving lootbox to inventory...");
            // Charge gold then store lootbox
            if (lootbox.price) {
                const newGold = Math.max(0, (user.stats?.gold || 0) - lootbox.price);
                await UsersAPI.patch(user.uid, { stats: { gold: newGold } });
            }

            await UsersAPI.addLootboxToInventory(user.uid, lootbox.id, 1);
            
            setSavedLootboxName(lootbox.name);
            setShowSaveSuccess(true);
            setPendingLootbox(null);

            // Auto-close after 1.5 seconds
            setTimeout(() => {
                setShowSaveSuccess(false);
            }, 1500);
        } catch (error: any) {
            console.error("Failed to save lootbox:", error);
            alert(error?.message || "Lootbox kon niet opgeslagen worden. Probeer later opnieuw.");
            setPendingLootbox(null);
        }
    };

// Icon fallback by item type
const getDefaultIcon = (type: ItemType): string => {
    const iconMap: Record<ItemType, string> = {
        weapon: "⚔️",
        armor: "🛡️",
        accessory: "📿",
        pet: "🐾",
    };
    return iconMap[type] || "📦";
};

// Format stat names for display (camelCase to Title Case)
const formatStatName = (stat: string): string => {
    // Add space before capital letters and capitalize first letter
    return stat
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
};

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            <main className="p-8 overflow-y-auto">
                {/* Header */}
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h2 className={`text-3xl font-bold ${theme.text}`}>Lootboxes</h2>
                        <p className={theme.textMuted}>Open chests to discover powerful items!</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: darkMode ? 'rgba(251, 191, 36, 0.1)' : 'rgba(254, 243, 199, 1)' }}>
                        <Coins className="text-yellow-500" size={24} />
                        <span className="text-xl font-bold text-yellow-500">{user.stats.gold}</span>
                    </div>
                </div>

                {/* Lootbox Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {loadingBoxes && (
                        <div className={`${theme.text} col-span-full opacity-80`}>Loading lootboxes...</div>
                    )}
                    {!loadingBoxes && displayLootboxes.length === 0 && (
                        <div className={`${theme.text} col-span-full opacity-80`}>No lootboxes available.</div>
                    )}
                    {!loadingBoxes && displayLootboxes.map((lootbox) => (
                        <LootboxCard
                            key={lootbox.id}
                            lootbox={lootbox}
                            onOpen={() => handleOpenChest(lootbox)}
                            isOpening={openingBox === lootbox.id}
                            darkMode={darkMode}
                            accentColor={accentColor}
                            theme={theme}
                        />
                    ))}
                </div>

                {/* How Lootboxes Work */}
                <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                    <h3 className={`text-xl font-bold ${theme.text} mb-4`}>How Lootboxes Work</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <p className={`font-medium ${theme.text}`}>Random Rewards</p>
                                <p className={`text-sm ${theme.textMuted}`}>Each chest contains random items of varying rarity</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <p className={`font-medium ${theme.text}`}>Better Odds</p>
                                <p className={`text-sm ${theme.textMuted}`}>Higher-tier chests have better items and more quantity</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                                <Zap size={20} />
                            </div>
                            <div>
                                <p className={`font-medium ${theme.text}`}>Get Hyped</p>
                                <p className={`text-sm ${theme.textMuted}`}>Each chest opens up only 1x and has a new epic!</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Choice Modal: Open Now or Save for Later */}
                {showOpenChoice && pendingLootbox && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowOpenChoice(false)}>
                        <div className={`${theme.card} rounded-2xl p-8 max-w-sm w-full mx-4`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }} onClick={(e) => e.stopPropagation()}>
                            <div className="text-center mb-6">
                                <Gift size={48} style={{ color: accentColor }} className="mx-auto mb-2" />
                                <h3 className={`text-2xl font-bold ${theme.text}`}>{pendingLootbox.name}</h3>
                                <p className={`text-lg font-bold text-yellow-500 mt-2`}>Purchased!</p>
                            </div>
                            
                            <p className={`text-center ${theme.textMuted} mb-6`}>Open now or save for later?</p>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={handleOpenNow}
                                    className="flex-1 py-3 rounded-xl font-medium text-white transition-all hover:scale-105 flex items-center justify-center gap-2"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    <Sparkles size={18} />
                                    Open Now
                                </button>
                                <button
                                    onClick={handleSaveForLater}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all hover:scale-105 flex items-center justify-center gap-2 ${theme.text}`}
                                    style={{ backgroundColor: `${accentColor}20`, border: `2px solid ${accentColor}` }}
                                >
                                    <Box size={18} />
                                    Save for Later
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Save Success Modal */}
                {showSaveSuccess && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className={`${theme.card} rounded-2xl p-8 max-w-sm w-full mx-4`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                            <div className="text-center">
                                <div className="mb-4 flex justify-center">
                                    <div className="p-3 rounded-full" style={{ backgroundColor: `${accentColor}20` }}>
                                        <Check size={32} style={{ color: accentColor }} />
                                    </div>
                                </div>
                                <h3 className={`text-xl font-bold ${theme.text} mb-2`}>Saved!</h3>
                                <p className={`${theme.textMuted} mb-4`}>{savedLootboxName} has been saved to your inventory.</p>
                                <p className={`text-sm ${theme.textMuted}`}>Open it anytime from your Inventory.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chest Opening Animation Modal */}
                {showChestOpening && openingLootbox && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="text-center">
                            {/* Animated Chest */}
                            <div className={`inline-block p-12 rounded-3xl ${openingBox ? 'lootbox-opening' : ''}`} style={{ backgroundColor: `${openingLootbox.glowColor}20` }}>
                                <div className="relative inline-flex items-center justify-center w-48 h-48 rounded-3xl text-white lootbox-opening-icon" style={{ background: `${openingLootbox.glowColor}dd` }}>
                                    {/* Sparkles */}
                                    {openingBox && (
                                        <>
                                            <div className="sparkle-particle" style={{ top: '10%', left: '10%', animationDelay: '0s' }}></div>
                                            <div className="sparkle-particle" style={{ top: '20%', left: '85%', animationDelay: '0.15s' }}></div>
                                            <div className="sparkle-particle" style={{ top: '80%', left: '15%', animationDelay: '0.3s' }}></div>
                                            <div className="sparkle-particle" style={{ top: '75%', left: '80%', animationDelay: '0.45s' }}></div>
                                            <div className="sparkle-particle" style={{ top: '50%', left: '50%', animationDelay: '0.2s' }}></div>
                                            <div className="sparkle-particle" style={{ top: '35%', left: '90%', animationDelay: '0.35s' }}></div>
                                        </>
                                    )}
                                    
                                    {/* Burst Effect */}
                                    {openingBox && <div className="lootbox-burst-effect" style={{ background: `${openingLootbox.glowColor}80` }}></div>}
                                    
                                    {/* Chest body (stays) */}
                                    <div className="chest-body">
                                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z"/>
                                            <path d="M12 10v4"/>
                                        </svg>
                                    </div>
                                    
                                    {/* Chest lid (opens) */}
                                    <div className="chest-lid absolute">
                                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10H3"/>
                                            <path d="M21 10l-1.5-5A2 2 0 0 0 17.6 3H6.4a2 2 0 0 0-1.9 2L3 10"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Opening text */}
                            <h2 className="text-3xl font-bold text-white mt-8 animate-pulse">Opening {openingLootbox.name}...</h2>
                        </div>
                    </div>
                )}

                {/* Rewards Modal */}
                {showRewards && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRewards(false)}>
                        <div className={`${theme.card} rounded-2xl p-8 max-w-2xl w-full flex flex-col`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
                            <div className="text-center mb-6 flex-shrink-0">
                                <Sparkles size={48} style={{ color: accentColor }} className="mx-auto mb-2" />
                                <h3 className={`text-2xl font-bold ${theme.text}`}>Rewards!</h3>
                                <p className={`text-sm ${theme.textMuted} mt-2`}>{revealedItems.length} item{revealedItems.length !== 1 ? 's' : ''}</p>
                            </div>
                            
                            {revealedItems.length > 0 ? (
                                <div className="space-y-3 overflow-y-auto flex-1 pr-2" style={{ minHeight: 0, paddingBottom: '1rem' }}>
                                    {revealedItems.map((item, index) => {
                                        const hasBonus = item.bonus && Object.keys(item.bonus).length > 0;                                        console.log(`Item ${index}:`, item.name, "hasBonus:", hasBonus, "bonus:", item.bonus);                                        return (
                                        <div 
                                            key={index} 
                                            className={`p-4 rounded-xl ${theme.inputBg} border-l-4 item-reveal item-reveal-delay-${Math.min(index + 1, 5)} ${hasBonus ? 'stat-boost-glow' : ''}`} 
                                            style={{ 
                                                borderColor: hasBonus ? '#FFD700' : accentColor,
                                                ...(hasBonus ? {
                                                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(255, 215, 0, 0.1)',
                                                    background: darkMode ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255, 215, 0, 0.1)'
                                                } : {})
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-3xl">{item.icon}</span>
                                                <div className="flex-1">
                                                    <p className={`text-base font-bold ${theme.text} ${hasBonus ? 'flex items-center gap-2' : ''}`}>
                                                        {item.name}
                                                        {hasBonus && <Sparkles size={16} className="text-yellow-500" />}
                                                    </p>
                                                    <div className="flex gap-2 mt-2 flex-wrap">
                                                        <span className={`text-xs px-2 py-1 rounded font-bold`} style={{ color: accentColor, backgroundColor: `${accentColor}20` }}>
                                                            {item.rarity.toUpperCase()}
                                                        </span>
                                                        <span className={`text-xs px-2 py-1 rounded ${theme.textMuted}`} style={{ backgroundColor: `${theme.textMuted}10` }}>
                                                            {item.type}
                                                        </span>
                                                        {hasBonus && (
                                                            <span className="text-xs px-2 py-1 rounded font-bold text-yellow-600" style={{ backgroundColor: 'rgba(255, 215, 0, 0.2)', border: '1px solid rgba(255, 215, 0, 0.4)' }}>
                                                                ✨ STAT BOOST
                                                            </span>
                                                        )}
                                                    </div>
                                                    {hasBonus && (
                                                        <div className="mt-2 text-xs space-y-1">
                                                            {Object.entries(item.bonus || {}).map(([stat, value]) => {
                                                                const isPercentage = stat.toLowerCase().includes('chance') || stat.toLowerCase().includes('damage');
                                                                const displayValue = typeof value === 'number' ? value.toFixed(isPercentage ? 1 : 0) : value;
                                                                const formattedStatName = formatStatName(stat);
                                                                return (
                                                                    <div key={stat} className="text-yellow-600 font-medium">
                                                                        +{displayValue}{isPercentage ? '%' : ''} {formattedStatName}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );})}
                                </div>
                            ) : (
                                <div className={`text-center ${theme.textMuted} flex-shrink-0`}>
                                    <p>No items received...</p>
                                </div>
                            )}
                            
                            <button
                                onClick={() => setShowRewards(false)}
                                className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-105 flex items-center justify-center gap-2 mt-6 flex-shrink-0"
                                style={{ backgroundColor: accentColor }}
                            >
                                <Check size={20} />
                                Awesome!
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

/* Lootbox Card Component */
function LootboxCard({
    lootbox,
    onOpen,
    isOpening,
    darkMode,
    accentColor,
    theme
}: {
    lootbox: DisplayLootbox;
    onOpen: () => void;
    isOpening: boolean;
    darkMode: boolean;
    accentColor: string;
    theme: ReturnType<typeof getThemeClasses>;
}) {
    const getIcon = () => {
        const id = lootbox.id.toLowerCase();
        if (id.includes("common")) {
            return <Box size={48} />;
        } else if (id.includes("rare") || id.includes("advanced")) {
            return <Gift size={48} />;
        } else if (id.includes("epic") || id.includes("legendary")) {
            return <Gem size={48} />;
        }
        return <Box size={48} />;
    };

    return (
        <div className="relative">
            {/* Card */}
            <div
                className={`relative rounded-2xl p-6 transition-all ${isOpening ? 'lootbox-opening' : ''}`}
                style={{
                    backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 1)',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: lootbox.glowColor
                }}
            >
                {/* Burst Effect */}
                {isOpening && <div className="lootbox-burst-effect" style={{ background: `${lootbox.glowColor}40` }}></div>}
                
                {/* Sparkles */}
                {isOpening && (
                    <>
                        <div className="sparkle-particle" style={{ top: '20%', left: '20%', animationDelay: '0s' }}></div>
                        <div className="sparkle-particle" style={{ top: '30%', left: '80%', animationDelay: '0.2s' }}></div>
                        <div className="sparkle-particle" style={{ top: '70%', left: '30%', animationDelay: '0.4s' }}></div>
                        <div className="sparkle-particle" style={{ top: '60%', left: '75%', animationDelay: '0.6s' }}></div>
                        <div className="sparkle-particle" style={{ top: '40%', left: '50%', animationDelay: '0.3s' }}></div>
                    </>
                )}

                {/* Icon - Chest with opening animation */}
                <div className="text-center mb-4">
                    <div className={`inline-flex items-center justify-center p-6 rounded-2xl bg-gradient-to-br ${lootbox.gradient} text-white relative ${isOpening ? 'lootbox-opening-icon' : ''}`}>
                        {isOpening ? (
                            <>
                                {/* Chest body (stays) */}
                                <div className="chest-body">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z"/>
                                        <path d="M12 10v4"/>
                                    </svg>
                                </div>
                                {/* Chest lid (opens) */}
                                <div className="chest-lid absolute">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 10H3"/>
                                        <path d="M21 10l-1.5-5A2 2 0 0 0 17.6 3H6.4a2 2 0 0 0-1.9 2L3 10"/>
                                    </svg>
                                </div>
                            </>
                        ) : (
                            getIcon()
                        )}
                    </div>
                </div>

                {/* Name & Quality */}
                <h3 className={`text-xl font-bold ${theme.text} text-center mb-1`}>{lootbox.name}</h3>
                <p className={`text-sm ${theme.textMuted} text-center mb-4`}>{lootbox.quality}</p>

                {/* Price */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Coins className="text-yellow-500" size={24} />
                    <span className="text-xl font-bold text-yellow-500">{lootbox.price}</span>
                </div>

                {/* Rewards */}
                <div className="mb-4">
                    <p className={`text-sm font-medium ${theme.text} mb-2`}>Rewards:</p>
                    <ul className="space-y-1">
                        {lootbox.rewards.map((reward, index) => (
                            <li key={index} className={`text-sm ${theme.textMuted}`}>• {reward}</li>
                        ))}
                    </ul>
                </div>

                {/* Buy Button */}
                <button
                    onClick={onOpen}
                    disabled={isOpening}
                    className={`w-full py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${isOpening ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    style={{ backgroundColor: lootbox.glowColor }}
                >
                    {isOpening ? (
                        <>
                            <Lock size={20} />
                            Processing...
                        </>
                    ) : (
                        <>
                            <Coins size={20} />
                            Buy Chest
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
