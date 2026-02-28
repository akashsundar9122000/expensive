import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { authService } from '../services/authService';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }
        setLoading(true);
        try {
            const user = await authService.login(email.trim(), password);
            if (user) {
                navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
            } else {
                Alert.alert('Error', 'Invalid credentials');
            }
        } catch (error: any) {
            const timedOut = error?.code === 'ECONNABORTED';
            const networkError = String(error?.message || '').toLowerCase().includes('network');
            Alert.alert(
                'Login Failed',
                error?.response?.data?.error ||
                (timedOut || networkError
                    ? 'Unable to reach server. Please check internet and try again.'
                    : 'Invalid email or password')
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
            <LinearGradient
                colors={['#0A0E27', '#111638', '#1A1F4A']}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    {/* Logo / Title */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={Colors.gradientPrimary as any}
                                style={styles.logoBg}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="wallet" size={36} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.title}>Expensify</Text>
                        <Text style={styles.subtitle}>Track your expenses smartly</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email address"
                                placeholderTextColor={Colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor={Colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Colors.gradientPrimary as any}
                                style={styles.loginBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.loginBtnText}>Sign In</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.signupLink}
                            onPress={() => navigation.navigate('Signup')}
                        >
                            <Text style={styles.signupText}>
                                Don't have an account? <Text style={styles.signupHighlight}>Sign Up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoContainer: { marginBottom: 16 },
    logoBg: {
        width: 72,
        height: 72,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.glow,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: Colors.textPrimary,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textSecondary,
        marginTop: 6,
    },
    form: { width: '100%' },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: { marginRight: 12 },
    input: {
        flex: 1,
        color: Colors.textPrimary,
        fontSize: 16,
    },
    eyeBtn: { padding: 4 },
    loginBtn: {
        marginTop: 8,
        borderRadius: 14,
        overflow: 'hidden',
        ...Shadows.medium,
    },
    loginBtnDisabled: { opacity: 0.7 },
    loginBtnGradient: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    },
    loginBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    signupLink: {
        alignItems: 'center',
        marginTop: 24,
    },
    signupText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    signupHighlight: {
        color: Colors.primary,
        fontWeight: '600',
    },
});
