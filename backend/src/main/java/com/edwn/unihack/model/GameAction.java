// backend/src/main/java/com/edwn/unihack/model/GameAction.java
package com.edwn.unihack.model;

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
    private Card card; // For SCAN_CARD actions
    private String message; // For LOG actions

    public enum ActionType {
        JOIN, LEAVE, CHECK, BET, CALL, RAISE, FOLD,
        SCAN_CARD, DEAL_CARDS, START_HAND,
        SMALL_BLIND, BIG_BLIND, LOG // Added new types
    }
}