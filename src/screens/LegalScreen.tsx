import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fontFamily, radius, spacing } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Legal">;

const TERMS_TEXT = `Son güncelleme: bu metin, FindYourBuddy uygulamasının yayına alınmasından önce bir hukuk danışmanı tarafından gözden geçirilmelidir. Aşağıdaki metin, hizmetin fiilen sunduğu özellikler esas alınarak hazırlanmış kapsamlı bir taslaktır.

1. Hizmetin Tanımı
FindYourBuddy ("Uygulama"), kullanıcıların katılacakları etkinlikler üzerinden birbirleriyle eşleşip sohbet edebildiği bir etkinlik-eşleştirme platformudur. Uygulama; profil oluşturma, etkinliklere katılım bildirimi, kaydırma (swipe) tabanlı eşleştirme, mesajlaşma, bildirim ve premium üyelik hizmetlerini kapsar.

2. Hesap Oluşturma ve Yaş Sınırı
Uygulamayı kullanabilmek için 18 yaşını doldurmuş olmak ve kayıt sırasında sunulan Kullanım Şartları ile Gizlilik Politikasını kabul etmiş olmak gerekir. Verdiğiniz bilgilerin doğru ve güncel olmasından siz sorumlusunuz. Hesabınızın güvenliğinden (şifre gizliliği dahil) yalnızca siz sorumlusunuz.

3. Kullanıcı Yükümlülükleri
Kullanıcılar; başka bir kişiyi taklit edemez, yanıltıcı/sahte profil bilgisi veya fotoğraf paylaşamaz, taciz, nefret söylemi, tehdit veya yasa dışı içerik paylaşamaz, ticari amaçla izinsiz tanıtım yapamaz. İhlal bildirimleri "Şikayet Et" / "Engelle" özellikleri üzerinden değerlendirilir.

4. Etkinlik Katılımı, Ücretler ve Eşleştirme
"Bu Etkinliğe Gidiyorum" seçeneğiyle bir etkinliğe katılım bildiriminde bulunduğunuzda, bu bilgi yalnızca ilgili etkinliğin eşleştirme havuzunda görünürlüğünüzü sağlamak amacıyla kullanılır. Uygulama bünyesinde doğrudan bilet satışı yapılmamaktadır; etkinlik kartlarında gösterilen ücretler kişi başı tahmini katılım/harcama bedeli veya bilgilendirme amaçlıdır. Bilet işlemleri üçüncü parti organizatör platformları üzerinden yürütülür.

5. Premium Üyelik ve Ödemeler
Premium üyelik satın alımları İyzico altyapısı üzerinden güvenli şekilde işlenir. Kart bilgileriniz Uygulama sunucularında saklanmaz. Premium üyelik; sınırsız kaydırma, gelişmiş filtreler, süper beğeni ve seni beğenenleri görme gibi ek özellikler sunar. İptal ve iade koşulları satın alma sırasında ayrıca belirtilir.

6. Hesap Askıya Alma ve Kapatma
Kullanım Şartlarının ihlali halinde hesabınız uyarılabilir, kısıtlanabilir veya kalıcı olarak kapatılabilir. Hesabınızı istediğiniz zaman Ayarlar bölümünden kalıcı olarak silebilirsiniz; bu işlem geri alınamaz.

7. Sorumluluğun Sınırlandırılması
Uygulama, kullanıcılar arasındaki etkileşimlerin (buluşmalar dahil) sonuçlarından sorumlu değildir. Kullanıcılar, başka kullanıcılarla bir araya gelirken makul güvenlik önlemlerini almakla yükümlüdür. Uygulama, kesintisiz veya hatasız hizmet garantisi vermez.

8. Uyuşmazlık Çözümü
İşbu şartlardan doğan uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır; yetkili mahkeme ve icra daireleri, kullanıcının yerleşim yerindeki veya Uygulama'nın kayıtlı işyeri adresindeki mahkeme ve icra daireleridir.

9. İletişim
Kullanım Şartlarına ilişkin sorularınız için Ayarlar > Destek bölümünden bize ulaşabilirsiniz.`;

const PRIVACY_TEXT = `KVKK Aydınlatma Metni ve Gizlilik Politikası

Son güncelleme: bu metin, FindYourBuddy'nin fiilen işlediği veri kategorileri esas alınarak hazırlanmış kapsamlı bir taslaktır; yayın öncesi bir hukuk danışmanınca onaylanmalıdır.

1. Veri Sorumlusu
6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla FindYourBuddy tarafından aşağıda açıklanan kapsamda işlenmektedir.

2. İşlenen Kişisel Veri Kategorileri ve Biyometrik Veri Açık Rızası (KVKK m.6)
• Kimlik ve iletişim bilgileri: ad, e-posta, doğum tarihi, meslek
• Profil bilgileri: fotoğraflar, ilgi alanları, biyografi, ses tanıtım kaydı
• Biyometrik Veri İşleme (Açık Rıza Bağlamında - KVKK m.6): Profil doğrulama (Mavi Tık) işlemi sırasında yüklediğiniz anlık özçekim (selfie) fotoğrafı ve yüz karşılaştırma verisi, yalnızca profilinizin gerçek bir bireye ait olduğunu doğrulamak amacıyla açık rızanıza istinaden Novita AI (Qwen Vision LLM) yapay zeka servisi aracılığıyla işlenir ve doğrulama tamamlandıktan hemen sonra saklanmaz veya işlenmez.
• Konum verisi: etkinlik eşleştirmesi için yaklaşık/anlık konum
• Kullanım verisi: kaydırma (swipe) geçmişi, eşleşmeler, etkinlik katılım bildirimleri
• İletişim içeriği: eşleşilen kullanıcılarla yapılan sohbet mesajları
• İşlem verisi: premium üyelik ödeme durumu (kart bilgileri Uygulama'da saklanmaz, İyzico tarafından işlenir)
• Teknik veri: cihaz push bildirim jetonu, uygulama kullanım günlükleri

3. İşleme Amaçları
Kişisel verileriniz; hesabınızı oluşturmak ve doğrulamak, size uygun etkinlik ve kişi önerileri sunmak, eşleşme ve mesajlaşma hizmetini sağlamak, premium ödeme işlemlerini gerçekleştirmek, bildirim göndermek, güvenliği sağlamak (engelleme/şikayet mekanizmaları), yasal yükümlülükleri yerine getirmek amacıyla işlenir.

4. Üçüncü Taraflarla Paylaşım ve Yurt Dışı Veri Aktarımı (KVKK m.9)
Verileriniz; ödeme işlemleri için İyzico, gerçek zamanlı mesajlaşma altyapısı için Firebase/Firestore, konum arama için OpenStreetMap/Nominatim, yapay zeka yüz doğrulaması ve içerik moderasyonu için Novita AI (Qwen Vision LLM) altyapısı (KVKK m.9 uyarınca güvenli yurt dışı sunucuları aracılığıyla), push bildirimleri için Expo/FCM/APNs ve e-posta gönderimi için SMTP sağlayıcımız ile, yalnızca hizmetin sunulması için gerekli ölçüde paylaşılır. Verileriniz pazarlama amacıyla üçüncü taraflara kesinlikle satılmaz.

5. Elektronik Ticari İleti İzni
Size kampanya, duyuru veya tanıtım amaçlı elektronik ileti (e-posta/push bildirim) gönderilmesi, ancak açık rızanızın alınması halinde mümkündür. Bu rızayı Ayarlar > Bildirimler bölümünden dilediğiniz zaman geri çekebilirsiniz. Hesap işlemlerine ilişkin bildirimler (şifre sıfırlama, eşleşme bildirimi vb.) bu kapsamda değildir ve hizmetin ifası için zorunludur.

6. Veri Saklama Süresi
Kişisel verileriniz, hesabınız aktif olduğu sürece ve ilgili mevzuatta öngörülen süreler boyunca saklanır. Hesabınızı sildiğinizde profil verileriniz (ad, e-posta, telefon, fotoğraf, biyografi, konum ve diğer profil alanları) makul bir süre içinde anonimleştirilir veya silinir. Eşleştiğiniz kullanıcılarla yaptığınız sohbet mesajları, karşı tarafın sohbet geçmişinin bütünlüğünü korumak amacıyla (KVKK m.5/2-f meşru menfaat) gönderen kimliğiniz anonimleştirilmiş şekilde saklanmaya devam eder. Yasal yükümlülükler gereği saklanması zorunlu veriler (ör. ödeme kayıtları) ilgili mevzuattaki süre kadar saklanır. Süresi dolmuş etkinlikler ve ilişkili veriler düzenli olarak otomatik temizlenir.

7. Haklarınız (KVKK m.11)
KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını öğrenme, yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, silinmesini/yok edilmesini isteme, işlemenin kısıtlanmasını isteme ve zarara uğramanız halinde tazminat talep etme haklarına sahipsiniz. Verilerinizi Ayarlar > Verilerimi İndir üzerinden dışa aktarabilir, Ayarlar > Hesabımı Sil üzerinden kalıcı olarak silebilirsiniz.

8. Veri Güvenliği
Kişisel verileriniz, yetkisiz erişime, kayba veya kötüye kullanıma karşı makul teknik ve idari tedbirlerle korunur. Şifreleriniz geri döndürülemez biçimde saklanır ve hiçbir Uygulama çalışanı şifrenize erişemez.

9. İletişim
Haklarınızı kullanmak veya sorularınız için Ayarlar > Destek bölümünden bize ulaşabilirsiniz.`;

const TERMS_TEXT_EN = `Last updated: This document is a comprehensive draft prepared based on the actual services offered by FindYourBuddy.

1. Description of Service
FindYourBuddy ("the App") is an event-based matching platform where users can connect, match, and chat through events they attend. The App includes profile creation, event attendance notifications, swipe-based matching, messaging, notifications, and premium membership services.

2. Account Creation & Age Restriction
To use the App, you must be at least 18 years old and accept the Terms of Service and Privacy Policy presented during registration. You are responsible for ensuring that the information you provide is accurate and up to date. You are solely responsible for maintaining the security of your account credentials.

3. User Responsibilities
Users may not impersonate another person, post misleading or fake profile information/photos, share harassing, hateful, threatening, or illegal content, or engage in unauthorized commercial promotion. Violations are evaluated via the "Report" / "Block" features.

4. Event Attendance and Matching
When you indicate attendance using the "I'm Going to This Event" option, this information is used solely to provide visibility in that event's matching pool. The App does not guarantee actual attendance; this is a declaration of intent based on user statements.

5. Premium Membership and Payments
Premium purchases are securely processed via İyzico payment infrastructure. Your card details are never stored on App servers. Premium membership offers extra features such as unlimited swipes, advanced filters, super likes, and seeing who liked you.

6. Account Suspension and Termination
In case of Terms violations, your account may be warned, restricted, or permanently closed. You may delete your account at any time via Settings > Account; this action is irreversible.

7. Limitation of Liability
The App is not responsible for the outcomes of user interactions (including offline meetups). Users are expected to take reasonable safety precautions when meeting others in person.

8. Dispute Resolution
Disputes arising from these terms shall be governed by the laws of the Republic of Türkiye, with jurisdiction in competent courts.

9. Contact
For questions regarding the Terms of Service, contact us via Settings > Support.`;

const PRIVACY_TEXT_EN = `Privacy Policy & Data Protection Notice

Last updated: This document outlines the categories of personal data processed by FindYourBuddy.

1. Data Controller
Your personal data is processed by FindYourBuddy as the data controller in accordance with applicable data protection laws.

2. Categories of Personal Data Processed
• Identity & Contact: Name, email, date of birth, occupation
• Profile Information: Photos, interests, biography, preferences
• Location Data: Approximate/current GPS location for event matching
• Usage Data: Swipe history, matches, event attendance declarations
• Communication Content: Chat messages exchanged with matched users
• Transaction Data: Premium membership status (card details handled securely by İyzico)
• Technical Data: Push notification tokens, application logs

3. Purposes of Processing
Your data is processed to create/verify your account, suggest relevant events and buddies, facilitate matching and messaging, process premium payments, send push notifications, ensure platform safety (blocking/reporting), and comply with legal requirements.

4. Sharing with Third Parties
Your data is shared with İyzico (payments), Firebase/Firestore (real-time chat), OpenStreetMap/Nominatim (location lookup), Expo/FCM/APNs (push notifications), and SMTP providers strictly as necessary to deliver services. Your data is never sold to third parties for marketing.

5. Electronic Marketing Communications
Commercial messages (promotions, announcements) are sent only with your explicit consent, which you can revoke at any time via Settings > Notifications. Essential transactional notices (password resets, match alerts) are exempt as they are required for service delivery.

6. Data Retention & Deletion
Personal data is retained while your account is active. When you delete your account, your profile data (name, email, phone, photos, bio, location and other profile fields) is anonymized or erased within a reasonable timeframe. Chat messages you exchanged with matched users are retained with your sender identity anonymized, so the other participant's conversation history stays intact (legitimate-interest basis). Data we are legally required to keep (e.g. payment records) is retained for the period set by law. Expired events and transient data are cleaned periodically.

7. User Rights
You have the right to request access to, correction of, or deletion of your personal data. You can export your data via Settings > Download My Data, or permanently erase your account via Settings > Delete Account.

8. Data Security
Reasonable technical and administrative measures are taken to protect your personal data against unauthorized access or loss. Passwords are stored using irreversible encryption.

9. Contact
For questions regarding your privacy rights, reach out via Settings > Support.`;

import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "../context/ThemeContext";

export function LegalScreen({ route }: Props) {
  const isTerms = route.params.kind === "terms";
  const { bgGradient, language, setLanguage } = useAppTheme();

  const contentText = isTerms
    ? (language === "en" ? TERMS_TEXT_EN : TERMS_TEXT)
    : (language === "en" ? PRIVACY_TEXT_EN : PRIVACY_TEXT);

  return (
    <ScrollView style={[styles.background, { backgroundColor: bgGradient[0] }]} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable
          style={styles.langPill}
          onPress={() => setLanguage(language === "tr" ? "en" : "tr")}
          accessibilityRole="button"
          accessibilityLabel="Change Language"
        >
          <Feather name="globe" size={13} color={colors.textPrimary} />
          <Text style={styles.langPillText}>
            {language === "tr" ? "🇹🇷 TR" : "🇬🇧 EN"}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.body}>{contentText}</Text>
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  langPillText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
