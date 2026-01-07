import { useState } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { db, auth } from "@/firebase";
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useEffect } from "react";
import {
    Package,
    Sword,
    Shield,
    Gem,
    Droplet,
    Check,
    Hammer,
    ArrowUpCircle
} from "lucide-react";

// Item types
type ItemType = "weapon" | "armor" | "accessory" | "potion";
type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface InventoryItem {
    id: string;
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    icon: string;
    isEquipped: boolean;
    level?: number; // Added level property (optional for potential backward compatibility)
}

// Rarity colors matching the screenshot
const rarityColors = {
    legendary: { border: "#eab308", bg: "rgba(234, 179, 8, 0.1)", text: "#eab308" },
    epic: { border: "#a855f7", bg: "rgba(168, 85, 247, 0.1)", text: "#a855f7" },
    rare: { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" },
    uncommon: { border: "#10b981", bg: "rgba(16, 185, 129, 0.1)", text: "#10b981" },
    common: { border: "#6b7280", bg: "rgba(107, 114, 128, 0.1)", text: "#6b7280" }
};

export default function InventoryPage() {
    const { user, loading: userLoading } = useRealtimeUser();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [mergeMessage, setMergeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null); // Feedback state

    // Fetch inventory items from Firebase
    useEffect(() => {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;

        const inventoryRef = collection(db, "users", firebaseUser.uid, "inventory");
        const q = query(inventoryRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const inventoryItems: InventoryItem[] = [];
            snapshot.forEach((doc) => {
                inventoryItems.push({ id: doc.id, ...doc.data() } as InventoryItem);
            });
            setItems(inventoryItems);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (userLoading || loading) {
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

    // Filter items
    const equippedItems = items.filter(item => item.isEquipped);
    const filteredItems = selectedCategory === "all"
        ? items
        : items.filter(item => item.type === selectedCategory);

    const getTypeIcon = (type: ItemType) => {
        switch (type) {
            case "weapon": return <Sword size={20} />;
            case "armor": return <Shield size={20} />;
            case "accessory": return <Gem size={20} />;
            case "potion": return <Droplet size={20} />;
            default: return <Package size={20} />;
        }
    };

    // MERGE LOGIC
    const handleMerge = async (targetItem: InventoryItem) => {
        if (!user) return;

        // 1. Find a duplicate (same name, same level, NOT the same ID)
        const duplicate = items.find(i =>
            i.name === targetItem.name &&
            i.id !== targetItem.id &&
            (i.level || 1) === (targetItem.level || 1) // Only merge same levels
        );

        if (!duplicate) {
            setMergeMessage({ type: 'error', text: "No duplicate item found to merge!" });
            setTimeout(() => setMergeMessage(null), 3000);
            return;
        }

        const MERGE_COST = 500; // Fixed cost for now
        if (user.stats.gold < MERGE_COST) {
            setMergeMessage({ type: 'error', text: `Not enough gold! Need ${MERGE_COST}g` });
            setTimeout(() => setMergeMessage(null), 3000);
            return;
        }

        try {
            // Optimistic update / Loading state could be added here

            // 1. Deduct Gold
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                "stats.gold": user.stats.gold - MERGE_COST
            });

            // 2. Delete the specific duplicate item
            const duplicateRef = doc(db, "users", user.uid, "inventory", duplicate.id);
            await deleteDoc(duplicateRef);

            // 3. Upgrade the target item
            const targetRef = doc(db, "users", user.uid, "inventory", targetItem.id);
            const newLevel = (targetItem.level || 1) + 1;
            await updateDoc(targetRef, {
                level: newLevel,
                // name: `${targetItem.name} +${newLevel}` // Optional: rename item? Keeping simple for now.
            });

            setMergeMessage({ type: 'success', text: `Success! Upgraded to Level ${newLevel}!` });
            setTimeout(() => setMergeMessage(null), 3000);

        } catch (error) {
            console.error("Merge failed:", error);
            setMergeMessage({ type: 'error', text: "Merge failed due to an error." });
            setTimeout(() => setMergeMessage(null), 3000);
        }
    };

    // Helper to check if merge is possible for an item
    const canMerge = (item: InventoryItem) => {
        return items.some(i =>
            i.name === item.name &&
            i.id !== item.id &&
            (i.level || 1) === (item.level || 1)
        );
    };

    // EQUIP LOGIC
    const handleEquip = async (item: InventoryItem) => {
        if (!user) return;

        try {
            // 1. Find currently equipped item of same type
            const currentEquipped = items.find(i => i.type === item.type && i.isEquipped);

            // 2. Unequip current item if exists
            if (currentEquipped) {
                const currentRef = doc(db, "users", user.uid, "inventory", currentEquipped.id);
                await updateDoc(currentRef, { isEquipped: false });
            }

            // 3. Equip new item
            const itemRef = doc(db, "users", user.uid, "inventory", item.id);
            await updateDoc(itemRef, { isEquipped: true });

            setMergeMessage({ type: 'success', text: `Equipped ${item.name}!` });
            setTimeout(() => setMergeMessage(null), 3000);
        } catch (error) {
            console.error("Equip failed:", error);
            setMergeMessage({ type: 'error', text: "Failed to equip item." });
            setTimeout(() => setMergeMessage(null), 3000);
        }
    };

    const handleUnequip = async (item: InventoryItem) => {
        if (!user) return;
        try {
            const itemRef = doc(db, "users", user.uid, "inventory", item.id);
            await updateDoc(itemRef, { isEquipped: false });
            setMergeMessage({ type: 'success', text: `Unequipped ${item.name}` });
            setTimeout(() => setMergeMessage(null), 3000);
        } catch (error) {
            console.error("Unequip failed:", error);
        }
    };

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            <main className="p-8 overflow-y-auto">
                {/* Header */}
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h2 className={`text-3xl font-bold ${theme.text}`}>Inventory</h2>
                        <p className={theme.textMuted}>Manage your equipment and items</p>
                    </div>

                    {/* Feedback Message */}
                    {mergeMessage && (
                        <div className={`px-4 py-2 rounded-xl text-sm font-bold animate-pulse ${mergeMessage.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                            }`}>
                            {mergeMessage.text}
                        </div>
                    )}
                </div>

                {/* Equipped Items Section */}
                <div className={`${theme.card} rounded-2xl p-6 mb-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                    <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Equipped Items</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {equippedItems.length === 0 ? (
                            <div className="col-span-2 text-center py-8">
                                <Package size={40} className={`mb-4 mx-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                <p className={theme.textMuted}>No items equipped</p>
                            </div>
                        ) : (
                            equippedItems.map(item => (
                                <EquippedItemCard
                                    key={item.id}
                                    item={item}
                                    darkMode={darkMode}
                                    theme={theme}
                                    getTypeIcon={getTypeIcon}
                                    onUnequip={() => handleUnequip(item)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <CategoryButton
                        label="All"
                        isSelected={selectedCategory === "all"}
                        onClick={() => setSelectedCategory("all")}
                        count={items.length}
                        darkMode={darkMode}
                        accentColor={accentColor}
                    />
                    <CategoryButton
                        label="Weapon"
                        isSelected={selectedCategory === "weapon"}
                        onClick={() => setSelectedCategory("weapon")}
                        count={items.filter(i => i.type === "weapon").length}
                        darkMode={darkMode}
                        accentColor={accentColor}
                    />
                    <CategoryButton
                        label="Armor"
                        isSelected={selectedCategory === "armor"}
                        onClick={() => setSelectedCategory("armor")}
                        count={items.filter(i => i.type === "armor").length}
                        darkMode={darkMode}
                        accentColor={accentColor}
                    />
                    <CategoryButton
                        label="Accessory"
                        isSelected={selectedCategory === "accessory"}
                        onClick={() => setSelectedCategory("accessory")}
                        count={items.filter(i => i.type === "accessory").length}
                        darkMode={darkMode}
                        accentColor={accentColor}
                    />
                    <CategoryButton
                        label="Potion"
                        isSelected={selectedCategory === "potion"}
                        onClick={() => setSelectedCategory("potion")}
                        count={items.filter(i => i.type === "potion").length}
                        darkMode={darkMode}
                        accentColor={accentColor}
                    />
                </div>

                {/* All Items Grid */}
                <div className={`${theme.card} rounded-2xl p-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                    <h3 className={`text-xl font-bold ${theme.text} mb-4`}>All Items</h3>
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-12">
                            <Package size={40} className={`mb-4 mx-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            <p className={theme.textMuted}>No items in inventory</p>
                            <p className={`${theme.textSubtle} text-sm`}>Open lootboxes to get items!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredItems.map(item => (
                                <ItemCard
                                    key={item.id}
                                    item={item}
                                    darkMode={darkMode}
                                    theme={theme}
                                    getTypeIcon={getTypeIcon}
                                    canMerge={canMerge(item)}
                                    onMerge={() => handleMerge(item)}
                                    onEquip={() => handleEquip(item)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

/* Equipped Item Card Component */
function EquippedItemCard({
    item,
    darkMode,
    theme,
    getTypeIcon,
    onUnequip
}: {
    item: InventoryItem;
    darkMode: boolean;
    theme: ReturnType<typeof getThemeClasses>;
    getTypeIcon: (type: ItemType) => React.ReactElement;
    onUnequip: () => void;
}) {
    const colors = rarityColors[item.rarity];

    return (
        <div
            className="rounded-xl p-4 transition-all"
            style={{
                backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 1)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: colors.border
            }}
        >
            <div className="flex items-center gap-3">
                <div className="text-4xl">{item.icon}</div>
                <div className="flex-1">
                    <h4 className={`font-bold ${theme.text}`}>{item.name}</h4>
                    <p className={`text-sm ${theme.textMuted} capitalize`}>{item.rarity} • Lvl {item.level || 1}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <Check size={14} style={{ color: colors.text }} />
                        <span className="text-xs" style={{ color: colors.text }}>Equipped</span>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onUnequip();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                >
                    Unequip
                </button>
            </div>
        </div>
    );
}

/* Item Card Component */
function ItemCard({
    item,
    darkMode,
    theme,
    getTypeIcon,
    canMerge,
    onMerge,
    onEquip
}: {
    item: InventoryItem;
    darkMode: boolean;
    theme: ReturnType<typeof getThemeClasses>;
    getTypeIcon: (type: ItemType) => React.ReactElement;
    canMerge?: boolean;
    onMerge?: () => void;
    onEquip?: () => void;
}) {
    const colors = rarityColors[item.rarity];

    return (
        <div
            className="rounded-xl p-4 transition-all hover:scale-105 cursor-pointer"
            style={{
                backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 1)',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: colors.border
            }}
        >
            <div className="text-center">
                <div className="relative inline-block mb-2">
                    <div className="text-4xl">{item.icon}</div>
                    {/* Level Badge */}
                    <div className={`absolute -bottom-2 -right-2 px-1.5 rounded-full text-[10px] font-bold text-white shadow-sm ${(item.level || 1) > 1 ? 'bg-indigo-500' : 'bg-gray-500'
                        }`}>
                        L{(item.level || 1)}
                    </div>
                </div>

                <h4 className={`font-medium ${theme.text} text-sm truncate`}>{item.name}</h4>
                <p className={`text-xs ${theme.textMuted} capitalize`}>{item.rarity}</p>

                {/* Merge Button if available */}
                {canMerge && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            onMerge?.();
                        }}
                        className="mt-2 text-xs w-full py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors hover:scale-105"
                        style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}
                        title="Merge with duplicate for 500g"
                    >
                        <Hammer size={12} />
                        Merge (500g)
                    </button>
                )}

                {/* Equip Button (if not equipped) */}
                {!item.isEquipped && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEquip?.();
                        }}
                        className={`mt-2 text-xs w-full py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors hover:scale-105`}
                        style={{
                            backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6'
                        }}
                    >
                        <ArrowUpCircle size={12} />
                        Equip
                    </button>
                )}

                {/* Equipped Indicator */}
                {item.isEquipped && (
                    <div className="mt-2 text-xs font-bold text-green-500 flex items-center justify-center gap-1">
                        <Check size={12} /> Equipped
                    </div>
                )}
            </div>
        </div>
    );
}

/* Category Button Component */
function CategoryButton({
    label,
    isSelected,
    onClick,
    count,
    darkMode,
    accentColor
}: {
    label: string;
    isSelected: boolean;
    onClick: () => void;
    count: number;
    darkMode: boolean;
    accentColor: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${isSelected
                ? 'text-white'
                : darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                }`}
            style={isSelected ? {
                backgroundColor: accentColor // Use user's selected accent color
            } : {
                backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 1)'
            }}
        >
            {label} ({count})
        </button>
    );
}
