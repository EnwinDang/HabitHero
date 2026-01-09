import { useState, useEffect, useCallback } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { InventoryAPI } from "@/api/inventory.api";
import { ItemsAPI } from "@/api/items.api";
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
    itemId: string;
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    icon: string;
    isEquipped: boolean;
    level?: number;
    // Stats from database
    stats?: {
        hp?: number;
        attack?: number;
        defense?: number;
        crit?: number;
        speed?: number;
    };
    valueGold?: number; // Sell price
    description?: string;
    bonus?: Record<string, number>; // Bonus stats from lootbox
    collection?: string; // Source collection for equip logic
}

// Rarity colors matching the screenshot
const rarityColors = {
    legendary: { border: "#eab308", bg: "rgba(234, 179, 8, 0.1)", text: "#eab308" },
    epic: { border: "#a855f7", bg: "rgba(168, 85, 247, 0.1)", text: "#a855f7" },
    rare: { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" },
    uncommon: { border: "#10b981", bg: "rgba(16, 185, 129, 0.1)", text: "#10b981" },
    common: { border: "#6b7280", bg: "rgba(107, 114, 128, 0.1)", text: "#6b7280" }
};

// Helper to determine item type from collection name
const getTypeFromCollection = (collection: string): ItemType => {
    if (collection?.includes('weapon')) return 'weapon';
    if (collection?.includes('armor')) return 'armor';
    if (collection?.includes('pet')) return 'accessory'; // pets treated as accessory for equip
    if (collection?.includes('arcane')) return 'accessory';
    return 'weapon'; // default fallback
};

export default function InventoryPage() {
    const { user, loading: userLoading } = useRealtimeUser();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [equipped, setEquipped] = useState<any>({});
    const [equippedItemsData, setEquippedItemsData] = useState<InventoryItem[]>([]); // Full equipped item data
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [mergeMessage, setMergeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch inventory from user object (realtime via Firebase)
    const loadInventory = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Read items directly from user object (where lootbox saves them)
            // Items are stored at user.inventory.inventory.items by the lootbox open endpoint
            const userInventory = (user as any).inventory?.inventory?.items || [];
            console.log("📦 Reading inventory from user object:", userInventory);

            // Get equipped items
            const equippedData = await InventoryAPI.getEquipped();
            setEquipped(equippedData || {});

            // Map inventory items to display format
            // Items in inventory only have itemId, need to fetch item details
            const inventoryItemIds = userInventory.map((item: any) => ({
                itemId: item.itemId,
                collection: item.collection,
                rarity: item.rarity,
                type: item.type,
                level: item.level || item.meta?.level || 1,
                bonus: item.bonus,
            }));

            // Group items by collection to batch fetch
            const itemsByCollection: Record<string, any[]> = {};
            inventoryItemIds.forEach((invItem: any) => {
                const collection = invItem.collection || "items_weapons";
                if (!itemsByCollection[collection]) {
                    itemsByCollection[collection] = [];
                }
                itemsByCollection[collection].push(invItem);
            });

            // Fetch all items from each collection
            const allItemDetails: Record<string, any> = {};
            await Promise.all(
                Object.keys(itemsByCollection).map(async (collection) => {
                    try {
                        const response = await ItemsAPI.list({ collection });
                        const items = response.data || [];
                        items.forEach((item: any) => {
                            allItemDetails[item.itemId] = item;
                        });
                    } catch (err) {
                        console.warn(`Failed to fetch items from collection ${collection}:`, err);
                    }
                })
            );

            // Map inventory items with details
            const itemsWithDetails = inventoryItemIds.map((invItem: any, index: number) => {
                const itemDetails = allItemDetails[invItem.itemId];

                // Check if item is equipped
                const isEquipped =
                    equippedData?.weapon === invItem.itemId ||
                    Object.values(equippedData?.armor || {}).includes(invItem.itemId) ||
                    Object.values(equippedData?.pets || {}).includes(invItem.itemId) ||
                    Object.values(equippedData?.accessoiries || {}).includes(invItem.itemId);

                // Determine type from: 1. database itemType, 2. database type, 3. collection name, 4. fallback
                const resolvedType = itemDetails?.itemType || itemDetails?.type || getTypeFromCollection(invItem.collection) || 'weapon';

                return {
                    id: invItem.itemId || `item_${index}`,
                    itemId: invItem.itemId,
                    name: itemDetails?.name || invItem.itemId || "Unknown Item",
                    type: resolvedType as ItemType,
                    rarity: (invItem.rarity || itemDetails?.rarity || "common") as ItemRarity,
                    icon: itemDetails?.icon || "📦",
                    isEquipped: isEquipped,
                    level: invItem.level || 1,
                    // Add stats from database
                    stats: itemDetails?.stats || itemDetails?.baseStats || undefined,
                    valueGold: itemDetails?.sellValue || itemDetails?.valueGold || itemDetails?.value || undefined,
                    description: itemDetails?.description || undefined,
                    bonus: invItem.bonus || undefined,
                    collection: invItem.collection, // Keep collection for equip logic
                } as InventoryItem;
            });

            setItems(itemsWithDetails);

            // Now fetch details for EQUIPPED items separately
            // Since equipped items are removed from inventory, we need to fetch their details
            const equippedItemIds: string[] = [
                equippedData?.weapon,
                ...Object.values(equippedData?.armor || {}),
                ...Object.values(equippedData?.pets || {}),
                ...Object.values(equippedData?.accessoiries || {}),
            ].filter(Boolean) as string[];

            console.log("🔧 Equipped item IDs:", equippedItemIds);

            // Fetch details for equipped items
            const equippedItemsDetails: InventoryItem[] = [];
            for (const itemId of equippedItemIds) {
                // Try to find in allItemDetails first (might already be loaded)
                if (allItemDetails[itemId]) {
                    const itemDetails = allItemDetails[itemId];
                    const resolvedType = itemDetails?.itemType || itemDetails?.type || 'weapon';
                    equippedItemsDetails.push({
                        id: itemId,
                        itemId: itemId,
                        name: itemDetails?.name || itemId,
                        type: resolvedType as ItemType,
                        rarity: (itemDetails?.rarity || "common") as ItemRarity,
                        icon: itemDetails?.icon || "📦",
                        isEquipped: true,
                        level: 1,
                        stats: itemDetails?.stats || itemDetails?.baseStats,
                        valueGold: itemDetails?.sellValue || itemDetails?.valueGold,
                        description: itemDetails?.description,
                    });
                } else {
                    // Item not in cache, try to determine collection from itemId
                    let collection = "items_weapons";
                    if (itemId.includes('armor') || itemId.includes('hood') || itemId.includes('plate') || itemId.includes('pants') || itemId.includes('boots')) {
                        collection = "items_armor";
                    } else if (itemId.includes('pet')) {
                        collection = "items_pets";
                    }

                    try {
                        const response = await ItemsAPI.list({ collection });
                        const items = response.data || [];
                        const itemDetails = items.find((i: any) => i.itemId === itemId);
                        if (itemDetails) {
                            const resolvedType = itemDetails?.itemType || itemDetails?.type || getTypeFromCollection(collection);
                            equippedItemsDetails.push({
                                id: itemId,
                                itemId: itemId,
                                name: itemDetails?.name || itemId,
                                type: resolvedType as ItemType,
                                rarity: (itemDetails?.rarity || "common") as ItemRarity,
                                icon: itemDetails?.icon || "📦",
                                isEquipped: true,
                                level: 1,
                                stats: itemDetails?.stats || itemDetails?.baseStats,
                                valueGold: itemDetails?.sellValue || itemDetails?.valueGold,
                                description: itemDetails?.description,
                            });
                        }
                    } catch (err) {
                        console.warn(`Failed to fetch equipped item ${itemId}:`, err);
                    }
                }
            }

            console.log("🔧 Equipped items with details:", equippedItemsDetails);
            setEquippedItemsData(equippedItemsDetails);
        } catch (err) {
            console.error("Failed to load inventory:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadInventory();
    }, [loadInventory]);

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

    // Filter items - equipped items are now in equippedItemsData state
    const equippedItems = equippedItemsData; // Use separately fetched equipped items with full details
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

    // MERGE LOGIC - Using reroll API endpoint
    const handleMerge = async (targetItem: InventoryItem) => {
        if (!user) return;

        // 1. Find 2 duplicates (same name, same level, NOT the same ID) - need 3 items total for reroll
        const duplicates = items.filter(i =>
            i.itemId === targetItem.itemId &&
            i.id !== targetItem.id &&
            (i.level || 1) === (targetItem.level || 1)
        );

        if (duplicates.length < 2) {
            setMergeMessage({ type: 'error', text: "Need 3 identical items to merge! (including this one)" });
            setTimeout(() => setMergeMessage(null), 3000);
            return;
        }

        const itemIds = [targetItem.itemId, duplicates[0].itemId, duplicates[1].itemId];

        try {
            // Use reroll API endpoint
            const { apiFetch } = await import("@/api/client");
            const result = await apiFetch(`/users/${user.uid}/reroll`, {
                method: "POST",
                body: JSON.stringify({ itemIds }),
            });

            const resultItem = result.result || result;
            const itemName = resultItem.name || resultItem.itemId || 'new item';
            const upgraded = result.upgraded ? ' (Upgraded!)' : '';

            setMergeMessage({ type: 'success', text: `Success! Merged items and got ${itemName}${upgraded}!` });
            setTimeout(() => setMergeMessage(null), 3000);

            // Reload inventory
            await loadInventory();
        } catch (error: any) {
            console.error("Merge failed:", error);
            setMergeMessage({ type: 'error', text: error.message || "Merge failed due to an error." });
            setTimeout(() => setMergeMessage(null), 3000);
        }
    };

    // Helper to check if merge is possible for an item (need 3 identical items)
    const canMerge = (item: InventoryItem) => {
        const duplicates = items.filter(i =>
            i.itemId === item.itemId &&
            i.id !== item.id &&
            (i.level || 1) === (item.level || 1)
        );
        return duplicates.length >= 2; // Need at least 2 duplicates (3 total including this one)
    };

    // EQUIP LOGIC - Using API
    const handleEquip = async (item: InventoryItem) => {
        if (!user) return;

        try {
            // Determine slot based on collection and type
            let slot = "weapon";

            // First check collection name for more accurate slot determination
            if (item.collection?.includes('weapon')) {
                slot = "weapon";
            } else if (item.collection?.includes('armor')) {
                // Determine correct armor slot from itemId
                const itemIdLower = item.itemId.toLowerCase();
                if (itemIdLower.includes('pants') || itemIdLower.includes('legging')) {
                    slot = "pants";
                } else if (itemIdLower.includes('boots') || itemIdLower.includes('shoes')) {
                    slot = "boots";
                } else if (itemIdLower.includes('plate') || itemIdLower.includes('chest')) {
                    slot = "chestplate";
                } else {
                    // Default to helmet for hoods, crowns, helmets, etc.
                    slot = "helmet";
                }
            } else if (item.collection?.includes('pet')) {
                slot = "pet1";
            } else if (item.collection?.includes('arcane')) {
                slot = "accessory1";
            } else if (item.type === "armor") {
                // Fallback armor slot detection
                const itemIdLower = item.itemId.toLowerCase();
                if (itemIdLower.includes('pants') || itemIdLower.includes('legging')) {
                    slot = "pants";
                } else if (itemIdLower.includes('boots') || itemIdLower.includes('shoes')) {
                    slot = "boots";
                } else if (itemIdLower.includes('plate') || itemIdLower.includes('chest')) {
                    slot = "chestplate";
                } else {
                    slot = "helmet";
                }
            } else if (item.type === "accessory") {
                slot = "accessory1";
            }

            console.log(`Equipping ${item.name} (${item.collection}) to slot: ${slot}`);
            await InventoryAPI.equip(item.itemId, slot);
            setMergeMessage({ type: 'success', text: `Equipped ${item.name}!` });
            setTimeout(() => setMergeMessage(null), 3000);

            // Reload inventory to reflect changes
            await loadInventory();
        } catch (error: any) {
            console.error("Equip failed:", error);
            setMergeMessage({ type: 'error', text: error.message || "Failed to equip item." });
            setTimeout(() => setMergeMessage(null), 3000);
        }
    };

    const handleUnequip = async (item: InventoryItem) => {
        if (!user) return;
        try {
            // Determine slot - need to find which slot this item is in
            let slot = "weapon";
            if (equipped.weapon === item.itemId) {
                slot = "weapon";
            } else if (Object.values(equipped.armor || {}).includes(item.itemId)) {
                const armorSlot = Object.entries(equipped.armor || {}).find(([_, id]) => id === item.itemId)?.[0];
                slot = armorSlot || "helmet";
            } else if (Object.values(equipped.pets || {}).includes(item.itemId)) {
                const petSlot = Object.entries(equipped.pets || {}).find(([_, id]) => id === item.itemId)?.[0];
                slot = petSlot || "pet1";
            } else if (Object.values(equipped.accessoiries || {}).includes(item.itemId)) {
                const accSlot = Object.entries(equipped.accessoiries || {}).find(([_, id]) => id === item.itemId)?.[0];
                slot = accSlot || "accessory1";
            }

            await InventoryAPI.unequip(slot);
            setMergeMessage({ type: 'success', text: `Unequipped ${item.name}` });
            setTimeout(() => setMergeMessage(null), 3000);

            // Reload inventory
            await loadInventory();
        } catch (error: any) {
            console.error("Unequip failed:", error);
            setMergeMessage({ type: 'error', text: error.message || "Failed to unequip item." });
            setTimeout(() => setMergeMessage(null), 3000);
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

                {/* Stats Display */}
                {item.stats && (
                    <div className={`mt-1 text-[10px] ${theme.textMuted} space-y-0.5`}>
                        {item.stats.attack && (
                            <div className="flex items-center justify-center gap-1">
                                <span>⚔️ {item.stats.attack}</span>
                                {item.bonus?.attack && <span className="text-green-400">+{item.bonus.attack}</span>}
                            </div>
                        )}
                        {item.stats.defense && (
                            <div className="flex items-center justify-center gap-1">
                                <span>🛡️ {item.stats.defense}</span>
                                {item.bonus?.defense && <span className="text-green-400">+{item.bonus.defense}</span>}
                            </div>
                        )}
                        {item.stats.hp && (
                            <div className="flex items-center justify-center gap-1">
                                <span>❤️ {item.stats.hp}</span>
                                {item.bonus?.hp && <span className="text-green-400">+{item.bonus.hp}</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* Bonus-only stats (if no base stats) */}
                {!item.stats && item.bonus && Object.keys(item.bonus).length > 0 && (
                    <div className={`mt-1 text-[10px] text-green-400 space-y-0.5`}>
                        {item.bonus.attack && <div>⚔️ +{item.bonus.attack}</div>}
                        {item.bonus.defense && <div>🛡️ +{item.bonus.defense}</div>}
                        {item.bonus.hp && <div>❤️ +{item.bonus.hp}</div>}
                        {item.bonus.critChance && <div>💥 +{item.bonus.critChance}% crit</div>}
                    </div>
                )}

                {/* Sell Price */}
                {item.valueGold && (
                    <div className={`mt-1 text-[10px] ${theme.textMuted} flex items-center justify-center gap-1`}>
                        <span>💰</span>
                        <span>{item.valueGold}g</span>
                    </div>
                )}
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
