import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
    RefreshControl, StatusBar, TextInput, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { expenseService } from '../services/expenseService';
import { Investment } from '../services/models';

const investmentTypes = ['Mutual Fund', 'Stock', 'Gold', 'FD', 'Crypto', 'Real Estate', 'PPF'];

const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
        'Mutual Fund': 'pie-chart', 'Stock': 'trending-up', 'Gold': 'diamond',
        'FD': 'lock-closed', 'Crypto': 'logo-bitcoin', 'Real Estate': 'home',
        'PPF': 'shield-checkmark',
    };
    return icons[type] || 'cash';
};

const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
        'Mutual Fund': '#4A6CF7', 'Stock': '#10B981', 'Gold': '#F59E0B',
        'FD': '#8B5CF6', 'Crypto': '#F97316', 'Real Estate': '#06B6D4',
        'PPF': '#EC4899',
    };
    return colors[type] || Colors.primary;
};

export default function InvestmentsScreen() {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [type, setType] = useState('Mutual Fund');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [returnPct, setReturnPct] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await expenseService.getInvestments();
            setInvestments(Array.isArray(data) ? data : []);
        } catch {
            // Network error — stale data remains displayed
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleAdd = async () => {
        if (!name || !amount) {
            Alert.alert('Error', 'Please fill name and amount');
            return;
        }
        setLoading(true);
        try {
            await expenseService.addInvestment({
                type, name,
                amount: parseFloat(amount),
                returnPct: returnPct ? parseFloat(returnPct) : undefined,
            });
            setShowModal(false);
            setName(''); setAmount(''); setReturnPct(''); setType('Mutual Fund');
            await loadData();
        } catch (err) {
            Alert.alert('Error', 'Failed to add investment');
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = (id: number) => {
        setDeleteTargetId(id);
        setDeletePassword('');
        setShowDeleteModal(true);
    };

    const confirmDeleteInvestment = async () => {
        if (!deleteTargetId) return;
        const password = deletePassword.trim();
        if (!password) {
            Alert.alert('Password Required', 'Enter your account password to delete this investment.');
            return;
        }

        setDeleting(true);
        try {
            await expenseService.deleteInvestment(deleteTargetId, password);
            setInvestments((prev) => prev.filter((i) => i.id !== deleteTargetId));
            setShowDeleteModal(false);
            setDeleteTargetId(null);
            setDeletePassword('');
        } catch {
            Alert.alert('Error', 'Failed to delete investment. Check password and try again.');
        } finally {
            setDeleting(false);
        }
    };

    const formatCurrency = (val: number) => '₹' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const totalInvested = investments.reduce((sum, i) => sum + (i.amount || 0), 0);

    const renderItem = ({ item }: { item: Investment }) => {
        const color = getTypeColor(item.type);
        return (
            <View style={styles.item}>
                <View style={[styles.iconBg, { backgroundColor: color + '20' }]}>
                    <Ionicons name={getTypeIcon(item.type) as any} size={22} color={color} />
                </View>
                <View style={styles.details}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.itemMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: color + '20' }]}>
                            <Text style={[styles.typeText, { color }]}>{item.type}</Text>
                        </View>
                        {item.returnPct ? (
                            <Text style={[styles.returnText, { color: item.returnPct > 0 ? Colors.success : Colors.danger }]}>
                                {item.returnPct > 0 ? '+' : ''}{item.returnPct}%
                            </Text>
                        ) : null}
                    </View>
                </View>
                <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => openDeleteModal(item.id)}>
                    <Ionicons name="close-circle" size={22} color={Colors.danger} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Investments</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Total */}
            <View style={styles.totalCard}>
                <LinearGradient colors={['#10B981', '#059669'] as any} style={styles.totalGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <View>
                        <Text style={styles.totalLabel}>Total Portfolio</Text>
                        <Text style={styles.totalAmount}>{formatCurrency(totalInvested)}</Text>
                    </View>
                    <View style={styles.totalBadge}>
                        <Text style={styles.totalBadgeText}>{investments.length} assets</Text>
                    </View>
                </LinearGradient>
            </View>

            <FlatList
                data={investments}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="trending-up-outline" size={56} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No Investments</Text>
                        <Text style={styles.emptySubtitle}>Start building your portfolio</Text>
                    </View>
                }
            />

            {/* Add Modal */}
            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Investment</Text>
                            <TouchableOpacity
                                onPress={() => setShowModal(false)}
                                accessibilityLabel="Close modal"
                                accessibilityRole="button"
                            >
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Type Selector */}
                            <Text style={styles.label}>Type</Text>
                            <View style={styles.chipGrid}>
                                {investmentTypes.map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.chip, type === t && { backgroundColor: getTypeColor(t), borderColor: getTypeColor(t) }]}
                                        onPress={() => setType(t)}
                                    >
                                        <Ionicons name={getTypeIcon(t) as any} size={14} color={type === t ? '#FFF' : Colors.textSecondary} />
                                        <Text style={[styles.chipText, type === t && { color: '#FFF' }]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.inputContainer}>
                                <TextInput style={styles.input} placeholder="Investment name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputCurrency}>₹</Text>
                                <TextInput style={styles.input} placeholder="Amount" placeholderTextColor={Colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputCurrency}>%</Text>
                                <TextInput style={styles.input} placeholder="Return % (optional)" placeholderTextColor={Colors.textMuted} value={returnPct} onChangeText={setReturnPct} keyboardType="decimal-pad" />
                            </View>

                            <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={loading}>
                                <LinearGradient colors={Colors.gradientSuccess as any} style={styles.submitGradient}>
                                    <Text style={styles.submitText}>{loading ? 'Adding...' : 'Add Investment'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <Text style={styles.deleteTitle}>Delete Investment</Text>
                        <Text style={styles.deleteSubtitle}>Enter your account password to confirm deletion.</Text>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Account password"
                                placeholderTextColor={Colors.textMuted}
                                value={deletePassword}
                                onChangeText={setDeletePassword}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.deleteActionRow}>
                            <TouchableOpacity
                                style={styles.cancelDeleteBtn}
                                onPress={() => setShowDeleteModal(false)}
                                disabled={deleting}
                            >
                                <Text style={styles.cancelDeleteText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDeleteBtn}
                                onPress={confirmDeleteInvestment}
                                disabled={deleting}
                            >
                                {deleting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
                            </TouchableOpacity>
                        </View>
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
        backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center',
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
    itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    typeText: { fontSize: 11, fontWeight: '600' },
    returnText: { fontSize: 13, fontWeight: '700' },
    itemAmount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginRight: 10 },
    deleteBtn: { padding: 4 },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40, maxHeight: '85%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
    label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 10,
        paddingVertical: 8, paddingHorizontal: 12,
        borderWidth: 1, borderColor: Colors.border, gap: 4,
    },
    chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.border,
        paddingHorizontal: 16, height: 52, marginBottom: 12,
    },
    inputIcon: { marginRight: 10 },
    inputCurrency: { fontSize: 18, fontWeight: '700', color: Colors.success, marginRight: 8 },
    input: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
    submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden', ...Shadows.medium },
    submitGradient: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    deleteModalContent: {
        backgroundColor: Colors.surface,
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    deleteTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
    deleteSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14 },
    deleteActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
    cancelDeleteBtn: {
        paddingHorizontal: 16,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.card,
    },
    cancelDeleteText: { color: Colors.textPrimary, fontWeight: '600' },
    confirmDeleteBtn: {
        paddingHorizontal: 16,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.danger,
        minWidth: 92,
    },
    confirmDeleteText: { color: '#FFF', fontWeight: '700' },
});
