package com.expensify.backend.service;

import com.expensify.backend.dto.AuthenticationRequest;
import com.expensify.backend.dto.AuthenticationResponse;
import com.expensify.backend.dto.RegisterRequest;
import com.expensify.backend.model.User;
import com.expensify.backend.model.UserPreference;
import com.expensify.backend.repository.UserPreferenceRepository;
import com.expensify.backend.repository.UserRepository;
import com.expensify.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class AuthService {
        private final UserRepository userRepository;
        private final UserPreferenceRepository userPreferenceRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;

        public AuthenticationResponse register(RegisterRequest request) {
                var user = User.builder()
                                .name(request.getName())
                                .email(request.getEmail())
                                .password(passwordEncoder.encode(request.getPassword()))
                                .build();
                userRepository.save(user);

                var preferences = UserPreference.builder()
                                .user(user)
                                .goalName("Savings Goal")
                                .goalRequired(new BigDecimal("100000"))
                                .goalCollected(BigDecimal.ZERO)
                                .totalInvestment(BigDecimal.ZERO)
                                .investAmount(BigDecimal.ZERO)
                                .build();
                userPreferenceRepository.save(preferences);

                var jwtToken = jwtService.generateToken(new org.springframework.security.core.userdetails.User(
                                user.getEmail(), user.getPassword(), new ArrayList<>()));
                return AuthenticationResponse.builder()
                                .token(jwtToken)
                                .name(user.getName())
                                .email(user.getEmail())
                                .build();
        }

        public AuthenticationResponse authenticate(AuthenticationRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.getEmail(),
                                                request.getPassword()));
                var user = userRepository.findByEmail(request.getEmail())
                                .orElseThrow();
                var jwtToken = jwtService.generateToken(new org.springframework.security.core.userdetails.User(
                                user.getEmail(), user.getPassword(), new ArrayList<>()));
                return AuthenticationResponse.builder()
                                .token(jwtToken)
                                .name(user.getName())
                                .email(user.getEmail())
                                .avatarUrl(user.getAvatarUrl())
                                .build();
        }

        public void updateProfile(String email, String name, String avatarUrl) {
                var user = userRepository.findByEmail(email).orElseThrow();
                if (name != null)
                        user.setName(name);
                if (avatarUrl != null)
                        user.setAvatarUrl(avatarUrl);
                userRepository.save(user);
        }
}
