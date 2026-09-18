import { useMemo, useState } from "react";

type ErpType = "J" | "L" | "M" | "N";
type MMode = "general" | "mall" | "low" | "professional";
type CalculationRow = { label: string; value: number };

const ERP_TYPES: Array<{ code: ErpType; label: string; article: string }> = [
  { code: "J", label: "Structures d’accueil pour personnes âgées ou handicapées", article: "J 2" },
  { code: "L", label: "Salles d’auditions, conférences, réunions, spectacles ou polyvalentes", article: "L 3" },
  { code: "M", label: "Magasins de vente et centres commerciaux", article: "M 2" },
  { code: "N", label: "Restaurants et débits de boissons", article: "N 2" },
];

const positive = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);
const occupancy = (quantity: number, divisor = 1) => Math.ceil(positive(quantity) / divisor);

function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  hint?: string;
}) {
  return (
    <label className="erp-number-field">
      <span>{label}</span>
      <div>
        <input
          type="number"
          min="0"
          step="any"
          value={value || ""}
          placeholder="0"
          onChange={(event) => onChange(positive(Number(event.target.value)))}
        />
        {unit && <small>{unit}</small>}
      </div>
      {hint && <em>{hint}</em>}
    </label>
  );
}

export function ErpWorkspace() {
  const [type, setType] = useState<ErpType>("J");
  const [values, setValues] = useState<Record<string, number>>({});
  const [mMode, setMMode] = useState<MMode>("general");
  const [nDeclared, setNDeclared] = useState(true);

  const value = (key: string) => values[key] ?? 0;
  const setValue = (key: string, next: number) =>
    setValues((current) => ({ ...current, [key]: next }));

  const calculation = useMemo(() => {
    const rows: CalculationRow[] = [];

    if (type === "J") {
      rows.push(
        { label: "Résidents", value: occupancy(value("jResidents")) },
        { label: "Personnel en travail effectif", value: occupancy(value("jStaff")) },
        { label: "Visiteurs forfaitaires (1 pour 3 résidents)", value: occupancy(value("jResidents"), 3) },
        { label: "Locaux accueillant des personnes extérieures", value: occupancy(value("jExternal")) },
      );
    }

    if (type === "L") {
      rows.push(
        { label: "Places numérotées", value: occupancy(value("lNumbered")) },
        { label: "Bancs non numérotés (2 pers./m)", value: occupancy(value("lBenches") * 2) },
        { label: "Zones sans sièges (3 pers./m²)", value: occupancy(value("lStanding") * 3) },
        { label: "Promenoirs et files (5 pers./m)", value: occupancy(value("lQueues") * 5) },
        { label: "Cabarets (4 pers./3 m²)", value: occupancy(value("lCabaret") * 4, 3) },
        { label: "Salles polyvalentes (1 pers./m²)", value: occupancy(value("lPolyvalent")) },
        { label: "Réunions sans spectacle (1 pers./m²)", value: occupancy(value("lMeeting")) },
        {
          label: "Salles multimédia",
          value: Math.max(occupancy(value("lMultimedia"), 2), occupancy(value("lMultimediaDeclared"))),
        },
      );
    }

    if (type === "M") {
      if (mMode === "general") {
        rows.push(
          { label: "Sous-sol, RDC et 1er étage (1 pers./3 m²)", value: occupancy(value("mLower"), 3) },
          { label: "2e étage (1 pers./6 m²)", value: occupancy(value("mSecond"), 6) },
          { label: "Étages supérieurs (1 pers./15 m²)", value: occupancy(value("mUpper"), 15) },
        );
      }
      if (mMode === "mall") {
        rows.push(
          { label: "Mails (1 pers./5 m²)", value: occupancy(value("mMalls"), 5) },
          { label: "Vente — sous-sol, RDC et 1er (1 pers./3 m²)", value: occupancy(value("mLower"), 3) },
          { label: "Vente — 2e étage (1 pers./6 m²)", value: occupancy(value("mSecond"), 6) },
          { label: "Vente — étages supérieurs (1 pers./15 m²)", value: occupancy(value("mUpper"), 15) },
          { label: "Boutiques de moins de 300 m² (1 pers./6 m²)", value: occupancy(value("mSmall"), 6) },
        );
      }
      if (mMode === "low") {
        rows.push({ label: "Magasin à faible densité (1 pers./9 m²)", value: occupancy(value("mLow"), 9) });
      }
      if (mMode === "professional") {
        rows.push({ label: "Effectif selon déclaration contrôlée", value: occupancy(value("mDeclared")) });
      }
    }

    if (type === "N") {
      rows.push(
        {
          label: nDeclared ? "Restauration assise — places déclarées" : "Restauration assise (1 pers./m²)",
          value: nDeclared ? occupancy(value("nSeats")) : occupancy(value("nSeatedArea")),
        },
        { label: "Restauration debout (2 pers./m²)", value: occupancy(value("nStanding") * 2) },
        { label: "Files d’attente (3 pers./m²)", value: occupancy(value("nQueues") * 3) },
      );
    }

    const visibleRows = rows.filter((row) => row.value > 0);
    return {
      rows: visibleRows,
      total: visibleRows.reduce((sum, row) => sum + row.value, 0),
    };
  }, [mMode, nDeclared, type, values]);

  const selected = ERP_TYPES.find((item) => item.code === type) ?? ERP_TYPES[0];
  const nDeclarationInvalid =
    type === "N" &&
    nDeclared &&
    value("nSeats") > 0 &&
    value("nSeatedArea") < value("nSeats") * 2;

  return (
    <section className="erp-builder">
      <header className="erp-builder-heading">
        <span>Analyse réglementaire ERP</span>
        <h1>Calcul de l’effectif</h1>
        <p>Sélectionnez l’utilisation principale, puis renseignez uniquement les données du projet.</p>
      </header>

      <div className="erp-builder-layout">
        <div className="erp-builder-form">
          <section className="erp-question-card">
            <span className="erp-step">01</span>
            <label className="erp-main-select">
              <strong>Quel est le type principal d’utilisation ?</strong>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as ErpType)}
              >
                {ERP_TYPES.map((item) => (
                  <option value={item.code} key={item.code}>
                    {item.code} — {item.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="erp-question-card">
            <span className="erp-step">02</span>
            <div className="erp-type-title">
              <small>{selected.article}</small>
              <h2>Effectif du type {selected.code}</h2>
              <p>{selected.label}</p>
            </div>

            <div className="erp-fields-grid">
              {type === "J" && (
                <>
                  <NumberField label="Effectif maximal des résidents" value={value("jResidents")} onChange={(next) => setValue("jResidents", next)} unit="personnes" />
                  <NumberField label="Personnel en travail effectif" value={value("jStaff")} onChange={(next) => setValue("jStaff", next)} unit="personnes" />
                  <NumberField
                    label="Effectif des locaux accueillant des personnes extérieures"
                    value={value("jExternal")}
                    onChange={(next) => setValue("jExternal", next)}
                    unit="personnes"
                    hint="Hors visiteurs habituels. À calculer selon l’utilisation de ces locaux."
                  />
                </>
              )}

              {type === "L" && (
                <>
                  <NumberField label="Places assises numérotées" value={value("lNumbered")} onChange={(next) => setValue("lNumbered", next)} unit="places" />
                  <NumberField label="Longueur des bancs non numérotés" value={value("lBenches")} onChange={(next) => setValue("lBenches", next)} unit="m linéaires" />
                  <NumberField label="Surface sans sièges ni bancs" value={value("lStanding")} onChange={(next) => setValue("lStanding", next)} unit="m²" />
                  <NumberField label="Longueur des promenoirs et files d’attente" value={value("lQueues")} onChange={(next) => setValue("lQueues", next)} unit="m linéaires" />
                  <NumberField label="Surface utile des cabarets" value={value("lCabaret")} onChange={(next) => setValue("lCabaret", next)} unit="m²" hint="Après déduction des estrades et aménagements fixes concernés." />
                  <NumberField label="Surface totale des salles polyvalentes" value={value("lPolyvalent")} onChange={(next) => setValue("lPolyvalent", next)} unit="m²" />
                  <NumberField label="Surface des salles de réunion sans spectacle" value={value("lMeeting")} onChange={(next) => setValue("lMeeting", next)} unit="m²" />
                  <NumberField label="Surface totale des salles multimédia" value={value("lMultimedia")} onChange={(next) => setValue("lMultimedia", next)} unit="m²" />
                  <NumberField label="Effectif déclaré des salles multimédia" value={value("lMultimediaDeclared")} onChange={(next) => setValue("lMultimediaDeclared", next)} unit="personnes" hint="Le minimum réglementaire de 1 personne pour 2 m² reste appliqué." />
                </>
              )}

              {type === "M" && (
                <>
                  <label className="erp-mode-select">
                    <span>Configuration du type M</span>
                    <select value={mMode} onChange={(event) => setMMode(event.target.value as MMode)}>
                      <option value="general">Magasin — règle générale</option>
                      <option value="mall">Centre commercial</option>
                      <option value="low">Magasin à faible densité</option>
                      <option value="professional">Magasin réservé aux professionnels</option>
                    </select>
                  </label>

                  {mMode === "mall" && (
                    <NumberField label="Surface totale des mails" value={value("mMalls")} onChange={(next) => setValue("mMalls", next)} unit="m²" />
                  )}

                  {(mMode === "general" || mMode === "mall") && (
                    <>
                      <NumberField label="Surface de vente — sous-sol, RDC et 1er étage" value={value("mLower")} onChange={(next) => setValue("mLower", next)} unit="m²" />
                      <NumberField label="Surface de vente — 2e étage" value={value("mSecond")} onChange={(next) => setValue("mSecond", next)} unit="m²" />
                      <NumberField label="Surface de vente — étages supérieurs" value={value("mUpper")} onChange={(next) => setValue("mUpper", next)} unit="m²" />
                    </>
                  )}

                  {mMode === "mall" && (
                    <NumberField
                      label="Surface des boutiques de moins de 300 m²"
                      value={value("mSmall")}
                      onChange={(next) => setValue("mSmall", next)}
                      unit="m²"
                      hint="Ne pas inclure à nouveau cette surface dans les autres surfaces de vente."
                    />
                  )}

                  {mMode === "low" && (
                    <NumberField label="Surface de vente à faible densité" value={value("mLow")} onChange={(next) => setValue("mLow", next)} unit="m²" />
                  )}

                  {mMode === "professional" && (
                    <NumberField label="Effectif de la déclaration contrôlée" value={value("mDeclared")} onChange={(next) => setValue("mDeclared", next)} unit="personnes" />
                  )}

                  <NumberField
                    label="Surface des aires de vente à l’air libre"
                    value={value("mOutdoor")}
                    onChange={(next) => setValue("mOutdoor", next)}
                    unit="m²"
                    hint="Information conservée, mais non ajoutée à l’effectif de classement."
                  />
                </>
              )}

              {type === "N" && (
                <>
                  <div className="erp-choice-row">
                    <span>La capacité assise fait-elle l’objet d’une déclaration contrôlée ?</span>
                    <button type="button" className={nDeclared ? "active" : ""} onClick={() => setNDeclared(true)}>Oui</button>
                    <button type="button" className={!nDeclared ? "active" : ""} onClick={() => setNDeclared(false)}>Non</button>
                  </div>
                  <NumberField
                    label="Surface de restauration assise"
                    value={value("nSeatedArea")}
                    onChange={(next) => setValue("nSeatedArea", next)}
                    unit="m²"
                    hint="Après déduction des estrades et aménagements fixes autres que les tables et sièges."
                  />
                  {nDeclared && (
                    <NumberField label="Nombre de places assises déclaré" value={value("nSeats")} onChange={(next) => setValue("nSeats", next)} unit="places" />
                  )}
                  <NumberField label="Surface de restauration debout" value={value("nStanding")} onChange={(next) => setValue("nStanding", next)} unit="m²" />
                  <NumberField label="Surface des files d’attente" value={value("nQueues")} onChange={(next) => setValue("nQueues", next)} unit="m²" />
                  {nDeclarationInvalid && (
                    <p className="erp-inline-warning">
                      La déclaration dépasse la limite de 1 place assise pour 2 m². Surface minimale requise : {value("nSeats") * 2} m².
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        <aside className="erp-calculation">
          <small>{selected.article} · Résultat automatique</small>
          <h2>Effectif du public</h2>
          <strong>{calculation.total}</strong>
          <span>personnes</span>

          <div className="erp-calculation-rows">
            {calculation.rows.length ? (
              calculation.rows.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <b>{row.value}</b>
                </div>
              ))
            ) : (
              <p>Complétez les données pour afficher le calcul.</p>
            )}
          </div>

          <p className="erp-rounding-note">
            Les résultats fractionnaires sont arrondis à l’entier supérieur.
          </p>
        </aside>
      </div>
    </section>
  );
}
