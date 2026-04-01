export function useDocsApi({
  spaces,
  docPages,
  docsActions,
}) {
  return {
    spaces,
    createSpace: docsActions.createSpace,
    updateSpace: docsActions.updateSpace,
    deleteSpace: docsActions.deleteSpace,
    docPages,
    createDocPage: docsActions.createDocPage,
    updateDocPage: docsActions.updateDocPage,
    deleteDocPage: docsActions.deleteDocPage,
    moveDocPage: docsActions.moveDocPage,
    addDocComment: docsActions.addDocComment,
    deleteDocComment: docsActions.deleteDocComment,
  };
}
