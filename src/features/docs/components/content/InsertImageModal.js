import React, { useRef } from "react";
import { FaImage } from "react-icons/fa";
import { Modal } from "../../../../shared/ui/Modal";

/** URL / device-upload picker for embedding an image in a doc page. */
export default function InsertImageModal({ imageUrl, imageBusy, onImageUrlChange, onInsertUrl, onFileChange, onCancel }) {
  const fileInputRef = useRef(null);
  const hasUrl = Boolean(imageUrl.trim());
  return (
    <Modal
      open
      onClose={onCancel}
      title="Insert Image"
      size="sm"
      confirmClose={hasUrl}
      closeOnBackdrop={!hasUrl}
      testId="docs-insert-image"
      footer={(
        <>
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
          <button type="submit" form="docs-insert-image-form" disabled={!hasUrl} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">Insert</button>
        </>
      )}
    >
      <form
        id="docs-insert-image-form"
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (hasUrl) onInsertUrl(imageUrl);
        }}
      >
        <div>
          <label htmlFor="docs-insert-image-url" className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Image URL</label>
          <input
            id="docs-insert-image-url"
            type="url"
            value={imageUrl}
            onChange={(event) => onImageUrlChange(event.target.value)}
            placeholder="https://example.com/image.png"
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            data-autofocus
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-slate-200 dark:bg-[#2a3044]" />
          <span className="text-xs text-slate-400">or</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-[#2a3044]" />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} data-testid="docs-image-file-input" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageBusy}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-[#2a3044] rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
        >
          <FaImage className="w-3.5 h-3.5" /> {imageBusy ? "Compressing…" : "Upload from device"}
        </button>
        <p className="text-[11px] leading-4 text-slate-400 dark:text-slate-500">
          Uploaded images are resized to 1600px and compressed before they are embedded in the page.
        </p>
      </form>
    </Modal>
  );
}
