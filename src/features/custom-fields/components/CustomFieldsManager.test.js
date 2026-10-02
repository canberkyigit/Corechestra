import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import CustomFieldsManager from "./CustomFieldsManager";

const mockUseApp = jest.fn();
const mockPermissions = jest.fn();
const mockAddToast = jest.fn();

jest.mock("@headlessui/react", () => {
  const ReactLib = require("react");
  const ChangeContext = ReactLib.createContext(null);
  const Listbox = ({ children, onChange }) => (
    <ChangeContext.Provider value={onChange}><div>{children}</div></ChangeContext.Provider>
  );
  Listbox.Button = ({ children, ...props }) => <button type="button" {...props}>{children}</button>;
  Listbox.Options = ({ children }) => <div>{children}</div>;
  Listbox.Option = function MockOption({ children, className, value }) {
    const onChange = ReactLib.useContext(ChangeContext);
    return (
      <div role="option" aria-selected="false" onClick={() => onChange?.(value)} className={typeof className === "function" ? className({}) : className}>
        {typeof children === "function" ? children({}) : children}
      </div>
    );
  };
  return { Listbox };
});
jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ addToast: mockAddToast }) }));
jest.mock("../../board/hooks/useBoardPermissions", () => ({ useBoardPermissions: () => mockPermissions() }));

const severity = {
  id: "cf-sev", projectId: "p1", name: "Severity", type: "select", order: 0, required: true, showOnCard: true,
  appliesToTypes: ["bug"], options: [{ id: "o1", label: "High", color: "#dc2626" }],
};
const customer = { id: "cf-cu", projectId: "p1", name: "Customer", type: "text", order: 1, appliesToTypes: [] };
const legacy = { id: "cf-old", projectId: "p1", name: "Legacy", type: "text", order: 2, archived: true };

function appValue(overrides = {}) {
  return {
    customFieldDefs: [severity, customer, legacy, { id: "cf-x", projectId: "p2", name: "Other project", type: "text" }],
    createCustomFieldDef: jest.fn(),
    updateCustomFieldDef: jest.fn(),
    archiveCustomFieldDef: jest.fn(),
    restoreCustomFieldDef: jest.fn(),
    deleteCustomFieldDef: jest.fn(() => 1),
    moveCustomFieldDef: jest.fn(),
    currentProjectId: "p1",
    activeTasks: [{ id: "t1", projectId: "p1", customFields: { "cf-old": "kept" } }],
    backlogSections: [],
    archivedTasks: [],
    users: [],
    teamMembers: [{ value: "alice", label: "Alice" }],
    projects: [{ id: "p1", name: "Core" }],
    ...overrides,
  };
}

describe("CustomFieldsManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissions.mockReturnValue({ canManageFields: true });
  });

  it("lists the project's active fields with their flags", () => {
    mockUseApp.mockReturnValue(appValue());
    render(<CustomFieldsManager projectId="p1" />);
    const list = screen.getByRole("list", { name: "Custom fields" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    const row = screen.getByTestId("custom-field-row-cf-sev");
    expect(within(row).getByText("Required")).toBeInTheDocument();
    expect(within(row).getByText("On card")).toBeInTheDocument();
    expect(within(row).getByText("Bug")).toBeInTheDocument();
    expect(screen.queryByText("Other project")).not.toBeInTheDocument();
    expect(screen.getByText("Archived fields (1)")).toBeInTheDocument();
  });

  it("creates a select field with options through the dialog", () => {
    const value = appValue();
    mockUseApp.mockReturnValue(value);
    render(<CustomFieldsManager projectId="p1" />);

    fireEvent.click(screen.getByRole("button", { name: /New field/i }));
    const dialog = screen.getByRole("dialog", { name: "New custom field" });
    fireEvent.click(within(dialog).getByRole("button", { name: /Create field/i }));
    expect(within(dialog).getByText("Field name is required")).toBeInTheDocument();
    expect(value.createCustomFieldDef).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Environment" } });
    fireEvent.click(within(dialog).getByRole("radio", { name: /^Select/ }));
    fireEvent.change(within(dialog).getByLabelText("Option 1 label"), { target: { value: "Prod" } });
    fireEvent.change(within(dialog).getByLabelText("New option"), { target: { value: "Staging" } });
    fireEvent.keyDown(within(dialog).getByLabelText("New option"), { key: "Enter" });
    fireEvent.click(within(dialog).getByRole("button", { name: /Bug/ }));
    fireEvent.click(within(dialog).getByRole("switch", { name: "Required" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Create field/i }));

    expect(value.createCustomFieldDef).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "p1",
      name: "Environment",
      type: "select",
      required: true,
      appliesToTypes: ["bug"],
      options: [expect.objectContaining({ label: "Prod" }), expect.objectContaining({ label: "Staging" })],
    }));
    expect(mockAddToast).toHaveBeenCalledWith('Field "Environment" created', "success");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rejects duplicate names and locks the type when editing", () => {
    const value = appValue();
    mockUseApp.mockReturnValue(value);
    render(<CustomFieldsManager projectId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Customer" }));
    const dialog = screen.getByRole("dialog", { name: "Edit field Customer" });
    expect(within(dialog).getByRole("radio", { name: /^Number/ })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "severity" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Save field/i }));
    expect(within(dialog).getByText(/already exists/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Client" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Save field/i }));
    expect(value.updateCustomFieldDef).toHaveBeenCalledWith("cf-cu", expect.objectContaining({ name: "Client", type: "text" }));
  });

  it("reorders, archives, restores and only hard-deletes archived fields after confirmation", () => {
    const value = appValue();
    mockUseApp.mockReturnValue(value);
    render(<CustomFieldsManager projectId="p1" />);

    expect(screen.getByRole("button", { name: "Move Severity up" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Move Severity down" }));
    expect(value.moveCustomFieldDef).toHaveBeenCalledWith("cf-sev", 1);

    fireEvent.click(screen.getByRole("button", { name: "Archive Customer" }));
    expect(value.archiveCustomFieldDef).toHaveBeenCalledWith("cf-cu");
    expect(screen.queryByRole("button", { name: /Delete Customer/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Archived fields (1)"));
    const archivedRow = screen.getByTestId("custom-field-archived-cf-old");
    expect(within(archivedRow).getByText(/1 task with a value/)).toBeInTheDocument();
    fireEvent.click(within(archivedRow).getByRole("button", { name: "Restore Legacy" }));
    expect(value.restoreCustomFieldDef).toHaveBeenCalledWith("cf-old");

    fireEvent.click(within(archivedRow).getByRole("button", { name: "Delete Legacy permanently" }));
    expect(within(archivedRow).getByRole("alert")).toHaveTextContent(/removed from 1 task. This cannot be undone/);
    expect(value.deleteCustomFieldDef).not.toHaveBeenCalled();
    fireEvent.click(within(archivedRow).getByRole("button", { name: "Delete permanently" }));
    expect(value.deleteCustomFieldDef).toHaveBeenCalledWith("cf-old");
  });

  it("is read-only without the fields:manage permission", () => {
    mockPermissions.mockReturnValue({ canManageFields: false });
    mockUseApp.mockReturnValue(appValue());
    render(<CustomFieldsManager projectId="p1" />);
    expect(screen.queryByRole("button", { name: /New field/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Severity" })).not.toBeInTheDocument();
    expect(screen.getByText(/Manage project custom fields/)).toBeInTheDocument();
  });
});
