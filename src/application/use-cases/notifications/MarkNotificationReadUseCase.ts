import type { INotificationRepository } from '../../ports/INotificationRepository';

export class MarkNotificationReadUseCase {
  constructor(private notificationRepo: INotificationRepository) {}

  async execute(notificationId: string): Promise<void> {
    await this.notificationRepo.markAsRead(notificationId);
  }

  async executeAll(companyId: string, userId: string): Promise<void> {
    await this.notificationRepo.markAllAsRead(companyId, userId);
  }
}
