// backend/src/main/java/com/edwn/unihack/model/GameRoom.java
package com.edwn.unihack.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameRoom {
    private String id;
    private List<Player> players;
    private String dealerId;
    private String scannerId;
    private GameState gameState;
    private List<Card> communityCards;
    private List<GameAction> actions;
    private int currentPlayerIndex;
    private int pot;
    private Map<String, Integer> bets; // Track bets for the current round
    private int currentBet; // Current highest bet
    @Builder.Default
    private int smallBlindPosition = 0; // Track small blind position instead of dealer
    @Builder.Default
    private boolean waitingForCards = true;
    @Builder.Default
    private List<String> winnerIds = new ArrayList<>();

    public static GameRoom createNew() {
        return GameRoom.builder()
                .id(generateGameCode())
                .players(new ArrayList<>())
                .communityCards(new ArrayList<>())
                .actions(new ArrayList<>())
                .gameState(GameState.WAITING)
                .pot(0)
                .bets(new HashMap<>())
                .currentBet(0)
                .smallBlindPosition(0) // Initialize small blind position
                .build();
    }

    private static String generateGameCode() {
        return UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    // Calculate button (dealer) position from small blind when needed
    public int getButtonPosition() {
        if (players.size() <= 1) return 0;

        if (players.size() == 2) {
            return smallBlindPosition; // In heads-up, button is the small blind
        } else {
            // In 3+ players, button is one position before small blind
            return (smallBlindPosition - 1 + players.size()) % players.size();
        }
    }

    public Player getCurrentPlayer() {
        if (players.isEmpty() || currentPlayerIndex < 0 || currentPlayerIndex >= players.size()) {
            return null;
        }
        return players.get(currentPlayerIndex);
    }

    public void moveToNextPlayer() {
        if (players.isEmpty()) return;

        // Find next active player who hasn't folded
        do {
            currentPlayerIndex = (currentPlayerIndex + 1) % players.size();
        } while (players.get(currentPlayerIndex).isFolded() || !players.get(currentPlayerIndex).isActive());
    }

    public int getDealerPosition() {
        if (players.size() <= 1) return 0;

        // In heads-up, the dealer is the small blind
        if (players.size() == 2) return smallBlindPosition;

        // Otherwise, dealer is one position before small blind
        return (smallBlindPosition - 1 + players.size()) % players.size();
    }

    // Get how many cards we need for the current stage
    public int getRequiredCardCount() {
        switch (gameState) {
            case PREFLOP:
                // 2 cards per player
                return players.size() * 2;
            case FLOP:
                // 3 community cards
                return 3;
            case TURN:
            case RIVER:
                // 1 community card each
                return 1;
            default:
                return 0;
        }
    }

    // Get current scanned card count
    public int getCurrentScannedCardCount() {
        switch (gameState) {
            case PREFLOP:
                // Count cards in player hands
                return players.stream()
                        .filter(p -> p.getHand() != null)
                        .mapToInt(p -> p.getHand().getCards().size())
                        .sum();
            case FLOP:
            case TURN:
            case RIVER:
                // Count community cards
                return communityCards.size();
            default:
                return 0;
        }
    }

    public enum GameState {
        WAITING, STARTED, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN, ENDED
    }
}