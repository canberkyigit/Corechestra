import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import DocsPage from "./DocsPage";

const mockUseApp = jest.fn();
const mockAddToast = jest.fn();
const mockDocsDnd = {};

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
    addDocComment: jest.fn(),
    deleteDocComment: jest.fn(),
    projects: [{ id: "proj-1", name: "Corechestra" }],
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
    mockUseApp.mockReturnValue(createAppMock());
    mockDocsDnd.onDragEnd = undefined;
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

    fireEvent.click(screen.getAllByRole("button", { name: /Getting Started/i })[0]);
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

    fireEvent.click(screen.getAllByRole("button", { name: /Getting Started/i })[0]);
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

    expect(appMock.updateDocPage).toHaveBeenCalledWith(expect.objectContaining({
      id: "page-1",
      parentId: "page-2",
      position: 1,
    }));
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

    const updateCalls = appMock.updateDocPage.mock.calls.map(([page]) => page);
    expect(updateCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "page-2", position: 0, parentId: null }),
      expect.objectContaining({ id: "page-1", position: 1, parentId: null }),
    ]));
  });
});
