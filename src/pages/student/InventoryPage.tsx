import { useState, useEffect, useCallback, useRef } from "react";
import { useRealtimeUser } from "@/hooks/useRealtimeUser";
import { useTheme, getThemeClasses } from "@/context/ThemeContext";
import { InventoryAPI } from "@/api/inventory.api";
import { ItemsAPI } from "@/api/items.api";
import { LootboxesAPI } from "@/api/lootboxes.api";
import { Modal } from "@/components/Modal";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import type { StatBlock } from "@/models/item.model";
import {
    Package,
    Sword,
    Shield,
    Gem,
    Check,
    Hammer,
    ArrowUpCircle,
    Gift,
    Loader2,
    PawPrint
} from "lucide-react";

// Item types
type ItemType = "weapon" | "armor" | "accessory" | "pet";
type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface InventoryItem {
    id: string;
    itemId: string;
    name: string;
    type: ItemType;
    rarity: ItemRarity;
    icon: string;
    isEquipped: boolean;
    level?: number; // Added level property (optional for potential backward compatibility)
    description?: string | null;
    stats?: StatBlock;
    buffs?: StatBlock;
    element?: string | null;
    sellValue?: number;
    bonus?: Record<string, number> | null;
    collection?: string;
}

// Rarity colors matching the screenshot
const rarityColors = {
    legendary: { border: "#eab308", bg: "rgba(234, 179, 8, 0.1)", text: "#eab308" },
    epic: { border: "#a855f7", bg: "rgba(168, 85, 247, 0.1)", text: "#a855f7" },
    rare: { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" },
    uncommon: { border: "#10b981", bg: "rgba(16, 185, 129, 0.1)", text: "#10b981" },
    common: { border: "#6b7280", bg: "rgba(107, 114, 128, 0.1)", text: "#6b7280" }
};

const elementColors: Record<string, string> = {
    fire: "#f97316",
    water: "#38bdf8",
    earth: "#84cc16",
    air: "#c084fc",
    wind: "#c084fc",
    arcane: "#8b5cf6",
    lightning: "#fbbf24",
    ice: "#67e8f9",
    shadow: "#a855f7",
    light: "#facc15",
    nature: "#4ade80",
    default: "#9ca3af"
};

export default function InventoryPage() {
    const { user, loading: userLoading } = useRealtimeUser();
    const { darkMode, accentColor } = useTheme();
    const theme = getThemeClasses(darkMode, accentColor);

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [equipped, setEquipped] = useState<any>({});
    const [itemDetailCache, setItemDetailCache] = useState<Record<string, InventoryItem>>({});
    const [lootboxes, setLootboxes] = useState<any[]>([]);
    const [userLootboxes, setUserLootboxes] = useState<any>({});
    const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const loadedOnce = useRef(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [statsItem, setStatsItem] = useState<InventoryItem | null>(null);
    const [openingLootbox, setOpeningLootbox] = useState<string | null>(null);
    const [mergeMessage, setMergeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSell = async (item: InventoryItem) => {
        if (!user) return;
        if (item.isEquipped) {
            setMergeMessage({ type: 'error', text: 'Unequip this item before selling.' });
            setTimeout(() => setMergeMessage(null), 2500);
            return;
        }
        try {
            const res = await InventoryAPI.sell(item.itemId, item.bonus || null);
            setMergeMessage({ type: 'success', text: `Sold ${item.name} for ${res.sellValue || item.sellValue || 0} gold.` });
            setTimeout(() => setMergeMessage(null), 2500);
            await loadInventory();
        } catch (err: any) {
            console.error('Sell failed', err);
            setMergeMessage({ type: 'error', text: err?.message || 'Failed to sell item.' });
            setTimeout(() => setMergeMessage(null), 2500);
        }
    };

    // Realtime: listen to user inventory/equipped changes
    useEffect(() => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const unsub = onSnapshot(userRef, (snap) => {
            const data: any = snap.data() || {};
            const inv = data.inventory || {};
            const equippedData = inv.equiped || {};
            setEquipped(equippedData);

            const rawItems: any[] = inv.inventory?.items || [];
            const counts: Record<string, number> = {};
            rawItems.forEach((it: any) => {
                const key = it?.itemId;
                if (!key) return;
                counts[key] = (counts[key] || 0) + 1;
            });
            setItemCounts(counts);

            const lootboxArray = inv.inventory?.lootboxes || [];
            const lbCounts: Record<string, number> = {};
            lootboxArray.forEach((lb: any) => {
                const id = lb?.lootboxId || lb;
                if (!id) return;
                lbCounts[id] = (lbCounts[id] || 0) + 1;
            });
            setUserLootboxes(lbCounts);

            // Update equipped flags deterministically so only one copy is marked equipped
            setItems((prev) => markEquippedInstances(prev, equippedData));
        });
        return () => unsub();
    }, [user]);

    // Fetch inventory from API
    const loadInventory = useCallback(async () => {
        if (!user) return;
        
        try {
            if (!loadedOnce.current) setLoading(true);
            // Get user-specific inventory from API
            const { apiFetch } = await import("@/api/client");
            const userInventory = (await apiFetch(`/users/${user.uid}/inventory`)) as any;
            
            // Get equipped items from user-specific endpoint
            const equippedData = (await apiFetch(`/users/${user.uid}/equipped`)) as any;
            setEquipped(equippedData || {});
            
            // Set lootbox counts directly from API response
            setUserLootboxes(userInventory.lootboxes || {});
            
            // Map inventory items to display format
            // Items from API response already have details
            // Preserve bonus property; items with bonus will be shown separately
            const inventoryItems = (userInventory.items || []).map((item: any, index: number) => {
                // Normalize type from collection or type string
                const displayType = normalizeItemType(item);
                const displayName = item.name || item.displayName || item.title || item.itemId || "Unknown Item";
                const icon = item.icon || getDefaultIcon(displayType);
                // Generate unique ID per item instance (include bonus hash for separation)
                const bonusHash = item.bonus ? JSON.stringify(item.bonus).substring(0, 8) : '';
                const uniqueId = `${item.id || `item_${index}`}${bonusHash ? '_' + bonusHash : ''}`;
                return {
                    id: uniqueId,
                    itemId: item.itemId,
                    name: displayName,
                    type: displayType,
                    rarity: (item.rarity || "common") as ItemRarity,
                    icon,
                    isEquipped: false,
                    level: item.level || 1,
                    description: item.description,
                    stats: item.stats,
                    buffs: item.buffs,
                    element: item.element || null,
                    sellValue: item.sellValue || item.price?.sellValue || item.sell || 0,
                    bonus: item.bonus || null,
                    collection: item.collection,
                } as InventoryItem;
            });

            const flaggedItems = markEquippedInstances(inventoryItems, equippedData);
            console.log("📦 Loaded inventory items:", inventoryItems.length, inventoryItems);
            console.log("📦 Items with bonus:", inventoryItems.filter((it: any) => it.bonus));
            setItems(flaggedItems);
            // Cache details so equipped items stay visible even when removed from inventory list
            setItemDetailCache((prev) => {
                const next = { ...prev } as Record<string, InventoryItem>;
                flaggedItems.forEach((it) => {
                    next[it.itemId] = it;
                });
                return next;
            });

            // Compute counts per itemId (all copies, including boosted variants)
            const counts: Record<string, number> = {};
            (userInventory.items || []).forEach((it: any) => {
                const key = it.itemId;
                if (!key) return;
                counts[key] = (counts[key] || 0) + 1;
            });
            setItemCounts(counts);

            // Load all available lootboxes
            try {
                const allLootboxes = await LootboxesAPI.list();
                setLootboxes(allLootboxes || []);
            } catch (err) {
                console.warn("Failed to load lootboxes:", err);
            }
        } catch (err) {
            console.error("Failed to load inventory:", err);
        } finally {
            loadedOnce.current = true;
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        loadInventory();
    }, [loadInventory]);

    if (userLoading || (!loadedOnce.current && loading)) {
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

    const resolveItem = (itemId?: string | null): InventoryItem | null => {
        if (!itemId) return null;
        const inList = items.find(i => i.itemId === itemId);
        if (inList) return inList;
        const cached = itemDetailCache[itemId];
        if (cached) return cached;
        // Fallback minimal placeholder
        return {
            id: itemId,
            itemId,
            name: itemId,
            type: "weapon",
            rarity: "common",
            icon: "📦",
            isEquipped: true,
            level: 1,
            description: "",
            stats: {},
            bonus: null,
        } as InventoryItem;
    };

    // Build equipped slots with labels and resolve full item details
    const equippedSlots: { slot: string; item: InventoryItem | null }[] = [];
    if (equipped?.weapon) {
        equippedSlots.push({ slot: "Weapon", item: resolveItem(equipped.weapon) });
    }
    const armorEntries = Object.entries(equipped?.armor || {});
    armorEntries.forEach(([slot, id]) => {
        if (!id) return;
        const label = slot.charAt(0).toUpperCase() + slot.slice(1);
        equippedSlots.push({ slot: label, item: resolveItem(id) });
    });
    const petEntries = Object.entries(equipped?.pets || {});
    petEntries.forEach(([slot, id]) => {
        if (!id) return;
        const label = slot.toLowerCase().includes("pet") ? slot : `Pet ${slot}`;
        equippedSlots.push({ slot: label, item: resolveItem(id) });
    });
    const accEntries = Object.entries(equipped?.accessoiries || {});
    accEntries.forEach(([slot, id]) => {
        if (!id) return;
        const label = slot.toLowerCase().includes("accessory") ? slot : `Accessory ${slot}`;
        equippedSlots.push({ slot: label, item: resolveItem(id) });
    });
    const filteredItems = selectedCategory === "all"
        ? items
        : items.filter(item => item.type === selectedCategory);

    const getTypeIcon = (type: ItemType) => {
        switch (type) {
            case "weapon": return <Sword size={20} />;
            case "armor": return <Shield size={20} />;
            case "accessory": return <Gem size={20} />;
            case "pet": return <PawPrint size={20} />;
            default: return <Package size={20} />;
        }
    };

    // MERGE LOGIC REMOVED per request

    // EQUIP LOGIC - Using API
    const handleEquip = async (item: InventoryItem) => {
        if (!user) return;

        try {
            // Determine slot based on item metadata
            let slot = "weapon";
            const id = item.itemId.toLowerCase();
            const type = (item.type || "").toLowerCase();
            if (type === "armor" || id.includes("armor_")) {
                if (id.includes("helmet") || id.includes("helm")) slot = "helmet";
                else if (id.includes("plate") || id.includes("chest")) slot = "chestplate";
                else if (id.includes("leggings") || id.includes("pants")) slot = "pants";
                else if (id.includes("boots")) slot = "boots";
            } else if (type === "accessory" || id.includes("accessory_")) {
                slot = "accessory1";
            } else if (type === "pet" || id.startsWith("pet_")) {
                // prefer first empty pet slot
                slot = equipped?.pets?.pet1 ? "pet2" : "pet1";
            } else {
                slot = "weapon";
            }

            // Auto-unequip if slot already occupied
            if (slot === "weapon" && equipped?.weapon) {
                await InventoryAPI.unequip(slot);
            } else if (["helmet","chestplate","pants","boots"].includes(slot) && equipped?.armor?.[slot]) {
                await InventoryAPI.unequip(slot);
            } else if (["pet1","pet2"].includes(slot) && equipped?.pets?.[slot]) {
                await InventoryAPI.unequip(slot);
            } else if (["accessory1","accessory2"].includes(slot) && equipped?.accessoiries?.[slot]) {
                await InventoryAPI.unequip(slot);
            }

            await InventoryAPI.equip(item.itemId, slot);
            // Optimistic: only one copy marked equipped, others stay in inventory
            setEquipped((prev: any) => {
                const next = { ...prev, armor: { ...(prev?.armor || {}) }, pets: { ...(prev?.pets || {}) }, accessoiries: { ...(prev?.accessoiries || {}) } };
                if (slot === "weapon") next.weapon = item.itemId;
                else if (["helmet","chestplate","pants","boots"].includes(slot)) next.armor[slot] = item.itemId;
                else if (["pet1","pet2"].includes(slot)) next.pets[slot] = item.itemId;
                else if (["accessory1","accessory2"].includes(slot)) next.accessoiries[slot] = item.itemId;
                setItems((current) => markEquippedInstances(current, next));
                return next;
            });
            setMergeMessage({ type: 'success', text: `Equipped ${item.name}!` });
            setTimeout(() => setMergeMessage(null), 3000);
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
            // Optimistic local update; realtime listener will sync
            setEquipped((prev: any) => {
                const next = { ...prev, armor: { ...(prev?.armor || {}) }, pets: { ...(prev?.pets || {}) }, accessoiries: { ...(prev?.accessoiries || {}) } };
                if (slot === "weapon") next.weapon = "";
                else if (["helmet","chestplate","pants","boots"].includes(slot)) delete next.armor[slot];
                else if (["pet1","pet2"].includes(slot)) delete next.pets[slot];
                else if (["accessory1","accessory2"].includes(slot)) delete next.accessoiries[slot];
                setItems((current) => markEquippedInstances(current, next));
                return next;
            });
            setMergeMessage({ type: 'success', text: `Unequipped ${item.name}` });
            setTimeout(() => setMergeMessage(null), 3000);
        } catch (error: any) {
            console.error("Unequip failed:", error);
            setMergeMessage({ type: 'error', text: error.message || "Failed to unequip item." });
            setTimeout(() => setMergeMessage(null), 3000);
        }
    };

    const handleOpenLootbox = async (lootboxId: string) => {
        if (!user || !userLootboxes[lootboxId] || userLootboxes[lootboxId] === 0) {
            setMergeMessage({ type: 'error', text: "You don't have this lootbox!" });
            setTimeout(() => setMergeMessage(null), 3000);
            return;
        }

        try {
            setOpeningLootbox(lootboxId);
            const result = await LootboxesAPI.open(lootboxId, 1);
            
            const itemNames = result.results?.map((r: any) => r.name || "Unknown").join(", ") || "Unknown items";
            setMergeMessage({ type: 'success', text: `Opened lootbox! Got: ${itemNames}` });
            setTimeout(() => setMergeMessage(null), 3000);
            
            // Reload inventory
            await loadInventory();
        } catch (error: any) {
            console.error("Open lootbox failed:", error);
            setMergeMessage({ type: 'error', text: error.message || "Failed to open lootbox." });
            setTimeout(() => setMergeMessage(null), 3000);
        } finally {
            setOpeningLootbox(null);
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

                {/* Equipped Items Section - Fixed Slots */}
                <div className={`${theme.card} rounded-2xl p-6 mb-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                    <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Equipped Items</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { key: 'weapon', label: 'Weapon', id: equipped?.weapon },
                            { key: 'helmet', label: 'Helmet', id: equipped?.armor?.helmet },
                            { key: 'chestplate', label: 'Chestplate', id: equipped?.armor?.chestplate },
                            { key: 'pants', label: 'Pants', id: equipped?.armor?.pants },
                            { key: 'boots', label: 'Boots', id: equipped?.armor?.boots },
                            { key: 'accessory1', label: 'Accessory 1', id: equipped?.accessoiries?.accessory1 },
                            { key: 'accessory2', label: 'Accessory 2', id: equipped?.accessoiries?.accessory2 },
                            { key: 'pet1', label: 'Pet 1', id: equipped?.pets?.pet1 },
                            { key: 'pet2', label: 'Pet 2', id: equipped?.pets?.pet2 },
                        ].map(({ key, label, id }) => {
                            const found = id ? resolveItem(id) : null;
                            return found ? (
                                <EquippedItemCard
                                    key={`slot_${key}_${found.itemId}`}
                                    item={found}
                                    slotLabel={label}
                                    darkMode={darkMode}
                                    theme={theme}
                                    getTypeIcon={getTypeIcon}
                                    onUnequip={() => handleUnequip(found)}
                                    onShowStats={() => setStatsItem(found)}
                                />
                            ) : (
                                <div
                                    key={`slot_${key}_empty`}
                                    className="rounded-xl p-4 border"
                                    style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="text-4xl">📦</div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold ${theme.text}`}>{label}</h4>
                                            <p className={`text-sm ${theme.textMuted}`}>Empty slot</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                        label="Pet"
                        isSelected={selectedCategory === "pet"}
                        onClick={() => setSelectedCategory("pet")}
                        count={items.filter(i => i.type === "pet").length}
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
                        (() => {
                            const instanceIndexMap: Record<string, number> = {};
                            return (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredItems.map((item, idx) => {
                                        const totalCopies = Math.max(itemCounts[item.itemId] || 0, 1);
                                        // For items with bonus, show as individual card (not aggregated)
                                        // For items without bonus, count all copies of that itemId
                                        const displayCount = item.bonus ? 1 : totalCopies;
                                        const instanceIndex = item.bonus ? 1 : (instanceIndexMap[item.itemId] || 0) + 1;
                                        if (!item.bonus) {
                                            instanceIndexMap[item.itemId] = instanceIndex;
                                        }
                                        return (
                                            <ItemCard
                                                key={`${item.id}_${idx}`}
                                                item={item}
                                                darkMode={darkMode}
                                                theme={theme}
                                                getTypeIcon={getTypeIcon}
                                                totalCopies={displayCount}
                                                instanceIndex={instanceIndex}
                                                onEquip={() => handleEquip(item)}
                                                onShowStats={() => setStatsItem(item)}
                                                onSell={() => handleSell(item)}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })()
                    )}
                </div>

                {/* Lootboxes Section */}
                <div className={`${theme.card} rounded-2xl p-6 mt-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                    <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Lootboxes</h3>
                    {lootboxes.length === 0 ? (
                        <div className="text-center py-12">
                            <Gift size={40} className={`mb-4 mx-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            <p className={theme.textMuted}>No lootboxes available</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {lootboxes.map(lb => {
                                const count = userLootboxes[lb.lootboxId] || 0;
                                return (
                                    <div
                                        key={lb.lootboxId}
                                        className={`${theme.card} rounded-xl p-4 border transition-all ${count > 0 ? 'hover:shadow-lg' : 'opacity-50'}`}
                                        style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h4 className={`font-bold ${theme.text}`}>{lb.name}</h4>
                                                {lb.description && (
                                                    <p className={`text-xs ${theme.textMuted} mt-1`}>{lb.description}</p>
                                                )}
                                            </div>
                                            <div className={`text-lg font-bold ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg px-3 py-1 ml-2`} style={{ color: accentColor }}>
                                                {count}x
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleOpenLootbox(lb.lootboxId)}
                                            disabled={count === 0 || openingLootbox === lb.lootboxId}
                                            className={`w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-white ${
                                                count === 0
                                                    ? 'opacity-50 cursor-not-allowed bg-gray-400'
                                                    : 'hover:shadow-lg'
                                            }`}
                                            style={{ backgroundColor: count > 0 ? accentColor : undefined }}
                                        >
                                            {openingLootbox === lb.lootboxId ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Opening...
                                                </>
                                            ) : (
                                                <>
                                                    <Gift size={16} />
                                                    Open
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                {/* Stats Modal */}
                {statsItem && (
                    <Modal
                        title={`${statsItem.name}`}
                        label="Item Stats"
                        showClose
                        onClose={() => setStatsItem(null)}
                        maxWidth={640}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">{statsItem.icon}</div>
                                <div>
                                    <div className="text-sm font-semibold capitalize">{statsItem.rarity} • {statsItem.type}</div>
                                    {hasStatBoost(statsItem) && (
                                        <div className="text-xs font-bold text-yellow-600">Has Stat Bonus</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-bold mb-2">{statsItem.type === 'pet' ? 'Buffs' : 'Base Stats'}</div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {renderFullStats(statsItem)}
                                </div>
                            </div>

                            {statsItem.bonus && Object.keys(statsItem.bonus).length > 0 && (
                                <div>
                                    <div className="text-sm font-bold mb-2">Bonus Stats</div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {Object.entries(statsItem.bonus).map(([k, v]) => (
                                            <div key={k} className="flex items-center justify-between border rounded-md px-2 py-1">
                                                <span className="text-gray-600">{formatStatKey(k)}</span>
                                                <span className="font-semibold">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal>
                )}

                </div>
            </main>
        </div>
    );
}

/* Equipped Item Card Component */
function EquippedItemCard({
    item,
    slotLabel,
    darkMode,
    theme,
    getTypeIcon,
    onUnequip,
    onShowStats
}: {
    item: InventoryItem;
    slotLabel: string;
    darkMode: boolean;
    theme: ReturnType<typeof getThemeClasses>;
    getTypeIcon: (type: ItemType) => React.ReactElement;
    onUnequip: () => void;
    onShowStats: () => void;
}) {
    const colors = rarityColors[item.rarity];
    const statsTooltip = buildStatsTooltip(item);
    const hasBoost = hasStatBoost(item);
    const elementColor = elementColors[item.element || "default"] || elementColors.default;
    const baseCardBg = darkMode ? 'rgba(31, 41, 55, 0.65)' : 'rgba(255, 255, 255, 0.9)';
    const elementTint = `${elementColor}22`;

    return (
        <div
            className="rounded-xl p-4 transition-all"
            style={{
                background: `linear-gradient(135deg, ${elementTint}, ${baseCardBg})`,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: hasBoost ? '#facc15' : colors.border,
                boxShadow: hasBoost ? '0 0 12px rgba(250, 204, 21, 0.4)' : `0 0 6px ${elementColor}33`
            }}
            title={statsTooltip}
            onClick={() => onShowStats()}
        >
            <div className="flex items-center gap-3">
                <div className="relative text-4xl" title={statsTooltip}>
                    <div title={statsTooltip}>{item.icon}</div>
                    {hasBoost && (
                        <span className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ backgroundColor: 'rgba(250, 204, 21, 0.8)', color: '#1f2937' }}>
                            ✨
                        </span>
                    )}
                </div>
                <div className="flex-1">
                    <h4 className={`font-bold ${theme.text}`} title={statsTooltip}>{item.name}</h4>
                    <p className={`text-xs ${theme.textMuted}`}>{slotLabel}</p>
                    <p className={`text-sm ${theme.textMuted} capitalize`}>{item.rarity}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <Check size={14} style={{ color: colors.text }} />
                        <span className="text-xs" style={{ color: colors.text }}>Equipped</span>
                    </div>
                    {hasBoost && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-bold" style={{ color: '#ca8a04' }}>
                            <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(250, 204, 21, 0.2)', border: '1px solid rgba(250, 204, 21, 0.5)' }}>
                                Stat Boost
                            </span>
                        </div>
                    )}
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
    totalCopies,
    instanceIndex,
    onEquip,
    onShowStats,
    onSell
}: {
    item: InventoryItem;
    darkMode: boolean;
    getTypeIcon: (type: ItemType) => React.ReactElement;
    totalCopies: number;
    instanceIndex: number;
    onEquip?: () => void;
    onShowStats?: () => void;
    onSell?: () => void;
}) {
    const colors = rarityColors[item.rarity];
    const statsTooltip = buildStatsTooltip(item);
    const countLabel = totalCopies > 1 ? `${instanceIndex}/${totalCopies}` : "1x";
    const hasBoost = hasStatBoost(item);
    const elementColor = elementColors[item.element || "default"] || elementColors.default;

    const baseCardBg = darkMode ? 'rgba(31, 41, 55, 0.65)' : 'rgba(255, 255, 255, 0.9)';
    const elementTint = `${elementColor}22`; // subtle element tint

    return (
        <div
            className="rounded-xl p-4 transition-all hover:scale-105 cursor-pointer"
            style={{
                background: `linear-gradient(135deg, ${elementTint}, ${baseCardBg})`,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: hasBoost ? '#facc15' : colors.border,
                boxShadow: hasBoost ? '0 0 12px rgba(250, 204, 21, 0.35)' : `0 0 6px ${elementColor}33`
            }}
            title={statsTooltip}
            onClick={() => onShowStats?.()}
        >
            <div className="text-center" title={statsTooltip}>
                <div className="relative inline-block mb-2" title={statsTooltip}>
                    <div className="text-4xl" title={statsTooltip}>{item.icon}</div>
                    {hasBoost && (
                        <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ backgroundColor: 'rgba(250, 204, 21, 0.85)', color: '#1f2937' }}>
                            ✨
                        </span>
                    )}
                    {item.element && (
                        <div className="absolute -bottom-2 -left-2 px-1.5 rounded-md text-[10px] font-bold shadow-sm" style={{ backgroundColor: elementColor + '22', color: elementColor }}>
                            {item.element}
                        </div>
                    )}
                    {/* Quantity Badge (top-left) */}
                    <div className={`absolute -top-2 -left-2 px-1.5 rounded-md text-[10px] font-bold shadow-sm ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {countLabel}
                    </div>
                    {/* Level Badge removed (no levels) */}
                </div>

                <h4 className={`font-medium ${theme.text} text-sm truncate`}>{item.name}</h4>
                <p className={`text-xs ${theme.textMuted} capitalize`}>{item.rarity}</p>
                {hasBoost && (
                    <div className="mt-1 flex justify-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(250, 204, 21, 0.2)', color: '#ca8a04', border: '1px solid rgba(250, 204, 21, 0.5)' }}>
                            Stat Boost
                        </span>
                    </div>
                )}
                {/* Stat badges removed; stats shown via tooltip only */}

                {/* Merge Button removed */}

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

                {!item.isEquipped && (
                    <div className="mt-2 flex flex-col gap-1 text-xs">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSell?.();
                            }}
                            disabled={!item.sellValue || item.sellValue <= 0}
                            className={`w-full py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors ${(!item.sellValue || item.sellValue <= 0) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30'}`}
                        >
                            Sell for {item.sellValue ?? 0} gold
                        </button>
                    </div>
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

function renderStatBadges(stats: StatBlock = {}, darkMode: boolean) {
    // Hide zero values in compact badges, keep non-zero
    const entries = Object.entries(stats).filter(([, v]) => v !== undefined && v !== null && Number(v) !== 0);
    return entries.map(([key, value]) => (
        <span
            key={key}
            className={`px-2 py-1 rounded-lg border text-[11px] ${darkMode ? 'border-gray-600 text-gray-200' : 'border-gray-200 text-gray-700'}`}
        >
            {formatStatKey(key)} {value}
        </span>
    ));
}

function formatStatKey(key: string) {
    switch (key) {
        case "hp": return "HP";
        case "attack": return "ATK";
        case "magicAttack": return "MAG ATK";
        case "defense": return "DEF";
        case "magicResist": return "MAG RES";
        case "crit": return "CRIT";
        case "critChance": return "CRIT CH";
        case "critDamage": return "CRIT DMG";
        case "speed": return "SPD";
        case "goldBonus": return "GOLD";
        case "xpBonus": return "XP";
        default: return key.toUpperCase();
    }
}

function renderFullStats(item: InventoryItem) {
    const stats = item.type === "pet" ? (item.buffs || {}) : (item.stats || {});
    const keysOrder = [
        "attack",
        "magicAttack",
        "hp",
        "defense",
        "magicResist",
        "speed",
        "critChance",
        "critDamage",
        "goldBonus",
        "xpBonus",
    ];
    return keysOrder.map((k) => (
        <div key={k} className="flex items-center justify-between border rounded-md px-2 py-1">
            <span className="text-gray-600">{formatStatKey(k)}</span>
            <span className="font-semibold">{Number((stats as any)[k] ?? 0)}</span>
        </div>
    ));
}

function buildStatsTooltip(item: InventoryItem): string {
    const parts: string[] = [];
    if (item.description) parts.push(item.description);

    // For pets, show buffs; for other items, show stats
    const primary = item.type === "pet" ? (item.buffs || {}) : (item.stats || {});
    const primaryEntries = Object.entries(primary).filter(([, v]) => v !== undefined && v !== null && Number(v) !== 0);
    if (primaryEntries.length > 0) {
        const text = primaryEntries.map(([k, v]) => `${formatStatKey(k)} ${v}`).join(" • ");
        parts.push(text);
    }

    // Bonus (lootbox) applies to any type
    const bonusEntries = Object.entries(item.bonus || {}).filter(([, v]) => v !== undefined && v !== null && Number(v) !== 0);
    if (bonusEntries.length > 0) {
        const bonusText = bonusEntries.map(([k, v]) => `Bonus ${formatStatKey(k)} ${v}`).join(" • ");
        parts.push(bonusText);
    }

    if (parts.length === 0) return "";
    return parts.join("\n");
}

function hasStatBoost(item: InventoryItem): boolean {
    const bonus = item.bonus || {};
    return Object.values(bonus).some((v) => v !== undefined && v !== null && Number(v) !== 0);
}

function normalizeItemType(item: any): ItemType {
    const col = (item?.collection || "").toLowerCase();
    const raw = (item?.type || item?.itemType || "").toLowerCase();
    if (col.includes("items_weapons") || raw.includes("weapon") || raw.includes("sword") || raw.includes("bow") || raw.includes("staff")) return "weapon";
    if (col.includes("items_armor") || raw.includes("armor") || raw.includes("helm") || raw.includes("helmet") || raw.includes("chest") || raw.includes("plate") || raw.includes("pants") || raw.includes("boots")) return "armor";
    if (col.includes("items_pets") || raw.includes("pet")) return "pet";
    if (col.includes("items_accessories") || col.includes("items_arcane") || raw.includes("accessory") || raw.includes("ring") || raw.includes("amulet")) return "accessory";
    return "weapon"; // default so it appears under a category instead of being filtered out
}

function getDefaultIcon(type: ItemType): string {
    switch (type) {
        case "weapon": return "⚔️";
        case "armor": return "🛡️";
        case "accessory": return "📿";
        case "pet": return "🐾";
        default: return "📦";
    }
}

function buildEquippedIdCounts(equippedData: any): Record<string, number> {
    const equippedIds = [
        equippedData?.weapon,
        ...Object.values(equippedData?.armor || {}),
        ...Object.values(equippedData?.pets || {}),
        ...Object.values(equippedData?.accessoiries || {}),
    ].filter(Boolean) as string[];

    const counts: Record<string, number> = {};
    equippedIds.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
}

function markEquippedInstances(items: InventoryItem[], equippedData: any): InventoryItem[] {
    const counts = buildEquippedIdCounts(equippedData);
    return items.map((it) => {
        const remaining = counts[it.itemId] || 0;
        if (remaining > 0) {
            counts[it.itemId] = remaining - 1;
            return { ...it, isEquipped: true };
        }
        return { ...it, isEquipped: false };
    });
}
