package com.edwn.unihack.service;

import com.edwn.unihack.model.GameRoom;
import com.edwn.unihack.model.Player;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameRoomService {
    private final Map<String, GameRoom> gameRooms = new ConcurrentHashMap<>();

    public GameRoom createRoom() {
        GameRoom room = GameRoom.createNew();
        gameRooms.put(room.getId(), room);
        return room;
    }

    public Optional<GameRoom> findRoomByCode(String code) {
        return Optional.ofNullable(gameRooms.get(code));
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

        room.setGameState(GameRoom.GameState.STARTED);
        // Initialize game logic here
        return true;
    }
}