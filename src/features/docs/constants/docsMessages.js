export const CYCLE_MOVE_MESSAGE = "A page can't be moved into itself or one of its child pages";
export const UNSAVED_CONFIRM_MESSAGE = "You have unsaved changes on this page. Discard them?";
export const DOCS_READ_ONLY_MESSAGE = "You have read-only access to documentation";

/** Default body for pages created without a template. */
export const DEFAULT_PAGE_CONTENT = (title) => `# ${title}

Write your content here...

## Overview

Describe what this page covers.

## Details

Add more details below.
`;
