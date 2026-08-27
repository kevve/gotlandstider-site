/**
 * Serializes JSON for safe embedding in an HTML <script> element.
 *
 * JSON permits literal '<', but HTML parsers treat '</script>' as the end of a
 * script element regardless of its type. Escaping HTML-significant characters
 * prevents CMS content from breaking out of JSON-LD while preserving its value
 * when the JSON is parsed.
 */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);

  if (json === undefined) {
    throw new TypeError("JSON-LD value must be JSON-serializable");
  }

  return json.replace(/[<>&\u2028\u2029]/g, (character) => {
    switch (character) {
      case "<":
        return "\\u003c";
      case ">":
        return "\\u003e";
      case "&":
        return "\\u0026";
      case "\u2028":
        return "\\u2028";
      case "\u2029":
        return "\\u2029";
      default:
        return character;
    }
  });
}
