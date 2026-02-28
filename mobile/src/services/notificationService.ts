import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Budget, Sip, Subscription, Transaction } from './models';

const PUSH_ENABLED_KEY = 'expensify_push_notifications_enabled';
const SENT_NOTIFICATION_KEY = 'expensify_sent_notification_keys_v1';

let initialized = false;

type NotificationDataBundle = {
    budgets: Budget[];
    transactions: Transaction[];
    subscriptions: Subscription[];
    sips: Sip[];
};

type SentMap = Record<string, number>;

const toNum = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const formatCurrency = (value: number): string =>
    `₹${(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toPeriodKey = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getNextMonthlyDueDate = (dayOfMonth: number, now: Date): Date => {
    const base = startOfDay(now);
    const year = base.getFullYear();
    const month = base.getMonth();

    const maxThisMonth = new Date(year, month + 1, 0).getDate();
    const inThisMonth = new Date(year, month, Math.min(dayOfMonth, maxThisMonth));
    if (inThisMonth > base) return inThisMonth;

    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = (month + 1) % 12;
    const maxNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    return new Date(nextYear, nextMonth, Math.min(dayOfMonth, maxNextMonth));
};

const daysUntil = (target: Date, from: Date): number => {
    const diffMs = startOfDay(target).getTime() - startOfDay(from).getTime();
    return Math.round(diffMs / (24 * 60 * 60 * 1000));
};

const loadSentMap = async (): Promise<SentMap> => {
    try {
        const raw = await AsyncStorage.getItem(SENT_NOTIFICATION_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as SentMap;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const saveSentMap = async (map: SentMap): Promise<void> => {
    await AsyncStorage.setItem(SENT_NOTIFICATION_KEY, JSON.stringify(map));
};

const ensurePermissions = async (): Promise<boolean> => {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        return true;
    }

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
};

const sendOnce = async (
    sentMap: SentMap,
    dedupeKey: string,
    title: string,
    body: string
): Promise<void> => {
    if (sentMap[dedupeKey]) return;

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
        },
        trigger: null,
    });

    sentMap[dedupeKey] = Date.now();
};

const getCurrentMonthSpendByCategory = (transactions: Transaction[], now: Date): Record<string, number> => {
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const map: Record<string, number> = {};

    transactions.forEach((tx) => {
        if (!tx?.date || !tx.date.startsWith(prefix)) return;
        const category = String(tx.category || '').trim();
        if (!category) return;
        map[category] = (map[category] || 0) + toNum(tx.amount);
    });

    return map;
};

const pickCurrentBudgets = (budgets: Budget[], now: Date): Budget[] => {
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const latestByCategory = new Map<string, Budget>();

    budgets.forEach((budget) => {
        const category = String(budget.category || '').trim();
        if (!category) return;

        const month = Number(budget.month || 0);
        const year = Number(budget.year || 0);
        const existing = latestByCategory.get(category);

        if (!existing) {
            latestByCategory.set(category, budget);
            return;
        }

        const existingMonth = Number(existing.month || 0);
        const existingYear = Number(existing.year || 0);

        const budgetIsCurrent = month === currentMonth && year === currentYear;
        const existingIsCurrent = existingMonth === currentMonth && existingYear === currentYear;

        if (budgetIsCurrent && !existingIsCurrent) {
            latestByCategory.set(category, budget);
            return;
        }

        if (year > existingYear || (year === existingYear && month > existingMonth)) {
            latestByCategory.set(category, budget);
        }
    });

    return Array.from(latestByCategory.values());
};

export const notificationService = {
    async initialize(): Promise<void> {
        if (initialized) return;

        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 150, 250],
                enableVibrate: true,
                showBadge: true,
            });
        }

        initialized = true;
    },

    async getPushEnabled(): Promise<boolean> {
        const raw = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
        if (raw === null) return true;
        return raw === 'true';
    },

    async setPushEnabled(enabled: boolean): Promise<boolean> {
        await AsyncStorage.setItem(PUSH_ENABLED_KEY, String(enabled));
        if (!enabled) return true;
        return ensurePermissions();
    },

    async evaluateBudgetAndDueNotifications(data: NotificationDataBundle): Promise<void> {
        const enabled = await this.getPushEnabled();
        if (!enabled) return;

        await this.initialize();
        const permissionGranted = await ensurePermissions();
        if (!permissionGranted) return;

        const now = new Date();
        const currentPeriod = toPeriodKey(now);
        const sentMap = await loadSentMap();

        const currentBudgets = pickCurrentBudgets(Array.isArray(data.budgets) ? data.budgets : [], now);
        const spendByCategory = getCurrentMonthSpendByCategory(Array.isArray(data.transactions) ? data.transactions : [], now);

        for (const budget of currentBudgets) {
            const category = String(budget.category || '').trim();
            const limit = toNum(budget.limitAmount);
            if (!category || limit <= 0) continue;

            const spent = toNum(spendByCategory[category] || 0);
            if (spent <= limit) continue;

            const overBy = spent - limit;
            const dedupeKey = `budget:${category}:${currentPeriod}`;
            await sendOnce(
                sentMap,
                dedupeKey,
                `Budget exceeded: ${category}`,
                `Spent ${formatCurrency(spent)} / ${formatCurrency(limit)} this month. Over by ${formatCurrency(overBy)}.`
            );
        }

        for (const sub of Array.isArray(data.subscriptions) ? data.subscriptions : []) {
            const dueDay = Number.parseInt(String(sub.date || ''), 10);
            if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) continue;

            const dueDate = getNextMonthlyDueDate(dueDay, now);
            const dueInDays = daysUntil(dueDate, now);
            if (dueInDays !== 1) continue;

            const duePeriod = toPeriodKey(dueDate);
            const dedupeKey = `subscription:${sub.id}:${duePeriod}`;
            await sendOnce(
                sentMap,
                dedupeKey,
                `Subscription due tomorrow`,
                `${sub.name} (${formatCurrency(toNum(sub.amount))}) is due on ${String(dueDay).padStart(2, '0')}.`
            );
        }

        for (const sip of Array.isArray(data.sips) ? data.sips : []) {
            const dueDay = Number(sip.sipDay);
            if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) continue;

            const dueDate = getNextMonthlyDueDate(dueDay, now);
            const dueInDays = daysUntil(dueDate, now);
            if (dueInDays !== 1) continue;

            const duePeriod = toPeriodKey(dueDate);
            const dedupeKey = `sip:${sip.id}:${duePeriod}`;
            await sendOnce(
                sentMap,
                dedupeKey,
                `SIP due tomorrow`,
                `${sip.investmentName} (${formatCurrency(toNum(sip.monthlyAmount))}) is scheduled on day ${String(dueDay).padStart(2, '0')}.`
            );
        }

        await saveSentMap(sentMap);
    },
};
