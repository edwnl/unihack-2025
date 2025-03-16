// backend/src/main/java/com/edwn/unihack/service/BettingService.java
package com.edwn.unihack.service;

import com.edwn.unihack.model.GameAction;
import com.edwn.unihack.model.GameRoom;
import com.edwn.unihack.model.Player;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

@Service
public class BettingService {

    private final GameLogService gameLogService;
    private final GameStateService gameStateService;
    private final CardHandlingService cardHandlingService;

    public BettingService(GameLogService gameLogService,
                          GameStateService gameStateService,
                          CardHandlingService cardHandlingService) {
        this.gameLogService = gameLogService;
        this.gameStateService = gameStateService;
        this.cardHandlingService = cardHandlingService;
    }

    public void handleCheck(GameRoom room, String playerId) {
        // Ensure it's this player's turn
        Player currentPlayer = room.getCurrentPlayer();
        if (currentPlayer == null || !currentPlayer.getId().equals(playerId)) {
            return;
        }

        // Update player's last action
        currentPlayer.setLastAction("CHECK");
        currentPlayer.setLastActionAmount(null);

        // Move to next player
        room.moveToNextPlayer();

        // Check if round is complete
        checkRoundCompletion(room);
    }

    public void handleBet(GameRoom room, String playerId, int amount) {
        // Ensure it's this player's turn
        Player currentPlayer = room.getCurrentPlayer();
        if (currentPlayer == null || !currentPlayer.getId().equals(playerId)) {
            return;
        }

        // Make sure player can't bet more than they have
        int maxBet = currentPlayer.getChips();
        int actualBet = Math.min(amount, maxBet);

        // Place bet
        currentPlayer.setChips(currentPlayer.getChips() - actualBet);
        room.getBets().put(playerId, actualBet);
        room.setCurrentBet(actualBet);

        // Update player's last action
        currentPlayer.setLastAction("BET");
        currentPlayer.setLastActionAmount(actualBet);

        // Move to next player
        room.moveToNextPlayer();

        // Check if round is complete
        checkRoundCompletion(room);
    }

    public void handleCall(GameRoom room, String playerId) {
        // Ensure it's this player's turn
        Player currentPlayer = room.getCurrentPlayer();
        if (currentPlayer == null || !currentPlayer.getId().equals(playerId)) {
            return;
        }

        // Get the amount needed to call
        int currentBet = room.getCurrentBet();
        int currentPlayerBet = room.getBets().getOrDefault(playerId, 0);
        int amountToCall = currentBet - currentPlayerBet;

        // Limit call to player's available chips
        int actualCall = Math.min(amountToCall, currentPlayer.getChips());

        // Place call
        if (actualCall > 0) {
            currentPlayer.setChips(currentPlayer.getChips() - actualCall);
            room.getBets().put(playerId, currentPlayerBet + actualCall);
        }

        // Update player's last action
        currentPlayer.setLastAction("CALL");
        currentPlayer.setLastActionAmount(actualCall);

        // Move to next player
        room.moveToNextPlayer();

        // Check if round is complete
        checkRoundCompletion(room);
    }

    public void handleRaise(GameRoom room, String playerId, int amount) {
        // Ensure it's this player's turn
        Player currentPlayer = room.getCurrentPlayer();
        if (currentPlayer == null || !currentPlayer.getId().equals(playerId)) {
            return;
        }

        // Calculate total amount needed (current bet + raise amount)
        int currentPlayerBet = room.getBets().getOrDefault(playerId, 0);
        int totalNeeded = room.getCurrentBet() - currentPlayerBet + amount;

        // Limit to player's available chips
        int actualAmount = Math.min(totalNeeded, currentPlayer.getChips());
        int newBet = currentPlayerBet + actualAmount;

        // Place raise
        currentPlayer.setChips(currentPlayer.getChips() - actualAmount);
        room.getBets().put(playerId, newBet);
        room.setCurrentBet(newBet);

        // Update player's last action
        currentPlayer.setLastAction("RAISE");
        currentPlayer.setLastActionAmount(actualAmount);

        // Move to next player
        room.moveToNextPlayer();

        // Check if round is complete
        checkRoundCompletion(room);
    }

    public void handleFold(GameRoom room, String playerId) {
        // Find the player
        Player player = room.getPlayers().stream()
                .filter(p -> p.getId().equals(playerId))
                .findFirst()
                .orElse(null);

        if (player == null) return;

        // Mark as folded
        player.setFolded(true);

        // Update player's last action
        player.setLastAction("FOLD");
        player.setLastActionAmount(null);

        // If it was this player's turn, move to next
        if (room.getCurrentPlayer() != null && room.getCurrentPlayer().getId().equals(playerId)) {
            room.moveToNextPlayer();
        }

        // Check if round is complete or only one player left
        checkRoundCompletion(room);
        gameStateService.checkGameEnd(room);
    }

    private void checkRoundCompletion(GameRoom room) {
        // Don't process if we're waiting for cards
        if (room.isWaitingForCards()) {
            return;
        }

        boolean roundComplete = isRoundComplete(room);

        if (roundComplete) {
            // Add LOG action
            gameLogService.addLogAction(room, "Betting round complete in state: " + room.getGameState());

            // Collect bets to pot
            for (Integer bet : room.getBets().values()) {
                room.setPot(room.getPot() + bet);
            }
            room.setBets(new HashMap<>());
            room.setCurrentBet(0);

            // Check if all players are all-in except possibly one
            boolean allPlayersAllIn = isAllPlayersAllInOrFolded(room);

            // Move to next stage based on current state
            switch (room.getGameState()) {
                case PREFLOP:
                    gameStateService.advanceToNextStage(room, GameRoom.GameState.FLOP,
                            "Moving to FLOP stage. Waiting for flop cards.");

                    // If all active players are all-in, setup for fast dealing
                    if (allPlayersAllIn) {
                        gameLogService.addLogAction(room, "All players are all-in. Fast-forwarding to showdown after dealing community cards.");
                    }
                    break;
                case FLOP:
                    gameStateService.advanceToNextStage(room, GameRoom.GameState.TURN,
                            "Moving to TURN stage. Waiting for turn card.");
                    break;
                case TURN:
                    gameStateService.advanceToNextStage(room, GameRoom.GameState.RIVER,
                            "Moving to RIVER stage. Waiting for river card.");
                    break;
                case RIVER:
                    gameStateService.advanceToNextStage(room, GameRoom.GameState.SHOWDOWN,
                            "Moving to SHOWDOWN stage. Determining winner.");
                    // Handle showdown
                    gameStateService.handleShowdown(room);
                    break;
                case SHOWDOWN:
                    gameStateService.advanceToNextStage(room, GameRoom.GameState.ENDED,
                            "Hand complete. Waiting for dealer to start new hand.");
                    break;
            }
        }
    }

    // Add this helper method to BettingService class
    private boolean isAllPlayersAllInOrFolded(GameRoom room) {
        int activeNonAllInPlayers = 0;

        for (Player player : room.getPlayers()) {
            if (player.isFolded() || !player.isActive()) continue;

            if (player.getChips() > 0) {
                activeNonAllInPlayers++;
            }
        }

        // If there's only 0 or 1 player with chips, all others are all-in
        return activeNonAllInPlayers <= 1;
    }

    public boolean isRoundComplete(GameRoom room) {
        if (room.isWaitingForCards()) {
            return false;
        }

        int activePlayers = 0;
        int activeNonAllInPlayers = 0;
        int targetBet = room.getCurrentBet();
        Set<String> actedPlayerIds = new HashSet<>();

        // Check if all active players are all-in except possibly one
        for (Player player : room.getPlayers()) {
            if (player.isFolded() || !player.isActive()) continue;

            activePlayers++;
            // Check if player is all-in (chips = 0)
            if (player.getChips() > 0) {
                activeNonAllInPlayers++;
            }
        }

        // If all players are all-in or all but one (who has matched the bet), fast forward
        if (activeNonAllInPlayers <= 1) {
            // Check if the one non-all-in player has matched the current bet
            if (activeNonAllInPlayers == 1) {
                Player nonAllInPlayer = room.getPlayers().stream()
                        .filter(p -> p.isActive() && !p.isFolded() && p.getChips() > 0)
                        .findFirst()
                        .orElse(null);

                if (nonAllInPlayer != null) {
                    int playerBet = room.getBets().getOrDefault(nonAllInPlayer.getId(), 0);
                    // If they haven't matched the bet, we can't fast forward
                    return playerBet >= targetBet;
                }
            }

            // All players are all-in or all bets are matched - we can fast forward
            return true;
        }

        // Rest of the original method remains the same...
        // Find the most recent betting round start
        LocalDateTime roundStartTime = null;
        for (int i = room.getActions().size() - 1; i >= 0; i--) {
            GameAction action = room.getActions().get(i);
            if (action.getType() == GameAction.ActionType.LOG &&
                    (action.getMessage() != null &&
                            (action.getMessage().contains("betting begins") ||
                                    action.getMessage().contains("Pre-flop betting begins")))) {
                roundStartTime = action.getTimestamp();
                break;
            }
        }

        if (roundStartTime == null) {
            // If no round start found, use an old timestamp
            roundStartTime = LocalDateTime.now().minusDays(1);
        }

        // Get all player actions in this round
        for (GameAction action : room.getActions()) {
            if (action.getTimestamp() != null &&
                    action.getTimestamp().isAfter(roundStartTime) &&
                    action.getPlayerId() != null) {

                // Only include betting actions
                if (action.getType() == GameAction.ActionType.CHECK ||
                        action.getType() == GameAction.ActionType.BET ||
                        action.getType() == GameAction.ActionType.CALL ||
                        action.getType() == GameAction.ActionType.RAISE ||
                        action.getType() == GameAction.ActionType.FOLD) {

                    actedPlayerIds.add(action.getPlayerId());
                }
            }
        }

        // Special case for preflop big blind
        boolean bigBlindSpecialCase = false;
        Player bigBlindPlayer = null;

        if (room.getGameState() == GameRoom.GameState.PREFLOP) {
            int bigBlindPos;
            if (room.getPlayers().size() == 2) {
                bigBlindPos = (room.getSmallBlindPosition()) % 2;
            } else {
                bigBlindPos = (room.getSmallBlindPosition() + 1) % room.getPlayers().size();
            }

            if (bigBlindPos < room.getPlayers().size()) {
                bigBlindPlayer = room.getPlayers().get(bigBlindPos);

                // Check if BB has taken an action other than posting the blind
                boolean bbHasActed = actedPlayerIds.contains(bigBlindPlayer.getId());

                // If no one has raised (current bet = BB amount) and BB hasn't acted, they need to act
                bigBlindSpecialCase = !bbHasActed && targetBet == 10;
            }
        }

        // Count active players and check if they've all acted and matched the bet
        for (Player player : room.getPlayers()) {
            if (player.isFolded() || !player.isActive()) continue;

            int playerBet = room.getBets().getOrDefault(player.getId(), 0);

            // Check if player hasn't matched the current bet
            if (playerBet < targetBet) {
                return false;
            }

            // Check if player hasn't acted this round
            if (!actedPlayerIds.contains(player.getId())) {
                // Special case for BB who can check if no raises
                if (bigBlindSpecialCase && bigBlindPlayer != null &&
                        player.getId().equals(bigBlindPlayer.getId())) {
                    return false;
                } else if (targetBet == 0) {
                    // If bet is 0, everyone must act
                    return false;
                }
                // If there's a bet and player hasn't acted, they must have folded or are already all-in
            }
        }

        // If we have only one active player, round is complete
        return activePlayers <= 1 || !actedPlayerIds.isEmpty();
    }
}