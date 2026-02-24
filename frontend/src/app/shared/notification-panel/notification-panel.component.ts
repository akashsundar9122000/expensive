import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { Observable } from 'rxjs';
import { Notification } from '../../services/models';

@Component({
    selector: 'app-notification-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification-panel.component.html',
    styleUrl: './notification-panel.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationPanelComponent implements OnInit {
    @Input() showPanel = false;
    @Output() panelClosed = new EventEmitter<void>();

    notifications$!: Observable<Notification[]>;
    unreadCount$!: Observable<number>;

    constructor(private notificationService: NotificationService) {}

    ngOnInit(): void {
        this.notifications$ = this.notificationService.getNotifications();
        this.unreadCount$ = this.notificationService.getUnreadCount();
    }

    markAsRead(id: string): void {
        this.notificationService.markAsRead(id);
    }

    markAllAsRead(): void {
        this.notificationService.markAllAsRead();
    }

    deleteNotification(id: string): void {
        this.notificationService.deleteNotification(id);
    }

    clearAll(): void {
        this.notificationService.clearAll();
    }

    closePanel(): void {
        this.panelClosed.emit();
    }

    formatTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    getIconForType(type: string): string {
        const iconMap: { [key: string]: string } = {
            'budget-alert': 'ph-warning-circle',
            'warning': 'ph-warning',
            'info': 'ph-info',
            'success': 'ph-check-circle'
        };
        return iconMap[type] || 'ph-bell';
    }
}
