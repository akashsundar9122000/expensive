export const Colors = {
    // Primary backgrounds
    background: '#0A0E27',
    surface: '#111638',
    surfaceLight: '#1A1F4A',
    card: '#161B45',
    cardElevated: '#1E2456',

    // Accent colors
    primary: '#4A6CF7',
    primaryLight: '#6B8AFF',
    primaryDark: '#3451D1',
    secondary: '#7C3AED',
    secondaryLight: '#A855F7',

    // Status colors
    success: '#10B981',
    successLight: '#34D399',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    danger: '#EF4444',
    dangerLight: '#F87171',

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#A0AEC0',
    textMuted: '#636B83',
    textAccent: '#4A6CF7',

    // Borders
    border: '#1E2456',
    borderLight: '#2A3168',

    // Gradients
    gradientPrimary: ['#4A6CF7', '#7C3AED'],
    gradientSuccess: ['#10B981', '#059669'],
    gradientDanger: ['#EF4444', '#DC2626'],
    gradientWarning: ['#F59E0B', '#D97706'],
    gradientPurple: ['#7C3AED', '#5B21B6'],
    gradientCard: ['rgba(26, 31, 74, 0.8)', 'rgba(22, 27, 69, 0.4)'],

    // Overlay
    overlay: 'rgba(10, 14, 39, 0.7)',
    glass: 'rgba(22, 27, 69, 0.6)',

    // Tab bar
    tabBarBg: '#0F1333',
    tabBarActive: '#4A6CF7',
    tabBarInactive: '#636B83',

    // Category colors
    categoryColors: {
        'Food & Grocery': '#10B981',
        'Shopping': '#4A6CF7',
        'Entertainment': '#F59E0B',
        'Investment': '#7C3AED',
        'Bills': '#EF4444',
        'Transport': '#06B6D4',
    } as Record<string, string>,
};

export const Shadows = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    large: {
        shadowColor: '#4A6CF7',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 12,
    },
    glow: {
        shadowColor: '#4A6CF7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 15,
    },
};
