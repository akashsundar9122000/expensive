/**
 * SettingsScreen.tsx
 *
 * Profile, bank accounts, savings goal, and logout.
 * Quick-access links to Investments and Subscriptions are also provided here.
 *
 * Security: no tokens or passwords are surfaced in this screen.
 * Logout wipes the Keychain via authService.logout().
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    StatusBar,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { authService } from '../services/authService';
import { expenseService } from '../services/expenseService';
import { User, DashboardStats } from '../services/models';

export default function SettingsScreen({ navigation }: any) {
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [newBankName, setNewBankName] = useState('');
    const [goalName, setGoalName] = useState('');
    const [goalRequired, setGoalRequired] = useState('');
    const [goalCollected, setGoalCollected] = useState('');
    const [addingBank, setAddingBank] = useState(false);
    const [savingGoal, setSavingGoal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [userResult, statsResult] = await Promise.allSettled([
            authService.getCurrentUser(),
            expenseService.getStats(),
        ]);

        if (userResult.status === 'fulfilled') setUser(userResult.value);

        if (statsResult.status === 'fulfilled') {
            const statsData = statsResult.value;
            setStats(statsData);
            if (statsData) {
                setGoalName(statsData.goalName || '');
                setGoalRequired(statsData.goalRequired?.toString() ?? '');
                setGoalCollected(statsData.goalCollected?.toString() ?? '');
            }
        }
    };

    const handleAddBank = async () => {
        const trimmed = newBankName.trim();
        if (!trimmed) {
            Alert.alert('Error', 'Please enter a bank name.');
            return;
        }
        setAddingBank(true);
        try {
            await expenseService.addBank(trimmed);
            setNewBankName('');
            await loadData();
            Alert.alert('Success', 'Bank account added.');
        } catch {
            Alert.alert('Error', 'Failed to add bank account. Please try again.');
        } finally {
            setAddingBank(false);
        }
    };

    const handleSaveGoal = async () => {
        setSavingGoal(true);
        try {
            await expenseService.updatePreferences({
                goalName: goalName || 'Savings Goal',
                goalRequired: parseFloat(goalRequired) || 0,
                goalCollected: parseFloat(goalCollected) || 0,
            });
            Alert.alert('Saved', 'Your savings goal has been updated.');
        } catch {
            Alert.alert('Error', 'Failed to update goal. Please try again.');
        } finally {
            setSavingGoal(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out? Your data will remain on the server.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        // Wipes JWT and user cache from iOS Keychain
                        await authService.logout();
                        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                    },
                },
            ]
        );
    };

    const formatCurrency = (val: number) =>
        '\u20B9' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <LinearGradient
                        colors={Colors.gradientPrimary as any}
                        style={styles.profileGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.avatarBg}>
                            <Ionicons name="person" size={36} color="#FFF" />
                        </View>
                        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
                        {stats && (
                            <View style={styles.profileStats}>
                                <View style={styles.profileStat}>
                                    <Text style={styles.profileStatValue}>{formatCurrency(stats.balance)}</Text>
                                    <Text style={styles.profileStatLabel}>Balance</Text>
                                </View>
                                <View style={styles.profileDivider} />
                                <View style={styles.profileStat}>
                                    <Text style={styles.profileStatValue}>{formatCurrency(stats.totalInvestment)}</Text>
                                    <Text style={styles.profileStatLabel}>Invested</Text>
                                </View>
                            </View>
                        )}
                    </LinearGradient>
                </View>

                {/* Quick Links */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Manage</Text>
                    <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Subscriptions')}>
                        <View style={[styles.linkIcon, { backgroundColor: Colors.secondary + '25' }]}>
                            <Ionicons name="card" size={20} color={Colors.secondary} />
                        </View>
                        <Text style={styles.linkText}>Subscriptions</Text>
                        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Investments')}>
                        <View style={[styles.linkIcon, { backgroundColor: Colors.success + '25' }]}>
                            <Ionicons name="trending-up" size={20} color={Colors.success} />
                        </View>
                        <Text style={styles.linkText}>Investments</Text>
                        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Bank Accounts */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bank Accounts</Text>
                    {stats?.bankBalances && Object.entries(stats.bankBalances).map(([bankName, balance]) => (
                        <View key={bankName} style={styles.bankItem}>
                            <View style={styles.bankIconBg}>
                                <Ionicons name="business" size={20} color={Colors.primary} />
                            </View>
                            <View style={styles.bankDetails}>
                                <Text style={styles.bankName}>{bankName}</Text>
                                <Text style={styles.bankBalance}>{formatCurrency(balance as number)}</Text>
                            </View>
                        </View>
                    ))}

                    <View style={styles.addBankRow}>
                        <View style={styles.addBankInput}>
                            <TextInput
                                style={styles.addBankField}
                                placeholder="Add bank or account name"
                                placeholderTextColor={Colors.textMuted}
                                value={newBankName}
                                onChangeText={setNewBankName}
                                returnKeyType="done"
                                onSubmitEditing={handleAddBank}
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.addBankBtn}
                            onPress={handleAddBank}
                            disabled={addingBank}
                            accessibilityLabel="Add bank account"
                        >
                            {addingBank ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Ionicons name="add" size={22} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Savings Goal */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Savings Goal</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="flag-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Goal name"
                            placeholderTextColor={Colors.textMuted}
                            value={goalName}
                            onChangeText={setGoalName}
                        />
                    </View>
                    <View style={styles.goalRow}>
                        <View style={[styles.inputContainer, { flex: 1 }]}>
                            <Text style={styles.inputCurrency}>\u20B9</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Target"
                                placeholderTextColor={Colors.textMuted}
                                value={goalRequired}
                                onChangeText={setGoalRequired}
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={[styles.inputContainer, { flex: 1 }]}>
                            <Text style={styles.inputCurrency}>\u20B9</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Saved so far"
                                placeholderTextColor={Colors.textMuted}
                                value={goalCollected}
                                onChangeText={setGoalCollected}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.saveGoalBtn}
                        onPress={handleSaveGoal}
                        disabled={savingGoal}
                    >
                        <LinearGradient colors={Colors.gradientSuccess as any} style={styles.saveGradient}>
                            {savingGoal ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.saveText}>Update Goal</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={handleLogout}
                    accessibilityLabel="Sign out"
                    accessibilityRole="button"
                >
                    <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                <View style={{ height: 110 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
    scroll: { flex: 1, paddingHorizontal: 20 },

    // Profile card
    profileCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, ...Shadows.large },
    profileGradient: { padding: 28, alignItems: 'center', borderRadius: 20 },
    avatarBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    profileName: { fontSize: 22, fontWeight: '800', color: '#FFF' },
    profileEmail: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
    profileStats: { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
    profileStat: { alignItems: 'center', paddingHorizontal: 24 },
    profileStatValue: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    profileStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    profileDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

    // Section
    section: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },

    // Quick links
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    linkIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    linkText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginLeft: 12 },

    // Banks
    bankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    bankIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bankDetails: { flex: 1, marginLeft: 12 },
    bankName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
    bankBalance: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    addBankRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
    addBankInput: {
        flex: 1,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        justifyContent: 'center',
    },
    addBankField: { color: Colors.textPrimary, fontSize: 14 },
    addBankBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Goal
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        marginBottom: 10,
    },
    inputIcon: { marginRight: 10 },
    inputCurrency: { fontSize: 16, fontWeight: '700', color: Colors.success, marginRight: 6 },
    input: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
    goalRow: { flexDirection: 'row', gap: 10 },
    saveGoalBtn: { marginTop: 4, borderRadius: 12, overflow: 'hidden' },
    saveGradient: { height: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
    saveText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    // Logout
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.danger + '18',
        borderRadius: 14,
        paddingVertical: 16,
        gap: 8,
        marginTop: 4,
    },
    logoutText: { fontSize: 16, fontWeight: '700', color: Colors.danger },
});
