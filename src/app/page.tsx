"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  role: "teacher" | "student" | "parent";
  first_name: string | null;
  last_name: string | null;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  subject: string | null;
  default_lesson_fee: number;
  active: boolean;
};

type StudentForm = {
  firstName: string;
  lastName: string;
  birthDate: string;
  gradeLevel: string;
  subject: string;
  privateNote: string;
  startingBalance: string;
  defaultLessonFee: string;

  guardianFirstName: string;
  guardianLastName: string;
  guardianPhone: string;
  guardianWhatsapp: string;
  guardianEmail: string;

  secondGuardianEnabled: boolean;
  secondGuardianFirstName: string;
  secondGuardianLastName: string;
  secondGuardianPhone: string;
  secondGuardianWhatsapp: string;
  secondGuardianEmail: string;

  scheduleEnabled: boolean;
  lessonDate: string;
  lessonTime: string;
  lessonDuration: string;
  lessonType: "online" | "in_person";
  weeklyRepeat: boolean;
  repeatUntil: string;
  meetingUrl: string;
};

const emptyStudentForm: StudentForm = {
  firstName: "",
  lastName: "",
  birthDate: "",
  gradeLevel: "",
  subject: "",
  privateNote: "",
  startingBalance: "0",
  defaultLessonFee: "0",

  guardianFirstName: "",
  guardianLastName: "",
  guardianPhone: "",
  guardianWhatsapp: "",
  guardianEmail: "",

  secondGuardianEnabled: false,
  secondGuardianFirstName: "",
  secondGuardianLastName: "",
  secondGuardianPhone: "",
  secondGuardianWhatsapp: "",
  secondGuardianEmail: "",

  scheduleEnabled: true,
  lessonDate: "",
  lessonTime: "",
  lessonDuration: "60",
  lessonType: "online",
  weeklyRepeat: false,
  repeatUntil: "",
  meetingUrl: "",
};

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
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentSaving, setStudentSaving] = useState(false);

  const [error, setError] = useState("");
  const [studentError, setStudentError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentStep, setStudentStep] = useState<1 | 2 | 3>(1);
  const [studentForm, setStudentForm] =
    useState<StudentForm>(emptyStudentForm);

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

      if (profileError || !data) {
        setError("Profil bilgileri yüklenemedi.");
        setLoading(false);
        return;
      }

      const loadedProfile = data as Profile;
      setProfile(loadedProfile);

      if (loadedProfile.role === "teacher") {
        await loadStudents(loadedProfile.id);
      }

      setLoading(false);
    }

    loadUser();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function loadStudents(teacherId: string) {
    const { data, error: studentsError } = await supabase
      .from("students")
      .select(
        "id, first_name, last_name, grade_level, subject, default_lesson_fee, active"
      )
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (studentsError) {
      setError("Öğrenci listesi yüklenemedi.");
      return;
    }

    setStudents((data ?? []) as Student[]);
  }

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

    const loadedProfile = profileData as Profile;
    setProfile(loadedProfile);

    if (loadedProfile.role === "teacher") {
      await loadStudents(loadedProfile.id);
    }

    setPassword("");
    setSubmitting(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
    setStudents([]);
    setEmail("");
    setPassword("");
  }

  function openStudentModal() {
    setStudentForm(emptyStudentForm);
    setStudentStep(1);
    setStudentError("");
    setSuccessMessage("");
    setQuickMenuOpen(false);
    setStudentModalOpen(true);
  }

  function closeStudentModal() {
    if (studentSaving) return;
    setStudentModalOpen(false);
    setStudentError("");
  }

  function updateStudentField<K extends keyof StudentForm>(
    field: K,
    value: StudentForm[K]
  ) {
    setStudentForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function goToGuardianStep() {
    setStudentError("");

    if (!studentForm.firstName.trim() || !studentForm.lastName.trim()) {
      setStudentError("Devam etmek için öğrencinin adı ve soyadı zorunludur.");
      return;
    }

    const startingBalance = Number(studentForm.startingBalance || 0);
    const lessonFee = Number(studentForm.defaultLessonFee || 0);

    if (Number.isNaN(startingBalance) || Number.isNaN(lessonFee)) {
      setStudentError("Bakiye ve ders ücreti sayı olmalıdır.");
      return;
    }

    if (lessonFee < 0) {
      setStudentError("Ders ücreti negatif olamaz.");
      return;
    }

    setStudentStep(2);
  }

  function goToScheduleStep() {
    setStudentError("");

    if (
      !studentForm.guardianFirstName.trim() ||
      !studentForm.guardianLastName.trim()
    ) {
      setStudentError("Devam etmek için birinci velinin adı ve soyadı zorunludur.");
      return;
    }

    if (
      studentForm.secondGuardianEnabled &&
      (!studentForm.secondGuardianFirstName.trim() ||
        !studentForm.secondGuardianLastName.trim())
    ) {
      setStudentError(
        "İkinci veli açıksa ikinci velinin adı ve soyadı zorunludur."
      );
      return;
    }

    setStudentStep(3);
  }

  function buildLessonRows(studentId: string, teacherId: string) {
    if (!studentForm.scheduleEnabled) return [];

    if (!studentForm.lessonDate || !studentForm.lessonTime) {
      throw new Error("İlk ders tarihi ve saati zorunludur.");
    }

    const duration = Number(studentForm.lessonDuration || 60);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Ders süresi geçerli bir sayı olmalıdır.");
    }

    if (studentForm.weeklyRepeat && !studentForm.repeatUntil) {
      throw new Error("Haftalık tekrar için bitiş tarihi seçmelisin.");
    }

    const firstStart = new Date(
      `${studentForm.lessonDate}T${studentForm.lessonTime}:00`
    );

    if (Number.isNaN(firstStart.getTime())) {
      throw new Error("Ders tarihi veya saati geçersiz.");
    }

    const lastDate = studentForm.weeklyRepeat
      ? new Date(`${studentForm.repeatUntil}T23:59:59`)
      : firstStart;

    if (studentForm.weeklyRepeat && lastDate < firstStart) {
      throw new Error("Tekrar bitiş tarihi ilk dersten önce olamaz.");
    }

    const recurrenceGroupId = studentForm.weeklyRepeat
      ? crypto.randomUUID()
      : null;

    const rows = [];
    const current = new Date(firstStart);
    let safetyCounter = 0;

    while (current <= lastDate && safetyCounter < 160) {
      const end = new Date(current.getTime() + duration * 60_000);

      rows.push({
        teacher_id: teacherId,
        student_id: studentId,
        title: studentForm.subject.trim() || "Ders",
        starts_at: current.toISOString(),
        ends_at: end.toISOString(),
        lesson_type: studentForm.lessonType,
        status: "planned",
        meeting_url:
          studentForm.lessonType === "online"
            ? studentForm.meetingUrl.trim() || null
            : null,
        fee: Number(studentForm.defaultLessonFee || 0),
        recurrence_group_id: recurrenceGroupId,
        recurrence_rule: studentForm.weeklyRepeat
          ? `FREQ=WEEKLY;UNTIL=${studentForm.repeatUntil}`
          : null,
      });

      if (!studentForm.weeklyRepeat) break;

      current.setDate(current.getDate() + 7);
      safetyCounter += 1;
    }

    return rows;
  }

  async function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || profile.role !== "teacher") {
      setStudentError("Bu işlem için öğretmen hesabı gerekir.");
      return;
    }

    if (!studentForm.firstName.trim() || !studentForm.lastName.trim()) {
      setStudentError("Öğrencinin adı ve soyadı zorunludur.");
      setStudentStep(1);
      return;
    }

    if (
      !studentForm.guardianFirstName.trim() ||
      !studentForm.guardianLastName.trim()
    ) {
      setStudentError("Birinci velinin adı ve soyadı zorunludur.");
      setStudentStep(2);
      return;
    }

    if (
      studentForm.secondGuardianEnabled &&
      (!studentForm.secondGuardianFirstName.trim() ||
        !studentForm.secondGuardianLastName.trim())
    ) {
      setStudentError(
        "İkinci veli açıksa ikinci velinin adı ve soyadı zorunludur."
      );
      setStudentStep(2);
      return;
    }

    const startingBalance = Number(studentForm.startingBalance || 0);
    const lessonFee = Number(studentForm.defaultLessonFee || 0);

    if (Number.isNaN(startingBalance) || Number.isNaN(lessonFee)) {
      setStudentError("Bakiye ve ders ücreti sayı olmalıdır.");
      setStudentStep(1);
      return;
    }

    if (lessonFee < 0) {
      setStudentError("Ders ücreti negatif olamaz.");
      setStudentStep(1);
      return;
    }

    let lessonRows: Array<Record<string, unknown>> = [];

    try {
      lessonRows = buildLessonRows("TEMP", profile.id);
    } catch (scheduleError) {
      setStudentError(
        scheduleError instanceof Error
          ? scheduleError.message
          : "Ders programı kontrol edilemedi."
      );
      setStudentStep(3);
      return;
    }

    setStudentSaving(true);
    setStudentError("");

    // ID'yi istemci tarafında oluşturuyoruz. Böylece INSERT sonrasında
    // .select("id") / RETURNING çalıştırmak zorunda kalmıyoruz.
    // Bu, RLS'nin yeni satırı RETURNING aşamasında tekrar SELECT etmesinden
    // kaynaklanan hatayı önler.
    const newStudentId = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from("students")
      .insert({
        id: newStudentId,
        teacher_id: profile.id,
        first_name: studentForm.firstName.trim(),
        last_name: studentForm.lastName.trim(),
        birth_date: studentForm.birthDate || null,
        grade_level: studentForm.gradeLevel.trim() || null,
        subject: studentForm.subject.trim() || null,
        private_note: studentForm.privateNote.trim() || null,
        starting_balance: startingBalance,
        default_lesson_fee: lessonFee,
        active: true,
      });

    if (insertError) {
      setStudentError(`Öğrenci kaydedilemedi: ${insertError.message}`);
      setStudentSaving(false);
      return;
    }

    const guardiansToInsert = [
      {
        teacher_id: profile.id,
        student_id: newStudentId,
        first_name: studentForm.guardianFirstName.trim(),
        last_name: studentForm.guardianLastName.trim(),
        phone: studentForm.guardianPhone.trim() || null,
        whatsapp_phone: studentForm.guardianWhatsapp.trim() || null,
        email: studentForm.guardianEmail.trim() || null,
        relation_label: "Veli",
        is_primary: true,
      },
    ];

    if (studentForm.secondGuardianEnabled) {
      guardiansToInsert.push({
        teacher_id: profile.id,
        student_id: newStudentId,
        first_name: studentForm.secondGuardianFirstName.trim(),
        last_name: studentForm.secondGuardianLastName.trim(),
        phone: studentForm.secondGuardianPhone.trim() || null,
        whatsapp_phone: studentForm.secondGuardianWhatsapp.trim() || null,
        email: studentForm.secondGuardianEmail.trim() || null,
        relation_label: "Veli",
        is_primary: false,
      });
    }

    const { error: guardianError } = await supabase
      .from("guardians")
      .insert(guardiansToInsert);

    if (guardianError) {
      await supabase.from("students").delete().eq("id", newStudentId);
      setStudentError(
        `Veli bilgileri kaydedilemedi: ${guardianError.message}`
      );
      setStudentSaving(false);
      return;
    }

    if (studentForm.scheduleEnabled) {
      lessonRows = buildLessonRows(newStudentId, profile.id);

      const { error: lessonError } = await supabase
        .from("lessons")
        .insert(lessonRows);

      if (lessonError) {
        await supabase.from("students").delete().eq("id", newStudentId);
        setStudentError(
          `Ders programı kaydedilemedi: ${lessonError.message}`
        );
        setStudentSaving(false);
        return;
      }
    }

    await loadStudents(profile.id);

    const savedStudentName =
      `${studentForm.firstName.trim()} ${studentForm.lastName.trim()}`;

    setStudentSaving(false);
    setStudentModalOpen(false);
    setStudentStep(1);
    setStudentForm(emptyStudentForm);
    setSuccessMessage(
      studentForm.scheduleEnabled
        ? `${savedStudentName}, veli bilgileri ve ders programı başarıyla eklendi.`
        : `${savedStudentName} ve veli bilgileri başarıyla eklendi.`
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
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

  const teacherDashboard = profile.role === "teacher";

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

      {successMessage ? (
        <div className="successToast">{successMessage}</div>
      ) : null}

      <section className="hero">
        <div>
          <span className="eyebrow">
            {teacherDashboard ? "ÖĞRETMEN PANELİ" : "TAKİPET"}
          </span>
          <h1>Derslerini tek yerden takip et.</h1>
          <p>
            Öğrenci, veli, takvim, ödev, test ve ödeme yönetimi için Takipet
            artık Supabase hesabınla bağlı çalışıyor.
          </p>
        </div>

        {teacherDashboard ? (
          <div className="quickActionWrap">
            <button
              className="primaryButton"
              onClick={() => setQuickMenuOpen((current) => !current)}
              aria-expanded={quickMenuOpen}
            >
              + Yeni işlem
            </button>

            {quickMenuOpen ? (
              <div className="quickMenu">
                <button onClick={openStudentModal}>👤 Öğrenci Ekle</button>
                <button disabled>📅 Ders Ekle</button>
                <button disabled>🏖️ Tatil Ekle</button>
                <button disabled>💳 Ödeme Al</button>
                <button disabled>📝 Ödev Ver</button>
                <button disabled>✅ Test Oluştur</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="statsGrid">
        <article className="statCard">
          <span>Toplam öğrenci</span>
          <strong>{students.length}</strong>
        </article>
        <article className="statCard">
          <span>Bu hafta ders</span>
          <strong>0</strong>
        </article>
        <article className="statCard">
          <span>Bekleyen ödev</span>
          <strong>0</strong>
        </article>
        <article className="statCard">
          <span>Yaklaşan test</span>
          <strong>0</strong>
        </article>
      </section>

      <section className="contentGrid">
        <article className="calendarCard">
          <div className="sectionHeader">
            <div>
              <span className="eyebrow">ÖĞRENCİLER</span>
              <h2>{students.length ? "Öğrenci listesi" : "Henüz öğrenci yok"}</h2>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="emptyState">
              <div className="emptyIcon">✦</div>
              <h3>İlk öğrencini ekleyebilirsin</h3>
              <p>
                Sağ üstteki “+ Yeni işlem” butonundan “Öğrenci Ekle” seçeneğini
                kullan.
              </p>
            </div>
          ) : (
            <div className="studentList">
              {students.map((student) => (
                <article className="studentRow" key={student.id}>
                  <div className="studentAvatar">
                    {student.first_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="studentInfo">
                    <strong>
                      {student.first_name} {student.last_name}
                    </strong>
                    <span>
                      {[student.subject, student.grade_level]
                        .filter(Boolean)
                        .join(" · ") || "Ders bilgisi eklenmedi"}
                    </span>
                  </div>
                  <div className="studentFee">
                    {Number(student.default_lesson_fee || 0).toFixed(2)} €
                    <span>/ ders</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <aside className="sideCard">
          <span className="eyebrow">BAĞLANTI DURUMU</span>
          <h2>Supabase bağlı ✓</h2>
          <p>Öğrenci kayıtları artık gerçek veritabanında tutuluyor.</p>
          <div className="checkItem">✓ Kimlik doğrulama</div>
          <div className="checkItem">✓ Öğretmen profili</div>
          <div className="checkItem">✓ Öğrenci ekleme</div>
        </aside>
      </section>

      {studentModalOpen ? (
        <div className="modalBackdrop" onMouseDown={closeStudentModal}>
          <section
            className="modalCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <span className="eyebrow">YENİ KAYIT</span>
                <h2 id="student-modal-title">Öğrenci Ekle</h2>
              </div>
              <button
                className="modalClose"
                onClick={closeStudentModal}
                aria-label="Kapat"
                type="button"
              >
                ×
              </button>
            </div>

            <form className="studentForm" onSubmit={handleAddStudent}>
              <div className="stepper stepperThree">
                <button
                  type="button"
                  className={`stepItem ${studentStep === 1 ? "active" : studentStep > 1 ? "done" : ""}`}
                  onClick={() => setStudentStep(1)}
                >
                  <span>1</span>
                  <div>
                    <strong>Öğrenci bilgileri</strong>
                    <small>Temel bilgiler ve ücret</small>
                  </div>
                </button>

                <div className="stepLine" />

                <button
                  type="button"
                  className={`stepItem ${studentStep === 2 ? "active" : studentStep > 2 ? "done" : ""}`}
                  onClick={() => {
                    if (studentStep === 1) goToGuardianStep();
                    else setStudentStep(2);
                  }}
                >
                  <span>2</span>
                  <div>
                    <strong>Veli ve iletişim</strong>
                    <small>İletişim ve WhatsApp</small>
                  </div>
                </button>

                <div className="stepLine" />

                <button
                  type="button"
                  className={`stepItem ${studentStep === 3 ? "active" : ""}`}
                  onClick={() => {
                    if (studentStep === 1) {
                      goToGuardianStep();
                      return;
                    }
                    goToScheduleStep();
                  }}
                >
                  <span>3</span>
                  <div>
                    <strong>Ders programı</strong>
                    <small>Tarih, saat ve tekrar</small>
                  </div>
                </button>
              </div>

              {studentStep === 1 ? (
                <div className="stepPanel">
                  <div className="stepPanelHeader">
                    <span className="eyebrow">ADIM 1 / 3</span>
                    <h3>Öğrenci bilgileri</h3>
                    <p>Öğrencinin temel bilgilerini ve ücretini gir.</p>
                  </div>

                  <div className="formGrid">
                    <label>
                      Ad *
                      <input
                        value={studentForm.firstName}
                        onChange={(event) =>
                          updateStudentField("firstName", event.target.value)
                        }
                        placeholder="Örn. Asel"
                        required
                      />
                    </label>

                    <label>
                      Soyad *
                      <input
                        value={studentForm.lastName}
                        onChange={(event) =>
                          updateStudentField("lastName", event.target.value)
                        }
                        placeholder="Soyadı"
                        required
                      />
                    </label>

                    <label>
                      Doğum tarihi
                      <input
                        type="date"
                        value={studentForm.birthDate}
                        onChange={(event) =>
                          updateStudentField("birthDate", event.target.value)
                        }
                      />
                    </label>

                    <label>
                      Sınıf / seviye
                      <input
                        value={studentForm.gradeLevel}
                        onChange={(event) =>
                          updateStudentField("gradeLevel", event.target.value)
                        }
                        placeholder="Örn. 3. sınıf / A1"
                      />
                    </label>

                    <label>
                      Ders
                      <input
                        value={studentForm.subject}
                        onChange={(event) =>
                          updateStudentField("subject", event.target.value)
                        }
                        placeholder="Örn. İngilizce"
                      />
                    </label>

                    <label>
                      Ders başına ücret (€)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={studentForm.defaultLessonFee}
                        onChange={(event) =>
                          updateStudentField(
                            "defaultLessonFee",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Başlangıç bakiyesi (€)
                      <input
                        type="number"
                        step="0.01"
                        value={studentForm.startingBalance}
                        onChange={(event) =>
                          updateStudentField(
                            "startingBalance",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="fullWidth">
                      Öğretmen özel notu
                      <textarea
                        value={studentForm.privateNote}
                        onChange={(event) =>
                          updateStudentField("privateNote", event.target.value)
                        }
                        placeholder="Bu not yalnızca öğretmen tarafında kullanılacak."
                        rows={3}
                      />
                    </label>
                  </div>
                </div>
              ) : studentStep === 2 ? (
                <div className="stepPanel">
                  <div className="stepPanelHeader">
                    <span className="eyebrow">ADIM 2 / 3</span>
                    <h3>Veli ve iletişim</h3>
                    <p>Veli iletişim bilgilerini ve WhatsApp numarasını ekle.</p>
                  </div>

                  <div className="formGrid">
                    <label>
                      Veli adı *
                      <input
                        value={studentForm.guardianFirstName}
                        onChange={(event) =>
                          updateStudentField(
                            "guardianFirstName",
                            event.target.value
                          )
                        }
                        placeholder="Veli adı"
                        required
                      />
                    </label>

                    <label>
                      Veli soyadı *
                      <input
                        value={studentForm.guardianLastName}
                        onChange={(event) =>
                          updateStudentField(
                            "guardianLastName",
                            event.target.value
                          )
                        }
                        placeholder="Veli soyadı"
                        required
                      />
                    </label>

                    <label>
                      Telefon
                      <input
                        type="tel"
                        value={studentForm.guardianPhone}
                        onChange={(event) =>
                          updateStudentField("guardianPhone", event.target.value)
                        }
                        placeholder="+49..."
                      />
                    </label>

                    <label>
                      WhatsApp numarası
                      <input
                        type="tel"
                        value={studentForm.guardianWhatsapp}
                        onChange={(event) =>
                          updateStudentField(
                            "guardianWhatsapp",
                            event.target.value
                          )
                        }
                        placeholder="+49..."
                      />
                    </label>

                    <label className="fullWidth">
                      E-posta
                      <input
                        type="email"
                        value={studentForm.guardianEmail}
                        onChange={(event) =>
                          updateStudentField("guardianEmail", event.target.value)
                        }
                        placeholder="veli@email.com"
                      />
                    </label>
                  </div>

                  <label className="toggleRow">
                    <input
                      type="checkbox"
                      checked={studentForm.secondGuardianEnabled}
                      onChange={(event) =>
                        updateStudentField(
                          "secondGuardianEnabled",
                          event.target.checked
                        )
                      }
                    />
                    <span>İkinci veli ekle</span>
                  </label>

                  {studentForm.secondGuardianEnabled ? (
                    <div className="secondGuardianBox">
                      <div className="secondGuardianHeader">
                        <strong>İkinci veli</strong>
                        <small>Opsiyonel iletişim bilgileri</small>
                      </div>

                      <div className="formGrid">
                        <label>
                          Ad *
                          <input
                            value={studentForm.secondGuardianFirstName}
                            onChange={(event) =>
                              updateStudentField(
                                "secondGuardianFirstName",
                                event.target.value
                              )
                            }
                            placeholder="Ad"
                            required
                          />
                        </label>

                        <label>
                          Soyad *
                          <input
                            value={studentForm.secondGuardianLastName}
                            onChange={(event) =>
                              updateStudentField(
                                "secondGuardianLastName",
                                event.target.value
                              )
                            }
                            placeholder="Soyad"
                            required
                          />
                        </label>

                        <label>
                          Telefon
                          <input
                            type="tel"
                            value={studentForm.secondGuardianPhone}
                            onChange={(event) =>
                              updateStudentField(
                                "secondGuardianPhone",
                                event.target.value
                              )
                            }
                            placeholder="+49..."
                          />
                        </label>

                        <label>
                          WhatsApp numarası
                          <input
                            type="tel"
                            value={studentForm.secondGuardianWhatsapp}
                            onChange={(event) =>
                              updateStudentField(
                                "secondGuardianWhatsapp",
                                event.target.value
                              )
                            }
                            placeholder="+49..."
                          />
                        </label>

                        <label className="fullWidth">
                          E-posta
                          <input
                            type="email"
                            value={studentForm.secondGuardianEmail}
                            onChange={(event) =>
                              updateStudentField(
                                "secondGuardianEmail",
                                event.target.value
                              )
                            }
                            placeholder="veli2@email.com"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="stepPanel">
                  <div className="stepPanelHeader">
                    <span className="eyebrow">ADIM 3 / 3</span>
                    <h3>Ders programı</h3>
                    <p>İlk dersi planla; istersen haftalık olarak otomatik tekrarla.</p>
                  </div>

                  <label className="toggleRow scheduleToggle">
                    <input
                      type="checkbox"
                      checked={studentForm.scheduleEnabled}
                      onChange={(event) =>
                        updateStudentField(
                          "scheduleEnabled",
                          event.target.checked
                        )
                      }
                    />
                    <span>Ders programını şimdi ekle</span>
                  </label>

                  {studentForm.scheduleEnabled ? (
                    <div className="formGrid">
                      <label>
                        İlk ders tarihi *
                        <input
                          type="date"
                          value={studentForm.lessonDate}
                          onChange={(event) =>
                            updateStudentField("lessonDate", event.target.value)
                          }
                          required
                        />
                      </label>

                      <label>
                        Başlangıç saati *
                        <input
                          type="time"
                          value={studentForm.lessonTime}
                          onChange={(event) =>
                            updateStudentField("lessonTime", event.target.value)
                          }
                          required
                        />
                      </label>

                      <label>
                        Ders süresi
                        <select
                          value={studentForm.lessonDuration}
                          onChange={(event) =>
                            updateStudentField(
                              "lessonDuration",
                              event.target.value
                            )
                          }
                        >
                          <option value="30">30 dakika</option>
                          <option value="45">45 dakika</option>
                          <option value="60">60 dakika</option>
                          <option value="90">90 dakika</option>
                          <option value="120">120 dakika</option>
                        </select>
                      </label>

                      <label>
                        Ders tipi
                        <select
                          value={studentForm.lessonType}
                          onChange={(event) =>
                            updateStudentField(
                              "lessonType",
                              event.target.value as "online" | "in_person"
                            )
                          }
                        >
                          <option value="online">Online</option>
                          <option value="in_person">Yüz yüze</option>
                        </select>
                      </label>

                      {studentForm.lessonType === "online" ? (
                        <label className="fullWidth">
                          Ders bağlantısı
                          <input
                            type="url"
                            value={studentForm.meetingUrl}
                            onChange={(event) =>
                              updateStudentField(
                                "meetingUrl",
                                event.target.value
                              )
                            }
                            placeholder="https://meet.google.com/... veya Zoom linki"
                          />
                        </label>
                      ) : null}

                      <label className="toggleRow fullWidth">
                        <input
                          type="checkbox"
                          checked={studentForm.weeklyRepeat}
                          onChange={(event) =>
                            updateStudentField(
                              "weeklyRepeat",
                              event.target.checked
                            )
                          }
                        />
                        <span>Her hafta aynı gün ve saatte tekrar et</span>
                      </label>

                      {studentForm.weeklyRepeat ? (
                        <label className="fullWidth">
                          Tekrar bitiş tarihi *
                          <input
                            type="date"
                            value={studentForm.repeatUntil}
                            onChange={(event) =>
                              updateStudentField(
                                "repeatUntil",
                                event.target.value
                              )
                            }
                            required
                          />
                        </label>
                      ) : null}

                      <div className="scheduleSummary fullWidth">
                        <strong>Ders ücreti</strong>
                        <span>
                          {Number(studentForm.defaultLessonFee || 0).toFixed(2)} € / ders
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="scheduleSkip">
                      Öğrenciyi şimdi kaydedip ders programını daha sonra
                      ekleyebilirsin.
                    </div>
                  )}
                </div>
              )}

              {studentError ? (
                <p className="formError">{studentError}</p>
              ) : null}

              <div className="modalActions wizardActions">
                {studentStep === 1 ? (
                  <>
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={closeStudentModal}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={goToGuardianStep}
                    >
                      Devam Et →
                    </button>
                  </>
                ) : studentStep === 2 ? (
                  <>
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={() => {
                        setStudentError("");
                        setStudentStep(1);
                      }}
                    >
                      ← Geri
                    </button>
                    <button
                      type="button"
                      className="primaryButton"
                      onClick={goToScheduleStep}
                    >
                      Devam Et →
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={() => {
                        setStudentError("");
                        setStudentStep(2);
                      }}
                      disabled={studentSaving}
                    >
                      ← Geri
                    </button>
                    <button
                      className="primaryButton"
                      type="submit"
                      disabled={studentSaving}
                    >
                      {studentSaving ? "Kaydediliyor…" : "Öğrenciyi Kaydet"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
