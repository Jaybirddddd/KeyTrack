import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, MessageSquare, KeyRound, Car, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'notifications_seen_at';

function getSeenAt() {
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
}

function saveSeenAt(ts) {
  localStorage.setItem(STORAGE_KEY, String(ts));
}

export default function NotificationBell() {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [seenAt, setSeenAt] = useState(getSeenAt);
  const panelRef = useRef(null);

  const buildNotifications = (messages, keyLogs, cars) => {
    const items = [];

    // New messages from others
    for (const m of messages) {
      if (m.sender_email === user?.email) continue;
      const label = m.channel === 'group'
        ? `${m.sender_name || m.sender_email} in Team Chat`
        : `${m.sender_name || m.sender_email} (DM)`;
      items.push({
        id: `msg-${m.id}`,
        icon: 'message',
        title: label,
        body: m.content?.slice(0, 60) || '📎 Attachment',
        ts: new Date(m.created_date || 0).getTime(),
        link: '/messages',
      });
    }

    // Key log events
    for (const k of keyLogs) {
      const action = k.action === 'checked_out' ? 'checked out' : 'returned';
      items.push({
        id: `key-${k.id}`,
        icon: 'key',
        title: `Key ${action}`,
        body: `${k.person} — ${k.car_label || k.stock_number || ''}`,
        ts: new Date(k.created_date || 0).getTime(),
        link: '/keys',
      });
    }

    // New cars added
    for (const c of cars) {
      items.push({
        id: `car-${c.id}`,
        icon: 'car',
        title: 'Vehicle added',
        body: `${c.year || ''} ${c.make || ''} ${c.model || ''} — Stock #${c.stock_number}`.trim(),
        ts: new Date(c.created_date || 0).getTime(),
        link: '/inventory',
      });
    }

    return items.sort((a, b) => b.ts - a.ts).slice(0, 40);
  };

  const fetchAll = async () => {
    if (!user) return;
    const [messages, keyLogs, cars] = await Promise.all([
      base44.entities.Message.list('-created_date', 200),
      base44.entities.KeyLog.list('-created_date', 100),
      base44.entities.Car.list('-created_date', 50),
    ]);
    setNotifications(buildNotifications(messages, keyLogs, cars));
  };

  useEffect(() => {
    if (!user) return;
    fetchAll();
    // Throttle: real-time events only trigger a refetch at most once every 30s
    let lastFetch = Date.now();
    const throttledFetch = () => {
      const now = Date.now();
      if (now - lastFetch > 30000) {
        lastFetch = now;
        fetchAll();
      }
    };
    const unsubs = [
      base44.entities.Message.subscribe(throttledFetch),
      base44.entities.KeyLog.subscribe(throttledFetch),
      base44.entities.Car.subscribe(throttledFetch),
    ];
    // Poll every 60s instead of 15s
    const interval = setInterval(fetchAll, 60000);
    return () => {
      unsubs.forEach((u) => u());
      clearInterval(interval);
    };
  }, [user?.email]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifications.filter((n) => n.ts > seenAt).length;

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) {
      const now = Date.now();
      saveSeenAt(now);
      setSeenAt(now);
    }
  };

  const iconFor = (type) => {
    if (type === 'message') return <MessageSquare className="h-4 w-4 text-primary" />;
    if (type === 'key') return <KeyRound className="h-4 w-4 text-secondary" />;
    return <Car className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
      >
        <Bell className={cn('h-4 w-4', unread > 0 ? 'text-foreground' : 'text-muted-foreground')} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-1rem)] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm">Notifications</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
            ) : (
              notifications.map((n) => {
                const isNew = n.ts > seenAt;
                return (
                  <Link
                    key={n.id}
                    to={n.link}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0',
                      isNew && 'bg-primary/5'
                    )}
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      {iconFor(n.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-xs font-semibold truncate', isNew && 'text-foreground')}>{n.title}</p>
                        {isNew && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.ts), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}