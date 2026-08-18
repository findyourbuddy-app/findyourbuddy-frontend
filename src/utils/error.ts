import axios from "axios";

export function formatApiError(err: unknown, language: "tr" | "en"): string {
  if (!axios.isAxiosError(err)) {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return language === "en"
      ? "An unexpected error occurred. Please try again."
      : "Beklenmeyen bir sorun oluştu. Lütfen tekrar dene.";
  }

  // Network or Server Unreachable
  if (err.message === "Network Error" || !err.response) {
    return language === "en"
      ? "Unable to connect to server. Please check your internet connection or server status."
      : "Sunucuya bağlanılamadı. Lütfen internet bağlantınızı ve sunucu durumunu kontrol edin.";
  }

  const status = err.response.status;
  const detail = err.response.data?.detail;

  // Array of Pydantic field validation errors
  if (Array.isArray(detail)) {
    const messages = detail
      .map((d: any) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
        const msg = d.msg || "Geçersiz değer";
        return field ? `${field}: ${msg}` : msg;
      })
      .join("\n");
    return messages || (language === "en" ? "Validation error." : "Form doğrulama hatası.");
  }

  // String detail from backend
  if (typeof detail === "string" && detail.trim()) {
    const lower = detail.toLowerCase();
    
    if (lower.includes("incorrect email or password")) {
      return language === "en"
        ? "Incorrect email address or password. Please check your credentials."
        : "Hatalı e-posta adresi veya şifre. Lütfen bilgilerinizi kontrol edin.";
    }
    if (lower.includes("email already registered") || lower.includes("email in use")) {
      return language === "en"
        ? "This email address is already registered to another account."
        : "Bu e-posta adresi zaten başka bir hesapta kayıtlı.";
    }
    if (lower.includes("phone number already registered") || lower.includes("phone in use")) {
      return language === "en"
        ? "This phone number is already registered to another account."
        : "Bu telefon numarası zaten başka bir hesapta kayıtlı.";
    }
    if (lower.includes("under 18") || lower.includes("age limit")) {
      return language === "en"
        ? "You must be at least 18 years old to use FindYourBuddy."
        : "FindYourBuddy uygulamasını kullanabilmek için en az 18 yaşında olmalısınız.";
    }
    if (lower.includes("rate limit") || lower.includes("too many requests") || status === 429) {
      return language === "en"
        ? "Too many requests. Please wait a moment and try again."
        : "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.";
    }
    if (lower.includes("unauthorized") || status === 401) {
      return language === "en"
        ? "Session expired. Please log in again."
        : "Oturum süreniz doldu. Lütfen tekrar giriş yapın.";
    }

    return detail;
  }

  // Status code based fallback
  if (status === 400) {
    return language === "en"
      ? "Invalid request details. Please check your input."
      : "Geçersiz istek detayları. Lütfen girdiğiniz bilgileri kontrol edin.";
  }
  if (status === 403) {
    return language === "en"
      ? "You do not have permission for this action."
      : "Bu işlem için yetkiniz bulunmuyor.";
  }
  if (status === 404) {
    return language === "en"
      ? "Requested item or service was not found."
      : "Aranan öge veya servis bulunamadı.";
  }
  if (status === 409) {
    return language === "en"
      ? "Conflict: This record already exists in the system."
      : "Çakışma: Bu kayıt sistemde zaten mevcut.";
  }
  if (status >= 500) {
    return language === "en"
      ? `Server Error (${status}). Please try again shortly.`
      : `Sunucu Hatası (${status}). Lütfen kısa bir süre sonra tekrar deneyin.`;
  }

  return language === "en"
    ? `Error (${status}). Please try again.`
    : `Sorun Oluştu (${status}). Lütfen tekrar deneyin.`;
}
