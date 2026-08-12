import { buildMentionItems } from "../utils/mentionUtils";

describe("buildMentionItems", () => {
  it("normalizes user objects and filters mentions without crashing", () => {
    const users = [
      { id: "uid-1", username: "alice", name: "Alice Doe", email: "alice@example.com" },
      { id: "uid-2", username: "bob", name: "Bob Smith", email: "bob@example.com" },
      "carol",
    ];

    expect(buildMentionItems(users, "ali")).toEqual([
      { id: "alice", label: "Alice Doe" },
    ]);
    expect(buildMentionItems(users, "uid-2")).toEqual([]);
    expect(buildMentionItems(users, "car")).toEqual([
      { id: "carol", label: "carol" },
    ]);
  });

  it("ignores malformed users and limits the suggestion list", () => {
    const users = [null, {}, ...Array.from({ length: 8 }, (_, index) => `user-${index}`)];

    expect(buildMentionItems(users)).toHaveLength(6);
  });
});
