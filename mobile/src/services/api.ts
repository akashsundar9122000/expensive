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
// Production default points to the active Render backend.
// For local/LAN testing, set EXPO_PUBLIC_API_URL (must be https:// or http://).
// ---------------------------------------------------------------------------
export const PRODUCTION_BASE_URL = 'https://expensive-backend-docker.onrender.com';

const envBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const BASE_URL = (envBaseUrl && /^https?:\/\//i.test(envBaseUrl)
    ? envBaseUrl
    : PRODUCTION_BASE_URL).replace(/\/$/, '');

// Keychain key name for the JWT token (stable across app updates)
export const KEYCHAIN_TOKEN_KEY = 'expensify_jwt_token';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 45000,
    headers: {
        'Accept': 'application/json',
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
        const originalConfig = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        const isNetworkOrTimeout = !error.response && (
            error.code === 'ECONNABORTED' ||
            error.message?.toLowerCase().includes('network')
        );

        // Render/free tiers can cold-start slowly; retry once for transient failures.
        if (isNetworkOrTimeout && originalConfig && !originalConfig._retry) {
            originalConfig._retry = true;
            return api.request(originalConfig);
        }

        if (error.response?.status === 401) {
            // Wipe the token from Keychain on authentication failure
            await SecureStore.deleteItemAsync(KEYCHAIN_TOKEN_KEY);
        }
        return Promise.reject(error);
    }
);

export default api;
