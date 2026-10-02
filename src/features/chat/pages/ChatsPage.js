import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaExclamationTriangle } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useChat, useChatActions } from "../../../shared/context/ChatContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { requestOpenTask } from "../../../shared/components/appNavigation";
import { CHANNEL_TYPES, DEFAULT_CHANNEL_ID } from "../../../shared/services/chat/chatModel";
import { useChatDrafts, useIsMobile, useStoredValue } from "../hooks/useChatUi";
import { useChatCtx } from "../hooks/useChatCtx";
import { buildSidebarSections, sidebarNavigationOrder } from "../utils/chatSections";
import { encodeMessageText, decodeForEditing } from "../utils/chatMentions";
import { formatScheduledTime } from "../utils/chatSchedule";
import { isLinkPreviewServiceAvailable, resolveStoredPreviews } from "../utils/chatLinks";
import ChatSidebar from "../components/sidebar/ChatSidebar";
import ConversationView from "../components/conversation/ConversationView";
import ThreadPanel from "../components/panels/ThreadPanel";
import ChannelDetailsPanel from "../components/panels/ChannelDetailsPanel";
import SearchPanel from "../components/panels/SearchPanel";
import SummaryPanel from "../components/panels/SummaryPanel";
import UserProfilePanel from "../components/panels/UserProfilePanel";
import { ActivityView, WelcomeView } from "../components/views/ActivityView";
import { LaterView, UnreadsView } from "../components/views/LaterViews";
import {
  AddPeopleModal, BrowseChannelsModal, CreateChannelModal, NewMessageModal,
} from "../components/modals/ChannelModals";
import {
  ChatPreferencesModal, CreateTaskFromMessageModal, ImageLightbox, SetStatusModal,
} from "../components/modals/MiscModals";
import { CreatePollModal, DateTimeModal, ForwardMessageModal, WorkspaceChatSettingsModal } from "../components/modals/ExtraModals";
import { ChatConfirmDialog } from "../components/common/ChatModal";

const VIEW_KINDS = new Set(["channel", "activity", "later", "unreads", "welcome"]);

function ChatsSkeleton() {
  return (
    <div className="flex h-full" aria-label="Loading chats">
      <div className="hidden md:block w-[264px] border-r border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#1a1f2e] p-3 space-y-3 animate-pulse">
        <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-700/50" />
        <div className="h-8 rounded-lg bg-slate-200 dark:bg-slate-700/50" />
        {[0, 1, 2, 3, 4, 5].map((index) => <div key={index} className="h-5 rounded bg-slate-200 dark:bg-slate-700/50" style={{ width: `${70 - index * 6}%` }} />)}
      </div>
      <div className="flex-1 bg-white dark:bg-[#141720] p-6 space-y-5 animate-pulse">
        <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700/50" />
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700/50" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700/50" />
              <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatsPage() {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const { canPerform } = usePermissions();
  const { activeTasks, backlogSections, archivedTasks, projects, currentProjectId } = useApp();
  const location = useLocation();
  const isMobile = useIsMobile();
  const uid = chat?.uid;

  const [lastView, setLastView] = useStoredValue(uid, "last_view", null);
  const [view, setView] = useState(() => (lastView && VIEW_KINDS.has(lastView.kind) ? lastView : { kind: "channel", channelId: DEFAULT_CHANNEL_ID }));
  const [rightPanel, setRightPanel] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [mobileList, setMobileList] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const { getDraft, setDraft, draftIds } = useChatDrafts(uid);

  const canCreateTask = canPerform("task:create");
  const channel = view.kind === "channel" ? chat?.channelsById?.[view.channelId] : null;

  const stateRef = useRef({});
  stateRef.current = { chat, activeTasks, backlogSections, archivedTasks, view, channel };

  // Link metadata for generic URLs (only when a preview service is configured).
  useEffect(() => {
    if (!actions || !isLinkPreviewServiceAvailable()) return undefined;
    actions.setPreviewResolver(resolveStoredPreviews);
    return () => actions.setPreviewResolver(null);
  }, [actions]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const selectView = useCallback((next) => {
    setView(next);
    setLastView(next);
    setMobileList(false);
    setRightPanel((panel) => (panel && ["thread", "details", "search", "summary"].includes(panel.kind) ? null : panel));
  }, [setLastView]);

  const openChannel = useCallback((channelId) => selectView({ kind: "channel", channelId }), [selectView]);

  const jumpToMessage = useCallback((channelId, messageId, threadRootId = null) => {
    selectView({ kind: "channel", channelId });
    if (threadRootId) {
      setRightPanel({ kind: "thread", channelId, rootId: threadRootId, highlightId: messageId });
      setHighlight({ channelId, messageId: threadRootId });
    } else if (messageId) {
      setHighlight({ channelId, messageId });
    }
  }, [selectView]);

  // Tell the provider what is on screen (suppresses alerts for it).
  useEffect(() => {
    if (!chat?.enabled) return undefined;
    actions.setActiveConversation({ mounted: true, channelId: view.kind === "channel" && (!isMobile || !mobileList) ? view.channelId : null });
    return undefined;
  }, [actions, chat?.enabled, isMobile, mobileList, view]);
  useEffect(() => () => actions?.setActiveConversation({ mounted: false, channelId: null, threadRootId: null }), [actions]);

  // Fall back to #general when the selected channel is gone (deleted, left,
  // no access). A short grace period covers conversations that were created a
  // moment ago and are not in the realtime snapshot yet.
  useEffect(() => {
    if (!chat?.ready) return undefined;
    const hasDefault = Boolean(chat.channelsById[DEFAULT_CHANNEL_ID]);
    if (view.kind === "welcome") {
      if (hasDefault) setView({ kind: "channel", channelId: DEFAULT_CHANNEL_ID });
      return undefined;
    }
    if (view.kind !== "channel" || chat.channelsById[view.channelId]) return undefined;
    const timer = window.setTimeout(() => {
      setView(hasDefault ? { kind: "channel", channelId: DEFAULT_CHANNEL_ID } : { kind: "welcome" });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [chat?.channelsById, chat?.ready, view]);

  // Deep links: /chats?c=<channel>&m=<message>&t=<threadRoot> · /chats?view=later|unreads|activity
  const handledLinkRef = useRef(null);
  useEffect(() => {
    if (!chat?.ready) return;
    const params = new URLSearchParams(location?.search || "");
    const channelId = params.get("c");
    const viewParam = params.get("view");
    if (!channelId && !viewParam) return;
    const key = `${location.key}:${location.search}`;
    if (handledLinkRef.current === key) return;
    handledLinkRef.current = key;
    if (viewParam && VIEW_KINDS.has(viewParam) && viewParam !== "channel") {
      selectView({ kind: viewParam, tab: params.get("tab") || undefined });
      return;
    }
    if (!chat.channelsById[channelId]) {
      addToast("That conversation doesn't exist or you don't have access to it.", "warning");
      return;
    }
    const messageId = params.get("m");
    const threadRootId = params.get("t");
    if (messageId || threadRootId) jumpToMessage(channelId, messageId, threadRootId);
    else openChannel(channelId);
  }, [addToast, chat?.channelsById, chat?.ready, jumpToMessage, location, openChannel, selectView]);

  // Alt+↑/↓ (and Alt+Shift for unread only) moves between conversations in sidebar order.
  useEffect(() => {
    const onKey = (event) => {
      if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      const { chat: current, view: currentView } = stateRef.current;
      if (!current?.ready) return;
      let order = sidebarNavigationOrder(buildSidebarSections({
        channels: current.channels,
        uid: current.uid,
        userState: current.userState,
        getName: current.getChannelName,
        isVisible: (entry) => !entry.archived && !(entry.type === CHANNEL_TYPES.DM && current.userState?.hiddenDms?.[entry.id]),
      }));
      if (event.shiftKey) {
        order = order.filter((entry) => (current.unread.perChannel[entry.id]?.unread || 0) > 0 || entry.id === currentView.channelId);
      }
      if (!order.length) return;
      event.preventDefault();
      const index = order.findIndex((entry) => entry.id === currentView.channelId);
      const nextIndex = event.key === "ArrowDown"
        ? (index + 1) % order.length
        : (index - 1 + order.length) % order.length;
      openChannel(order[index === -1 ? 0 : nextIndex].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openChannel]);

  // ── Actions exposed to child components (stable identity) ────────────────
  const requestConfirm = useCallback((config) => setConfirm(config), []);

  const pageApi = useMemo(() => ({
    openThread: (channelId, rootId, highlightId = null) => setRightPanel({ kind: "thread", channelId, rootId, highlightId }),
    openDetails: (tab = "about") => setRightPanel({ kind: "details", tab }),
    openSearch: () => setRightPanel((panel) => (panel?.kind === "search" ? null : { kind: "search" })),
    openSummary: (rootId = null) => {
      const id = typeof rootId === "string" ? rootId : null;
      setRightPanel((panel) => (panel?.kind === "summary" && !id ? null : { kind: "summary", rootId: id }));
    },
    openProfile: (userId) => setRightPanel({ kind: "profile", userId }),
    openChannel,
    jumpToMessage,
    openLater: (tab = "saved") => selectView({ kind: "later", tab }),
    openImage: (file, images) => setLightbox({ images, index: Math.max(0, images.findIndex((entry) => entry.id === file.id)) }),
    openTaskKey: (key) => {
      const { activeTasks: active, backlogSections: sections, archivedTasks: archived } = stateRef.current;
      const all = [...(active || []), ...(sections || []).flatMap((section) => section.tasks || [])];
      const task = all.find((entry) => String(entry.id) === String(key));
      if (task) { requestOpenTask(task); return; }
      if ((archived || []).some((entry) => String(entry.id) === String(key))) {
        addToast(`${key} is archived.`, "info");
        return;
      }
      addToast(`${key} isn't in the current project.`, "warning");
    },
    requestConfirm,
    openCreateTask: ({ message = null, channel: target = null, title = "" } = {}) => {
      if (!canCreateTask) { addToast("You don't have permission to create tasks.", "warning"); return; }
      setModal({ kind: "task", message, channel: target, title });
    },
    openCreatePoll: (target) => setModal({ kind: "poll", channel: target }),
    openForward: (message) => setModal({ kind: "forward", message }),
    openReminder: ({ message = null } = {}) => setModal({ kind: "reminder", message }),
    openSchedule: ({ channelId, threadRootId = null, text, onCancel }) => setModal({ kind: "schedule", channelId, threadRootId, text, onCancel }),
    openAddPeople: (target) => setModal({ kind: "addPeople", channel: target }),
    leaveChannel: (target) => {
      const run = () => actions.leaveChannel(target.id)
        .then(() => {
          addToast(`You left #${target.name}`, "info");
          if (stateRef.current.view.channelId === target.id && target.isPrivate) openChannel(DEFAULT_CHANNEL_ID);
        })
        .catch((err) => addToast(err?.message || "Could not leave the channel.", "error"));
      if (target.isPrivate) {
        setConfirm({
          title: `Leave #${target.name}?`,
          message: "This channel is private — you'll need to be added back by a member to rejoin.",
          confirmLabel: "Leave channel",
          onConfirm: run,
        });
      } else run();
    },
    hideDm: (target) => {
      actions.hideDirectMessage(target.id).catch(() => {});
      if (stateRef.current.view.channelId === target.id) openChannel(DEFAULT_CHANNEL_ID);
    },
    deleteChannel: (target) => actions.deleteChannel(target.id)
      .then(() => {
        addToast(`#${target.name} deleted`, "info");
        setRightPanel(null);
        openChannel(DEFAULT_CHANNEL_ID);
      })
      .catch((err) => addToast(err?.message || "The channel could not be deleted.", "error")),
    backToList: () => setMobileList(true),
  }), [actions, addToast, canCreateTask, jumpToMessage, openChannel, requestConfirm, selectView]);

  const ctx = useChatCtx(pageApi);
  const encode = useCallback(
    (text) => encodeMessageText(text, { users: Object.values(chat?.usersById || {}), channels: chat?.channels || [] }),
    [chat?.channels, chat?.usersById]
  );

  if (!chat?.enabled) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Chats are not available for your account.
      </div>
    );
  }

  if (!chat.ready) {
    if (chat.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
          <FaExclamationTriangle className="w-6 h-6 text-amber-500" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Chats couldn't connect</p>
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{chat.error}</p>
        </div>
      );
    }
    return <ChatsSkeleton />;
  }

  const panelChannel = rightPanel?.kind === "thread" ? chat.channelsById[rightPanel.channelId] : channel;
  const showSidebar = !isMobile || mobileList;
  const showMain = !isMobile || !mobileList;
  const openItem = (item) => {
    if (!chat.channelsById[item.channelId]) { addToast("That conversation is no longer available.", "warning"); return; }
    jumpToMessage(item.channelId, item.messageId, item.threadRootId);
  };

  let main = null;
  if (view.kind === "activity") {
    main = (
      <ActivityView
        isMobile={isMobile}
        onBack={() => setMobileList(true)}
        onOpenItem={(item) => { actions.markInboxRead([item.id]).catch(() => {}); openItem(item); }}
      />
    );
  } else if (view.kind === "unreads") {
    main = <UnreadsView ctx={ctx} isMobile={isMobile} onBack={() => setMobileList(true)} onOpenChannel={openChannel} />;
  } else if (view.kind === "later") {
    main = (
      <LaterView
        key={view.tab || "saved"}
        ctx={ctx}
        initialTab={view.tab || "saved"}
        isMobile={isMobile}
        onBack={() => setMobileList(true)}
        onOpenItem={openItem}
        onNewReminder={() => setModal({ kind: "reminder", message: null })}
        onEditScheduled={(entry) => setModal({ kind: "editScheduled", entry })}
      />
    );
  } else if (channel) {
    main = (
      <ConversationView
        key={channel.id}
        channel={channel}
        ctx={ctx}
        pageApi={pageApi}
        rightPanel={rightPanel}
        highlightId={highlight?.channelId === channel.id ? highlight.messageId : null}
        onHighlightDone={(found) => {
          if (found === false) addToast("That message is too old to show here or was deleted.", "info");
          setHighlight(null);
        }}
        getDraft={getDraft}
        setDraft={setDraft}
        isMobile={isMobile}
        canCreateTask={canCreateTask}
      />
    );
  } else {
    main = (
      <WelcomeView
        canManageChannels={chat.permissions.canManageChannels}
        onNewMessage={() => setModal({ kind: "newMessage" })}
        onBrowse={() => setModal({ kind: "browse" })}
        onCreateChannel={() => setModal({ kind: "createChannel" })}
      />
    );
  }

  let panel = null;
  if (rightPanel?.kind === "thread" && panelChannel) {
    panel = (
      <ThreadPanel
        key={`${rightPanel.channelId}/${rightPanel.rootId}`}
        channel={panelChannel}
        rootId={rightPanel.rootId}
        highlightId={rightPanel.highlightId}
        ctx={ctx}
        pageApi={pageApi}
        getDraft={getDraft}
        setDraft={setDraft}
        canCreateTask={canCreateTask}
        onSummarize={() => setRightPanel({ kind: "summary", rootId: rightPanel.rootId, channelId: rightPanel.channelId })}
        onClose={() => setRightPanel(null)}
      />
    );
  } else if (rightPanel?.kind === "details" && channel) {
    panel = (
      <ChannelDetailsPanel
        channel={channel}
        tab={rightPanel.tab}
        onTabChange={(tab) => setRightPanel({ kind: "details", tab })}
        onClose={() => setRightPanel(null)}
        pageApi={pageApi}
        projects={projects}
      />
    );
  } else if (rightPanel?.kind === "summary" && (rightPanel.channelId ? chat.channelsById[rightPanel.channelId] : channel)) {
    const summaryChannel = rightPanel.channelId ? chat.channelsById[rightPanel.channelId] : channel;
    panel = (
      <SummaryPanel
        key={`${summaryChannel.id}/${rightPanel.rootId || "channel"}`}
        channel={summaryChannel}
        rootId={rightPanel.rootId || null}
        ctx={ctx}
        canCreateTask={canCreateTask}
        onClose={() => setRightPanel(null)}
      />
    );
  } else if (rightPanel?.kind === "search") {
    panel = <SearchPanel channel={view.kind === "channel" ? channel : null} onClose={() => setRightPanel(null)} pageApi={pageApi} />;
  } else if (rightPanel?.kind === "profile") {
    panel = (
      <UserProfilePanel
        userId={rightPanel.userId}
        onClose={() => setRightPanel(null)}
        onSetStatus={() => setModal({ kind: "status" })}
        onMessage={(userId) => actions.openDirectMessage(userId === chat.uid ? [] : [userId])
          .then((id) => { setRightPanel(null); openChannel(id); })
          .catch((err) => addToast(err?.message || "Could not open the conversation.", "error"))}
      />
    );
  }

  const closeModal = () => setModal(null);

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-white dark:bg-[#141720]" data-testid="chats-page">
      {showSidebar && (
        <div className={`${isMobile ? "w-full" : "w-[264px]"} flex-shrink-0 h-full`}>
          <ChatSidebar
            activeView={view}
            draftIds={draftIds}
            onSelectChannel={openChannel}
            onOpenActivity={() => selectView({ kind: "activity" })}
            onOpenUnreads={() => selectView({ kind: "unreads" })}
            onOpenLater={() => selectView({ kind: "later", tab: "saved" })}
            onNewMessage={() => setModal({ kind: "newMessage" })}
            onCreateChannel={() => setModal({ kind: "createChannel" })}
            onBrowseChannels={() => setModal({ kind: "browse" })}
            onSetStatus={() => setModal({ kind: "status" })}
            onOpenPreferences={() => setModal({ kind: "prefs" })}
            onOpenWorkspaceSettings={() => setModal({ kind: "workspace" })}
            onLeaveChannel={pageApi.leaveChannel}
            onHideDm={pageApi.hideDm}
          />
        </div>
      )}

      {showMain && <div className="flex min-w-0 flex-1 h-full">{main}</div>}

      {panel && showMain && (
        <div className="absolute inset-0 z-20 lg:static lg:z-auto lg:w-[400px] xl:w-[420px] flex-shrink-0 h-full border-l border-slate-200 dark:border-[#2a3044] shadow-2xl lg:shadow-none">
          {panel}
        </div>
      )}

      {modal?.kind === "createChannel" && (
        <CreateChannelModal
          projects={projects}
          defaultProjectId={currentProjectId}
          onClose={closeModal}
          onCreated={(id) => { closeModal(); openChannel(id); }}
        />
      )}
      {modal?.kind === "newMessage" && (
        <NewMessageModal onClose={closeModal} onOpened={(id) => { closeModal(); openChannel(id); }} />
      )}
      {modal?.kind === "browse" && (
        <BrowseChannelsModal
          onClose={closeModal}
          onOpen={(id) => { closeModal(); openChannel(id); }}
          onCreate={() => setModal({ kind: "createChannel" })}
        />
      )}
      {modal?.kind === "addPeople" && <AddPeopleModal channel={modal.channel} onClose={closeModal} />}
      {modal?.kind === "task" && (
        <CreateTaskFromMessageModal message={modal.message} channel={modal.channel} initialTitle={modal.title} onClose={closeModal} />
      )}
      {modal?.kind === "status" && <SetStatusModal onClose={closeModal} />}
      {modal?.kind === "prefs" && <ChatPreferencesModal onClose={closeModal} />}
      {modal?.kind === "workspace" && <WorkspaceChatSettingsModal onClose={closeModal} />}
      {modal?.kind === "poll" && (
        <CreatePollModal
          onClose={closeModal}
          onCreate={(poll) => {
            closeModal();
            actions.sendMessage({ channelId: modal.channel.id, text: encode(poll.question), extra: { poll, pollVotes: {} } })
              .catch((err) => addToast(err?.message || "The poll could not be posted.", "error"));
          }}
        />
      )}
      {modal?.kind === "forward" && <ForwardMessageModal message={modal.message} encode={encode} onClose={closeModal} />}
      {modal?.kind === "reminder" && (
        <DateTimeModal
          title={modal.message ? "Remind me about this message" : "New reminder"}
          confirmLabel="Set reminder"
          withText={!modal.message}
          textLabel="Remind me to…"
          onClose={closeModal}
          onConfirm={({ at, text }) => {
            closeModal();
            actions.addReminder({ at, text, message: modal.message })
              .then(() => addToast(`Reminder set for ${formatScheduledTime(at)}`, "success"))
              .catch((err) => addToast(err?.message || "Could not set the reminder.", "error"));
          }}
        />
      )}
      {modal?.kind === "schedule" && (
        <DateTimeModal
          title="Schedule message"
          subtitle={chat.channelsById[modal.channelId] ? `To ${chat.getChannelName(chat.channelsById[modal.channelId])}${modal.threadRootId ? " (thread)" : ""}` : undefined}
          confirmLabel="Schedule"
          withText
          initialText={modal.text}
          onClose={() => { modal.onCancel?.(); closeModal(); }}
          onConfirm={({ at, text }) => {
            closeModal();
            actions.scheduleMessage({ channelId: modal.channelId, threadRootId: modal.threadRootId, text: encode(text), at })
              .then(() => addToast(`Message scheduled for ${formatScheduledTime(at)}`, "success"))
              .catch((err) => addToast(err?.message || "Could not schedule the message.", "error"));
          }}
        />
      )}
      {modal?.kind === "editScheduled" && (
        <DateTimeModal
          title="Edit scheduled message"
          confirmLabel="Save"
          withText
          initialAt={modal.entry.at}
          initialText={decodeForEditing(modal.entry.text, { usersById: chat.usersById, channelsById: chat.channelsById })}
          onClose={closeModal}
          onConfirm={({ at, text }) => {
            closeModal();
            actions.updateScheduled(modal.entry.id, { at, text: encode(text), claimedBy: null, claimedAt: 0, failedAt: 0 })
              .then(() => addToast("Scheduled message updated", "success"))
              .catch((err) => addToast(err?.message || "Could not update.", "error"));
          }}
        />
      )}

      {confirm && (
        <ChatConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          tone={confirm.tone}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { const run = confirm.onConfirm; setConfirm(null); run?.(); }}
        />
      )}
      {lightbox && <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}
