// backend/src/main/java/com/edwn/unihack/controller/GameSocketController.java
package com.edwn.unihack.controller;

import com.edwn.unihack.dto.GameRoomResponse;
import com.edwn.unihack.model.GameAction;
import com.edwn.unihack.service.GameRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class GameSocketController {

    private final GameRoomService gameRoomService;

    @MessageMapping("/game/{gameCode}/join")
    @SendTo("/topic/game/{gameCode}")
    public GameRoomResponse joinGame(@DestinationVariable String gameCode) {
        return gameRoomService.findRoomByCode(gameCode)
                .map(room -> GameRoomResponse.builder()
                        .id(room.getId())
                        .players(room.getPlayers())
                        .gameState(room.getGameState())
                        .waitingForCards(room.isWaitingForCards())
                        .communityCards(room.getCommunityCards())
                        .currentPlayerIndex(room.getCurrentPlayerIndex())
                        .pot(room.getPot())
                        .actions(room.getActions())
                        .bets(room.getBets())
                        .currentBet(room.getCurrentBet())
                        .dealerId(room.getDealerId())
                        .build())
                .orElse(null);
    }

    @MessageMapping("/game/{gameCode}/action")
    public void processGameAction(@DestinationVariable String gameCode, GameAction action) {
        // Process the action
        gameRoomService.processAction(gameCode, action);
    }
}