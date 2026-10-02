import React, { useRef, useState } from "react";
import { FaCloudUploadAlt, FaFileAlt, FaPaperclip, FaTimes } from "react-icons/fa";
import { formatFileSize } from "./taskDetailHooks";

/**
 * Attachment drop zone + file list used by the task modal (`variant="modal"`)
 * and the side panel (`variant="panel"`). Reading files is delegated to
 * `onFiles(FileList)`.
 */
export default function TaskAttachments({ attachments, onFiles, onRemove, readOnly = false, variant = "modal", label }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const isPanel = variant === "panel";

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    if (readOnly) return;
    if (event.dataTransfer.files?.length) onFiles(event.dataTransfer.files);
  };

  const handleSelect = (event) => {
    if (event.target.files?.length) onFiles(event.target.files);
    event.target.value = "";
  };

  const dropZone = !readOnly && (
    <div
      className={`p-3 transition-colors cursor-pointer ${isPanel ? "border-b border-slate-100 dark:border-[#2a3044]" : ""} ${
        dragOver
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
          : "bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838]"
      }`}
      onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className={`flex flex-col items-center justify-center ${isPanel ? "py-2" : "py-3"} border-2 border-dashed border-slate-200 dark:border-[#2a3044] rounded-lg`}>
        <FaCloudUploadAlt className={`${isPanel ? "w-5 h-5 mb-1" : "w-6 h-6 mb-1.5"} ${dragOver ? "text-blue-500" : "text-slate-300 dark:text-slate-600"}`} />
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {dragOver ? "Drop files here" : "Drop files here or click to browse"}
        </span>
        <span className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">Max 5 MB per file</span>
      </div>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleSelect} />
    </div>
  );

  const fileList = attachments.length > 0 && (
    <div>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className={`flex items-center ${isPanel ? "gap-2" : "gap-2.5 border-t"} px-3 py-2 ${isPanel ? "border-b last:border-0" : ""} border-slate-100 dark:border-[#2a3044] hover:bg-slate-50 dark:hover:bg-[#232838] group`}
        >
          {attachment.type?.startsWith("image/") ? (
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="w-10 h-10 rounded object-cover flex-shrink-0 border border-slate-200 dark:border-[#2a3044]"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-slate-100 dark:bg-[#232838] flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-[#2a3044]">
              <FaFileAlt className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className={`${isPanel ? "text-xs" : "text-sm"} text-slate-700 dark:text-slate-300 truncate`}>{attachment.name}</div>
            <div className={`${isPanel ? "text-[10px]" : "text-xs"} text-slate-400 dark:text-slate-500`}>{formatFileSize(attachment.size)}</div>
          </div>
          {!readOnly && (
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
              onClick={(event) => { event.stopPropagation(); onRemove(attachment.id); }}
              title="Remove"
            >
              <FaTimes className={isPanel ? "w-2.5 h-2.5" : "w-3 h-3"} />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  if (isPanel) {
    return (
      <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
          <div className="flex items-center gap-1.5">
            <FaPaperclip className="w-3 h-3 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Attachments</span>
            {attachments.length > 0 && (
              <span className="text-xs text-slate-400 bg-slate-200 dark:bg-[#2a3044] px-1.5 rounded-full">{attachments.length}</span>
            )}
          </div>
        </div>
        {dropZone}
        {fileList}
      </div>
    );
  }

  return (
    <div>
      {label}
      <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
        {dropZone}
        {fileList}
        {readOnly && attachments.length === 0 && (
          <div className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500">No attachments</div>
        )}
      </div>
    </div>
  );
}
