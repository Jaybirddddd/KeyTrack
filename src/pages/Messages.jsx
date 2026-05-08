import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import ConversationList from '@/components/messages/ConversationList';
import ChatWindow from '@/components/messages/ChatWindow';

function buildUnreadCounts(messages, currentUserEmail) {
  const key = `messages_seen_${currentUserEmail}`;
  const seen = JSON.parse(localStorage.getItem(key) || '{}');
  const counts = {};
  for (const msg of messages) {
    if (msg.sender_email === currentUserEmail) continue;
    const ch = msg.channel;
    if (!ch) continue;
    const seenAt = seen[ch] || 0;
    const msgTime = new Date(msg.created_date || 0).getTime();
    if (msgTime > seenAt) {
      counts[ch] = (counts[ch] || 0) + 1;
    }
  }
  return counts;
}

export default function Messages() {
  const { user: currentUser, displayName } = useCurrentUser();
  const [activeChannel, setActiveChannel] = useState(null); // null = show list on mobile
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  // Register current user in the shared contact directory
  useEffect(() => {
    if (!currentUser?.email) return;
    const upsertContact = async () => {
      const existing = await base44.entities.UserContact.filter({ email: currentUser.email });
      const name = currentUser.data?.display_name || currentUser.display_name || currentUser.full_name || currentUser.email;
      if (existing?.length > 0) {
        await base44.entities.UserContact.update(existing[0].id, { display_name: name, role: currentUser.role });
      } else {
        await base44.entities.UserContact.create({ email: currentUser.email, display_name: name, role: currentUser.role });
      }
    };
    upsertContact();
  }, [currentUser?.email]);

  const { data: allContacts = [] } = useQuery({
    queryKey: ['user_contacts'],
    queryFn: () => base44.entities.UserContact.list(),
    refetchInterval: 15000,
  });

  const { data: messages = [], refetch } = useQuery({
    queryKey: ['messages', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const [sent, received, group] = await Promise.all([
        base44.entities.Message.filter({ sender_email: currentUser.email }, '-created_date', 500),
        base44.entities.Message.filter({ recipient_email: currentUser.email }, '-created_date', 500),
        base44.entities.Message.filter({ channel: 'group' }, '-created_date', 200),
      ]);
      const seen = new Set();
      return [...sent, ...received, ...group].filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    },
    enabled: !!currentUser?.email,
    refetchInterval: 5000,
  });

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.Message.subscribe(() => refetch());
    return unsub;
  }, [refetch]);

  // Mark channel as seen when switching
  useEffect(() => {
    if (!currentUser?.email || !activeChannel) return;
    const key = `messages_seen_${currentUser.email}`;
    const seen = JSON.parse(localStorage.getItem(key) || '{}');
    seen[activeChannel] = Date.now();
    localStorage.setItem(key, JSON.stringify(seen));
  }, [activeChannel, currentUser?.email]);

  // Default to group on desktop, nothing selected on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) setActiveChannel('group');
  }, []);

  const unreadCounts = currentUser?.email ? buildUnreadCounts(messages, currentUser.email) : {};

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)
  );

  const mergedContacts = (() => {
    const map = new Map();
    for (const c of allContacts) {
      if (c.email !== currentUser?.email) map.set(c.email, { ...c, full_name: c.display_name || c.email });
    }
    for (const msg of messages) {
      const add = (email, name) => {
        if (email && email !== currentUser?.email && !map.has(email)) {
          map.set(email, { email, full_name: name || email, id: email });
        }
      };
      add(msg.sender_email, msg.sender_name);
      if (msg.recipient_email) add(msg.recipient_email, null);
    }
    return Array.from(map.values());
  })();

  const handleSelectChannel = (channel) => {
    setActiveChannel(channel);
    setMobileView('chat');
  };

  const handleBack = () => {
    setMobileView('list');
  };

  return (
    <div className="flex flex-1 min-h-0 md:h-[calc(100vh-8rem)] rounded-none md:rounded-xl border-0 md:border md:border-border overflow-hidden bg-background md:bg-card">
      {/* Conversation List — full screen on mobile when mobileView==='list', side panel on desktop */}
      <div className={`
        ${mobileView === 'list' ? 'flex' : 'hidden'} md:flex
        w-full md:w-64 shrink-0 border-r border-border flex-col bg-muted/20
      `}>
        <ConversationList
          currentUser={currentUser}
          users={mergedContacts}
          activeChannel={activeChannel}
          onSelect={handleSelectChannel}
          unreadCounts={unreadCounts}
        />
      </div>

      {/* Chat Window — full screen on mobile when mobileView==='chat', flex-1 on desktop */}
      <div className={`
        ${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex
        flex-1 flex-col min-w-0
      `}>
        {activeChannel ? (
          <ChatWindow
            currentUser={currentUser}
            displayName={displayName}
            activeChannel={activeChannel}
            users={mergedContacts}
            allMessages={sortedMessages}
            onMessageSent={refetch}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}