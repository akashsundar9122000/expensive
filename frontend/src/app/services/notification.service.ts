import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Notification } from './models';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notificationsSubject = new BehaviorSubject<Notification[]>([]);
    public notifications$ = this.notificationsSubject.asObservable();

    private notificationCountSubject = new BehaviorSubject<number>(0);
    public notificationCount$ = this.notificationCountSubject.asObservable();
    private storageKey = 'app_notifications_guest';

    constructor(private authService: AuthService) {
        this.authService.getCurrentUser().subscribe(user => {
            const email = (user?.email || '').trim().toLowerCase();
            this.storageKey = email
                ? `app_notifications_${encodeURIComponent(email)}`
                : 'app_notifications_guest';
            this.loadNotifications();
        });
    }

    /**
     * Check if a notification for this category exists today
     */
    hasNotificationToday(category: string, type: string): boolean {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return this.notificationsSubject.value.some(n => {
            const notifDate = new Date(n.timestamp);
            notifDate.setHours(0, 0, 0, 0);
            return n.category === category && n.type === type && notifDate.getTime() === today.getTime();
        });
    }

    /**
     * Add a new notification
     */
    addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
        const newNotification: Notification = {
            id: this.generateId(),
            ...notification,
            timestamp: new Date(),
        };

        const currentNotifications = this.notificationsSubject.value;
        const updated = [newNotification, ...currentNotifications];
        this.notificationsSubject.next(updated);
        this.updateNotificationCount();
        this.saveNotifications(updated);
    }

    /**
     * Add a budget exceeded notification
     */
    addBudgetExceededNotification(category: string, spent: number, limit: number): void {
        this.addNotification({
            title: `Budget Exceeded: ${category}`,
            message: `You've spent ₹${spent.toFixed(2)} out of ₹${limit.toFixed(2)} for ${category}`,
            type: 'budget-alert',
            icon: 'ph-warning',
            read: false,
            category,
            amount: spent,
            limit
        });
    }

    /**
     * Mark notification as read
     */
    markAsRead(id: string): void {
        const notifications = this.notificationsSubject.value.map(n =>
            n.id === id ? { ...n, read: true } : n
        );
        this.notificationsSubject.next(notifications);
        this.updateNotificationCount();
        this.saveNotifications(notifications);
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead(): void {
        const notifications = this.notificationsSubject.value.map(n => ({ ...n, read: true }));
        this.notificationsSubject.next(notifications);
        this.updateNotificationCount();
        this.saveNotifications(notifications);
    }

    /**
     * Delete a notification
     */
    deleteNotification(id: string): void {
        const notifications = this.notificationsSubject.value.filter(n => n.id !== id);
        this.notificationsSubject.next(notifications);
        this.updateNotificationCount();
        this.saveNotifications(notifications);
    }

    /**
     * Clear all notifications
     */
    clearAll(): void {
        this.notificationsSubject.next([]);
        this.updateNotificationCount();
        this.saveNotifications([]);
    }

    /**
     * Get unread notification count
     */
    getUnreadCount(): Observable<number> {
        return this.notificationCount$;
    }

    /**
     * Get all notifications
     */
    getNotifications(): Observable<Notification[]> {
        return this.notifications$;
    }

    /**
     * Private helper: Update unread count
     */
    private updateNotificationCount(): void {
        const unreadCount = this.notificationsSubject.value.filter(n => !n.read).length;
        this.notificationCountSubject.next(unreadCount);
    }

    /**
     * Private helper: Generate unique ID
     */
    private generateId(): string {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Private helper: Save notifications to localStorage
     */
    private saveNotifications(notifications: Notification[]): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(notifications));
        } catch (error) {
            console.error('Failed to save notifications:', error);
        }
    }

    /**
     * Private helper: Load notifications from localStorage
     */
    private loadNotifications(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const notifications = JSON.parse(stored).map((n: any) => ({
                    ...n,
                    timestamp: new Date(n.timestamp)
                }));
                this.notificationsSubject.next(notifications);
                this.updateNotificationCount();
            } else {
                this.notificationsSubject.next([]);
                this.updateNotificationCount();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            this.notificationsSubject.next([]);
            this.updateNotificationCount();
        }
    }
}
