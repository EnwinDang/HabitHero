import { useState, useEffect } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { LootboxesAPI } from "@/api/lootboxes.api";
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

// Item types (matching InventoryPage)
type ItemType = "weapon" | "armor" | "accessory" | "potion";
type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface GeneratedItem {
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    icon: string;
    isEquipped: boolean;
    level: number;
}

// Helper to get lootbox display properties
const getLootboxDisplayProps = (lootbox: Lootbox) => {
    const id = lootbox.lootboxId.toLowerCase();
    if (id.includes("common")) {
        return {
            gradient: "from-purple-600 to-purple-700",
            glowColor: "#9333ea",
            quality: "Common Quality",
            rewards: ["+1 random item", "+Slightly extra chance", "+Common quality loot"]
        };
    } else if (id.includes("rare") || id.includes("advanced")) {
        return {
            gradient: "from-orange-600 to-orange-700",
            glowColor: "#ea580c",
            quality: "Rare Quality",
            rewards: ["+2 random items", "+Higher rarity chance", "+Guaranteed rare+ item"]
        };
    } else if (id.includes("epic") || id.includes("legendary")) {
        return {
            gradient: "from-yellow-600 to-yellow-700",
            glowColor: "#ca8a04",
            quality: "Epic Quality",
            rewards: ["+3 random items", "+Higher rarity chance", "+Guaranteed epic+ item"]
        };
    }
    // Default
    return {
        gradient: "from-gray-600 to-gray-700",
        glowColor: "#6b7280",
        quality: "Standard Quality",
        rewards: ["+Random items", "+Various rewards"]
    };
};

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

    const handleOpenChest = async (lootbox: Lootbox) => {
        const price = (lootbox as any).priceGold || 100;
        if (user.stats.gold < price) {
            alert("Not enough gold!");
            return;
        }

        setOpeningBox(lootbox.lootboxId);

        try {
            // Simulate opening animation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Use backend API
            console.log("🔄 Opening lootbox via API...", lootbox.lootboxId);
            const result = await LootboxesAPI.open(lootbox.lootboxId);

            // Map backend results to display format
            const items = result.results.map((r: any) => ({
                name: r.name || r.itemId || "Unknown Item",
                type: (r.type || r.itemType || "misc") as ItemType,
                rarity: (r.rarity || "common") as ItemRarity,
                icon: r.icon || "📦",
                isEquipped: false,
                level: 1,
                ...(r.stats ? { stats: r.stats } : {})
            }));

            console.log("✅ Lootbox opened successfully:", result);
            setRevealedItems(items);
            setShowRewards(true);
            setOpeningBox(null);

            // User data will auto-refresh via useRealtimeUser hook
        } catch (error: any) {
            console.error("Failed to open lootbox:", error);
            alert(error.message || "Failed to open lootbox. Please try again.");
            setOpeningBox(null);
        }
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
                {lootboxes.length === 0 ? (
                    <div className={`${theme.card} rounded-2xl p-8 text-center`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <p className={theme.textMuted}>No lootboxes available. Please add lootboxes in the admin panel.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {lootboxes.map((lootbox) => {
                            const displayProps = getLootboxDisplayProps(lootbox);
                            const price = (lootbox as any).priceGold || 100;
                            return (
                                <LootboxCard
                                    key={lootbox.lootboxId}
                                    lootbox={lootbox}
                                    price={price}
                                    displayProps={displayProps}
                                    onOpen={() => handleOpenChest(lootbox)}
                                    isOpening={openingBox === lootbox.lootboxId}
                                    darkMode={darkMode}
                                    accentColor={accentColor}
                                    theme={theme}
                                />
                            );
                        })}
                    </div>
                )}

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

                {/* Rewards Modal */}
                {showRewards && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRewards(false)}>
                        <div className={`${theme.card} rounded-2xl p-8 max-w-md w-full mx-4`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }} onClick={(e) => e.stopPropagation()}>
                            <div className="text-center mb-4">
                                <Sparkles size={48} style={{ color: accentColor }} className="mx-auto mb-2" />
                                <h3 className={`text-2xl font-bold ${theme.text}`}>Rewards!</h3>
                            </div>
                            <div className="space-y-3 mb-6">
                                {revealedItems.map((item, index) => (
                                    <div key={index} className={`p-4 rounded-xl ${theme.inputBg} text-center animate-bounce flex items-center justify-center gap-3`} style={{ animationDelay: `${index * 0.2}s` }}>
                                        <span className="text-2xl">{item.icon}</span>
                                        <div>
                                            <p className={`text-lg font-medium ${theme.text}`}>{item.name}</p>
                                            <p className={`text-xs ${theme.textMuted} uppercase`}>{item.rarity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowRewards(false)}
                                className="w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-105 flex items-center justify-center gap-2"
                                style={{ backgroundColor: accentColor }} // Use solid accent color
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
    price,
    displayProps,
    onOpen,
    isOpening,
    darkMode,
    accentColor,
    theme
}: {
    lootbox: Lootbox;
    price: number;
    displayProps: { gradient: string; glowColor: string; quality: string; rewards: string[] };
    onOpen: () => void;
    isOpening: boolean;
    darkMode: boolean;
    accentColor: string;
    theme: ReturnType<typeof getThemeClasses>;
}) {
    const getIcon = () => {
        const id = lootbox.lootboxId.toLowerCase();
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
                className={`relative rounded-2xl p-6 transition-all ${isOpening ? 'scale-105 animate-pulse' : ''}`}
                style={{
                    backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 1)',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: displayProps.glowColor
                }}
            >
                {/* Icon */}
                <div className="text-center mb-4">
                    <div className={`inline-flex items-center justify-center p-6 rounded-2xl bg-gradient-to-br ${displayProps.gradient} text-white`}>
                        {getIcon()}
                    </div>
                </div>

                {/* Name & Quality */}
                <h3 className={`text-xl font-bold ${theme.text} text-center mb-1`}>{lootbox.name}</h3>
                <p className={`text-sm ${theme.textMuted} text-center mb-4`}>{displayProps.quality}</p>

                {/* Price */}
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Coins className="text-yellow-500" size={24} />
                    <span className="text-xl font-bold text-yellow-500">{price}</span>
                </div>

                {/* Rewards */}
                <div className="mb-4">
                    <p className={`text-sm font-medium ${theme.text} mb-2`}>Rewards:</p>
                    <ul className="space-y-1">
                        {displayProps.rewards.map((reward, index) => (
                            <li key={index} className={`text-sm ${theme.textMuted}`}>• {reward}</li>
                        ))}
                    </ul>
                </div>

                {/* Open Button */}
                <button
                    onClick={onOpen}
                    disabled={isOpening}
                    className={`w-full py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${isOpening ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    style={{ backgroundColor: displayProps.glowColor }}
                >
                    {isOpening ? (
                        <>
                            <Lock size={20} />
                            Opening...
                        </>
                    ) : (
                        <>
                            <Gift size={20} />
                            Open Chest
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
