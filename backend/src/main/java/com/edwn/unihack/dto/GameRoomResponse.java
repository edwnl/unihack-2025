// backend/src/main/java/com/edwn/unihack/dto/GameRoomResponse.java
package com.edwn.unihack.dto;

import com.edwn.unihack.model.Card;
import com.edwn.unihack.model.GameAction;
import com.edwn.unihack.model.GameRoom;
import com.edwn.unihack.model.Player;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameRoomResponse {
    private String id;
    private List<Player> players;
    private GameRoom.GameState gameState;
    private boolean waitingForCards;
    private List<Card> communityCards;
    private int currentPlayerIndex;
    private int pot;
    private List<GameAction> actions;
    private Map<String, Integer> bets;
    private int currentBet;
    private int smallBlindPosition;
    private String dealerId;
    private List<String> winnerIds;
}