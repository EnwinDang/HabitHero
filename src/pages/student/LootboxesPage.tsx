import { useState } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { db, auth } from "@/firebase";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { LootboxesAPI } from "@/api/lootboxes.api";
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

// Lootbox types
type LootboxType = "common" | "rare" | "epic";

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

interface Lootbox {
    id: string;
    type: LootboxType;
    name: string;
    price: number;
    quality: string;
    rewards: string[];
    gradient: string;
    glowColor: string;
}

const lootboxes: Lootbox[] = [
    {
        id: "common",
        type: "common",
        name: "Common Chest",
        price: 100,
        quality: "Common Quality",
        rewards: [
            "+1 random item",
            "+Slightly extra chance",
            "+Common quality loot",
        ],
        gradient: "from-purple-600 to-purple-700",
        glowColor: "#9333ea" // Exact purple from Level card
    },
    {
        id: "rare",
        type: "rare",
        name: "Rare Chest",
        price: 250,
        quality: "Rare Quality",
        rewards: [
            "+2 random items",
            "+Higher rarity chance",
            "+Guaranteed rare+ item",
        ],
        gradient: "from-orange-600 to-orange-700",
        glowColor: "#ea580c" // Exact orange from XP Progress card
    },
    {
        id: "epic",
        type: "epic",
        name: "Epic Chest",
        price: 500,
        quality: "Epic Quality",
        rewards: [
            "+3 random items",
            "+Higher rarity chance",
            "+Guaranteed epic+ item",
        ],
        gradient: "from-yellow-600 to-yellow-700",
        glowColor: "#ca8a04" // Exact gold from Gold card
    }
];

export default function LootboxesPage() {
    const { user, loading: userLoading } = useRealtimeUser();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    // Opening state
    const [openingBox, setOpeningBox] = useState<string | null>(null);
    const [revealedItems, setRevealedItems] = useState<GeneratedItem[]>([]);
    const [showRewards, setShowRewards] = useState(false);

    if (userLoading) {
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
        if (user.stats.gold < lootbox.price) {
            alert("Niet genoeg goud!");
            return;
        }

        setOpeningBox(lootbox.id);

        try {
            // Simulate opening animation
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                // TRY BACKEND FIRST (preferred for security)
                console.log("🔄 Trying backend API for lootbox opening...");
                const result = await LootboxesAPI.open(lootbox.id);

                // Backend success - use backend result
                const items = result.results.map((r: any) => ({
                    name: r.name || "Unknown Item",
                    type: r.type || "misc",
                    rarity: r.rarity || "common",
                    icon: r.icon || "📦",
                    isEquipped: false,
                    level: 1,
                    ...(r.stats ? { stats: r.stats } : {})
                }));

                console.log("✅ Backend lootbox opening successful");
                setRevealedItems(items);
                setShowRewards(true);
                setOpeningBox(null);

            } catch (backendError) {
                // FALLBACK TO FIRESTORE (backend offline)
                console.warn("⚠️ Backend offline, using Firestore fallback:", backendError);

                // Generate items locally
                const items = generateRewards(lootbox.type);

                // Deduct gold from user
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                    "stats.gold": user.stats.gold - lootbox.price
                });

                // Add items to inventory
                const inventoryRef = collection(db, "users", user.uid, "inventory");
                for (const item of items) {
                    await addDoc(inventoryRef, {
                        ...item,
                        acquiredAt: Date.now(),
                        source: `lootbox_${lootbox.type}`
                    });
                }

                console.log(`✅ Firestore fallback successful`);
                console.log(`   Lootbox: ${lootbox.name}`);
                console.log(`   Gold deducted: -${lootbox.price}`);
                console.log(`   Items added: ${items.length}`);

                setRevealedItems(items);
                setShowRewards(true);
                setOpeningBox(null);
            }

            // User data will auto-refresh via useRealtimeUser hook
        } catch (error: any) {
            console.error("Failed to open lootbox:", error);
            alert(error.message || "Er is iets misgegaan bij het openen.");
            setOpeningBox(null);
        }
    };

    const generateRewards = (type: LootboxType): GeneratedItem[] => {
        const commonItems: GeneratedItem[] = [
            { name: "Iron Sword", type: "weapon", rarity: "common", icon: "⚔️", isEquipped: false, level: 1 },
            { name: "Wooden Shield", type: "armor", rarity: "common", icon: "🛡️", isEquipped: false, level: 1 },
            { name: "Health Potion", type: "potion", rarity: "common", icon: "🧪", isEquipped: false, level: 1 }
        ];
        const rareItems: GeneratedItem[] = [
            { name: "Steel Sword", type: "weapon", rarity: "rare", icon: "⚔️", isEquipped: false, level: 1 },
            { name: "Iron Shield", type: "armor", rarity: "rare", icon: "🛡️", isEquipped: false, level: 1 },
            { name: "Mana Potion", type: "potion", rarity: "rare", icon: "🧪", isEquipped: false, level: 1 },
            { name: "Lucky Charm", type: "accessory", rarity: "rare", icon: "📿", isEquipped: false, level: 1 }
        ];
        const epicItems: GeneratedItem[] = [
            { name: "Legendary Blade", type: "weapon", rarity: "epic", icon: "⚔️", isEquipped: false, level: 1 },
            { name: "Dragon Shield", type: "armor", rarity: "epic", icon: "🛡️", isEquipped: false, level: 1 },
            { name: "Elixir of Life", type: "potion", rarity: "epic", icon: "🧪", isEquipped: false, level: 1 },
            { name: "Crown of Wisdom", type: "accessory", rarity: "epic", icon: "👑", isEquipped: false, level: 1 }
        ];

        if (type === "common") {
            return [commonItems[Math.floor(Math.random() * commonItems.length)]];
        } else if (type === "rare") {
            return [
                rareItems[Math.floor(Math.random() * rareItems.length)],
                commonItems[Math.floor(Math.random() * commonItems.length)]
            ];
        } else {
            return [
                epicItems[Math.floor(Math.random() * epicItems.length)],
                rareItems[Math.floor(Math.random() * rareItems.length)],
                commonItems[Math.floor(Math.random() * commonItems.length)]
            ];
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {lootboxes.map((lootbox) => (
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
    onOpen,
    isOpening,
    darkMode,
    accentColor,
    theme
}: {
    lootbox: Lootbox;
    onOpen: () => void;
    isOpening: boolean;
    darkMode: boolean;
    accentColor: string;
    theme: ReturnType<typeof getThemeClasses>;
}) {
    const getIcon = () => {
        switch (lootbox.type) {
            case "common":
                return <Box size={48} />;
            case "rare":
                return <Gift size={48} />;
            case "epic":
                return <Gem size={48} />;
            default:
                return <Box size={48} />;
        }
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
                    borderColor: lootbox.glowColor
                }}
            >
                {/* Icon */}
                <div className="text-center mb-4">
                    <div className={`inline-flex items-center justify-center p-6 rounded-2xl bg-gradient-to-br ${lootbox.gradient} text-white`}>
                        {getIcon()}
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

                {/* Open Button */}
                <button
                    onClick={onOpen}
                    disabled={isOpening}
                    className={`w-full py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${isOpening ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    style={{ backgroundColor: lootbox.glowColor }}
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
