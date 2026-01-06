import { useState } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { db, auth } from "@/firebase";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
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
    const [revealedItems, setRevealedItems] = useState<string[]>([]);
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
            alert("Not enough gold!");
            return;
        }

        setOpeningBox(lootbox.id);

        try {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) {
                console.error("No authenticated user");
                return;
            }

            // Simulate opening animation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generate random rewards based on lootbox type
            const items = generateRewards(lootbox.type);

            // Save lootbox opening to Firebase
            const lootboxesRef = collection(db, "users", firebaseUser.uid, "lootboxes");
            await addDoc(lootboxesRef, {
                lootboxType: lootbox.type,
                lootboxName: lootbox.name,
                price: lootbox.price,
                rewards: items,
                openedAt: Date.now()
            });

            // Update user gold (deduct lootbox price)
            const userRef = doc(db, "users", firebaseUser.uid);
            await updateDoc(userRef, {
                "stats.gold": user.stats.gold - lootbox.price
            });

            setRevealedItems(items);
            setShowRewards(true);
            setOpeningBox(null);
        } catch (error) {
            console.error("Failed to open lootbox:", error);
            setOpeningBox(null);
        }
    };

    const generateRewards = (type: LootboxType): string[] => {
        const commonItems = ["⚔️ Iron Sword", "🛡️ Wooden Shield", "🧪 Health Potion"];
        const rareItems = ["⚔️ Steel Sword", "🛡️ Iron Shield", "🧪 Mana Potion", "📿 Lucky Charm"];
        const epicItems = ["⚔️ Legendary Blade", "🛡️ Dragon Shield", "🧪 Elixir of Life", "👑 Crown of Wisdom"];

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
                                    <div key={index} className={`p-4 rounded-xl ${theme.inputBg} text-center animate-bounce`} style={{ animationDelay: `${index * 0.2}s` }}>
                                        <p className={`text-lg font-medium ${theme.text}`}>{item}</p>
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
