import { parse, parseFragment, type DefaultTreeAdapterTypes } from "parse5";

export { parse };
export type HtmlNode = DefaultTreeAdapterTypes.Node;
export type HtmlElement = DefaultTreeAdapterTypes.Element;

export function elements(node: HtmlNode, tag?: string): HtmlElement[] {
  const own = "tagName" in node && (!tag || node.tagName === tag) ? [node] : [];
  return [
    ...own,
    ...("childNodes" in node
      ? node.childNodes.flatMap((child) => elements(child, tag))
      : []),
  ];
}

export function attr(node: HtmlElement, name: string): string | undefined {
  return node.attrs.find((attribute) => attribute.name === name)?.value;
}

export function text(node: HtmlNode): string {
  if ("value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(text).join("") : "";
}

export function decodeEntities(value: string): string {
  return text(parseFragment(value));
}
