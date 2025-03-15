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
    "holds",
    "old",
    "olds",
    "fault",
    "faults",
    "foul",
    "fouls",
    "fould",
    "foulds",
    "cold",
  ],
  check: [
    "check",
    "checks",
    "checking",
    "czech",
    "czechs",
    "cheque",
    "cheques",
    "chalk",
    "chalks",
    "chuck",
    "chucks",
    "deck",
    "decks",
    "chick",
    "chicks",
  ],
  call: [
    "courses",
    "course",
    "call",
    "calls",
    "calling",
    "cold",
    "colds",
    "coal",
    "coals",
    "paul",
    "pauls",
    "tall",
    "talls",
    "col",
    "cols",
    "fall",
    "falls",
    "hall",
    "halls",
  ],
  raise: [
    "raise",
    "raises",
    "raising",
    "rays",
    "ray",
    "race",
    "races",
    "erase",
    "erases",
    "rice",
    "rices",
    "rose",
    "roses",
    "raised",
  ],
  bet: [
    "bet",
    "bets",
    "betting",
    "bed",
    "beds",
    "bent",
    "bents",
    "beat",
    "beats",
    "best",
    "bests",
    "bat",
    "bats",
  ],
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
  const words = normalized;
  console.log("words", words);

  // Check each word against our action variations
  for (const [action, variations] of Object.entries(POKER_ACTIONS)) {
    for (const variation of variations) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const createFuzzyRegex = (str: any) => {
        return new RegExp(str.split("").join(".?"), "i"); // Allows small changes
      };

      const regex = createFuzzyRegex(variation);

      // Accept matches with distance less than 3 (configurable threshold)
      if (regex.test(words)) {
        console.log("Match:", action);
        return action;
      }
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
