package com.edwn.unihack.service;

import java.util.stream.Collectors;

import com.edwn.unihack.model.HandRanking;
import com.edwn.unihack.model.Player;

import com.edwn.unihack.util.eval.Evaluate;
import com.edwn.unihack.util.eval.Card;
import java.util.*;

public class PokerHandEvaluator {

    // Get hand ranking and description
    public static HandRanking evaluateHand(Player player, List<com.edwn.unihack.model.Card> communityCards) {
        List<com.edwn.unihack.model.Card> playerCards = player.getHand().getCards();

        int size = communityCards.size() + playerCards.size();
        System.out.print("SIZE ");
        System.out.println();
        if (size >= 5) {
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
        return new HandRanking(0, 0, "Unknown");

    }

    public static String getRankCategoryString(int value) {
        if (value > 6185)
            return "High Card";
        if (value > 3325)
            return "One Pair";
        if (value > 2467)
            return "Two Pair";
        if (value > 1609)
            return "Three Kind";
        if (value > 1599)
            return "Straight";
        if (value > 322)
            return "Flush";
        if (value > 166)
            return "Full House";
        if (value > 10)
            return "Four Kind";
        if (value > 4)
            return "Straight Flush";
        return "Royal Straight Flush";
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
        int rank_no = -1, suit_no = -1;

        // Convert rank to number using words in all caps
        switch (rank.toUpperCase()) {
            case "KING":
                rank_no = Card.KING;
                break;
            case "QUEEN":
                rank_no = Card.QUEEN;
                break;
            case "JACK":
                rank_no = Card.JACK;
                break;
            case "ACE":
                rank_no = Card.ACE;
                break;
            case "TWO":
                rank_no = Card.DEUCE;
                break;
            case "THREE":
                rank_no = Card.TREY;
                break;
            case "FOUR":
                rank_no = Card.FOUR;
                break;
            case "FIVE":
                rank_no = Card.FIVE;
                break;
            case "SIX":
                rank_no = Card.SIX;
                break;
            case "SEVEN":
                rank_no = Card.SEVEN;
                break;
            case "EIGHT":
                rank_no = Card.EIGHT;
                break;
            case "NINE":
                rank_no = Card.NINE;
                break;
            case "TEN":
                rank_no = Card.TEN;
                break;
            default:
                throw new IllegalArgumentException("Invalid rank: " + rank);
        }

        // Convert suit to number using words in all caps
        switch (suit.toUpperCase()) {
            case "HEARTS":
                suit_no = Card.HEARTS;
                break;
            case "DIAMONDS":
                suit_no = Card.DIAMONDS;
                break;
            case "CLUBS":
                suit_no = Card.CLUBS;
                break;
            case "SPADES":
                suit_no = Card.SPADES;
                break;
            default:
                throw new IllegalArgumentException("Invalid suit: " + suit);
        }

        return new Card(rank_no, suit_no); // Assuming Card constructor accepts rank and suit as integers
    }

}