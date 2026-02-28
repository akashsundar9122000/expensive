import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
    RefreshControl, StatusBar, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { expenseService } from '../services/expenseService';
import { Sip } from '../services/models';

const sipTypes = ['Mutual Fund', 'Index Fund', 'ETF', 'Stocks', 'Gold'];

export default function SipsScreen() {
    const [sips, setSips] = useState<Sip[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [type, setType] = useState(sipTypes[0]);
    const [investmentName, setInvestmentName] = useState('');
    const [monthlyAmount, setMonthlyAmount] = useState('');
    const [sipDay, setSipDay] = useState('');
    const [bankAccounts, setBankAccounts] = useState<string[]>([]);
    const [selectedBank, setSelectedBank] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingSipId, setDeletingSipId] = useState<number | null>(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [sipData, banks] = await Promise.all([
                expenseService.getSips(),
                expenseService.getBanks(),
            ]);
            setSips(Array.isArray(sipData) ? sipData : []);

            const bankNames = Array.isArray(banks)
                ? banks.map((bank) => String(bank.name || '').trim()).filter(Boolean)
                : [];
            setBankAccounts(bankNames);
            setSelectedBank((prev) => (prev && bankNames.includes(prev) ? prev : bankNames[0] || ''));
        } catch {
            // Keep stale data in case of network errors
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const resetForm = () => {
        setType(sipTypes[0]);
        setInvestmentName('');
        setMonthlyAmount('');
        setSipDay('');
        setSelectedBank(bankAccounts[0] || '');
        setIsEditMode(false);
        setEditingId(null);
    };

    const openNewModal = () => {
        resetForm();
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!investmentName || !monthlyAmount || !sipDay || !selectedBank) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        const parsedAmount = parseFloat(monthlyAmount);
        const parsedSipDay = parseInt(sipDay, 10);

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Error', 'Monthly amount must be greater than 0');
            return;
        }
        if (!Number.isInteger(parsedSipDay) || parsedSipDay < 1 || parsedSipDay > 31) {
            Alert.alert('Error', 'SIP day must be between 1 and 31');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                type,
                investmentName: investmentName.trim(),
                monthlyAmount: parsedAmount,
                sipDay: parsedSipDay,
                bankName: selectedBank,
            };

            if (isEditMode && editingId) {
                await expenseService.editSip(editingId, payload);
            } else {
                await expenseService.addSip(payload);
            }

            setShowModal(false);
            resetForm();
            await loadData();
        } catch {
            Alert.alert('Error', isEditMode ? 'Failed to update SIP' : 'Failed to add SIP');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (sip: Sip) => {
        setType(sip.type || sipTypes[0]);
        setInvestmentName(sip.investmentName || '');
        setMonthlyAmount(String(sip.monthlyAmount || ''));
        setSipDay(String(sip.sipDay || ''));
        setSelectedBank(sip.bankName || bankAccounts[0] || '');
        setIsEditMode(true);
        setEditingId(sip.id);
        setShowModal(true);
    };

    const handleDelete = (id: number) => {
        setDeletingSipId(id);
        setDeletePassword('');
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deletingSipId) return;
        const password = deletePassword.trim();
        if (!password) {
            Alert.alert('Password Required', 'Enter your account password to delete this SIP.');
            return;
        }

        setDeleting(true);
        try {
            await expenseService.deleteSip(deletingSipId, password);
            setSips((prev) => prev.filter((sip) => sip.id !== deletingSipId));
            setShowDeleteModal(false);
            setDeletingSipId(null);
            setDeletePassword('');
        } catch {
            Alert.alert('Error', 'Failed to delete SIP. Check password and try again.');
        } finally {
            setDeleting(false);
        }
    };

    const formatCurrency = (val: number) =>
        '₹' + (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const totalMonthly = sips.reduce((sum, sip) => sum + (sip.monthlyAmount || 0), 0);

    const renderItem = ({ item }: { item: Sip }) => (
        <View style={styles.item}>
            <View style={styles.iconBg}>
                <Ionicons name="repeat" size={20} color={Colors.success} />
            </View>
            <View style={styles.details}>
                <Text style={styles.itemName}>{item.investmentName}</Text>
                <Text style={styles.itemMeta}>{item.type} • Day {item.sipDay}</Text>
                <Text style={styles.itemMeta}>Bank: {item.bankName || 'N/A'}</Text>
            </View>
            <Text style={styles.itemAmount}>{formatCurrency(item.monthlyAmount)}</Text>
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
                    <Ionicons name="pencil" size={17} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="close-circle" size={22} color={Colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>SIPs</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openNewModal}>
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.totalCard}>
                <LinearGradient colors={Colors.gradientSuccess as any} style={styles.totalGradient}>
                    <View>
                        <Text style={styles.totalLabel}>Monthly SIP Total</Text>
                        <Text style={styles.totalAmount}>{formatCurrency(totalMonthly)}</Text>
                    </View>
                    <View style={styles.totalBadge}>
                        <Text style={styles.totalBadgeText}>{sips.length} active</Text>
                    </View>
                </LinearGradient>
            </View>

            <FlatList
                data={sips}
                renderItem={renderItem}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="repeat-outline" size={56} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>No SIPs</Text>
                        <Text style={styles.emptySubtitle}>Add your recurring investments</Text>
                    </View>
                }
            />

            <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditMode ? 'Edit SIP' : 'Add SIP'}</Text>
                            <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                                <Ionicons name="close" size={24} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Type</Text>
                        <View style={styles.chipGrid}>
                            {sipTypes.map((value) => (
                                <TouchableOpacity
                                    key={value}
                                    style={[styles.chip, type === value && styles.chipActive]}
                                    onPress={() => setType(value)}
                                >
                                    <Text style={[styles.chipText, type === value && styles.chipTextActive]}>{value}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="trending-up-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Investment name"
                                placeholderTextColor={Colors.textMuted}
                                value={investmentName}
                                onChangeText={setInvestmentName}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputCurrency}>₹</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Monthly amount"
                                placeholderTextColor={Colors.textMuted}
                                value={monthlyAmount}
                                onChangeText={setMonthlyAmount}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="SIP day (1-31)"
                                placeholderTextColor={Colors.textMuted}
                                value={sipDay}
                                onChangeText={setSipDay}
                                keyboardType="number-pad"
                            />
                        </View>

                        <Text style={styles.label}>Bank Account</Text>
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
                            <Text style={styles.warningText}>No bank account found. Add one in Settings first.</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.submitBtn, (loading || bankAccounts.length === 0) && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={loading || bankAccounts.length === 0}
                        >
                            <LinearGradient colors={Colors.gradientSuccess as any} style={styles.submitGradient}>
                                {loading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.submitText}>{isEditMode ? 'Update SIP' : 'Add SIP'}</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <Text style={styles.deleteTitle}>Delete SIP</Text>
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
                            <TouchableOpacity style={styles.cancelDeleteBtn} onPress={() => setShowDeleteModal(false)} disabled={deleting}>
                                <Text style={styles.cancelDeleteText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmDelete} disabled={deleting}>
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
    iconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.success + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    details: { flex: 1, marginLeft: 12 },
    itemName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    itemMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    itemAmount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginRight: 10 },
    actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    editBtn: { padding: 6 },
    deleteBtn: { padding: 4 },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
    label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    chip: {
        backgroundColor: Colors.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    chipActive: { backgroundColor: Colors.success, borderColor: Colors.success },
    chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: '#FFF' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.card, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.border,
        paddingHorizontal: 14, height: 48, marginBottom: 10,
    },
    inputIcon: { marginRight: 8 },
    inputCurrency: { color: Colors.success, fontSize: 17, fontWeight: '700', marginRight: 6 },
    input: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
    warningText: { color: Colors.warning, fontSize: 12, marginBottom: 8 },
    submitBtn: { marginTop: 6, borderRadius: 12, overflow: 'hidden', ...Shadows.medium },
    submitBtnDisabled: { opacity: 0.65 },
    submitGradient: { height: 50, justifyContent: 'center', alignItems: 'center' },
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
