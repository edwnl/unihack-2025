// backend/src/main/java/com/edwn/unihack/service/GameRoomService.java (refactored)
package com.edwn.unihack.service;

import com.edwn.unihack.model.Card;
import com.edwn.unihack.model.GameAction;
import com.edwn.unihack.model.GameRoom;
import com.edwn.unihack.model.Player;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameRoomService {
    private final Map<String, GameRoom> gameRooms = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate messagingTemplate;
    private final GameStateService gameStateService;
    private final CardHandlingService cardHandlingService;
    private final BettingService bettingService;
    private final GameLogService gameLogService;

    public GameRoomService(SimpMessagingTemplate messagingTemplate,
                           GameStateService gameStateService,
                           CardHandlingService cardHandlingService,
                           BettingService bettingService,
                           GameLogService gameLogService) {
        this.messagingTemplate = messagingTemplate;
        this.gameStateService = gameStateService;
        this.cardHandlingService = cardHandlingService;
        this.bettingService = bettingService;
        this.gameLogService = gameLogService;
    }

    public GameRoom createRoom() {
        GameRoom room = GameRoom.createNew();
        gameRooms.put(room.getId(), room);
        return room;
    }

    public Optional<GameRoom> findRoomByCode(String code) {
        return Optional.ofNullable(gameRooms.get(code));
    }

    public boolean scanCard(String gameCode, Card card) {
        GameRoom room = gameRooms.get(gameCode);
        if (room == null) {
            return false;
        }

        // Create a SCAN_CARD action
        GameAction scanAction = GameAction.builder()
                .type(GameAction.ActionType.SCAN_CARD)
                .card(card)
                .timestamp(LocalDateTime.now())
                .build();

        // Process the card scan
        processAction(gameCode, scanAction);
        return true;
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
        gameStateService.startNewHand(room);
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
            gameLogService.addLogAction(room, "ERROR: Player action '" + action.getType() +
                    "' attempted while waiting for cards. Action ignored.");

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
                cardHandlingService.handleCardScan(room, action.getCard());
                break;
            case CHECK:
                bettingService.handleCheck(room, action.getPlayerId());
                break;
            case BET:
                bettingService.handleBet(room, action.getPlayerId(), action.getAmount());
                break;
            case CALL:
                bettingService.handleCall(room, action.getPlayerId());
                break;
            case RAISE:
                bettingService.handleRaise(room, action.getPlayerId(), action.getAmount());
                break;
            case FOLD:
                bettingService.handleFold(room, action.getPlayerId());
                break;
            case START_HAND:
                startNewHand(room);
                break;
        }

        // Notify all clients about the update
        notifyRoomUpdate(gameCode);
    }

    private void notifyRoomUpdate(String gameCode) {
        GameRoom room = gameRooms.get(gameCode);
        if (room != null) {
            messagingTemplate.convertAndSend("/topic/game/" + gameCode, room);
        }
    }

    public Player addFakePlayerToRoom(String gameCode, String name) {
        GameRoom room = gameRooms.get(gameCode);
        if (room == null || room.getPlayers().size() >= 5) { 
            return null;
        }
    
        Player player = Player.builder()
                .id(UUID.randomUUID().toString())
                .name(name)
                .online(false)
                .visuallyImpaired(false)
                .chips(1000) // Starting chips
                .active(true)
                .folded(false)
                .fake(true)  // This is a fake player
                .build();
    
        room.getPlayers().add(player);
        
        // Create a JOIN action
        GameAction joinAction = GameAction.builder()
                .playerId(player.getId())
                .playerName(player.getName())
                .type(GameAction.ActionType.JOIN)
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(joinAction);
        
        // Add a LOG action
        gameLogService.addLogAction(room, "Fake player '" + name + "' added to the game");
        
        // Notify all clients about the update
        notifyRoomUpdate(gameCode);
        
        return player;
    }
}