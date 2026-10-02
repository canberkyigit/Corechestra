import React, { useRef, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, FIELD } from "../constants/testingConstants";
import { Field, Modal } from "../components/ui";

/** Name prompt for a new suite (root) or sub-folder. */
export default function FolderDialog({ parent, onSubmit, onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const inputRef = useRef(null);
  const submit = (event) => {
    event?.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), parentId: parent?.id || null });
  };
  return (
    <Modal
      title={parent ? "New folder" : "New test suite"}
      subtitle={parent ? `Inside “${parent.name}”` : "A top-level suite groups folders and cases (e.g. Web App, API, Mobile)."}
      size="sm"
      onClose={onClose}
      initialFocusRef={inputRef}
      testId="tests-folder-dialog"
      footer={(
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={submit} disabled={!name.trim()} className={BTN_PRIMARY} data-testid="tests-folder-submit">Create</button>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" htmlFor="tests-folder-name">
          <input ref={inputRef} id="tests-folder-name" type="text" value={name} onChange={(event) => setName(event.target.value)} className={FIELD} placeholder={parent ? "e.g. Checkout" : "e.g. Web App"} data-testid="tests-folder-name" />
        </Field>
        {!parent && (
          <Field label="Description" htmlFor="tests-folder-description">
            <input id="tests-folder-description" type="text" value={description} onChange={(event) => setDescription(event.target.value)} className={FIELD} />
          </Field>
        )}
      </form>
    </Modal>
  );
}
