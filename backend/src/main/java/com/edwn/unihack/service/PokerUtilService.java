// backend/src/main/java/com/edwn/unihack/service/PokerUtilService.java
package com.edwn.unihack.service;

import com.edwn.unihack.model.GameRoom;
import org.springframework.stereotype.Service;

@Service
public class PokerUtilService {

    /**
     * Calculates button position from small blind position
     */
    public int calculateButtonPosition(GameRoom room) {
        if (room.getPlayers().size() <= 1) return 0;

        if (room.getPlayers().size() == 2) {
            return room.getSmallBlindPosition(); // In heads-up, button is the small blind
        } else {
            // In 3+ players, button is one position before small blind
            return (room.getSmallBlindPosition() - 1 + room.getPlayers().size()) % room.getPlayers().size();
        }
    }

    /**
     * Gets the big blind position from small blind position
     */
    public int calculateBigBlindPosition(GameRoom room) {
        if (room.getPlayers().size() <= 1) return 0;
        return (room.getSmallBlindPosition() + 1) % room.getPlayers().size();
    }

    /**
     * Gets dealer position from small blind position
     */
    public int getDealerPosition(GameRoom room) {
        if (room.getPlayers().size() <= 1) return 0;

        // In heads-up, the dealer is the small blind
        if (room.getPlayers().size() == 2) return room.getSmallBlindPosition();

        // Otherwise, dealer is one position before small blind
        return (room.getSmallBlindPosition() - 1 + room.getPlayers().size()) % room.getPlayers().size();
    }

    /**
     * Calculate UTG position (player after big blind)
     */
    public int calculateUTGPosition(GameRoom room) {
        int bigBlindPos = calculateBigBlindPosition(room);
        return (bigBlindPos + 1) % room.getPlayers().size();
    }

    /**
     * Get position name based on the player's position relative to the button
     */
    public String getPositionName(int playerIndex, GameRoom room) {
        if (room.getPlayers().size() < 3) return "";

        int buttonPos = calculateButtonPosition(room);
        int smallBlindPos = room.getSmallBlindPosition();
        int bigBlindPos = calculateBigBlindPosition(room);

        if (playerIndex == buttonPos) return "BTN";
        if (playerIndex == smallBlindPos) return "SB";
        if (playerIndex == bigBlindPos) return "BB";

        // Calculate position relative to button
        int positionFromButton = (playerIndex - buttonPos + room.getPlayers().size()) % room.getPlayers().size();
        int playerCount = room.getPlayers().size();

        switch (positionFromButton) {
            case 3:
                return "UTG";
            case 4:
                return playerCount > 6 ? "UTG+1" : "MP";
            case 5:
                return playerCount > 7 ? "UTG+2" : "MP";
            case 6:
                return "MP";
            case 7:
                return "MP";
            default:
                if (positionFromButton == playerCount - 1)
                    return "CO"; // Cutoff
                else if (positionFromButton == playerCount - 2)
                    return playerCount > 4 ? "HJ" : "MP"; // Hijack
                else
                    return "MP"; // Middle position
        }
    }

    /**
     * Get how many cards we need for the current stage
     */
    public int getRequiredCardCount(GameRoom room) {
        switch (room.getGameState()) {
            case PREFLOP:
                // 2 cards per player
                return room.getPlayers().size() * 2;
            case FLOP:
                // 3 community cards
                return 3;
            case TURN:
            case RIVER:
                // 1 community card each
                return 1;
            default:
                return 0;
        }
    }

    /**
     * Get current scanned card count
     */
    public int getCurrentScannedCardCount(GameRoom room) {
        switch (room.getGameState()) {
            case PREFLOP:
                // Count cards in player hands
                return room.getPlayers().stream()
                        .filter(p -> p.getHand() != null)
                        .mapToInt(p -> p.getHand().getCards().size())
                        .sum();
            case FLOP:
            case TURN:
            case RIVER:
                // Count community cards
                return room.getCommunityCards().size();
            default:
                return 0;
        }
    }
}