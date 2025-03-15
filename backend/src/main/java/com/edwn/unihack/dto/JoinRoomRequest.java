// backend/src/main/java/com/edwn/unihack/dto/JoinRoomRequest.java
package com.edwn.unihack.dto;

import lombok.Data;

@Data
public class JoinRoomRequest {
    private String gameCode;
    private String role;
}