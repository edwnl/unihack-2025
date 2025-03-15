package com.edwn.unihack.service;

import com.edwn.unihack.model.Card;
import com.edwn.unihack.model.HandRanking;
import com.edwn.unihack.model.Player;

import java.util.*;
import java.util.stream.Collectors;

public class PokerHandEvaluator {

    // Get hand ranking and description
    public static HandRanking evaluateHand(Player player, List<Card> communityCards) {
        // If player has no hand or cards, return nothing
        if (player == null || player.getHand() == null || player.getHand().getCards() == null ||
                player.getHand().getCards().size() < 2) {
            return new HandRanking(0, "Invalid Hand");
        }

        // If no community cards, can't evaluate fully
        if (communityCards == null || communityCards.isEmpty()) {
            return new HandRanking(0, "Waiting for community cards");
        }

        // Combine player's hole cards with community cards
        List<Card> allCards = new ArrayList<>(player.getHand().getCards());
        allCards.addAll(communityCards);

        // Sort cards by rank in descending order for easier evaluation
        List<Card> sortedCards = allCards.stream()
                .sorted(Comparator.comparingInt(c -> getRankValue(((Card) c).getRank())).reversed())
                .toList();

        // Count occurrences of each rank
        Map<Card.Rank, Integer> rankCounts = new HashMap<>();
        for (Card card : sortedCards) {
            rankCounts.put(card.getRank(), rankCounts.getOrDefault(card.getRank(), 0) + 1);
        }

        // Count occurrences of each suit
        Map<Card.Suit, Integer> suitCounts = new HashMap<>();
        for (Card card : sortedCards) {
            suitCounts.put(card.getSuit(), suitCounts.getOrDefault(card.getSuit(), 0) + 1);
        }

        // Check for flush
        boolean hasFlush = false;
        Card.Suit flushSuit = null;
        for (Map.Entry<Card.Suit, Integer> entry : suitCounts.entrySet()) {
            if (entry.getValue() >= 5) {
                hasFlush = true;
                flushSuit = entry.getKey();
                break;
            }
        }

        // Check for straight
        boolean hasStraight = false;
        Card.Rank straightHighCard = null;
        List<Integer> distinctRankValues = sortedCards.stream()
                .map(c -> getRankValue(c.getRank()))
                .distinct()
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());

        // Special case for A-5 straight
        if (distinctRankValues.contains(14) && // Ace
                distinctRankValues.contains(2) &&
                distinctRankValues.contains(3) &&
                distinctRankValues.contains(4) &&
                distinctRankValues.contains(5)) {
            hasStraight = true;
            straightHighCard = Card.Rank.FIVE; // A-5 straight, 5 high
        } else {
            // Check for 5 consecutive ranks
            for (int i = 0; i < distinctRankValues.size() - 4; i++) {
                if (distinctRankValues.get(i) == distinctRankValues.get(i + 4) + 4) {
                    hasStraight = true;
                    straightHighCard = getRankFromValue(distinctRankValues.get(i));
                    break;
                }
            }
        }

        // Check for straight flush
        if (hasFlush && hasStraight) {
            // Get cards of the flush suit
            Card.Suit finalFlushSuit1 = flushSuit;
            List<Card> flushCards = sortedCards.stream()
                    .filter(c -> c.getSuit() == finalFlushSuit1)
                    .toList();

            List<Integer> flushRankValues = flushCards.stream()
                    .map(c -> getRankValue(c.getRank()))
                    .distinct()
                    .sorted(Comparator.reverseOrder())
                    .collect(Collectors.toList());

            // Check for straight in flush cards
            boolean hasStraightFlush = false;
            Card.Rank straightFlushHighCard = null;

            // Special case for A-5 straight flush
            if (flushRankValues.contains(14) && // Ace
                    flushRankValues.contains(2) &&
                    flushRankValues.contains(3) &&
                    flushRankValues.contains(4) &&
                    flushRankValues.contains(5)) {
                hasStraightFlush = true;
                straightFlushHighCard = Card.Rank.FIVE; // A-5 straight, 5 high
            } else {
                // Check for 5 consecutive ranks
                for (int i = 0; i < flushRankValues.size() - 4; i++) {
                    if (flushRankValues.get(i) == flushRankValues.get(i + 4) + 4) {
                        hasStraightFlush = true;
                        straightFlushHighCard = getRankFromValue(flushRankValues.get(i));
                        break;
                    }
                }
            }

            if (hasStraightFlush) {
                // Check for royal flush (A-K-Q-J-10 of same suit)
                if (getRankValue(straightFlushHighCard) == 14) {
                    return new HandRanking(9, "Royal Flush");
                }
                return new HandRanking(8, "Straight Flush, " + getReadableRank(straightFlushHighCard) + " high");
            }
        }

        // Check for four of a kind
        for (Map.Entry<Card.Rank, Integer> entry : rankCounts.entrySet()) {
            if (entry.getValue() == 4) {
                // Find kicker
                Card.Rank kicker = sortedCards.stream()
                        .filter(c -> c.getRank() != entry.getKey())
                        .findFirst()
                        .map(Card::getRank)
                        .orElse(null);

                return new HandRanking(7, "Four of a Kind, " + getReadableRank(entry.getKey()) + "s");
            }
        }

        // Check for full house
        Card.Rank tripRank = null;
        for (Map.Entry<Card.Rank, Integer> entry : rankCounts.entrySet()) {
            if (entry.getValue() == 3) {
                tripRank = entry.getKey();
                break;
            }
        }

        if (tripRank != null) {
            // Look for a pair
            for (Map.Entry<Card.Rank, Integer> entry : rankCounts.entrySet()) {
                if (entry.getValue() >= 2 && entry.getKey() != tripRank) {
                    return new HandRanking(6, "Full House, " + getReadableRank(tripRank) + "s over " + getReadableRank(entry.getKey()) + "s");
                }
            }
        }

        // Check for flush
        if (hasFlush) {
            // Get highest card of flush suit
            Card.Suit finalFlushSuit = flushSuit;
            Card.Rank highestFlushCard = sortedCards.stream()
                    .filter(c -> c.getSuit() == finalFlushSuit)
                    .findFirst()
                    .map(Card::getRank)
                    .orElse(null);

            return new HandRanking(5, "Flush, " + getReadableRank(highestFlushCard) + " high");
        }

        // Check for straight
        if (hasStraight) {
            return new HandRanking(4, "Straight, " + getReadableRank(straightHighCard) + " high");
        }

        // Check for three of a kind
        if (tripRank != null) {
            return new HandRanking(3, "Three of a Kind, " + getReadableRank(tripRank) + "s");
        }

        // Check for two pair
        List<Card.Rank> pairRanks = new ArrayList<>();
        for (Map.Entry<Card.Rank, Integer> entry : rankCounts.entrySet()) {
            if (entry.getValue() == 2) {
                pairRanks.add(entry.getKey());
            }
        }

        if (pairRanks.size() >= 2) {
            // Sort pairs by rank
            pairRanks.sort(Comparator.comparingInt(r -> getRankValue((Card.Rank) r)).reversed());
            return new HandRanking(2, "Two Pair, " + getReadableRank(pairRanks.get(0)) + "s and " + getReadableRank(pairRanks.get(1)) + "s");
        }

        // Check for one pair
        if (pairRanks.size() == 1) {
            return new HandRanking(1, "Pair of " + getReadableRank(pairRanks.get(0)) + "s");
        }

        // High card
        Card.Rank highCard = sortedCards.get(0).getRank();
        return new HandRanking(0, getReadableRank(highCard) + " High");
    }

    // Compare two hands and return the winner (1 if first hand wins, 2 if second hand wins, 0 if tie)
    public static int compareHands(HandRanking hand1, HandRanking hand2) {
        // First compare by hand type
        if (hand1.getRank() > hand2.getRank()) {
            return 1;
        } else if (hand1.getRank() < hand2.getRank()) {
            return -1;
        } else {
            // Same hand type, compare by highest card or other tie-breakers
            // This is a simplified implementation. In a real poker game, tie-breaking would be more complex
            // and would compare kickers, high cards, etc.

            // Extract high card or pair value from description
            int hand1Value = extractValueFromDescription(hand1.getDescription());
            int hand2Value = extractValueFromDescription(hand2.getDescription());

            if (hand1Value > hand2Value) {
                return 1;
            } else if (hand1Value < hand2Value) {
                return -1;
            } else {
                return 0; // True tie
            }
        }
    }

    private static int extractValueFromDescription(String description) {
        // Parse the description to get the card value
        // Examples: "Pair of Jacks", "Queen High", "Full House, Kings over Nines"

        if (description.contains("Ace")) return 14;
        if (description.contains("King")) return 13;
        if (description.contains("Queen")) return 12;
        if (description.contains("Jack")) return 11;
        if (description.contains("10")) return 10;
        if (description.contains("9")) return 9;
        if (description.contains("8")) return 8;
        if (description.contains("7")) return 7;
        if (description.contains("6")) return 6;
        if (description.contains("5")) return 5;
        if (description.contains("4")) return 4;
        if (description.contains("3")) return 3;
        if (description.contains("2")) return 2;

        // If no value could be extracted, default to 0
        return 0;
    }

    // Helper methods
    private static int getRankValue(Card.Rank rank) {
        switch (rank) {
            case TWO:
                return 2;
            case THREE:
                return 3;
            case FOUR:
                return 4;
            case FIVE:
                return 5;
            case SIX:
                return 6;
            case SEVEN:
                return 7;
            case EIGHT:
                return 8;
            case NINE:
                return 9;
            case TEN:
                return 10;
            case JACK:
                return 11;
            case QUEEN:
                return 12;
            case KING:
                return 13;
            case ACE:
                return 14;
            default:
                return 0;
        }
    }

    private static Card.Rank getRankFromValue(int value) {
        switch (value) {
            case 2:
                return Card.Rank.TWO;
            case 3:
                return Card.Rank.THREE;
            case 4:
                return Card.Rank.FOUR;
            case 5:
                return Card.Rank.FIVE;
            case 6:
                return Card.Rank.SIX;
            case 7:
                return Card.Rank.SEVEN;
            case 8:
                return Card.Rank.EIGHT;
            case 9:
                return Card.Rank.NINE;
            case 10:
                return Card.Rank.TEN;
            case 11:
                return Card.Rank.JACK;
            case 12:
                return Card.Rank.QUEEN;
            case 13:
                return Card.Rank.KING;
            case 14:
                return Card.Rank.ACE;
            default:
                return Card.Rank.TWO;
        }
    }

    private static String getReadableRank(Card.Rank rank) {
        switch (rank) {
            case TWO:
                return "2";
            case THREE:
                return "3";
            case FOUR:
                return "4";
            case FIVE:
                return "5";
            case SIX:
                return "6";
            case SEVEN:
                return "7";
            case EIGHT:
                return "8";
            case NINE:
                return "9";
            case TEN:
                return "10";
            case JACK:
                return "Jack";
            case QUEEN:
                return "Queen";
            case KING:
                return "King";
            case ACE:
                return "Ace";
            default:
                return "";
        }
    }
}