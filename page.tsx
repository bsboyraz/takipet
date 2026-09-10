const stats = [
  { label: "Toplam öğrenci", value: "0" },
  { label: "Bu hafta ders", value: "0" },
  { label: "Bekleyen ödev", value: "0" },
  { label: "Yaklaşan test", value: "0" },
];

export default function Home() {
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
        <button className="profileButton">Öğretmen</button>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">ÖĞRETMEN PANELİ</span>
          <h1>Derslerini tek yerden takip et.</h1>
          <p>
            Öğrenci, veli, takvim, ödev, test ve ödeme yönetimi için
            hazırladığımız Takipet’in ilk çalışan iskeleti.
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
            <p>Supabase bağlantısından sonra gerçek dersler burada görünecek.</p>
          </div>
        </article>

        <aside className="sideCard">
          <span className="eyebrow">SIRADAKİ ADIM</span>
          <h2>Supabase’i bağlayacağız</h2>
          <p>
            Bir sonraki aşamada kullanıcı rolleri ve veritabanı şemasını
            oluşturacağız.
          </p>
          <div className="checkItem">✓ Öğretmen rolü</div>
          <div className="checkItem">✓ Öğrenci rolü</div>
          <div className="checkItem">✓ Veli rolü</div>
        </aside>
      </section>
    </main>
  );
}
