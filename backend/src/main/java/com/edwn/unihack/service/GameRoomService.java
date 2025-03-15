// backend/src/main/java/com/edwn/unihack/service/GameRoomService.java
package com.edwn.unihack.service;

import com.edwn.unihack.model.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class GameRoomService {
    private final Map<String, GameRoom> gameRooms = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate messagingTemplate;

    public GameRoomService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public GameRoom createRoom() {
        GameRoom room = GameRoom.createNew();
        gameRooms.put(room.getId(), room);
        return room;
    }

    public Optional<GameRoom> findRoomByCode(String code) {
        return Optional.ofNullable(gameRooms.get(code));
    }

    public Player addPlayerToRoom(String gameCode, String name, boolean online, boolean visuallyImpaired) {
        GameRoom room = gameRooms.get(gameCode);
        if (room == null || room.getPlayers().size() >= 5) {
            return null;
        }

        Player player = Player.builder()
                .id(UUID.randomUUID().toString())
                .name(name)
                .online(online)
                .visuallyImpaired(visuallyImpaired)
                .chips(1000) // Starting chips
                .active(true)
                .folded(false)
                .build();

        room.getPlayers().add(player);
        return player;
    }

    public boolean addDealerToRoom(String gameCode, String dealerId) {
        GameRoom room = gameRooms.get(gameCode);
        if (room == null || room.getDealerId() != null) {
            return false;
        }

        room.setDealerId(dealerId);
        return true;
    }

    public boolean addScannerToRoom(String gameCode, String scannerId) {
        GameRoom room = gameRooms.get(gameCode);
        if (room == null || room.getScannerId() != null) {
            return false;
        }

        room.setScannerId(scannerId);
        return true;
    }

    public boolean startGame(String gameCode) {
        GameRoom room = gameRooms.get(gameCode);
        if (room == null || room.getPlayers().isEmpty() || room.getDealerId() == null) {
            return false;
        }

        // Start a new hand
        startNewHand(room);

        // Notify clients
        notifyRoomUpdate(gameCode);

        return true;
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
        GameAction logAction = GameAction.builder()
                .type(GameAction.ActionType.LOG)
                .message("New hand started. " + handInfo + ". Waiting for cards to be dealt.")
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(logAction);

        // Add a START_HAND action
        GameAction startAction = GameAction.builder()
                .type(GameAction.ActionType.START_HAND)
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(startAction);

        // Notify all clients about the new hand
        notifyRoomUpdate(room.getId());
    }

    public void processAction(String gameCode, GameAction action) {
        GameRoom room = findRoomByCode(gameCode).orElse(null);
        if (room == null) return;

        // Check if we're waiting for cards - only allow certain actions
        if (room.isWaitingForCards() &&
                action.getType() != GameAction.ActionType.SCAN_CARD &&
                action.getType() != GameAction.ActionType.START_HAND &&
                action.getType() != GameAction.ActionType.LOG) {

            // Add a LOG action indicating action not allowed
            GameAction errorAction = GameAction.builder()
                    .type(GameAction.ActionType.LOG)
                    .message("ERROR: Player action '" + action.getType() + "' attempted while waiting for cards. Action ignored.")
                    .timestamp(LocalDateTime.now())
                    .build();
            room.getActions().add(errorAction);

            // Notify all clients about the update
            notifyRoomUpdate(gameCode);

            return;
        }

        // Add the action to history
        action.setTimestamp(LocalDateTime.now());
        room.getActions().add(action);

        // Process based on action type
        switch (action.getType()) {
            case SCAN_CARD:
                handleCardScan(room, action.getCard());
                break;
            case CHECK:
                handleCheck(room, action.getPlayerId());
                break;
            case BET:
                handleBet(room, action.getPlayerId(), action.getAmount());
                break;
            case CALL:
                handleCall(room, action.getPlayerId());
                break;
            case RAISE:
                handleRaise(room, action.getPlayerId(), action.getAmount());
                break;
            case FOLD:
                handleFold(room, action.getPlayerId());
                break;
            case START_HAND:
                startNewHand(room);
                break;
        }

        // Notify all clients about the update
        notifyRoomUpdate(gameCode);
    }

    private void updatePlayerHandRankings(GameRoom room) {
        // Only evaluate hands if we have at least one community card
        if (room.getCommunityCards() == null || room.getCommunityCards().isEmpty()) {
            return;
        }

        // Evaluate each active player's hand
        for (Player player : room.getPlayers()) {
            if (player.isActive() && !player.isFolded() && player.getHand() != null && player.getHand().getCards() != null) {
                HandRanking handRanking = PokerHandEvaluator.evaluateHand(player, room.getCommunityCards());
                player.setHandRanking(handRanking.getDescription());
            }
        }
    }

    private void handleCardScan(GameRoom room, Card card) {
        if (card == null) return;

        // Log the card scan
        GameAction logAction = GameAction.builder()
                .type(GameAction.ActionType.LOG)
                .message("Card scanned: " + card.getRank() + " of " + card.getSuit() +
                        " in state: " + room.getGameState() +
                        ", waiting for cards: " + room.isWaitingForCards())
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(logAction);

        // Only process card scans when we're waiting for cards
        if (!room.isWaitingForCards()) {
            GameAction errorAction = GameAction.builder()
                    .type(GameAction.ActionType.LOG)
                    .message("ERROR: Card scanned while not waiting for cards. Current state: " + room.getGameState())
                    .timestamp(LocalDateTime.now())
                    .build();
            room.getActions().add(errorAction);
            return;
        }

        // Process the card based on the current game state
        switch (room.getGameState()) {
            case PREFLOP:
                // Assign card to a player
                assignCardToPlayer(room, card);
                updatePlayerHandRankings(room);

                // Check if all players have their cards
                boolean allPlayersHaveCards = true;
                for (Player player : room.getPlayers()) {
                    if (!player.isActive() || player.isFolded()) continue;

                    if (player.getHand() == null || player.getHand().getCards().size() < 2) {
                        allPlayersHaveCards = false;
                        break;
                    }
                }

                // If all players have their cards, start preflop betting
                if (allPlayersHaveCards) {
                    // No longer waiting for cards
                    room.setWaitingForCards(false);

                    // In a 3+ player game, action starts with UTG (first player left of BB)
                    int bigBlindPos = (room.getSmallBlindPosition() + 1) % room.getPlayers().size();
                    int startPos = (bigBlindPos + 1) % room.getPlayers().size();

                    // Find the first active player from UTG
                    for (int i = 0; i < room.getPlayers().size(); i++) {
                        int pos = (startPos + i) % room.getPlayers().size();
                        if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                            room.setCurrentPlayerIndex(pos);
                            break;
                        }
                    }

                    GameAction preFlopAction = GameAction.builder()
                            .type(GameAction.ActionType.LOG)
                            .message("All players have cards. Pre-flop betting begins. UTG to act first.")
                            .timestamp(LocalDateTime.now())
                            .build();
                    room.getActions().add(preFlopAction);
                }
                break;

            case FLOP:
                // Add to community cards
                room.getCommunityCards().add(card);
                updatePlayerHandRankings(room);

                // Log the flop development
                GameAction flopLogAction = GameAction.builder()
                        .type(GameAction.ActionType.LOG)
                        .message("Flop card " + room.getCommunityCards().size() + "/3: " +
                                card.getRank() + " of " + card.getSuit())
                        .timestamp(LocalDateTime.now())
                        .build();
                room.getActions().add(flopLogAction);

                // If we have 3 community cards, start flop betting
                if (room.getCommunityCards().size() == 3) {
                    // No longer waiting for cards
                    room.setWaitingForCards(false);
                    updatePlayerHandRankings(room);

                    // Reset bets for the new round
                    room.setBets(new HashMap<>());
                    room.setCurrentBet(0);

                    // Set first active player after the small blind
                    int startPos = room.getSmallBlindPosition();
                    for (int i = 0; i < room.getPlayers().size(); i++) {
                        int pos = (startPos + i) % room.getPlayers().size();
                        if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                            room.setCurrentPlayerIndex(pos);
                            break;
                        }
                    }

                    GameAction flopCompleteAction = GameAction.builder()
                            .type(GameAction.ActionType.LOG)
                            .message("Flop complete. Flop betting begins.")
                            .timestamp(LocalDateTime.now())
                            .build();
                    room.getActions().add(flopCompleteAction);
                }
                break;

            case TURN:
                // Add to community cards
                room.getCommunityCards().add(card);
                updatePlayerHandRankings(room);

                // No longer waiting for cards after the turn card is dealt
                room.setWaitingForCards(false);

                // Log the turn card
                GameAction turnLogAction = GameAction.builder()
                        .type(GameAction.ActionType.LOG)
                        .message("Turn card: " + card.getRank() + " of " + card.getSuit())
                        .timestamp(LocalDateTime.now())
                        .build();
                room.getActions().add(turnLogAction);

                // Reset bets for the new round
                room.setBets(new HashMap<>());
                room.setCurrentBet(0);

                // Set first active player to small blind
                int turnStartPos = room.getSmallBlindPosition();
                for (int i = 0; i < room.getPlayers().size(); i++) {
                    int pos = (turnStartPos + i) % room.getPlayers().size();
                    if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                        room.setCurrentPlayerIndex(pos);
                        break;
                    }
                }

                // Log betting begins
                GameAction turnBettingAction = GameAction.builder()
                        .type(GameAction.ActionType.LOG)
                        .message("Turn betting begins.")
                        .timestamp(LocalDateTime.now())
                        .build();
                room.getActions().add(turnBettingAction);
                break;

            case RIVER:
                // Add to community cards
                room.getCommunityCards().add(card);
                updatePlayerHandRankings(room);

                // No longer waiting for cards after the river card is dealt
                room.setWaitingForCards(false);

                // Log the river card
                GameAction riverLogAction = GameAction.builder()
                        .type(GameAction.ActionType.LOG)
                        .message("River card: " + card.getRank() + " of " + card.getSuit())
                        .timestamp(LocalDateTime.now())
                        .build();
                room.getActions().add(riverLogAction);

                // Reset bets for the new round
                room.setBets(new HashMap<>());
                room.setCurrentBet(0);

                // Set first active player to small blind
                int riverStartPos = room.getSmallBlindPosition();
                for (int i = 0; i < room.getPlayers().size(); i++) {
                    int pos = (riverStartPos + i) % room.getPlayers().size();
                    if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                        room.setCurrentPlayerIndex(pos);
                        break;
                    }
                }

                // Log betting begins
                GameAction riverBettingAction = GameAction.builder()
                        .type(GameAction.ActionType.LOG)
                        .message("River betting begins.")
                        .timestamp(LocalDateTime.now())
                        .build();
                room.getActions().add(riverBettingAction);
                break;
        }
    }

    private void assignCardToPlayer(GameRoom room, Card card) {
        // Find player with the fewest cards
        Player targetPlayer = null;
        int minCardCount = Integer.MAX_VALUE;

        for (Player player : room.getPlayers()) {
            if (!player.isActive()) continue;

            // Initialize hand if null
            if (player.getHand() == null) {
                player.setHand(new PlayerHand(new ArrayList<>()));
            }

            // Get card count
            int cardCount = player.getHand().getCards().size();
            if (cardCount < minCardCount) {
                minCardCount = cardCount;
                targetPlayer = player;
            }
        }

        // Assign card to player
        if (targetPlayer != null && minCardCount < 2) {
            if (targetPlayer.getHand() == null) {
                targetPlayer.setHand(new PlayerHand(new ArrayList<>()));
            }
            targetPlayer.getHand().getCards().add(card);

            // Add LOG action for debugging
            GameAction logAction = GameAction.builder()
                    .type(GameAction.ActionType.LOG)
                    .playerName(targetPlayer.getName())
                    .message("Card dealt to " + targetPlayer.getName() + ": " + card.getRank() + " of " + card.getSuit())
                    .timestamp(LocalDateTime.now())
                    .build();
            room.getActions().add(logAction);
        }
    }

    private void handleCheck(GameRoom room, String playerId) {
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

    private void handleBet(GameRoom room, String playerId, int amount) {
        // Ensure it's this player's turn
        Player currentPlayer = room.getCurrentPlayer();
        if (currentPlayer == null || !currentPlayer.getId().equals(playerId)) {
            return;
        }

        // Place bet
        currentPlayer.setChips(currentPlayer.getChips() - amount);
        room.getBets().put(playerId, amount);
        room.setCurrentBet(amount);

        // Update player's last action
        currentPlayer.setLastAction("BET");
        currentPlayer.setLastActionAmount(amount);

        // Move to next player
        room.moveToNextPlayer();

        // Check if round is complete
        checkRoundCompletion(room);
    }

    private void handleCall(GameRoom room, String playerId) {
        // Ensure it's this player's turn
        Player currentPlayer = room.getCurrentPlayer();
        if (currentPlayer == null || !currentPlayer.getId().equals(playerId)) {
            return;
        }

        // Get the amount needed to call
        int currentBet = room.getCurrentBet();
        int currentPlayerBet = room.getBets().getOrDefault(playerId, 0);
        int amountToCall = currentBet - currentPlayerBet;

        // Place call
        if (amountToCall > 0) {
            currentPlayer.setChips(currentPlayer.getChips() - amountToCall);
            room.getBets().put(playerId, currentBet);
        }

        // Update player's last action
        currentPlayer.setLastAction("CALL");
        currentPlayer.setLastActionAmount(amountToCall);

        // Move to next player
        room.moveToNextPlayer();

        // Check if round is complete
        checkRoundCompletion(room);
    }

    private void handleRaise(GameRoom room, String playerId, int amount) {
        // Ensure it's this player's turn
        Player currentPlayer = room.getCurrentPlayer();
        if (currentPlayer == null || !currentPlayer.getId().equals(playerId)) {
            return;
        }

        // Calculate total bet (current bet + raise amount)
        int newBet = room.getCurrentBet() + amount;

        // Place raise
        currentPlayer.setChips(currentPlayer.getChips() - newBet);
        room.getBets().put(playerId, newBet);
        room.setCurrentBet(newBet);

        // Update player's last action
        currentPlayer.setLastAction("RAISE");
        currentPlayer.setLastActionAmount(amount);

        // Move to next player
        room.moveToNextPlayer();

        // Check if round is complete
        checkRoundCompletion(room);
    }

    private void handleFold(GameRoom room, String playerId) {
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
        checkGameEnd(room);
    }

    private void checkRoundCompletion(GameRoom room) {
        // Don't process if we're waiting for cards
        if (room.isWaitingForCards()) {
            return;
        }

        boolean roundComplete = isRoundComplete(room);

        if (roundComplete) {
            // Add LOG action
            GameAction logAction = GameAction.builder()
                    .type(GameAction.ActionType.LOG)
                    .message("Betting round complete in state: " + room.getGameState())
                    .timestamp(LocalDateTime.now())
                    .build();
            room.getActions().add(logAction);

            // Collect bets to pot
            for (Integer bet : room.getBets().values()) {
                room.setPot(room.getPot() + bet);
            }
            room.setBets(new HashMap<>());
            room.setCurrentBet(0);

            // Move to next stage based on current state
            switch (room.getGameState()) {
                case PREFLOP:
                    advanceToNextStage(room, GameRoom.GameState.FLOP, "Moving to FLOP stage. Waiting for flop cards.");
                    break;
                case FLOP:
                    advanceToNextStage(room, GameRoom.GameState.TURN, "Moving to TURN stage. Waiting for turn card.");
                    break;
                case TURN:
                    advanceToNextStage(room, GameRoom.GameState.RIVER, "Moving to RIVER stage. Waiting for river card.");
                    break;
                case RIVER:
                    advanceToNextStage(room, GameRoom.GameState.SHOWDOWN, "Moving to SHOWDOWN stage. Determining winner.");
                    // Handle showdown
                    handleShowdown(room);
                    break;
                case SHOWDOWN:
                    advanceToNextStage(room, GameRoom.GameState.ENDED, "Hand complete. Waiting for dealer to start new hand.");
                    break;
            }
        }
    }

    private void advanceToNextStage(GameRoom room, GameRoom.GameState nextState, String message) {
        room.setGameState(nextState);

        if (nextState != GameRoom.GameState.SHOWDOWN && nextState != GameRoom.GameState.ENDED) {
            room.setWaitingForCards(true);
        }

        // Log state change
        GameAction stateChangeAction = GameAction.builder()
                .type(GameAction.ActionType.LOG)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(stateChangeAction);

        // Always reset the current player to the first active player after dealer
        if (nextState != GameRoom.GameState.SHOWDOWN && nextState != GameRoom.GameState.ENDED) {
            // Find the first active player after the dealer
            int startPos = (room.getDealerPosition() + 1) % room.getPlayers().size();
            for (int i = 0; i < room.getPlayers().size(); i++) {
                int pos = (startPos + i) % room.getPlayers().size();
                if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                    room.setCurrentPlayerIndex(pos);
                    break;
                }
            }
        }
    }

    private void handleShowdown(GameRoom room) {
        List<Player> activePlayers = room.getPlayers().stream()
                .filter(p -> p.isActive() && !p.isFolded())
                .collect(Collectors.toList());

        if (activePlayers.isEmpty()) {
            // No active players (shouldn't happen), log the issue
            GameAction errorAction = GameAction.builder()
                    .type(GameAction.ActionType.LOG)
                    .message("Error: No active players at showdown!")
                    .timestamp(LocalDateTime.now())
                    .build();
            room.getActions().add(errorAction);
            return;
        }

        // Evaluate all hands
        StringBuilder handReveal = new StringBuilder("SHOWDOWN - Revealing hands:\n");

        // Map to store player's hand evaluation
        Map<String, HandRanking> handRankings = new HashMap<>();

        for (Player player : activePlayers) {
            // Evaluate hand
            HandRanking handRanking = PokerHandEvaluator.evaluateHand(player, room.getCommunityCards());
            handRankings.put(player.getId(), handRanking);

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
        GameAction revealAction = GameAction.builder()
                .type(GameAction.ActionType.LOG)
                .message(handReveal.toString())
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(revealAction);

        // Determine winner(s) using proper hand comparison
        List<Player> winners = new ArrayList<>();
        Player bestPlayer = null;
        HandRanking bestHandRanking = null;

        for (Player player : activePlayers) {
            HandRanking handRanking = handRankings.get(player.getId());

            if (bestPlayer == null || bestHandRanking == null) {
                // First player, initialize as best
                bestPlayer = player;
                bestHandRanking = handRanking;
                winners.add(player);
            } else {
                // Compare current player's hand with the best hand so far
                int comparison = PokerHandEvaluator.compareHands(handRanking, bestHandRanking);

                if (comparison > 0) {
                    // Current player has better hand
                    winners.clear();
                    winners.add(player);
                    bestPlayer = player;
                    bestHandRanking = handRanking;
                } else if (comparison == 0) {
                    // Tie - add as a co-winner
                    winners.add(player);
                }
                // If comparison < 0, current player has worse hand, so ignore
            }
        }

        // Split pot among winners
        int winAmount = room.getPot() / winners.size();
        StringBuilder winMessage = new StringBuilder();

        for (Player winner : winners) {
            winner.setChips(winner.getChips() + winAmount);
            winMessage.append(winner.getName()).append(" wins ").append(winAmount).append(" chips with ").append(winner.getHandRanking()).append(". ");
        }

        // Log the winner
        GameAction winnerAction = GameAction.builder()
                .type(GameAction.ActionType.LOG)
                .message("SHOWDOWN: " + winMessage.toString())
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(winnerAction);

        // Mark winner IDs in the game state
        room.setWinnerIds(winners.stream().map(Player::getId).collect(Collectors.toList()));

        // Reset the pot
        room.setPot(0);
    }

    private void checkGameEnd(GameRoom room) {
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
            }
        }
    }

    private void notifyRoomUpdate(String gameCode) {
        GameRoom room = gameRooms.get(gameCode);
        if (room != null) {
            messagingTemplate.convertAndSend("/topic/game/" + gameCode, room);
        }
    }

    private boolean isRoundComplete(GameRoom room) {
        if (room.isWaitingForCards()) {
            return false;
        }

        int activePlayers = 0;
        int targetBet = room.getCurrentBet();
        Set<String> actedPlayerIds = new HashSet<>();

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
                bigBlindPos = (room.getDealerPosition() + 1) % 2;
            } else {
                bigBlindPos = (room.getDealerPosition() + 2) % room.getPlayers().size();
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

            activePlayers++;
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