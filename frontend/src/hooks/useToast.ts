import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastList: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach(l => l([...toastList]));
}

export function toast(t: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36);
  const newToast = { ...t, id };
  toastList = [newToast, ...toastList];
  notifyListeners();
  setTimeout(() => {
    toastList = toastList.filter(item => item.id !== id);
    notifyListeners();
  }, t.duration || 4000);
}

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter(l => l !== setToasts);
    };
  }, []);
  return toasts;
}
