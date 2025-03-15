package com.edwn.poc.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameAction {
    private String playerId;
    private String playerName;
    private ActionType type;
    private int amount;
    private LocalDateTime timestamp;

    public enum ActionType {
        JOIN, LEAVE, CHECK, BET, CALL, RAISE, FOLD, SCAN_CARD
    }
}