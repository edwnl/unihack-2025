package com.edwn.unihack.util.eval;

public class Main {
    public static void main(String[] args) {
        Card[] sevenHand = {
            new Card(Card.KING, Card.CLUBS),
            new Card(Card.QUEEN, Card.CLUBS),
            new Card(Card.JACK, Card.CLUBS),
            new Card(Card.TEN, Card.CLUBS),
            new Card(Card.NINE, Card.CLUBS),
            new Card(Card.EIGHT, Card.CLUBS),
            new Card(Card.ACE, Card.CLUBS)
        };
        
        Evaluate evaluator = new Evaluate(sevenHand);
        evaluator.printCard();
    }
}
