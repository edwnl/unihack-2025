package com.edwn.unihack.util.eval;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// Assuming you have a Card class and Hand.evaluate() method already defined
public class Evaluate {
    private Card[] cardHand;
    private Card[] bestHand;
    private int lowestValue = Integer.MAX_VALUE;
    
    public Evaluate(Card[] cardHand) {
        this.cardHand = cardHand;
        // Generate all possible 5-card combinations from the 7-card hand
        List<Card[]> allCombinations = generateCombinations(cardHand, 5);
        // Store the evaluation result for each combination
        int[] handValues = new int[allCombinations.size()]; // Should be 21 combinations
        
        // Evaluate each 5-card hand
        for (int i = 0; i < allCombinations.size(); i++) {
            Card[] hand = allCombinations.get(i);
            int value = Hand.evaluate(hand);
            handValues[i] = value;
            
            // Keep track of the lowest value hand
            if (value < lowestValue) {
                lowestValue = value;
                bestHand = hand;
            }
        }
    }
    
    public int getValue() {
        return lowestValue;
    }
    public Card[] getBestHand() {
        return bestHand;
    }
    
    public void printCard() {
        System.out.println("\nBest hand: " + formatHand(bestHand) + " - Value: " + lowestValue);
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
}

