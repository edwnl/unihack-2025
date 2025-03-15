package com.edwn.unihack.dto;

import lombok.Data;

@Data
public class JoinRoomRequest {
    private String gameCode;
    private String role; // PLAYER, DEALER, SCANNER
}