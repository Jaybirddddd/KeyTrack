import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConversationList({ currentUser, users, activeChannel, onSelect, unreadCounts = {} }) {
  const otherUsers = users.filter((u) => u.email !== currentUser?.email);

  return (
    <div className="w-full md:w-64 flex flex-col bg-muted/20 h-full">
      <div className="px-4 py-4 border-b border-border">
        <h2 className="text-base font-bold text-foreground">Messages</h2>
      </div>

      {/* Group channel */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Channels</p>
        <ChannelButton
          label="Team Chat"
          sublabel="Everyone"
          icon={
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
          }
          active={activeChannel === 'group'}
          unread={unreadCounts['group'] || 0}
          onClick={() => onSelect('group')}
        />
      </div>

      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Direct Messages</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {otherUsers.map((u) => {
          const key = 'dm:' + [currentUser?.email, u.email].sort().join(':');
          const name = u.display_name || u.full_name || u.email;
          const initials = name.slice(0, 2).toUpperCase();
          return (
            <ChannelButton
              key={u.id || u.email}
              label={name}
              sublabel={u.role || ''}
              icon={
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {initials}
                </div>
              }
              active={activeChannel === key}
              unread={unreadCounts[key] || 0}
              onClick={() => onSelect(key)}
            />
          );
        })}
        {otherUsers.length === 0 && (
          <p className="px-3 py-3 text-sm text-muted-foreground">No other users yet.</p>
        )}
      </div>
    </div>
  );
}

function ChannelButton({ label, sublabel, icon, active, unread, onClick }) {
  return (
    <button
      className={cn(
        'flex items-center gap-3 px-2 py-2.5 text-sm w-full text-left rounded-xl transition-colors',
        active ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60 text-foreground'
      )}
      onClick={onClick}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium truncate text-sm leading-tight', active && 'text-primary')}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground capitalize truncate leading-tight mt-0.5">{sublabel}</p>}
      </div>
      {unread > 0 && (
        <span className="shrink-0 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}