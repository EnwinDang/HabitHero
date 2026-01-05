import { useState } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { db, auth } from "@/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useEffect } from "react";
import {
    Package,
    Sword,
    Shield,
    Gem,
    Droplet,
    Star,
    Check
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
                    Laden...
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

    return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
            <main className="p-8 overflow-y-auto">
                {/* Header */}
                <div className="mb-6">
                    <h2 className={`text-3xl font-bold ${theme.text}`}>Inventory</h2>
                    <p className={theme.textMuted}>Manage your equipment and items</p>
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
    getTypeIcon
}: {
    item: InventoryItem;
    darkMode: boolean;
    theme: ReturnType<typeof getThemeClasses>;
    getTypeIcon: (type: ItemType) => React.ReactElement;
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
                    <p className={`text-sm ${theme.textMuted} capitalize`}>{item.rarity}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <Check size={14} style={{ color: colors.text }} />
                        <span className="text-xs" style={{ color: colors.text }}>Equipped</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* Item Card Component */
function ItemCard({
    item,
    darkMode,
    theme,
    getTypeIcon
}: {
    item: InventoryItem;
    darkMode: boolean;
    theme: ReturnType<typeof getThemeClasses>;
    getTypeIcon: (type: ItemType) => React.ReactElement;
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
                <div className="text-4xl mb-2">{item.icon}</div>
                <h4 className={`font-medium ${theme.text} text-sm`}>{item.name}</h4>
                <p className={`text-xs ${theme.textMuted} capitalize`}>{item.rarity}</p>
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
