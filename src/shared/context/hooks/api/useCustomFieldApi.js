export function useCustomFieldApi({
  customFieldDefs,
  customFieldActions,
}) {
  return {
    customFieldDefs,
    createCustomFieldDef: customFieldActions.createCustomFieldDef,
    updateCustomFieldDef: customFieldActions.updateCustomFieldDef,
    archiveCustomFieldDef: customFieldActions.archiveCustomFieldDef,
    restoreCustomFieldDef: customFieldActions.restoreCustomFieldDef,
    deleteCustomFieldDef: customFieldActions.deleteCustomFieldDef,
    reorderCustomFieldDefs: customFieldActions.reorderCustomFieldDefs,
    moveCustomFieldDef: customFieldActions.moveCustomFieldDef,
  };
}
