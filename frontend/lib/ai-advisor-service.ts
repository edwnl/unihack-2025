// frontend/lib/ai-advisor-service.ts
import { CardType, GameRoomType } from "./types";
import { getPokerPosition } from "./utils";
import { callOpenAI, parseGTOAdvice } from "./openai-service";

// Types for the AI advisor
export type HandStrength =
  | "High Card"
  | "One Pair"
  | "Two Pair"
  | "Three of a Kind"
  | "Straight"
  | "Flush"
  | "Full House"
  | "Four of a Kind"
  | "Straight Flush"
  | "Royal Flush";

export type ActionRecommendation = {
  action: "Check" | "Call" | "Bet" | "Raise" | "Fold";
  betSize?: number;
  confidence: number;
  explanation: string;
  handStrength?: HandStrength;
  equity?: number;
  probabilities?: {
    check: number;
    call: number;
    bet: number;
    raise: number;
    fold: number;
  };
  potOdds?: number;
  foldEquity?: number;
  outs?: number;
  drawStrength?: string;
};

// frontend/lib/ai-advisor-service.ts (updated getAIRecommendation function)
export const getAIRecommendation = async (
  gameRoom: GameRoomType,
  playerId: string,
): Promise<ActionRecommendation> => {
  try {
    // Find the current player
    const player = gameRoom.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Get player position
    const playerIndex = gameRoom.players.findIndex((p) => p.id === playerId);
    const position = getPokerPosition(
      playerIndex,
      gameRoom.players.length,
      gameRoom.smallBlindPosition || 0,
    );

    // Format the hole cards
    const holeCards = formatCards(player.hand?.cards || []);

    // Format the community cards
    const communityCards = formatCards(gameRoom.communityCards || []);

    // Calculate how many active players remain
    const activePlayers = gameRoom.players.filter(
      (p) => p.active && !p.folded,
    ).length;

    // Calculate pot odds if applicable
    const currentBet = gameRoom.currentBet || 0;
    const playerBet = gameRoom.bets ? gameRoom.bets[playerId] || 0 : 0;
    const toCall = currentBet - playerBet;
    const potOdds = toCall > 0 ? toCall / (gameRoom.pot + toCall) : 0;

    // Calculate fold equity (simplified estimate based on position and player count)
    const foldEquity = calculateFoldEquity(
      position,
      activePlayers,
      gameRoom.gameState,
    );

    // Calculate outs if on a draw
    const outs = calculateOuts(holeCards, communityCards, gameRoom.gameState);

    // Determine available actions
    const canCheck = toCall === 0;
    const availableActions = [];
    availableActions.push("Fold");

    if (canCheck) {
      availableActions.push("Check");
    } else {
      availableActions.push("Call");
    }

    if (player.chips > 0) {
      if (canCheck) {
        availableActions.push("Bet");
      } else {
        availableActions.push("Raise");
      }
    }

    // Analyze hole cards to pre-prompt the AI about hand strength
    const hasPocketPair =
      holeCards.length >= 3 && holeCards.charAt(0) === holeCards.charAt(2);
    const pairRank = hasPocketPair ? holeCards.charAt(0) : "";
    const isPremiumPair = hasPocketPair && "AKQJT".includes(pairRank);
    const isMediumPair = hasPocketPair && "98765".includes(pairRank);

    // Construct the prompt for the AI
    const prompt = `
You are a poker AI trained in Game Theory Optimal (GTO) strategy with a focus on aggressive but mathematically sound play.
Analyze the current game state and recommend the best action from the AVAILABLE ACTIONS ONLY.

### Game State:
- Game Stage: ${gameRoom.gameState}
- Number of Players: ${activePlayers} active
- Position: ${position}
- Hole Cards: ${holeCards}
- Board: ${communityCards}
- Pot Size: ${gameRoom.pot}
- Current Bet: ${currentBet}
- To Call: ${toCall}
- Player Chips: ${player.chips}
- Pot Odds: ${potOdds.toFixed(2)}
- Fold Equity Estimate: ${foldEquity.toFixed(2)}
- Outs Estimate: ${outs}
- AVAILABLE ACTIONS: ${availableActions.join(", ")}

### IMPORTANT HAND STRENGTH CONTEXT:
${isPremiumPair ? `You have a premium pocket pair (${formatReadableRank(pairRank)}s). This is a VERY strong hand that should almost never be folded preflop, and should typically be played aggressively.` : ""}
${isMediumPair ? `You have a medium pocket pair (${formatReadableRank(pairRank)}s). This is a decent hand that can be played for set value and should rarely be folded preflop unless facing excessive aggression.` : ""}
${hasPocketPair && !isPremiumPair && !isMediumPair ? `You have a small pocket pair. This hand has set mining value but can be folded to large bets.` : ""}

### STRATEGY GUIDELINES:
1. Premium hands like AA, KK, QQ, JJ, TT should be played aggressively and almost never folded preflop.
2. Position matters - late position allows more aggressive play with marginal hands.
3. Consider pot odds when calling with drawing hands.
4. Value bet when you likely have the best hand.
5. If "Check" is an available option, you should almost never recommend "Fold".
6. Balance aggression with proper bankroll management.
7. Consider how the board texture interacts with your hand.
8. Premium pairs (AA, KK, QQ) maintain their strength through all streets unless the board is very coordinated.

### Provide a GTO-Based Recommendation:
- **Action:** (MUST BE ONE OF: ${availableActions.join(", ")})
- **Recommended Bet Size:** (if applicable) 
- **Probability Distribution:** (% for each AVAILABLE action only)
- **Short Explanation:** Why is this the best move? (ONE TO TWO SENTENCES ONLY)
- **Hand Strength:** Current hand strength
- **Equity:** Approximate equity against opponents' ranges
`;

    // Check if we have an API key
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    console.log("API Key available:", !!apiKey);
    console.log("Available actions:", availableActions);

    if (apiKey) {
      // If we have an API key, make a real call to OpenAI
      try {
        console.log("Attempting to call OpenAI API...");
        const response = await callOpenAI(prompt);
        console.log("OpenAI API response received");
        const parsedAdvice = parseGTOAdvice(response, availableActions);
        console.log("Using real AI recommendation");

        // Add the additional poker metrics
        parsedAdvice.potOdds = potOdds;
        parsedAdvice.foldEquity = foldEquity;
        parsedAdvice.outs = outs;
        parsedAdvice.drawStrength = getDrawStrength(outs);

        // Safety check for premium pairs - override fold recommendations
        if (
          isPremiumPair &&
          gameRoom.gameState === "PREFLOP" &&
          parsedAdvice.action === "Fold"
        ) {
          console.log(
            "Safety override: Caught AI attempting to fold premium pair:",
            pairRank,
          );
          if (availableActions.includes("Call")) {
            parsedAdvice.action = "Call";
            parsedAdvice.explanation = `Premium pocket ${formatReadableRank(pairRank)}s should not be folded preflop. Calling to see the flop.`;
            parsedAdvice.confidence = 0.9;
          } else if (availableActions.includes("Check")) {
            parsedAdvice.action = "Check";
            parsedAdvice.explanation = `Premium pocket ${formatReadableRank(pairRank)}s should not be folded preflop. Checking to see the flop.`;
            parsedAdvice.confidence = 0.9;
          }
        }

        // Add default probabilities based on the action recommended if missing
        if (
          !parsedAdvice.probabilities ||
          Object.values(parsedAdvice.probabilities).every((p) => p === 0)
        ) {
          console.log(
            "Adding fallback probabilities based on recommended action",
          );

          // Create default distribution
          const fallbackProbabilities: Record<string, number> = {
            check: 0,
            call: 0,
            bet: 0,
            raise: 0,
            fold: 0,
          };

          // Filter to only include available actions
          const availableActionsLower = availableActions.map((a) =>
            a.toLowerCase(),
          );

          // Primary action gets 70%
          if (parsedAdvice.action.toLowerCase() in fallbackProbabilities) {
            fallbackProbabilities[
              parsedAdvice.action.toLowerCase() as keyof typeof fallbackProbabilities
            ] = 0.7;
          }

          // Distribute remaining 30% among other available actions
          const otherActions = availableActionsLower.filter(
            (act) =>
              act !== parsedAdvice.action.toLowerCase() &&
              act in fallbackProbabilities,
          );

          const otherActionWeight =
            otherActions.length > 0 ? 0.3 / otherActions.length : 0;
          otherActions.forEach((act) => {
            fallbackProbabilities[act as keyof typeof fallbackProbabilities] =
              otherActionWeight;
          });

          parsedAdvice.probabilities = fallbackProbabilities as {
            check: number;
            call: number;
            bet: number;
            raise: number;
            fold: number;
          };
        }

        return parsedAdvice;
      } catch (error) {
        console.error("Error calling OpenAI API:", error);
        console.log("Falling back to mock implementation");
        // Fall back to mock recommendation if API call fails
        throw Error("Error calling open ai api");
      }
    } else {
      // If no API key, use mock recommendation
      console.log("No API key found, using mock implementation");
      throw Error("No API Key");
    }
  } catch (error) {
    console.error("Error getting AI recommendation:", error);
    return {
      action: "Fold",
      confidence: 0.6,
      explanation:
        "Error occurred while analyzing. Conservative play is recommended.",
      probabilities: {
        check: 0.05,
        call: 0.05,
        bet: 0.05,
        raise: 0.05,
        fold: 0.8,
      },
    };
  }
};

// Helper function for readable rank
function formatReadableRank(rank: string): string {
  switch (rank) {
    case "A":
      return "Ace";
    case "K":
      return "King";
    case "Q":
      return "Queen";
    case "J":
      return "Jack";
    case "T":
      return "10";
    default:
      return rank;
  }
}

// Calculate fold equity (how likely opponents are to fold)
function calculateFoldEquity(
  position: string,
  activePlayers: number,
  gameState: string,
): number {
  // Higher fold equity in late position and fewer players
  let baseEquity = 0.3; // Base fold equity

  // Position adjustment
  if (["BTN", "CO", "HJ"].includes(position)) {
    baseEquity += 0.2; // Late position has higher fold equity
  } else if (["SB", "BB"].includes(position)) {
    baseEquity -= 0.1; // Early position has lower fold equity
  }

  // Player count adjustment
  baseEquity -= (activePlayers - 2) * 0.05; // More players = less fold equity

  // Game stage adjustment
  if (gameState === "PREFLOP") {
    baseEquity += 0.05; // More fold equity preflop
  } else if (gameState === "RIVER") {
    baseEquity -= 0.1; // Less fold equity on river
  }

  // Ensure it's within reasonable bounds
  return Math.max(0.1, Math.min(0.7, baseEquity));
}

// Calculate outs (number of cards that could improve your hand)
function calculateOuts(
  holeCards: string,
  communityCards: string,
  gameState: string,
): number {
  if (!holeCards || holeCards === "None" || gameState === "PREFLOP") {
    return 0; // No outs calculation preflop
  }

  // This is a simplified version - in a real system, you'd analyze the actual hands
  // and determine outs based on possible draws

  // Simplified detection of potential draws
  const hasFlushDraw = detectFlushDraw();
  const hasStraightDraw = detectStraightDraw();
  const hasOvercards = detectOvercards(holeCards);

  let outs = 0;
  if (hasFlushDraw) outs += 9; // Flush draw typically has 9 outs
  if (hasStraightDraw === "open") outs += 8; // Open-ended straight draw has 8 outs
  if (hasStraightDraw === "gutshot") outs += 4; // Gutshot straight draw has 4 outs
  if (hasOvercards) outs += 6; // Typically 6 outs for overcards (two overcards)

  // Don't double count some outs
  if (outs > 15) outs = Math.floor(outs * 0.8); // Reduce for overlapping outs

  return outs;
}

// Get a descriptive strength of a drawing hand based on outs
function getDrawStrength(outs: number): string | undefined {
  if (outs === 0) return undefined;
  if (outs >= 12) return "Monster Draw";
  if (outs >= 8) return "Strong Draw";
  if (outs >= 5) return "Decent Draw";
  return "Weak Draw";
}

// Simplified draw detection functions
function detectFlushDraw(): boolean {
  // Very simplified - in production you'd count suits
  return Math.random() < 0.2; // 20% chance to detect a flush draw
}

function detectStraightDraw(): "open" | "gutshot" | false {
  // Very simplified - in production you'd analyze consecutive ranks
  const r = Math.random();
  if (r < 0.15) return "open"; // 15% chance for open-ended straight draw
  if (r < 0.3) return "gutshot"; // 15% chance for gutshot straight draw
  return false;
}

function detectOvercards(holeCards: string): boolean {
  // Very simplified - in production you'd compare hole card ranks to board
  // Check if hole cards contain A, K, Q, J
  const hasHighCards = /[AKQJ]/.test(holeCards);
  // Random factor - not all high cards are overcards
  return hasHighCards && Math.random() < 0.7;
}

// Helper function to format cards for the prompt
export const formatCards = (cards: CardType[]): string => {
  if (!cards.length) return "None";

  return cards
    .map((card) => {
      const rank = formatRank(card.rank);
      const suit = formatSuit(card.suit);
      return `${rank}${suit}`;
    })
    .join(" ");
};

// Helper function to format rank
export const formatRank = (rank: string): string => {
  switch (rank) {
    case "ACE":
      return "A";
    case "KING":
      return "K";
    case "QUEEN":
      return "Q";
    case "JACK":
      return "J";
    case "TEN":
      return "T";
    case "NINE":
      return "9";
    case "EIGHT":
      return "8";
    case "SEVEN":
      return "7";
    case "SIX":
      return "6";
    case "FIVE":
      return "5";
    case "FOUR":
      return "4";
    case "THREE":
      return "3";
    case "TWO":
      return "2";
    default:
      return rank;
  }
};

// Helper function to format suit
export const formatSuit = (suit: string): string => {
  switch (suit) {
    case "HEARTS":
      return "h";
    case "DIAMONDS":
      return "d";
    case "CLUBS":
      return "c";
    case "SPADES":
      return "s";
    default:
      return suit;
  }
};

// Helper to evaluate hand strength (simplified for hackathon)
export const evaluateHandStrength = (holeCards: string): HandStrength => {
  // This would be a complex function in production
  // For the hackathon, we'll return a simplified evaluation
  if (!holeCards || holeCards === "None") return "High Card";

  // Check for pocket pairs
  if (holeCards.charAt(0) === holeCards.charAt(2)) {
    return "One Pair";
  }

  // Check for high cards
  if (holeCards.includes("A") || holeCards.includes("K")) {
    return "High Card";
  }

  return "High Card";
};
