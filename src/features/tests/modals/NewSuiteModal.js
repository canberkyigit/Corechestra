import React, { useEffect, useRef, useState } from "react";
import { FaFlask } from "react-icons/fa";
import { INPUT_CLASS } from "../constants/testingConstants";
import { FormError, LabeledField, ModalFooter, ModalHeader, ModalOverlay } from "../components/TestingPrimitives";

export default function NewSuiteModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!name.trim()) { setError("Suite name is required."); return; }
    onCreate({ name: name.trim(), description: desc.trim() });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} labelledBy="new-suite-modal-title">
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <ModalHeader id="new-suite-modal-title" icon={<FaFlask className="text-blue-400 w-4 h-4" />} title="New Test Suite" onClose={onClose} />
        <div className="px-6 py-5 space-y-4">
          <FormError message={error} />
          <LabeledField label="Suite Name *" htmlFor="suite-name">
            <input
              id="suite-name"
              ref={inputRef}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="e.g. Authentication Flow"
              className={INPUT_CLASS}
            />
          </LabeledField>
          <LabeledField label="Description" htmlFor="suite-description">
            <textarea
              id="suite-description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional description of this test suite..."
              rows={3}
              className={`${INPUT_CLASS} resize-none`}
            />
          </LabeledField>
        </div>
        <ModalFooter onCancel={onClose} onSubmit={handleSubmit} submitLabel="Create Suite" />
      </div>
    </ModalOverlay>
  );
}
