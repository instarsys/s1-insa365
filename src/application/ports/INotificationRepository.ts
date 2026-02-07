export interface NotificationDto {
  id: string;
  companyId: string;
  userId: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  link: string | null;
  createdAt: string;
}

export interface CreateNotificationData {
  companyId: string;
  userId: string;
  type: string;
  priority?: string;
  title: string;
  message: string;
  link?: string;
}

export interface INotificationRepository {
  findByUser(companyId: string, userId: string, unreadOnly?: boolean): Promise<NotificationDto[]>;
  create(data: CreateNotificationData): Promise<NotificationDto>;
  createMany(data: CreateNotificationData[]): Promise<number>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(companyId: string, userId: string): Promise<void>;
  countUnread(companyId: string, userId: string): Promise<number>;
}
