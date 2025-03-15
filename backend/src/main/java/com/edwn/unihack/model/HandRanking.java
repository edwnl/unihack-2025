// backend/src/main/java/com/edwn/unihack/model/HandRanking.java
package com.edwn.unihack.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HandRanking {
    private int rank; // 0=high card, 1=pair, 2=two pair, 3=three of a kind, 4=straight, etc.
    private int value;
    private String description; // "Pair of Aces", "Full House, Kings over Nines", etc.
}