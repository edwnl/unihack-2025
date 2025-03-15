package com.edwn.poc.dto;

import lombok.Data;

@Data
public class CreatePlayerRequest {
    private String name;
    private String gameCode;
    private boolean online;
    private boolean visuallyImpaired;
}