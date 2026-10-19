import { FormEvent, ReactNode, useEffect, useRef, useState } from "react"

type Page = "home" | "finance" | "academics" | "schedule" | "goals"
type Auth = "login" | "signup" | "verify" | "reset"

const icons: Record<string, ReactNode> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 6h16v15H5a2 2 0 0 1-2-2z" />
      <path d="M3 8h16M15 12h7v5h-7a2.5 2.5 0 0 1 0-5z" />
    </>
  ),
  book: (
    <>
      <path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3z" />
      <path d="M4 5v17M8 7h8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
      <path d="m15 9 6-6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <path d="m9 6 6 6-6 6" />,
  up: (
    <>
      <path d="m7 11 5-5 5 5M12 6v12" />
    </>
  ),
  down: (
    <>
      <path d="m7 13 5 5 5-5M12 18V6" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6zM14 2v5h4" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  print: (
    <>
      <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5h16v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v7H6z" />
    </>
  ),
}
function Icon({ name, size = 19 }: { name: string size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icons[name]}
    </svg>
  )
}
const cash = (n: number) => `KES ${n.toLocaleString()}`
const nav: { id: Page label: string icon: string }[] = [
  ["home", "Overview", "home"],
  ["finance", "Finance", "wallet"],
  ["academics", "Academics", "book"],
  ["schedule", "Schedule", "calendar"],
  ["goals", "Goals", "target"],
].map((x) => ({ id: x[0] as Page, label: x[1], icon: x[2] }))
type MoneyAccount = [string, number, number, string]
type Transaction = [string, string, number, string, string]
type Unit = [string, string, number, string]
type Goal = [string, string, number, string, string, string]
type CalendarEvent = [string, string, string, string]

const accounts: MoneyAccount[] = [
  ["Savings", 82000, 35, "yellow"],
  ["Rent", 28500, 25, "olive"],
  ["Emergency", 46300, 20, "blue"],
  ["Everyday", 24780, 20, "orange"],
]
const events: CalendarEvent[] = [
  ["09:00", "Probability & Statistics II", "SCC 201", "yellow"],
  ["11:30", "Client project review", "Google Meet", "blue"],
  ["14:00", "Library focus session", "JKUAT Library", "olive"],
  ["17:30", "Evening run", "Sports field", "orange"],
]

function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) as T : initial
    } catch {
      return initial
    }
  })
  useEffect(
    () => localStorage.setItem(key, JSON.stringify(value)),
    [key, value],
  )
  return [value, setValue] as const
}

function downloadText(filename: string, content: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function Notice({ message, close }: { message: string close: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(close, 2800)
    return () => window.clearTimeout(timer)
  }, [close])
  return (
    <div className="app-notice" role="status">
      <i>
        <Icon name="check" />
      </i>
      <span>{message}</span>
      <button onClick={close} aria-label="Dismiss notification">
        <Icon name="close" size={15} />
      </button>
    </div>
  )
}

function Logo() {
  return (
    <div className="logo">
      <i>
        <b />
      </i>
      <strong>
        LifeDesk<span>.</span>
      </strong>
    </div>
  )
}
function Btn({
  children,
  kind = "primary",
  onClick,
  type = "button",
}: {
  children: ReactNode
  kind?: string
  onClick?: () => void
  type?: "button" | "submit"
}) {
  return (
    <button className={`btn ${kind}`} onClick={onClick} type={type}>
      {children}
    </button>
  )
}
function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <i style={{ width: `${value}%` }} />
    </div>
  )
}
function Heading({
  label,
  title,
  action,
}: {
  label: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <small>{label}</small>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

function AuthScreen({ enter }: { enter: () => void }) {
  const [mode, setMode] = useState<Auth>("login"),
    [show, setShow] = useState(false),
    [sent, setSent] = useState(false),
    [notice, setNotice] = useState("")
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === "login" || mode === "verify") enter()
    else if (mode === "signup") setMode("verify")
    else setSent(true)
  }
  const title = {
    login: "WELCOME BACK!",
    signup: "CREATE YOUR DESK",
    verify: "CHECK YOUR INBOX",
    reset: "RESET PASSWORD",
  }[mode]
  return (
    <main className="auth-page">
      <div className="contours" />
      <section className="auth-card">
        <header>
          <Logo />
          <nav>HOME　 FEATURES　 ABOUT</nav>
        </header>
        <div className="auth-grid">
          <div className="auth-form">
            <div className="auth-copy">
              <small>YOUR LIFE, ORGANIZED</small>
              <h1>{title}</h1>
              <p>
                {mode === "login"
                  ? "Sign in to bring your day into focus."
                  : mode === "verify"
                    ? "Enter the 6-digit code sent to your email."
                    : "One calm place for your whole life."}
              </p>
            </div>
            {sent ? (
              <div className="success">
                <i>
                  <Icon name="check" />
                </i>
                <h2>Link sent</h2>
                <p>Check your inbox to continue.</p>
                <Btn onClick={() => setMode("login")}>Back to sign in</Btn>
              </div>
            ) : mode === "verify" ? (
              <form onSubmit={submit}>
                <label>Verification code</label>
                <div className="code">
                  {[0, 1, 2, 3, 4, 5].map((x) => (
                    <input
                      key={x}
                      maxLength={1}
                      defaultValue={x === 0 ? "8" : ""}
                    />
                  ))}
                </div>
                <Btn type="submit">
                  Verify account <Icon name="arrow" />
                </Btn>
                <p className="switch">
                  Didn't get it?{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setNotice("A fresh verification code was sent")
                    }
                  >
                    Resend code
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={submit}>
                {mode === "signup" && (
                  <label>
                    Full name
                    <input required placeholder="Maya Wanjiku" />
                  </label>
                )}
                <label>
                  {mode === "login" ? "Username or email" : "Email address"}
                  <input
                    required
                    type={mode === "login" ? "text" : "email"}
                    defaultValue={mode === "login" ? "maya@lifedesk.app" : ""}
                    placeholder="example@gmail.com"
                  />
                </label>
                {mode === "signup" && (
                  <label>
                    Username
                    <input required placeholder="mayaw" />
                  </label>
                )}
                {mode !== "reset" && (
                  <label>
                    Password
                    <div className="password">
                      <input
                        required
                        type={show ? "text" : "password"}
                        defaultValue={mode === "login" ? "lifedeskdemo" : ""}
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShow(!show)}>
                        <Icon name="eye" />
                      </button>
                    </div>
                  </label>
                )}
                {mode === "login" && (
                  <div className="options">
                    <label>
                      <input type="checkbox" defaultChecked />
                      <i>
                        <Icon name="check" size={11} />
                      </i>{" "}
                      Remember me
                    </label>
                    <button type="button" onClick={() => setMode("reset")}>
                      Forgot password?
                    </button>
                  </div>
                )}
                <Btn type="submit">
                  {mode === "login"
                    ? "Sign In"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}{" "}
                  <Icon name="arrow" />
                </Btn>
                <p className="switch">
                  {mode === "login"
                    ? "Don't have an account?"
                    : "Already registered?"}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setMode(mode === "login" ? "signup" : "login")
                    }
                  >
                    {mode === "login" ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </form>
            )}
          </div>
          <div className="auth-art">
            <div className="art-title">
              PLAN LESS.<b>LIVE MORE.</b>
            </div>
            <div className="sun">
              <div className="panda">
                <div className="ears" />
                <div className="face">
                  <i />
                  <i />
                  <b />
                </div>
                <div className="body" />
              </div>
              <img
                src="/assets/hero-mascot.png"
                alt=""
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
            <aside>
              <b>𝕏</b>
              <b>in</b>
              <b>ig</b>
              <b>f</b>
              <b>be</b>
            </aside>
          </div>
        </div>
      </section>
      {notice && <Notice message={notice} close={() => setNotice("")} />}
    </main>
  )
}

function Shell({
  page,
  setPage,
  light,
  setLight,
  logout,
  children,
}: {
  page: Page
  setPage: (p: Page) => void
  light: boolean
  setLight: (v: boolean) => void
  logout: () => void
  children: ReactNode
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState("")
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", shortcut)
    return () => window.removeEventListener("keydown", shortcut)
  }, [])
  const search = (value: string) => {
    const match = nav.find(
      (item) =>
        item.label.toLowerCase().includes(value.toLowerCase()) ||
        item.id.includes(value.toLowerCase()),
    )
    if (match) {
      setPage(match.id)
      setNotice(`Opened ${match.label}`)
      if (searchRef.current) searchRef.current.value = ""
    } else {
      setNotice(`No workspace matched “${value}”`)
    }
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo />
        <small>WORKSPACE</small>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              onClick={() => setPage(n.id)}
            >
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="user">
          <div>MW</div>
          <span>
            <b>Maya Wanjiku</b>
            <small>maya@lifedesk.app</small>
          </span>
          <button onClick={logout}>↗</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <small>LIFEDESK /</small>{" "}
            <b>{nav.find((n) => n.id === page)?.label}</b>
          </div>
          <label>
            <Icon name="search" />
            <input
              ref={searchRef}
              placeholder="Search modules..."
              onKeyDown={(event) => {
                if (event.key === "Enter") search(event.currentTarget.value)
              }}
            />
            <kbd>⌘ K</kbd>
          </label>
          <button onClick={() => setLight(!light)}>
            <Icon name="sun" />
          </button>
          <button
            onClick={() =>
              setNotice("You're all caught up — no unread notifications")
            }
            aria-label="Open notifications"
          >
            <Icon name="bell" />
          </button>
          <i>MW</i>
        </header>
        {children}
      </div>
      <nav className="mobile-nav">
        {nav.map((n) => (
          <button
            className={page === n.id ? "active" : ""}
            onClick={() => setPage(n.id)}
            key={n.id}
          >
            <Icon name={n.icon} />
            <small>{n.label}</small>
          </button>
        ))}
      </nav>
      {notice && <Notice message={notice} close={() => setNotice("")} />}
    </div>
  )
}
function PageHead({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string
  title: string
  desc: string
  children?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Home({ go }: { go: (p: Page) => void }) {
  const [moneyAccounts] = usePersistent<MoneyAccount[]>("ld-accounts", accounts)
  const [calendarEvents] = usePersistent<CalendarEvent[]>("ld-events", events)
  const [savedGoals] = usePersistent<Goal[]>("ld-goals", [
    [
      "Emergency fund",
      "FINANCIAL",
      68,
      "KES 68,000 saved",
      "yellow",
      "2025-09-30",
    ],
    [
      "Complete Semester 2",
      "ACADEMIC",
      74,
      "12 of 16 milestones",
      "blue",
      "2025-07-18",
    ],
    [
      "Run 100 kilometres",
      "HEALTH",
      42,
      "42 km completed",
      "orange",
      "2025-08-31",
    ],
  ])
  const totalBalance = moneyAccounts.reduce(
    (sum, account) => sum + account[1],
    0,
  )
  return (
    <main className="content">
      <PageHead
        eyebrow="THURSDAY, 19 JUNE"
        title="Good morning, Maya."
        desc="You have 4 events and 2 deadlines today. Let's make it count."
      >
        <div className="streak">
          <Icon name="target" />
          <span>
            <b>12 day streak</b>
            <small>You're on a roll</small>
          </span>
        </div>
      </PageHead>
      <div className="quick">
        {[
          ["up", "Add income", "finance"],
          ["down", "Add expense", "finance"],
          ["file", "New note", "academics"],
          ["calendar", "New event", "schedule"],
        ].map((x) => (
          <button onClick={() => go(x[2] as Page)} key={x[1]}>
            <i>
              <Icon name={x[0]} />
            </i>
            {x[1]}
            <Icon name="plus" size={14} />
          </button>
        ))}
      </div>
      <div className="dashboard">
        <section className="panel">
          <Heading
            label="FINANCES"
            title="Money at a glance"
            action={
              <button onClick={() => go("finance")}>View finance →</button>
            }
          />
          <div className="balance">
            <span>
              <small>Total balance</small>
              <b>{cash(totalBalance)}</b>
              <em>↑ 8.4% this month</em>
            </span>
            <i>
              <b>68%</b>
              <small>saved</small>
            </i>
          </div>
          <div className="account-list">
            {moneyAccounts.slice(0, 3).map((a) => (
              <div key={a[0]}>
                <span>
                  <i className={a[3]} />
                  {a[0]}
                </span>
                <b>{cash(a[1] as number)}</b>
                <Progress value={a[1] as number / 1000} />
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <Heading
            label="TODAY"
            title="Your schedule"
            action={<em>19 JUN</em>}
          />
          <div className="timeline">
            {calendarEvents.slice(0, 3).map((e) => (
              <div key={e[0]}>
                <time>{e[0]}</time>
                <i className={e[3]} />
                <span>
                  <b>{e[1]}</b>
                  <small>{e[2]}</small>
                </span>
                <Icon name="more" />
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <Heading label="GOALS" title="Keep moving forward" />
          {savedGoals.slice(0, 3).map((g) => (
            <div className="goal-line" key={g[0]}>
              <i>
                <Icon name="target" />
              </i>
              <span>
                <b>{g[0]}</b>
                <small>{g[2]}% complete</small>
                <Progress value={g[2]} />
              </span>
              <strong>{g[2]}%</strong>
            </div>
          ))}
        </section>
        <section className="panel">
          <Heading label="ACADEMICS" title="Upcoming deadlines" />
          {[
            ["21", "Regression Analysis CAT", "2 days left"],
            ["24", "Database Systems Assignment", "5 days left"],
            ["30", "Statistical Computing Exam", "11 days left"],
          ].map((d) => (
            <div className="deadline" key={d[0]}>
              <i>
                <b>{d[0]}</b>
                <small>JUN</small>
              </i>
              <span>
                <b>{d[1]}</b>
                <small>{d[2]}</small>
              </span>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}

function Finance() {
  const [modal, setModal] =
      useState<"income" | "expense" | "account" | "receipt" | null>(null),
    [amount, setAmount] = useState(48000),
    [notice, setNotice] = useState(""),
    [moneyAccounts, setMoneyAccounts] = usePersistent<MoneyAccount[]>(
      "ld-accounts",
      accounts,
    ),
    [transactions, setTransactions] = usePersistent<Transaction[]>(
      "ld-transactions",
      [
        ["Freelance project", "Income · Today", 48000, "up", "Savings"],
        ["Naivas Supermarket", "Food · Yesterday", -4350, "down", "Everyday"],
        ["Savings transfer", "Transfer · 18 Jun", -12000, "wallet", "Savings"],
        ["Campus printing", "School · 17 Jun", -1250, "file", "Everyday"],
      ],
    )
  const total = moneyAccounts.reduce((sum, account) => sum + account[1], 0)
  const exportStatement = () => {
    const rows = [
      "Transaction,Details,Account,Amount",
      ...transactions.map((item) =>
        [item[0], item[1], item[4], item[2]]
          .map((cell) => `"${cell}"`)
          .join(","),
      ),
    ]
    downloadText("lifedesk-statement.csv", rows.join("\n"))
    setNotice("Statement downloaded as CSV")
  }
  const saveFinance = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (modal === "account") {
      const name = String(data.get("name") || "").trim()
      const percentage = Number(data.get("percentage"))
      const largest = moneyAccounts.reduce(
        (best, account, index) =>
          account[2] > moneyAccounts[best][2] ? index : best,
        0,
      )
      if (!name || percentage < 1 || percentage > moneyAccounts[largest][2]) {
        setNotice(
          `Use 1–${moneyAccounts[largest][2]}%; the largest account funds the new split`,
        )
        return
      }
      const next = moneyAccounts.map((account, index) =>
        index === largest
          ? [
              account[0],
              account[1],
              account[2] - percentage,
              account[3],
            ] as MoneyAccount
          : account,
      )
      next.push([name, 0, percentage, "blue"])
      setMoneyAccounts(next)
      setNotice(`${name} account created; future income will use the new split`)
    } else if (modal === "income") {
      const source = String(data.get("source") || "Income")
      setMoneyAccounts(
        moneyAccounts.map((account) => [
          account[0],
          account[1] + (amount * account[2]) / 100,
          account[2],
          account[3],
        ]),
      )
      setTransactions([
        [source, "Income · Just now", amount, "up", "Auto-split"],
        ...transactions,
      ])
      setNotice(`${cash(amount)} split across ${moneyAccounts.length} accounts`)
    } else if (modal === "expense") {
      const accountName = String(data.get("account"))
      const index = moneyAccounts.findIndex(
        (account) => account[0] === accountName,
      )
      if (index < 0 || moneyAccounts[index][1] < amount) {
        setNotice("Expense blocked: this would overdraw the selected account")
        return
      }
      const next = [...moneyAccounts]
      next[index] = [
        next[index][0],
        next[index][1] - amount,
        next[index][2],
        next[index][3],
      ]
      const category = String(data.get("source") || "Expense")
      setMoneyAccounts(next)
      setTransactions([
        [category, "Expense · Just now", -amount, "down", accountName],
        ...transactions,
      ])
      setNotice(`${cash(amount)} deducted from ${accountName}`)
    }
    setModal(null)
  }
  return (
    <main className="content">
      <PageHead
        eyebrow="YOUR MONEY"
        title="Finance"
        desc="Know where every shilling goes."
      >
        <Btn kind="secondary" onClick={() => setModal("expense")}>
          <Icon name="down" /> Add expense
        </Btn>
        <Btn onClick={() => setModal("income")}>
          <Icon name="up" /> Add income
        </Btn>
      </PageHead>
      <div className="metrics">
        {[
          ["TOTAL BALANCE", total, `${moneyAccounts.length} active accounts`],
          ["INCOME THIS MONTH", 126000, "+12.2% vs May"],
          ["SPENT THIS MONTH", 47720, "38% of income"],
          ["MONTHLY SAVINGS", 78280, "62% savings rate"],
        ].map((m) => (
          <article key={m[0]}>
            <small>{m[0]}</small>
            <b>{cash(m[1] as number)}</b>
            <span>{m[2]}</span>
          </article>
        ))}
      </div>
      <section className="panel accounts">
        <Heading
          label="AUTO-SPLIT ACCOUNTS"
          title="Your accounts"
          action={
            <Btn kind="secondary" onClick={() => setModal("account")}>
              <Icon name="plus" /> New account
            </Btn>
          }
        />
        <div>
          {moneyAccounts.map((a) => (
            <article key={a[0]}>
              <i className={a[3]} />
              <small>{a[0]}</small>
              <b>{cash(a[1] as number)}</b>
              <span>
                {a[2]}% of income <strong>{a[2]}%</strong>
              </span>
              <Progress value={a[2] as number * 2.5} />
            </article>
          ))}
        </div>
        <footer>
          <Icon name="check" />
          <span>
            <b>Your income split is balanced</b>
            <small>All account percentages add up to 100%</small>
          </span>
          <strong>100%</strong>
        </footer>
      </section>
      <section className="panel transactions">
        <Heading
          label="ACTIVITY"
          title="Recent transactions"
          action={
            <Btn kind="secondary" onClick={exportStatement}>
              Filter & export
            </Btn>
          }
        />
        {transactions.map((t) => (
          <div key={t[0]}>
            <i>
              <Icon name={t[3]} />
            </i>
            <span>
              <b>{t[0]}</b>
              <small>{t[1]}</small>
            </span>
            <em>{t[4]}</em>
            <strong>
              {t[2] as number > 0 ? "+" : ""}
              {cash(t[2] as number)}
            </strong>
            <button onClick={() => setModal("receipt")}>
              <Icon name="more" />
            </button>
          </div>
        ))}
      </section>
      {modal && modal !== "receipt" && (
        <Modal
          title={
            modal === "income"
              ? "Log new income"
              : modal === "expense"
                ? "Add an expense"
                : "Create money account"
          }
          close={() => setModal(null)}
        >
          <form className="modal-form" onSubmit={saveFinance}>
            {modal === "account" ? (
              <>
                <label>
                  Account name
                  <input name="name" required placeholder="e.g. Business" />
                </label>
                <label>
                  Income percentage
                  <input
                    name="percentage"
                    required
                    type="number"
                    min="1"
                    max={Math.max(
                      ...moneyAccounts.map((account) => account[2]),
                    )}
                    defaultValue="10"
                  />
                </label>
                <p className="form-help">
                  The percentage is moved from your largest existing split so
                  the total always remains exactly 100%.
                </p>
              </>
            ) : (
              <>
                <label>
                  Amount (KES)
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(+e.target.value)}
                  />
                </label>
                <label>
                  {modal === "income" ? "Income source" : "Category"}
                  <select name="source">
                    <option>
                      {modal === "income" ? "Freelance" : "Food & groceries"}
                    </option>
                    <option>
                      {modal === "income" ? "Salary" : "Transport"}
                    </option>
                  </select>
                </label>
                {modal === "income" && (
                  <div className="split">
                    <small>AUTO-SPLIT PREVIEW</small>
                    {moneyAccounts.map((a) => (
                      <span key={a[0]}>
                        {a[0]} · {a[2]}%{" "}
                        <b>{cash((amount * a[2]) as number / 100)}</b>
                      </span>
                    ))}
                  </div>
                )}
                {modal === "expense" && (
                  <label>
                    Pay from
                    <select name="account">
                      {moneyAccounts.map((account) => (
                        <option key={account[0]} value={account[0]}>
                          {account[0]} — {cash(account[1])}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Note
                  <textarea name="note" placeholder="Add a short note..." />
                </label>
              </>
            )}
            <Btn type="submit">
              {modal === "account" ? "Create account" : `Confirm ${modal}`}
            </Btn>
          </form>
        </Modal>
      )}
      {modal === "receipt" && <Receipt close={() => setModal(null)} />}
      {notice && <Notice message={notice} close={() => setNotice("")} />}
    </main>
  )
}

function Academics() {
  const [study, setStudy] = useState(false),
    [adding, setAdding] = useState(false),
    [tab, setTab] = useState("My units"),
    [notice, setNotice] = useState(""),
    [units, setUnits] = usePersistent<Unit[]>("ld-units", [
      ["SMA 2304", "Regression Analysis", 76, "A"],
      ["SMA 2203", "Statistical Computing", 68, "B"],
      ["ICS 2102", "Database Systems", 63, "B"],
      ["SMA 2301", "Real Analysis II", 54, "C"],
    ])
  const exportTranscript = () => {
    downloadText(
      "lifedesk-transcript.csv",
      [
        "Unit code,Unit title,Score,Grade",
        ...units.map((unit) => unit.map((value) => `"${value}"`).join(",")),
      ].join("\n"),
    )
    setNotice("Transcript downloaded")
  }
  const addUnit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const score = Number(data.get("score"))
    const grade =
      score >= 70
        ? "A"
        : score >= 60
          ? "B"
          : score >= 50
            ? "C"
            : score >= 40
              ? "D"
              : "E"
    setUnits([
      ...units,
      [
        String(data.get("code")).toUpperCase(),
        String(data.get("title")),
        score,
        grade,
      ],
    ])
    setAdding(false)
    setNotice("Unit added to Semester 2")
  }
  return (
    <main className="content">
      <PageHead
        eyebrow="BSC STATISTICS · YEAR 2"
        title="Academics"
        desc="Semester 2 · 2024/2025 academic year"
      >
        <Btn kind="secondary" onClick={exportTranscript}>
          <Icon name="file" /> Transcript
        </Btn>
        <Btn onClick={() => setAdding(true)}>
          <Icon name="plus" /> Add unit
        </Btn>
      </PageHead>
      <section className="academic-hero">
        <span>
          <small>CURRENT SEMESTER</small>
          <b>
            68.4<em>%</em>
          </b>
          <p>Upper Second Class</p>
        </span>
        <i>
          <b>3.42</b>
          <small>GPA / 4.0</small>
        </i>
        <div>
          <b>
            7<small>Units</small>
          </b>
          <b>
            21<small>Credit hours</small>
          </b>
          <b>
            74%<small>Study progress</small>
          </b>
        </div>
        <strong>
          <Icon name="clock" />
          <span>
            <small>EXAMS BEGIN IN</small>18 days
          </span>
        </strong>
      </section>
      <div className="tabs interactive-tabs">
        {["My units", "Notes", "Files", "Assignments", "Grades"].map((item) => (
          <button
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      {(tab === "My units" || tab === "Grades") && (
        <div className="units">
          {units.map((u, i) => (
            <article key={u[0] as string}>
              <small>{u[0]}</small>
              <h3>{u[1]}</h3>
              <p>Dr. {i % 2 ? "Njeri" : "Kamau"} · 3 credit hours</p>
              <div>
                {5 + i} notes　 {3 + i} files
              </div>
              <span>
                Current grade{" "}
                <b>
                  {u[2]}% · {u[3]}
                </b>
              </span>
              <Progress value={u[2] as number} />
              <button onClick={() => setStudy(true)}>
                <Icon name="book" /> Study mode
              </button>
            </article>
          ))}
        </div>
      )}
      {tab === "Notes" && (
        <section className="panel tab-message">
          <Icon name="file" size={28} />
          <h2>Your unit notes</h2>
          <p>
            Open Study Mode from any unit to read and edit its autosaved notes.
          </p>
        </section>
      )}
      {tab === "Files" && (
        <section className="panel tab-message">
          <Icon name="file" size={28} />
          <h2>Course files</h2>
          <p>
            PDF metadata is stored securely per unit through the academics API.
          </p>
          <label className="file-picker">
            Choose PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) =>
                event.currentTarget.files?.[0] &&
                setNotice(`${event.currentTarget.files[0].name} selected`)
              }
            />
          </label>
        </section>
      )}
      {(tab === "My units" || tab === "Assignments") && (
        <section className="panel deadlines">
          <Heading label="UP NEXT" title="Assignments & CATs" />
          {[
            ["21", "Regression Analysis CAT 2", "SMA 2304 · 2 days"],
            ["24", "Normalization & SQL Assignment", "ICS 2102 · 5 days"],
          ].map((x) => (
            <div key={x[0]}>
              <i>
                <b>{x[0]}</b>
                <small>JUN</small>
              </i>
              <span>
                <b>{x[1]}</b>
                <small>{x[2]}</small>
              </span>
              <em>UPCOMING</em>
            </div>
          ))}
        </section>
      )}
      {adding && (
        <Modal title="Add semester unit" close={() => setAdding(false)}>
          <form className="modal-form" onSubmit={addUnit}>
            <label>
              Unit code
              <input required name="code" placeholder="SMA 2402" />
            </label>
            <label>
              Unit title
              <input required name="title" placeholder="Time Series Analysis" />
            </label>
            <label>
              Current score
              <input
                required
                name="score"
                type="number"
                min="0"
                max="100"
                defaultValue="70"
              />
            </label>
            <Btn type="submit">Add unit</Btn>
          </form>
        </Modal>
      )}
      {study && <Study close={() => setStudy(false)} />}
      {notice && <Notice message={notice} close={() => setNotice("")} />}
    </main>
  )
}

function Study({ close }: { close: () => void }) {
  const [focus, setFocus] = useState(false)
  const noteRef = useRef<HTMLElement>(null)
  const savedNote = localStorage.getItem("ld-study-note")
  const format = (command: string, value?: string) => {
    noteRef.current?.focus()
    document.execCommand(command, false, value)
  }
  return (
    <div className={`study ${focus ? "focus-study" : ""}`}>
      <header>
        <button onClick={close}>
          <Icon name="close" />
        </button>
        <Logo />
        <span>SMA 2304 · Regression Analysis</span>
        <button onClick={() => setFocus(!focus)}>
          {focus ? "Split view" : "Focus notes"}
        </button>
      </header>
      <main>
        <section>
          <article>
            <small>CHAPTER 4</small>
            <h1>Multiple Linear Regression</h1>
            <p>
              In practical applications, we often model the relationship between
              a response variable and several explanatory variables.
            </p>
            <h2>4.1 The general linear model</h2>
            <div>Y = β₀ + β₁X₁ + β₂X₂ + ··· + βₚXₚ + ε</div>
            <p>
              The least squares method estimates coefficients by minimizing the
              sum of squared residuals.
            </p>
            <mark>
              The coefficient βⱼ represents the expected change in Y for a
              one-unit increase in Xⱼ, holding all other variables constant.
            </mark>
          </article>
        </section>
        <section>
          <header>
            <b>Chapter 4 — Multiple Regression</b>
            <small>Saved just now</small>
          </header>
          <nav className="editor-actions">
            <button onClick={() => format("bold")}>
              <b>B</b>
            </button>
            <button onClick={() => format("italic")}>
              <i>I</i>
            </button>
            <button onClick={() => format("formatBlock", "h2")}>H2</button>
            <button onClick={() => format("insertUnorderedList")}>List</button>
            <button onClick={() => format("hiliteColor", "#ffd500")}>
              Highlight
            </button>
          </nav>
          <article
            ref={noteRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(event) =>
              localStorage.setItem(
                "ld-study-note",
                event.currentTarget.innerHTML,
              )
            }
            dangerouslySetInnerHTML={
              savedNote ? { __html: savedNote } : undefined
            }
          >
            {!savedNote && (
              <>
                <h1>Multiple Linear Regression</h1>
                <p>
                  <b>Key idea:</b> Multiple regression extends simple linear
                  regression to include more than one predictor.
                </p>
                <h2>Interpreting coefficients</h2>
                <ul>
                  <li>β₀ is the intercept</li>
                  <li>βⱼ is the partial slope</li>
                  <li>ε captures random error</li>
                </ul>
                <blockquote>
                  Always interpret one coefficient while holding the others
                  constant.
                </blockquote>
              </>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}

function Schedule() {
  const days = ["MON 16", "TUE 17", "WED 18", "THU 19", "FRI 20"]
  const [adding, setAdding] = useState(false),
    [view, setView] = useState("Week"),
    [notice, setNotice] = useState(""),
    [calendarEvents, setCalendarEvents] = usePersistent<CalendarEvent[]>(
      "ld-events",
      events,
    )
  const addEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setCalendarEvents([
      ...calendarEvents,
      [
        String(data.get("time")),
        String(data.get("title")),
        String(data.get("location") || "No location"),
        String(data.get("color") || "yellow"),
      ],
    ])
    setAdding(false)
    setNotice("Event added to your schedule")
  }
  return (
    <main className="content">
      <PageHead
        eyebrow="PLAN YOUR TIME"
        title="Schedule"
        desc="One view for classes, work and everything else."
      >
        <Btn onClick={() => setAdding(true)}>
          <Icon name="plus" /> New event
        </Btn>
      </PageHead>
      <div className="cal-head">
        <b>June 16–20, 2025</b>
        <span className="calendar-views">
          {["Day", "Week", "Month", "Agenda"].map((item) => (
            <button
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </span>
      </div>
      {view === "Agenda" ? (
        <section className="panel agenda-list">
          <Heading label="AGENDA" title="Upcoming events" />
          {calendarEvents.map((event, index) => (
            <div key={`${event[1]}-${index}`}>
              <time>{event[0]}</time>
              <i className={event[3]} />
              <span>
                <b>{event[1]}</b>
                <small>{event[2]}</small>
              </span>
              <button
                onClick={() => {
                  setCalendarEvents(
                    calendarEvents.filter((_, item) => item !== index),
                  )
                  setNotice("Event removed")
                }}
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className={`calendar ${view.toLowerCase()}-view`}>
          <header>
            <small>GMT+3</small>
            {days.map((d) => (
              <b key={d}>{d}</b>
            ))}
          </header>
          <main>
            <aside>
              {[
                "08:00",
                "09:00",
                "10:00",
                "11:00",
                "12:00",
                "13:00",
                "14:00",
                "15:00",
                "16:00",
                "17:00",
              ].map((t) => (
                <small key={t}>{t}</small>
              ))}
            </aside>
            {days.map((d, day) => (
              <section key={d}>
                {calendarEvents
                  .filter((_, i) => (i + day) % 3 === 0)
                  .map((e, i) => (
                    <article
                      className={e[3]}
                      style={{ top: 60 + (i + (day % 2)) * 145 }}
                      key={e[1]}
                    >
                      <small>{e[0]}</small>
                      <b>{e[1]}</b>
                      <span>{e[2]}</span>
                    </article>
                  ))}
              </section>
            ))}
          </main>
        </section>
      )}
      {adding && (
        <Modal title="Create calendar event" close={() => setAdding(false)}>
          <form className="modal-form" onSubmit={addEvent}>
            <label>
              Event title
              <input required name="title" placeholder="What is happening?" />
            </label>
            <label>
              Time
              <input required name="time" type="time" defaultValue="09:00" />
            </label>
            <label>
              Location
              <input name="location" placeholder="Room or meeting link" />
            </label>
            <label>
              Color
              <select name="color">
                <option value="yellow">Class</option>
                <option value="blue">Work</option>
                <option value="olive">Personal</option>
                <option value="orange">Deadline</option>
              </select>
            </label>
            <Btn type="submit">Add to schedule</Btn>
          </form>
        </Modal>
      )}
      {notice && <Notice message={notice} close={() => setNotice("")} />}
    </main>
  )
}

function Goals() {
  const [add, setAdd] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [filter, setFilter] = useState("All goals"),
    [notice, setNotice] = useState(""),
    [goals, setGoals] = usePersistent<Goal[]>("ld-goals", [
      [
        "Emergency fund",
        "FINANCIAL",
        68,
        "KES 68,000 saved",
        "yellow",
        "2025-09-30",
      ],
      [
        "Complete Semester 2",
        "ACADEMIC",
        74,
        "12 of 16 milestones",
        "blue",
        "2025-07-18",
      ],
      [
        "Run 100 kilometres",
        "HEALTH",
        42,
        "42 km completed",
        "orange",
        "2025-08-31",
      ],
      [
        "Launch portfolio",
        "CAREER",
        88,
        "7 of 8 tasks",
        "purple",
        "2025-06-25",
      ],
    ])
  const visibleGoals =
    filter === "Achieved" ? goals.filter((goal) => goal[2] === 100) : goals
  const addGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const category = String(data.get("category")).toUpperCase()
    setGoals([
      ...goals,
      [
        String(data.get("title")),
        category,
        0,
        "0 of 5 milestones",
        category === "FINANCIAL" ? "yellow" : "blue",
        String(data.get("date")),
      ],
    ])
    setAdd(false)
    setNotice("Goal created and added to your weekly review")
  }
  return (
    <main className="content">
      <PageHead
        eyebrow="MAKE IT HAPPEN"
        title="Goals"
        desc="Turn your ambitions into steady progress."
      >
        <Btn onClick={() => setAdd(true)}>
          <Icon name="plus" /> Create goal
        </Btn>
      </PageHead>
      <section className="goal-hero">
        <i>
          <b>72%</b>
          <small>on track</small>
        </i>
        <span>
          <small>MONTHLY MOMENTUM</small>
          <h2>You're making great progress.</h2>
          <p>3 milestones completed this month. Keep the streak alive.</p>
        </span>
        <b>
          12<small>day streak</small>
        </b>
        <b>
          4<small>active goals</small>
        </b>
      </section>
      <div className="tabs interactive-tabs">
        {["All goals", "Short term", "Long term", "Achieved"].map((item) => (
          <button
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="goal-grid">
        {visibleGoals.map((g) => {
          const originalIndex = goals.indexOf(g)
          return (
            <article key={g[0]}>
              <header>
                <i className={g[4]}>
                  <Icon name="target" />
                </i>
                <small>{g[1]}</small>
                <Icon name="more" />
              </header>
              <h3>{g[0]}</h3>
              <p>Target · {new Date(g[5]).toLocaleDateString()}</p>
              <span>
                {g[3]} <b>{g[2]}%</b>
              </span>
              <Progress value={g[2] as number} />
              <div>
                {[1, 2, 3, 4, 5].map((x) => (
                  <i
                    className={
                      x <= Math.round(g[2] as number / 20) ? "done" : ""
                    }
                    key={x}
                  >
                    {x <= Math.round(g[2] as number / 20) && (
                      <Icon name="check" size={10} />
                    )}
                  </i>
                ))}
              </div>
              <button onClick={() => setSelected(originalIndex)}>
                View goal →
              </button>
            </article>
          )
        })}
      </div>
      {add && (
        <Modal title="Create a new goal" close={() => setAdd(false)}>
          <form className="modal-form" onSubmit={addGoal}>
            <label>
              Goal title
              <input
                required
                name="title"
                placeholder="What do you want to achieve?"
              />
            </label>
            <label>
              Category
              <select name="category">
                <option>Financial</option>
                <option>Academic</option>
                <option>Career</option>
              </select>
            </label>
            <label>
              Target date
              <input required name="date" type="date" />
            </label>
            <Btn type="submit">Create goal</Btn>
          </form>
        </Modal>
      )}
      {selected !== null && (
        <Modal title={goals[selected][0]} close={() => setSelected(null)}>
          <div className="goal-detail">
            <span>
              {goals[selected][1]} · Target{" "}
              {new Date(goals[selected][5]).toLocaleDateString()}
            </span>
            <strong>{goals[selected][2]}% complete</strong>
            <Progress value={goals[selected][2]} />
            <p>
              {goals[selected][3]}. Update progress whenever you complete a
              milestone.
            </p>
            <Btn
              onClick={() => {
                const next = [...goals]
                next[selected] = ([
                  ...next[selected].slice(0, 2),
                  Math.min(100, next[selected][2] + 20),
                  next[selected][3],
                  next[selected][4],
                  next[selected][5],
                ] as Goal)
                setGoals(next)
                setSelected(null)
                setNotice(
                  next[selected][2] === 100
                    ? "Goal achieved — excellent work!"
                    : "Milestone completed",
                )
              }}
            >
              Complete next milestone
            </Btn>
          </div>
        </Modal>
      )}
      {notice && <Notice message={notice} close={() => setNotice("")} />}
    </main>
  )
}
function Modal({
  title,
  close,
  children,
}: {
  title: string
  close: () => void
  children: ReactNode
}) {
  return (
    <div className="backdrop">
      <section className="modal">
        <header>
          <div>
            <small>LIFEDESK</small>
            <h2>{title}</h2>
          </div>
          <button onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
function Receipt({ close }: { close: () => void }) {
  return (
    <div className="backdrop receipt">
      <button onClick={close}>
        <Icon name="close" />
      </button>
      <div className="printer">
        <div className="slot" />
        <article>
          <b>LIFEDESK.</b>
          <p>PAYMENT RECEIPT</p>
          <hr />
          <span>
            Receipt <b>#LD-250619-0482</b>
          </span>
          <span>
            Date <b>19 Jun 2025</b>
          </span>
          <span>
            Account <b>Savings</b>
          </span>
          <hr />
          <h3>TOTAL　 KES 48,000</h3>
          <strong>▦</strong>
          <small>Verified by LifeDesk</small>
        </article>
      </div>
      <div className="receipt-actions">
        <Btn
          kind="secondary"
          onClick={() =>
            downloadText(
              "lifedesk-receipt.txt",
              "LIFEDESK\nPAYMENT RECEIPT\n#LD-250619-0482\n19 Jun 2025\nSavings\nTOTAL KES 48,000\nVerified by LifeDesk",
              "text/plain",
            )
          }
        >
          <Icon name="file" /> Download
        </Btn>
        <Btn kind="secondary" onClick={() => window.print()}>
          <Icon name="print" /> Print
        </Btn>
      </div>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState(
      () => localStorage.getItem("ld-auth") === "1",
    ),
    [page, setPage] = useState<Page>("home"),
    [light, setLight] = useState(
      () => localStorage.getItem("ld-theme") === "light",
    )
  useEffect(() => {
    document.documentElement.classList.toggle("light", light)
    localStorage.setItem("ld-theme", light ? "light" : "dark")
  }, [light])
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js")
  }, [])
  if (!auth)
    return (
      <AuthScreen
        enter={() => {
          localStorage.setItem("ld-auth", "1")
          setAuth(true)
        }}
      />
    )
  const screens = {
    home: <Home go={setPage} />,
    finance: <Finance />,
    academics: <Academics />,
    schedule: <Schedule />,
    goals: <Goals />,
  }
  return (
    <Shell
      page={page}
      setPage={setPage}
      light={light}
      setLight={setLight}
      logout={() => {
        localStorage.removeItem("ld-auth")
        setAuth(false)
      }}
    >
      {screens[page]}
    </Shell>
  )
}
