import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Send, Users, Paperclip, X, FileText, Check, CheckCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function getChannelLabel(channel, users, currentUserEmail) {
  if (channel === 'group') return 'Team Chat';
  const parts = channel.replace('dm:', '').split(':');
  const otherEmail = parts.find((e) => e !== currentUserEmail);
  const other = users.find((u) => u.email === otherEmail);
  return other?.display_name || other?.full_name || otherEmail || 'Direct Message';
}

function getChannelInitials(channel, users, currentUserEmail) {
  if (channel === 'group') return null; // use icon
  const parts = channel.replace('dm:', '').split(':');
  const otherEmail = parts.find((e) => e !== currentUserEmail);
  const other = users.find((u) => u.email === otherEmail);
  const name = other?.display_name || other?.full_name || otherEmail || '?';
  return name.slice(0, 2).toUpperCase();
}

function FilePreview({ file_url, file_name, file_type }) {
  if (!file_url) return null;
  const isImage = file_type?.startsWith('image/');
  if (isImage) {
    return (
      <a href={file_url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img src={file_url} alt={file_name} className="max-w-[180px] max-h-[180px] rounded-xl object-cover border border-white/20" />
      </a>
    );
  }
  return (
    <a href={file_url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1.5 bg-white/10 rounded-lg px-3 py-2 text-xs hover:bg-white/20 transition-colors">
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[140px]">{file_name || 'Attachment'}</span>
    </a>
  );
}

export default function ChatWindow({ currentUser, displayName, activeChannel, users, allMessages, onMessageSent, onBack }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const messages = (allMessages || []).filter((m) => m.channel === activeChannel);
  const recipientEmail = activeChannel !== 'group'
    ? activeChannel.replace('dm:', '').split(':').find((e) => e !== currentUser?.email)
    : null;

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [messages.length, activeChannel]);

  useEffect(() => {
    setText('');
    setAttachedFile(null);
  }, [activeChannel]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setAttachedFile({ file, preview, name: file.name, type: file.type });
    e.target.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !attachedFile) || !currentUser) return;
    setSending(true);

    let recipientEmailVal = '';
    if (activeChannel !== 'group') {
      const parts = activeChannel.replace('dm:', '').split(':');
      recipientEmailVal = parts.find((em) => em !== currentUser.email) || '';
    }

    let file_url = '', file_name = '', file_type = '';
    if (attachedFile) {
      setUploading(true);
      const result = await base44.integrations.Core.UploadFile({ file: attachedFile.file });
      file_url = result.file_url;
      file_name = attachedFile.name;
      file_type = attachedFile.type;
      setUploading(false);
    }

    await base44.entities.Message.create({
      content: text.trim() || (file_name ? `📎 ${file_name}` : ''),
      sender_email: currentUser.email,
      sender_name: displayName || currentUser.email,
      channel: activeChannel,
      recipient_email: recipientEmailVal,
      ...(file_url && { file_url, file_name, file_type }),
    });

    setText('');
    setAttachedFile(null);
    setSending(false);
    onMessageSent?.();
    // Re-focus input after send on mobile
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const channelLabel = getChannelLabel(activeChannel, users, currentUser?.email);
  const channelInitials = getChannelInitials(activeChannel, users, currentUser?.email);

  return (
    <div className="flex flex-col h-full min-w-0 bg-background md:bg-card">
      {/* Header */}
      <div className="sticky top-0 z-10 px-3 py-3 border-b border-border flex items-center gap-3 bg-background md:bg-card shrink-0">
        {/* Back button — mobile only */}
        {onBack && (
          <button onClick={onBack} className="md:hidden text-muted-foreground hover:text-foreground p-1 -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          {channelInitials
            ? <span className="text-xs font-bold text-primary">{channelInitials}</span>
            : <Users className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{channelLabel}</p>
          {activeChannel === 'group' && (
            <p className="text-xs text-muted-foreground">Everyone</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">No messages yet. Say hi! 👋</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_email === currentUser?.email;
          const prevMsg = messages[i - 1];
          const showSender = !prevMsg || prevMsg.sender_email !== msg.sender_email;
          const date = msg.created_date
            ? formatDistanceToNow(new Date(msg.created_date.endsWith('Z') ? msg.created_date : msg.created_date + 'Z'), { addSuffix: true })
            : '';
          const initials = (msg.sender_name || msg.sender_email || '?').slice(0, 2).toUpperCase();

          // Seen logic: any message from recipient in this channel means they've been active
          const isSeen = activeChannel !== 'group' && allMessages.some(
            (m) => m.sender_email === recipientEmail && m.channel === activeChannel
          );

          const isLastFromMe = isMe && (() => {
            const myMsgs = messages.filter(m => m.sender_email === currentUser?.email);
            return myMsgs[myMsgs.length - 1]?.id === msg.id;
          })();

          return (
            <div key={msg.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row', !showSender && 'mt-0.5')}>
              {/* Avatar — only show on first in a group, keep space otherwise */}
              <div className="w-8 shrink-0 flex items-end">
                {showSender && !isMe && (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {initials}
                  </div>
                )}
              </div>

              <div className={cn('max-w-[78%] flex flex-col', isMe && 'items-end')}>
                {showSender && !isMe && (
                  <span className="text-[11px] font-semibold text-muted-foreground mb-1 ml-1">
                    {msg.sender_name || msg.sender_email}
                  </span>
                )}
                <div className={cn(
                  'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                )}>
                  {msg.content}
                  <FilePreview file_url={msg.file_url} file_name={msg.file_name} file_type={msg.file_type} />
                </div>
                {/* Time + read receipt — only show on last message in a cluster */}
                {(showSender || isLastFromMe) && (
                  <div className={cn('flex items-center gap-1 mt-0.5 px-1', isMe && 'flex-row-reverse')}>
                    <span className="text-[10px] text-muted-foreground">{date}</span>
                    {isMe && isLastFromMe && (
                      <span className="flex items-center text-[10px] text-muted-foreground gap-0.5">
                        {isSeen
                          ? <><CheckCheck className="h-3 w-3 text-primary" /></>
                          : <><Check className="h-3 w-3" /></>}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Attached file preview */}
      {attachedFile && (
        <div className="px-3 py-2 border-t border-border flex items-center gap-2 bg-muted/30 shrink-0">
          {attachedFile.preview
            ? <img src={attachedFile.preview} alt="" className="h-10 w-10 rounded-lg object-cover" />
            : <FileText className="h-5 w-5 text-muted-foreground" />}
          <span className="text-xs text-foreground truncate flex-1">{attachedFile.name}</span>
          <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input bar — sticky above keyboard on mobile */}
      <form
        onSubmit={handleSend}
        className="px-3 py-3 border-t border-border flex gap-2 items-center bg-background md:bg-card shrink-0"
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-colors"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder={`Message ${channelLabel}...`}
          disabled={sending || uploading}
          className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 focus:ring-1 focus:ring-ring"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button
          type="submit"
          disabled={sending || uploading || (!text.trim() && !attachedFile)}
          className="shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95"
        >
          {sending || uploading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}