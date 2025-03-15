// backend/src/main/java/com/edwn/unihack/model/GameRoom.java (updated)
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
    private int nextCardRecipientIndex;
    private int handNumber;

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

    public void newHand() {
        setCommunityCards(new ArrayList<>());
        setGameState(GameRoom.GameState.PREFLOP);
        setWaitingForCards(true);
        setPot(0);
        setBets(new HashMap<>());
        setCurrentBet(0);
        setActions(new ArrayList<>());
        setWinnerIds(new ArrayList<>());
    }

    private static String generateGameCode() {
        return UUID.randomUUID().toString().substring(0, 6).toUpperCase();
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

    public enum GameState {
        WAITING, STARTED, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN, ENDED
    }

    public boolean isAllPlayersAllInOrFolded() {
        int activeNonAllInPlayers = 0;

        for (Player player : getPlayers()) {
            if (player.isFolded() || !player.isActive()) continue;

            if (player.getChips() > 0) {
                activeNonAllInPlayers++;
            }
        }

        // If there's only 0 or 1 player with chips, all others are all-in
        return activeNonAllInPlayers <= 1;
    }
}