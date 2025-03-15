package com.edwn.poc.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}