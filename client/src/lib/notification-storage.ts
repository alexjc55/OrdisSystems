const STORAGE_KEY = 'edahouse_notifications';
const MAX_AGE_DAYS = 7;
const MAX_NOTIFICATIONS = 50;

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  type: 'order' | 'marketing' | 'system';
  timestamp: number;
  read: boolean;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getAll(): StoredNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredNotification[];
  } catch {
    return [];
  }
}

function saveAll(notifications: StoredNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
  }
}

function cleanup(notifications: StoredNotification[]): StoredNotification[] {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return notifications
    .filter(n => n.timestamp > cutoff)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_NOTIFICATIONS);
}

export function addNotification(title: string, body: string, type: 'order' | 'marketing' | 'system' = 'marketing'): StoredNotification {
  const notification: StoredNotification = {
    id: generateId(),
    title,
    body,
    type,
    timestamp: Date.now(),
    read: false
  };
  const all = cleanup(getAll());
  all.unshift(notification);
  saveAll(all);
  window.dispatchEvent(new CustomEvent('notifications-updated'));
  return notification;
}

export function getNotifications(): StoredNotification[] {
  const all = cleanup(getAll());
  saveAll(all);
  return all;
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length;
}

export function markAsRead(id: string) {
  const all = getAll();
  const n = all.find(x => x.id === id);
  if (n) {
    n.read = true;
    saveAll(all);
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  }
}

export function markAllAsRead() {
  const all = getAll();
  all.forEach(n => { n.read = true; });
  saveAll(all);
  window.dispatchEvent(new CustomEvent('notifications-updated'));
}

export function clearNotifications() {
  saveAll([]);
  window.dispatchEvent(new CustomEvent('notifications-updated'));
}
