import type { INotificationRepository, NotificationDto, CreateNotificationData } from '../../ports/INotificationRepository';

export class CreateNotificationUseCase {
  constructor(private notificationRepo: INotificationRepository) {}

  async execute(data: CreateNotificationData): Promise<NotificationDto> {
    return this.notificationRepo.create(data);
  }

  async executeBulk(data: CreateNotificationData[]): Promise<number> {
    return this.notificationRepo.createMany(data);
  }
}
