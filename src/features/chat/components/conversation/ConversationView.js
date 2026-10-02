import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaArchive, FaCloudUploadAlt, FaHashtag, FaHeadphones, FaPaperPlane } from "react-icons/fa";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { useToast } from "../../../../shared/context/ToastContext";
import {
  buildPreview, CHANNEL_TYPES, extractMentionIds, getDmPartnerIds, getUserDisplayName, hasReadMessage, INBOX_KINDS,
  isChannelMember, isMuted, isStarred,
} from "../../../../shared/services/chat/chatModel";
import { useChannelMessages, usePinnedMessages, useReadReceipts, useTypingUsers } from "../../hooks/useChatSubscriptions";
import { useMessageHandlers } from "../../hooks/useMessageHandlers";
import { parseSlashCommand, parseStatusArgs } from "../../utils/slashCommands";
import { formatScheduledTime, parseReminderInput } from "../../utils/chatSchedule";
import { resolveGifKey } from "../../utils/chatGifs";
import { useHuddle } from "../../huddle/HuddleContext";
import MessageComposer from "../composer/MessageComposer";
import UserAvatar from "../common/UserAvatar";
import MessageList from "./MessageList";
import ConversationHeader, { ChannelIntro, TypingIndicator } from "./ConversationHeader";

function HuddleBar({ channelId, usersById }) {
  const huddle = useHuddle();
  const live = huddle?.huddles?.[channelId];
  if (!live || huddle?.current?.channelId === channelId) return null;
  return (
    <div className="flex flex-shrink-0 items-center gap-3 border-b border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-5 py-2" data-testid="chat-huddle-bar">
      <FaHeadphones className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      <span className="flex -space-x-1.5">
        {live.participants.slice(0, 5).map((entry) => <UserAvatar key={entry.id} user={usersById[entry.id]} size="xs" className="ring-2 ring-emerald-50 dark:ring-[#16302a]" />)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-emerald-800 dark:text-emerald-200">
        <b>Huddle in progress</b> · {live.participants.map((entry) => getUserDisplayName(usersById[entry.id]).split(" ")[0]).join(", ")}
      </span>
      <button type="button" onClick={() => huddle.join(channelId)} className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500">Join</button>
    </div>
  );
}

/** "Seen" receipts under your last message in DMs and small private channels. */
function ReceiptLine({ message, receipts, usersById, isOneToOne }) {
  const readers = Object.entries(receipts)
    .filter(([, state]) => hasReadMessage({ readSeq: { [message.channelId]: state.readSeq } }, message))
    .map(([id]) => id);
  if (!readers.length) return null;
  if (isOneToOne) return <p className="mt-0.5 text-[11px] text-slate-400" data-testid="chat-seen">Seen</p>;
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400" data-testid="chat-seen">
      <span className="flex -space-x-1">
        {readers.slice(0, 6).map((id) => <UserAvatar key={id} user={usersById[id]} size="xs" className="ring-1 ring-white dark:ring-[#141720]" />)}
      </span>
      Seen by {readers.length === 1 ? getUserDisplayName(usersById[readers[0]]).split(" ")[0] : `${readers.length} people`}
    </p>
  );
}

export default function ConversationView({
  channel,
  ctx,
  pageApi,
  rightPanel,
  highlightId,
  onHighlightDone,
  getDraft,
  setDraft,
  isMobile,
  canCreateTask,
}) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const huddle = useHuddle();
  const { uid, usersById, userState, presence, activeUsers, channels } = chat;
  const [editingId, setEditingId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [quote, setQuote] = useState(null);
  const composerRef = useRef(null);
  const atBottomRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const suppressReadRef = useRef(null);

  const { messages, hasMore, loading, error, loadMore } = useChannelMessages(channel.id);
  const pinned = usePinnedMessages(channel.id);
  const typingUserIds = useTypingUsers(channel.id);
  const isDm = channel.type === CHANNEL_TYPES.DM;
  const receiptsEnabled = isDm || (channel.isPrivate && channel.memberIds.length <= 8);
  const receipts = useReadReceipts(channel, uid, receiptsEnabled);

  const quoteMessage = useCallback((message) => {
    setQuote({
      messageId: message.id,
      channelId: message.channelId,
      threadRootId: message.sharedFromThread ? null : message.threadRootId || null,
      authorId: message.authorId,
      createdAt: message.createdAt,
      preview: buildPreview(message.text, message.attachments, { usersById, channelsById: chat.channelsById }).slice(0, 300),
    });
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }, [chat.channelsById, usersById]);

  const viewPageApi = useMemo(() => ({ ...pageApi, suppressAutoRead: (id) => { suppressReadRef.current = id; } }), [pageApi]);
  const { handlers, canEditMessage, canDeleteMessage, canPin, encode, reportError } = useMessageHandlers({
    channel,
    pageApi: viewPageApi,
    setEditingId,
    canCreateTask,
    onQuote: quoteMessage,
  });

  const member = isChannelMember(channel, uid);
  const muted = isMuted(channel.id, userState);
  const starred = isStarred(channel.id, userState);
  const memberIds = channel.isDefault ? null : channel.memberIds;

  // Mark as read while the latest messages are on screen.
  const readSeq = Number(userState?.readSeq?.[channel.id]) || 0;
  const markedUnread = Boolean(userState?.markedUnread?.[channel.id]);
  const hasUnreadMentions = chat.inbox.some((item) => !item.read && item.channelId === channel.id && item.kind === INBOX_KINDS.MENTION && !item.threadRootId);
  useEffect(() => {
    if (!member || loading) return undefined;
    if (suppressReadRef.current === channel.id) return undefined;
    // "Mark unread" sticks for the rest of this visit; reopening the channel reads it again.
    if (!(channel.seq > readSeq || hasUnreadMentions || markedUnread)) return undefined;
    if (!atBottom) return undefined;
    const run = () => { if (document.visibilityState !== "hidden") actions.markChannelRead(channel.id); };
    const timer = window.setTimeout(run, 400);
    document.addEventListener("visibilitychange", run);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", run); };
  }, [actions, atBottom, channel.id, channel.seq, hasUnreadMentions, loading, markedUnread, member, readSeq]);

  const handleAtBottomChange = useCallback((value) => {
    atBottomRef.current = value;
    setAtBottom(value);
  }, []);

  const lastReadAt = Number(userState?.lastReadAt?.[channel.id]) || 0;
  const threadUnreadIds = useMemo(() => new Set(
    chat.inbox.filter((item) => !item.read && item.kind === INBOX_KINDS.THREAD && item.channelId === channel.id).map((item) => item.threadRootId)
  ), [channel.id, chat.inbox]);
  const savedIds = useMemo(() => new Set(Object.keys(userState?.saved || {})), [userState?.saved]);
  const scheduledHere = useMemo(
    () => Object.values(userState?.scheduled || {}).filter((entry) => entry.channelId === channel.id && !entry.threadRootId).sort((a, b) => a.at - b.at),
    [channel.id, userState?.scheduled]
  );

  const partners = isDm ? getDmPartnerIds(channel, uid) : [];
  const isOneToOne = isDm && partners.length === 1 && partners[0] !== uid;
  const lastOwn = useMemo(
    () => [...messages].reverse().find((message) => !message.system && !message.pending && message.authorId === uid && message.seq),
    [messages, uid]
  );
  const footerFor = receiptsEnabled && lastOwn
    ? { messageId: lastOwn.id, node: <ReceiptLine message={lastOwn} receipts={receipts} usersById={usersById} isOneToOne={isOneToOne} /> }
    : null;

  const editLast = useCallback(() => {
    const own = [...messages].reverse().find((message) => canEditMessage(message) && !message.poll);
    if (own) setEditingId(own.id);
  }, [canEditMessage, messages]);

  const runCommand = useCallback(async (command) => {
    switch (command.id) {
      case "task":
        pageApi.openCreateTask({ channel, title: command.args });
        return true;
      case "poll":
        pageApi.openCreatePoll(channel);
        return true;
      case "summarize":
        pageApi.openSummary();
        return true;
      case "huddle":
        huddle?.join(channel.id);
        return true;
      case "remind": {
        const parsed = parseReminderInput(command.args);
        if (!parsed) {
          addToast("Try /remind in 30m review the PR · /remind tomorrow standup notes · /remind at 15:00 deploy", "warning", 5000);
          return false;
        }
        await actions.addReminder({ at: parsed.at, text: parsed.text || `Check ${isDm ? chat.getChannelName(channel) : `#${channel.name}`}` });
        addToast(`Reminder set for ${formatScheduledTime(parsed.at)}`, "success");
        return true;
      }
      case "topic":
        if (isDm || member) {
          await actions.updateChannel(channel.id, { topic: command.args }, { type: "topic", topic: command.args });
        } else addToast("Join the channel to change its topic.", "warning");
        return true;
      case "shrug":
        await actions.sendMessage({ channelId: channel.id, text: encode(`${command.args} ¯\\_(ツ)_/¯`.trim()) });
        return true;
      case "me":
        if (!command.args) return false;
        await actions.sendMessage({ channelId: channel.id, text: "", system: { type: "me", text: command.args.slice(0, 300) } });
        return true;
      case "status": {
        const status = parseStatusArgs(command.args);
        await actions.setCustomStatus(status);
        addToast(status ? `Status set: ${status.emoji} ${status.text}` : "Status cleared", "info");
        return true;
      }
      case "away": {
        const away = !presence?.[uid]?.away;
        await actions.setMyPresence({ away });
        addToast(away ? "You're set to away" : "You're active again", "info");
        return true;
      }
      case "mute":
        await actions.toggleMute(channel.id);
        addToast(muted ? "Conversation unmuted" : "Conversation muted", "info");
        return true;
      case "leave":
        if (isDm || channel.isDefault) { addToast("You can't leave this conversation.", "warning"); return true; }
        pageApi.leaveChannel(channel);
        return true;
      case "invite": {
        if (isDm) { addToast("Start a new group conversation to add people to a DM.", "warning"); return true; }
        const ids = extractMentionIds(encode(command.args)).filter((id) => !channel.memberIds.includes(id));
        if (!ids.length) { pageApi.openAddPeople(channel); return true; }
        await actions.addMembers(channel.id, ids);
        addToast(`Added ${ids.length} ${ids.length === 1 ? "person" : "people"}`, "success");
        return true;
      }
      default:
        return false;
    }
  }, [actions, addToast, channel, chat, encode, huddle, isDm, member, muted, pageApi, presence, uid]);

  const handleSubmit = useCallback(async ({ text, attachments }) => {
    const command = !attachments.length && !quote ? parseSlashCommand(text) : null;
    try {
      if (command) return await runCommand(command);
      const encoded = encode(text);
      const extra = quote ? { quote } : null;
      actions.sendMessage({ channelId: channel.id, text: encoded, attachments, extra }).catch(reportError);
      setQuote(null);
      return true;
    } catch (err) {
      reportError(err);
      return false;
    }
  }, [actions, channel.id, encode, quote, reportError, runCommand]);

  const handleSchedule = useCallback(({ text, at }) => {
    if (!at) {
      pageApi.openSchedule({ channelId: channel.id, text, onCancel: () => composerRef.current?.setText(text) });
      return true;
    }
    return actions.scheduleMessage({ channelId: channel.id, text: encode(text), at })
      .then(() => { addToast(`Message scheduled for ${formatScheduledTime(at)}`, "success"); return true; })
      .catch((err) => { reportError(err); return false; });
  }, [actions, addToast, channel.id, encode, pageApi, reportError]);

  const draftKey = channel.id;
  const placeholder = isDm ? `Message ${chat.getChannelName(channel)}` : `Message #${channel.name}`;

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length && member && !channel.archived) composerRef.current?.addFiles(files);
  };

  const deactivatedPartner = isOneToOne && usersById[partners[0]]?.deactivated;

  return (
    <section
      className="relative flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-[#141720]"
      onDragEnter={(event) => { if (event.dataTransfer?.types?.includes("Files")) setDragging(true); }}
      onDragOver={(event) => { if (event.dataTransfer?.types?.includes("Files")) event.preventDefault(); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={onDrop}
      aria-label={placeholder}
    >
      <ConversationHeader
        channel={channel}
        chat={chat}
        starred={starred}
        muted={muted}
        rightPanel={rightPanel}
        pinnedCount={pinned.length}
        isMobile={isMobile}
        onBack={pageApi.backToList}
        onToggleStar={() => actions.toggleStar(channel.id).catch(reportError)}
        onToggleMute={() => actions.toggleMute(channel.id).then(() => addToast(muted ? "Conversation unmuted" : "Conversation muted", "info")).catch(reportError)}
        onOpenDetails={(tab) => pageApi.openDetails(tab)}
        onOpenSearch={pageApi.openSearch}
        onOpenProfile={pageApi.openProfile}
        onAddPeople={() => pageApi.openAddPeople(channel)}
        onLeave={() => pageApi.leaveChannel(channel)}
        onHide={() => pageApi.hideDm(channel)}
        onMarkRead={() => actions.markChannelRead(channel.id)}
        onSetNotifyLevel={(level) => actions.setNotifyLevel(channel.id, level).catch(reportError)}
        onCatchUp={pageApi.openSummary}
      />

      <HuddleBar channelId={channel.id} usersById={usersById} />

      {error && (
        <div className="px-5 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-300 border-b border-red-200 dark:border-red-500/20">{error}</div>
      )}

      <MessageList
        conversationId={channel.id}
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        loadMore={loadMore}
        lastReadAt={lastReadAt}
        ctx={ctx}
        channel={channel}
        handlers={handlers}
        editingId={editingId}
        highlightId={highlightId}
        onHighlightDone={onHighlightDone}
        savedIds={savedIds}
        canEditMessage={canEditMessage}
        canDeleteMessage={canDeleteMessage}
        canPin={canPin && member}
        canCreateTask={canCreateTask}
        threadUnreadIds={threadUnreadIds}
        onAtBottomChange={handleAtBottomChange}
        onMarkRead={() => actions.markChannelRead(channel.id)}
        footerFor={footerFor}
        intro={(
          <ChannelIntro
            channel={channel}
            chat={chat}
            onOpenDetails={pageApi.openDetails}
            onAddPeople={() => pageApi.openAddPeople(channel)}
            onOpenProfile={pageApi.openProfile}
          />
        )}
      />

      <div className="flex-shrink-0 px-3 md:px-5 pb-3 pt-1">
        {scheduledHere.length > 0 && member && (
          <button type="button" onClick={() => pageApi.openLater("scheduled")} className="mb-1.5 flex w-full items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 text-left text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/15" data-testid="chat-scheduled-bar">
            <FaPaperPlane className="w-3 h-3" />
            {scheduledHere.length === 1
              ? <>1 message scheduled for {formatScheduledTime(scheduledHere[0].at)}</>
              : <>{scheduledHere.length} scheduled messages · next {formatScheduledTime(scheduledHere[0].at)}</>}
            <span className="ml-auto font-semibold">View</span>
          </button>
        )}
        {channel.archived ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-[#2a3044] px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            <FaArchive className="w-3.5 h-3.5" /> This channel is archived. Messages are read-only.
          </div>
        ) : !member ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#1c2030] px-4 py-3">
            <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <FaHashtag className="w-3 h-3" /> You're viewing <b>{channel.name}</b>. Join to post messages.
            </p>
            <button
              type="button"
              onClick={() => actions.joinChannel(channel.id).then(() => addToast(`Joined #${channel.name}`, "success")).catch(reportError)}
              className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Join channel
            </button>
          </div>
        ) : (
          <>
            <TypingIndicator userIds={typingUserIds} usersById={usersById} />
            <MessageComposer
              key={draftKey}
              ref={composerRef}
              placeholder={placeholder}
              initialText={getDraft(draftKey)}
              rich={userState?.prefs?.richComposer !== false}
              users={activeUsers}
              memberIds={memberIds}
              channels={channels}
              presence={presence}
              customEmoji={chat.customEmoji}
              searchEntities={ctx.searchEntities}
              gifKey={resolveGifKey(chat.workspace)}
              quote={quote}
              quoteLabel={quote ? getUserDisplayName(usersById[quote.authorId]) : null}
              onClearQuote={() => setQuote(null)}
              onCreatePoll={() => pageApi.openCreatePoll(channel)}
              onSchedule={handleSchedule}
              enterToSend={userState?.prefs?.enterToSend !== false}
              autoFocus={!isMobile}
              disabled={Boolean(deactivatedPartner)}
              disabledReason={deactivatedPartner ? "This account has been deactivated. You can read the history but can't send new messages." : ""}
              onSubmit={handleSubmit}
              onDraftChange={(value) => setDraft(draftKey, value)}
              onTyping={(typing) => actions.setTyping(channel.id, typing)}
              onEditLast={editLast}
              onError={reportError}
            />
          </>
        )}
      </div>

      {dragging && member && !channel.archived && (
        <div className="pointer-events-none absolute inset-2 z-30 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500 bg-blue-50/90 dark:bg-blue-950/70 text-blue-700 dark:text-blue-200">
          <FaCloudUploadAlt className="w-10 h-10 mb-2" />
          <p className="text-base font-semibold">Drop files to share in {isDm ? "this conversation" : `#${channel.name}`}</p>
          <p className="text-sm opacity-80">Images are compressed automatically</p>
        </div>
      )}
    </section>
  );
}
