package com.edwn.unihack.service;

import com.edwn.unihack.model.HandRanking;
import com.edwn.unihack.model.Player;
import com.edwn.unihack.util.eval.Card;
import com.edwn.unihack.util.eval.Evaluate;

import java.util.*;

public class PokerHandEvaluator {

    private static final Map<String, Integer> rankMap = new HashMap<>();
    private static final Map<String, Integer> suitMap = new HashMap<>();

    // Add a static initializer to asynchronously load required classes
    static {
        // Initialize in a background thread
        Thread initThread = new Thread(() -> {
            try {
                System.out.println("Starting async initialization of poker evaluation classes from PokerHandEvaluator...");
                long startTime = System.currentTimeMillis();

                // Force initialization of the Tables class
                Class.forName("com.edwn.unihack.util.eval.Tables");

                // Create a dummy card to ensure Card class is fully initialized
                new Card(Card.ACE, Card.SPADES);

                long endTime = System.currentTimeMillis();
                System.out.println("Async initialization complete in " + (endTime - startTime) + "ms");
            } catch (Exception e) {
                System.err.println("Failed to preload poker evaluation classes: " + e.getMessage());
            }
        });

        // Set as daemon thread so it doesn't prevent app shutdown
        initThread.setDaemon(true);
        // Give the thread a meaningful name
        initThread.setName("Poker-Evaluator-Initializer-Double");
        // Start the background initialization
        initThread.start();
    }

    static {
        // Initialize rank map
        rankMap.put("KING", Card.KING);
        rankMap.put("QUEEN", Card.QUEEN);
        rankMap.put("JACK", Card.JACK);
        rankMap.put("ACE", Card.ACE);
        rankMap.put("TWO", Card.DEUCE);
        rankMap.put("THREE", Card.TREY);
        rankMap.put("FOUR", Card.FOUR);
        rankMap.put("FIVE", Card.FIVE);
        rankMap.put("SIX", Card.SIX);
        rankMap.put("SEVEN", Card.SEVEN);
        rankMap.put("EIGHT", Card.EIGHT);
        rankMap.put("NINE", Card.NINE);
        rankMap.put("TEN", Card.TEN);

        // Initialize suit map
        suitMap.put("HEARTS", Card.HEARTS);
        suitMap.put("DIAMONDS", Card.DIAMONDS);
        suitMap.put("CLUBS", Card.CLUBS);
        suitMap.put("SPADES", Card.SPADES);
    }

    public static HandRanking evaluateHand(Player player, List<com.edwn.unihack.model.Card> communityCards) {
        List<com.edwn.unihack.model.Card> playerCards = player.getHand().getCards();
        int size = communityCards.size() + playerCards.size();
        if (size < 5) {
            return new HandRanking(0, 0, "Unknown");
        }

        Card[] cardHand = new Card[size];

        for (int i = 0; i < playerCards.size(); i++) {
            cardHand[i] = stringToCard(playerCards.get(i).getRank().toString(),
                    playerCards.get(i).getSuit().toString());
        }
        for (int i = 0; i < communityCards.size(); i++) {
            cardHand[i + playerCards.size()] = stringToCard(communityCards.get(i).getRank().toString(),
                    communityCards.get(i).getSuit().toString());
        }

        Evaluate evaluator = new Evaluate(cardHand);

        evaluator.printCard();
        int handValue = evaluator.getValue();

        return new HandRanking(getRankCategory(handValue), handValue, getRankCategoryString(handValue));
    }

    public static String getRankCategoryString(int value) {
        if (value > 6185)
            return "High Card";
        if (value > 3325)
            return "One Pair";
        if (value > 2467)
            return "Two Pair";
        if (value > 1609)
            return "Three of a Kind";
        if (value > 1599)
            return "Straight";
        if (value > 322)
            return "Flush";
        if (value > 166)
            return "Full House";
        if (value > 10)
            return "Four of a Kind";
        if (value > 3)
            return "Straight Flush";
        return "Royal Flush";
    }

    public static int getRankCategory(int value) {
        if (value > 6185)
            return 1; // 1277 high card
        if (value > 3325)
            return 2; // 2860 one pair
        if (value > 2467)
            return 3; // 858 two pair
        if (value > 1609)
            return 4; // 858 three-kind
        if (value > 1599)
            return 5; // 10 straights
        if (value > 322)
            return 6; // 1277 flushes
        if (value > 166)
            return 7; // 156 full house
        if (value > 10)
            return 8; // 156 four-kind
        return 9; // 10 straight-flushes
    }

    // Compare two hands and return the winner (1 if first hand wins, 2 if second
    // hand wins, 0 if tie)
    public static List<Player> bestHand(Map<Player, Integer> handRankings) {
        if (handRankings.isEmpty())
            return Collections.emptyList();

        // Find the lowest ranking
        int bestRank = Collections.min(handRankings.values());

        // Collect all players with the lowest ranking
        List<Player> bestPlayers = new ArrayList<>();
        for (Map.Entry<Player, Integer> entry : handRankings.entrySet()) {
            if (entry.getValue() == bestRank) {
                bestPlayers.add(entry.getKey());
            }
        }
        return bestPlayers;
    }

    public static Card stringToCard(String rank, String suit) {
        Integer rankNo = rankMap.get(rank);
        if (rankNo == null) {
            throw new IllegalArgumentException("Invalid rank: " + rank);
        }

        Integer suitNo = suitMap.get(suit);
        if (suitNo == null) {
            throw new IllegalArgumentException("Invalid suit: " + suit);
        }

        return new Card(rankNo, suitNo);
    }
}
