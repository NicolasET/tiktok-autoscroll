const FORM_FIELD_TAGS = /^(INPUT|TEXTAREA|SELECT)$/;

/** True while the user is typing somewhere (search box, comment field...). */
export function isEditable(element: Element | null): boolean {
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable || FORM_FIELD_TAGS.test(element.tagName))
  );
}
