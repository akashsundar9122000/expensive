package com.expensify.backend.service;

import com.expensify.backend.dto.AuthenticationRequest;
import com.expensify.backend.dto.AuthenticationResponse;
import com.expensify.backend.dto.ForgotPasswordRequest;
import com.expensify.backend.dto.GoogleLoginRequest;
import com.expensify.backend.dto.RegisterRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.expensify.backend.model.User;
import com.expensify.backend.model.UserPreference;
import com.expensify.backend.repository.BankAccountRepository;
import com.expensify.backend.repository.BudgetRepository;
import com.expensify.backend.repository.InvestmentRepository;
import com.expensify.backend.repository.SubscriptionRepository;
import com.expensify.backend.repository.TransactionRepository;
import com.expensify.backend.repository.UserPreferenceRepository;
import com.expensify.backend.repository.UserRepository;
import com.expensify.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
        private final UserRepository userRepository;
        private final UserPreferenceRepository userPreferenceRepository;
        private final TransactionRepository transactionRepository;
        private final BankAccountRepository bankAccountRepository;
        private final SubscriptionRepository subscriptionRepository;
        private final InvestmentRepository investmentRepository;
        private final BudgetRepository budgetRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;
        private final ObjectMapper objectMapper = new ObjectMapper();
        private final HttpClient httpClient = HttpClient.newHttpClient();

        public AuthenticationResponse register(RegisterRequest request) {
                String email = normalizeEmail(request.getEmail());
                var user = User.builder()
                                .name(request.getName() != null ? request.getName().trim() : null)
                                .email(email)
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
                                email, user.getPassword(), new ArrayList<>()));
                return AuthenticationResponse.builder()
                                .token(jwtToken)
                                .name(user.getName())
                                .email(email)
                                .build();
        }

        public AuthenticationResponse authenticate(AuthenticationRequest request) {
                String email = normalizeEmail(request.getEmail());
                String rawPassword = request.getPassword();

                try {
                        authenticationManager.authenticate(
                                        new UsernamePasswordAuthenticationToken(email, rawPassword));
                } catch (BadCredentialsException ex) {
                        var legacyUser = userRepository.findByEmailIgnoreCase(email).orElseThrow(() -> ex);
                        if (!isBcryptHash(legacyUser.getPassword()) && legacyUser.getPassword().equals(rawPassword)) {
                                legacyUser.setPassword(passwordEncoder.encode(rawPassword));
                                userRepository.save(legacyUser);
                        } else {
                                throw ex;
                        }
                }

                var user = userRepository.findByEmailIgnoreCase(email)
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

        public AuthenticationResponse authenticateWithGoogle(GoogleLoginRequest request) {
                if (request == null || request.getIdToken() == null || request.getIdToken().isBlank()) {
                        throw new IllegalArgumentException("Invalid Google token");
                }

                JsonNode tokenPayload = getGoogleTokenPayload(request.getIdToken().trim());
                String email = normalizeEmail(tokenPayload.path("email").asText(null));
                if (email == null || email.isBlank()) {
                        throw new IllegalArgumentException("Google account email is missing");
                }

                String name = tokenPayload.path("name").asText(deriveNameFromEmail(email));
                String avatarUrl = tokenPayload.path("picture").asText(null);

                User user = userRepository.findByEmailIgnoreCase(email)
                                .orElseGet(() -> createGoogleUser(email, name, avatarUrl));

                if ((user.getName() == null || user.getName().isBlank()) && name != null && !name.isBlank()) {
                        user.setName(name);
                }
                if (avatarUrl != null && !avatarUrl.isBlank()) {
                        user.setAvatarUrl(avatarUrl);
                }
                userRepository.save(user);

                var jwtToken = jwtService.generateToken(new org.springframework.security.core.userdetails.User(
                                user.getEmail(), user.getPassword(), new ArrayList<>()));

                return AuthenticationResponse.builder()
                                .token(jwtToken)
                                .name(user.getName())
                                .email(user.getEmail())
                                .avatarUrl(user.getAvatarUrl())
                                .build();
        }

        public void forgotPassword(ForgotPasswordRequest request) {
                if (request == null) {
                        throw new IllegalArgumentException("Invalid request");
                }

                String email = normalizeEmail(request.getEmail());
                String newPassword = request.getNewPassword();

                if (email == null || email.isBlank() || newPassword == null || newPassword.trim().length() < 6) {
                        throw new IllegalArgumentException("Email and valid new password are required");
                }

                userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
                        user.setPassword(passwordEncoder.encode(newPassword.trim()));
                        userRepository.save(user);
                });
        }

        private String normalizeEmail(String email) {
                if (email == null) {
                        return null;
                }
                return email.trim().toLowerCase();
        }

        private JsonNode getGoogleTokenPayload(String idToken) {
                try {
                        String encodedToken = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
                        HttpRequest request = HttpRequest.newBuilder()
                                        .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodedToken))
                                        .GET()
                                        .build();

                        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                        if (response.statusCode() != 200) {
                                throw new IllegalArgumentException("Google token verification failed");
                        }

                        return objectMapper.readTree(response.body());
                } catch (IOException | InterruptedException ex) {
                        if (ex instanceof InterruptedException) {
                                Thread.currentThread().interrupt();
                        }
                        throw new IllegalArgumentException("Unable to verify Google token", ex);
                }
        }

        private User createGoogleUser(String email, String name, String avatarUrl) {
                var user = User.builder()
                                .email(email)
                                .name(name != null && !name.isBlank() ? name : deriveNameFromEmail(email))
                                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                                .avatarUrl(avatarUrl)
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

                return user;
        }

        private String deriveNameFromEmail(String email) {
                if (email == null || !email.contains("@")) {
                        return "User";
                }
                String username = email.substring(0, email.indexOf('@')).replace('.', ' ').replace('_', ' ').trim();
                if (username.isBlank()) {
                        return "User";
                }
                return username.substring(0, 1).toUpperCase(Locale.ROOT) + username.substring(1);
        }

        private boolean isBcryptHash(String password) {
                if (password == null) {
                        return false;
                }
                return password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$");
        }

        public void updateProfile(String email, String name, String avatarUrl) {
                var user = userRepository.findByEmail(email).orElseThrow();
                if (name != null)
                        user.setName(name);
                if (avatarUrl != null)
                        user.setAvatarUrl(avatarUrl);
                userRepository.save(user);
        }

        @Transactional
        public void deleteAccount(String email, String currentPassword) {
                if (currentPassword == null || currentPassword.isBlank()) {
                        throw new IllegalArgumentException("Current password is required");
                }

                var user = userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new IllegalArgumentException("User not found"));

                if (!matchesCurrentPassword(currentPassword, user.getPassword())) {
                        throw new IllegalArgumentException("Incorrect current password");
                }

                transactionRepository.deleteByUser(user);
                bankAccountRepository.deleteByUser(user);
                subscriptionRepository.deleteByUser(user);
                investmentRepository.deleteByUser(user);
                budgetRepository.deleteByUser(user);
                userPreferenceRepository.deleteById(user.getId());
                userRepository.delete(user);
        }

        private boolean matchesCurrentPassword(String rawPassword, String storedPassword) {
                if (storedPassword == null) {
                        return false;
                }

                if (isBcryptHash(storedPassword)) {
                        return passwordEncoder.matches(rawPassword, storedPassword);
                }

                return storedPassword.equals(rawPassword);
        }
}
