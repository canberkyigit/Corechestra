import { clearDocDraft, getRecoverableDraft, readDocDraft, writeDocDraft } from "./docDrafts";

describe("docDrafts", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a draft per page", () => {
    writeDocDraft("p1", { title: "T", content: "hello" });
    expect(readDocDraft("p1")).toMatchObject({ title: "T", content: "hello" });
    clearDocDraft("p1");
    expect(readDocDraft("p1")).toBeNull();
  });

  it("only offers drafts that differ from the saved page", () => {
    writeDocDraft("p1", { title: "Page", content: "saved" });
    expect(getRecoverableDraft({ id: "p1", title: "Page", content: "saved" })).toBeNull();
    expect(readDocDraft("p1")).toBeNull();

    writeDocDraft("p1", { title: "Page", content: "edited" });
    expect(getRecoverableDraft({ id: "p1", title: "Page", content: "saved" })).toMatchObject({ content: "edited" });
  });
});
