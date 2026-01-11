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
import "./lootbox-animation.css";
import { UsersAPI } from "@/api/users.api";
import { StaminaBar } from "@/components/StaminaBar";
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
    PawPrint,
    Coins,
    Sparkles
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
    const [sellConfirm, setSellConfirm] = useState<InventoryItem | null>(null);
    const [rerollSelection, setRerollSelection] = useState<InventoryItem[]>([]);
    const [rerollLoading, setRerollLoading] = useState(false);
    const [rerollResult, setRerollResult] = useState<any | null>(null);
    const [rerollMode, setRerollMode] = useState(false);
    const [rerollConfirm, setRerollConfirm] = useState(false);
    const [sortRarity, setSortRarity] = useState<'none' | 'asc' | 'desc'>('none');
    const [rarityFilter, setRarityFilter] = useState<ItemRarity | 'all'>('all');
    
    // Stamina state
    const [staminaData, setStaminaData] = useState<{
        currentStamina: number;
        maxStamina: number;
        nextRegenIn: number;
    } | null>(null);

    // Fetch stamina data
    useEffect(() => {
        const fetchStamina = async () => {
            if (!user) return;
            
            try {
                const data = await UsersAPI.getStamina(user.uid);
                setStaminaData({
                    currentStamina: data.currentStamina,
                    maxStamina: data.maxStamina,
                    nextRegenIn: data.nextRegenIn,
                });
            } catch (err) {
                console.warn("Failed to fetch stamina:", err);
            }
        };

        fetchStamina();
        // Update stamina every 60 seconds
        const interval = setInterval(fetchStamina, 60000);
        return () => clearInterval(interval);
    }, [user]);
    const [showChestOpening, setShowChestOpening] = useState(false);
    const [openingLootboxData, setOpeningLootboxData] = useState<any | null>(null);
    const [revealedItems, setRevealedItems] = useState<any[]>([]);
    const [showRewards, setShowRewards] = useState(false);

    const handleSellConfirm = async (item: InventoryItem) => {
        if (!user) return;
        try {
            const res = await InventoryAPI.sell(item.itemId, item.bonus || null);
            const goldAmount = res.sellValue || item.sellValue || 0;
            setMergeMessage({ type: 'success', text: `Sold ${item.name} for ${goldAmount} gold.` });
            setTimeout(() => setMergeMessage(null), 2500);
            setSellConfirm(null);
            await loadInventory();
        } catch (err: any) {
            console.error('Sell failed', err);
            setMergeMessage({ type: 'error', text: err?.message || 'Failed to sell item.' });
            setTimeout(() => setMergeMessage(null), 2500);
        }
    };

    const handleSell = (item: InventoryItem) => {
        if (!user) return;
        if (item.isEquipped) {
            setMergeMessage({ type: 'error', text: 'Unequip this item before selling.' });
            setTimeout(() => setMergeMessage(null), 2500);
            return;
        }
        setSellConfirm(item);
    };

    const toggleRerollSelect = (item: InventoryItem) => {
        if (item.isEquipped) {
            setMergeMessage({ type: 'error', text: 'Unequip item before rerolling.' });
            setTimeout(() => setMergeMessage(null), 2500);
            return;
        }

        const already = rerollSelection.find((sel) => sel.id === item.id);
        if (already) {
            setRerollSelection((prev) => prev.filter((sel) => sel.id !== item.id));
            return;
        }

        if (rerollSelection.length > 0 && rerollSelection[0].rarity !== item.rarity) {
            setMergeMessage({ type: 'error', text: 'Select 3 items of the same rarity to reroll.' });
            setTimeout(() => setMergeMessage(null), 2500);
            return;
        }

        if (rerollSelection.length >= 3) {
            setMergeMessage({ type: 'error', text: 'You can only reroll 3 items at a time.' });
            setTimeout(() => setMergeMessage(null), 2500);
            return;
        }

        setRerollSelection((prev) => [...prev, item]);
    };

    const handleReroll = async () => {
        if (!user) return;
        if (rerollSelection.length !== 3) {
            setMergeMessage({ type: 'error', text: 'Select exactly 3 items to reroll.' });
            setTimeout(() => setMergeMessage(null), 2500);
            return;
        }

        setRerollLoading(true);
        setRerollResult(null);
        try {
            const res = await InventoryAPI.reroll(rerollSelection.map((i) => i.itemId));
            setMergeMessage({ type: 'success', text: `Rerolled ${rerollSelection[0].rarity} items!` });
            setTimeout(() => setMergeMessage(null), 2500);
            setRerollResult(res?.result || null);
            setRerollSelection([]);
            await loadInventory();
        } catch (err: any) {
            console.error('Reroll failed', err);
            setMergeMessage({ type: 'error', text: err?.message || 'Failed to reroll items.' });
            setTimeout(() => setMergeMessage(null), 2500);
        } finally {
            setRerollLoading(false);
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
            
            // Get equipped items from API
            const equippedData = await InventoryAPI.getEquipped();
            setEquipped(equippedData?.equipped || {});
            
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

            const flaggedItems = markEquippedInstances(inventoryItems, equippedData?.equipped || {});
            console.log("📦 Loaded inventory items:", inventoryItems.length, inventoryItems);
            console.log("📦 Items with bonus:", inventoryItems.filter((it: any) => it.bonus));
            console.log("📦 Equipped data:", equippedData?.equipped);
            console.log("📦 Flagged items (with isEquipped):", flaggedItems.filter((it) => it.isEquipped));
            setItems(flaggedItems);
            setRerollSelection([]);
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
        equippedSlots.push({ slot: label, item: resolveItem(typeof id === "string" ? id : String(id)) });
    });
    const petEntries = Object.entries(equipped?.pets || {});
    petEntries.forEach(([slot, id]) => {
        if (!id) return;
        const label = slot.toLowerCase().includes("pet") ? slot : `Pet ${slot}`;
        equippedSlots.push({ slot: label, item: resolveItem(typeof id === "string" ? id : String(id)) });
    });
    const accEntries = Object.entries(equipped?.accessoiries || {});
    accEntries.forEach(([slot, id]) => {
        if (!id) return;
        const label = slot.toLowerCase().includes("accessory") ? slot : `Accessory ${slot}`;
        equippedSlots.push({ slot: label, item: resolveItem(typeof id === "string" ? id : String(id)) });
    });
    // Filter out equipped items from inventory display
    const unequippedItems = items.filter(item => !item.isEquipped);
    const filteredByType = selectedCategory === "all"
        ? unequippedItems
        : unequippedItems.filter(item => item.type === selectedCategory);
    const filteredItems = rarityFilter === 'all' 
        ? filteredByType 
        : filteredByType.filter(item => item.rarity === rarityFilter);

    const getTypeIcon = (type: ItemType) => {
        switch (type) {
            case "weapon": return <Sword size={20} />;
            case "armor": return <Shield size={20} />;
            case "accessory": return <Gem size={20} />;
            case "pet": return <PawPrint size={20} />;
            default: return <Package size={20} />;
        }
    };

    const selectedRarity = rerollSelection[0]?.rarity;
    const rerollReady = rerollSelection.length === 3;
    const rerollCostEstimateMap: Record<string, number> = {
        common: 100,
        uncommon: 250,
        rare: 500,
        epic: 750,
        legendary: 1000,
    };
    const estimatedCost = selectedRarity ? (rerollCostEstimateMap[selectedRarity] ?? 500) : 0;

    // Rarity sort helpers
    const rarityRank: Record<ItemRarity, number> = {
        common: 0,
        uncommon: 1,
        rare: 2,
        epic: 3,
        legendary: 4,
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
            // Immediately reload inventory to update all items view
            await loadInventory();
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
            // Immediately reload inventory to update all items view
            await loadInventory();
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
            // Find lootbox data
            const lootboxData = lootboxes.find(lb => lb.lootboxId === lootboxId);
            if (lootboxData) {
                setOpeningLootboxData(lootboxData);
            }
            
            setOpeningLootbox(lootboxId);
            setShowChestOpening(true);
            
            // Shake animation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const result = await LootboxesAPI.open(lootboxId, 1);
            
            // Chest opening animation
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Map backend result to display items
            const items = result.results.map((r: any) => ({
                name: r.name || "Unknown Item",
                type: r.type || "weapon",
                rarity: r.rarity || "common",
                icon: r.icon || getDefaultIcon(r.type || "weapon"),
                isEquipped: false,
                level: 1,
                ...(r.stats ? { stats: r.stats } : {}),
                bonus: r.bonus || null
            }));
            
            // Hide chest opening modal and show rewards
            setShowChestOpening(false);
            setOpeningLootbox(null);
            setOpeningLootboxData(null);
            setRevealedItems(items);
            setShowRewards(true);
            
            // Reload inventory
            await loadInventory();
        } catch (error: any) {
            console.error("Open lootbox failed:", error);
            setMergeMessage({ type: 'error', text: error.message || "Failed to open lootbox." });
            setTimeout(() => setMergeMessage(null), 3000);
            setShowChestOpening(false);
            setOpeningLootbox(null);
            setOpeningLootboxData(null);
        }
    };

    const getDefaultIcon = (type: string): string => {
        const iconMap: Record<string, string> = {
            weapon: "⚔️",
            armor: "🛡️",
            accessory: "📿",
            pet: "🐾",
        };
        return iconMap[type] || "📦";
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

                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: darkMode ? 'rgba(251, 191, 36, 0.1)' : 'rgba(254, 243, 199, 1)' }}>
                        <Coins className="text-yellow-500" size={24} />
                        <span className="text-xl font-bold text-yellow-500">{user?.stats?.gold ?? 0}</span>
                    </div>
                </div>

                {/* Feedback Message */}
                {mergeMessage && (
                    <div className={`mb-4 px-4 py-2 rounded-xl text-sm font-bold animate-pulse ${mergeMessage.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                        {mergeMessage.text}
                    </div>
                )}

                {/* Reroll Selection Pills */}
                {rerollMode && rerollSelection.length > 0 && (
                    <div className={`${theme.card} rounded-2xl p-4 mb-6 transition-colors duration-300`} style={{ ...theme.borderStyle, borderWidth: '1px', borderStyle: 'solid' }}>
                        <p className={`${theme.textMuted} text-sm mb-2`}>Geselecteerde items voor reroll:</p>
                        <div className="flex flex-wrap gap-2">
                            {rerollSelection.map((sel) => (
                                <span
                                    key={sel.id}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm border"
                                    style={{ borderColor: rarityColors[sel.rarity].border, backgroundColor: rarityColors[sel.rarity].bg, color: rarityColors[sel.rarity].text }}
                                >
                                    {sel.name}
                                    <button onClick={() => toggleRerollSelect(sel)} className="text-xs font-bold opacity-80 hover:opacity-100">×</button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

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

                {/* Category Filters + Reroll toggle + Sort */}
                <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-2 flex-wrap">
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
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={() => {
                                setRerollMode((v) => !v);
                                setRerollSelection([]);
                                setRerollResult(null);
                            }}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors ${rerollMode ? 'bg-purple-500/20 text-purple-800 hover:bg-purple-500/30' : 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20'}`}
                        >
                            {rerollMode ? 'Stop reroll' : 'Start reroll'}
                        </button>
                        {rerollMode && (
                            <button
                                onClick={() => {
                                    if (rerollSelection.length !== 3) {
                                        setMergeMessage({ type: 'error', text: 'Select exactly 3 items to reroll.' });
                                        setTimeout(() => setMergeMessage(null), 2500);
                                        return;
                                    }
                                    setRerollConfirm(true);
                                }}
                                disabled={!rerollReady}
                                className={`px-4 py-2 rounded-lg font-bold transition-colors ${!rerollReady ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-500/20 text-green-700 hover:bg-green-500/30'}`}
                            >
                                Confirm reroll
                            </button>
                        )}
                        <div className={`text-sm font-semibold ${theme.text}`}>
                            {rerollSelection.length}/3 {selectedRarity ? `(${selectedRarity})` : ''}
                        </div>
                        {/* Sort by rarity */}
                        <div className="flex items-center gap-2">
                            <span className={`${theme.textMuted} text-sm`}>Sort:</span>
                            <select
                                value={sortRarity}
                                onChange={(e) => {
                                    const value = e.target.value as 'none' | 'asc' | 'desc';
                                    setSortRarity(value);
                                    // Ensure rarity filter resets to 'all' when sorting is applied
                                    if (value !== 'none') {
                                        setRarityFilter('all');
                                    }
                                }}
                                className={`text-sm px-2 py-1 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                            >
                                <option value="none">Default</option>
                                <option value="asc">Rarity Low → High</option>
                                <option value="desc">Rarity High → Low</option>
                            </select>
                        </div>
                        {/* Rarity filter */}
                        <div className="flex items-center gap-2">
                            <span className={`${theme.textMuted} text-sm`}>Rarity:</span>
                            <select
                                value={rarityFilter}
                                disabled={sortRarity !== 'none'}
                                onChange={(e) => setRarityFilter(e.target.value as any)}
                                className={`text-sm px-2 py-1 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                            >
                                <option value="all">All</option>
                                <option value="common">Common</option>
                                <option value="uncommon">Uncommon</option>
                                <option value="rare">Rare</option>
                                <option value="epic">Epic</option>
                                <option value="legendary">Legendary</option>
                            </select>
                        </div>
                    </div>
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
                            // Apply rarity sort if selected
                            const displayItems = [...filteredItems].sort((a, b) => {
                                if (sortRarity === 'none') return 0;
                                const ra = rarityRank[a.rarity];
                                const rb = rarityRank[b.rarity];
                                return sortRarity === 'asc' ? ra - rb : rb - ra;
                            });
                            return (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {displayItems.map((item, idx) => {
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
                                                getTypeIcon={getTypeIcon}
                                                totalCopies={displayCount}
                                                instanceIndex={instanceIndex}
                                                onEquip={() => handleEquip(item)}
                                                onShowStats={() => setStatsItem(item)}
                                                onSell={() => handleSell(item)}
                                                rerollSelected={rerollSelection.some((sel) => sel.id === item.id)}
                                                onToggleReroll={rerollMode ? () => toggleRerollSelect(item) : undefined}
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
                            {[...lootboxes].sort((a, b) => {
                                const order = ['basic', 'common', 'advanced', 'rare', 'epic', 'legendary', 'premium'];
                                const aName = a.name.toLowerCase();
                                const bName = b.name.toLowerCase();
                                const aIndex = order.findIndex(o => aName.includes(o));
                                const bIndex = order.findIndex(o => bName.includes(o));
                                return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                            }).map(lb => {
                                const count = userLootboxes[lb.lootboxId] || 0;
                                const isOpening = openingLootbox === lb.lootboxId;
                                const getLootboxColor = () => {
                                    const name = lb.name.toLowerCase();
                                    if (name.includes('basic') || name.includes('common')) return '#3B82F6';
                                    if (name.includes('advanced') || name.includes('rare')) return '#8B5CF6';
                                    if (name.includes('epic')) return '#F59E0B';
                                    if (name.includes('legendary') || name.includes('premium')) return '#EF4444';
                                    return accentColor;
                                };
                                const lootboxColor = getLootboxColor();
                                return (
                                    <div
                                        key={lb.lootboxId}
                                        className={`${theme.card} rounded-xl p-4 border transition-all ${count > 0 ? 'hover:shadow-lg' : 'opacity-50'} ${isOpening ? 'lootbox-opening' : ''}`}
                                        style={{ ...theme.borderStyle, borderWidth: '2px', borderStyle: 'solid', borderColor: lootboxColor }}
                                    >
                                        {/* Burst Effect */}
                                        {isOpening && <div className="lootbox-burst-effect" style={{ background: `${lootboxColor}40` }}></div>}
                                        
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

                                        {/* Chest Icon */}
                                        <div className="text-center mb-3">
                                            <div className={`inline-flex items-center justify-center p-4 rounded-xl relative ${isOpening ? 'lootbox-opening-icon' : ''}`} style={{ background: `${lootboxColor}dd` }}>
                                                {isOpening ? (
                                                    <>
                                                        {/* Chest body (stays) */}
                                                        <div className="chest-body">
                                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z"/>
                                                                <path d="M12 10v4"/>
                                                            </svg>
                                                        </div>
                                                        {/* Chest lid (opens) */}
                                                        <div className="chest-lid absolute">
                                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M21 10H3"/>
                                                                <path d="M21 10l-1.5-5A2 2 0 0 0 17.6 3H6.4a2 2 0 0 0-1.9 2L3 10"/>
                                                            </svg>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Gift size={40} className="text-white" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h4 className={`font-bold ${theme.text}`}>{lb.name}</h4>
                                                {lb.description && (
                                                    <p className={`text-xs ${theme.textMuted} mt-1`}>{lb.description}</p>
                                                )}
                                            </div>
                                            <div className={`text-lg font-bold ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg px-3 py-1 ml-2`} style={{ color: lootboxColor }}>
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

                {/* Reroll Confirmation Modal */}
                {rerollConfirm && (
                    <Modal
                        title={rerollResult ? "Reroll Result" : "Confirm Reroll"}
                        label="Reroll Items"
                        showClose
                        onClose={() => setRerollConfirm(false)}
                        maxWidth={500}
                    >
                        <div className="space-y-4">
                            {!rerollLoading && !rerollResult && (
                                <>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-2">Je gaat de volgende items rerollen:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {rerollSelection.map((item) => (
                                                <div key={item.id} className="flex items-center gap-2 px-3 py-1 rounded-lg border" style={{ borderColor: rarityColors[item.rarity].border, backgroundColor: rarityColors[item.rarity].bg }}>
                                                    <span className="text-lg">{item.icon}</span>
                                                    <span className="text-sm font-semibold" style={{ color: rarityColors[item.rarity].text }}>{item.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                            {!rerollLoading && !rerollResult && (
                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/20' : 'bg-purple-100'}`}>
                                    <p className="text-sm text-gray-600">Cost</p>
                                    <p className="text-2xl font-bold text-purple-600">{estimatedCost} Gold</p>
                                </div>
                            )}
                            {rerollLoading ? (
                                <div className="p-6 rounded-xl border" style={{ borderColor: darkMode ? '#4b5563' : '#e5e7eb', backgroundColor: darkMode ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.1)' }}>
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="text-6xl animate-bounce" style={{ animation: 'bounce 0.6s infinite' }}>🎲</div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-purple-600 animate-pulse">Rerolling...</p>
                                            <p className="text-sm text-gray-500 mt-1">Het nieuwe item wordt gegenereerd</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            ) : rerollResult ? (
                                <div className={`p-4 rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="text-3xl">{rerollResult.icon || '🎲'}</div>
                                        <div>
                                            <p className="text-sm text-gray-500">Nieuw item</p>
                                            <p className="text-lg font-bold" style={{ color: rarityColors[(rerollResult.rarity || 'common') as keyof typeof rarityColors]?.text || '#6b7280' }}>{rerollResult.name || rerollResult.itemId}</p>
                                            <p className="text-xs text-gray-500 capitalize">{rerollResult.rarity}</p>
                                        </div>
                                    </div>
                                    {rerollResult.bonus && Object.keys(rerollResult.bonus).length > 0 && (
                                        <div className="mt-2 text-sm text-gray-600">Bonus: {Object.entries(rerollResult.bonus).map(([k,v]) => `${k}: ${v}`).join(', ')}</div>
                                    )}
                                    <button
                                        onClick={() => {
                                            setRerollConfirm(false);
                                            setRerollMode(false);
                                            setRerollSelection([]);
                                            setRerollResult(null);
                                        }}
                                        className="mt-3 w-full py-2 rounded-lg font-bold bg-green-500/20 text-green-700 hover:bg-green-500/30 transition-colors"
                                    >
                                        Sluiten
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRerollConfirm(false)}
                                        className={`flex-1 py-2 rounded-lg font-bold transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!user) return;
                                            setRerollLoading(true);
                                            setRerollResult(null);
                                            try {
                                                const res = await InventoryAPI.reroll(rerollSelection.map((i) => i.itemId));
                                                setMergeMessage({ type: 'success', text: `Rerolled ${rerollSelection[0].rarity} items!` });
                                                setTimeout(() => setMergeMessage(null), 2500);
                                                setRerollResult(res?.result || null);
                                                setRerollSelection([]);
                                                await loadInventory();
                                            } catch (err: any) {
                                                console.error('Reroll failed', err);
                                                setMergeMessage({ type: 'error', text: err?.message || 'Failed to reroll items.' });
                                                setTimeout(() => setMergeMessage(null), 2500);
                                                setRerollConfirm(false);
                                            } finally {
                                                setRerollLoading(false);
                                            }
                                        }}
                                        className="flex-1 py-2 rounded-lg font-bold bg-purple-500/30 text-purple-700 hover:bg-purple-500/40 transition-colors"
                                    >
                                        Reroll
                                    </button>
                                </div>
                            )}
                        </div>
                    </Modal>
                )}

                {/* Sell Confirmation Modal */}
                {sellConfirm && (
                    <Modal
                        title="Confirm Sale"
                        label="Sell Item"
                        showClose
                        onClose={() => setSellConfirm(null)}
                        maxWidth={400}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="text-4xl">{sellConfirm.icon}</div>
                                <div>
                                    <p className="font-bold">{sellConfirm.name}</p>
                                    <p className="text-sm text-gray-500 capitalize">{sellConfirm.rarity}</p>
                                </div>
                            </div>
                            <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-100'}`}>
                                <p className="text-sm text-gray-600">Sell for</p>
                                <p className="text-2xl font-bold text-yellow-600">{sellConfirm.sellValue ?? 0} Gold</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSellConfirm(null)}
                                    className={`flex-1 py-2 rounded-lg font-bold transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSellConfirm(sellConfirm)}
                                    className="flex-1 py-2 rounded-lg font-bold bg-yellow-500/30 text-yellow-700 hover:bg-yellow-500/40 transition-colors"
                                >
                                    Sell
                                </button>
                            </div>
                        </div>
                    </Modal>
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

            {/* Chest Opening Animation Modal */}
            {showChestOpening && openingLootboxData && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-center">
                        {/* Animated Chest */}
                        <div className={`inline-block p-12 rounded-3xl ${openingLootbox ? 'lootbox-opening' : ''}`} style={{ backgroundColor: `${accentColor}20` }}>
                            <div className="relative inline-flex items-center justify-center w-48 h-48 rounded-3xl text-white lootbox-opening-icon" style={{ background: `${accentColor}dd` }}>
                                {/* Sparkles */}
                                {openingLootbox && (
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
                                {openingLootbox && <div className="lootbox-burst-effect" style={{ background: `${accentColor}80` }}></div>}
                                
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
                        <h2 className="text-3xl font-bold text-white mt-8 animate-pulse">Opening {openingLootboxData.name || 'Lootbox'}...</h2>
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
                                    const hasBonus = item.bonus && Object.keys(item.bonus).length > 0;
                                    return (
                                        <div 
                                            key={index} 
                                            className={`p-4 rounded-xl ${theme.inputBg} border-l-4 ${hasBonus ? 'stat-boost-glow' : ''}`} 
                                            style={{ 
                                                borderColor: hasBonus ? '#FFD700' : accentColor,
                                                ...(hasBonus ? {
                                                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(255, 215, 0, 0.1)',
                                                    background: darkMode ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255, 215, 0, 0.1)'
                                                } : {})
                                            }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-3xl">{item.icon || getDefaultIcon(normalizeItemType(item))}</span>
                                                <div className="flex-1">
                                                    <p className={`text-base font-bold ${theme.text} ${hasBonus ? 'flex items-center gap-2' : ''}`}>
                                                        {item.name}
                                                        {hasBonus && <Sparkles size={16} className="text-yellow-500" />}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded ${theme.inputBg}`} style={{ color: accentColor }}>
                                                            {item.rarity}
                                                        </span>
                                                        <span className={`text-xs ${theme.textMuted}`}>
                                                            {item.type}
                                                        </span>
                                                    </div>
                                                    {hasBonus && (
                                                        <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(255, 215, 0, 0.1)' }}>
                                                            <p className="text-xs font-bold text-yellow-500 mb-1">✨ Bonus Stats:</p>
                                                            <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                                                {Object.entries(item.bonus).map(([k, v]) => (
                                                                    <span key={k} className="mr-2">+{formatStatValue(k, Number(v))} {formatStatKey(k)}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className={`text-center ${theme.textMuted}`}>No items received</p>
                        )}
                        
                        <button
                            onClick={() => setShowRewards(false)}
                            className="mt-6 w-full py-3 rounded-xl font-medium text-white transition-all hover:scale-105 flex-shrink-0"
                            style={{ backgroundColor: accentColor }}
                        >
                            Awesome!
                        </button>
                    </div>
                </div>
            )}
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
    getTypeIcon,
    totalCopies,
    instanceIndex,
    onEquip,
    onShowStats,
    onSell,
    rerollSelected,
    onToggleReroll
}: {
    item: InventoryItem;
    darkMode: boolean;
    getTypeIcon: (type: ItemType) => React.ReactElement;
    totalCopies: number;
    instanceIndex: number;
    onEquip?: () => void;
    onShowStats?: () => void;
    onSell?: () => void;
    rerollSelected?: boolean;
    onToggleReroll?: () => void;
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
                borderColor: rerollSelected ? '#a855f7' : (hasBoost ? '#facc15' : colors.border),
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

                <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'} text-sm truncate`}>{item.name}</h4>
                <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} capitalize`}>{item.rarity}</p>
                {hasBoost && (
                    <div className="mt-1 flex justify-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(250, 204, 21, 0.2)', color: '#ca8a04', border: '1px solid rgba(250, 204, 21, 0.5)' }}>
                            Stat Boost
                        </span>
                    </div>
                )}
                {/* Stat badges removed; stats shown via tooltip only */}

                {/* Merge Button removed */}

                {/* Reroll selection */}
                {onToggleReroll && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleReroll?.();
                        }}
                        className={`mt-2 text-xs w-full py-1 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors hover:scale-105 ${rerollSelected ? 'bg-purple-500/30 text-purple-800' : (darkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-500/10 text-purple-600')}`}
                    >
                        {rerollSelected ? 'Selected for reroll' : 'Select for reroll'}
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
            {formatStatKey(key)} {formatStatValue(key, Number(value))}
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

function formatStatValue(key: string, value: number): string {
    // Treat crit stats as percentages; handle both fraction (0.15) and percent (15)
    if (key === 'critChance' || key === 'critDamage' || key === 'goldBonus' || key === 'xpBonus') {
        const scaled = value <= 1 ? value * 100 : value; // scale fractions to percent
        const rounded = Math.round(scaled * 10) / 10; // 1 decimal
        return `${rounded}%`;
    }
    return `${value}`;
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
            <span className="font-semibold">{formatStatValue(k, Number((stats as any)[k] ?? 0))}</span>
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
        const text = primaryEntries.map(([k, v]) => `${formatStatKey(k)} ${formatStatValue(k, Number(v))}`).join(" • ");
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
