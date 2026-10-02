import React, { useRef } from "react";
import { FaImage } from "react-icons/fa";

/** URL / device-upload picker for embedding an image in a doc page. */
export default function InsertImageModal({ imageUrl, imageBusy, onImageUrlChange, onInsertUrl, onFileChange, onCancel }) {
  const fileInputRef = useRef(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="app-surface w-full max-w-sm mx-4 p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Insert Image</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => onImageUrlChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") onInsertUrl(imageUrl); }}
              placeholder="https://example.com/image.png"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200 dark:bg-[#2a3044]" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-[#2a3044]" />
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} data-testid="docs-image-file-input" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={imageBusy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-[#2a3044] rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
          >
            <FaImage className="w-3.5 h-3.5" /> {imageBusy ? "Compressing…" : "Upload from device"}
          </button>
          <p className="text-[11px] leading-4 text-slate-400 dark:text-slate-500">
            Uploaded images are resized to 1600px and compressed before they are embedded in the page.
          </p>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onInsertUrl(imageUrl)} disabled={!imageUrl.trim()} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">Insert</button>
        </div>
      </div>
    </div>
  );
}
