import { useEffect, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ChevronDown,
  Headphones,
  Home,
  Layers,
  Library,
  Mic,
  MoreHorizontal,
  NotebookPen,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Volume2,
  X,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  GraduationCap,
  Play,
  RotateCcw,
  Menu,
  ExternalLink,
  Leaf,
  FolderOpen,
} from "lucide-react";
import { units, syllabus, resources, assessments } from "./content";
import {
  CardSchema,
  StateSchema,
  emptyState,
  type LearnerState,
  type Unit,
  type Rating,
} from "./schema";
import { exportCsv, parseCsv, freshReview, grade } from "./learning";
import {
  download,
  loadState,
  saveState,
  nextReview,
  native,
  openResource,
} from "./storage";
type Page =
  | "Today"
  | "Courses"
  | "Flashcards"
  | "Assignments"
  | "Practice studio"
  | "Portfolio"
  | "Resources"
  | "Settings"
  | "Lesson"
  | "Quiz";
const icons = {
  Today: Home,
  Courses: BookOpen,
  Flashcards: Layers,
  Assignments: NotebookPen,
  "Practice studio": Headphones,
  Portfolio: FolderOpen,
  Resources: Library,
  Settings,
};
const dayKey = (n: number) => new Date(n).toLocaleDateString("en-CA");
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={secondary ? "button secondary" : "button"}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>;
}
export default function App() {
  const [state, setState] = useState<LearnerState>(emptyState),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(true),
    [page, setPage] = useState<Page>("Today"),
    [unitId, setUnitId] = useState("c1-u01"),
    [course, setCourse] = useState(1),
    [query, setQuery] = useState(""),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const assessment = assessments.find((a) => a.id === assessmentId);
  const main = useRef<HTMLElement>(null);
  const saving = useRef(Promise.resolve());
  const saveGeneration = useRef(0);
  useEffect(() => {
    loadState()
      .then((s) => {
        setState(s);
        setReady(true);
      })
      .catch((e) =>
        setError(
          "Your saved data could not be opened. It has not been overwritten. " +
            String(e),
        ),
      );
  }, []);
  useEffect(() => {
    if (!ready) return;
    const generation = ++saveGeneration.current;
    setSaved(false);
    saving.current = saving.current
      .catch(() => {})
      .then(() => saveState(state))
      .then(() => {
        if (generation === saveGeneration.current) setSaved(true);
      })
      .catch((e) => {
        setError(
          "Changes could not be saved. Export a backup before closing. " +
            String(e),
        );
      });
  }, [state, ready]);
  useEffect(() => {
    main.current?.focus();
    setMenu(false);
    window.scrollTo(0, 0);
  }, [page, unitId]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * state.textScale}px`;
  }, [state.textScale]);
  const update = (f: (s: LearnerState) => LearnerState) => setState(f);
  const unit = units.find((u) => u.id === unitId)!;
  const next = units.find((u) => !state.completed.includes(u.id)) ?? units[0];
  const allCards = [...units.flatMap((u) => u.cards), ...state.customCards];
  const due = allCards.filter(
    (c) => (state.reviews[c.id]?.due ?? 0) <= Date.now(),
  );
  const todayReviews = state.history.filter(
    (h) => dayKey(h.at) === dayKey(Date.now()),
  ).length;
  const go = (p: Page) => {
    setPage(p);
    setQuery("");
    if (p !== "Quiz") setAssessmentId("");
  };
  const lesson = (u: Unit) => {
    setUnitId(u.id);
    go("Lesson");
  };
  const notifyError = (e: unknown) => setError(String(e));
  if (!ready)
    return (
      <div className="loading">
        <Leaf size={36} />
        <h1>Spanish321</h1>
        <p>{error || "Opening your learning space…"}</p>
      </div>
    );
  return (
    <div className="app">
      <a href="#main" className="skip">
        Skip to content
      </a>
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Today");
          }}
        >
          <span className="brand-mark">
            s<span>3</span>
          </span>
          <span>
            spanish<span className="brand-number">321</span>
            <small>A little every day.</small>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">ES</span>
          <div>
            Your learning space<small>Spanish · Independent study</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">LEARN</div>
        <nav>
          {(
            [
              "Today",
              "Courses",
              "Flashcards",
              "Assignments",
              "Practice studio",
            ] as const
          ).map((p) => {
            const Icon = icons[p];
            return (
              <button
                key={p}
                className={
                  page === p ||
                  (p === "Courses" && ["Lesson", "Quiz"].includes(page))
                    ? "nav active"
                    : "nav"
                }
                onClick={() => go(p)}
              >
                <Icon size={19} />
                {p}
                {p === "Flashcards" && (
                  <span className="nav-count">
                    {Math.min(due.length, state.dailyLimit)}
                  </span>
                )}
              </button>
            );
          })}
          <div className="nav-label space-top">YOUR COLLECTION</div>
          {(["Portfolio", "Resources"] as const).map((p) => {
            const Icon = icons[p];
            return (
              <button
                key={p}
                className={"nav " + (page === p ? "active" : "")}
                onClick={() => go(p)}
              >
                <Icon size={19} />
                {p}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={18} />
            <div>
              Just you and your Spanish.
              <small>Your work stays on this device.</small>
            </div>
          </div>
          <button
            className={"nav " + (page === "Settings" ? "active" : "")}
            onClick={() => go("Settings")}
          >
            <Settings size={18} />
            Settings & backup
          </button>
          <div className="profile">
            <span>L</span>
            <div>
              Independent learner
              <small>
                {native
                  ? "Desktop · SQLite"
                  : "Browser preview · local storage"}
              </small>
            </div>
            <MoreHorizontal size={19} />
          </div>
        </div>
      </aside>
      <div className="content-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Your learning space <ChevronRight size={13} />{" "}
              <strong>
                {page === "Lesson" ? `Spanish I / Unit ${unit.number}` : page}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="save-state">
              <span />
              {saved ? "Saved on this device" : "Saving…"}
            </span>
            <button
              className="icon-button"
              aria-label="Search resources"
              onClick={() => go("Resources")}
            >
              <Search size={18} />
            </button>
            <span className="avatar">L</span>
          </div>
        </header>
        <main id="main" ref={main} tabIndex={-1}>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {page === "Today" && (
            <>
              <div className="greeting">
                <div>
                  <div className="eyebrow">
                    <Sun size={15} /> YOUR DAILY MOMENT OF SPANISH
                  </div>
                  <h1>A new day. A little more español.</h1>
                  <p>
                    Small steps, real conversations. Let’s pick up where you
                    left off.
                  </p>
                </div>
                <span className="date-label">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  })}
                </span>
              </div>
              <div className="dashboard-grid">
                <div>
                  <section className="hero">
                    <div className="hero-copy">
                      <div className="eyebrow light">YOUR NEXT CHAPTER</div>
                      <div className="course-kicker">
                        Spanish I <span>·</span> Unit{" "}
                        {String(next.number).padStart(2, "0")}
                      </div>
                      <h2>
                        {next.number === 1 ? (
                          <>
                            Every conversation
                            <br />
                            starts with <em>hola.</em>
                          </>
                        ) : (
                          next.title
                        )}
                      </h2>
                      <p>
                        {next.subtitle}
                        <br />A few useful words can open a whole new world.
                      </p>
                      <Button onClick={() => lesson(next)}>
                        Start learning <ArrowRight size={17} />
                      </Button>
                      <div className="hero-foot">
                        <Clock size={14} /> 5–8 hours at your pace{" "}
                        <span>•</span> Beginner
                      </div>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <span className="art-sun" />
                      <div className="arch">
                        <div className="arch-inner" />
                        <div className="stairs">
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                      <div className="plant">
                        <i />
                        <i />
                        <i />
                        <i />
                        <b />
                      </div>
                      <div className="speech">
                        ¡Hola!<span>Nice to meet your next chapter.</span>
                      </div>
                      <div className="art-dot" />
                    </div>
                  </section>
                  <div className="section-heading">
                    <h2>A good place to start</h2>
                    <span>Build your daily rhythm</span>
                  </div>
                  <div className="quick-grid">
                    <button
                      className="quick-card"
                      onClick={() => go("Flashcards")}
                    >
                      <span className="tile-icon lavender">
                        <Layers size={21} />
                      </span>
                      <span className="quick-top">
                        Make it stick <ArrowRight size={17} />
                      </span>
                      <h3>
                        {Math.min(
                          due.length,
                          Math.max(0, state.dailyLimit - todayReviews),
                        )}{" "}
                        cards ready
                      </h3>
                      <p>
                        A short review today.
                        <br />A stronger memory tomorrow.
                      </p>
                      <span className="text-link">Review flashcards</span>
                    </button>
                    <button
                      className="quick-card"
                      onClick={() => go("Practice studio")}
                    >
                      <span className="tile-icon peach">
                        <Mic size={21} />
                      </span>
                      <span className="quick-top">
                        Find your voice <ArrowRight size={17} />
                      </span>
                      <h3>Say it out loud</h3>
                      <p>
                        Try a conversation, record yourself,
                        <br />
                        and notice your progress.
                      </p>
                      <span className="text-link">Open practice studio</span>
                    </button>
                  </div>
                  <div className="section-heading">
                    <h2>Your learning path</h2>
                    <button className="text-link" onClick={() => go("Courses")}>
                      Explore courses <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="path-list">
                    {syllabus.slice(0, 3).map((c) => (
                      <button
                        className="path-row"
                        key={c.id}
                        onClick={() => {
                          setCourse(c.id);
                          go("Courses");
                        }}
                      >
                        <span className={"course-number n" + c.id}>
                          {String(c.id).padStart(2, "0")}
                        </span>
                        <div>
                          <strong>
                            {c.title}: {c.subtitle}
                          </strong>
                          <small>
                            {c.level} <span>·</span> 12 units{" "}
                            {c.id > 1 ? "· Curriculum planned" : ""}
                          </small>
                        </div>
                        <span className="path-status">
                          {c.id === 1 ? "In your library" : "Coming later"}
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                </div>
                <aside className="right-column">
                  <section className="daily-card">
                    <span className="eyebrow">YOUR PRACTICE, AT A GLANCE</span>
                    <div className="daily-number">
                      {todayReviews}
                      <span>cards reviewed today</span>
                    </div>
                    <div className="week-strip">
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - 6 + i);
                        const done = state.history.some(
                          (h) => dayKey(h.at) === dayKey(d.getTime()),
                        );
                        return (
                          <div key={i}>
                            <small>
                              {d.toLocaleDateString("en", {
                                weekday: "narrow",
                              })}
                            </small>
                            <span
                              className={
                                done
                                  ? "day done"
                                  : i === 6
                                    ? "day current"
                                    : "day"
                              }
                            >
                              {done ? <Check size={15} /> : d.getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p>
                      A rhythm, not a race.
                      <br />
                      Every return is a step forward.
                    </p>
                  </section>
                  <section className="agenda">
                    <div className="section-heading">
                      <h2>Up next</h2>
                      <NotebookPen size={17} />
                    </div>
                    {[
                      {
                        n: "01",
                        title: next.title,
                        sub: "READ & EXPLORE",
                        action: () => lesson(next),
                      },
                      {
                        n: "02",
                        title: "Put your new words to work",
                        sub: "PRACTICE & REMEMBER",
                        action: () => {
                          setUnitId(next.id);
                          go("Quiz");
                        },
                      },
                      {
                        n: "03",
                        title: "Make it your own",
                        sub: "WRITE & REFLECT",
                        action: () => {
                          setUnitId(next.id);
                          go("Assignments");
                        },
                      },
                    ].map((a) => (
                      <button
                        className="agenda-item"
                        key={a.n}
                        onClick={a.action}
                      >
                        <span>{a.n}</span>
                        <div>
                          <small>{a.sub}</small>
                          <strong>{a.title}</strong>
                          <em>No deadline. Your pace.</em>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </section>
                  <section className="word-card">
                    <span className="eyebrow">A WORD TO TAKE WITH YOU</span>
                    <h3>poco a poco</h3>
                    <span className="pronunciation">/ˈpo.ko a ˈpo.ko/</span>
                    <p>Little by little.</p>
                    <div className="word-rule" />
                    <p className="word-example" lang="es">
                      Poco a poco, aprendo español.
                    </p>
                    <small>Little by little, I’m learning Spanish.</small>
                  </section>
                </aside>
              </div>
              <div className="footer-note">
                <Leaf size={15} /> Made for curiosity, not competition.{" "}
                <span>
                  Spanish I learning preview · Educator review pending
                </span>
              </div>
            </>
          )}
          {page === "Courses" && (
            <>
              <PageTitle
                eyebrow="THE BIG PICTURE"
                title="Your path to Spanish."
                description="Five sequential courses. Room to explore, and a clear next step."
              />
              <div className="course-tabs">
                {syllabus.map((c) => (
                  <button
                    key={c.id}
                    className={course === c.id ? "selected" : ""}
                    onClick={() => setCourse(c.id)}
                  >
                    {c.id === 5
                      ? "Advanced"
                      : `Spanish ${["I", "II", "III", "IV"][c.id - 1]}`}
                  </button>
                ))}
              </div>
              <div className="course-banner">
                <div>
                  <Tag>{syllabus[course - 1].level}</Tag>
                  <h2>{syllabus[course - 1].subtitle}</h2>
                  <p>
                    12 units · Approximately 5–8 hours per unit · No fixed
                    completion deadline
                  </p>
                </div>
                <GraduationCap size={48} strokeWidth={1} />
              </div>
              {course > 1 && (
                <div className="notice">
                  This course is a syllabus, not a usable course yet. Full
                  lessons, assessments, and verified resources remain to be
                  authored. These are design targets, not certified proficiency
                  outcomes.
                </div>
              )}
              {course === 1 && (
                <div className="assessment-strip">
                  {assessments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setUnitId(a.unit);
                        setAssessmentId(a.id);
                        go("Quiz");
                      }}
                    >
                      <GraduationCap size={18} />
                      <span>
                        {a.title.replace("Spanish I · ", "")}
                        <small>
                          {a.questions.length} questions + performance task
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
              )}
              <div className="unit-grid">
                {syllabus[course - 1].units.map((u) => (
                  <button
                    key={u.id}
                    disabled={u.status === "planned"}
                    className="unit-card"
                    onClick={() => lesson(units.find((x) => x.id === u.id)!)}
                  >
                    <div className="unit-card-top">
                      <span>UNIT {String(u.number).padStart(2, "0")}</span>
                      {state.completed.includes(u.id) ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <BookOpen size={19} />
                      )}
                    </div>
                    <h3>{u.title}</h3>
                    <small>
                      {u.prerequisites.length
                        ? `Prerequisite: ${u.prerequisites[0]}`
                        : "No prior Spanish needed"}
                    </small>
                    <div className="unit-card-bottom">
                      {u.status === "planned"
                        ? "Planned"
                        : state.completed.includes(u.id)
                          ? "Lesson read"
                          : "Explore lesson"}
                      <ArrowRight size={16} />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "Lesson" && (
            <>
              <button className="back" onClick={() => go("Courses")}>
                <ArrowLeft size={16} /> Course map
              </button>
              <PageTitle
                eyebrow={`SPANISH I / UNIT ${String(unit.number).padStart(2, "0")}`}
                title={unit.title}
                description={unit.subtitle}
              />
              <div className="lesson-layout">
                <article className="lesson-body">
                  <div className="objectives">
                    <span className="eyebrow">BY THE END, YOU CAN…</span>
                    <ul>
                      {unit.objectives.map((o) => (
                        <li key={o}>
                          <Check size={16} />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {unit.prerequisites.some(
                    (p) => !state.completed.includes(p),
                  ) && (
                    <div className="notice">
                      Recommended first: {unit.prerequisites.join(", ")}. You
                      can explore ahead; check that you can use the earlier
                      material.
                    </div>
                  )}
                  <section id="warmup">
                    <h2>Before you begin</h2>
                    <p>{unit.warmup}</p>
                  </section>
                  {unit.lectures.map((l, i) => (
                    <section id={"lecture" + i} key={l.title}>
                      <span className="eyebrow">MINI-LECTURE {i + 1}</span>
                      <h2>{l.title}</h2>
                      <Markdown>{l.body}</Markdown>
                    </section>
                  ))}
                  <section id="reading">
                    <span className="eyebrow">READ IN CONTEXT</span>
                    <h2>A little Spanish, in the world.</h2>
                    <div className="reading" lang="es">
                      <Markdown>{unit.reading}</Markdown>
                    </div>
                    <Speech text={unit.reading} />
                  </section>
                  <section id="worked">
                    <h2>Work through it</h2>
                    <p>Try each item before opening the reasoning.</p>
                    {unit.worked.map((w, i) => (
                      <details className="worked" key={i}>
                        <summary>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          {w.prompt}
                        </summary>
                        <div>
                          <strong lang="es">{w.answer}</strong>
                          <p>{w.reason}</p>
                        </div>
                      </details>
                    ))}
                  </section>
                  <section id="resources">
                    <h2>Explore & listen</h2>
                    {resources
                      .filter((r) => unit.resources.includes(r.id))
                      .map((r) => (
                        <Resource
                          key={r.id}
                          resource={r}
                          onError={notifyError}
                        />
                      ))}
                  </section>
                  <section id="culture">
                    <h2>Language lives in context</h2>
                    <p>{unit.culture}</p>
                  </section>
                  <section>
                    <h2>Use it for something real</h2>
                    <p>{unit.task}</p>
                  </section>
                  <section id="reflection">
                    <h2>Pause & reflect</h2>
                    {unit.selfAssessment.map((s) => (
                      <label className="self-check" key={s}>
                        <input type="checkbox" />
                        {s}
                      </label>
                    ))}
                    <h3>If you need another pass</h3>
                    <p>{unit.remediation}</p>
                  </section>
                  <div className="actions">
                    <Button
                      secondary
                      onClick={() => {
                        update((s) => ({
                          ...s,
                          completed: s.completed.includes(unit.id)
                            ? s.completed
                            : [...s.completed, unit.id],
                        }));
                        setToast(
                          "Lesson marked as read. Skill evidence is tracked separately.",
                        );
                      }}
                    >
                      <Check size={17} />
                      {state.completed.includes(unit.id)
                        ? "Lesson read"
                        : "Mark lesson read"}
                    </Button>
                    <Button onClick={() => go("Quiz")}>
                      Practice this unit <ArrowRight size={16} />
                    </Button>
                  </div>
                </article>
                <aside className="lesson-toc">
                  <span className="eyebrow">IN THIS UNIT</span>
                  <a href="#warmup">Before you begin</a>
                  {unit.lectures.map((l, i) => (
                    <a href={"#lecture" + i} key={l.title}>
                      {l.title}
                    </a>
                  ))}
                  <a href="#reading">Read in context</a>
                  <a href="#worked">Worked examples</a>
                  <a href="#resources">Explore & listen</a>
                  <a href="#reflection">Reflect & review</a>
                  <hr />
                  <button onClick={() => go("Assignments")}>
                    <NotebookPen size={16} /> Open homework
                  </button>
                  <button
                    onClick={() => {
                      download(
                        `${unit.id}-flashcards.csv`,
                        exportCsv(unit.cards),
                        "text/csv;charset=utf-8",
                      );
                    }}
                  >
                    <Download size={16} /> Export flashcards
                  </button>
                  <button onClick={() => window.print()}>
                    <Download size={16} /> Print lesson guide
                  </button>
                  <div className="toc-note">
                    <ShieldCheck size={19} />
                    <p>
                      Original lessons work offline. External resources open in
                      your browser.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {page === "Flashcards" && (
            <Flashcards state={state} update={update} onError={notifyError} />
          )}
          {page === "Quiz" && (
            <>
              {assessment && (
                <div className="notice">
                  <h2>{assessment.title}</h2>
                  <p>{assessment.instructions}</p>
                  <strong>Performance task</strong>
                  <p>{assessment.task}</p>
                  <p>{assessment.rubric}</p>
                </div>
              )}
              <Quiz
                key={assessmentId || unit.id}
                unit={
                  assessment
                    ? {
                        ...unit,
                        id: assessment.id,
                        title: assessment.title,
                        quiz: assessment.questions.map((id) =>
                          units
                            .flatMap((u) => u.quiz)
                            .find((q) => q.id === id)!,
                        ),
                      }
                    : unit
                }
                update={update}
                onHomework={() => go("Assignments")}
              />
            </>
          )}
          {page === "Assignments" && (
            <>
              <PageTitle
                eyebrow="THINK IT THROUGH"
                title="Make the language yours."
                description="Write, reflect, and collect evidence of what you can do."
              />
              <UnitSelect unitId={unitId} onChange={setUnitId} />
              {unit.homework.map((h) => (
                <section className="homework-card" key={h.id}>
                  <Tag>{h.skill}</Tag>
                  <h2>
                    {h.skill === "Listening"
                      ? "Listen with intention"
                      : h.skill === "Speaking & interaction"
                        ? "A conversation worth having"
                        : h.skill === "Retrieval & reflection"
                          ? "Notice what stays"
                          : "Your practice workspace"}
                  </h2>
                  <p>{h.prompt}</p>
                  <label className="field-label" htmlFor={h.id}>
                    Your work & reflection
                  </label>
                  <textarea
                    id={h.id}
                    rows={7}
                    value={state.homework[h.id]?.text ?? ""}
                    placeholder="Start here. Your work saves automatically on this device."
                    onChange={(e) =>
                      update((s) => ({
                        ...s,
                        homework: {
                          ...s.homework,
                          [h.id]: {
                            text: e.target.value,
                            evaluation:
                              s.homework[h.id]?.evaluation ?? "unassessed",
                            updated: Date.now(),
                          },
                        },
                      }))
                    }
                  />
                  <div className="homework-bottom">
                    <label>
                      Evaluation{" "}
                      <select
                        value={state.homework[h.id]?.evaluation ?? "unassessed"}
                        onChange={(e) => {
                          const evaluation = e.target.value as "self";
                          update((s) => ({
                            ...s,
                            homework: {
                              ...s.homework,
                              [h.id]: {
                                text: s.homework[h.id]?.text ?? "",
                                evaluation,
                                updated: Date.now(),
                              },
                            },
                          }));
                        }}
                      >
                        <option value="unassessed">Not yet assessed</option>
                        <option value="self">Self-assessed</option>
                        <option value="peer">Peer-assessed</option>
                        <option value="instructor">Instructor-assessed</option>
                      </select>
                    </label>
                    <span>Local autosave</span>
                  </div>
                  <details>
                    <summary>Model & transparent rubric</summary>
                    <p>{h.model}</p>
                    <div className="notice">{h.rubric}</div>
                  </details>
                </section>
              ))}
            </>
          )}
          {page === "Practice studio" && (
            <Practice
              state={state}
              update={update}
              onError={notifyError}
              unit={unit}
            />
          )}
          {page === "Portfolio" && (
            <>
              <PageTitle
                eyebrow="EVIDENCE, NOT JUST NUMBERS"
                title="Look how far you’ve come."
                description="Your drafts, practice, and reflections tell different parts of the story."
              />
              <div className="stat-grid">
                <Stat
                  value={`${units.filter((u) => state.completed.includes(u.id)).length}/12`}
                  label="Lessons marked read"
                />
                <Stat
                  value={String(state.history.length)}
                  label="Flashcard reviews"
                />
                <Stat
                  value={String(
                    state.attempts.filter((a) => a.mode === "assessment")
                      .length,
                  )}
                  label="Assessment attempts"
                />
                <Stat
                  value={String(
                    Object.values(state.homework).filter((h) => h.text).length,
                  )}
                  label="Pieces of written work"
                />
              </div>
              <div className="notice">
                Completion and quiz accuracy do not establish a CEFR level.
                Speaking and writing require rubric-based human evaluation.
                Educator review of this curriculum is pending.
              </div>
              <div className="section-heading">
                <h2>Your work</h2>
                <button
                  className="text-link"
                  onClick={() =>
                    download(
                      "spanish321-portfolio.json",
                      JSON.stringify(
                        {
                          homework: state.homework,
                          attempts: state.attempts,
                          logs: state.logs,
                        },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  <Download size={16} /> Export portfolio
                </button>
              </div>
              {Object.entries(state.homework).filter(([, h]) => h.text)
                .length === 0 ? (
                <Empty
                  title="Your story starts with a first draft."
                  description="Complete a homework activity and it will live here, ready to revisit."
                  action={() => go("Assignments")}
                  label="Open your workspace"
                />
              ) : (
                Object.entries(state.homework)
                  .filter(([, h]) => h.text)
                  .map(([id, h]) => (
                    <details className="portfolio-entry" key={id}>
                      <summary>
                        {id}{" "}
                        <Tag>
                          {h.evaluation === "unassessed"
                            ? "Not assessed"
                            : `${h.evaluation}-assessed`}
                        </Tag>
                      </summary>
                      <p className="preserve">{h.text}</p>
                    </details>
                  ))
              )}
              <h2>Quiz history</h2>
              {state.attempts.length === 0 ? (
                <p className="muted">
                  No attempts yet. Practice and assessment results will appear
                  separately.
                </p>
              ) : (
                state.attempts
                  .slice()
                  .reverse()
                  .map((a, i) => (
                    <div className="result-row" key={i}>
                      <strong>{a.unit}</strong>
                      <Tag>{a.mode}</Tag>
                      <span>
                        {a.score}/{a.total} correct
                      </span>
                      <small>{new Date(a.at).toLocaleDateString()}</small>
                    </div>
                  ))
              )}
            </>
          )}
          {page === "Resources" && (
            <>
              <PageTitle
                eyebrow="A WORLD BEYOND THE LESSON"
                title="Good things to learn from."
                description="Creator-owned resources, clear assignments, and honest verification notes."
              />
              <div className="search-field">
                <Search size={20} />
                <input
                  aria-label="Search resources"
                  placeholder="Search by topic, creator, or level…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="notice">
                Internet required. Page retrieval is not video playback
                verification. Third-party work is linked, never bundled or
                rehosted.
              </div>
              <div className="resource-grid">
                {resources
                  .filter((r) =>
                    JSON.stringify(r)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((r) => (
                    <Resource key={r.id} resource={r} onError={notifyError} />
                  ))}
              </div>
              {!resources.some((r) =>
                JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
              ) && (
                <p>No matching resources. Try a broader topic or creator.</p>
              )}
            </>
          )}
          {page === "Settings" && (
            <>
              <PageTitle
                eyebrow="YOUR SPACE, YOUR WAY"
                title="Keep your learning close."
                description="No account. No subscription. No telemetry. Your work belongs with you."
              />
              <section className="settings-card">
                <h2>Study preferences</h2>
                <label className="setting-row">
                  <div>
                    <strong>Daily review limit</strong>
                    <p>A manageable ceiling, not a target you must hit.</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={state.dailyLimit}
                    onChange={(e) =>
                      update((s) => ({
                        ...s,
                        dailyLimit: Math.max(
                          1,
                          Math.min(200, Number(e.target.value) || 1),
                        ),
                      }))
                    }
                  />
                </label>
                <label className="setting-row">
                  <div>
                    <strong>Text size</strong>
                    <p>Keep long reading sessions comfortable.</p>
                  </div>
                  <select
                    value={state.textScale}
                    onChange={(e) =>
                      update((s) => ({
                        ...s,
                        textScale: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={1}>Default</option>
                    <option value={1.15}>Larger</option>
                    <option value={1.3}>Extra large</option>
                    <option value={1.5}>Largest</option>
                  </select>
                </label>
              </section>
              <section className="settings-card">
                <h2>Backup & portability</h2>
                <p>
                  A backup includes writing, review history, quiz attempts,
                  practice logs, and recordings. Keep a copy somewhere you
                  control.
                </p>
                <div className="actions">
                  <Button
                    onClick={() =>
                      download(
                        "spanish321-backup.json",
                        JSON.stringify(state, null, 2),
                      )
                    }
                  >
                    <Download size={17} /> Download backup
                  </Button>
                  <label className="button secondary">
                    <Upload size={17} /> Restore backup
                    <input
                      className="file-input"
                      type="file"
                      accept="application/json,.json"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          if (f.size > 100_000_000)
                            throw Error("Backup exceeds 100 MB.");
                          const s = StateSchema.parse(
                            JSON.parse(await f.text()),
                          );
                          if (
                            !confirm(
                              "Replace current learner data with this backup? Download a current backup first if you want to keep it.",
                            )
                          )
                            return;
                          await saving.current;
                          await saveState(s);
                          setState(s);
                          setToast("Backup restored.");
                        } catch (err) {
                          notifyError(err);
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
              </section>
              <section className="settings-card">
                <h2>Flashcard CSV</h2>
                <p>
                  Columns: id, unit, kind, front, back, example. UTF-8, quoted
                  CSV with recognition or production as the kind. Existing IDs
                  are protected against accidental replacement.
                </p>
                <div className="actions">
                  <Button
                    secondary
                    onClick={() =>
                      download(
                        "spanish321-flashcards.csv",
                        exportCsv(allCards),
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    <Download size={17} /> Export all cards
                  </Button>
                  <label className="button secondary">
                    <Upload size={17} /> Import CSV
                    <input
                      className="file-input"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={async (e) => {
                        try {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 5_000_000)
                            throw Error("CSV exceeds 5 MB.");
                          const cards = parseCsv(await f.text()).map((c) =>
                            CardSchema.parse(c),
                          );
                          const ids = new Set(allCards.map((c) => c.id));
                          for (const c of cards) {
                            if (ids.has(c.id))
                              throw Error(
                                `Duplicate card ID: ${c.id}. No cards imported.`,
                              );
                            ids.add(c.id);
                          }
                          update((s) => ({
                            ...s,
                            customCards: [...s.customCards, ...cards],
                          }));
                          setToast(`${cards.length} cards imported.`);
                        } catch (err) {
                          notifyError(err);
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
              </section>
              <section className="settings-card">
                <h2>About this learning preview</h2>
                <p>
                  Version 0.1.0 · Spanish I contains 12 authored drafts. Courses
                  II–V are planned. Spanish I includes cumulative question sets
                  and capstone rubrics. Educator review and tested desktop
                  installation remain release gates.
                </p>
                <p>
                  {native
                    ? "Learner data is stored in SQLite in the application-data directory."
                    : "This browser preview stores learner data in IndexedDB. Clearing site data removes it. Export backups regularly. It is not the tested desktop release."}
                </p>
                <p>
                  External media requires internet. Original lessons, exercises,
                  and review logic are bundled. Device speech is synthetic and
                  only available when an installed Spanish voice exists.
                </p>
              </section>
            </>
          )}
        </main>
        <footer className="app-footer">
          Spanish321 <span>Learn at your pace. Keep what you learn.</span>
          <span>Local-first · Spanish I preview</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function UnitSelect({
  unitId,
  onChange,
}: {
  unitId: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="unit-select">
      Study unit{" "}
      <select value={unitId} onChange={(e) => onChange(e.target.value)}>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.number}. {u.title}
          </option>
        ))}
      </select>
    </label>
  );
}
function Empty({
  title,
  description,
  action,
  label,
}: {
  title: string;
  description: string;
  action: () => void;
  label: string;
}) {
  return (
    <div className="empty">
      <BookOpen size={32} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Button onClick={action}>
        {label}
        <ArrowRight size={16} />
      </Button>
    </div>
  );
}
function Resource({
  resource: r,
  onError,
}: {
  resource: (typeof resources)[number];
  onError: (e: unknown) => void;
}) {
  return (
    <div className="resource-card">
      <div className="resource-top">
        <Tag>
          {r.type} · {r.level}
        </Tag>
        <ExternalLink size={16} />
      </div>
      <h3>{r.title}</h3>
      <span className="muted">{r.creator}</span>
      <p>{r.instructions}</p>
      <button
        className="text-link"
        onClick={() => openResource(r.url).catch(onError)}
      >
        Open in browser <ArrowRight size={15} />
      </button>
      <details>
        <summary>Access & verification</summary>
        <p>{r.access}</p>
        <p>
          {r.verification} · {r.checkedAt.slice(0, 10)}
          <br />
          {r.method}
        </p>
        <p>
          Playback: {r.playback}. Captions/transcripts: {r.captions}.
        </p>
        <strong>Offline alternative</strong>
        <p>{r.offline}</p>
      </details>
    </div>
  );
}
function Speech({ text }: { text: string }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () =>
      setVoices(
        speechSynthesis
          .getVoices()
          .filter((v) => v.lang.startsWith("es") && v.localService),
      );
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      speechSynthesis.cancel();
    };
  }, []);
  return (
    <div className="speech-control">
      <button
        className="button secondary"
        disabled={!voices.length}
        onClick={() => {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""));
          u.voice = voices[0];
          u.lang = voices[0].lang;
          u.rate = 0.85;
          u.onerror = () =>
            setMessage(
              "The local voice could not play. Use a willing reader or reading preparation.",
            );
          speechSynthesis.speak(u);
        }}
      >
        <Volume2 size={16} />
        Listen · synthetic voice
      </button>
      {voices.length > 0 && (
        <button className="text-link" onClick={() => speechSynthesis.cancel()}>
          Stop
        </button>
      )}
      <small>
        {message ||
          (!voices.length
            ? "No offline Spanish voice detected. Install one in your device settings or use a willing reader."
            : "Device-generated speech, not a native-speaker recording.")}
      </small>
    </div>
  );
}
function Flashcards({
  state,
  update,
  onError,
}: {
  state: LearnerState;
  update: (f: (s: LearnerState) => LearnerState) => void;
  onError: (e: unknown) => void;
}) {
  const [filter, setFilter] = useState("all"),
    [difficult, setDifficult] = useState(false),
    [revealed, setRevealed] = useState(false),
    [busy, setBusy] = useState(false);
  const reviewed = state.history.filter(
    (h) => dayKey(h.at) === dayKey(Date.now()),
  ).length;
  const cards = [...units.flatMap((u) => u.cards), ...state.customCards].filter(
    (c) =>
      (filter === "all" || c.unit === filter) &&
      (!difficult || (state.reviews[c.id]?.lapses ?? 0) > 0) &&
      (state.reviews[c.id]?.due ?? 0) <= Date.now(),
  );
  const card = cards[0];
  async function rate(rating: Rating) {
    if (!card || busy) return;
    setBusy(true);
    try {
      const now = Date.now();
      const review = await nextReview(
        state.reviews[card.id] ?? freshReview(),
        rating,
        now,
      );
      update((s) => ({
        ...s,
        reviews: { ...s.reviews, [card.id]: review },
        history: [...s.history, { id: card.id, at: now, rating }],
      }));
      setRevealed(false);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE RETRIEVAL GOES A LONG WAY"
        title="Make room for remembering."
        description="Try to recall before you reveal. Be honest; the schedule adapts to your answer."
      />
      <div className="filter-bar">
        <label>
          Unit{" "}
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setRevealed(false);
            }}
          >
            <option value="all">All authored units</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.number} · {u.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={difficult}
            onChange={(e) => {
              setDifficult(e.target.checked);
              setRevealed(false);
            }}
          />{" "}
          Difficult cards only
        </label>
        <Tag>
          {reviewed}/{state.dailyLimit} today
        </Tag>
      </div>
      {!card || reviewed >= state.dailyLimit ? (
        <Empty
          title={
            reviewed >= state.dailyLimit
              ? "A good moment to pause."
              : "You’re up to date."
          }
          description={
            reviewed >= state.dailyLimit
              ? "Daily review limit reached. Return tomorrow, or adjust your limit in Settings."
              : "No cards are due for these filters. Again cards return after ten minutes."
          }
          action={() => {
            setFilter("all");
            setDifficult(false);
          }}
          label="Show all units"
        />
      ) : (
        <div className="review-area">
          <div className="review-meta">
            <span>
              {card.unit} · {card.kind}
            </span>
            <span>{cards.length} available</span>
          </div>
          <div className="flashcard">
            <span className="eyebrow">
              {card.kind === "production"
                ? "SAY IT IN SPANISH"
                : "WHAT DOES THIS MEAN?"}
            </span>
            <h2>{card.front}</h2>
            {revealed ? (
              <div className="card-answer">
                <div className="word-rule" />
                <h3>{card.back}</h3>
                <p lang="es">{card.example}</p>
                <Speech text={card.example} />
              </div>
            ) : (
              <button
                className="button secondary"
                onClick={() => setRevealed(true)}
              >
                Reveal answer <RotateCcw size={16} />
              </button>
            )}
          </div>
          {revealed ? (
            <div className="ratings">
              {(["again", "hard", "good", "easy"] as const).map((r) => (
                <button disabled={busy} key={r} onClick={() => rate(r)}>
                  <strong>{r[0].toUpperCase() + r.slice(1)}</strong>
                  <small>
                    {r === "again"
                      ? "Try again in 10 min"
                      : r === "hard"
                        ? "Recalled with effort"
                        : r === "good"
                          ? "Recalled correctly"
                          : "Recalled immediately"}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="review-hint">
              Take your time. Say it aloud or write it down before checking.
            </p>
          )}
        </div>
      )}
    </>
  );
}
function Quiz({
  unit,
  update,
  onHomework,
}: {
  unit: Unit;
  update: (f: (s: LearnerState) => LearnerState) => void;
  onHomework: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({}),
    [submitted, setSubmitted] = useState(false),
    [mode, setMode] = useState<"practice" | "assessment">("practice");
  const score = unit.quiz.filter((q) => grade(q, answers[q.id] ?? "")).length;
  return (
    <>
      <PageTitle
        eyebrow={`${unit.id.includes("-u") ? "UNIT " + unit.number : unit.title} / CHECK YOUR UNDERSTANDING`}
        title={
          submitted
            ? "A clearer picture of your learning."
            : "Put your new words to work."
        }
        description={
          submitted
            ? "Read the reasoning, then return to the concepts that need another pass."
            : "Accents matter. Harmless punctuation and spacing are normalized."
        }
      />
      {!submitted ? (
        <div className="filter-bar">
          <label>
            Attempt type{" "}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="practice">Practice · use your notes</option>
              <option value="assessment">
                Assessment · independent attempt
              </option>
            </select>
          </label>
          <span>
            {Object.values(answers).filter(Boolean).length}/{unit.quiz.length}{" "}
            answered
          </span>
        </div>
      ) : (
        <div className="quiz-summary">
          <strong>
            {score}
            <small> / {unit.quiz.length}</small>
          </strong>
          <div>
            <h2>
              {mode === "practice" ? "Practice result" : "Assessment result"}
            </h2>
            <p>
              Controlled questions only. This is not a proficiency
              certification.
            </p>
            <p>
              Review:{" "}
              {[
                ...new Set(
                  unit.quiz
                    .filter((q) => !grade(q, answers[q.id] ?? ""))
                    .map((q) => q.concept),
                ),
              ].join(" · ") ||
                "All answers accepted. Try the communication task next."}
            </p>
          </div>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (submitted) return;
          update((s) => ({
            ...s,
            attempts: [
              ...s.attempts,
              {
                unit: unit.id,
                mode,
                at: Date.now(),
                answers,
                score,
                total: unit.quiz.length,
              },
            ],
          }));
          setSubmitted(true);
          window.scrollTo(0, 0);
        }}
      >
        {unit.quiz.map((q, i) => (
          <fieldset
            key={q.id}
            className={
              "question " +
              (submitted
                ? grade(q, answers[q.id] ?? "")
                  ? "correct"
                  : "incorrect"
                : "")
            }
          >
            <legend>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {q.prompt}
            </legend>
            {q.options ? (
              <div className="options">
                {q.options.map((o) => (
                  <label key={o}>
                    <input
                      type="radio"
                      name={q.id}
                      value={o}
                      checked={answers[q.id] === o}
                      disabled={submitted}
                      onChange={() => setAnswers({ ...answers, [q.id]: o })}
                    />
                    {o}
                  </label>
                ))}
              </div>
            ) : (
              <input
                aria-label={`Answer ${i + 1}`}
                type="text"
                value={answers[q.id] ?? ""}
                disabled={submitted}
                onChange={(e) =>
                  setAnswers({ ...answers, [q.id]: e.target.value })
                }
                autoComplete="off"
              />
            )}
            {submitted && (
              <div className="feedback">
                <strong>
                  {grade(q, answers[q.id] ?? "")
                    ? "Correct"
                    : "Revisit this one"}{" "}
                  · {q.answers.join(" / ")}
                </strong>
                <p>{q.explanation}</p>
              </div>
            )}
          </fieldset>
        ))}
        {!submitted ? (
          <button className="button" type="submit">
            Check my answers <ArrowRight size={17} />
          </button>
        ) : (
          <div className="actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
                setMode("practice");
              }}
            >
              Try a new practice attempt
            </button>
            <button type="button" className="button" onClick={onHomework}>
              Apply it in your homework <ArrowRight size={16} />
            </button>
          </div>
        )}
      </form>
    </>
  );
}
function Practice({
  state,
  update,
  onError,
  unit,
}: {
  state: LearnerState;
  update: (f: (s: LearnerState) => LearnerState) => void;
  onError: (e: unknown) => void;
  unit: Unit;
}) {
  const [recording, setRecording] = useState(false),
    [requesting, setRequesting] = useState(false),
    [text, setText] = useState(""),
    [kind, setKind] = useState<"listening" | "speaking" | "interaction">(
      "speaking",
    ),
    [minutes, setMinutes] = useState(10);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      clearTimeout(timer.current);
    },
    [],
  );
  async function start() {
    setRequesting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw Error(
          "Recording is unavailable in this runtime. Use a device recorder and keep a written practice log.",
        );
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const r = new MediaRecorder(s);
      recorder.current = r;
      const chunks: BlobPart[] = [];
      let size = 0;
      r.ondataavailable = (e) => {
        size += e.data.size;
        chunks.push(e.data);
        if (size > 8_000_000 && r.state === "recording") r.stop();
      };
      r.onerror = () => {
        onError("Recording failed. Try again or use your device recorder.");
        s.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      r.onstop = () => {
        clearTimeout(timer.current);
        s.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const file = new FileReader();
        file.onload = () => {
          const data = String(file.result);
          if (data.length > 15_000_000) {
            onError("Recording is too large; record a shorter take.");
            return;
          }
          update((st) => ({
            ...st,
            recordings: [
              ...st.recordings,
              {
                id: crypto.randomUUID(),
                name: `${unit.id} · Practice ${st.recordings.length + 1}`,
                at: Date.now(),
                data,
              },
            ],
          }));
        };
        file.readAsDataURL(
          new Blob(chunks, { type: r.mimeType || "audio/webm" }),
        );
      };
      r.start(1000);
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 180000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      onError(e);
    } finally {
      setRequesting(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="LET YOUR VOICE FIND ITS FEET"
        title="A space to practice, freely."
        description="Listen closely. Speak imperfectly. Reflect on something specific."
      />
      <div className="practice-grid">
        <section className="settings-card">
          <span className="tile-icon peach">
            <Mic size={24} />
          </span>
          <h2>One small conversation</h2>
          <p>{unit.task}</p>
          <div className="record-control">
            <Button
              disabled={requesting}
              onClick={() => (recording ? recorder.current?.stop() : start())}
            >
              <Mic size={17} />
              {requesting
                ? "Requesting permission…"
                : recording
                  ? "Stop & save recording"
                  : "Start a recording"}
            </Button>
            {recording && (
              <span className="recording-dot">Recording · 3 min maximum</span>
            )}
          </div>
          <p className="muted">
            Microphone permission is requested only when you start. Audio stays
            on this device. No automatic pronunciation or fluency grading.
          </p>
        </section>
        <section className="settings-card">
          <h2>Leave yourself a useful note</h2>
          <label className="field-label">
            Practice type
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              <option value="speaking">Speaking / solo rehearsal</option>
              <option value="listening">Listening</option>
              <option value="interaction">Live interaction</option>
            </select>
          </label>
          <label className="field-label">
            Minutes
            <input
              type="number"
              min={0}
              max={600}
              value={minutes}
              onChange={(e) =>
                setMinutes(Math.max(0, Math.min(600, Number(e.target.value))))
              }
            />
          </label>
          <label className="field-label">
            What did you notice?
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Source or task, one thing understood, one uncertainty, and your next step."
            />
          </label>
          <Button
            disabled={!text.trim()}
            onClick={() => {
              update((s) => ({
                ...s,
                logs: [
                  ...s.logs,
                  {
                    id: crypto.randomUUID(),
                    text,
                    kind,
                    minutes,
                    at: Date.now(),
                  },
                ],
              }));
              setText("");
            }}
          >
            Save practice note <Check size={16} />
          </Button>
        </section>
      </div>
      <h2>Your recordings</h2>
      {state.recordings.length === 0 && (
        <p className="muted">
          Your first recording will appear here. No one else receives it.
        </p>
      )}
      {state.recordings.map((r) => (
        <div className="recording-row" key={r.id}>
          <div>
            <strong>{r.name}</strong>
            <small>{new Date(r.at).toLocaleString()}</small>
          </div>
          <audio controls src={r.data} />
          <a
            className="icon-button"
            href={r.data}
            download={`${r.id}.${r.data.includes("audio/mp4") ? "m4a" : r.data.includes("audio/ogg") ? "ogg" : "webm"}`}
            aria-label={`Export ${r.name}`}
          >
            <Download size={18} />
          </a>
          <button
            className="icon-button"
            aria-label={`Delete ${r.name}`}
            onClick={() => {
              if (confirm("Delete this local recording?"))
                update((s) => ({
                  ...s,
                  recordings: s.recordings.filter((x) => x.id !== r.id),
                }));
            }}
          >
            <X size={17} />
          </button>
        </div>
      ))}
      <h2>Practice log</h2>
      {state.logs
        .slice()
        .reverse()
        .map((l) => (
          <div className="log-entry" key={l.id}>
            <Tag>
              {l.kind} · {l.minutes} minutes
            </Tag>
            <p className="preserve">{l.text}</p>
            <small>{new Date(l.at).toLocaleDateString()}</small>
          </div>
        ))}
    </>
  );
}
