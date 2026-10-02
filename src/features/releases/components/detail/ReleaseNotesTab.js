import React, { memo, useState } from "react";
import { FaCopy, FaDownload, FaEdit, FaMagic, FaPlus, FaTrash } from "react-icons/fa";
import { taskKey } from "../../../../shared/utils/helpers";
import { CHANGELOG_TYPE_META, CHANGELOG_TYPES, FIELD_BASE, FIELD_CLASS } from "../../constants/releaseMeta";
import { groupChangelog } from "../../utils/releaseNotes";
import { formatDate } from "../../utils/releaseUtils";
import DetailCard, { SMALL_BTN_GHOST, SMALL_BTN_PRIMARY, SMALL_BTN_SECONDARY } from "./DetailCard";

function EntryRow({ entry, canManage, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry.text);
  const [type, setType] = useState(entry.type);
  if (editing) {
    return (
      <li className="py-2">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!text.trim()) return;
            onUpdate({ text: text.trim(), type });
            setEditing(false);
          }}
        >
          <select aria-label="Entry type" value={type} onChange={(event) => setType(event.target.value)} className={`${FIELD_BASE} h-8 w-auto py-0 text-xs`}>
            {CHANGELOG_TYPES.map((value) => <option key={value} value={value}>{CHANGELOG_TYPE_META[value].short}</option>)}
          </select>
          <input type="text" aria-label="Entry text" value={text} onChange={(event) => setText(event.target.value)} className={`${FIELD_CLASS} h-8 py-1`} autoFocus />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className={SMALL_BTN_GHOST}>Cancel</button>
            <button type="submit" className={SMALL_BTN_PRIMARY}>Save</button>
          </div>
        </form>
      </li>
    );
  }
  return (
    <li className="group flex items-start gap-2 py-1.5">
      <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
      <span className="flex-1 text-sm text-slate-800">
        {entry.text}
        {entry.taskId && <span className="ml-2 font-mono text-[11px] text-slate-500">{taskKey(entry.taskId)}</span>}
      </span>
      {canManage && (
        <span className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button type="button" onClick={() => { setText(entry.text); setType(entry.type); setEditing(true); }} aria-label="Edit entry" className="rounded p-1.5 text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 dark:hover:text-white">
            <FaEdit className="h-3 w-3" />
          </button>
          <button type="button" onClick={onDelete} aria-label="Delete entry" className="rounded p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-600">
            <FaTrash className="h-3 w-3" />
          </button>
        </span>
      )}
    </li>
  );
}

function NotesPreview({ release, groups }) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white/100 p-6 dark:border-[#252b3b] dark:bg-[#1a1f2e]" data-testid="release-notes-preview">
      <h2 className="text-xl font-bold text-slate-900">{release.version}{release.name ? ` — ${release.name}` : ""}</h2>
      <p className="mt-1 text-sm italic text-slate-500">
        {release.status === "released" ? `Released ${formatDate(release.releasedAt || release.releaseDate)}` : release.releaseDate ? `Target date ${formatDate(release.releaseDate)}` : "Unscheduled"}
      </p>
      {release.description && <p className="mt-3 text-sm text-slate-700">{release.description}</p>}
      {groups.length === 0 && <p className="mt-4 text-sm text-slate-500">No release notes yet.</p>}
      {groups.map((group) => {
        const meta = CHANGELOG_TYPE_META[group.type];
        return (
          <section key={group.type} className="mt-5">
            <h3 className={`flex items-center gap-2 text-sm font-semibold ${meta.accent}`}>
              <meta.icon className="h-3 w-3" /> {meta.label}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 marker:text-slate-400">
              {group.entries.map((entry) => (
                <li key={entry.id}>
                  {entry.text}
                  {entry.taskId && <span className="ml-1.5 font-mono text-xs text-slate-500">({taskKey(entry.taskId)})</span>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </article>
  );
}

function ReleaseNotesTab({ release, metrics, canManage, actions }) {
  const [mode, setMode] = useState("edit");
  const [type, setType] = useState("feature");
  const [text, setText] = useState("");
  const groups = groupChangelog(release.changelog);
  const doneLinked = metrics.linkedTasks.filter((task) => task.status === "done").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Notes mode" className="inline-flex rounded-lg bg-slate-900/[0.05] p-0.5 dark:bg-white/[0.06]">
          {[["edit", "Entries"], ["preview", "Preview"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
              className={`h-7 rounded-md px-3 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${mode === id ? "bg-white/100 text-slate-900 shadow-sm dark:bg-[#2a3044] dark:text-white" : "text-slate-600 dark:text-slate-400"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button type="button" onClick={() => actions.generateNotes(release, metrics.linkedTasks)} className={SMALL_BTN_SECONDARY} title={`${doneLinked} completed linked item${doneLinked !== 1 ? "s" : ""}`} data-testid="release-generate-notes">
              <FaMagic className="h-3 w-3" /> Generate from completed work
            </button>
          )}
          <button type="button" onClick={() => actions.copyNotes(release)} className={SMALL_BTN_SECONDARY}>
            <FaCopy className="h-3 w-3" /> Copy Markdown
          </button>
          <button type="button" onClick={() => actions.downloadNotes(release)} className={SMALL_BTN_SECONDARY}>
            <FaDownload className="h-3 w-3" /> .md
          </button>
        </div>
      </div>

      {mode === "preview" ? (
        <NotesPreview release={release} groups={groups} />
      ) : (
        <>
          {canManage && (
            <form
              className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300/80 p-3 sm:flex-row dark:border-[#2a3044]"
              onSubmit={(event) => {
                event.preventDefault();
                if (actions.addNote(release, { type, text })) setText("");
              }}
            >
              <select aria-label="New entry type" value={type} onChange={(event) => setType(event.target.value)} className={`${FIELD_BASE} h-9 w-auto py-0`}>
                {CHANGELOG_TYPES.map((value) => <option key={value} value={value}>{CHANGELOG_TYPE_META[value].short}</option>)}
              </select>
              <input type="text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Describe the change for your users" aria-label="New entry text" className={`${FIELD_CLASS} h-9`} />
              <button type="submit" disabled={!text.trim()} className={`${SMALL_BTN_PRIMARY} h-9`}>
                <FaPlus className="h-2.5 w-2.5" /> Add entry
              </button>
            </form>
          )}
          {groups.length === 0 ? (
            <div className="rounded-xl border border-slate-200/80 bg-white/100 px-4 py-10 text-center text-sm text-slate-500 dark:border-[#252b3b] dark:bg-[#1a1f2e]">
              No release notes yet.{canManage && doneLinked > 0 ? " Generate them from the completed work items." : ""}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {groups.map((group) => {
                const meta = CHANGELOG_TYPE_META[group.type];
                return (
                  <DetailCard
                    key={group.type}
                    title={
                      <span className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${meta.chip}`}><meta.icon className="h-3 w-3" /></span>
                        {meta.label}
                      </span>
                    }
                    action={<span className="text-xs tabular-nums text-slate-500">{group.entries.length}</span>}
                    bodyClassName="px-4 py-2"
                  >
                    <ul>
                      {group.entries.map((entry) => (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          canManage={canManage}
                          onUpdate={(fields) => actions.updateNote(release, entry.id, fields)}
                          onDelete={() => actions.deleteNote(release, entry.id)}
                        />
                      ))}
                    </ul>
                  </DetailCard>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default memo(ReleaseNotesTab);
