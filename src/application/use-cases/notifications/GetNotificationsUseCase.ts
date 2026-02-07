import type { INotificationRepository, NotificationDto } from '../../ports/INotificationRepository';

export interface NotificationsResult {
  notifications: NotificationDto[];
  unreadCount: number;
}

export class GetNotificationsUseCase {
  constructor(private notificationRepo: INotificationRepository) {}

  async execute(companyId: string, userId: string, unreadOnly?: boolean): Promise<NotificationsResult> {
    const notifications = await this.notificationRepo.findByUser(companyId, userId, unreadOnly);
    const unreadCount = await this.notificationRepo.countUnread(companyId, userId);

    return { notifications, unreadCount };
  }
}
