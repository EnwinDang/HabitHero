import React from 'react';

// World Map data models

export interface Level {
    id: number;
    name: string;
    completed: boolean;
    locked: boolean;
}

export type ElementType = 'fire' | 'ice' | 'earth' | 'lightning';

export interface Realm {
    id: string;
    name: string;
    element: ElementType;
    description: string;
    requiredLevel: number;
    color: string; // Primary color for the realm
    gradient: string; // Gradient background
    icon: string | React.ReactNode; // Emoji or Icon component
    levels: Level[];
}

export interface RealmProgress {
    realmId: string;
    completedLevels: number;
    totalLevels: number;
}
