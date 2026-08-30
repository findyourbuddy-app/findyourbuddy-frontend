import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { searchUniversities } from "../../api/universities";
import type { LanguageKey } from "../../context/ThemeContext";
import { colors, fontFamily, radius, spacing } from "../../theme";

interface UniversityAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  language?: LanguageKey;
}

export function UniversityAutocomplete({
  value,
  onChangeText,
  placeholder,
  containerStyle,
  inputStyle,
  language = "tr",
}: UniversityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const list = await searchUniversities(query);
      setSuggestions(list);
      setShowDropdown(list.length > 0);
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTextChange = (text: string) => {
    onChangeText(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text.trim() || text.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 30);
  };

  const handleSelectUniversity = (uniName: string) => {
    onChangeText(uniName);
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onChangeText("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={styles.inputContainer}>
        <Feather name="book-open" size={16} color={colors.textSecondary} style={styles.leadingIcon} />
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={
            placeholder ??
            (language === "en" ? "Search university..." : "Üniversite ara veya yaz...")
          }
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (value.trim().length >= 2 && suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.trailingIcon} />
        ) : value.length > 0 ? (
          <Pressable onPress={handleClear} style={styles.trailingIcon}>
            <Feather name="x-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {showDropdown && suggestions.length > 0 ? (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownScroll}
          >
            {suggestions.map((item, index) => (
              <Pressable
                key={`${item}-${index}`}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  pressed && styles.dropdownItemPressed,
                  index < suggestions.length - 1 && styles.dropdownItemBorder,
                ]}
                onPress={() => handleSelectUniversity(item)}
              >
                <Feather name="award" size={15} color={colors.primary} style={styles.itemIcon} />
                <Text style={styles.itemText} numberOfLines={1}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 9999,
    elevation: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  leadingIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  trailingIcon: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  dropdown: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    maxHeight: 220,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 25,
    zIndex: 99999,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  dropdownItemPressed: {
    backgroundColor: "#F3F4F6",
  },
  dropdownItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemIcon: {
    marginRight: spacing.sm,
  },
  itemText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
});
