import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
    RefreshControl, StatusBar, TextInput, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { expenseService } from '../services/expenseService';
import { Subscription } from '../services/models';

export default function SubscriptionsScreen() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await expenseService.getSubscriptions();
            setSubscriptions(data);
        } catch (err) {
            console.error('Error loading subscriptions:', err);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleAdd = async () => {
        if (!name || !amount || !date) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            await expenseService.addSubscription({
                name, amount: parseFloat(amount), date,
                icon: 'ph-credit-card', color: '#4A6CF7',
            });
            setShowModal(false);
            setName(''); setAmount(''); setDate('');
            await loadData();
        } catch (err) {
            Alert.alert('Error', 'Failed to add subscription');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete Subscription', 'Remove this subscription?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await expenseService.deleteSubscription(id);
                        setSubscriptions(prev => prev.filter(s => s.id !== id));
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                }
            },
        ]);
    };

    const formatCurrency = (val: number) => '₹' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const totalMonthly = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

    const renderItem = ({ item }: { item: Subscription }) => (
        <View style={styles.item}>
            <View style={[styles.iconBg, { backgroundColor: (item.color || Colors.primary) + '20' }]}>
                <Ionicons name="card" size={22} color={item.color || Colors.primary} />
            </View>
            <View style={styles.details}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDate}>{item.date}</Text>
            </View>
            <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="close-circle" size={22} color={Colors.danger} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Subscriptions</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Total Bar */}
            <View style={styles.totalCard}>
                <LinearGradient colors={Colors.gradientPurple as any} style={styles.totalGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <View>
                        <Text style={styles.totalLabel}>Monthly Total</Text>
                        <Text style={styles.totalAmount}>{formatCurrency(totalMonthly)}</Text>
                    </View>
                    <View style={styles.totalBadge}>
                        <Text style={styles.totalBadgeText}>{subscriptions.length} active</Text>
                    </View>
                </LinearGradient>
            </View>

            <FlatList
                data={subscriptions}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="card-outline" size={56} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No Subscriptions</Text>
                        <Text style={styles.emptySubtitle}>Add your recurring payments</Text>
                    </View>
                }
            />

            {/* Add Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Subscription</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="text-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Subscription name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputCurrency}>₹</Text>
                            <TextInput style={styles.input} placeholder="Amount" placeholderTextColor={Colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.inputContainer}>
                            <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Date (e.g. 15th of every month)" placeholderTextColor={Colors.textMuted} value={date} onChangeText={setDate} />
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={loading} activeOpacity={0.8}>
                            <LinearGradient colors={Colors.gradientPurple as any} style={styles.submitGradient}>
                                <Text style={styles.submitText}>{loading ? 'Adding...' : 'Add Subscription'}</Text>
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
    addBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center',
    },
    totalCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 16, overflow: 'hidden', ...Shadows.medium },
    totalGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16 },
    totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    totalAmount: { fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 2 },
    totalBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    totalBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    list: { paddingHorizontal: 20, paddingBottom: 100 },
    item: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: Colors.border,
    },
    iconBg: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    details: { flex: 1, marginLeft: 14 },
    itemName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
    itemDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    itemAmount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginRight: 10 },
    deleteBtn: { padding: 4 },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.border,
        paddingHorizontal: 16, height: 52, marginBottom: 12,
    },
    inputIcon: { marginRight: 12 },
    inputCurrency: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginRight: 8 },
    input: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
    submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden', ...Shadows.medium },
    submitGradient: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
