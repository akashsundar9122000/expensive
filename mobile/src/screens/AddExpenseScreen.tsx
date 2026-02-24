import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
    Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { expenseService } from '../services/expenseService';
import { authService } from '../services/authService';

const categories = ['Food & Grocery', 'Shopping', 'Entertainment', 'Investment', 'Bills', 'Transport'];
const paymentModes = ['UPI', 'Bank', 'Card'];

export default function AddExpenseScreen({ navigation }: any) {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food & Grocery');
    const [subCategory, setSubCategory] = useState('');
    const [mode, setMode] = useState('UPI');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [bankAccounts, setBankAccounts] = useState<string[]>([]);
    const [selectedBank, setSelectedBank] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadBanks();
    }, []);

    const loadBanks = async () => {
        try {
            // Fetch live bank list from API first; it is the source of truth
            const banks = await expenseService.getBanks();
            if (banks?.length) {
                const bankNames = banks.map((b: any) => b.name ?? String(b.id));
                setBankAccounts(bankNames);
                // Always set a default selection when list is freshly loaded
                setSelectedBank(bankNames[0]);
            } else {
                // Fall back to the cached user profile (may be stale but better than nothing)
                const user = await authService.getCurrentUser();
                if (user?.bankAccounts?.length) {
                    setBankAccounts(user.bankAccounts);
                    setSelectedBank(user.bankAccounts[0]);
                }
            }
        } catch {
            // Non-critical: bank list unavailable, user can proceed without account selection
        }
    };

    const handleSubmit = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        setLoading(true);
        try {
            await expenseService.addTransaction(
                {
                    amount: parseFloat(amount),
                    category,
                    subCategory: subCategory || category,
                    date,
                    mode: mode as any,
                },
                selectedBank
            );
            Alert.alert('Success', 'Expense added successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (err: any) {
            Alert.alert('Error', 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryIcon = (cat: string) => {
        const icons: Record<string, string> = {
            'Food & Grocery': 'fast-food', 'Shopping': 'cart', 'Entertainment': 'game-controller',
            'Investment': 'trending-up', 'Bills': 'receipt', 'Transport': 'car',
        };
        return icons[cat] || 'cash';
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Expense</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Amount */}
                <View style={styles.amountSection}>
                    <Text style={styles.label}>Amount</Text>
                    <View style={styles.amountInput}>
                        <Text style={styles.currencySymbol}>₹</Text>
                        <TextInput
                            style={styles.amountField}
                            placeholder="0.00"
                            placeholderTextColor={Colors.textMuted}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />
                    </View>
                </View>

                {/* Date */}
                <View style={styles.section}>
                    <Text style={styles.label}>Date</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={Colors.textMuted}
                        />
                    </View>
                </View>

                {/* Category */}
                <View style={styles.section}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.chipGrid}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.chip, category === cat && styles.chipActive]}
                                onPress={() => setCategory(cat)}
                            >
                                <Ionicons
                                    name={getCategoryIcon(cat) as any}
                                    size={16}
                                    color={category === cat ? '#FFF' : Colors.textSecondary}
                                />
                                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Sub Category */}
                <View style={styles.section}>
                    <Text style={styles.label}>Merchant / Sub-category</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="storefront-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Amazon, Starbucks"
                            placeholderTextColor={Colors.textMuted}
                            value={subCategory}
                            onChangeText={setSubCategory}
                        />
                    </View>
                </View>

                {/* Bank Account */}
                {bankAccounts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Select Account</Text>
                        <View style={styles.chipGrid}>
                            {bankAccounts.map((bank) => (
                                <TouchableOpacity
                                    key={bank}
                                    style={[styles.chip, selectedBank === bank && styles.chipActive]}
                                    onPress={() => setSelectedBank(bank)}
                                >
                                    <Ionicons
                                        name="business-outline"
                                        size={16}
                                        color={selectedBank === bank ? '#FFF' : Colors.textSecondary}
                                    />
                                    <Text style={[styles.chipText, selectedBank === bank && styles.chipTextActive]}>
                                        {bank}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Payment Mode */}
                <View style={styles.section}>
                    <Text style={styles.label}>Payment Mode</Text>
                    <View style={styles.modeGrid}>
                        {paymentModes.map((m) => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.modeCard, mode === m && styles.modeCardActive]}
                                onPress={() => setMode(m)}
                            >
                                <Ionicons
                                    name={m === 'UPI' ? 'phone-portrait' : m === 'Bank' ? 'business' : 'card'}
                                    size={22}
                                    color={mode === m ? '#FFF' : Colors.textSecondary}
                                />
                                <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={Colors.gradientPrimary as any}
                        style={styles.submitGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                                <Text style={styles.submitText}>Save Expense</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
    scroll: { flex: 1, paddingHorizontal: 20 },

    amountSection: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
    amountInput: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.border,
        paddingHorizontal: 20, height: 72,
    },
    currencySymbol: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginRight: 8 },
    amountField: { flex: 1, fontSize: 32, fontWeight: '800', color: Colors.textPrimary },

    section: { marginBottom: 20 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.border,
        paddingHorizontal: 16, height: 52,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: Colors.textPrimary, fontSize: 15 },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 12,
        paddingVertical: 10, paddingHorizontal: 14,
        borderWidth: 1, borderColor: Colors.border,
        gap: 6,
    },
    chipActive: {
        backgroundColor: Colors.primary, borderColor: Colors.primary,
    },
    chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
    chipTextActive: { color: '#FFF' },

    modeGrid: { flexDirection: 'row', gap: 10 },
    modeCard: {
        flex: 1, alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 14,
        paddingVertical: 16, borderWidth: 1, borderColor: Colors.border,
        gap: 6,
    },
    modeCardActive: {
        backgroundColor: Colors.primary, borderColor: Colors.primary,
    },
    modeText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
    modeTextActive: { color: '#FFF' },

    submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden', ...Shadows.medium },
    submitBtnDisabled: { opacity: 0.7 },
    submitGradient: {
        height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        borderRadius: 14, gap: 8,
    },
    submitText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
