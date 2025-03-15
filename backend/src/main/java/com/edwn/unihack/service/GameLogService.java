// backend/src/main/java/com/edwn/unihack/service/GameLogService.java
package com.edwn.unihack.service;

import com.edwn.unihack.model.GameAction;
import com.edwn.unihack.model.GameRoom;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class GameLogService {

    public void addLogAction(GameRoom room, String message) {
        GameAction logAction = GameAction.builder()
                .type(GameAction.ActionType.LOG)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(logAction);
    }

    public void addLogAction(GameRoom room, String message, String playerId, String playerName) {
        GameAction logAction = GameAction.builder()
                .type(GameAction.ActionType.LOG)
                .message(message)
                .playerId(playerId)
                .playerName(playerName)
                .timestamp(LocalDateTime.now())
                .build();
        room.getActions().add(logAction);
    }
}