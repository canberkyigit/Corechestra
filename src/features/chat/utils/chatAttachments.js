import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
  createChatId,
} from "../../../shared/services/chat/chatModel";
import { compressImageFile, dataUrlByteSize, formatBytes } from "../../docs/utils/imageCompression";

/*
 * Firebase Storage is not wired in this app, so attachments are embedded in
 * the message document as data URLs. Images are downscaled/re-encoded;
 * other files must be small. Each message stays well below Firestore's
 * 1 MiB document limit.
 */

const IMAGE_MAX_BYTES = 250 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export function isImageAttachment(attachment) {
  return String(attachment?.type || "").startsWith("image/");
}

export function attachmentsSize(list) {
  return (list || []).reduce((sum, item) => sum + (Number(item.size) || dataUrlByteSize(item.dataUrl)), 0);
}

/**
 * Converts picked/pasted/dropped files into attachment objects. Returns
 * `{ attachments, errors }`; never throws.
 */
export async function prepareAttachments(files, existing = []) {
  const attachments = [];
  const errors = [];
  let total = attachmentsSize(existing);

  for (const file of Array.from(files || [])) {
    if (existing.length + attachments.length >= MAX_ATTACHMENTS) {
      errors.push(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      break;
    }
    try {
      const isImage = String(file.type || "").startsWith("image/") && file.type !== "image/svg+xml" && file.type !== "image/gif";
      // eslint-disable-next-line no-await-in-loop
      const dataUrl = isImage ? await compressImageFile(file, { maxBytes: IMAGE_MAX_BYTES }) : await readAsDataUrl(file);
      const size = dataUrlByteSize(dataUrl);
      if (!isImage && size > MAX_ATTACHMENT_BYTES) {
        errors.push(`${file.name} is ${formatBytes(size)}. Files up to ${formatBytes(MAX_ATTACHMENT_BYTES)} can be attached.`);
        continue;
      }
      if (total + size > MAX_TOTAL_ATTACHMENT_BYTES) {
        errors.push(`Attachments are limited to ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} per message.`);
        continue;
      }
      total += size;
      const mime = isImage ? (dataUrl.slice(5, dataUrl.indexOf(";")) || file.type) : (file.type || "application/octet-stream");
      attachments.push({
        id: createChatId("att"),
        name: file.name || "file",
        type: mime,
        size,
        dataUrl,
      });
    } catch (error) {
      errors.push(error?.message || `Could not attach ${file.name}.`);
    }
  }

  return { attachments, errors };
}

export { formatBytes };
