package com.edwn.unihack.config;

import com.edwn.unihack.util.eval.Card;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class PokerEvaluatorInitializer {

    @EventListener(ApplicationReadyEvent.class)
    public void initializePokerEvaluator() {
        Thread initThread = new Thread(() -> {
            try {
                System.out.println("Starting async initialization of poker evaluation classes...");
                long startTime = System.currentTimeMillis();

                // Force initialization of the Tables class
                Class.forName("com.edwn.unihack.util.eval.Tables");

                // Create a dummy card to ensure Card class is fully initialized
                new Card(Card.ACE, Card.SPADES);

                long endTime = System.currentTimeMillis();
                System.out.println("Poker evaluation classes initialized in " + (endTime - startTime) + "ms");
            } catch (Exception e) {
                System.err.println("Failed to preload poker evaluation classes: " + e.getMessage());
            }
        });

        initThread.setDaemon(true);
        initThread.setName("Poker-Evaluator-Initializer");
        initThread.start();
    }
}