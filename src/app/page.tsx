"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  role: "teacher" | "student" | "parent";
  first_name: string | null;
  last_name: string | null;
};

const stats = [
  { label: "Toplam öğrenci", value: "0" },
  { label: "Bu hafta ders", value: "0" },
  { label: "Bekleyen ödev", value: "0" },
  { label: "Yaklaşan test", value: "0" },
];

const roleLabels: Record<Profile["role"], string> = {
  teacher: "Öğretmen",
  student: "Öğrenci",
  parent: "Veli",
};

export default function Home() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, first_name, last_name")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (profileError) {
        setError("Profil bilgileri yüklenemedi.");
      } else {
        setProfile(data as Profile);
      }

      setLoading(false);
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError || !data.user) {
      setError("E-posta veya şifre hatalı.");
      setSubmitting(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, first_name, last_name")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profileData) {
      setError("Hesap bulundu ancak profil yüklenemedi.");
      await supabase.auth.signOut();
      setSubmitting(false);
      return;
    }

    setProfile(profileData as Profile);
    setPassword("");
    setSubmitting(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
    setEmail("");
    setPassword("");
  }

  if (loading) {
    return (
      <main className="authShell">
        <div className="loadingCard">Takipet yükleniyor…</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="authShell">
        <section className="loginCard">
          <div className="loginBrand">
            <div className="brandMark" aria-hidden="true">
              <span className="paper">▱</span>
              <span className="pen">✎</span>
            </div>
            <div>
              <strong>Takipet</strong>
              <p>Özel ders yönetimi</p>
            </div>
          </div>

          <div className="loginIntro">
            <span className="eyebrow">HOŞ GELDİN</span>
            <h1>Hesabına giriş yap</h1>
            <p>Ders, öğrenci, ödev, test ve ödemelerini tek yerden yönet.</p>
          </div>

          <form className="loginForm" onSubmit={handleLogin}>
            <label>
              E-posta
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@email.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Şifre
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? <p className="formError">{error}</p> : null}

            <button
              className="primaryButton loginButton"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
            </button>
          </form>

          <p className="loginFootnote">
            Takipet hesabın öğretmenin tarafından oluşturulur.
          </p>
        </section>
      </main>
    );
  }

  const displayName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">
            <span className="paper">▱</span>
            <span className="pen">✎</span>
          </div>
          <div>
            <strong>Takipet</strong>
            <p>Özel ders yönetimi</p>
          </div>
        </div>

        <div className="profileArea">
          <span className="profileButton">
            {displayName || roleLabels[profile.role]} · {roleLabels[profile.role]}
          </span>
          <button className="logoutButton" onClick={handleLogout}>
            Çıkış
          </button>
        </div>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">ÖĞRETMEN PANELİ</span>
          <h1>Derslerini tek yerden takip et.</h1>
          <p>
            Öğrenci, veli, takvim, ödev, test ve ödeme yönetimi için Takipet
            artık Supabase hesabınla bağlı çalışıyor.
          </p>
        </div>
        <button className="primaryButton">+ Yeni işlem</button>
      </section>

      <section className="statsGrid">
        {stats.map((stat) => (
          <article className="statCard" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="contentGrid">
        <article className="calendarCard">
          <div className="sectionHeader">
            <div>
              <span className="eyebrow">TAKVİM</span>
              <h2>Bu hafta</h2>
            </div>
            <div className="segmented">
              <button>Gün</button>
              <button className="active">Hafta</button>
              <button>Ay</button>
            </div>
          </div>

          <div className="emptyState">
            <div className="emptyIcon">✦</div>
            <h3>Henüz planlanmış ders yok</h3>
            <p>
              Bir sonraki adımda gerçek öğrenci ve ders kayıtlarını ekleyeceğiz.
            </p>
          </div>
        </article>

        <aside className="sideCard">
          <span className="eyebrow">BAĞLANTI DURUMU</span>
          <h2>Supabase bağlı ✓</h2>
          <p>Giriş sistemi ve rol profili artık gerçek veritabanından okunuyor.</p>
          <div className="checkItem">✓ Kimlik doğrulama</div>
          <div className="checkItem">✓ Öğretmen profili</div>
          <div className="checkItem">✓ RLS güvenliği</div>
        </aside>
      </section>
    </main>
  );
}
