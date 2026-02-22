import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
    RefreshControl, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { expenseService } from '../services/expenseService';
import { Transaction } from '../services/models';

export default function TransactionsScreen({ navigation }: any) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadTransactions = useCallback(async () => {
        try {
            const data = await expenseService.getTransactions();
            setTransactions(data);
        } catch (err) {
            console.error('Error loading transactions:', err);
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

    const handleDelete = (id: number) => {
        Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await expenseService.deleteTransaction(id);
                        setTransactions(prev => prev.filter(t => t.id !== id));
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete transaction');
                    }
                }
            },
        ]);
    };

    const formatCurrency = (val: number) => {
        return '₹' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            'Food & Grocery': 'fast-food', 'Shopping': 'cart', 'Entertainment': 'game-controller',
            'Investment': 'trending-up', 'Bills': 'receipt', 'Transport': 'car',
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

    const renderItem = ({ item }: { item: Transaction }) => (
        <View style={styles.item}>
            <View style={[styles.iconBg, { backgroundColor: (Colors.categoryColors[item.category] || Colors.primary) + '20' }]}>
                <Ionicons name={getCategoryIcon(item.category) as any} size={22} color={Colors.categoryColors[item.category] || Colors.primary} />
            </View>
            <View style={styles.details}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.subCategory}>{item.subCategory || '—'}</Text>
                <Text style={styles.date}>{item.date}</Text>
            </View>
            <View style={styles.right}>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                <View style={[styles.modeBadge, { backgroundColor: getModeColor(item.mode) + '20' }]}>
                    <Text style={[styles.modeText, { color: getModeColor(item.mode) }]}>{item.mode}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>All Transactions</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddExpense')}>
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={transactions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={56} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No Transactions</Text>
                        <Text style={styles.emptySubtitle}>Start by adding your first expense</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddExpense')}>
                            <Text style={styles.emptyBtnText}>+ Add Expense</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
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
    right: { alignItems: 'flex-end', marginRight: 10 },
    amount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    modeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
    modeText: { fontSize: 11, fontWeight: '600' },
    deleteBtn: {
        width: 36, height: 36, borderRadius: 10,
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
});
