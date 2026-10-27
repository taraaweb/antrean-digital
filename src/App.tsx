import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Mode = "customer" | "monitor";
type Step = "identity" | "service" | "ticket";
type Service = {
  id: string;
  title: string;
  subtitle: string;
  prefix: string;
  estimate: number;
  color: string;
  icon: ReactNode;
  route: { title: string; detail: string }[];
};
type CounterKey = "manager" | "cashier1" | "cashier2" | "appraiser1" | "appraiser2";
type CounterQueue = {
  currentTicket: string;
  waitingTickets: string[];
};
type LobbyQueues = Record<CounterKey, CounterQueue>;

const initialLobbyQueues: LobbyQueues = {
  manager: { currentTicket: "D-003", waitingTickets: ["D-004", "D-005"] },
  cashier1: { currentTicket: "B-005", waitingTickets: ["B-006", "B-007", "B-008", "B-009"] },
  cashier2: { currentTicket: "C-008", waitingTickets: ["C-009", "C-010", "C-011"] },
  appraiser1: { currentTicket: "A-022", waitingTickets: ["A-023", "A-024", "A-025", "A-026", "A-027"] },
  appraiser2: { currentTicket: "A-021", waitingTickets: ["A-022", "A-023"] },
};

const Icon = ({
  children,
  size = 22,
}: {
  children: ReactNode;
  size?: number;
}) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={size}
    viewBox="0 0 24 24"
    width={size}
  >
    {children}
  </svg>
);

const services: Service[] = [
  {
    id: "gadai",
    title: "Gadai & Taksiran",
    subtitle: "E-form di CS, lalu menuju penaksir",
    prefix: "A",
    estimate: 15,
    color: "green",
    route: [
      { title: "Customer Service", detail: "Penginputan dan validasi data melalui e-Form." },
      { title: "Penaksir · Loket 4 atau 5", detail: "Penilaian barang dan konfirmasi Uang Pinjaman." },
      { title: "Kasir · Loket 2 atau 3", detail: "Pencairan dana setelah SBG diterbitkan." },
    ],
    icon: (
      <Icon size={26}>
        <path d="M7 10.5h10M8.5 7h7M9 14h4.5M9 17.5h2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      </Icon>
    ),
  },
  {
    id: "tebus",
    title: "Tebus Barang",
    subtitle: "Kasir, lalu pengambilan di pengelola",
    prefix: "B",
    estimate: 12,
    color: "gold",
    route: [
      { title: "Kasir · Loket 2 atau 3", detail: "Verifikasi transaksi dan proses pelunasan." },
      { title: "Pengelola · Loket 1", detail: "Petugas mengambil dan menyerahkan barang Anda." },
    ],
    icon: (
      <Icon size={26}>
        <path d="M4 8.5h16v10H4zM7 5h10M7 13h5M16.5 13h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </Icon>
    ),
  },
  {
    id: "bayar",
    title: "Transaksi / Bayar",
    subtitle: "Langsung menuju loket kasir",
    prefix: "C",
    estimate: 7,
    color: "berry",
    route: [
      { title: "Kasir · Loket 2 atau 3", detail: "Seluruh transaksi pembayaran dilayani di kasir." },
    ],
    icon: (
      <Icon size={26}>
        <path d="M4 8.5h16v10H4zM7 5h10M7 13h5M16.5 13h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </Icon>
    ),
  },
  {
    id: "ambil",
    title: "Ambil Barang",
    subtitle: "Sudah bayar di aplikasi, langsung ke pengelola",
    prefix: "D",
    estimate: 5,
    color: "blue",
    route: [
      { title: "Pengelola · Loket 1", detail: "Tunjukkan bukti pembayaran aplikasi untuk mengambil barang." },
    ],
    icon: (
      <Icon size={26}>
        <path d="m4 8 8-4 8 4-8 4-8-4Zm0 0v8l8 4 8-4V8M12 12v8" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      </Icon>
    ),
  },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <div className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span>
          <Icon size={18}>
            <path d="M5 8h14M8 8l-3 6h6L8 8Zm8 0-3 6h6l-3-6ZM12 4v13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </Icon>
        </span>
      </div>
      <div>
        <strong>Pegadaian</strong>
        <small>Mengatasi Masalah Tanpa Masalah</small>
      </div>
    </div>
  );
}

function QRCode() {
  const cells = useMemo(() => {
    const list: boolean[] = [];
    for (let y = 0; y < 21; y += 1) {
      for (let x = 0; x < 21; x += 1) {
        const finder =
          ((x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)) &&
          (x === 0 || x === 6 || y === 0 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5));
        list.push(finder || ((x * 7 + y * 11 + x * y) % 5 < 2 && !((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12))));
      }
    }
    return list;
  }, []);

  return (
    <div className="qr" aria-label="Kode QR untuk mengambil antrean">
      {cells.map((filled, index) => (
        <i className={filled ? "filled" : ""} key={index} />
      ))}
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  const active = step === "identity" ? 1 : step === "service" ? 2 : 3;
  return (
    <div className="progress" aria-label={`Langkah ${active} dari 3`}>
      {["Data diri", "Pilih layanan", "Tiket antrean"].map((label, index) => (
        <div className={`progress-item ${active >= index + 1 ? "active" : ""}`} key={label}>
          <span>{active > index + 1 ? "✓" : index + 1}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

function PawnServiceFlow() {
  return (
    <details className="pawn-flow">
      <summary>
        <span>
          <strong>Alur lengkap layanan gadai</strong>
          <small>Ketuk untuk melihat tahapan pelayanan</small>
        </span>
        <Icon size={18}>
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </Icon>
      </summary>
      <div className="pawn-stages">
        <div className="pawn-stage">
          <span>1</span>
          <div>
            <strong>Permohonan nasabah</strong>
            <p>Serahkan KTP asli dan barang jaminan kepada petugas.</p>
          </div>
        </div>
        <div className="pawn-stage">
          <span>2</span>
          <div>
            <strong>Penginputan e-Form oleh CS</strong>
            <ul>
              <li>Petugas masuk ke e-Form outlet dan memilih menu Transaksi.</li>
              <li>Pembuatan CIF untuk nasabah baru atau pengkinian data nasabah lama.</li>
              <li>Input barang jaminan dan pilihan Cicilan Fleksibel atau Cicilan Bulanan.</li>
              <li>Pengambilan foto KTP langsung untuk validasi identitas digital.</li>
              <li>Input peruntukan pinjaman, asal barang, dan pekerjaan; lalu validasi persetujuan dan submit.</li>
            </ul>
          </div>
        </div>
        <div className="pawn-stage">
          <span>3</span>
          <div>
            <strong>Penaksiran dan penerbitan SBG</strong>
            <ul>
              <li>Penaksir menerima KTP dan barang, lalu menyetujui data e-Form melalui SPRINT.</li>
              <li>Barang diuji untuk menentukan nilai taksiran dan maksimum Uang Pinjaman.</li>
              <li>Besaran Uang Pinjaman dikonfirmasi kepada nasabah.</li>
              <li>Setelah disetujui, SBG asli dan dwilipat diterbitkan lalu diteruskan ke kasir.</li>
            </ul>
          </div>
        </div>
      </div>
    </details>
  );
}

function CustomerFlow({
  onOpenMonitor,
  onTicketCreated,
}: {
  onOpenMonitor: () => void;
  onTicketCreated: (service: Service) => string;
}) {
  const [step, setStep] = useState<Step>("identity");
  const [nik, setNik] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Service | null>(null);
  const [ticket, setTicket] = useState("");

  const submitIdentity = (event: FormEvent) => {
    event.preventDefault();
    if (nik.length !== 16) {
      setError("NIK harus terdiri dari 16 digit.");
      return;
    }
    if (phone.length < 10) {
      setError("Masukkan nomor WhatsApp yang aktif.");
      return;
    }
    setError("");
    setStep("service");
  };

  const chooseService = (service: Service) => {
    const newTicket = onTicketCreated(service);
    setSelected(service);
    setTicket(newTicket);
    setStep("ticket");
  };

  const reset = () => {
    setNik("");
    setPhone("");
    setTicket("");
    setSelected(null);
    setStep("identity");
  };

  return (
    <main className="customer-shell">
      <section className="welcome-panel">
        <div className="welcome-content">
          <span className="eyebrow">Sistem antrean digital</span>
          <h1>Layanan lebih mudah, tanpa menunggu lama.</h1>
          <p>
            Ambil nomor antrean dari perangkat Anda, pantau status secara
            real-time, dan datang ke loket saat giliran tiba.
          </p>
          <div className="hours-card">
            <div className="hours-heading">
              <span>
                <Icon size={18}>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                </Icon>
              </span>
              <div>
                <strong>Jam operasional</strong>
                <small>Waktu Indonesia Tengah (WITA)</small>
              </div>
            </div>
            <div className="hours-list">
              <div className="hours-day">
                <strong>Senin s.d. Kamis</strong>
                <div className="hours-slots">
                  <span><b>08:00</b><small>Mulai</small></span>
                  <span><b>12:00 - 13:00</b><small>Istirahat</small></span>
                  <span><b>15:00</b><small>Selesai</small></span>
                </div>
              </div>
              <div className="hours-day">
                <strong>Jumat</strong>
                <div className="hours-slots">
                  <span><b>08:00</b><small>Mulai</small></span>
                  <span><b>11:30 - 13:00</b><small>Istirahat</small></span>
                  <span><b>15:00</b><small>Selesai</small></span>
                </div>
              </div>
              <div className="hours-day">
                <strong>Sabtu</strong>
                <div className="hours-slots">
                  <span><b>08:00</b><small>Mulai</small></span>
                  <span><b>-</b><small>Istirahat</small></span>
                  <span><b>12:00</b><small>Selesai</small></span>
                </div>
              </div>
            </div>
          </div>
          <div className="quick-info">
            <div>
              <Icon size={17}>
                <path d="M4 6h16v12H4zM8 10h.01M11 10h5M8 14h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
              </Icon>
              <span><strong>Siapkan KTP asli</strong><small>Wajib untuk verifikasi layanan</small></span>
            </div>
            <div>
              <Icon size={17}>
                <path d="M4 12h16M12 4v16M7 7l10 10M17 7 7 17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
              </Icon>
              <span><strong>5 loket layanan</strong><small>Antrean dipantau real-time</small></span>
            </div>
          </div>
        </div>
        <div className="welcome-footer">
          <span className="live-dot" /> Layanan cabang sedang buka
        </div>
      </section>

      <section className="flow-panel">
        <div className="flow-header">
          <div>
            <span className="branch-label">CP Tabanan</span>
            <h2>Ambil antrean</h2>
          </div>
          <button className="text-button" onClick={onOpenMonitor} type="button">
            Lihat monitor
            <Icon size={18}><path d="m9 5 7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>
          </button>
        </div>
        <Progress step={step} />

        {step === "identity" && (
          <form className="step-content" onSubmit={submitIdentity}>
            <div className="section-title">
              <span className="section-icon">
                <Icon><path d="M4 7h16v12H4zM8 7V5h8v2M8 12h.01M11 12h5M8 15h.01M11 15h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></Icon>
              </span>
              <div><h3>Masukkan data Anda</h3><p>Data digunakan untuk verifikasi layanan cabang.</p></div>
            </div>
            <label>
              Nomor Induk Kependudukan
              <div className="input-wrap">
                <Icon size={19}><path d="M4 6h16v12H4zM8 10h.01M11 10h5M8 14h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></Icon>
                <input
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={16}
                  onChange={(event) => setNik(event.target.value.replace(/\D/g, ""))}
                  placeholder="Masukkan 16 digit NIK"
                  value={nik}
                />
                <small>{nik.length}/16</small>
              </div>
            </label>
            <label>
              Nomor WhatsApp
              <div className="input-wrap">
                <Icon size={19}><path d="M7 4h10v16H7zM10 7h4M11 17h2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></Icon>
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={14}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                  placeholder="Contoh: 0812 3456 7890"
                  value={phone}
                />
              </div>
            </label>
            {error && <div className="error-message">{error}</div>}
            <button className="primary-button" type="submit">
              Cek data dan lanjutkan
              <Icon size={19}><path d="m8 5 7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>
            </button>
            <p className="privacy-note">
              <Icon size={16}><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></Icon>
              Data Anda terlindungi dan hanya digunakan untuk proses antrean.
            </p>
          </form>
        )}

        {step === "service" && (
          <div className="step-content service-step">
            <div className="section-title">
              <span className="section-icon">
                <Icon><path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /></Icon>
              </span>
              <div><h3>Pilih jenis layanan</h3><p>Pilih satu layanan yang ingin Anda kunjungi.</p></div>
            </div>
            <div className="services">
              {services.map((service) => (
                <button className={`service-card ${service.color}`} key={service.id} onClick={() => chooseService(service)} type="button">
                  <span className="service-icon">{service.icon}</span>
                  <span><strong>{service.title}</strong><small>{service.subtitle}</small></span>
                  <Icon size={19}><path d="m8 5 7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>
                </button>
              ))}
            </div>
            <button className="back-button" onClick={() => setStep("identity")} type="button">
              <Icon size={18}><path d="m15 5-7 7 7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></Icon>
              Kembali
            </button>
          </div>
        )}

        {step === "ticket" && selected && (
          <div className="step-content ticket-step">
            <div className="success-badge">
              <Icon size={24}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" /></Icon>
            </div>
            <span className="ticket-kicker">Tiket antrean berhasil dibuat</span>
            <h3>{ticket}</h3>
            <span className="ticket-service">{selected.title}</span>
            {selected.id === "gadai" && (
              <div className="requirement-note">
                <Icon size={20}>
                  <path d="M4 6h16v12H4zM8 10h.01M11 10h5M8 14h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
                </Icon>
                <span>
                  <strong>Siapkan KTP asli dan barang jaminan</strong>
                  <small>Emas, kendaraan, barang elektronik, atau jaminan lain yang diterima.</small>
                </span>
              </div>
            )}
            <div className="ticket-meta">
              <div><small>Estimasi tunggu</small><strong>± {selected.estimate} menit</strong></div>
              <div><small>Antrean di depan</small><strong>3 orang</strong></div>
            </div>
            <div className="service-route">
              <div className="route-heading">Urutan loket yang Anda tuju</div>
              {selected.route.map((destination, index) => (
                <div className="route-step" key={destination.title}>
                  <span className={`route-number ${index > 0 ? "muted" : ""}`}>{index + 1}</span>
                  <div>
                    <strong>{destination.title}</strong>
                    <small>{destination.detail}</small>
                  </div>
                  {index < selected.route.length - 1 && <span className="route-line" />}
                </div>
              ))}
            </div>
            {selected.id === "gadai" && <PawnServiceFlow />}
            <div className="ticket-callout">
              <Icon size={21}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8ZM10 20h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></Icon>
              <span><strong>Aktifkan notifikasi WhatsApp</strong><small>Kami akan mengingatkan saat giliran Anda dekat.</small></span>
            </div>
            <button className="primary-button" onClick={onOpenMonitor} type="button">Pantau antrean di monitor</button>
            <button className="back-button centered" onClick={reset} type="button">Ambil antrean baru</button>
          </div>
        )}
      </section>
    </main>
  );
}

function Monitor({
  latestTicket,
  queues,
  setQueues,
}: {
  latestTicket: string;
  queues: LobbyQueues;
  setQueues: React.Dispatch<React.SetStateAction<LobbyQueues>>;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const callNext = () => {
    setQueues((current) => {
      const [nextTicket, ...remainingTickets] = current.manager.waitingTickets;
      if (!nextTicket) return current;
      return {
        ...current,
        manager: {
          currentTicket: nextTicket,
          waitingTickets: remainingTickets,
        },
      };
    });
  };

  const counterCalls = [
    {
      counter: "Loket 1",
      role: "Pengelola",
      ticket: queues.manager.currentTicket,
      services: "Tebus tahap 2 · Ambil barang",
      color: "berry-dot",
    },
    {
      counter: "Loket 2",
      role: "Kasir",
      ticket: queues.cashier1.currentTicket,
      services: "Gadai tahap 3 · Tebus tahap 1 · Bayar",
      color: "gold-dot",
    },
    {
      counter: "Loket 3",
      role: "Kasir",
      ticket: queues.cashier2.currentTicket,
      services: "Gadai tahap 3 · Tebus tahap 1 · Bayar",
      color: "gold-dot",
    },
    {
      counter: "Loket 4",
      role: "Penaksir",
      ticket: queues.appraiser1.currentTicket,
      services: "Gadai & Taksiran tahap 2",
      color: "green",
    },
    {
      counter: "Loket 5",
      role: "Penaksir",
      ticket: queues.appraiser2.currentTicket,
      services: "Gadai & Taksiran tahap 2",
      color: "green",
    },
  ];

  const queueSummary: { counter: string; role: string; color: string; queue: CounterQueue }[] = [
    { counter: "Loket 1", role: "Pengelola", color: "berry-dot", queue: queues.manager },
    { counter: "Loket 2", role: "Kasir", color: "gold-dot", queue: queues.cashier1 },
    { counter: "Loket 3", role: "Kasir", color: "gold-dot", queue: queues.cashier2 },
    { counter: "Loket 4", role: "Penaksir", color: "green", queue: queues.appraiser1 },
    { counter: "Loket 5", role: "Penaksir", color: "green", queue: queues.appraiser2 },
  ];
  const totalWaiting = queueSummary.reduce((total, item) => total + item.queue.waitingTickets.length, 0);

  return (
    <main className="monitor-shell">
      <section className="monitor-heading">
        <div>
          <span className="eyebrow gold">Antrean hari ini</span>
          <h1>Selamat datang di Pegadaian<br />Cabang Tabanan</h1>
        </div>
        <div className="clock">
          <strong>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":")}</strong>
          <span>{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <div className="waiting-total"><i />{totalWaiting} antrean sedang menunggu</div>
        </div>
      </section>

      <section className="monitor-grid">
        <div className="now-serving">
          <div className="serving-heading">
            <span className="now-label"><i /> Sedang dilayani</span>
            <small>Nomor panggilan setiap loket</small>
          </div>
          <div className="counter-call-list">
            {counterCalls.map((call) => (
              <div className="counter-call" key={call.counter}>
                <i className={call.color} />
                <div className="counter-info">
                  <strong>{call.counter} · {call.role}</strong>
                  <small>{call.services}</small>
                </div>
                <b>{call.ticket}</b>
              </div>
            ))}
          </div>
          <button className="monitor-demo" onClick={callNext} type="button">Panggil antrean berikutnya</button>
        </div>

        <div className="queue-list">
          <div className="list-heading"><span>Antrean berikutnya</span><small>Nomor selanjutnya & yang menunggu</small></div>
          {queueSummary.map(({ counter, role, color, queue }) => (
            <div className="queue-row" key={counter}>
              <span><i className={color} />{counter} · {role}</span>
              <div className="queue-value">
                <strong>{queue.waitingTickets[0] ?? "—"}</strong>
                <small>{queue.waitingTickets.length} antrean menunggu</small>
              </div>
            </div>
          ))}
          {latestTicket && <div className="latest-ticket"><span>Tiket terbaru</span><strong>{latestTicket}</strong></div>}
        </div>

        <div className="scan-card">
          <QRCode />
          <div><strong>Belum punya antrean?</strong><span>Scan QR untuk ambil antrean mandiri dari HP Anda.</span></div>
        </div>
      </section>

      <footer className="monitor-footer">
        <span className="marquee-dot" />
        <p>Siapkan KTP atau NIK Anda sebelum menuju loket untuk mempercepat pelayanan.</p>
        <span>Cabang Tabanan</span>
      </footer>
    </main>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("customer");
  const [latestTicket, setLatestTicket] = useState("");
  const [lobbyQueues, setLobbyQueues] = useState<LobbyQueues>(initialLobbyQueues);
  const ticketSequences = useRef({
    gadai: 27,
    tebus: 9,
    bayar: 11,
    ambil: 5,
  });

  const createTicket = (service: Service) => {
    const nextNumber = ticketSequences.current[service.id as keyof typeof ticketSequences.current] + 1;
    ticketSequences.current[service.id as keyof typeof ticketSequences.current] = nextNumber;
    const newTicket = `${service.prefix}-${String(nextNumber).padStart(3, "0")}`;

    let destination: CounterKey;
    if (service.id === "gadai") {
      destination =
        lobbyQueues.appraiser1.waitingTickets.length <= lobbyQueues.appraiser2.waitingTickets.length
          ? "appraiser1"
          : "appraiser2";
    } else if (service.id === "tebus" || service.id === "bayar") {
      destination =
        lobbyQueues.cashier1.waitingTickets.length <= lobbyQueues.cashier2.waitingTickets.length
          ? "cashier1"
          : "cashier2";
    } else {
      destination = "manager";
    }

    setLobbyQueues((current) => ({
      ...current,
      [destination]: {
        ...current[destination],
        waitingTickets: [...current[destination].waitingTickets, newTicket],
      },
    }));
    setLatestTicket(newTicket);
    return newTicket;
  };

  return (
    <div className={`app ${mode === "monitor" ? "monitor-mode" : ""}`}>
      <header className="topbar">
        <Brand light={mode === "monitor"} />
        <nav aria-label="Tampilan aplikasi">
          <button className={mode === "customer" ? "active" : ""} onClick={() => setMode("customer")} type="button">
            <Icon size={18}><path d="M4 6h16v12H4zM8 10h.01M11 10h5M8 14h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></Icon>
            Ambil antrean
          </button>
          <button className={mode === "monitor" ? "active" : ""} onClick={() => setMode("monitor")} type="button">
            <Icon size={18}><path d="M3 5h18v12H3zM8 21h8M12 17v4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></Icon>
            Monitor lobi
          </button>
        </nav>
      </header>
      {mode === "customer" ? (
        <CustomerFlow onOpenMonitor={() => setMode("monitor")} onTicketCreated={createTicket} />
      ) : (
        <Monitor latestTicket={latestTicket} queues={lobbyQueues} setQueues={setLobbyQueues} />
      )}
    </div>
  );
}
