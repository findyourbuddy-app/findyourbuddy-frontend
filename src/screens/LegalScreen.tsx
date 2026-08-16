import { ScrollView, StyleSheet, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fontFamily, spacing, typeScale } from "../theme";
import type { AuthStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Legal">;

const TERMS_TEXT = `Son güncelleme: bu metin, FindYourBuddy uygulamasının yayına alınmasından önce bir hukuk danışmanı tarafından gözden geçirilmelidir. Aşağıdaki metin, hizmetin fiilen sunduğu özellikler esas alınarak hazırlanmış kapsamlı bir taslaktır.

1. Hizmetin Tanımı
FindYourBuddy ("Uygulama"), kullanıcıların katılacakları etkinlikler üzerinden birbirleriyle eşleşip sohbet edebildiği bir etkinlik-eşleştirme platformudur. Uygulama; profil oluşturma, etkinliklere katılım bildirimi, kaydırma (swipe) tabanlı eşleştirme, mesajlaşma, bildirim ve premium üyelik hizmetlerini kapsar.

2. Hesap Oluşturma ve Yaş Sınırı
Uygulamayı kullanabilmek için 18 yaşını doldurmuş olmak ve kayıt sırasında sunulan Kullanım Şartları ile Gizlilik Politikasını kabul etmiş olmak gerekir. Verdiğiniz bilgilerin doğru ve güncel olmasından siz sorumlusunuz. Hesabınızın güvenliğinden (şifre gizliliği dahil) yalnızca siz sorumlusunuz.

3. Kullanıcı Yükümlülükleri
Kullanıcılar; başka bir kişiyi taklit edemez, yanıltıcı/sahte profil bilgisi veya fotoğraf paylaşamaz, taciz, nefret söylemi, tehdit veya yasa dışı içerik paylaşamaz, ticari amaçla izinsiz tanıtım yapamaz. İhlal bildirimleri "Şikayet Et" / "Engelle" özellikleri üzerinden değerlendirilir.

4. Etkinlik Katılımı ve Eşleştirme
"Bu Etkinliğe Gidiyorum" seçeneğiyle bir etkinliğe katılım bildiriminde bulunduğunuzda, bu bilgi yalnızca ilgili etkinliğin eşleştirme havuzunda görünürlüğünüzü sağlamak amacıyla kullanılır. Uygulama, kullanıcıların etkinliğe fiilen katılacağını garanti etmez; bu yalnızca kullanıcı beyanına dayanan bir niyet bildirimidir.

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

2. İşlenen Kişisel Veri Kategorileri
• Kimlik ve iletişim bilgileri: ad, e-posta, doğum tarihi, meslek
• Profil bilgileri: fotoğraflar, ilgi alanları, biyografi
• Konum verisi: etkinlik eşleştirmesi için yaklaşık/anlık konum
• Kullanım verisi: kaydırma (swipe) geçmişi, eşleşmeler, etkinlik katılım bildirimleri
• İletişim içeriği: eşleşilen kullanıcılarla yapılan sohbet mesajları
• İşlem verisi: premium üyelik ödeme durumu (kart bilgileri Uygulama'da saklanmaz, İyzico tarafından işlenir)
• Teknik veri: cihaz push bildirim jetonu, uygulama kullanım günlükleri

3. İşleme Amaçları
Kişisel verileriniz; hesabınızı oluşturmak ve doğrulamak, size uygun etkinlik ve kişi önerileri sunmak, eşleşme ve mesajlaşma hizmetini sağlamak, premium ödeme işlemlerini gerçekleştirmek, bildirim göndermek, güvenliği sağlamak (engelleme/şikayet mekanizmaları), yasal yükümlülükleri yerine getirmek amacıyla işlenir.

4. Üçüncü Taraflarla Paylaşım
Verileriniz; ödeme işlemleri için İyzico, gerçek zamanlı mesajlaşma altyapısı için Firebase/Firestore, konum arama için OpenStreetMap/Nominatim, push bildirimleri için Expo/FCM/APNs ve e-posta gönderimi için SMTP sağlayıcımız ile, yalnızca hizmetin sunulması için gerekli ölçüde paylaşılır. Verileriniz pazarlama amacıyla üçüncü taraflara satılmaz.

5. Elektronik Ticari İleti İzni
Size kampanya, duyuru veya tanıtım amaçlı elektronik ileti (e-posta/push bildirim) gönderilmesi, ancak açık rızanızın alınması halinde mümkündür. Bu rızayı Ayarlar > Bildirimler bölümünden dilediğiniz zaman geri çekebilirsiniz. Hesap işlemlerine ilişkin bildirimler (şifre sıfırlama, eşleşme bildirimi vb.) bu kapsamda değildir ve hizmetin ifası için zorunludur.

6. Veri Saklama Süresi
Kişisel verileriniz, hesabınız aktif olduğu sürece ve ilgili mevzuatta öngörülen süreler boyunca saklanır. Hesabınızı sildiğinizde profil verileriniz ve mesajlarınız makul bir süre içinde kalıcı olarak silinir; yasal yükümlülükler gereği saklanması zorunlu veriler (ör. ödeme kayıtları) ilgili mevzuattaki süre kadar saklanır. Süresi dolmuş etkinlikler ve ilişkili veriler düzenli olarak otomatik temizlenir.

7. Haklarınız (KVKK m.11)
KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını öğrenme, yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, silinmesini/yok edilmesini isteme, işlemenin kısıtlanmasını isteme ve zarara uğramanız halinde tazminat talep etme haklarına sahipsiniz. Verilerinizi Ayarlar > Verilerimi İndir üzerinden dışa aktarabilir, Ayarlar > Hesabımı Sil üzerinden kalıcı olarak silebilirsiniz.

8. Veri Güvenliği
Kişisel verileriniz, yetkisiz erişime, kayba veya kötüye kullanıma karşı makul teknik ve idari tedbirlerle korunur. Şifreleriniz geri döndürülemez biçimde saklanır ve hiçbir Uygulama çalışanı şifrenize erişemez.

9. İletişim
Haklarınızı kullanmak veya sorularınız için Ayarlar > Destek bölümünden bize ulaşabilirsiniz.`;

import { useAppTheme } from "../context/ThemeContext";

export function LegalScreen({ route }: Props) {
  const isTerms = route.params.kind === "terms";
  const { bgGradient } = useAppTheme();

  return (
    <ScrollView style={[styles.background, { backgroundColor: bgGradient[0] }]} contentContainerStyle={styles.content}>
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
