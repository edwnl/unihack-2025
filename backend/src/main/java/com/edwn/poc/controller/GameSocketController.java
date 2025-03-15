package com.edwn.poc.controller;

import com.edwn.poc.dto.GameRoomResponse;
import com.edwn.poc.model.GameAction;
import com.edwn.poc.model.GameRoom;
import com.edwn.poc.service.GameRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
@RequiredArgsConstructor
public class GameSocketController {

    private final GameRoomService gameRoomService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/game/{gameCode}/join")
    @SendTo("/topic/game/{gameCode}")
    public GameRoomResponse joinGame(@DestinationVariable String gameCode) {
        return gameRoomService.findRoomByCode(gameCode)
                .map(room -> GameRoomResponse.builder()
                        .id(room.getId())
                        .players(room.getPlayers())
                        .gameState(room.getGameState())
                        .build())
                .orElse(null);
    }

    @MessageMapping("/game/{gameCode}/action")
    public void processGameAction(@DestinationVariable String gameCode, GameAction action) {
        gameRoomService.findRoomByCode(gameCode).ifPresent(room -> {
            action.setTimestamp(LocalDateTime.now());
            room.getActions().add(action);

            // Process the action based on its type
            // This would update the game state

            // Notify all clients about the updated game state
            messagingTemplate.convertAndSend("/topic/game/" + gameCode,
                    GameRoomResponse.builder()
                            .id(room.getId())
                            .players(room.getPlayers())
                            .gameState(room.getGameState())
                            .build());
        });
    }
}