/**
 * api.ts
 *
 * Secure HTTP client for the Expensify Vercel backend.
 *
 * Security decisions:
 * - HTTPS enforced via production BASE_URL; never plain HTTP in production
 * - JWT tokens are stored exclusively in expo-secure-store (iOS Keychain-backed)
 *   and loaded per-request from the interceptor to pick up token refreshes
 * - On 401, the token is wiped from Keychain so the app re-authenticates
 * - No sensitive data is printed to console in release builds
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Configuration
// Update PRODUCTION_BASE_URL to your deployed Vercel project URL.
// Never use HTTP in production; this must be an HTTPS endpoint.
// ---------------------------------------------------------------------------
export const PRODUCTION_BASE_URL = 'https://expense-tracker-five-zeta-64.vercel.app';

// During local development against a dev server running on your LAN, you may
// temporarily override this in a .env file or environment config. The app
// always falls back to the production URL.
const BASE_URL = PRODUCTION_BASE_URL;

// Keychain key name for the JWT token (stable across app updates)
export const KEYCHAIN_TOKEN_KEY = 'expensify_jwt_token';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ---------------------------------------------------------------------------
// Request interceptor: attach JWT from iOS Keychain on every request
// ---------------------------------------------------------------------------
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await SecureStore.getItemAsync(KEYCHAIN_TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor: handle 401 by clearing the Keychain token
// ---------------------------------------------------------------------------
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Wipe the token from Keychain on authentication failure
            await SecureStore.deleteItemAsync(KEYCHAIN_TOKEN_KEY);
        }
        return Promise.reject(error);
    }
);

export default api;
