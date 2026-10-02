/**
 * Accessibility fixes for legacy markdown/MDX content, applied at build time:
 * - iframes get a title
 * - aria-hidden heading anchors are taken out of the tab order
 * - tables (which scroll horizontally) become keyboard focusable
 * - empty <th> cells get visually hidden text
 */
export default function rehypeA11y() {
  const text = (n) => (n.type === "text" ? n.value : (n.children ?? []).map(text).join(""));

  // Raw HTML embedded in markdown arrives as an unparsed string, so patch it with regexes.
  const fixRaw = (html) =>
    html
      .replace(/<iframe(?![^>]*\btitle=)/gi, '<iframe title="Embedded content"')
      .replace(/<table(?![^>]*\btabindex=)/gi, '<table tabindex="0"');

  const walk = (node) => {
    if (node.type === "raw") node.value = fixRaw(node.value);
    if (node.type === "element") {
      const p = (node.properties ??= {});
      switch (node.tagName) {
        case "iframe":
          p.title ??= "Embedded content";
          break;
        case "a":
          if (p.ariaHidden === "true" || p["aria-hidden"] === "true") p.tabIndex = -1;
          break;
        case "table":
          p.tabIndex = 0;
          break;
        case "th":
          if (!text(node).trim()) {
            node.children = [
              { type: "element", tagName: "span", properties: { className: ["sr-only"] }, children: [{ type: "text", value: "Row" }] },
            ];
          }
          break;
      }
    }
    node.children?.forEach(walk);
  };
  return (tree) => walk(tree);
}
