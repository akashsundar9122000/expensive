package com.expensify.backend.controller;

import com.expensify.backend.dto.AuthenticationRequest;
import com.expensify.backend.dto.AuthenticationResponse;
import com.expensify.backend.dto.ForgotPasswordRequest;
import com.expensify.backend.dto.GoogleLoginRequest;
import com.expensify.backend.dto.RegisterRequest;
import com.expensify.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService service;

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest request) {
        return ResponseEntity.ok(service.authenticate(request));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthenticationResponse> authenticateWithGoogle(@RequestBody GoogleLoginRequest request) {
        try {
            return ResponseEntity.ok(service.authenticateWithGoogle(request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            service.forgotPassword(request);
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<Void> updateProfile(@RequestBody Map<String, String> updates, Principal principal) {
        service.updateProfile(principal.getName(), updates.get("name"), updates.get("avatarUrl"));
        return ResponseEntity.ok().build();
    }
}
