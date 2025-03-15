// frontend/components/ai-advisor.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAIRecommendation,
  ActionRecommendation,
} from "@/lib/ai-advisor-service";
import { GameRoomType, PlayerType } from "@/lib/types";
import {
  Brain,
  Lightbulb,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AIAdvisorProps {
  gameRoom: GameRoomType;
  player: PlayerType;
  isPlayerTurn: boolean;
}

export default function AIAdvisor({ gameRoom, player }: AIAdvisorProps) {
  const [recommendation, setRecommendation] =
    useState<ActionRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Only show if game is in an active betting state
  const isGameActive = ["PREFLOP", "FLOP", "TURN", "RIVER"].includes(
    gameRoom.gameState,
  );
  if (!isGameActive) {
    return null;
  }

  // Ensure the player has two hole cards before displaying GTO advice
  const hasTwoHoleCards = player.hand?.cards?.length === 2;
  if (!hasTwoHoleCards) {
    return null;
  }

  const handleGetAdvice = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if API key exists first
      const hasApiKey = !!process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      setUsingMock(!hasApiKey);

      console.log("Getting AI recommendation for player:", player.id);
      const advice = await getAIRecommendation(gameRoom, player.id);
      console.log("Received AI recommendation:", advice);

      setRecommendation(advice);
    } catch (error) {
      console.error("Error getting AI advice:", error);
      setError("Failed to get advice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Brain size={18} />
          <span>Poker Advisor</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        {!recommendation ? (
          <div className="flex justify-center">
            <Button
              onClick={handleGetAdvice}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Lightbulb size={16} />
              <span>{loading ? "Analyzing..." : "Get GTO Advice"}</span>
            </Button>
          </div>
        ) : (
          <AdvisorContent
            recommendation={recommendation}
            setRecommendation={setRecommendation}
            loading={loading}
            handleGetAdvice={handleGetAdvice}
            usingMock={usingMock}
            gameRoom={gameRoom}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Extracted the content into a separate component for clarity
function AdvisorContent({
  recommendation,
  loading,
  handleGetAdvice,
  usingMock,
  gameRoom,
}: {
  recommendation: ActionRecommendation;
  setRecommendation: React.Dispatch<
    React.SetStateAction<ActionRecommendation | null>
  >;
  loading: boolean;
  handleGetAdvice: () => void;
  usingMock: boolean;
  gameRoom: GameRoomType;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-3">
      {/* Main recommendation */}
      <div className="flex items-center gap-2">
        <span className="font-semibold">Recommended:</span>
        <span className="text-lg text-primary">
          {recommendation.action}
          {recommendation.betSize && ` (${recommendation.betSize} chips)`}
        </span>
      </div>

      {/* Explanation */}
      <div className="text-sm text-muted-foreground">
        {recommendation.explanation}
      </div>

      {/* Hand analysis section */}
      <div className="grid grid-cols-2 gap-2 bg-muted/20 rounded-md p-2">
        {recommendation.handStrength && (
          <div className="text-xs">
            <span className="font-semibold">Hand:</span>{" "}
            {recommendation.handStrength}
          </div>
        )}

        {recommendation.equity !== undefined && (
          <div className="text-xs">
            <span className="font-semibold">Equity:</span>{" "}
            {Math.round(recommendation.equity * 100)}%
          </div>
        )}

        {recommendation.drawStrength && (
          <div className="text-xs">
            <span className="font-semibold">Draw:</span>{" "}
            {recommendation.drawStrength}
          </div>
        )}

        {recommendation.outs !== undefined && recommendation.outs > 0 && (
          <div className="text-xs">
            <span className="font-semibold">Outs:</span> {recommendation.outs}
          </div>
        )}
      </div>

      {/* Action probabilities */}
      {recommendation.probabilities && (
        <ActionProbabilities recommendation={recommendation} />
      )}

      {/* Advanced metrics toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-1 text-xs flex items-center justify-center gap-1"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <TrendingUp size={14} />
        <span>
          {showAdvanced ? "Hide Advanced Metrics" : "Show Advanced Metrics"}
        </span>
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </Button>

      {/* Advanced poker metrics section */}
      {showAdvanced && (
        <AdvancedMetrics recommendation={recommendation} gameRoom={gameRoom} />
      )}

      {/* Data source indicator */}
      {usingMock && (
        <div className="text-xs text-amber-500 mt-1">
          Using mock recommendations (no API key)
        </div>
      )}

      {/* Ask for new advice */}
      <div className="flex justify-end mt-2">
        <Button
          onClick={handleGetAdvice}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? "Analyzing..." : "Refresh Advice"}
        </Button>
      </div>
    </div>
  );
}

function ActionProbabilities({
  recommendation,
}: {
  recommendation: ActionRecommendation;
}) {
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold mb-1">GTO Action Distribution:</p>
      <div className="flex h-4 w-full rounded-md overflow-hidden bg-gray-800">
        {(() => {
          // Normalize probabilities to ensure they sum to 100%
          const probs = { ...recommendation.probabilities };
          const sum = Object.values(probs).reduce(
            (acc, val) => acc + (isNaN(val) ? 0 : val),
            0,
          );

          if (sum > 0 && Math.abs(sum - 1) > 0.01) {
            Object.keys(probs).forEach((key) => {
              // Provide a fallback of 0 if undefined
              const currentVal = probs[key as keyof typeof probs] ?? 0;
              probs[key as keyof typeof probs] = currentVal / sum;
            });
          }

          return Object.entries(probs).map(([action, prob]) => {
            const probability = isNaN(prob) ? 0 : prob;
            if (probability <= 0) return null;

            const colorMap: Record<string, string> = {
              check: "bg-blue-600",
              call: "bg-green-600",
              bet: "bg-yellow-600",
              raise: "bg-orange-600",
              fold: "bg-red-600",
            };

            return (
              <div
                key={action}
                className={`${colorMap[action] || "bg-gray-600"}`}
                style={{ width: `${probability * 100}%` }}
                title={`${action}: ${Math.round(probability * 100)}%`}
              />
            );
          });
        })()}
      </div>
      <div className="flex justify-between text-xs mt-1 text-muted-foreground">
        {(() => {
          // Normalize probabilities again for the text display
          const probs = { ...recommendation.probabilities };
          const sum = Object.values(probs).reduce(
            (acc, val) => acc + (isNaN(val) ? 0 : val),
            0,
          );

          if (sum > 0 && Math.abs(sum - 1) > 0.01) {
            Object.keys(probs).forEach((key) => {
              // Provide a fallback of 0 if undefined
              const currentVal = probs[key as keyof typeof probs] ?? 0;
              probs[key as keyof typeof probs] = currentVal / sum;
            });
          }

          return Object.entries(probs)
            .filter(([, prob]) => !isNaN(prob) && prob > 0)
            .map(([action, prob]) => (
              <div key={action}>
                {action}: {Math.round(prob * 100)}%
              </div>
            ));
        })()}
      </div>
    </div>
  );
}

function AdvancedMetrics({
  recommendation,
  gameRoom,
}: {
  recommendation: ActionRecommendation;
  gameRoom: GameRoomType;
}) {
  return (
    <div className="bg-muted/10 p-2 rounded-md text-xs space-y-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {recommendation.potOdds !== undefined && (
          <div>
            <span className="font-semibold">Pot Odds:</span>{" "}
            {Math.round(recommendation.potOdds * 100)}%
          </div>
        )}

        {recommendation.foldEquity !== undefined && (
          <div>
            <span className="font-semibold">Fold Equity:</span>{" "}
            {Math.round(recommendation.foldEquity * 100)}%
          </div>
        )}

        {recommendation.outs !== undefined && recommendation.outs > 0 && (
          <div>
            <span className="font-semibold">Drawing Odds:</span>{" "}
            {Math.round(
              recommendation.outs *
                (gameRoom.gameState === "TURN" ? 4 : 2) *
                10,
            ) / 10}
            %
          </div>
        )}

        <div>
          <span className="font-semibold">Risk/Reward:</span>{" "}
          {calculateRiskReward(recommendation, gameRoom.pot || 0)}
        </div>
      </div>

      <div className="mt-1">
        <span className="font-semibold">Strategic Insight:</span>{" "}
        {getStrategicInsight(recommendation, gameRoom.gameState)}
      </div>
    </div>
  );
}

// Helper function to calculate risk/reward ratio
function calculateRiskReward(
  recommendation: ActionRecommendation,
  potSize: number,
): string {
  if (recommendation.action === "Fold" || recommendation.action === "Check") {
    return "0:1";
  }

  if (
    recommendation.action === "Call" ||
    recommendation.action === "Bet" ||
    recommendation.action === "Raise"
  ) {
    const risk = recommendation.betSize || 0;
    if (risk === 0) return "0:1";

    const reward = potSize + (recommendation.action === "Call" ? 0 : risk);
    const ratio = Math.round((reward / risk) * 10) / 10;

    return `1:${ratio}`;
  }

  return "N/A";
}

// Generate strategic insight based on recommendation
function getStrategicInsight(
  recommendation: ActionRecommendation,
  gameState: string,
): string {
  if (recommendation.action === "Fold") {
    return "Preserving chips for better opportunities.";
  }

  if (recommendation.action === "Check") {
    return "Controlling pot size while keeping options open.";
  }

  if (recommendation.action === "Call") {
    if (recommendation.outs && recommendation.outs > 7) {
      return "Calling with drawing odds in your favor.";
    }
    return "Keeping opponent's range wide while seeing next card.";
  }

  if (recommendation.action === "Bet") {
    if (gameState === "RIVER") {
      return "Thin value betting to extract maximum chips.";
    }

    if (recommendation.drawStrength) {
      return "Semi-bluffing with both immediate fold equity and drawing potential.";
    }

    if (
      recommendation.handStrength &&
      recommendation.handStrength !== "High Card"
    ) {
      return "Value betting for protection against draws.";
    }

    return "Taking initiative with a continuation bet.";
  }

  if (recommendation.action === "Raise") {
    if (gameState === "RIVER") {
      return "Maximizing value on the final betting round.";
    }

    if (recommendation.drawStrength) {
      return "Building pot for when your draw hits while creating fold equity.";
    }

    if (recommendation.foldEquity && recommendation.foldEquity > 0.5) {
      return "Semi-bluff raising with high fold equity.";
    }

    return "Raising for value and to charge draws correctly.";
  }

  return "Balanced play following GTO principles.";
}
