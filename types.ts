
export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
}

export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface User {
  id: string;
  phoneNumber: string;
  password?: string; // Should be handled securely
  name: string;
  role: UserRole;
  status: UserStatus;
}

export interface WarehouseItem {
  id: string;
  name: string;
  quantity: number;
}

export enum BoxStatus {
  ACTIVE = 'نشط',
  DELIVERED = 'تم التسليم',
  RETURNED = 'تم الإرجاع',
}

export enum ItemCondition {
  NEW = 'جديد',
  USED = 'مستخدم',
  DAMAGED = 'تالف',
}

export interface BoxItem {
  id: string; // warehouse item id
  name: string;
  quantity: number;
  condition: ItemCondition;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface BoxActivityLog {
    id: string;
    text: string;
    timestamp: number;
    userName: string;
}

export interface Box {
  id: string;
  boxNumber?: string;
  recipientName?: string;
  siteName?: string;
  createdAt: number;
  status: BoxStatus;
  items: Record<string, BoxItem>;
  comments: Record<string, Comment>;
  activityLog: Record<string, BoxActivityLog>;
}

export interface DamagedItem {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  reason: string;
  responsiblePersonName: string;
  timestamp: number;
  fromBoxId?: string;
}

export interface ActivityLog {
  id: string;
  text: string;
  timestamp: number;
}
