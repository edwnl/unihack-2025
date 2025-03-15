// frontend/lib/openai-service.ts
// This service would be used in production to make actual calls to the OpenAI API
import { ActionRecommendation, HandStrength } from "./ai-advisor-service";

// Define OpenAI API response types
export type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAIResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }[];
};

export async function callOpenAI(
  prompt: string,
  model: string = "gpt-4o-mini", // Changed to gpt-4o-mini for faster responses
): Promise<string> {
  // In production, this would be your actual API key
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("OpenAI API key not found. Using mock response instead.");
    throw Error("OpenAI API key not found. Using mock response instead.");
  }

  try {
    console.log(
      "Making API call to OpenAI with prompt:",
      prompt.substring(0, 100) + "...",
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are a poker AI trained in Game Theory Optimal (GTO) strategy. Analyze the current game state and recommend the best action. Be extremely concise - provide explanations in a single sentence.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Lower temperature for more consistent GTO recommendations
        max_tokens: 150, // Reduced token count for shorter responses
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenAI API request failed: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw Error("Error calling openai api.");
  }
}

export function parseGTOAdvice(
  response: string,
  availableActions: string[] = ["Check", "Call", "Bet", "Raise", "Fold"],
): ActionRecommendation {
  try {
    // Extract action
    const actionMatch = response.match(/\*\*Action:\*\*\s*([A-Za-z]+)/i);
    let action = actionMatch ? actionMatch[1] : "Check";

    // Make sure action is from available actions
    if (!availableActions.includes(action)) {
      // Fall back to a default action that is available
      action = availableActions.includes("Check")
        ? "Check"
        : availableActions.includes("Fold")
          ? "Fold"
          : availableActions[0];
    }

    // Safety check for premium hands - override fold recommendations for premium pairs
    const isPremiumHand =
      response.toLowerCase().includes("premium") ||
      /pocket (a|k|q|j|10|t)s/i.test(response) ||
      /pair of (a|k|q|j|10|t)/i.test(response) ||
      // Look for specific mentions of premium pairs in the text
      /(pocket aces|pocket kings|pocket queens|pocket jacks|pocket tens)/i.test(
        response,
      );

    // Make sure we're not folding premium hands preflop incorrectly
    if (
      action.toLowerCase() === "fold" &&
      isPremiumHand &&
      /preflop/i.test(response)
    ) {
      if (availableActions.includes("Call")) {
        action = "Call";
        console.log("Safety override: Changed fold to call for premium hand");
      } else if (availableActions.includes("Check")) {
        action = "Check";
        console.log("Safety override: Changed fold to check for premium hand");
      }
    }

    // Extract bet size
    const betSizeMatch = response.match(
      /\*\*Recommended Bet Size:\*\*\s*(\d+)/i,
    );
    const betSize = betSizeMatch ? parseInt(betSizeMatch[1], 10) : undefined;

    // Extract explanation
    const explanationMatch = response.match(
      /\*\*Short Explanation:\*\*\s*([^\n]*)/i,
    );
    const explanation = explanationMatch
      ? explanationMatch[1]
      : "No explanation provided.";

    // Extract probabilities
    const probabilitiesText = response.match(
      /\*\*Probability Distribution:\*\*\s*([^\n]*)/i,
    );
    const probabilities: {
      check: number;
      call: number;
      bet: number;
      raise: number;
      fold: number;
    } = {
      check: 0,
      call: 0,
      bet: 0,
      raise: 0,
      fold: 0,
    };

    if (probabilitiesText) {
      const probabilityParts = probabilitiesText[1].split(/,\s*/);
      for (const part of probabilityParts) {
        const [actionName, percentage] = part.split(/\s*:\s*/);
        if (actionName && percentage) {
          const cleanAction = actionName.toLowerCase().trim();
          let value = 0;

          // Handle percentage strings in various formats
          if (percentage.endsWith("%")) {
            value = parseFloat(percentage.replace("%", "")) / 100;
          } else {
            value = parseFloat(percentage);
            // If it's already a decimal less than 1, keep it as is
            if (value > 1) {
              value = value / 100;
            }
          }

          if (!isNaN(value) && probabilities.hasOwnProperty(cleanAction)) {
            probabilities[cleanAction as keyof typeof probabilities] = value;
          }
        }
      }
    }

    // Make sure probabilities only include available actions and normalize to 100%
    const availableActionsLower = availableActions.map((a) => a.toLowerCase());
    // First remove unavailable actions
    for (const key in probabilities) {
      if (!availableActionsLower.includes(key)) {
        probabilities[key as keyof typeof probabilities] = 0;
      }
    }

    // Normalize probabilities to sum to 1.0 (100%)
    const sum = Object.values(probabilities).reduce((acc, val) => acc + val, 0);
    if (sum > 0 && sum !== 1) {
      // If we have some probabilities but they don't sum to 1, normalize them
      for (const key in probabilities) {
        probabilities[key as keyof typeof probabilities] =
          probabilities[key as keyof typeof probabilities] / sum;
      }
    } else if (sum === 0) {
      // If no probabilities, set a default distribution based on the recommended action
      if (action.toLowerCase() in probabilities) {
        // Primary action gets 70%
        probabilities[action.toLowerCase() as keyof typeof probabilities] = 0.7;

        // Distribute remaining 30% among other available actions
        const otherActions = availableActionsLower.filter(
          (act) => act !== action.toLowerCase(),
        );
        const otherActionWeight =
          otherActions.length > 0 ? 0.3 / otherActions.length : 0;

        otherActions.forEach((act) => {
          probabilities[act as keyof typeof probabilities] = otherActionWeight;
        });
      }
    }

    // Extract hand strength
    const typedHandStrength = extractHandStrength(response);
    const equity = extractEquity(response);

    // Return comprehensive recommendation
    return {
      action: action as "Check" | "Call" | "Bet" | "Raise" | "Fold",
      betSize,
      explanation,
      probabilities,
      confidence: 0.8, // Default confidence
      handStrength: typedHandStrength,
      equity,
    };
  } catch (error) {
    console.error("Error parsing GTO advice:", error);
    // Default fallback with balanced probabilities
    const fallbackProbs = {
      check: 0.1,
      call: 0.1,
      bet: 0.1,
      raise: 0.1,
      fold: 0.6,
    };
    return {
      action: "Fold" as const,
      explanation: "Error processing AI recommendation",
      confidence: 0.5,
      probabilities: fallbackProbs,
    };
  }
}

// Helper function to extract hand strength
function extractHandStrength(text: string): HandStrength | undefined {
  const handStrengthMatch = text.match(/\*\*Hand Strength:\*\*\s*([^\n]*)/i);
  if (!handStrengthMatch) return undefined;

  const handStrength = handStrengthMatch[1];
  // Map hand strength to valid type
  if (/high card/i.test(handStrength)) return "High Card";
  if (/one pair|pair of/i.test(handStrength)) return "One Pair";
  if (/two pair/i.test(handStrength)) return "Two Pair";
  if (/three of a kind|trips/i.test(handStrength)) return "Three of a Kind";
  if (/straight/i.test(handStrength) && /flush/i.test(handStrength)) {
    if (/royal/i.test(handStrength)) return "Royal Flush";
    return "Straight Flush";
  }
  if (/straight/i.test(handStrength)) return "Straight";
  if (/flush/i.test(handStrength)) return "Flush";
  if (/full house/i.test(handStrength)) return "Full House";
  if (/four of a kind|quads/i.test(handStrength)) return "Four of a Kind";

  return "High Card"; // Default
}

function extractEquity(text: string): number | undefined {
  const equityMatch = text.match(/\*\*Equity:\*\*\s*(\d+(?:\.\d+)?)/i);
  if (!equityMatch) return undefined;

  // Convert percentage to decimal
  const equityValue = parseFloat(equityMatch[1]);
  if (!isNaN(equityValue)) {
    // Check if it's already in decimal form (less than 1)
    if (equityValue < 1) return equityValue;
    // Otherwise, assume it's a percentage and convert
    return equityValue / 100;
  }

  return undefined;
}
