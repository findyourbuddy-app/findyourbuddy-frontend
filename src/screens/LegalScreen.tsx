import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fontFamily, spacing, typeScale } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Legal">;

const TERMS_TEXT = `Bu bir yer tutucu metindir. FindYourBuddy'yi gerçek kullanıcılara açmadan önce
bu metnin yerine bir avukat tarafından hazırlanmış gerçek Kullanım Şartları konulmalıdır.

Genel olarak burada şunlar yer almalı: hizmetin tanımı, kullanıcı yükümlülükleri, yaş sınırı,
hesap askıya alma/kapatma koşulları, sorumluluk sınırlamaları ve uyuşmazlık çözümü.`;

const PRIVACY_TEXT = `Bu bir yer tutucu metindir. FindYourBuddy'yi gerçek kullanıcılara açmadan önce
bu metnin yerine gerçek bir Gizlilik Politikası konulmalıdır.

Genel olarak burada şunlar yer almalı: hangi verilerin toplandığı (konum, fotoğraf, mesajlar),
verilerin nasıl kullanıldığı, üçüncü taraflarla paylaşım, veri saklama süresi ve kullanıcının
verilerini silme/indirme hakları (KVKK/GDPR uyumu).`;

export function LegalScreen({ route }: Props) {
  const isTerms = route.params.kind === "terms";

  return (
    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      <Text style={typeScale.h1}>{isTerms ? "Kullanım Şartları" : "Gizlilik Politikası"}</Text>
      <Text style={styles.body}>{isTerms ? TERMS_TEXT : PRIVACY_TEXT}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
