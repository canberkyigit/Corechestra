import React from "react";
import { Kbd, Modal } from "../components/ui";

const GROUPS = [
  {
    title: "Verdict (saves the execution)",
    items: [["P", "Pass"], ["F", "Fail"], ["B", "Blocked"], ["S", "Skip"], ["R", "Mark for retest"]],
  },
  {
    title: "Navigation",
    items: [["N", "Next case"], ["→", "Next case"], ["←", "Previous case"], ["K", "Previous case"], ["U", "Next untested case"]],
  },
  {
    title: "Other",
    items: [["D", "Create defect"], ["Space", "Pause / resume timer"], ["?", "Toggle this help"], ["Esc", "Close dialog / runner"]],
  },
];

export default function ShortcutHelp({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" subtitle="Shortcuts work while focus is not inside a text field." size="sm" onClose={onClose} testId="tests-shortcut-help">
      <div className="space-y-4">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{group.title}</h3>
            <ul className="space-y-1">
              {group.items.map(([key, label]) => (
                <li key={`${key}-${label}`} className="flex items-center justify-between text-sm text-slate-700">
                  <span>{label}</span>
                  <Kbd>{key}</Kbd>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
