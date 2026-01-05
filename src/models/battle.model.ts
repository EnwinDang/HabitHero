// Battle system data models

import type { ElementType } from "./worldMap.model";

export interface BattleEnemy {
    id: string;
    name: string;
    level: number;
    element: ElementType;
    hp: number;
    maxHP: number;
    attack: number;
    defense: number;
    speed: number;
    emoji: string;
    realmId: string;
    levelId: number;
}

export interface BattlePlayer {
    name: string;
    level: number;
    hp: number;
    maxHP: number;
    attack: number;
    defense: number;
    speed: number;
    emoji: string;
}

export interface BattleLog {
    message: string;
    timestamp: number;
    type: 'attack' | 'damage' | 'victory' | 'defeat' | 'info';
}

export interface BattleState {
    playerHP: number;
    enemyHP: number;
    isActive: boolean;
    isPaused: boolean;
    winner: 'player' | 'enemy' | null;
    logs: BattleLog[];
    turn: number;
}

export interface BattleRewards {
    xp: number;
    gold: number;
}
