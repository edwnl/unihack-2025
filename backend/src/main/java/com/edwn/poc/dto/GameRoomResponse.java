package com.edwn.unihack.dto;

import com.edwn.unihack.model.GameRoom;
import com.edwn.unihack.model.Player;
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