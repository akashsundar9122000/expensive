package com.expensify.backend.dto;

import lombok.Data;

@Data
public class DeleteAccountRequest {
    private String password;
}