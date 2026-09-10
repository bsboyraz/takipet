# Takipet

Takipet; öğretmen, öğrenci ve veliler için ders, ödev, test, ödeme ve gelişim takibi sağlayan web tabanlı özel ders yönetim sistemidir.

## Teknoloji

- Next.js + TypeScript
- Supabase / PostgreSQL
- Supabase Auth
- Vercel
- PWA desteği (sonraki aşama)

## Kurulum

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ardından `.env.local` dosyasına Supabase Project URL ve **publishable** key değerlerini ekleyin.

> `service_role` veya `sb_secret_...` anahtarlarını hiçbir zaman frontend'e ya da GitHub'a koymayın.
Vercel deployment initialized.
