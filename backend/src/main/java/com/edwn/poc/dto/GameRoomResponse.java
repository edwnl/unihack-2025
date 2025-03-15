package com.edwn.poc.dto;

import com.edwn.poc.model.GameRoom;
import com.edwn.poc.model.Player;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameRoomResponse {
    private String id;
    private List<Player> players;
    private GameRoom.GameState gameState;
}