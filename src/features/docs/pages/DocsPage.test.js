import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import DocsPage from "./DocsPage";

const mockUseApp = jest.fn();
const mockAddToast = jest.fn();
const mockCanPerform = jest.fn();
const mockDocsDnd = {};
const mockLocation = { pathname: "/docs", search: "", key: "initial" };

jest.mock("react-router-dom", () => ({
  useLocation: () => mockLocation,
}), { virtual: true });

jest.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragStart, onDragEnd }) => {
    mockDocsDnd.onDragStart = onDragStart;
    mockDocsDnd.onDragEnd = onDragEnd;
    return <div data-testid="docs-dnd">{children}</div>;
  },
  Droppable: ({ children, droppableId }) => children(
    {
      innerRef: jest.fn(),
      droppableProps: { "data-droppable-id": droppableId },
      placeholder: null,
    },
    { isDraggingOver: false }
  ),
  Draggable: ({ children, draggableId }) => children(
    {
      innerRef: jest.fn(),
      draggableProps: { "data-draggable-id": draggableId },
      dragHandleProps: {},
    },
    { isDragging: false, combineTargetFor: null }
  ),
}));

jest.mock("@tiptap/react", () => {
  const mockEditor = {
    isEditable: false,
    storage: { markdown: { getMarkdown: () => "# Draft" } },
    commands: {
      setContent: jest.fn(),
      focus: jest.fn(),
    },
    setEditable: jest.fn(),
    chain: () => {
      const chainApi = {
        focus: () => chainApi,
        toggleBold: () => chainApi,
        toggleItalic: () => chainApi,
        toggleStrike: () => chainApi,
        toggleCode: () => chainApi,
        toggleHeading: () => chainApi,
        toggleBulletList: () => chainApi,
        toggleOrderedList: () => chainApi,
        toggleBlockquote: () => chainApi,
        toggleCodeBlock: () => chainApi,
        setHorizontalRule: () => chainApi,
        setImage: () => chainApi,
        insertContent: () => chainApi,
        run: jest.fn(),
      };
      return chainApi;
    },
    isActive: () => false,
  };

  return {
    useEditor: () => mockEditor,
    EditorContent: () => <div data-testid="editor-content" />,
  };
});

jest.mock("@tiptap/starter-kit", () => ({}));
jest.mock("tiptap-markdown", () => ({ Markdown: { configure: () => ({}) } }));
jest.mock("@tiptap/extension-mention", () => ({ configure: () => ({}) }));
jest.mock("@tiptap/extension-image", () => ({ configure: () => ({}) }));

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: (key) => mockCanPerform(key), canAccessPage: () => true }),
}));

jest.mock("../../../shared/components/Skeleton", () => ({
  DocsSkeleton: () => <div data-testid="docs-skeleton">Loading docs</div>,
}));

function createAppMock(overrides = {}) {
  return {
    spaces: [{ id: "space-1", name: "Engineering", color: "#2563eb", icon: "📘" }],
    createSpace: jest.fn(),
    docPages: [
      {
        id: "page-1",
        spaceId: "space-1",
        parentId: null,
        title: "Getting Started",
        emoji: "📄",
        content: "# Welcome",
        author: "alice",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
        position: 0,
        comments: [{ id: "comment-1", author: "alice", text: "Existing note", createdAt: "2026-03-20T10:00:00.000Z" }],
      },
      {
        id: "page-2",
        spaceId: "space-1",
        parentId: null,
        title: "Architecture",
        emoji: "🏗️",
        content: "# Architecture",
        author: "bob",
        createdAt: "2026-03-21T10:00:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
        position: 1,
        comments: [],
      },
      {
        id: "page-3",
        spaceId: "space-1",
        parentId: "page-2",
        title: "Child Notes",
        emoji: "🧾",
        content: "",
        author: "bob",
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-22T10:00:00.000Z",
        position: 0,
        comments: [],
      },
    ],
    createDocPage: jest.fn(),
    updateDocPage: jest.fn(),
    deleteDocPage: jest.fn(),
    reorderDocPages: jest.fn(() => true),
    addNotification: jest.fn(),
    addDocComment: jest.fn(),
    deleteDocComment: jest.fn(),
    projects: [{ id: "proj-1", name: "Corechestra" }],
    currentProjectId: "proj-1",
    currentUser: "alice",
    dbReady: true,
    users: ["alice", "bob"],
    ...overrides,
  };
}

describe("DocsPage", () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanPerform.mockReturnValue(true);
    mockUseApp.mockReturnValue(createAppMock());
    mockDocsDnd.onDragEnd = undefined;
    mockLocation.search = "";
    mockLocation.key = `key-${Math.random()}`;
  });

  it("creates a root page from the selected template", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    fireEvent.click(screen.getByTitle(/New page/i));
    fireEvent.click(screen.getByRole("button", { name: /Meeting Notes/i }));
    fireEvent.change(screen.getByPlaceholderText(/Page title/i), {
      target: { value: "Sprint Sync" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Create$/i }));

    expect(appMock.createDocPage).toHaveBeenCalledWith(expect.objectContaining({
      title: "Sprint Sync",
      spaceId: "space-1",
      parentId: null,
      emoji: "📝",
      content: expect.stringContaining("# Meeting Notes"),
    }));
    expect(mockAddToast).toHaveBeenCalledWith('Page "Sprint Sync" created', "success");
  });

  it("creates a child page from the page view flow", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    fireEvent.click(screen.getByRole("treeitem", { name: "Getting Started" }));
    fireEvent.click(screen.getAllByTitle(/Add child page/i).at(-1));
    fireEvent.click(screen.getByRole("button", { name: /Blank Page/i }));
    fireEvent.change(screen.getByPlaceholderText(/Page title/i), {
      target: { value: "API Conventions" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Create$/i }));

    expect(appMock.createDocPage).toHaveBeenCalledWith(expect.objectContaining({
      title: "API Conventions",
      parentId: "page-1",
      spaceId: "space-1",
      emoji: "📄",
    }));
  });

  it("posts a new comment from the page view", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    fireEvent.click(screen.getByRole("treeitem", { name: "Getting Started" }));
    fireEvent.change(screen.getByPlaceholderText(/Add a comment/i), {
      target: { value: "Looks good to me" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Post Comment/i }));

    expect(appMock.addDocComment).toHaveBeenCalledWith("page-1", "Looks good to me");
  });

  it("nests a page under another page through tree drag-drop", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    act(() => {
      mockDocsDnd.onDragEnd({
        draggableId: "page-1",
        source: { droppableId: "dnd-root", index: 0 },
        combine: { draggableId: "page-2" },
      });
    });

    expect(appMock.reorderDocPages).toHaveBeenCalledTimes(1);
    expect(appMock.reorderDocPages.mock.calls[0][0]).toEqual(expect.arrayContaining([
      { id: "page-1", parentId: "page-2", position: 1 },
      { id: "page-2", position: 0 },
    ]));
    expect(appMock.updateDocPage).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('Moved "Getting Started" under "Architecture"', "success");
  });

  it("reorders root pages through tree drag-drop", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    act(() => {
      mockDocsDnd.onDragEnd({
        draggableId: "page-1",
        source: { droppableId: "dnd-root", index: 0 },
        destination: { droppableId: "dnd-root", index: 1 },
      });
    });

    expect(appMock.reorderDocPages).toHaveBeenCalledTimes(1);
    expect(appMock.reorderDocPages.mock.calls[0][0]).toEqual([
      { id: "page-2", position: 0 },
      { id: "page-1", position: 1, parentId: null },
    ]);
    expect(appMock.updateDocPage).not.toHaveBeenCalled();
  });

  it("blocks nesting a page under its own descendant", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    act(() => {
      mockDocsDnd.onDragEnd({
        draggableId: "page-2",
        source: { droppableId: "dnd-root", index: 1 },
        combine: { draggableId: "page-3" },
      });
    });

    expect(appMock.reorderDocPages).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(expect.stringMatching(/can't be moved into itself/i), "error");
  });

  it("blocks reordering a page into its own child list", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    act(() => {
      mockDocsDnd.onDragEnd({
        draggableId: "page-2",
        source: { droppableId: "dnd-root", index: 1 },
        destination: { droppableId: "page-2", index: 0 },
      });
    });

    expect(appMock.reorderDocPages).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(expect.stringMatching(/can't be moved into itself/i), "error");
  });

  it("hides spaces from other projects but keeps legacy spaces without a projectId", () => {
    const appMock = createAppMock({
      spaces: [
        { id: "space-1", name: "Engineering", color: "#2563eb", icon: "📘", projectId: "proj-1" },
        { id: "space-legacy", name: "Legacy Wiki", color: "#059669", icon: "📗" },
        { id: "space-other", name: "Other Project", color: "#dc2626", icon: "📕", projectId: "proj-2" },
      ],
    });
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    expect(screen.getAllByText(/Engineering/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Legacy Wiki/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Other Project/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /1 space in other projects/i }));
    expect(screen.getAllByText(/Other Project/).length).toBeGreaterThan(0);
  });

  it("stamps new spaces with the current project", () => {
    const appMock = createAppMock({ createSpace: jest.fn(() => "space-new") });
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    fireEvent.click(screen.getByTitle(/New space/i));
    fireEvent.change(screen.getByPlaceholderText(/Engineering Docs/i), { target: { value: "Runbooks" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^Create Space$/i }).at(-1));

    expect(appMock.createSpace).toHaveBeenCalledWith(expect.objectContaining({ name: "Runbooks", projectId: "proj-1" }));
  });

  it("opens the page referenced by a ?page= deep link", () => {
    mockLocation.search = "?page=page-3";
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Child Notes" })).toBeInTheDocument();
  });

  it("falls back to the space overview when the selected page disappears", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    const { rerender } = render(<DocsPage />);
    fireEvent.click(screen.getByRole("treeitem", { name: "Getting Started" }));
    expect(screen.getByRole("heading", { level: 1, name: "Getting Started" })).toBeInTheDocument();

    mockUseApp.mockReturnValue({ ...appMock, docPages: appMock.docPages.filter((page) => page.id !== "page-1") });
    rerender(<DocsPage />);

    expect(screen.queryByRole("heading", { level: 1, name: "Getting Started" })).not.toBeInTheDocument();
    expect(screen.getByText(/Space Overview/i)).toBeInTheDocument();
  });

  it("refuses to save when the docs document would exceed its storage budget", () => {
    const hugeContent = "x".repeat(950 * 1024);
    const appMock = createAppMock();
    appMock.docPages = appMock.docPages.map((page) => (page.id === "page-2" ? { ...page, content: hugeContent } : page));
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    fireEvent.click(screen.getByRole("treeitem", { name: "Getting Started" }));
    fireEvent.click(screen.getByRole("heading", { level: 1, name: "Getting Started" }));
    const titleInput = screen.getByDisplayValue("Getting Started");
    fireEvent.change(titleInput, { target: { value: "Getting Started v2" } });
    fireEvent.blur(titleInput);

    expect(appMock.updateDocPage).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(expect.stringMatching(/storage limit/i), "error", 6000);
  });

  it("sends targeted mention notifications for doc comments", () => {
    const appMock = createAppMock({
      users: [
        { id: "u-1", username: "alice", name: "Alice" },
        { id: "u-2", username: "bob", name: "Bob" },
      ],
    });
    mockUseApp.mockReturnValue(appMock);

    render(<DocsPage />);

    fireEvent.click(screen.getByRole("treeitem", { name: "Architecture" }));
    fireEvent.change(screen.getByPlaceholderText(/Add a comment/i), {
      target: { value: "@bob @alice @nobody please review" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Post Comment/i }));

    // bob is mentioned (alice is the author and is never notified about her own comment)
    expect(appMock.addNotification).toHaveBeenCalledTimes(1);
    expect(appMock.addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: "mention",
      recipient: "bob",
      pageId: "page-2",
      route: "docs?page=page-2",
    }));
  });

  describe("viewer read-only mode", () => {
    beforeEach(() => {
      mockCanPerform.mockImplementation((key) => key !== "docs:edit");
    });

    it("hides space/page creation, tree actions and drag handles, and shows a read-only hint", () => {
      render(<DocsPage />);

      expect(mockCanPerform).toHaveBeenCalledWith("docs:edit");
      expect(screen.getByTestId("docs-read-only-hint")).toHaveTextContent(/Read-only/i);
      expect(screen.queryByTitle(/New space/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/New page/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Create Space/i })).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Space actions/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Add child page/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/More options/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Drag to reorder/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /New Page/i })).not.toBeInTheDocument();
      // Pages remain readable
      expect(screen.getAllByText("Getting Started").length).toBeGreaterThan(0);
    });

    it("renders the page view without edit, child, delete or title-edit controls", () => {
      const appMock = createAppMock();
      mockUseApp.mockReturnValue(appMock);
      render(<DocsPage />);

      fireEvent.click(screen.getByRole("treeitem", { name: "Getting Started" }));
      const heading = screen.getByRole("heading", { level: 1, name: "Getting Started" });
      expect(heading).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Add child page/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Delete page/i)).not.toBeInTheDocument();

      fireEvent.click(heading);
      expect(screen.queryByDisplayValue("Getting Started")).not.toBeInTheDocument();

      // Cmd+S cannot save anything
      fireEvent.keyDown(window, { key: "s", metaKey: true });
      expect(appMock.updateDocPage).not.toHaveBeenCalled();
    });

    it("keeps comments readable but disables posting and deleting doc comments", () => {
      const appMock = createAppMock();
      mockUseApp.mockReturnValue(appMock);
      render(<DocsPage />);

      fireEvent.click(screen.getByRole("treeitem", { name: "Getting Started" }));

      expect(screen.getByText("Existing note")).toBeInTheDocument();
      expect(screen.getByTestId("docs-comments-read-only")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/Add a comment/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Post Comment/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Delete comment/i)).not.toBeInTheDocument();
      expect(appMock.addDocComment).not.toHaveBeenCalled();
    });

    it("guards drag-and-drop handlers so viewers cannot reorder or nest pages", () => {
      const appMock = createAppMock();
      mockUseApp.mockReturnValue(appMock);
      render(<DocsPage />);

      act(() => {
        mockDocsDnd.onDragEnd({
          draggableId: "page-1",
          source: { droppableId: "dnd-root", index: 0 },
          combine: { draggableId: "page-2" },
        });
      });
      act(() => {
        mockDocsDnd.onDragEnd({
          draggableId: "page-1",
          source: { droppableId: "dnd-root", index: 0 },
          destination: { droppableId: "dnd-root", index: 1 },
        });
      });

      expect(appMock.reorderDocPages).not.toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith(expect.stringMatching(/read-only/i), "error");
    });

    it("shows no create actions on an empty workspace", () => {
      mockUseApp.mockReturnValue(createAppMock({ spaces: [], docPages: [] }));
      render(<DocsPage />);

      expect(screen.getByText(/Welcome to Documentation/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Create first space/i })).not.toBeInTheDocument();
    });
  });
});
