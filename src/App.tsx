"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getModuleConfig,
  initialModuleAnswers,
  type ModuleAnswers,
  type ModuleValue,
  type QuestionDef,
} from "./regulations";

function Image({ src, alt, priority: _priority, ...props }: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const resolvedSrc = src.startsWith("/") ? `${import.meta.env.BASE_URL}${src.slice(1)}` : src;
  return <img src={resolvedSrc} alt={alt} {...props} />;
}

type Tone = "success" | "warning" | "danger" | "neutral";

type ReportEntry = {
  chapter: string;
  articles: string;
  label: string;
  text: string;
  tone: "success" | "warning" | "danger";
};

type ProjectState = {
  projectName: string;
  architect: string;
  collective: "Oui" | "Non";
  banded: "Oui" | "Non";
  floors: number;
  height: number;
  stairDistance: number;
  ladderAccess: "Oui" | "Non";
};

type Chapter = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  articles: string;
};

const chapters: Chapter[] = [
  { id: "classification", number: "01", title: "Classement", subtitle: "Famille du bâtiment", articles: "Préambule" },
  { id: "structure", number: "02", title: "Structure", subtitle: "Éléments & planchers", articles: "Art. 5–6" },
  { id: "walls", number: "03", title: "Parois", subtitle: "Recoupement & séparation", articles: "Art. 7–9" },
  { id: "cellars", number: "04", title: "Celliers & caves", subtitle: "Locaux indépendants", articles: "Art. 10" },
  { id: "facades", number: "05", title: "Façades", subtitle: "Propagation du feu", articles: "Art. 11–14" },
  { id: "roofs", number: "06", title: "Couvertures", subtitle: "Revêtements & distances", articles: "Art. 15" },
  { id: "insulation", number: "07", title: "Isolation", subtitle: "Matériaux & écrans", articles: "Art. 16" },
  { id: "stairs-facade", number: "08", title: "Escaliers façade", subtitle: "Parois des cages", articles: "Art. 18" },
  { id: "stairs-inside", number: "09", title: "Escaliers intérieurs", subtitle: "Parois & blocs-portes", articles: "Art. 19–20" },
  { id: "stairs-finishes", number: "10", title: "Réaction au feu", subtitle: "Escaliers & revêtements", articles: "Art. 22–24" },
  { id: "stairs-protected", number: "11", title: "Escaliers protégés", subtitle: "Désenfumage & accès", articles: "Art. 25–29 bis" },
];

const initialProject: ProjectState = {
  projectName: "Résidence Les Jardins — Lyon 7e",
  architect: "Atelier Horizon",
  collective: "Oui",
  banded: "Non",
  floors: 3,
  height: 9,
  stairDistance: 10,
  ladderAccess: "Oui",
};

function classify(project: ProjectState): { family: string; familyKey: "1" | "2" | "3A" | "3B" | "4" | "IGH" | "NC"; detail: string; tone: Tone } {
  if (project.height > 50) {
    return { family: "IGH — hors périmètre", familyKey: "IGH", detail: "La hauteur dépasse 50 m : réglementation spécifique IGH.", tone: "danger" };
  }
  if (project.height > 28) {
    return { family: "4e famille", familyKey: "4", detail: "Habitation collective dont le plancher bas le plus haut est situé entre 28 m et 50 m.", tone: "warning" };
  }
  if (project.collective === "Non") {
    if (project.floors <= 1) {
      return {
        family: "1re famille", familyKey: "1",
        detail: project.banded === "Oui" ? "Maison individuelle R+1 en bande." : "Maison individuelle isolée ou jumelée, RDC ou R+1.",
        tone: "success",
      };
    }
    return {
      family: "2e famille", familyKey: "2",
      detail: project.banded === "Oui" ? "Maison individuelle en bande, R+2 ou plus." : "Maison individuelle isolée ou jumelée, R+2 ou plus.",
      tone: "success",
    };
  }
  if (project.floors <= 3) {
    return { family: "2e famille", familyKey: "2", detail: project.floors === 3 && project.height > 8 ? "Habitation collective R+3, plancher bas supérieur à 8 m." : "Habitation collective jusqu’à R+3.", tone: "success" };
  }
  if (project.stairDistance > 15) {
    return { family: "Non conforme", familyKey: "NC", detail: `La distance porte palière / escalier (${project.stairDistance} m) dépasse 15 m.`, tone: "danger" };
  }
  if (project.floors <= 7 && project.stairDistance <= 10 && project.ladderAccess === "Oui") {
    return { family: "3e famille A", familyKey: "3A", detail: "Toutes les conditions de classement en 3e famille A sont remplies.", tone: "success" };
  }
  const reasons = [
    project.floors > 7 ? "bâtiment au-delà de R+7" : "",
    project.stairDistance > 10 ? "distance à l’escalier supérieure à 10 m" : "",
    project.ladderAccess === "Non" ? "voie échelle non accessible" : "",
  ].filter(Boolean);
  return { family: "3e famille B", familyKey: "3B", detail: `Condition(s) de la 3e famille A non remplie(s) : ${reasons.join(", ")}.`, tone: "warning" };
}

function Icon({ name }: { name: "home" | "report" | "save" | "arrow" | "check" | "alert" | "menu" | "close" }) {
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5M9 21v-7h6v7" /></>,
    report: <><path d="M6 2h9l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></>,
    save: <><path d="M5 3h12l2 2v16H5z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 2.7 20h18.6z" /><path d="M12 9v4M12 17h.01" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };
  return <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Choice({ value, selected, onSelect }: { value: string; selected: boolean; onSelect: () => void }) {
  return <button className={`choice ${selected ? "selected" : ""}`} onClick={onSelect} type="button"><span className="choice-dot" />{value}</button>;
}

function ModuleInput({ question, value, onChange }: { question: QuestionDef; value: ModuleValue; onChange: (value: ModuleValue) => void }) {
  if (question.type === "yesno") {
    return <div className="choices"><Choice value="Oui" selected={value === "Oui"} onSelect={() => onChange("Oui")} /><Choice value="Non" selected={value === "Non"} onSelect={() => onChange("Non")} /></div>;
  }
  if (question.type === "select") {
    return <label className="select-field"><select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>{question.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  }
  return <label className="number-field"><input type="number" min="0" step="0.5" value={Number(value ?? 0)} onChange={(event) => onChange(Number(event.target.value))} /><span>{question.unit}</span></label>;
}

function ReportSection({ title, subtitle, tone, entries }: { title: string; subtitle: string; tone: "success" | "warning" | "danger"; entries: ReportEntry[] }) {
  return <section className={`report-section ${tone}`}>
    <header><div><span>{subtitle}</span><h2>{title}</h2></div><strong>{entries.length}</strong></header>
    {entries.length ? <div className="report-entry-list">{entries.map((entry, index) => <article key={`${tone}-${entry.chapter}-${entry.label}-${index}`}>
      <span className="report-entry-icon"><Icon name={tone === "success" ? "check" : "alert"} /></span>
      <div><small>{entry.chapter} · {entry.articles}</small><h3>{entry.label}</h3><p>{entry.text}</p></div>
    </article>)}</div> : <p className="report-section-empty">Aucun point dans cette catégorie.</p>}
  </section>;
}

export default function Home() {
  const [project, setProject] = useState<ProjectState>(initialProject);
  const [answers, setAnswers] = useState<ModuleAnswers>(initialModuleAnswers);
  const [active, setActive] = useState("classification");
  const [saved, setSaved] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const result = useMemo(() => classify(project), [project]);

  const compliance = useMemo(() => {
    const context = {
      family: result.familyKey,
      familyLabel: result.family,
      collective: project.collective === "Oui",
      height: project.height,
    };
    const entries: ReportEntry[] = [];
    const counts: Record<string, number> = {};

    if (result.familyKey === "NC") {
      entries.push({ chapter: "Classement", articles: "Préambule", label: "Classement du bâtiment", text: result.detail, tone: "danger" });
      counts.classification = 1;
    } else if (result.familyKey === "IGH") {
      entries.push({ chapter: "Classement", articles: "Préambule", label: "Réglementation applicable", text: result.detail, tone: "warning" });
    } else {
      entries.push({ chapter: "Classement", articles: "Préambule", label: "Classement du bâtiment", text: `${result.family}. ${result.detail}`, tone: "success" });
    }

    chapters.slice(1).forEach((chapter) => {
      const config = getModuleConfig(chapter.id, context, answers);
      const moduleIssues = config?.results.filter((item) => item.tone === "danger") ?? [];
      counts[chapter.id] = moduleIssues.length;
      config?.results.forEach((item) => {
        if (item.tone === "neutral") return;
        entries.push({ chapter: chapter.title, articles: chapter.articles, label: item.label, text: item.text, tone: item.tone });
      });
      const resultTexts = new Set(config?.results.map((item) => item.text) ?? []);
      config?.reminder.forEach((text) => {
        if (!resultTexts.has(text)) entries.push({ chapter: chapter.title, articles: chapter.articles, label: "Exigence à retenir", text, tone: "warning" });
      });
    });

    return {
      context,
      counts,
      compliant: entries.filter((item) => item.tone === "success"),
      requirements: entries.filter((item) => item.tone === "warning"),
      issues: entries.filter((item) => item.tone === "danger"),
    };
  }, [answers, project.collective, project.height, result.detail, result.family, result.familyKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("habitations-project-v1");
      if (stored) {
        try { setProject({ ...initialProject, ...JSON.parse(stored) }); } catch { /* keep defaults */ }
      }
      const storedAnswers = window.localStorage.getItem("habitations-answers-v1");
      if (storedAnswers) {
        try { setAnswers({ ...initialModuleAnswers, ...JSON.parse(storedAnswers) }); } catch { /* keep defaults */ }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("habitations-project-v1", JSON.stringify(project));
      setSaved(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [project]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("habitations-answers-v1", JSON.stringify(answers));
      setSaved(true);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [answers]);

  const update = <K extends keyof ProjectState>(key: K, value: ProjectState[K]) => {
    setSaved(false);
    setProject((current) => ({ ...current, [key]: value }));
  };
  const updateAnswer = (key: string, value: ModuleValue) => {
    setSaved(false);
    setAnswers((current) => ({ ...current, [key]: value }));
  };
  const activeChapter = chapters.find((chapter) => chapter.id === active) ?? chapters[0];
  const activeModule = useMemo(() => getModuleConfig(active, compliance.context, answers), [active, answers, compliance.context]);
  const activeIssueCount = compliance.counts[active] ?? 0;

  const startAnalysis = () => {
    setActive("classification");
    setSidebarOpen(false);
    setAnalysisStarted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!analysisStarted) {
    return (
      <main className="welcome-screen screen-app">
        <section className="site-hero welcome-hero">
          <figure className="site-hero-visual">
            <Image src="/hero-securite-incendie-qualiconsult.webp" alt="Visualisation des dispositifs de sécurité incendie d’un bâtiment d’habitation" width={1659} height={948} priority />
          </figure>
          <div className="site-hero-copy">
            <div className="hero-brand-card"><Image className="hero-brand-logo" src="/qualiconsult-logo.png" alt="Groupe Qualiconsult" width={456} height={256} priority /></div>
            <span className="eyebrow">Arrêté du 31 janvier 1986 modifié</span>
            <h1>Projet<br /><em>Sécurité incendie</em></h1>
            <p><strong>Un outil d’aide à l’analyse réglementaire</strong> pour vérifier les exigences applicables, repérer immédiatement les non-conformités et sécuriser chaque projet d’habitation.</p>
            <div className="hero-actions">
              <button className="hero-cta" type="button" onClick={startAnalysis}>Démarrer l’analyse<Icon name="arrow" /></button>
              <span>Étude enregistrée automatiquement</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
    <div className={`app-shell screen-app ${sidebarOpen ? "" : "sidebar-closed"}`}>
      {sidebarOpen && <aside className="sidebar">
        <button className="sidebar-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Fermer la barre latérale" title="Fermer la barre latérale"><Icon name="close" /></button>
        <div className="brand"><Image className="brand-logo" src="/qualiconsult-logo.png" alt="Groupe Qualiconsult" width={228} height={128} priority /></div>
        <div className="product-name"><strong>Qualiconsult Habitations</strong><small>Assistant de sécurité incendie</small></div>
        <div className="project-mini"><span className={`status-dot ${result.tone}`} /><div><small>Projet actif</small><strong>{project.projectName || "Sans nom"}</strong></div></div>
        <nav aria-label="Modules de l’étude">
          <p className="nav-label">Étude réglementaire</p>
          {chapters.map((chapter) => (
            <button className={`nav-item ${active === chapter.id ? "active" : ""} ${compliance.counts[chapter.id] ? "has-danger" : ""}`} key={chapter.id} onClick={() => setActive(chapter.id)} type="button">
              <span className="nav-number">{chapter.number}</span><span><strong>{chapter.title}</strong><small>{chapter.subtitle}</small></span><em>{chapter.articles}</em>
              {!!compliance.counts[chapter.id] && <span className="nav-danger" aria-label={`${compliance.counts[chapter.id]} non-conformité${compliance.counts[chapter.id] > 1 ? "s" : ""}`}>{compliance.counts[chapter.id]}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer"><div className="progress-copy"><span>Modules disponibles</span><strong>11 / 11</strong></div><div className="progress-track"><span style={{ width: "100%" }} /></div><button type="button" onClick={() => window.print()}><Icon name="report" />Exporter le rapport</button></div>
      </aside>}

      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">{!sidebarOpen && <button className="sidebar-reopen" type="button" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir la barre latérale"><Icon name="menu" />Menu</button>}<button type="button" onClick={() => { setAnalysisStarted(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Revenir à l’accueil" title="Revenir à l’accueil"><Icon name="home" /></button><span>/</span><span>Qualiconsult Habitations</span><span>/</span><strong>{activeChapter.title}</strong></div>
          <div className="top-actions"><span className={`save-state ${saved ? "saved" : ""}`}><Icon name="save" />{saved ? "Enregistré" : "Enregistrement…"}</span><button className="outline-button" type="button" onClick={() => window.print()}><Icon name="report" />Rapport PDF</button></div>
        </header>

        <div className="content">
          {active === "classification" ? (
            <>
              <section className={`classification-banner ${result.tone}`}>
                <div><span>Classement calculé</span><strong>{result.family}</strong></div><p>{result.detail}</p><span className="classification-live"><Icon name={result.tone === "danger" ? "alert" : "check"} />Analyse mise à jour instantanément</span>
              </section>

              <section className="project-fields card" id="project-identification">
                <div className="section-heading"><span className="step-badge">A</span><div><h2>Identification du projet</h2><p>Ces informations apparaîtront dans le rapport final.</p></div></div>
                <div className="field-grid two"><label><span>Nom du projet / Adresse</span><input value={project.projectName} onChange={(event) => update("projectName", event.target.value)} /></label><label><span>Architecte</span><input value={project.architect} onChange={(event) => update("architect", event.target.value)} /></label></div>
              </section>

              <section className="card questionnaire">
                <div className="section-heading"><span className="step-badge">B</span><div><h2>Questions de classement</h2><p>Arrêté du 31 janvier 1986 modifié.</p></div><span className="question-count">{project.collective === "Oui" && project.floors > 3 && project.height <= 28 ? "5 questions" : project.collective === "Non" ? "4 questions" : "3 questions"}</span></div>
                <div className="question-list">
                  <div className="question"><span className="q-index">01</span><div className="q-copy"><h3>Le bâtiment comporte-t-il des logements superposés ?</h3><p>Une réponse positive caractérise une habitation collective.</p></div><div className="choices"><Choice value="Oui" selected={project.collective === "Oui"} onSelect={() => update("collective", "Oui")} /><Choice value="Non" selected={project.collective === "Non"} onSelect={() => update("collective", "Non")} /></div></div>
                  {project.collective === "Non" && <div className="question nested"><span className="q-index">01b</span><div className="q-copy"><h3>La maison est-elle construite en bande ?</h3><p>Sinon, elle sera considérée isolée ou jumelée.</p></div><div className="choices"><Choice value="Oui" selected={project.banded === "Oui"} onSelect={() => update("banded", "Oui")} /><Choice value="Non" selected={project.banded === "Non"} onSelect={() => update("banded", "Non")} /></div></div>}
                  <div className="question"><span className="q-index">02</span><div className="q-copy"><h3>Nombre d’étages au-dessus du rez-de-chaussée</h3><p>Exemple : R+3 correspond à 3 étages.</p></div><label className="number-field"><input type="number" min="0" max="30" value={project.floors} onChange={(event) => update("floors", Number(event.target.value))} /><span>étages</span></label></div>
                  <div className="question"><span className="q-index">03</span><div className="q-copy"><h3>Hauteur du plancher bas du logement le plus haut</h3><p>Mesurée depuis le sol accessible aux engins de secours.</p></div><label className="number-field"><input type="number" min="0" step="0.5" value={project.height} onChange={(event) => update("height", Number(event.target.value))} /><span>mètres</span></label></div>
                  {project.collective === "Oui" && project.floors > 3 && project.height <= 28 && <>
                    <div className="question"><span className="q-index">04</span><div className="q-copy"><h3>Distance maximale entre porte palière et escalier</h3><p>Mesure à l’étage, depuis la porte la plus éloignée.</p></div><label className="number-field"><input type="number" min="0" step="0.5" value={project.stairDistance} onChange={(event) => update("stairDistance", Number(event.target.value))} /><span>mètres</span></label></div>
                    <div className="question"><span className="q-index">05</span><div className="q-copy"><h3>Les escaliers sont-ils accessibles depuis une voie échelle au RDC ?</h3><p>Voie permettant l’intervention des camions échelle.</p></div><div className="choices"><Choice value="Oui" selected={project.ladderAccess === "Oui"} onSelect={() => update("ladderAccess", "Oui")} /><Choice value="Non" selected={project.ladderAccess === "Non"} onSelect={() => update("ladderAccess", "Non")} /></div></div>
                  </>}
                </div>
              </section>

              <section className="next-section"><div><span>Étape suivante</span><h2>Éléments porteurs & planchers</h2><p>Articles 5 et 6 · exigences de stabilité et coupe-feu.</p></div><button className="primary-button" type="button" onClick={() => setActive("structure")}>Continuer l’étude<Icon name="arrow" /></button></section>
            </>
          ) : activeModule ? (
            <section className="module-page">
              <div className="module-hero"><div><span className="eyebrow">{activeModule.kicker}</span><h1>{activeModule.title}</h1><p>{activeModule.intro}</p></div><div className={`family-chip ${result.tone}`}><small>Famille appliquée</small><strong>{result.family}</strong><button type="button" onClick={() => setActive("classification")}>Modifier le classement</button></div></div>
              <div className="module-grid">
                <div className="card module-questions"><div className="section-heading"><span className="step-badge">Q</span><div><h2>Caractéristiques du projet</h2><p>Les questions non applicables sont masquées automatiquement.</p></div><span className="question-count">{activeModule.questions.length} question{activeModule.questions.length > 1 ? "s" : ""}</span></div><div className="question-list">{activeModule.questions.map((question) => <div className="question" key={question.id}><span className="q-index">{question.index}</span><div className="q-copy"><h3>{question.title}</h3>{question.hint && <p>{question.hint}</p>}</div><ModuleInput question={question} value={answers[question.id] ?? ""} onChange={(next) => updateAnswer(question.id, next)} /></div>)}</div></div>
                <aside className="results-panel"><div className="results-heading"><div><span>Analyse instantanée</span><h2>Prescriptions</h2>{activeIssueCount > 0 && <strong className="nonconformity-count">{activeIssueCount} non-conformité{activeIssueCount > 1 ? "s" : ""}</strong>}</div><span className="live-badge"><i />EN DIRECT</span></div><div className="result-list" aria-live="polite">{activeModule.results.map((item, index) => <article className={`result-item ${item.tone}`} key={`${item.label}-${index}`}><span className="result-icon"><Icon name={item.tone === "danger" ? "alert" : "check"} /></span><div><small>{item.label}</small><p>{item.text}</p></div></article>)}</div><div className="reminder"><strong>À retenir</strong>{activeModule.reminder.map((item) => <p key={item}>{item}</p>)}</div></aside>
              </div>
              <div className="module-actions"><button className="outline-button" type="button" onClick={() => setActive(chapters[Math.max(0, chapters.findIndex((item) => item.id === active) - 1)].id)}>Étape précédente</button><button className="primary-button" type="button" onClick={() => { const index = chapters.findIndex((item) => item.id === active); setActive(chapters[Math.min(chapters.length - 1, index + 1)].id); }}>Étape suivante<Icon name="arrow" /></button></div>
            </section>
          ) : (
            <section className="module-placeholder"><span className="eyebrow">{activeChapter.articles}</span><h1>{activeChapter.title}</h1><p>Module indisponible.</p></section>
          )}
        </div>
      </main>
    </div>
    <section className="report-document" aria-label="Rapport de conformité réglementaire">
      <div className="report-content">
        <header className="report-header">
          <Image src="/qualiconsult-logo.png" alt="Groupe Qualiconsult" width={228} height={128} />
          <div><span>Qualiconsult Habitations</span><h1>Rapport de conformité réglementaire</h1></div>
        </header>
        <div className="report-project">
          <div><small>Projet / Adresse</small><strong>{project.projectName || "Sans nom"}</strong></div>
          <div><small>Architecte</small><strong>{project.architect || "Non renseigné"}</strong></div>
          <div><small>Classement</small><strong>{result.family}</strong></div>
        </div>
        <div className="report-kpis">
          <div className="success"><strong>{compliance.compliant.length}</strong><span>Points conformes</span></div>
          <div className="warning"><strong>{compliance.requirements.length}</strong><span>Exigences à respecter</span></div>
          <div className="danger"><strong>{compliance.issues.length}</strong><span>Non-conformités</span></div>
        </div>
        <ReportSection title="Points conformes" subtitle="Éléments validés par l’analyse" tone="success" entries={compliance.compliant} />
        <ReportSection title="Exigences réglementaires" subtitle="Éléments attendus et prescriptions à respecter" tone="warning" entries={compliance.requirements} />
        <ReportSection title="Non-conformités relevées" subtitle="Écarts nécessitant une action corrective" tone="danger" entries={compliance.issues} />
        <footer className="report-footer"><span>Rapport généré depuis Qualiconsult Habitations</span><strong>{compliance.compliant.length} conformes · {compliance.requirements.length} exigences · {compliance.issues.length} non-conformités</strong></footer>
      </div>
    </section>
    </>
  );
}
