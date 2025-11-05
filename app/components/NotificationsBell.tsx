"use client";

import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, CheckCircle, Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  message: string;
  created_at: string;
  driver_id?: string;
  type?: 'compliance' | 'maintenance' | 'hr' | 'system';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  read?: boolean;
}

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  useEffect(() => {
    loadNotifications();
    
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(pollNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notifications?limit=25', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}`,
        },
      });
      
      const data = await response.json();
      if (data.ok && data.items) {
        setNotifications(data.items.map((item: any) => ({
          ...item,
          type: classifyNotificationType(item.message),
          priority: classifyPriority(item.message),
          read: false
        })));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollNotifications = async () => {
    try {
      const response = await fetch(`/api/admin/notifications?limit=10&since=${lastFetch.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}`,
        },
      });
      
      const data = await response.json();
      if (data.ok && data.items && data.items.length > 0) {
        const newNotifications = data.items.map((item: any) => ({
          ...item,
          type: classifyNotificationType(item.message),
          priority: classifyPriority(item.message),
          read: false
        }));
        
        setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
        setLastFetch(new Date());
        
        // Show browser notification for critical items
        if ('Notification' in window && Notification.permission === 'granted') {
          const criticalItems = newNotifications.filter((n: any) => n.priority === 'critical');
          criticalItems.forEach((item: any) => {
            new Notification('Ronyx Logistics - Critical Alert', {
              body: item.message,
              icon: '/favicon.ico',
              tag: item.id
            });
          });
        }
      }
    } catch (error) {
      console.error('Error polling notifications:', error);
    }
  };

  const classifyNotificationType = (message: string): 'compliance' | 'maintenance' | 'hr' | 'system' => {
    const msg = message.toLowerCase();
    if (msg.includes('compliance') || msg.includes('expir') || msg.includes('dot')) return 'compliance';
    if (msg.includes('maintenance') || msg.includes('dvir') || msg.includes('defect')) return 'maintenance';
    if (msg.includes('driver') || msg.includes('employee') || msg.includes('hr')) return 'hr';
    return 'system';
  };

  const classifyPriority = (message: string): 'low' | 'medium' | 'high' | 'critical' => {
    const msg = message.toLowerCase();
    if (msg.includes('critical') || msg.includes('urgent') || msg.includes('immediate')) return 'critical';
    if (msg.includes('expires today') || msg.includes('overdue')) return 'high';
    if (msg.includes('expires') || msg.includes('due')) return 'medium';
    return 'low';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'compliance': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'maintenance': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'hr': return <User className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 border-red-200';
      case 'high': return 'bg-orange-100 border-orange-200';
      case 'medium': return 'bg-yellow-100 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.priority === 'critical' && !n.read).length;

  // Request notification permission on first render
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant={criticalCount > 0 ? "destructive" : "secondary"}
            className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs min-w-[1.25rem] h-5 flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <Clock className="w-5 h-5 mx-auto mb-2" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 20).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    } ${getPriorityColor(notification.priority || 'low')}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type || 'system')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 break-words">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {notification.priority === 'critical' && (
                        <Badge variant="destructive" className="text-xs">
                          CRITICAL
                        </Badge>
                      )}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t bg-gray-50 p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                className="w-full text-sm"
              >
                Mark All as Read
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}