/**
 * DashboardScreen.tsx
 *
 * Main overview screen. Loads stats, recent transactions, subscriptions,
 * and budget overview in parallel. Sensitive financial figures are hidden
 * until the user explicitly taps the eye icon.
 *
 * Security: no sensitive data is written to console statements.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    StatusBar,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { expenseService } from '../services/expenseService';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { DashboardStats, Transaction, Subscription, Budget, User, Sip } from '../services/models';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [sips, setSips] = useState<Sip[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showBalance, setShowBalance] = useState(false);

    const loadData = useCallback(async () => {
        // Use allSettled so a single failing endpoint does not blank the entire dashboard.
        const [statsResult, txResult, subResult, sipResult, budgetResult, userResult] =
            await Promise.allSettled([
                expenseService.getStats(),
                expenseService.getTransactions(),
                expenseService.getSubscriptions(),
                expenseService.getSips(),
                expenseService.getBudgets(),
                authService.getCurrentUser(),
            ]);

        const nextTransactions: Transaction[] = txResult.status === 'fulfilled'
            ? (Array.isArray(txResult.value) ? txResult.value : [])
            : [];
        const nextSubscriptions: Subscription[] = subResult.status === 'fulfilled'
            ? (Array.isArray(subResult.value) ? subResult.value : [])
            : [];
        const nextSips: Sip[] = sipResult.status === 'fulfilled'
            ? (Array.isArray(sipResult.value) ? sipResult.value : [])
            : [];
        const nextBudgets: Budget[] = budgetResult.status === 'fulfilled'
            ? (Array.isArray(budgetResult.value) ? budgetResult.value : [])
            : [];

        if (statsResult.status === 'fulfilled') setStats(statsResult.value);
        setTransactions(nextTransactions);
        setSubscriptions(nextSubscriptions);
        setSips(nextSips);
        setBudgets(nextBudgets);
        if (userResult.status === 'fulfilled') setUser(userResult.value);

        void notificationService.evaluateBudgetAndDueNotifications({
            transactions: nextTransactions,
            subscriptions: nextSubscriptions,
            sips: nextSips,
            budgets: nextBudgets,
        });
    }, []);

    useEffect(() => {
        loadData();
        const unsubscribe = navigation.addListener('focus', loadData);
        return unsubscribe;
    }, [loadData, navigation]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const formatCurrency = (val: number) =>
        '\u20B9' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getGoalProgress = () => {
        if (!stats || !stats.goalRequired) return 0;
        return Math.min(100, Math.round((stats.goalCollected / stats.goalRequired) * 100));
    };

    const getCategoryIcon = (category: string) => {
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

    const getModeColor = (mode: string) => {
        switch (mode) {
            case 'UPI': return Colors.primary;
            case 'Bank': return Colors.success;
            case 'Card': return Colors.warning;
            default: return Colors.textMuted;
        }
    };

    // Budgets: show only the first 2 most at-risk (highest spend percentage)
    const getBudgetPct = (b: Budget) => {
        const spent = getCurrentMonthSpend(b.category);
        return b.limitAmount > 0 ? Math.min(100, Math.round((spent / b.limitAmount) * 100)) : 0;
    };

    const getCurrentMonthSpend = (category: string): number => {
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return transactions
            .filter((tx) => tx.category === category && tx.date?.startsWith(monthStr))
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    };

    const topBudgets = [...budgets]
        .sort((a, b) => getBudgetPct(b) - getBudgetPct(a))
        .slice(0, 2);

    const firstName = user?.name?.split(' ')[0] || 'User';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Hi, {firstName}</Text>
                        <Text style={styles.headerSub}>Track your finances</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileBtn}
                        onPress={() => navigation.navigate('Settings')}
                        accessibilityLabel="Open settings"
                        accessibilityRole="button"
                    >
                        <Ionicons name="person-circle" size={42} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Summary Cards */}
                {stats && (
                    <>
                        {/* Balance Card */}
                        <LinearGradient
                            colors={Colors.gradientPrimary as any}
                            style={styles.balanceCard}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.balanceHeader}>
                                <Text style={styles.balanceLabel}>Total Balance</Text>
                                <TouchableOpacity
                                    onPress={() => setShowBalance(!showBalance)}
                                    accessibilityLabel={showBalance ? 'Hide balance' : 'Show balance'}
                                >
                                    <Ionicons
                                        name={showBalance ? 'eye' : 'eye-off'}
                                        size={22}
                                        color="rgba(255,255,255,0.75)"
                                    />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.balanceAmount}>
                                {showBalance ? formatCurrency(stats.balance) : '\u20B9 \u2022\u2022\u2022\u2022\u2022\u2022'}
                            </Text>
                            <View style={styles.balanceFooter}>
                                <View style={styles.balanceItem}>
                                    <Ionicons name="arrow-down-circle" size={16} color="#34D399" />
                                    <Text style={styles.balanceItemText}>
                                        Assets: {showBalance ? formatCurrency(stats.balance + stats.totalInvestment) : '\u2022\u2022\u2022\u2022'}
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <View style={[styles.statIconBg, { backgroundColor: Colors.danger + '25' }]}>
                                    <Ionicons name="receipt" size={20} color={Colors.danger} />
                                </View>
                                <Text style={styles.statLabel}>This Month</Text>
                                <Text style={styles.statValue}>{formatCurrency(stats.monthlyExpenses)}</Text>
                            </View>
                            <View style={styles.statCard}>
                                <View style={[styles.statIconBg, { backgroundColor: Colors.secondary + '25' }]}>
                                    <Ionicons name="trending-up" size={20} color={Colors.secondary} />
                                </View>
                                <Text style={styles.statLabel}>Invested</Text>
                                <Text style={styles.statValue}>{formatCurrency(stats.totalInvestment)}</Text>
                            </View>
                        </View>

                        {/* Goal Card */}
                        <View style={styles.goalCard}>
                            <View style={styles.goalHeader}>
                                <View>
                                    <Text style={styles.goalTitle}>{stats.goalName || 'Savings Goal'}</Text>
                                    <Text style={styles.goalSub}>
                                        {formatCurrency(stats.goalCollected)} / {formatCurrency(stats.goalRequired)}
                                    </Text>
                                </View>
                                <View style={styles.goalPercentBadge}>
                                    <Text style={styles.goalPercentText}>{getGoalProgress()}%</Text>
                                </View>
                            </View>
                            <View style={styles.progressBar}>
                                <LinearGradient
                                    colors={Colors.gradientSuccess as any}
                                    style={[styles.progressFill, { width: `${getGoalProgress()}%` as any }]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>
                        </View>

                        {/* Bank Balances */}
                        <View style={styles.goalCard}>
                            <View style={styles.sectionHeaderInline}>
                                <Text style={styles.goalTitle}>Bank Accounts</Text>
                                <Text style={styles.goalSub}>{Object.keys(stats.bankBalances || {}).length} linked</Text>
                            </View>
                            {Object.entries(stats.bankBalances || {}).length === 0 ? (
                                <Text style={styles.goalSub}>No bank accounts found</Text>
                            ) : (
                                Object.entries(stats.bankBalances || {}).map(([bankName, bankBalance]) => (
                                    <View key={bankName} style={styles.bankRow}>
                                        <View style={styles.bankRowLeft}>
                                            <Ionicons name="business-outline" size={16} color={Colors.primary} />
                                            <Text style={styles.bankRowName}>{bankName}</Text>
                                        </View>
                                        <Text style={styles.bankRowValue}>
                                            {showBalance ? formatCurrency(Number(bankBalance || 0)) : '₹ ••••••'}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                )}

                {/* Budget Snapshot (top at-risk budgets) */}
                {topBudgets.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Budget Watch</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        {topBudgets.map((b) => {
                            const spent = getCurrentMonthSpend(b.category);
                            const pct = getBudgetPct(b);
                            const barColor = pct >= 100
                                ? Colors.gradientDanger
                                : pct >= 80
                                ? Colors.gradientWarning
                                : Colors.gradientSuccess;
                            return (
                                <View key={b.category} style={styles.budgetItem}>
                                    <View style={styles.budgetItemTop}>
                                        <View style={[styles.txIconBg, { backgroundColor: (Colors.categoryColors[b.category] || Colors.primary) + '20' }]}>
                                            <Ionicons name={getCategoryIcon(b.category) as any} size={18} color={Colors.categoryColors[b.category] || Colors.primary} />
                                        </View>
                                        <View style={styles.txDetails}>
                                            <Text style={styles.txCategory}>{b.category}</Text>
                                            <Text style={styles.txSub}>{formatCurrency(spent)} of {formatCurrency(b.limitAmount)}</Text>
                                        </View>
                                        <Text style={[styles.budgetPct, { color: pct >= 100 ? Colors.danger : pct >= 80 ? Colors.warning : Colors.success }]}>
                                            {pct}%
                                        </Text>
                                    </View>
                                    <View style={styles.progressBar}>
                                        <LinearGradient
                                            colors={barColor as any}
                                            style={[styles.progressFill, { width: `${pct}%` as any }]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}

                {/* Recent Transactions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Expenses</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    </View>
                ) : (
                    transactions.slice(0, 5).map((t, idx) => (
                        <View key={t.id ?? idx} style={styles.transactionItem}>
                            <View style={[styles.txIconBg, { backgroundColor: (Colors.categoryColors[t.category] || Colors.primary) + '20' }]}>
                                <Ionicons name={getCategoryIcon(t.category) as any} size={20} color={Colors.categoryColors[t.category] || Colors.primary} />
                            </View>
                            <View style={styles.txDetails}>
                                <Text style={styles.txCategory}>{t.category}</Text>
                                <Text style={styles.txSub}>{t.subCategory || t.date}</Text>
                            </View>
                            <View style={styles.txRight}>
                                <Text style={styles.txAmount}>-{formatCurrency(t.amount)}</Text>
                                <View style={[styles.modeBadge, { backgroundColor: getModeColor(t.mode) + '20' }]}>
                                    <Text style={[styles.modeText, { color: getModeColor(t.mode) }]}>{t.mode}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}

                {/* Subscriptions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Subscriptions</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Subscriptions')}>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {subscriptions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="card-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No active subscriptions</Text>
                    </View>
                ) : (
                    subscriptions.slice(0, 3).map((s, idx) => (
                        <View key={s.id ?? idx} style={styles.subItem}>
                            <View style={[styles.subIconBg, { backgroundColor: (s.color || Colors.primary) + '20' }]}>
                                <Ionicons name="card" size={20} color={s.color || Colors.primary} />
                            </View>
                            <View style={styles.subDetails}>
                                <Text style={styles.subName}>{s.name}</Text>
                                <Text style={styles.subDate}>{s.date}</Text>
                            </View>
                            <Text style={styles.subAmount}>{formatCurrency(s.amount)}</Text>
                        </View>
                    ))
                )}

                {/* SIPs */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active SIPs</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Sips')}>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {sips.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="repeat-outline" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>No active SIPs</Text>
                    </View>
                ) : (
                    sips.slice(0, 3).map((sip, idx) => (
                        <View key={sip.id ?? idx} style={styles.subItem}>
                            <View style={[styles.subIconBg, { backgroundColor: Colors.success + '20' }]}> 
                                <Ionicons name="repeat" size={20} color={Colors.success} />
                            </View>
                            <View style={styles.subDetails}>
                                <Text style={styles.subName}>{sip.investmentName}</Text>
                                <Text style={styles.subDate}>Day {sip.sipDay} • {sip.type}</Text>
                            </View>
                            <Text style={styles.subAmount}>{formatCurrency(sip.monthlyAmount)}</Text>
                        </View>
                    ))
                )}

                <View style={{ height: 110 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollView: { flex: 1 },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
    },
    greeting: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    headerSub: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    profileBtn: { padding: 4 },

    // Balance Card
    balanceCard: {
        marginHorizontal: 20,
        borderRadius: 22,
        padding: 24,
        ...Shadows.large,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.75)',
        fontWeight: '500',
    },
    balanceAmount: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFF',
        marginVertical: 10,
    },
    balanceFooter: { flexDirection: 'row', marginTop: 4 },
    balanceItem: { flexDirection: 'row', alignItems: 'center' },
    balanceItemText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginLeft: 6,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.textPrimary,
    },

    // Goal Card
    goalCard: {
        marginHorizontal: 20,
        marginTop: 16,
        backgroundColor: Colors.card,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    goalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    goalSub: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    goalPercentBadge: {
        backgroundColor: Colors.success + '25',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    goalPercentText: {
        color: Colors.success,
        fontWeight: '700',
        fontSize: 14,
    },
    sectionHeaderInline: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    bankRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    bankRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bankRowName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
    bankRowValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },

    // Progress bar (shared)
    progressBar: {
        height: 8,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 10,
    },

    // Section header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 28,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    seeAll: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
    },

    // Budget item (dashboard widget)
    budgetItem: {
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        marginHorizontal: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    budgetItemTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    budgetPct: {
        fontSize: 14,
        fontWeight: '700',
    },

    // Transaction item
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 10,
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    txIconBg: {
        width: 44,
        height: 44,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    txDetails: { flex: 1, marginLeft: 14 },
    txCategory: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    txSub: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    txRight: { alignItems: 'flex-end' },
    txAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.danger,
    },
    modeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 4,
    },
    modeText: { fontSize: 11, fontWeight: '600' },

    // Subscription item
    subItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 10,
        backgroundColor: Colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    subIconBg: {
        width: 44,
        height: 44,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subDetails: { flex: 1, marginLeft: 14 },
    subName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    subDate: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    subAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textPrimary,
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 30,
        marginHorizontal: 20,
        backgroundColor: Colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyText: {
        color: Colors.textMuted,
        fontSize: 14,
        marginTop: 8,
    },
});
