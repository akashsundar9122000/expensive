/**
 * authService.ts
 *
 * Handles authentication (login / register / logout / session persistence).
 *
 * Security decisions:
 * - JWT tokens are stored ONLY in expo-secure-store (iOS Keychain-backed,
 *   kSecAttrAccessibleWhenUnlockedThisDeviceOnly semantics).
 * - Non-secret display data (name, email) cached in SecureStore too for
 *   consistency. If you need to persist larger objects in AsyncStorage, ensure
 *   they contain NO credentials or tokens.
 * - Passwords are never stored or logged anywhere in this service.
 * - Console statements carry no sensitive data.
 */

import * as SecureStore from 'expo-secure-store';
import api, { KEYCHAIN_TOKEN_KEY } from './api';
import { AuthResponse, User } from './models';

// Separate key for cached user profile (non-secret, but kept in SecureStore
// to avoid any cross-contamination with AsyncStorage-based libraries)
const KEYCHAIN_USER_KEY = 'expensify_current_user';

export const authService = {
    async login(email: string, password: string): Promise<User> {
        const response = await api.post<AuthResponse>('/api/auth/login', { email, password });
        const data = response.data;

        if (!data?.token) {
            throw new Error('No token received from server');
        }

        // Store token securely in iOS Keychain
        await SecureStore.setItemAsync(KEYCHAIN_TOKEN_KEY, data.token);

        const user: User = {
            name: data.name ?? email,
            email: data.email ?? email,
            avatar: data.avatarUrl ?? undefined,
            bankAccounts: [],
        };

        // Cache non-secret user profile in SecureStore for offline display
        await SecureStore.setItemAsync(KEYCHAIN_USER_KEY, JSON.stringify(user));

        return user;
    },

    async register(name: string, email: string, password: string): Promise<User> {
        const response = await api.post<AuthResponse>('/api/auth/register', { name, email, password });
        const data = response.data;

        if (!data?.token) {
            throw new Error('No token received from server');
        }

        await SecureStore.setItemAsync(KEYCHAIN_TOKEN_KEY, data.token);

        const user: User = {
            name: data.name ?? name,
            email: data.email ?? email,
            avatar: data.avatarUrl ?? undefined,
            bankAccounts: [],
        };

        await SecureStore.setItemAsync(KEYCHAIN_USER_KEY, JSON.stringify(user));

        return user;
    },

    async logout(): Promise<void> {
        // Wipe all Keychain-stored auth material on logout
        await Promise.all([
            SecureStore.deleteItemAsync(KEYCHAIN_TOKEN_KEY),
            SecureStore.deleteItemAsync(KEYCHAIN_USER_KEY),
        ]);
    },

    async getCurrentUser(): Promise<User | null> {
        try {
            const saved = await SecureStore.getItemAsync(KEYCHAIN_USER_KEY);
            if (!saved) return null;
            return JSON.parse(saved) as User;
        } catch {
            // If Keychain read fails (e.g., device in odd state), treat as not logged in
            return null;
        }
    },

    async isLoggedIn(): Promise<boolean> {
        const token = await SecureStore.getItemAsync(KEYCHAIN_TOKEN_KEY);
        return !!token;
    },

    async updateUserCache(updates: Partial<User>): Promise<void> {
        try {
            const saved = await SecureStore.getItemAsync(KEYCHAIN_USER_KEY);
            if (saved) {
                const user = JSON.parse(saved) as User;
                const updated = { ...user, ...updates };
                await SecureStore.setItemAsync(KEYCHAIN_USER_KEY, JSON.stringify(updated));
            }
        } catch {
            // Non-fatal: cache update failure does not break auth state
        }
    },
};
