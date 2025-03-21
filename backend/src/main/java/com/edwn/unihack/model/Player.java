// backend/src/main/java/com/edwn/unihack/model/Player.java
package com.edwn.unihack.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Player {
    private String id;
    private String name;
    private boolean online;
    private boolean visuallyImpaired;
    private String sessionId;
    private PlayerHand hand;
    private int chips;
    private boolean folded;
    private boolean active;
    private String handRanking;
    private String lastAction;
    private Integer lastActionAmount;
    @Builder.Default
    private boolean fake = false;

    public void newHand() {
        setFolded(false);
        setActive(true);
        setHand(new PlayerHand(new ArrayList<>()));
        setLastAction("");
        setHandRanking(null);
    }
}