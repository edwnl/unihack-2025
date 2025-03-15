// backend/src/main/java/com/edwn/unihack/service/CardHandlingService.java
package com.edwn.unihack.service;

import com.edwn.unihack.model.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;

@Service
public class CardHandlingService {

    private final GameLogService gameLogService;

    public CardHandlingService(GameLogService gameLogService) {
        this.gameLogService = gameLogService;
    }

    public void handleCardScan(GameRoom room, Card card) {
        if (card == null) return;

        // Log the card scan
        gameLogService.addLogAction(room, "Card scanned: " + card.getRank() + " of " + card.getSuit() + " in state: " + room.getGameState() + ", waiting for cards: " + room.isWaitingForCards());

        // Only process card scans when we're waiting for cards
        if (!room.isWaitingForCards()) {
            gameLogService.addLogAction(room, "ERROR: Card scanned while not waiting for cards. Current state: " + room.getGameState());
            return;
        }

        // Process the card based on the current game state
        switch (room.getGameState()) {
            case PREFLOP:
                handlePreflopCardScan(room, card);
                break;
            case FLOP:
                handleFlopCardScan(room, card);
                break;
            case TURN:
                handleTurnCardScan(room, card);
                break;
            case RIVER:
                handleRiverCardScan(room, card);
                break;
        }
    }

    private void handlePreflopCardScan(GameRoom room, Card card) {
        // Assign card to a player
        assignCardToNextPlayer(room, card);
        updatePlayerHandRankings(room);

        // Check if all players have their cards
        boolean allPlayersHaveCards = true;
        for (Player player : room.getPlayers()) {
            if (!player.isActive() || player.isFolded()) continue;

            if (player.getHand() == null || player.getHand().getCards().size() < 2) {
                allPlayersHaveCards = false;
                break;
            }
        }

        // If all players have their cards, start preflop betting
        if (allPlayersHaveCards) {
            // No longer waiting for cards
            room.setWaitingForCards(false);

            // In a 3+ player game, action starts with UTG (first player left of BB)
            int bigBlindPos = (room.getSmallBlindPosition() + 1) % room.getPlayers().size();
            int startPos = (bigBlindPos + 1) % room.getPlayers().size();

            // Find the first active player from UTG
            for (int i = 0; i < room.getPlayers().size(); i++) {
                int pos = (startPos + i) % room.getPlayers().size();
                if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                    room.setCurrentPlayerIndex(pos);
                    break;
                }
            }

            gameLogService.addLogAction(room, "All players have cards. Pre-flop betting begins. UTG to act first.");
        }
    }

    private void handleFlopCardScan(GameRoom room, Card card) {
        // Add to community cards
        room.getCommunityCards().add(card);
        updatePlayerHandRankings(room);

        // Log the flop development
        gameLogService.addLogAction(room, "Flop card " + room.getCommunityCards().size() + "/3: " + card.getRank() + " of " + card.getSuit());

        // If we have 3 community cards, start flop betting
        if (room.getCommunityCards().size() == 3) {
            // No longer waiting for cards
            room.setWaitingForCards(false);
            updatePlayerHandRankings(room);

            // Reset bets for the new round
            room.setBets(new HashMap<>());
            room.setCurrentBet(0);

            // Set first active player after the small blind
            int startPos = room.getSmallBlindPosition();
            for (int i = 0; i < room.getPlayers().size(); i++) {
                int pos = (startPos + i) % room.getPlayers().size();
                if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                    room.setCurrentPlayerIndex(pos);
                    break;
                }
            }

            gameLogService.addLogAction(room, "Flop complete. Flop betting begins.");
        }
    }

    private void handleTurnCardScan(GameRoom room, Card card) {
        // Add to community cards
        room.getCommunityCards().add(card);
        updatePlayerHandRankings(room);

        // No longer waiting for cards after the turn card is dealt
        room.setWaitingForCards(false);

        // Log the turn card
        gameLogService.addLogAction(room, "Turn card: " + card.getRank() + " of " + card.getSuit());

        // Reset bets for the new round
        room.setBets(new HashMap<>());
        room.setCurrentBet(0);

        // Set first active player to small blind
        int turnStartPos = room.getSmallBlindPosition();
        for (int i = 0; i < room.getPlayers().size(); i++) {
            int pos = (turnStartPos + i) % room.getPlayers().size();
            if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                room.setCurrentPlayerIndex(pos);
                break;
            }
        }

        // Log betting begins
        gameLogService.addLogAction(room, "Turn betting begins.");
    }

    private void handleRiverCardScan(GameRoom room, Card card) {
        // Add to community cards
        room.getCommunityCards().add(card);
        updatePlayerHandRankings(room);

        // No longer waiting for cards after the river card is dealt
        room.setWaitingForCards(false);

        // Log the river card
        gameLogService.addLogAction(room, "River card: " + card.getRank() + " of " + card.getSuit());

        // Reset bets for the new round
        room.setBets(new HashMap<>());
        room.setCurrentBet(0);

        // Set first active player to small blind
        int riverStartPos = room.getSmallBlindPosition();
        for (int i = 0; i < room.getPlayers().size(); i++) {
            int pos = (riverStartPos + i) % room.getPlayers().size();
            if (!room.getPlayers().get(pos).isFolded() && room.getPlayers().get(pos).isActive()) {
                room.setCurrentPlayerIndex(pos);
                break;
            }
        }

        // Log betting begins
        gameLogService.addLogAction(room, "River betting begins.");
    }

    private void assignCardToNextPlayer(GameRoom room, Card card) {
        int nextPlayerIndex = room.getNextCardRecipientIndex();
        Player nextPlayer = room.getPlayers().get(nextPlayerIndex);

        // Initialize hand if null
        if (nextPlayer.getHand() == null) {
            nextPlayer.setHand(new PlayerHand(new ArrayList<>()));
        }

        // Add card to player's hand
        nextPlayer.getHand().getCards().add(card);
        gameLogService.addLogAction(room, "Card dealt to " + nextPlayer.getName() + ": " + card.getRank() + " of " + card.getSuit());

        // Update the next player index for the next card (move clockwise)
        room.setNextCardRecipientIndex((nextPlayerIndex + 1) % room.getPlayers().size());
    }

    public void updatePlayerHandRankings(GameRoom room) {
        // Only evaluate hands if we have at least one community card
        if (room.getCommunityCards() == null || room.getCommunityCards().isEmpty()) {
            return;
        }

        // Evaluate each active player's hand
        for (Player player : room.getPlayers()) {
            if (player.isActive() && !player.isFolded() && player.getHand() != null && player.getHand().getCards() != null) {
                HandRanking handRanking = PokerHandEvaluator.evaluateHand(player, room.getCommunityCards());
                player.setHandRanking(handRanking.getDescription());
            }
        }
    }
}