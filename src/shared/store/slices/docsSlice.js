import { createFieldSetter } from "../createStoreSetters";

export const docsInitialState = {
  spaces: [],
  docPages: [],
};

export function createDocsSlice(set) {
  return {
    ...docsInitialState,
    setSpaces: createFieldSetter("spaces", set),
    setDocPages: createFieldSetter("docPages", set),
  };
}
