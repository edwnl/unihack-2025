// backend/src/main/java/com/edwn/unihack/util/eval/Evaluate.java
package com.edwn.unihack.util.eval;

import java.util.ArrayList;
import java.util.List;

public class Evaluate {
    private Card[] bestHand;
    private int lowestValue = Integer.MAX_VALUE;

    public Evaluate(Card[] cardHand) {
        // Generate all possible 5-card combinations from the 7-card hand
        List<Card[]> allCombinations = generateCombinations(cardHand, 5);

        // Evaluate each 5-card hand
        for (Card[] hand : allCombinations) {
            int value = Hand.evaluate(hand);

            // Keep track of the lowest value hand
            if (value < lowestValue) {
                lowestValue = value;
                bestHand = hand;
            }
        }
    }

    // Helper method to generate all possible combinations of size k from an array
    private static List<Card[]> generateCombinations(Card[] cards, int k) {
        List<Card[]> result = new ArrayList<>();
        generateCombinationsHelper(cards, k, 0, new Card[k], result, 0);
        return result;
    }

    private static void generateCombinationsHelper(Card[] cards, int k, int start, Card[] current, List<Card[]> result,
                                                   int currentIndex) {
        if (currentIndex == k) {
            // We've selected k cards, add this combination to the result
            result.add(current.clone());
            return;
        }

        // Try to add each remaining card to the current combination
        for (int i = start; i < cards.length; i++) {
            current[currentIndex] = cards[i];
            generateCombinationsHelper(cards, k, i + 1, current, result, (currentIndex + 1));
        }
    }

    // Helper method to format a hand of cards
    public static String formatHand(Card[] hand) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < hand.length; i++) {
            sb.append(hand[i].toString());
            if (i < hand.length - 1) {
                sb.append(", ");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    public int getValue() {
        return lowestValue;
    }

    public void printCard() {
        System.out.println("\nBest hand: " + formatHand(bestHand) + " - Value: " + lowestValue);
    }
}