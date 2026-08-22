import { cleanHtmlText } from "./text";

describe("cleanHtmlText", () => {
  it("returns empty string for null and undefined", () => {
    expect(cleanHtmlText(null)).toBe("");
    expect(cleanHtmlText(undefined)).toBe("");
  });

  it("strips HTML tags", () => {
    expect(cleanHtmlText("<b>hello</b>")).toBe("hello");
    expect(cleanHtmlText("<p>foo</p>")).toBe("foo");
  });

  it("replaces block-level closing tags with newlines", () => {
    expect(cleanHtmlText("<p>first</p><p>second</p>")).toBe("first\nsecond");
    expect(cleanHtmlText("line1<br/>line2")).toBe("line1\nline2");
    expect(cleanHtmlText("<div>a</div><div>b</div>")).toBe("a\nb");
  });

  it("decodes common HTML entities", () => {
    expect(cleanHtmlText("a &amp; b")).toBe("a & b");
    expect(cleanHtmlText("say &quot;hi&quot;")).toBe('say "hi"');
    expect(cleanHtmlText("it&#39;s")).toBe("it's");
    expect(cleanHtmlText("5 &lt; 10 &gt; 3")).toBe("5 < 10 > 3");
    expect(cleanHtmlText("a&nbsp;b")).toBe("a b");
  });

  it("collapses multiple spaces", () => {
    expect(cleanHtmlText("foo   bar")).toBe("foo bar");
  });

  it("trims leading and trailing whitespace", () => {
    expect(cleanHtmlText("  hello  ")).toBe("hello");
  });

  it("handles plain text without modification", () => {
    expect(cleanHtmlText("Hello World")).toBe("Hello World");
  });
});
