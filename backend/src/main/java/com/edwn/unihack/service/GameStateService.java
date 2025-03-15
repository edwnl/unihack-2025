// backend/src/main/java/com/edwn/unihack/service/GameStateService.java
package com.edwn.unihack.service;

import com.edwn.unihack.model.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class GameStateService {

    private final GameLogService gameLogService;

    public GameStateService(GameLogService gameLogService) {
        this.gameLogService = gameLogService;
    }

    public void startNewHand(GameRoom room) {
        // Reset game state
        room.setCommunityCards(new ArrayList<>());
        room.setGameState(GameRoom.GameState.PREFLOP);
        room.setWaitingForCards(true);
        room.setPot(0);
        room.setBets(new HashMap<>());
        room.setCurrentBet(0);
        room.setActions(new ArrayList<>());
        room.setWinnerIds(new ArrayList<>()); // Clear winner IDs

        // Reset player states
        for (Player player : room.getPlayers()) {
            player.setFolded(false);
            player.setActive(true);
            player.setHand(new PlayerHand(new ArrayList<>()));
            player.setLastAction("");
            player.setHandRanking(null); // Clear hand ranking
        }

        // Move the small blind position
        int smallBlindPos = room.getSmallBlindPosition();
        if (smallBlindPos < 0 || smallBlindPos >= room.getPlayers().size()) {
            smallBlindPos = 0;
        } else {
            smallBlindPos = (smallBlindPos + 1) % room.getPlayers().size();
        }
        room.setSmallBlindPosition(smallBlindPos);

        // Calculate big blind and button positions
        int bigBlindPos = (smallBlindPos + 1) % room.getPlayers().size();
        int buttonPos = (smallBlindPos - 1 + room.getPlayers().size()) % room.getPlayers().size();

        // Get small blind and big blind players
        Player smallBlindPlayer = room.getPlayers().get(smallBlindPos);
        Player bigBlindPlayer = room.getPlayers().get(bigBlindPos);
        Player buttonPlayer = room.getPlayers().get(buttonPos);

        // Set initial blind amounts
        int smallBlindAmount = 5;
        int bigBlindAmount = 10;

        // Collect small blind
        smallBlindPlayer.setChips(smallBlindPlayer.getChips() - smallBlindAmount);
        smallBlindPlayer.setLastAction("SMALL_BLIND");
        smallBlindPlayer.setLastActionAmount(smallBlindAmount);
        room.getBets().put(smallBlindPlayer.getId(), smallBlindAmount);

        // Add small blind action
        GameAction smallBlindAction = GameAction.builder()
                .playerId(smallBlindPlayer.getId())
                .playerName(smallBlindPlayer.getName())
                .type(GameAction.ActionType.SMALL_BLIND)
                .amount(smallBlindAmount)
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(smallBlindAction);

        // Collect big blind
        bigBlindPlayer.setChips(bigBlindPlayer.getChips() - bigBlindAmount);
        bigBlindPlayer.setLastAction("BIG_BLIND");
        bigBlindPlayer.setLastActionAmount(bigBlindAmount);
        room.getBets().put(bigBlindPlayer.getId(), bigBlindAmount);
        room.setCurrentBet(bigBlindAmount);

        // Add big blind action
        GameAction bigBlindAction = GameAction.builder()
                .playerId(bigBlindPlayer.getId())
                .playerName(bigBlindPlayer.getName())
                .type(GameAction.ActionType.BIG_BLIND)
                .amount(bigBlindAmount)
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(bigBlindAction);

        // Log hand info
        String handInfo = "Button: " + buttonPlayer.getName() +
                ", SB: " + smallBlindPlayer.getName() +
                ", BB: " + bigBlindPlayer.getName();

        // Add a LOG action
        gameLogService.addLogAction(room, "New hand started. " + handInfo + ". Waiting for cards to be dealt.");

        // Add a START_HAND action
        GameAction startAction = GameAction.builder()
                .type(GameAction.ActionType.START_HAND)
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(startAction);
    }

    public void advanceToNextStage(GameRoom room, GameRoom.GameState nextState, String message) {
        room.setGameState(nextState);

        if (nextState != GameRoom.GameState.SHOWDOWN && nextState != GameRoom.GameState.ENDED) {
            room.setWaitingForCards(true);
        }

        // Log state change
        gameLogService.addLogAction(room, message);

        // Always reset the current player to the first active player after dealer
        if (nextState != GameRoom.GameState.SHOWDOWN && nextState != GameRoom.GameState.ENDED) {
            // Find the first active player after the dealer
            int startPos = (room.getSmallBlindPosition()) % room.getPlayers().size();
            for (int i = 0; i < room.getPlayers().size(); i++) {
                int pos = (startPos + i) % room.getPlayers().size();
                if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                    room.setCurrentPlayerIndex(pos);
                    break;
                }
            }
        }
    }

    public int getDealerPosition(GameRoom room) {
        if (room.getPlayers().size() <= 1) return 0;

        // In heads-up, the dealer is the small blind
        if (room.getPlayers().size() == 2) return room.getSmallBlindPosition();

        // Otherwise, dealer is one position before small blind
        return (room.getSmallBlindPosition() - 1 + room.getPlayers().size()) % room.getPlayers().size();
    }

    public void handleShowdown(GameRoom room) {
        List<Player> activePlayers = room.getPlayers().stream()
                .filter(p -> p.isActive() && !p.isFolded())
                .collect(Collectors.toList());

        if (activePlayers.isEmpty()) {
            // No active players (shouldn't happen), log the issue
            gameLogService.addLogAction(room, "Error: No active players at showdown!");
            return;
        }

        // Evaluate all hands
        StringBuilder handReveal = new StringBuilder("SHOWDOWN - Revealing hands:\n");

        // Map to store player's hand evaluation
        Map<Player, Integer> handRankings = new HashMap<>();

        for (Player player : activePlayers) {
            // Evaluate hand
            HandRanking handRanking = PokerHandEvaluator.evaluateHand(player, room.getCommunityCards());
            handRankings.put(player, handRanking.getValue());

            // Set the hand ranking description on the player
            player.setHandRanking(handRanking.getDescription());

            // Add to log message
            if (player.getHand() != null && player.getHand().getCards() != null) {
                StringBuilder handDesc = new StringBuilder();
                for (Card card : player.getHand().getCards()) {
                    handDesc.append(card.getRank()).append(" of ").append(card.getSuit()).append(", ");
                }
                String handString = handDesc.toString();
                if (handString.endsWith(", ")) {
                    handString = handString.substring(0, handString.length() - 2);
                }

                handReveal.append(player.getName())
                        .append(": ")
                        .append(handString)
                        .append(" - ")
                        .append(handRanking.getDescription())
                        .append("\n");
            }
        }

        // Log all revealed hands
        gameLogService.addLogAction(room, handReveal.toString());

        // Determine winner(s) using proper hand comparison
        List<Player> winners = PokerHandEvaluator.bestHand(handRankings);


        // Split pot among winners
        int winAmount = room.getPot() / winners.size();
        StringBuilder winMessage = new StringBuilder();

        for (Player winner : winners) {
            winner.setChips(winner.getChips() + winAmount);
            winMessage.append(winner.getName()).append(" wins ").append(winAmount).append(" chips with ").append(winner.getHandRanking()).append(". ");
        }

        // Log the winner
        gameLogService.addLogAction(room, "SHOWDOWN: " + winMessage.toString());

        // Mark winner IDs in the game state
        room.setWinnerIds(winners.stream().map(Player::getId).collect(Collectors.toList()));

        // Reset the pot
        room.setPot(0);
    }

    public void checkGameEnd(GameRoom room) {
        // Count active players who haven't folded
        long activePlayers = room.getPlayers().stream()
                .filter(p -> p.isActive() && !p.isFolded())
                .count();

        if (activePlayers <= 1) {
            // Game is over, move to ended state
            room.setGameState(GameRoom.GameState.ENDED);

            // Award pot to last player standing
            Player winner = room.getPlayers().stream()
                    .filter(p -> p.isActive() && !p.isFolded())
                    .findFirst()
                    .orElse(null);

            if (winner != null) {
                winner.setChips(winner.getChips() + room.getPot());
                room.setPot(0);

                // Add winner to winnerIds
                List<String> winnerIds = new ArrayList<>();
                winnerIds.add(winner.getId());
                room.setWinnerIds(winnerIds);

                gameLogService.addLogAction(room, winner.getName() + " wins " + room.getPot() + " chips as the last player standing.");
            }
        }
    }
}