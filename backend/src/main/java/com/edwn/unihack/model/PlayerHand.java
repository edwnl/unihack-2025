// backend/src/main/java/com/edwn/unihack/model/PlayerHand.java
package com.edwn.unihack.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerHand {
    private List<Card> cards;
}