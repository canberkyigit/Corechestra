import { extractMentionedUsernames, sameUser } from "./mentionUtils";
import {
  createTaskComment,
  findTaskByRef,
  getCommentAuthor,
  normalizeTaskComment,
  normalizeTaskComments,
} from "./commentModel";
import {
  DocImageError,
  compressImageFile,
  computeScaledDimensions,
  dataUrlByteSize,
  estimateSerializedBytes,
} from "./imageCompression";

describe("mentionUtils.extractMentionedUsernames", () => {
  const users = [
    { id: "u1", username: "alice", email: "alice@corp.io" },
    { id: "u2", username: "bob.smith", email: "bsmith@corp.io" },
  ];

  it("returns known users only, deduplicated and case-insensitive", () => {
    expect(extractMentionedUsernames("Hi @Alice and @ALICE, @bsmith. @ghost", users)).toEqual(["alice", "bob.smith"]);
    expect(extractMentionedUsernames("no mentions", users)).toEqual([]);
    expect(sameUser("Alice ", "alice")).toBe(true);
    expect(sameUser(null, "alice")).toBe(false);
  });
});

describe("commentModel", () => {
  it("reads legacy { user, timestamp } comments and treats 'You' as unknown", () => {
    expect(normalizeTaskComment({ id: 1, user: "You", text: "x", timestamp: "t1" })).toMatchObject({
      id: 1, author: null, createdAt: "t1", replyTo: null, reactions: {}, pinned: false,
    });
    const normalized = normalizeTaskComment({ id: 2, user: "bob", text: "y", timestamp: "t2" });
    expect(normalized).toMatchObject({ author: "bob", createdAt: "t2" });
    expect(normalized).not.toHaveProperty("user");
    expect(normalized).not.toHaveProperty("timestamp");
    expect(getCommentAuthor({ author: "carol" })).toBe("carol");
    expect(normalizeTaskComments([null, { id: 3, author: "dave", createdAt: "t3" }])).toHaveLength(1);
  });

  it("creates comments in the shared { id, author, text, createdAt } shape", () => {
    const comment = createTaskComment({ text: "hello", author: "alice", replyTo: "c-1" });
    expect(comment).toMatchObject({ author: "alice", text: "hello", replyTo: "c-1", reactions: {}, pinned: false });
    expect(typeof comment.createdAt).toBe("string");
    expect(String(comment.id)).toMatch(/^tcmt-/);
  });

  it("finds tasks by CY- reference for string and legacy numeric ids", () => {
    const tasks = [{ id: "CY-12", title: "a" }, { id: 7, title: "b" }];
    expect(findTaskByRef(tasks, "cy-12")).toBe(tasks[0]);
    expect(findTaskByRef(tasks, "CY-7")).toBe(tasks[1]);
    expect(findTaskByRef(tasks, "CY-99")).toBeNull();
  });
});

describe("imageCompression helpers", () => {
  it("scales the longest side down to the limit and keeps small images", () => {
    expect(computeScaledDimensions(4000, 2000, 1600)).toEqual({ width: 1600, height: 800 });
    expect(computeScaledDimensions(1000, 3000, 1600)).toEqual({ width: 533, height: 1600 });
    expect(computeScaledDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("computes decoded data-URL sizes and serialized payload sizes", () => {
    expect(dataUrlByteSize("data:image/png;base64,QUJD")).toBe(3);
    expect(dataUrlByteSize("data:image/png;base64,QUI=")).toBe(2);
    expect(estimateSerializedBytes({ a: "b" })).toBe(9);
  });

  it("rejects non-image files", async () => {
    await expect(compressImageFile({ type: "application/pdf", size: 10 })).rejects.toBeInstanceOf(DocImageError);
  });

  describe("with a mocked canvas pipeline", () => {
    const OriginalImage = window.Image;
    const originalCreateElement = document.createElement.bind(document);
    let encodedSizes;

    beforeEach(() => {
      encodedSizes = [];
      window.Image = class {
        constructor() { this.naturalWidth = 3200; this.naturalHeight = 1600; }
        set src(_value) { setTimeout(() => this.onload?.(), 0); }
      };
      jest.spyOn(document, "createElement").mockImplementation((tag) => {
        if (tag !== "canvas") return originalCreateElement(tag);
        const canvas = {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: jest.fn(), fillRect: jest.fn() }),
          toDataURL: (type) => {
            const size = encodedSizes.shift() ?? 10;
            return `data:${type};base64,${"A".repeat(Math.ceil((size * 4) / 3))}`;
          },
        };
        return canvas;
      });
    });

    afterEach(() => {
      window.Image = OriginalImage;
      jest.restoreAllMocks();
    });

    const file = new File(["x".repeat(100)], "photo.png", { type: "image/png" });

    it("returns a WebP data URL when the first pass fits", async () => {
      encodedSizes = [1000];
      const dataUrl = await compressImageFile(file, { maxBytes: 5000 });
      expect(dataUrl.startsWith("data:image/webp")).toBe(true);
    });

    it("retries with smaller settings and fails with a helpful error when still too large", async () => {
      encodedSizes = [9000, 9000, 9000, 9000];
      await expect(compressImageFile(file, { maxBytes: 5000 })).rejects.toThrow(/after compression/i);
    });
  });
});
