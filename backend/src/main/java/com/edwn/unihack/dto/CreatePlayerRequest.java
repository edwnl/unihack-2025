// backend/src/main/java/com/edwn/unihack/dto/CreatePlayerRequest.java
package com.edwn.unihack.dto;

import lombok.Data;

@Data
public class CreatePlayerRequest {
    private String name;
    private String gameCode;
    private boolean online;
    private boolean visuallyImpaired;
}