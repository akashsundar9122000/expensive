/**
 * BudgetsScreen.tsx
 *
 * Displays per-category monthly budgets and shows how much has been spent
 * this month relative to each limit. Allows creating, editing, and deleting
 * budget limits via the /api/expenses/budgets endpoint.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Alert,
    RefreshControl,
    StatusBar,
    TextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { expenseService } from '../services/expenseService';
import { Budget, Transaction } from '../services/models';

// The same categories available when adding a transaction
const CATEGORIES = [
    'Food & Grocery',
    'Shopping',
    'Entertainment',
    'Investment',
    'Bills',
    'Transport',
];

const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
        'Food & Grocery': 'fast-food',
        'Shopping': 'cart',
        'Entertainment': 'game-controller',
        'Investment': 'trending-up',
        'Bills': 'receipt',
        'Transport': 'car',
    };
    return icons[category] || 'cash';
};

interface BudgetWithSpend extends Budget {
    spent: number;
    pct: number;
}

export default function BudgetsScreen() {
    const [budgets, setBudgets] = useState<BudgetWithSpend[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
    const [limitInput, setLimitInput] = useState('');
    const [saving, setSaving] = useState(false);

    // -----------------------------------------------------------------------
    // Load budgets and current-month transactions together so we can compute
    // the "spent" amount for each budget category client-side.
    // -----------------------------------------------------------------------
    const loadData = useCallback(async () => {
        // Use allSettled so a transactions fetch failure doesn't wipe the budget list
        const [budgetsResult, txResult] = await Promise.allSettled([
            expenseService.getBudgets(),
            expenseService.getTransactions(),
        ]);

        const rawBudgets = budgetsResult.status === 'fulfilled' ? budgetsResult.value : null;
        if (!rawBudgets) return; // Can't enrich without budget data; keep stale state

        const transactions: Transaction[] = txResult.status === 'fulfilled'
            ? (Array.isArray(txResult.value) ? txResult.value : [])
            : [];

        // Sum current-month spending per category
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const spendMap: Record<string, number> = {};
        transactions.forEach((tx: Transaction) => {
            if (tx.date && tx.date.startsWith(monthStr)) {
                spendMap[tx.category] = (spendMap[tx.category] ?? 0) + (tx.amount ?? 0);
            }
        });

        const enriched: BudgetWithSpend[] = rawBudgets.map((b) => {
            const spent = spendMap[b.category] ?? 0;
            // Normalize limitAmount: Postgres numeric columns may arrive as strings
            const limitAmount = typeof b.limitAmount === 'string'
                ? parseFloat(b.limitAmount) || 0
                : (b.limitAmount ?? 0);
            const limit = limitAmount > 0 ? limitAmount : 1;
            return {
                ...b,
                limitAmount,
                spent,
                pct: Math.min(100, Math.round((spent / limit) * 100)),
            };
        });

        setBudgets(enriched);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleSave = async () => {
        const amount = parseFloat(limitInput);
        if (!limitInput || isNaN(amount) || amount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid limit greater than zero.');
            return;
        }
        setSaving(true);
        try {
            await expenseService.upsertBudget(selectedCategory, amount);
            setShowModal(false);
            setLimitInput('');
            setSelectedCategory(CATEGORIES[0]);
            await loadData();
        } catch {
            Alert.alert('Error', 'Failed to save budget. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (category: string) => {
        Alert.alert(
            'Remove Budget',
            `Remove the budget limit for "${category}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await expenseService.deleteBudget(category);
                            setBudgets((prev) => prev.filter((b) => b.category !== category));
                        } catch {
                            Alert.alert('Error', 'Failed to remove budget.');
                        }
                    },
                },
            ]
        );
    };

    const openEditModal = (budget: BudgetWithSpend) => {
        setSelectedCategory(budget.category);
        setLimitInput((budget.limitAmount ?? 0).toString());
        setShowModal(true);
    };

    const openAddModal = () => {
        setSelectedCategory(CATEGORIES[0]);
        setLimitInput('');
        setShowModal(true);
    };

    const formatCurrency = (val: number) =>
        '\u20B9' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const getBarColor = (pct: number): string[] => {
        if (pct >= 100) return Colors.gradientDanger;
        if (pct >= 80) return Colors.gradientWarning;
        return Colors.gradientSuccess;
    };

    const renderItem = ({ item }: { item: BudgetWithSpend }) => {
        const overBudget = item.pct >= 100;
        return (
            <View style={styles.item}>
                <View style={styles.itemTop}>
                    <View style={[styles.iconBg, { backgroundColor: (Colors.categoryColors[item.category] || Colors.primary) + '20' }]}>
                        <Ionicons
                            name={getCategoryIcon(item.category) as any}
                            size={20}
                            color={Colors.categoryColors[item.category] || Colors.primary}
                        />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemCategory}>{item.category}</Text>
                        <Text style={[styles.itemSpend, overBudget && styles.overBudgetText]}>
                            {formatCurrency(item.spent)} / {formatCurrency(item.limitAmount)}
                        </Text>
                    </View>
                    <View style={styles.itemActions}>
                        <View style={[styles.pctBadge, { backgroundColor: overBudget ? Colors.danger + '25' : Colors.success + '25' }]}>
                            <Text style={[styles.pctText, { color: overBudget ? Colors.danger : Colors.success }]}>
                                {item.pct}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                    <LinearGradient
                        colors={getBarColor(item.pct) as any}
                        style={[styles.progressFill, { width: `${item.pct}%` as any }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    />
                </View>

                {overBudget && (
                    <Text style={styles.overBudgetHint}>
                        Over budget by {formatCurrency(item.spent - item.limitAmount)}
                    </Text>
                )}

                {/* Row actions */}
                <View style={styles.itemFooter}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                        <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
                        <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.category)}>
                        <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                        <Text style={styles.deleteBtnText}>Remove</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Budgets</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={budgets}
                renderItem={renderItem}
                keyExtractor={(item) => item.category}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="pie-chart-outline" size={56} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No Budgets Set</Text>
                        <Text style={styles.emptySubtitle}>Set monthly limits per category to stay on track</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={openAddModal}>
                            <Text style={styles.emptyBtnText}>+ Set Budget</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Add / Edit Budget Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Set Budget Limit</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Category</Text>
                        <View style={styles.chipGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.chip,
                                        selectedCategory === cat && {
                                            backgroundColor: Colors.categoryColors[cat] || Colors.primary,
                                            borderColor: Colors.categoryColors[cat] || Colors.primary,
                                        },
                                    ]}
                                    onPress={() => setSelectedCategory(cat)}
                                >
                                    <Ionicons
                                        name={getCategoryIcon(cat) as any}
                                        size={14}
                                        color={selectedCategory === cat ? '#FFF' : Colors.textSecondary}
                                    />
                                    <Text style={[styles.chipText, selectedCategory === cat && { color: '#FFF' }]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { marginTop: 16 }]}>Monthly Limit</Text>
                        <View style={styles.amountInput}>
                            <Text style={styles.currency}>\u20B9</Text>
                            <TextInput
                                style={styles.amountField}
                                placeholder="0"
                                placeholderTextColor={Colors.textMuted}
                                value={limitInput}
                                onChangeText={setLimitInput}
                                keyboardType="decimal-pad"
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Colors.gradientPrimary as any}
                                style={styles.saveGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveText}>Save Budget</Text>
                                )}
                            </LinearGradient>
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
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: { paddingHorizontal: 20, paddingBottom: 100 },

    // Budget item card
    item: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itemTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    iconBg: {
        width: 44,
        height: 44,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: { flex: 1, marginLeft: 14 },
    itemCategory: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    itemSpend: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    overBudgetText: { color: Colors.danger },
    itemActions: { alignItems: 'flex-end' },
    pctBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    pctText: { fontSize: 13, fontWeight: '700' },

    progressTrack: {
        height: 8,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 10,
    },
    overBudgetHint: {
        fontSize: 12,
        color: Colors.danger,
        marginTop: 6,
        fontWeight: '600',
    },
    itemFooter: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 12,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: Colors.primary + '18',
        borderRadius: 8,
    },
    editBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: Colors.danger + '18',
        borderRadius: 8,
    },
    deleteBtnText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },

    // Empty state
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
    emptySubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    emptyBtn: {
        marginTop: 20,
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 44,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
    label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 5,
    },
    chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
    amountInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
        height: 58,
    },
    currency: { fontSize: 24, fontWeight: '800', color: Colors.primary, marginRight: 8 },
    amountField: { flex: 1, fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
    saveBtn: {
        marginTop: 20,
        borderRadius: 14,
        overflow: 'hidden',
        ...Shadows.medium,
    },
    saveGradient: {
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    },
    saveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
