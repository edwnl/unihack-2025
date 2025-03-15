package com.edwn.poc.controller;

import com.edwn.poc.dto.CreatePlayerRequest;
import com.edwn.poc.dto.GameRoomResponse;
import com.edwn.poc.dto.JoinRoomRequest;
import com.edwn.poc.model.GameRoom;
import com.edwn.poc.model.Player;
import com.edwn.poc.service.GameRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
public class GameRoomController {

    private final GameRoomService gameRoomService;

    @PostMapping("/dealer/create")
    public ResponseEntity<GameRoomResponse> createRoom() {
        GameRoom room = gameRoomService.createRoom();
        String dealerId = UUID.randomUUID().toString();
        gameRoomService.addDealerToRoom(room.getId(), dealerId);

        return ResponseEntity.ok(GameRoomResponse.builder()
                .id(room.getId())
                .players(room.getPlayers())
                .gameState(room.getGameState())
                .build());
    }

    @PostMapping("/player/join")
    public ResponseEntity<?> joinAsPlayer(@RequestBody CreatePlayerRequest request) {
        if (request.getGameCode() == null || request.getName() == null) {
            return ResponseEntity.badRequest().body("Game code and name are required");
        }

        Player player = gameRoomService.addPlayerToRoom(
                request.getGameCode(),
                request.getName(),
                request.isOnline(),
                request.isVisuallyImpaired()
        );

        if (player == null) {
            return ResponseEntity.badRequest().body("Unable to join game. Room might be full or does not exist.");
        }

        return ResponseEntity.ok(player);
    }

    @PostMapping("/scanner/join")
    public ResponseEntity<?> joinAsScanner(@RequestBody JoinRoomRequest request) {
        if (request.getGameCode() == null) {
            return ResponseEntity.badRequest().body("Game code is required");
        }

        String scannerId = UUID.randomUUID().toString();
        boolean success = gameRoomService.addScannerToRoom(request.getGameCode(), scannerId);

        if (!success) {
            return ResponseEntity.badRequest().body("Unable to join game. Room might already have a scanner or does not exist.");
        }

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{gameCode}")
    public ResponseEntity<?> getRoomStatus(@PathVariable String gameCode) {
        return gameRoomService.findRoomByCode(gameCode)
                .map(room -> ResponseEntity.ok(GameRoomResponse.builder()
                        .id(room.getId())
                        .players(room.getPlayers())
                        .gameState(room.getGameState())
                        .build()))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{gameCode}/start")
    public ResponseEntity<?> startGame(@PathVariable String gameCode) {
        boolean started = gameRoomService.startGame(gameCode);

        if (!started) {
            return ResponseEntity.badRequest().body("Unable to start game. Make sure there are players and a dealer.");
        }

        return ResponseEntity.ok().build();
    }
}