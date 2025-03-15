// frontend/lib/types.ts
// generate types to use for frontend
export type CardType = {
  suit: string;
  rank: string;
};

export type PlayerHandType = {
  cards: CardType[];
};

export type PlayerType = {
  id: string;
  name: string;
  online: boolean;
  visuallyImpaired: boolean;
  chips: number;
  folded: boolean;
  active: boolean;
  hand?: PlayerHandType;
  handRanking?: string;
  lastAction?: string;
  lastActionAmount?: number;
};

export type GameActionType = {
  playerId?: string;
  playerName?: string;
  type: string;
  amount?: number;
  timestamp?: string;
  card?: CardType;
  message?: string;
};

export type GameRoomType = {
  id: string;
  players: PlayerType[];
  gameState:
    | "WAITING"
    | "STARTED"
    | "PREFLOP"
    | "FLOP"
    | "TURN"
    | "RIVER"
    | "SHOWDOWN"
    | "DISBANDED"
    | "ENDED";
  waitingForCards: boolean;
  communityCards: CardType[];
  currentPlayerIndex: number;
  pot: number;
  actions?: GameActionType[];
  bets?: Record<string, number>;
  currentBet?: number;
  smallBlindPosition: number;
  dealerId?: string;
  winnerIds?: string[];
};

export type UserRole = "PLAYER" | "DEALER" | "SCANNER";

export interface UserRoleInfo {
  role: UserRole | null;
  playerId?: string;
  screenReader?: boolean;
  gameId?: string;
}
