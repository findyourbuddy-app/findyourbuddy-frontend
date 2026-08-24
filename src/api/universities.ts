import { apiClient } from "./client";

export interface UniversityItem {
  name: string;
  country?: string;
}

// Popular Turkish universities pre-cached for instant, offline-capable autocomplete
export const TURKISH_UNIVERSITIES: string[] = [
  "İstanbul Üniversitesi",
  "İstanbul Teknik Üniversitesi (İTÜ)",
  "Boğaziçi Üniversitesi",
  "Orta Doğu Teknik Üniversitesi (ODTÜ)",
  "Hacettepe Üniversitesi",
  "Yıldız Teknik Üniversitesi (YTÜ)",
  "Ankara Üniversitesi",
  "Marmara Üniversitesi",
  "Bilkent Üniversitesi",
  "Koç Üniversitesi",
  "Sabancı Üniversitesi",
  "Ege Üniversitesi",
  "Dokuz Eylül Üniversitesi",
  "Bahçeşehir Üniversitesi (BAU)",
  "Galatasaray Üniversitesi",
  "Gazi Üniversitesi",
  "Anadolu Üniversitesi",
  "Mimar Sinan Güzel Sanatlar Üniversitesi",
  "Yeditepe Üniversitesi",
  "Özyeğin Üniversitesi",
  "TOBB Ekonomi ve Teknoloji Üniversitesi",
  "Akdeniz Üniversitesi",
  "Çukurova Üniversitesi",
  "Karadeniz Teknik Üniversitesi (KTÜ)",
  "Selçuk Üniversitesi",
  "Erciyes Üniversitesi",
  "Bursa Uludağ Üniversitesi",
  "Kocaeli Üniversitesi",
  "Sakarya Üniversitesi",
  "Pamukkale Üniversitesi",
  "Eskişehir Osmangazi Üniversitesi",
  "İzmir Yüksek Teknoloji Enstitüsü (İYTE)",
  "Gebze Teknik Üniversitesi (GTÜ)",
  "Yaşar Üniversitesi",
  "Kadir Has Üniversitesi",
  "İstanbul Bilgi Üniversitesi",
  "İstanbul Aydın Üniversitesi",
  "İstanbul Medipol Üniversitesi",
  "İstanbul Gelişim Üniversitesi",
  "Nişantaşı Üniversitesi",
  "Beykoz Üniversitesi",
  "Doğuş Üniversitesi",
  "Maltepe Üniversitesi",
  "Üsküdar Üniversitesi",
  "İstanbul Kültür Üniversitesi",
  "İstanbul Ticaret Üniversitesi",
  "MEF Üniversitesi",
  "Türk-Alman Üniversitesi",
  "Bezmialem Vakıf Üniversitesi",
  "İbn Haldun Üniversitesi",
  "İstinye Üniversitesi",
  "İstanbul Kent Üniversitesi",
  "İstanbul Sabahattin Zaim Üniversitesi",
  "TED Üniversitesi",
  "Atılım Üniversitesi",
  "Başkent Üniversitesi",
  "Çankaya Üniversitesi",
  "İzmir Ekonomi Üniversitesi",
  "Fenerbahçe Üniversitesi",
  "Antalya Bilim Üniversitesi",
  "Hasan Kalyoncu Üniversitesi",
  "KTO Karatay Üniversitesi",
  "Manisa Celal Bayar Üniversitesi",
  "Aydın Adnan Menderes Üniversitesi",
  "Muğla Sıtkı Koçman Üniversitesi",
  "Balıkesir Üniversitesi",
  "Çanakkale Onsekiz Mart Üniversitesi",
  "Trakya Üniversitesi",
  "Zonguldak Bülent Ecevit Üniversitesi",
  "Ondokuz Mayıs Üniversitesi",
  "Sivas Cumhuriyet Üniversitesi",
  "Fırat Üniversitesi",
  "İnönü Üniversitesi",
  "Dicle Üniversitesi",
  "Harran Üniversitesi",
  "Van Yüzüncü Yıl Üniversitesi",
  "Kafkas Üniversitesi",
  "Recep Tayyip Erdoğan Üniversitesi",
  "Giresun Üniversitesi",
  "Ordu Üniversitesi",
  "Düzce Üniversitesi",
  "Bolu Abant İzzet Baysal Üniversitesi",
  "Afyon Kocatepe Üniversitesi",
  "Kütahya Dumlupınar Üniversitesi",
  "Isparta Uygulamalı Bilimler Üniversitesi",
  "Süleyman Demirel Üniversitesi",
  "Uşak Üniversitesi",
  "Kırıkkale Üniversitesi",
  "Ahi Evran Üniversitesi",
  "Kırklareli Üniversitesi",
  "Tekirdağ Namık Kemal Üniversitesi",
  "Bandırma Onyedi Eylül Üniversitesi",
  "Alanya Alaaddin Keykubat Üniversitesi",
  "İskenderun Teknik Üniversitesi",
  "Kahramanmaraş Sütçü İmam Üniversitesi",
  "Mardin Artuklu Üniversitesi",
  "Batman Üniversitesi",
  "Siirt Üniversitesi",
  "Şırnak Üniversitesi",
  "Hakkari Üniversitesi",
  "Bingöl Üniversitesi",
  "Muş Alparslan Üniversitesi",
  "Bitlis Eren Üniversitesi",
  "Iğdır Üniversitesi",
  "Ardahan Üniversitesi",
  "Bayburt Üniversitesi",
  "Gümüşhane Üniversitesi",
  "Kilis 7 Aralık Üniversitesi",
  "Osmaniye Korkut Ata Üniversitesi",
  "Adıyaman Üniversitesi",
  "Aksaray Üniversitesi",
  "Karamanlı Mehmetbey Üniversitesi",
  "Kırşehir Ahi Evran Üniversitesi",
  "Nevşehir Hacı Bektaş Veli Üniversitesi",
  "Niğde Ömer Halisdemir Üniversitesi",
  "Yozgat Bozok Üniversitesi",
  "Ağrı İbrahim Çeçen Üniversitesi",
  "Erzincan Binali Yıldırım Üniversitesi",
  "Erzurum Teknik Üniversitesi",
  "Atatürk Üniversitesi",
];

function normalizeText(text: string): string {
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();
}

/**
 * Searches universities using:
 * 1. Local Turkish Universities curated dataset (with fuzzy multi-term matching)
 * 2. Backend proxy endpoint (if available)
 * 3. Hipolabs Free World University Search API
 */
export async function searchUniversities(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const normalizedQuery = normalizeText(trimmed);
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const results: string[] = [];
  const addedSet = new Set<string>();

  // 1. Match local Turkish universities list (all query terms must be present)
  for (const uni of TURKISH_UNIVERSITIES) {
    const normUni = normalizeText(uni);
    if (queryTerms.every((term) => normUni.includes(term))) {
      results.push(uni);
      addedSet.add(normUni);
    }
  }

  // 2. Try fetching from backend endpoint with short 1s timeout if local matches are fewer than 10
  if (results.length < 10) {
    try {
      const backendRes = await apiClient.get<string[]>("/universities/search", {
        params: { q: trimmed },
        timeout: 1000,
      });
      if (Array.isArray(backendRes.data) && backendRes.data.length > 0) {
        for (const item of backendRes.data) {
          const normItem = normalizeText(item);
          if (!addedSet.has(normItem)) {
            results.push(item);
            addedSet.add(normItem);
          }
        }
      }
    } catch {
      // Best-effort backend search
    }
  }

  return results.slice(0, 15);
}
