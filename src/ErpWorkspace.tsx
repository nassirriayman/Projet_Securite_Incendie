"use client";

import { useMemo, useState } from "react";
import {
  ERP_TYPES_BUILDING,
  ERP_TYPES_SPECIAL,
  classifyErp,
} from "./erpRegulations";

type ErpTab = "classification" | "general";

type GeneralCases = {
  grouped: boolean;
  isolated: boolean;
  mixedTypes: boolean;
  adaptation: boolean;
  exceptionalUse: boolean;
  inIgh: boolean;
  newLayoutExisting: boolean;
  existingWorks: boolean;
  increasedRisk: boolean;
};

type Finding = {
  article: string;
  title: string;
  text: string;
  tone: "info" | "warning";
};

const initialCases: GeneralCases = {
  grouped: false,
  isolated: false,
  mixedTypes: false,
  adaptation: false,
  exceptionalUse: false,
  inIgh: false,
  newLayoutExisting: false,
  existingWorks: false,
  increasedRisk: false,
};

export function ErpWorkspace() {
  const [activeTab, setActiveTab] = useState<ErpTab>("classification");
  const [erpFamily, setErpFamily] = useState<"building" | "special">("building");
  const [erpType, setErpType] = useState("J");
  const [publicCount, setPublicCount] = useState(0);
  const [countedStaffCount, setCountedStaffCount] = useState(0);
  const [fifthCategoryThreshold, setFifthCategoryThreshold] =
    useState<number | "">("");
  const [hasSleepingPremises, setHasSleepingPremises] = useState(false);
  const [cases, setCases] = useState<GeneralCases>(initialCases);

  const availableTypes =
    erpFamily === "building" ? ERP_TYPES_BUILDING : ERP_TYPES_SPECIAL;

  const selectedType =
    availableTypes.find((item) => item.code === erpType) ?? availableTypes[0];

  const classification = useMemo(
    () =>
      classifyErp({
        publicCount,
        countedStaffCount,
        fifthCategoryThreshold:
          fifthCategoryThreshold === "" ? null : fifthCategoryThreshold,
      }),
    [publicCount, countedStaffCount, fifthCategoryThreshold],
  );

  const findings = useMemo(() => {
    const rows: Finding[] = [];

    if (cases.grouped && cases.isolated) {
      rows.push({
        article: "GN 3",
        title: "Bâtiments isolés",
        text:
          "Les bâtiments répondant aux conditions d’isolement sont considérés " +
          "comme autant d’établissements distincts.",
        tone: "info",
      });
    }

    if (cases.grouped && !cases.isolated) {
      rows.push({
        article: "GN 2",
        title: "Groupement non isolé",
        text:
          "Les exploitations doivent être considérées comme un seul ERP. " +
          "Les effectifs de chaque exploitation doivent être additionnés.",
        tone: "warning",
      });
    }

    if (cases.mixedTypes) {
      rows.push({
        article: "GN 5",
        title: "Locaux de types différents",
        text:
          "Chaque local doit respecter les dispositions particulières de son " +
          "type en tenant compte de la catégorie de l’établissement.",
        tone: "warning",
      });
    }

    if (cases.adaptation) {
      rows.push({
        article: "GN 4",
        title: "Adaptation des règles de sécurité",
        text:
          "Une demande écrite, ses justifications et les mesures compensatoires " +
          "doivent être soumises à l’autorité compétente.",
        tone: "warning",
      });
    }

    if (cases.exceptionalUse) {
      rows.push({
        article: "GN 6",
        title: "Utilisation exceptionnelle",
        text:
          "Une demande d’autorisation précisant la manifestation, les risques, " +
          "l’effectif, les dégagements et les mesures complémentaires est requise.",
        tone: "warning",
      });
    }

    if (cases.inIgh) {
      rows.push({
        article: "GN 7",
        title: "Établissement situé dans un IGH",
        text:
          "Le règlement ERP et le règlement de sécurité des immeubles de grande " +
          "hauteur sont applicables dans les conditions prévues.",
        tone: "warning",
      });
    }

    if (cases.newLayoutExisting) {
      rows.push({
        article: "GN 9",
        title: "Nouvel aménagement dans un bâtiment existant",
        text:
          "Les dispositions du règlement ERP sont applicables au nouvel " +
          "aménagement ou à la création de l’établissement.",
        tone: "info",
      });
    }

    if (cases.existingWorks) {
      rows.push({
        article: "GN 10",
        title: "Travaux dans un établissement existant",
        text:
          "Les dispositions nouvelles sont applicables aux parties de la " +
          "construction ou des installations modifiées.",
        tone: "info",
      });
    }

    if (cases.existingWorks && cases.increasedRisk) {
      rows.push({
        article: "GN 10 § 2",
        title: "Augmentation du risque général",
        text:
          "Des mesures de sécurité complémentaires peuvent être imposées après " +
          "avis de la commission de sécurité.",
        tone: "warning",
      });
    }

    return rows;
  }, [cases]);

  const changeFamily = (family: "building" | "special") => {
    setErpFamily(family);
    setErpType(
      family === "building"
        ? ERP_TYPES_BUILDING[0].code
        : ERP_TYPES_SPECIAL[0].code,
    );
  };

  const toggleCase = (key: keyof GeneralCases) => {
    setCases((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="erp-workspace">
      <header className="erp-workspace-title">
        <span>Projet Sécurité Incendie</span>
        <h1>Analyse réglementaire ERP</h1>
        <p>Classement et dispositions générales applicables à l’établissement.</p>
      </header>

      <nav className="erp-tabs" aria-label="Modules ERP">
        <button
          type="button"
          className={activeTab === "classification" ? "active" : ""}
          onClick={() => setActiveTab("classification")}
        >
          <span>01</span>
          Classement ERP
        </button>

        <button
          type="button"
          className={activeTab === "general" ? "active" : ""}
          onClick={() => setActiveTab("general")}
        >
          <span>02</span>
          Dispositions générales
        </button>
      </nav>

      {activeTab === "classification" ? (
        <div className="erp-layout">
          <div className="erp-form-card">
            <div className="erp-card-heading">
              <span>GN 1</span>
              <div>
                <h2>Type, effectif et catégorie</h2>
                <p>Renseignez les caractéristiques principales de l’ERP.</p>
              </div>
            </div>

            <div className="erp-field-grid">
              <label className="erp-field">
                <span>Famille d’établissement</span>
                <select
                  value={erpFamily}
                  onChange={(event) =>
                    changeFamily(event.target.value as "building" | "special")
                  }
                >
                  <option value="building">Établissement dans un bâtiment</option>
                  <option value="special">Établissement spécial</option>
                </select>
              </label>

              <label className="erp-field">
                <span>Type ERP</span>
                <select
                  value={erpType}
                  onChange={(event) => setErpType(event.target.value)}
                >
                  {availableTypes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} — {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="erp-field">
                <span>Effectif du public</span>
                <input
                  type="number"
                  min="0"
                  value={publicCount}
                  onChange={(event) =>
                    setPublicCount(Math.max(0, Number(event.target.value)))
                  }
                />
              </label>

              <label className="erp-field">
                <span>Personnel sans dégagements indépendants</span>
                <input
                  type="number"
                  min="0"
                  value={countedStaffCount}
                  onChange={(event) =>
                    setCountedStaffCount(
                      Math.max(0, Number(event.target.value)),
                    )
                  }
                />
              </label>

              <label className="erp-field">
                <span>Seuil de 5e catégorie propre au type</span>
                <input
                  type="number"
                  min="1"
                  placeholder="À compléter"
                  value={fifthCategoryThreshold}
                  onChange={(event) =>
                    setFifthCategoryThreshold(
                      event.target.value === ""
                        ? ""
                        : Math.max(1, Number(event.target.value)),
                    )
                  }
                />
                <small>
                  Valeur provisoirement manuelle jusqu’à l’intégration des seuils
                  propres à chaque type.
                </small>
              </label>

              <label className="erp-checkbox">
                <input
                  type="checkbox"
                  checked={hasSleepingPremises}
                  onChange={(event) =>
                    setHasSleepingPremises(event.target.checked)
                  }
                />
                <span>L’établissement comporte des locaux à sommeil</span>
              </label>
            </div>
          </div>

          <aside className={`erp-results-card ${classification.tone}`}>
            <span>Classement calculé</span>
            <strong>{classification.category}</strong>
            <h2>{classification.group}</h2>

            <dl>
              <div>
                <dt>Type</dt>
                <dd>{selectedType.code}</dd>
              </div>
              <div>
                <dt>Effectif retenu</dt>
                <dd>{classification.countedTotal}</dd>
              </div>
              <div>
                <dt>Locaux à sommeil</dt>
                <dd>{hasSleepingPremises ? "Oui" : "Non"}</dd>
              </div>
            </dl>

            <p>{classification.detail}</p>
          </aside>
        </div>
      ) : (
        <div className="erp-layout">
          <div className="erp-form-card">
            <div className="erp-card-heading">
              <span>GN 2–10</span>
              <div>
                <h2>Situations particulières</h2>
                <p>Cochez uniquement les situations présentes dans le projet.</p>
              </div>
            </div>

            <div className="erp-check-list">
              <label className="erp-checkbox">
                <input
                  type="checkbox"
                  checked={cases.grouped}
                  onChange={() => toggleCase("grouped")}
                />
                <span>
                  <strong>GN 2–3</strong>
                  Plusieurs exploitations ou bâtiments sont regroupés
                </span>
              </label>

              {cases.grouped && (
                <label className="erp-checkbox nested">
                  <input
                    type="checkbox"
                    checked={cases.isolated}
                    onChange={() => toggleCase("isolated")}
                  />
                  <span>Les bâtiments répondent aux conditions d’isolement</span>
                </label>
              )}

              <label className="erp-checkbox">
                <input
                  type="checkbox"
                  checked={cases.mixedTypes}
                  onChange={() => toggleCase("mixedTypes")}
                />
                <span>
                  <strong>GN 5</strong>
                  L’établissement comporte des locaux de types différents
                </span>
              </label>

              <label className="erp-checkbox">
                <input
                  type="checkbox"
                  checked={cases.adaptation}
                  onChange={() => toggleCase("adaptation")}
                />
                <span>
                  <strong>GN 4</strong>
                  Une adaptation des règles de sécurité est envisagée
                </span>
              </label>

              <label className="erp-checkbox">
                <input
                  type="checkbox"
                  checked={cases.exceptionalUse}
                  onChange={() => toggleCase("exceptionalUse")}
                />
                <span>
                  <strong>GN 6</strong>
                  Une utilisation exceptionnelle des locaux est prévue
                </span>
              </label>

              <label className="erp-checkbox">
                <input
                  type="checkbox"
                  checked={cases.inIgh}
                  onChange={() => toggleCase("inIgh")}
                />
                <span>
                  <strong>GN 7</strong>
                  L’établissement est situé dans un IGH
                </span>
              </label>

              <label className="erp-checkbox">
                <input
                  type="checkbox"
                  checked={cases.newLayoutExisting}
                  onChange={() => toggleCase("newLayoutExisting")}
                />
                <span>
                  <strong>GN 9</strong>
                  Nouvel aménagement ou création dans un bâtiment existant
                </span>
              </label>

              <label className="erp-checkbox">
                <input
                  type="checkbox"
                  checked={cases.existingWorks}
                  onChange={() => toggleCase("existingWorks")}
                />
                <span>
                  <strong>GN 10</strong>
                  Des travaux sont réalisés dans un ERP existant
                </span>
              </label>

              {cases.existingWorks && (
                <label className="erp-checkbox nested">
                  <input
                    type="checkbox"
                    checked={cases.increasedRisk}
                    onChange={() => toggleCase("increasedRisk")}
                  />
                  <span>Les modifications augmentent le risque général</span>
                </label>
              )}
            </div>
          </div>

          <aside className="erp-findings">
            <h2>Dispositions applicables</h2>

            {findings.length === 0 ? (
              <p className="erp-empty">
                Cochez une situation pour afficher les articles applicables.
              </p>
            ) : (
              findings.map((finding) => (
                <article
                  className={`erp-finding ${finding.tone}`}
                  key={`${finding.article}-${finding.title}`}
                >
                  <small>{finding.article}</small>
                  <strong>{finding.title}</strong>
                  <p>{finding.text}</p>
                </article>
              ))
            )}

            <article className="erp-finding info">
              <small>GN 8</small>
              <strong>Évacuation des personnes en situation de handicap</strong>
              <p>
                L’aide humaine, les espaces d’attente sécurisés, les cheminements,
                l’alarme adaptée, la traçabilité et les consignes d’évacuation
                devront être contrôlés dans la prochaine étape.
              </p>
            </article>
          </aside>
        </div>
      )}
    </section>
  );
}
