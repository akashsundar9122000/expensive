import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
    RefreshControl, StatusBar, Modal, TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { expenseService } from '../services/expenseService';
import { Transaction } from '../services/models';

const categories = ['Food & Grocery', 'Shopping', 'Entertainment', 'Investment', 'Bills', 'Transport'];
const paymentModes = ['UPI', 'Bank', 'Card'];

export default function TransactionsScreen({ navigation }: any) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(categories[0]);
    const [subCategory, setSubCategory] = useState('');
    const [mode, setMode] = useState(paymentModes[0]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [bankAccounts, setBankAccounts] = useState<string[]>([]);
    const [selectedBank, setSelectedBank] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
    const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

    const loadTransactions = useCallback(async () => {
        try {
            const [txData, bankData] = await Promise.all([
                expenseService.getTransactions(),
                expenseService.getBanks(),
            ]);

            setTransactions(Array.isArray(txData) ? txData : []);
            const bankNames = (Array.isArray(bankData) ? bankData : [])
                .map((bank) => String(bank.name || '').trim())
                .filter(Boolean);
            setBankAccounts(bankNames);
            setSelectedBank((prev) => prev || bankNames[0] || '');
        } catch {
            // Keep stale data on load errors
        }
    }, []);

    useEffect(() => {
        loadTransactions();
        const unsubscribe = navigation.addListener('focus', loadTransactions);
        return unsubscribe;
    }, [loadTransactions, navigation]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTransactions();
        setRefreshing(false);
    };

    const resetEditForm = () => {
        setEditingTransactionId(null);
        setAmount('');
        setCategory(categories[0]);
        setSubCategory('');
        setMode(paymentModes[0]);
        setDate(new Date().toISOString().split('T')[0]);
        setSelectedBank(bankAccounts[0] || '');
    };

    const openEditModal = (transaction: Transaction) => {
        setEditingTransactionId(transaction.id);
        setAmount(String(transaction.amount || ''));
        setCategory(transaction.category || categories[0]);
        setSubCategory(transaction.subCategory || '');
        setMode(transaction.mode || paymentModes[0]);
        setDate(transaction.date || new Date().toISOString().split('T')[0]);

        const fallbackBank = bankAccounts[0] || '';
        const txBank = String(transaction.bankName || '').trim();
        if (txBank && !bankAccounts.includes(txBank)) {
            setBankAccounts((prev) => [txBank, ...prev]);
        }
        setSelectedBank(txBank || fallbackBank);
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTransactionId) return;
        const parsedAmount = parseFloat(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (!selectedBank) {
            Alert.alert('Error', 'Please select a bank account');
            return;
        }

        setSaving(true);
        try {
            await expenseService.updateTransaction(
                editingTransactionId,
                {
                    amount: parsedAmount,
                    category,
                    subCategory: subCategory || category,
                    date,
                    mode: mode as any,
                },
                selectedBank
            );
            setShowEditModal(false);
            resetEditForm();
            await loadTransactions();
        } catch {
            Alert.alert('Error', 'Failed to update transaction');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await expenseService.deleteTransaction(id);
                        setTransactions(prev => prev.filter(t => t.id !== id));
                    } catch {
                        Alert.alert('Error', 'Failed to delete transaction');
                    }
                }
            },
        ]);
    };

    const formatCurrency = (val: number) => {
        return '₹' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getCategoryIcon = (value: string) => {
        const icons: Record<string, string> = {
            'Food & Grocery': 'fast-food', 'Shopping': 'cart', 'Entertainment': 'game-controller',
            'Investment': 'trending-up', 'Bills': 'receipt', 'Transport': 'car',
        };
        return icons[value] || 'cash';
    };

    const getModeColor = (value: string) => {
        switch (value) {
            case 'UPI': return Colors.primary;
            case 'Bank': return Colors.success;
            case 'Card': return Colors.warning;
            default: return Colors.textMuted;
        }
    };

    const monthOptions = [
        { label: 'All', value: 'all' as const },
        { label: 'Jan', value: 1 },
        { label: 'Feb', value: 2 },
        { label: 'Mar', value: 3 },
        { label: 'Apr', value: 4 },
        { label: 'May', value: 5 },
        { label: 'Jun', value: 6 },
        { label: 'Jul', value: 7 },
        { label: 'Aug', value: 8 },
        { label: 'Sep', value: 9 },
        { label: 'Oct', value: 10 },
        { label: 'Nov', value: 11 },
        { label: 'Dec', value: 12 },
    ];

    const yearOptions = React.useMemo(() => {
        const years = Array.from(
            new Set(
                (transactions || [])
                    .map((transaction) => {
                        const parsed = new Date(transaction.date);
                        return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
                    })
                    .filter((year): year is number => year !== null)
            )
        ).sort((a, b) => b - a);

        return [{ label: 'All', value: 'all' as const }, ...years.map((year) => ({ label: String(year), value: year }))];
    }, [transactions]);

    const filteredTransactions = React.useMemo(() => {
        return (transactions || []).filter((transaction) => {
            const parsed = new Date(transaction.date);
            if (Number.isNaN(parsed.getTime())) return selectedMonth === 'all' && selectedYear === 'all';

            const txMonth = parsed.getMonth() + 1;
            const txYear = parsed.getFullYear();

            const monthMatches = selectedMonth === 'all' || txMonth === selectedMonth;
            const yearMatches = selectedYear === 'all' || txYear === selectedYear;

            return monthMatches && yearMatches;
        });
    }, [transactions, selectedMonth, selectedYear]);

    const renderItem = ({ item }: { item: Transaction }) => (
        <View style={styles.item}>
            <View style={[styles.iconBg, { backgroundColor: (Colors.categoryColors[item.category] || Colors.primary) + '20' }]}>
                <Ionicons name={getCategoryIcon(item.category) as any} size={22} color={Colors.categoryColors[item.category] || Colors.primary} />
            </View>
            <View style={styles.details}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.subCategory}>{item.subCategory || '—'}</Text>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={styles.bankName}>Bank: {item.bankName || '—'}</Text>
            </View>
            <View style={styles.right}>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                <View style={[styles.modeBadge, { backgroundColor: getModeColor(item.mode) + '20' }]}>
                    <Text style={[styles.modeText, { color: getModeColor(item.mode) }]}>{item.mode}</Text>
                </View>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                    <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>All Transactions</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddExpense')}>
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Month</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {monthOptions.map((option) => (
                        <TouchableOpacity
                            key={`month-${option.label}`}
                            style={[styles.filterChip, selectedMonth === option.value && styles.filterChipActive]}
                            onPress={() => setSelectedMonth(option.value)}
                        >
                            <Text style={[styles.filterChipText, selectedMonth === option.value && styles.filterChipTextActive]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={[styles.filterLabel, { marginTop: 10 }]}>Year</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {yearOptions.map((option) => (
                        <TouchableOpacity
                            key={`year-${option.label}`}
                            style={[styles.filterChip, selectedYear === option.value && styles.filterChipActive]}
                            onPress={() => setSelectedYear(option.value)}
                        >
                            <Text style={[styles.filterChipText, selectedYear === option.value && styles.filterChipTextActive]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredTransactions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={56} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No Transactions Found</Text>
                        {transactions.length > 0 ? (
                            <Text style={styles.emptySubtitle}>Try changing month/year filters</Text>
                        ) : (
                            <>
                                <Text style={styles.emptySubtitle}>Start by adding your first expense</Text>
                                <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddExpense')}>
                                    <Text style={styles.emptyBtnText}>+ Add Expense</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                }
            />

            <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Transaction</Text>
                            <TouchableOpacity onPress={() => { setShowEditModal(false); resetEditForm(); }}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputCurrency}>₹</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Amount"
                                placeholderTextColor={Colors.textMuted}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={Colors.textMuted}
                                value={date}
                                onChangeText={setDate}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="storefront-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Merchant / Sub-category"
                                placeholderTextColor={Colors.textMuted}
                                value={subCategory}
                                onChangeText={setSubCategory}
                            />
                        </View>

                        <Text style={styles.groupLabel}>Category</Text>
                        <View style={styles.chipGrid}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.chip, category === cat && styles.chipActive]}
                                    onPress={() => setCategory(cat)}
                                >
                                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.groupLabel}>Payment Mode</Text>
                        <View style={styles.chipGrid}>
                            {paymentModes.map((value) => (
                                <TouchableOpacity
                                    key={value}
                                    style={[styles.chip, mode === value && styles.chipActive]}
                                    onPress={() => setMode(value)}
                                >
                                    <Text style={[styles.chipText, mode === value && styles.chipTextActive]}>{value}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.groupLabel}>Bank Account</Text>
                        {bankAccounts.length > 0 ? (
                            <View style={styles.chipGrid}>
                                {bankAccounts.map((bank) => (
                                    <TouchableOpacity
                                        key={bank}
                                        style={[styles.chip, selectedBank === bank && styles.chipActive]}
                                        onPress={() => setSelectedBank(bank)}
                                    >
                                        <Text style={[styles.chipText, selectedBank === bank && styles.chipTextActive]}>{bank}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.warningText}>No bank accounts found. Add one in Settings.</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.saveBtn, (saving || bankAccounts.length === 0) && styles.saveBtnDisabled]}
                            onPress={handleSaveEdit}
                            disabled={saving || bankAccounts.length === 0}
                        >
                            {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Update Transaction</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 52,
        paddingBottom: 16,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
    addBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    filterSection: {
        marginHorizontal: 20,
        marginBottom: 10,
    },
    filterLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
    },
    filterRow: {
        gap: 8,
        paddingRight: 20,
    },
    filterChip: {
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.card,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    filterChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterChipText: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: '#FFF',
    },
    list: { paddingHorizontal: 20, paddingBottom: 100 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    iconBg: {
        width: 46, height: 46, borderRadius: 13,
        justifyContent: 'center', alignItems: 'center',
    },
    details: { flex: 1, marginLeft: 14 },
    category: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
    subCategory: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
    date: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
    bankName: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
    right: { alignItems: 'flex-end', marginRight: 10 },
    amount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    modeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
    modeText: { fontSize: 11, fontWeight: '600' },
    actionButtons: { flexDirection: 'row', gap: 6 },
    editBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: Colors.danger + '15',
        justifyContent: 'center', alignItems: 'center',
    },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
    emptyBtn: {
        marginTop: 20,
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 34,
        maxHeight: '88%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.border,
        paddingHorizontal: 14, height: 48, marginBottom: 10,
    },
    inputIcon: { marginRight: 8 },
    inputCurrency: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginRight: 6 },
    input: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
    groupLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 6, marginBottom: 8 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: {
        backgroundColor: Colors.card,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: '#FFF' },
    warningText: { color: Colors.warning, fontSize: 12, marginBottom: 8 },
    saveBtn: {
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
