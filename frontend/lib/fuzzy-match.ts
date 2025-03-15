// frontend/lib/fuzzy-match.ts
/**
 * Simple fuzzy matching for poker voice commands
 */

// Define the valid poker actions and their potential variations/misspellings
const POKER_ACTIONS = {
  fold: [
    "fold",
    "folds",
    "folding",
    "hold",
    "old",
    "fault",
    "foul",
    "fould",
    "cold",
  ],
  check: [
    "check",
    "checks",
    "checking",
    "czech",
    "cheque",
    "chalk",
    "chuck",
    "deck",
    "chick",
  ],
  call: [
    "call",
    "calls",
    "calling",
    "cold",
    "coal",
    "paul",
    "tall",
    "col",
    "fall",
    "hall",
  ],
  raise: [
    "raise",
    "raises",
    "raising",
    "rays",
    "race",
    "erase",
    "rice",
    "rose",
    "raised",
    "rays",
  ],
  bet: ["bet", "bets", "betting", "bed", "bent", "beat", "bet", "best", "bat"],
  allin: [
    "allin",
    "all-in",
    "all in",
    "all",
    "all ins",
    "ollie",
    "olin",
    "allen",
    "online",
    "hauling",
    "allens",
    "all win",
  ],
};

/**
 * Find the best matching poker action from a spoken phrase
 * @param text The recognized speech text
 * @returns The matched action or null if no match found
 */
export function findBestPokerActionMatch(text: string): string | null {
  // Convert to lowercase and remove punctuation
  const normalized = text
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .trim();
  const words = normalized.split(/\s+/);

  // Check each word against our action variations
  for (const word of words) {
    for (const [action, variations] of Object.entries(POKER_ACTIONS)) {
      if (variations.includes(word)) {
        return action;
      }
    }
  }

  // If no exact match in variations, try Levenshtein distance for close matches
  for (const word of words) {
    let bestMatch: string | null = null;
    let bestScore = Infinity;

    for (const [action, variations] of Object.entries(POKER_ACTIONS)) {
      for (const variation of variations) {
        const distance = levenshteinDistance(word, variation);
        // Accept matches with distance less than 3 (configurable threshold)
        if (distance < 3 && distance < bestScore) {
          bestScore = distance;
          bestMatch = action;
        }
      }
    }

    if (bestMatch) {
      return bestMatch;
    }
  }

  return null;
}

/**
 * Extract a number from a text string
 * @param text The text to extract numbers from
 * @returns The first number found or null
 */
export function extractNumber(text: string): number | null {
  const matches = text.match(/\d+/);
  if (matches && matches.length > 0) {
    return parseInt(matches[0], 10);
  }
  return null;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
