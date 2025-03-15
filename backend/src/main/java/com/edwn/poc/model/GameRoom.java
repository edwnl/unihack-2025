package com.edwn.poc.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    public static GameRoom createNew() {
        return GameRoom.builder()
                .id(generateGameCode())
                .players(new ArrayList<>())
                .communityCards(new ArrayList<>())
                .actions(new ArrayList<>())
                .gameState(GameState.WAITING)
                .pot(0)
                .build();
    }

    private static String generateGameCode() {
        return UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    public enum GameState {
        WAITING, STARTED, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN, ENDED
    }
}