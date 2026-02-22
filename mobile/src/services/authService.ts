import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { AuthResponse, User } from './models';

export const authService = {
    async login(email: string, password: string): Promise<User | null> {
        try {
            const response = await api.post<AuthResponse>('/api/auth/login', { email, password });
            const data = response.data;
            if (data && data.token) {
                await AsyncStorage.setItem('token', data.token);
                const user: User = {
                    name: data.name,
                    email: data.email,
                    avatar: data.avatarUrl,
                    bankAccounts: [],
                };
                await AsyncStorage.setItem('currentUser', JSON.stringify(user));
                return user;
            }
            return null;
        } catch (error: any) {
            console.error('Login error:', error?.response?.data || error?.message);
            throw error;
        }
    },

    async register(name: string, email: string, password: string): Promise<User | null> {
        try {
            const response = await api.post<AuthResponse>('/api/auth/register', { name, email, password });
            const data = response.data;
            if (data && data.token) {
                await AsyncStorage.setItem('token', data.token);
                const user: User = {
                    name: data.name,
                    email: data.email,
                    avatar: data.avatarUrl,
                    bankAccounts: [],
                };
                await AsyncStorage.setItem('currentUser', JSON.stringify(user));
                return user;
            }
            return null;
        } catch (error: any) {
            console.error('Register error:', error?.response?.data || error?.message);
            throw error;
        }
    },

    async logout(): Promise<void> {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('currentUser');
    },

    async getCurrentUser(): Promise<User | null> {
        try {
            const saved = await AsyncStorage.getItem('currentUser');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    },

    async isLoggedIn(): Promise<boolean> {
        const token = await AsyncStorage.getItem('token');
        return !!token;
    },

    async updateUserInfo(updates: Partial<User>): Promise<void> {
        const savedStr = await AsyncStorage.getItem('currentUser');
        if (savedStr) {
            const user = JSON.parse(savedStr);
            const updated = { ...user, ...updates };
            await AsyncStorage.setItem('currentUser', JSON.stringify(updated));
        }
    },
};
