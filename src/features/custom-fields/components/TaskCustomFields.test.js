import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import TaskCustomFields from "./TaskCustomFields";

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

const DEFS = [
  { id: "cf-sev", name: "Severity", type: "select", required: true, options: [{ id: "hi", label: "High", color: "#dc2626" }, { id: "lo", label: "Low", color: "#059669" }] },
  { id: "cf-br", name: "Browsers", type: "multiselect", options: [{ id: "ch", label: "Chrome", color: "#2563eb" }, { id: "ff", label: "Firefox", color: "#ea580c" }] },
  { id: "cf-cu", name: "Customer", type: "text" },
  { id: "cf-num", name: "Budget", type: "number" },
  { id: "cf-url", name: "Spec", type: "url" },
  { id: "cf-chk", name: "Customer facing", type: "checkbox" },
  { id: "cf-usr", name: "QA owner", type: "user" },
];
const MEMBERS = [{ value: "unassigned", label: "Unassigned" }, { value: "alice", label: "Alice" }];

function renderFields(props = {}) {
  const onChange = jest.fn();
  render(<TaskCustomFields defs={DEFS} values={{}} onChange={onChange} members={MEMBERS} users={[]} {...props} />);
  return { onChange };
}

describe("TaskCustomFields", () => {
  it("renders nothing when no field applies", () => {
    const { container } = render(<TaskCustomFields defs={[]} values={{}} onChange={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("flags empty required fields", () => {
    renderFields();
    expect(screen.getByText("1 required field empty")).toBeInTheDocument();
    expect(screen.getByLabelText("required")).toBeInTheDocument();
  });

  it("emits drafts while typing and commits normalised values on blur", () => {
    const onChange = jest.fn();
    // Controlled like the modal / panel: drafts are stored by the parent.
    function Harness() {
      const [values, setValues] = React.useState({});
      return (
        <TaskCustomFields
          defs={DEFS}
          values={values}
          members={MEMBERS}
          onChange={(fieldId, value, meta) => { onChange(fieldId, value, meta); setValues((prev) => ({ ...prev, [fieldId]: value })); }}
        />
      );
    }
    render(<Harness />);
    const input = screen.getByLabelText("Customer", { selector: "input" });
    fireEvent.change(input, { target: { value: " Acme " } });
    expect(onChange).toHaveBeenLastCalledWith("cf-cu", " Acme ", { commit: false });
    fireEvent.blur(input, { target: { value: " Acme " } });
    expect(onChange).toHaveBeenLastCalledWith("cf-cu", "Acme", { commit: true });

    const number = screen.getByLabelText("Budget", { selector: "input" });
    fireEvent.change(number, { target: { value: "42" } });
    fireEvent.keyDown(number, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("cf-num", 42, { commit: true });
  });

  it("commits discrete editors immediately", () => {
    const { onChange } = renderFields({ values: { "cf-br": ["ch"] } });
    const severity = screen.getByTestId("custom-field-cf-sev");
    fireEvent.click(within(severity).getAllByRole("option").find((node) => node.textContent === "High"));
    expect(onChange).toHaveBeenLastCalledWith("cf-sev", "hi", { commit: true });

    fireEvent.click(screen.getByRole("button", { name: "Firefox" }));
    expect(onChange).toHaveBeenLastCalledWith("cf-br", ["ch", "ff"], { commit: true });
    fireEvent.click(screen.getByRole("button", { name: /Chrome/ }));
    expect(onChange).toHaveBeenLastCalledWith("cf-br", undefined, { commit: true });

    fireEvent.click(screen.getByRole("checkbox", { name: "Customer facing" }));
    expect(onChange).toHaveBeenLastCalledWith("cf-chk", true, { commit: true });

    const owner = screen.getByTestId("custom-field-cf-usr");
    expect(within(owner).queryByText("Unassigned")).not.toBeInTheDocument();
    fireEvent.click(within(owner).getAllByRole("option").find((node) => node.textContent === "Alice"));
    expect(onChange).toHaveBeenLastCalledWith("cf-usr", "alice", { commit: true });
  });

  it("shows validation errors for malformed values", () => {
    renderFields({ values: { "cf-url": "not a link", "cf-sev": "hi" } });
    expect(screen.getByText(/Spec must be a valid http\(s\) URL/)).toBeInTheDocument();
    expect(screen.queryByText(/required field/)).not.toBeInTheDocument();
  });

  it("renders values read-only for viewers", () => {
    renderFields({
      readOnly: true,
      values: { "cf-sev": "hi", "cf-cu": "Acme", "cf-url": "https://example.com", "cf-chk": true },
    });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /example\.com/ })).toHaveAttribute("href", "https://example.com");
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });
});
