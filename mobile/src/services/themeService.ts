import AsyncStorage from '@react-native-async-storage/async-storage';
import { DevSettings } from 'react-native';
import { ThemeMode, applyTheme } from '../theme/colors';

const THEME_KEY = 'expensify_theme_mode';

const sanitizeTheme = (value: string | null | undefined): ThemeMode =>
    value === 'dark' ? 'dark' : 'light';

export const themeService = {
    async getTheme(): Promise<ThemeMode> {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        return sanitizeTheme(stored);
    },

    async initializeTheme(): Promise<ThemeMode> {
        const mode = await this.getTheme();
        applyTheme(mode);
        return mode;
    },

    async setTheme(mode: ThemeMode): Promise<void> {
        const normalized = sanitizeTheme(mode);
        await AsyncStorage.setItem(THEME_KEY, normalized);
        applyTheme(normalized);
    },

    async reloadApp(): Promise<void> {
        try {
            DevSettings.reload();
        } catch {
            // Fallback: user can reopen app manually.
        }
    },
};
