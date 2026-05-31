import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) => {
    const notif: Notification = { ...n, id: Math.random().toString(36), read: false, createdAt: new Date() };
    set(state => ({
      notifications: [notif, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },
  markRead: (id) => set(state => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),
  markAllRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
