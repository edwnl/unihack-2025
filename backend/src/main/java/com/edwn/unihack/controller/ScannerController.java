// backend/src/main/java/com/edwn/unihack/controller/ScannerController.java
package com.edwn.unihack.controller;

import com.edwn.unihack.model.Card;
import com.edwn.unihack.service.GameRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/scanner")
@RequiredArgsConstructor
public class ScannerController {

    private final GameRoomService gameRoomService;

    @PostMapping("/{gameCode}/scan")
    public ResponseEntity<?> scanCard(@PathVariable String gameCode, @RequestBody Card card) {
        boolean success = gameRoomService.scanCard(gameCode, card);

        if (!success) {
            return ResponseEntity.badRequest().body("Failed to scan card. Game might not exist or not be in a state accepting cards.");
        }

        return ResponseEntity.ok().build();
    }
}