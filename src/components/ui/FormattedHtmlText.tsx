import React from "react";
import { StyleSheet, Text, View, Linking } from "react-native";
import { colors, fontFamily } from "../../theme";

interface FormattedHtmlTextProps {
  html: string | null | undefined;
  style?: object;
}

interface TextSegment {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  isHeading?: boolean;
  headingLevel?: number;
  isLink?: boolean;
  linkUrl?: string;
}

function decodeHtmlEntities(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function FormattedHtmlText({ html, style }: FormattedHtmlTextProps) {
  if (!html || !html.trim()) {
    return null;
  }

  const clean = html.replace(/\r\n/g, "\n");
  const paragraphs = clean.split(/<\/(?:p|div|h[1-6]|ul|ol)>/i);

  return (
    <View style={[styles.container, style]}>
      {paragraphs.map((para, index) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Check if paragraph is a heading
        const headingMatch = trimmed.match(/^<h([1-6])(?:\s+[^>]*)?>(.*)/i);
        if (headingMatch) {
          const level = parseInt(headingMatch[1], 10);
          const content = decodeHtmlEntities(headingMatch[2].replace(/<[^>]+>/g, ""));
          return (
            <Text key={index} style={[styles.heading, level === 1 && styles.h1, level === 2 && styles.h2]}>
              {content}
            </Text>
          );
        }

        // Check list items
        if (/<li(?:\s+[^>]*)?>/i.test(trimmed)) {
          const listItems = trimmed.split(/<\/?li(?:\s+[^>]*)?>/i).filter((item) => item.replace(/<[^>]+>/g, "").trim().length > 0);
          return (
            <View key={index} style={styles.listContainer}>
              {listItems.map((item, itemIdx) => {
                const itemClean = decodeHtmlEntities(item.replace(/<[^>]+>/g, "").trim());
                return (
                  <View key={itemIdx} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.listText}>{itemClean}</Text>
                  </View>
                );
              })}
            </View>
          );
        }

        // Standard text paragraph with inline bold / italic parsing
        const inlineSegments = parseInlineSegments(trimmed);
        if (inlineSegments.length === 0) return null;

        return (
          <Text key={index} style={styles.paragraph}>
            {inlineSegments.map((seg, segIdx) => {
              const textStyle = [
                styles.bodyText,
                seg.isBold && styles.boldText,
                seg.isItalic && styles.italicText,
                seg.isLink && styles.linkText,
              ];

              if (seg.isLink && seg.linkUrl) {
                return (
                  <Text
                    key={segIdx}
                    style={textStyle}
                    onPress={() => Linking.openURL(seg.linkUrl!)}
                  >
                    {seg.text}
                  </Text>
                );
              }

              return (
                <Text key={segIdx} style={textStyle}>
                  {seg.text}
                </Text>
              );
            })}
          </Text>
        );
      })}
    </View>
  );
}

function parseInlineSegments(rawHtml: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const tagRegex = /<(\/?)(b|strong|i|em|a|br)\b([^>]*)>/gi;

  let lastIndex = 0;
  let isBold = false;
  let isItalic = false;
  let isLink = false;
  let linkUrl = "";

  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(rawHtml)) !== null) {
    const textBefore = rawHtml.substring(lastIndex, match.index);
    if (textBefore) {
      const decoded = decodeHtmlEntities(textBefore.replace(/<[^>]+>/g, ""));
      if (decoded) {
        segments.push({ text: decoded, isBold, isItalic, isLink, linkUrl });
      }
    }

    const isClosing = match[1] === "/";
    const tagName = match[2].toLowerCase();

    if (tagName === "br") {
      segments.push({ text: "\n", isBold, isItalic });
    } else if (tagName === "b" || tagName === "strong") {
      isBold = !isClosing;
    } else if (tagName === "i" || tagName === "em") {
      isItalic = !isClosing;
    } else if (tagName === "a") {
      if (isClosing) {
        isLink = false;
        linkUrl = "";
      } else {
        isLink = true;
        const hrefMatch = match[3].match(/href=["']([^"']+)["']/i);
        linkUrl = hrefMatch ? hrefMatch[1] : "";
      }
    }

    lastIndex = tagRegex.lastIndex;
  }

  const remainingText = rawHtml.substring(lastIndex);
  if (remainingText) {
    const decoded = decodeHtmlEntities(remainingText.replace(/<[^>]+>/g, ""));
    if (decoded) {
      segments.push({ text: decoded, isBold, isItalic, isLink, linkUrl });
    }
  }

  return segments;
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  heading: {
    fontFamily: fontFamily.displayBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 2,
  },
  h1: {
    fontSize: 20,
  },
  h2: {
    fontSize: 18,
  },
  paragraph: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bodyText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  boldText: {
    fontFamily: fontFamily.bodySemiBold,
    color: colors.textPrimary,
  },
  italicText: {
    fontStyle: "italic",
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: "underline",
  },
  listContainer: {
    gap: 4,
    marginVertical: 4,
  },
  listItem: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  bullet: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  listText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});
