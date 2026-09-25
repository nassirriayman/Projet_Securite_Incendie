import { useMemo, useState } from "react";

type ErpType = "J" | "L" | "M" | "N" | "O" | "P" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y";
type JSubtype = "elderly" | "disabled";
type LActivity = "a" | "b" | "c" | "d" | "e" | "f" | "g";
type LMode = "audience" | "meeting";
type TMode = "temporary" | "permanent";
type PMode = "general" | "billiard";
type UVisitorMode = "standard" | "reduced";
type VMode = "seats" | "standing";
type WMode = "declared" | "planned" | "unplanned";
type XMode = "omnisports" | "ice" | "sportsHall" | "indoorPool" | "outdoorPool" | "mixedPool";
type MMode = "general" | "mall" | "low" | "professional";
type ShopLevel = "lower" | "second" | "upper";
type MallShop = { id: number; surface: number; level: ShopLevel };
type CalculationRow = { label: string; value: number };

const L_ACTIVITIES: Array<{ code: LActivity; label: string }> = [
  { code: "a", label: "Audition, conférence, réunion ou pari" },
  { code: "b", label: "Salle d’association ou de quartier" },
  { code: "c", label: "Projection ou spectacle" },
  { code: "d", label: "Cabaret" },
  { code: "e", label: "Salle polyvalente sportive (≥ 1 200 m² ou hauteur < 6,50 m)" },
  { code: "f", label: "Autre salle polyvalente" },
  { code: "g", label: "Salle multimédia" },
];

const ERP_TYPES: Array<{ code: ErpType; label: string; article: string }> = [
  { code: "J", label: "Structures d’accueil pour personnes âgées ou handicapées", article: "J 2" },
  { code: "L", label: "Salles d’auditions, conférences, réunions, spectacles ou polyvalentes", article: "L 3" },
  { code: "M", label: "Magasins de vente et centres commerciaux", article: "M 2" },
  { code: "N", label: "Restaurants et débits de boissons", article: "N 2" },
  { code: "O", label: "Hôtels et autres établissements d’hébergement", article: "O 2" },
  { code: "P", label: "Salles de danse et salles de jeux", article: "P 2" },
  { code: "R", label: "Établissements d’enseignement, de formation et centres de loisirs", article: "R 2" },
  { code: "S", label: "Bibliothèques et centres de documentation", article: "S 2" },
  { code: "T", label: "Salles d’expositions", article: "T 2" },
  { code: "U", label: "Établissements sanitaires", article: "U 2" },
  { code: "V", label: "Établissements de culte", article: "V 2" },
  { code: "W", label: "Administrations, banques et bureaux", article: "W 2" },
  { code: "X", label: "Établissements sportifs couverts", article: "X 2" },
  { code: "Y", label: "Musées", article: "Y 2" },
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
  const [jSubtype, setJSubtype] = useState<JSubtype>("elderly");
  const [lActivity, setLActivity] = useState<LActivity>("a");
  const [lMode, setLMode] = useState<LMode>("audience");
  const [lBasement, setLBasement] = useState<number | "">("");
  const [mMode, setMMode] = useState<MMode>("general");
  const [mallShops, setMallShops] = useState<MallShop[]>([{ id: 1, surface: 0, level: "lower" }]);
  const [nDeclared, setNDeclared] = useState(true);
  const [tMode, setTMode] = useState<TMode>("temporary");
  const [pMode, setPMode] = useState<PMode>("general");
  const [uVisitorMode, setUVisitorMode] = useState<UVisitorMode>("standard");
  const [vMode, setVMode] = useState<VMode>("seats");
  const [wMode, setWMode] = useState<WMode>("declared");
  const [xMode, setXMode] = useState<XMode>("omnisports");

  const value = (key: string) => values[key] ?? 0;
  const setValue = (key: string, next: number) =>
    setValues((current) => ({ ...current, [key]: next }));

  const resetLInputs = () => {
    setValues((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith("l"))),
    );
    setLBasement("");
  };

  const addMallShop = () =>
    setMallShops((current) => [
      ...current,
      { id: Math.max(0, ...current.map((shop) => shop.id)) + 1, surface: 0, level: "lower" },
    ]);

  const updateMallShop = (id: number, changes: Partial<Omit<MallShop, "id">>) =>
    setMallShops((current) =>
      current.map((shop) => (shop.id === id ? { ...shop, ...changes } : shop)),
    );

  const removeMallShop = (id: number) =>
    setMallShops((current) => current.filter((shop) => shop.id !== id));

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
      if ((lActivity === "a" || lActivity === "b") && lMode === "meeting") {
        rows.push({ label: "Réunion sans spectacle (1 pers./m²)", value: occupancy(value("lMeeting")) });
      } else if (lActivity === "a" || lActivity === "b" || lActivity === "c") {
        rows.push(
          { label: "Places numérotées", value: occupancy(value("lNumbered")) },
          { label: "Bancs non numérotés (2 pers./m)", value: occupancy(value("lBenches") * 2) },
          { label: "Zones sans sièges (3 pers./m²)", value: occupancy(value("lStanding") * 3) },
          { label: "Promenoirs et files (5 pers./m)", value: occupancy(value("lQueues") * 5) },
        );
      } else if (lActivity === "d") {
        rows.push({ label: "Cabaret (4 pers./3 m²)", value: occupancy(value("lCabaret") * 4, 3) });
      } else if (lActivity === "e" || lActivity === "f") {
        rows.push({ label: "Salle polyvalente (1 pers./m²)", value: occupancy(value("lPolyvalent")) });
      } else if (lActivity === "g") {
        rows.push({
          label: "Salle multimédia (déclaration, minimum 1 pers./2 m²)",
          value: Math.max(occupancy(value("lMultimedia"), 2), occupancy(value("lMultimediaDeclared"))),
        });
      }
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
        );
        mallShops.forEach((shop, index) => {
          if (shop.surface <= 0) return;
          const divisor = shop.surface < 300
            ? 6
            : shop.level === "lower" ? 3 : shop.level === "second" ? 6 : 15;
          const rule = shop.surface < 300 ? "moins de 300 m²" : "règle du niveau";
          rows.push({
            label: `Boutique ${index + 1} — ${rule} (1 pers./${divisor} m²)`,
            value: occupancy(shop.surface, divisor),
          });
        });
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

    if (type === "O") {
      rows.push({
        label: "Capacité maximale des chambres et appartements",
        value: occupancy(value("oCapacity")),
      });
    }

    if (type === "P") {
      if (pMode === "general") {
        rows.push({
          label: "Salle de danse ou de jeux (4 pers./3 m²)",
          value: occupancy(value("pUsefulArea") * 4, 3),
        });
      } else {
        rows.push(
          { label: "Billards (4 personnes par billard)", value: occupancy(value("pBilliards") * 4) },
          { label: "Places supplémentaires réservées au public", value: occupancy(value("pPublicPlaces")) },
          { label: "Activité annexe de type N", value: occupancy(value("pAnnexN")) },
        );
      }
    }

    if (type === "R") {
      rows.push({
        label: "Effectif maximal simultané selon la déclaration contrôlée",
        value: occupancy(value("rDeclared")),
      });
    }

    if (type === "S") {
      rows.push({
        label: "Effectif selon la déclaration du maître d’ouvrage ou du chef d’établissement",
        value: occupancy(value("sDeclared")),
      });
    }

    if (type === "T") {
      const divisor = tMode === "temporary" ? 1 : 9;
      rows.push({
        label: tMode === "temporary"
          ? "Exposition temporaire (1 pers./m²)"
          : "Exposition permanente (1 pers./9 m²)",
        value: occupancy(value("tPublicArea"), divisor),
      });
    }

    if (type === "U") {
      const visitorDivisor = uVisitorMode === "reduced" ? 2 : 1;
      rows.push(
        { label: "Patients ou résidents (1 personne par lit)", value: occupancy(value("uBeds")) },
        { label: "Personnel (1 personne pour 3 lits)", value: occupancy(value("uBeds"), 3) },
        { label: `Visiteurs (1 personne pour ${visitorDivisor} lit${visitorDivisor > 1 ? "s" : ""})`, value: occupancy(value("uBeds"), visitorDivisor) },
        { label: "Consultations ou explorations externes (8 personnes par poste)", value: occupancy(value("uConsultations") * 8) },
        { label: "Locaux de la section XIV — effectif déclaré", value: occupancy(value("uSection14")) },
        { label: "Autres salles ou locaux recevant du public", value: occupancy(value("uOtherRooms")) },
      );
    }

    if (type === "V") {
      if (vMode === "seats") {
        rows.push(
          { label: "Sièges", value: occupancy(value("vSeats")) },
          { label: "Bancs (2 personnes par mètre)", value: occupancy(value("vBenches") * 2) },
        );
      } else {
        rows.push({ label: "Surface réservée aux fidèles (2 pers./m²)", value: occupancy(value("vStandingArea") * 2) });
      }
    }

    if (type === "W") {
      if (wMode === "declared") {
        rows.push({ label: "Effectif déclaré par le maître d’ouvrage", value: occupancy(value("wDeclared")) });
      } else if (wMode === "planned") {
        rows.push({ label: "Locaux spécialement aménagés pour le public (1 pers./10 m²)", value: occupancy(value("wPublicArea"), 10) });
      } else {
        rows.push({ label: "Aménagements non prévus (1 pers./100 m²)", value: occupancy(value("wFloorArea"), 100) });
      }
    }

    if (type === "X") {
      const spectators =
        occupancy(value("xSpectatorSeats")) +
        occupancy(value("xSpectatorBenches") * 2) +
        occupancy(value("xSpectatorPromenades") * 5);
      let regulatory = 0;
      let rule = "";

      if (xMode === "omnisports") {
        const practice = value("xActivityArea");
        regulatory = Math.max(
          occupancy(practice, 4) + occupancy(value("xTennisCourts") * 25),
          occupancy(practice, 8) + spectators,
        );
        rule = "Salle omnisports : valeur réglementaire la plus élevée";
      } else if (xMode === "ice") {
        regulatory = Math.max(
          occupancy(value("xIceArea") * 2, 3),
          occupancy(value("xIceArea"), 10) + spectators,
        );
        rule = "Patinoire : valeur réglementaire la plus élevée";
      } else if (xMode === "sportsHall") {
        regulatory = occupancy(value("xSportsHallArea")) + spectators;
        rule = "Salle polyvalente sportive (1 pers./m² + spectateurs)";
      } else if (xMode === "indoorPool") {
        regulatory = Math.max(
          occupancy(value("xIndoorWaterArea")),
          occupancy(value("xIndoorWaterArea"), 5) + spectators,
        );
        rule = "Piscine couverte : valeur réglementaire la plus élevée";
      } else if (xMode === "outdoorPool") {
        regulatory = Math.max(
          occupancy(value("xOutdoorWaterArea") * 3, 2),
          occupancy(value("xOutdoorWaterArea"), 5) + spectators,
        );
        rule = "Piscine transformable découverte : valeur réglementaire la plus élevée";
      } else {
        const covered = value("xMixedCoveredArea");
        const uncovered = value("xMixedUncoveredArea");
        regulatory = Math.max(
          occupancy(covered) + occupancy(uncovered * 3, 2),
          occupancy(covered + uncovered, 5) + spectators,
        );
        rule = "Piscine mixte : valeur réglementaire la plus élevée";
      }

      rows.push({
        label: `${rule} (comparée à la déclaration)`,
        value: Math.max(regulatory, occupancy(value("xDeclared"))),
      });
    }

    if (type === "Y") {
      rows.push({ label: "Salles accessibles au public (1 pers./5 m²)", value: occupancy(value("yPublicArea"), 5) });
    }

    const visibleRows = rows.filter((row) => row.value > 0);
    return {
      rows: visibleRows,
      total: visibleRows.reduce((sum, row) => sum + row.value, 0),
    };
  }, [lActivity, lMode, mMode, mallShops, nDeclared, pMode, tMode, type, uVisitorMode, vMode, wMode, xMode, values]);

  const selected = ERP_TYPES.find((item) => item.code === type) ?? ERP_TYPES[0];
  const lBasementThreshold = lActivity === "c" || lActivity === "d" ? 20 : 100;
  const lTotalThreshold = lActivity === "c" || lActivity === "d" ? 50 : 200;
  const lBasementInvalid = type === "L" && lBasement !== "" && lBasement > calculation.total;
  const lThresholdReached =
    calculation.total >= lTotalThreshold ||
    (lBasement !== "" && !lBasementInvalid && lBasement >= lBasementThreshold);
  const nDeclarationInvalid =
    type === "N" &&
    nDeclared &&
    value("nSeats") > 0 &&
    value("nSeatedArea") < value("nSeats") * 2;

  const jResidentThreshold = jSubtype === "elderly" ? 25 : 20;
  const jFirstGroup =
    value("jResidents") >= jResidentThreshold || calculation.total >= 100;
  const jCategory = !jFirstGroup
    ? "5ᵉ catégorie"
    : calculation.total > 1500
      ? "1ʳᵉ catégorie"
      : calculation.total >= 701
        ? "2ᵉ catégorie"
        : calculation.total >= 301
          ? "3ᵉ catégorie"
          : "4ᵉ catégorie";
  const jClassificationReason = !jFirstGroup
    ? `Les deux seuils du premier groupe restent non atteints : moins de ${jResidentThreshold} résidents et moins de 100 personnes au total.`
    : value("jResidents") >= jResidentThreshold
      ? `Premier groupe atteint par le seuil de ${jResidentThreshold} résidents ; la catégorie est ensuite déterminée avec l’effectif total.`
      : "Premier groupe atteint par le seuil de 100 personnes au total ; la catégorie est ensuite déterminée avec l’effectif total.";

  const lClassificationReady =
    calculation.total >= lTotalThreshold ||
    (lBasement !== "" && !lBasementInvalid);
  const lClassificationTotal = calculation.total + occupancy(value("lStaff"));
  const lCategory = !lClassificationReady
    ? "À déterminer"
    : !lThresholdReached
      ? "5ᵉ catégorie"
      : lClassificationTotal > 1500
        ? "1ʳᵉ catégorie"
        : lClassificationTotal >= 701
          ? "2ᵉ catégorie"
          : lClassificationTotal >= 301
            ? "3ᵉ catégorie"
            : "4ᵉ catégorie";
  const lClassificationReason = !lClassificationReady
    ? "Renseignez l’effectif admis en sous-sol pour terminer le classement."
    : !lThresholdReached
      ? `Les seuils du premier groupe ne sont pas atteints : moins de ${lBasementThreshold} personnes en sous-sol et moins de ${lTotalThreshold} personnes au total.`
      : calculation.total >= lTotalThreshold
        ? `Premier groupe atteint par le seuil de ${lTotalThreshold} personnes au total. La catégorie est calculée sur ${lClassificationTotal} personnes, personnel compris.`
        : `Premier groupe atteint par le seuil de ${lBasementThreshold} personnes en sous-sol. La catégorie est calculée sur ${lClassificationTotal} personnes, personnel compris.`;

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
                  <label className="erp-mode-select">
                    <span>Nature de la structure de type J</span>
                    <select value={jSubtype} onChange={(event) => setJSubtype(event.target.value as JSubtype)}>
                      <option value="elderly">Accueil de personnes âgées</option>
                      <option value="disabled">Accueil de personnes handicapées</option>
                    </select>
                  </label>
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
                  <label className="erp-mode-select">
                    <span>Activité principale de la salle (article L 1 § 1)</span>
                    <select
                      value={lActivity}
                      onChange={(event) => {
                        setLActivity(event.target.value as LActivity);
                        setLMode("audience");
                        resetLInputs();
                      }}
                    >
                      {L_ACTIVITIES.map((activity) => (
                        <option key={activity.code} value={activity.code}>
                          {activity.code.toUpperCase()} — {activity.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {(lActivity === "a" || lActivity === "b") && (
                    <label className="erp-mode-select">
                      <span>Configuration de la salle</span>
                      <select
                        value={lMode}
                        onChange={(event) => {
                          setLMode(event.target.value as LMode);
                          resetLInputs();
                        }}
                      >
                        <option value="audience">Places assises, public debout ou files</option>
                        <option value="meeting">Réunion sans spectacle</option>
                      </select>
                    </label>
                  )}

                  {(lActivity === "a" || lActivity === "b") && lMode === "meeting" ? (
                    <NumberField label="Surface totale de la salle de réunion" value={value("lMeeting")} onChange={(next) => setValue("lMeeting", next)} unit="m²" />
                  ) : (lActivity === "a" || lActivity === "b" || lActivity === "c") && (
                    <>
                      <NumberField label="Places assises numérotées" value={value("lNumbered")} onChange={(next) => setValue("lNumbered", next)} unit="places" />
                      <NumberField label="Longueur des bancs non numérotés" value={value("lBenches")} onChange={(next) => setValue("lBenches", next)} unit="m linéaires" />
                      <NumberField label="Surface du public sans siège ni banc" value={value("lStanding")} onChange={(next) => setValue("lStanding", next)} unit="m²" />
                      <NumberField label="Longueur des promenoirs et files d’attente" value={value("lQueues")} onChange={(next) => setValue("lQueues", next)} unit="m linéaires" />
                    </>
                  )}

                  {lActivity === "d" && (
                    <NumberField label="Surface utile du cabaret" value={value("lCabaret")} onChange={(next) => setValue("lCabaret", next)} unit="m²" hint="Déduire les estrades des musiciens et les aménagements fixes autres que les tables et sièges." />
                  )}

                  {(lActivity === "e" || lActivity === "f") && (
                    <NumberField label="Surface totale de la salle polyvalente" value={value("lPolyvalent")} onChange={(next) => setValue("lPolyvalent", next)} unit="m²" />
                  )}

                  {lActivity === "g" && (
                    <>
                      <NumberField label="Surface totale de la salle multimédia" value={value("lMultimedia")} onChange={(next) => setValue("lMultimedia", next)} unit="m²" />
                      <NumberField label="Effectif déclaré par le maître d’ouvrage" value={value("lMultimediaDeclared")} onChange={(next) => setValue("lMultimediaDeclared", next)} unit="personnes" hint="Le résultat retient au minimum 1 personne pour 2 m²." />
                    </>
                  )}

                  <div className="erp-mode-select">
                    <strong>L 1 § 2 · Seuil d’assujettissement</strong>
                    <span>{lBasementThreshold} personnes en sous-sol ou {lTotalThreshold} personnes au total.</span>
                    <label className="erp-number-field">
                      <span>Dont personnes admises en sous-sol (comprises dans le total)</span>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={lBasement}
                          placeholder="À renseigner"
                          onChange={(event) =>
                            setLBasement(event.target.value === "" ? "" : Math.max(0, Math.floor(Number(event.target.value))))
                          }
                        />
                        <small>personnes</small>
                      </div>
                    </label>
                    {lBasementInvalid ? (
                      <span>Vérifiez l’effectif en sous-sol : il dépasse l’effectif total calculé.</span>
                    ) : lThresholdReached ? (
                      <span>Seuil d’assujettissement atteint.</span>
                    ) : lBasement === "" ? (
                      <span>Renseignez l’effectif en sous-sol pour vérifier ce seuil.</span>
                    ) : (
                      <span>Seuil d’assujettissement non atteint avec les valeurs saisies.</span>
                    )}
                  </div>
                  <NumberField
                    label="Personnel à ajouter pour le classement en catégorie"
                    value={value("lStaff")}
                    onChange={(next) => setValue("lStaff", next)}
                    unit="personnes"
                    hint="Ne pas compter le personnel installé dans des locaux indépendants disposant de leurs propres dégagements. Ce nombre n’est pas ajouté à l’effectif du public de l’article L 3."
                  />
                </>
              )}

              {type === "O" && (
                <NumberField
                  label="Nombre maximal de personnes pouvant occuper les chambres ou appartements"
                  value={value("oCapacity")}
                  onChange={(next) => setValue("oCapacity", next)}
                  unit="personnes"
                  hint="Selon l’occupation déclarée ou les conditions d’exploitation hôtelière d’usage. Les salles réservées exclusivement aux clients ne sont pas ajoutées."
                />
              )}

              {type === "P" && (
                <>
                  <label className="erp-mode-select">
                    <span>Configuration de l’établissement</span>
                    <select value={pMode} onChange={(event) => setPMode(event.target.value as PMode)}>
                      <option value="general">Salle de danse ou salle de jeux</option>
                      <option value="billiard">Salle exclusivement réservée au billard</option>
                    </select>
                  </label>
                  {pMode === "general" ? (
                    <NumberField
                      label="Surface utile de la salle"
                      value={value("pUsefulArea")}
                      onChange={(next) => setValue("pUsefulArea", next)}
                      unit="m²"
                      hint="Après déduction des estrades des musiciens et des aménagements fixes autres que les tables et sièges."
                    />
                  ) : (
                    <>
                      <NumberField label="Nombre de billards non électriques ou électroniques" value={value("pBilliards")} onChange={(next) => setValue("pBilliards", next)} unit="billards" />
                      <NumberField label="Places supplémentaires sur chaises, bancs ou gradins" value={value("pPublicPlaces")} onChange={(next) => setValue("pPublicPlaces", next)} unit="places" />
                      <NumberField label="Effectif calculé de l’activité annexe de type N" value={value("pAnnexN")} onChange={(next) => setValue("pAnnexN", next)} unit="personnes" hint="À renseigner uniquement s’il existe une zone de consommation ou de restauration." />
                    </>
                  )}
                </>
              )}

              {type === "R" && (
                <NumberField
                  label="Effectif maximal des personnes admises simultanément"
                  value={value("rDeclared")}
                  onChange={(next) => setValue("rDeclared", next)}
                  unit="personnes"
                  hint="Selon la déclaration contrôlée, qui doit préciser la capacité maximale par niveau."
                />
              )}

              {type === "S" && (
                <NumberField
                  label="Effectif maximal déclaré"
                  value={value("sDeclared")}
                  onChange={(next) => setValue("sDeclared", next)}
                  unit="personnes"
                  hint="Déclaration du maître d’ouvrage ou du chef d’établissement."
                />
              )}

              {type === "T" && (
                <>
                  <label className="erp-mode-select">
                    <span>Nature de l’exposition</span>
                    <select value={tMode} onChange={(event) => setTMode(event.target.value as TMode)}>
                      <option value="temporary">Exposition, foire-exposition ou salon temporaire</option>
                      <option value="permanent">Exposition à caractère permanent</option>
                    </select>
                  </label>
                  <NumberField
                    label="Surface totale des salles accessibles au public"
                    value={value("tPublicArea")}
                    onChange={(next) => setValue("tPublicArea", next)}
                    unit="m²"
                    hint={tMode === "temporary" ? "Calcul : 1 personne par m²." : "Calcul : 1 personne pour 9 m²."}
                  />
                </>
              )}

              {type === "U" && (
                <>
                  <NumberField label="Nombre de lits" value={value("uBeds")} onChange={(next) => setValue("uBeds", next)} unit="lits" />
                  <label className="erp-mode-select">
                    <span>Base de calcul des visiteurs</span>
                    <select value={uVisitorMode} onChange={(event) => setUVisitorMode(event.target.value as UVisitorMode)}>
                      <option value="standard">Règle générale — 1 visiteur par lit</option>
                      <option value="reduced">Cas visés à l’article U 1 — 1 visiteur pour 2 lits</option>
                    </select>
                  </label>
                  <NumberField label="Postes de consultation ou d’exploration externe" value={value("uConsultations")} onChange={(next) => setValue("uConsultations", next)} unit="postes" hint="Calcul : 8 personnes, personnel compris, par poste." />
                  <NumberField label="Effectif déclaré des locaux de la section XIV" value={value("uSection14")} onChange={(next) => setValue("uSection14", next)} unit="personnes" />
                  <NumberField label="Effectif des autres salles ou locaux recevant du public" value={value("uOtherRooms")} onChange={(next) => setValue("uOtherRooms", next)} unit="personnes" hint="À calculer selon le type d’exploitation du local." />
                </>
              )}

              {type === "V" && (
                <>
                  <label className="erp-mode-select">
                    <span>Configuration de l’établissement de culte</span>
                    <select value={vMode} onChange={(event) => setVMode(event.target.value as VMode)}>
                      <option value="seats">Avec sièges ou bancs</option>
                      <option value="standing">Sans siège</option>
                    </select>
                  </label>
                  {vMode === "seats" ? (
                    <>
                      <NumberField label="Nombre de sièges" value={value("vSeats")} onChange={(next) => setValue("vSeats", next)} unit="sièges" />
                      <NumberField label="Longueur totale des bancs" value={value("vBenches")} onChange={(next) => setValue("vBenches", next)} unit="m" hint="Calcul : 1 personne par 0,50 m de banc." />
                    </>
                  ) : (
                    <NumberField label="Surface réservée aux fidèles" value={value("vStandingArea")} onChange={(next) => setValue("vStandingArea", next)} unit="m²" hint="Calcul : 2 personnes par m²." />
                  )}
                </>
              )}

              {type === "W" && (
                <>
                  <label className="erp-mode-select">
                    <span>Méthode de détermination</span>
                    <select value={wMode} onChange={(event) => setWMode(event.target.value as WMode)}>
                      <option value="declared">Déclaration du maître d’ouvrage</option>
                      <option value="planned">Aménagements intérieurs prévus</option>
                      <option value="unplanned">Aménagements intérieurs non prévus</option>
                    </select>
                  </label>
                  {wMode === "declared" && <NumberField label="Effectif maximal déclaré" value={value("wDeclared")} onChange={(next) => setValue("wDeclared", next)} unit="personnes" />}
                  {wMode === "planned" && <NumberField label="Surface des locaux aménagés pour recevoir le public" value={value("wPublicArea")} onChange={(next) => setValue("wPublicArea", next)} unit="m²" hint="Halls, guichets, salles d’attente, etc. : 1 personne pour 10 m²." />}
                  {wMode === "unplanned" && <NumberField label="Surface totale de planchers" value={value("wFloorArea")} onChange={(next) => setValue("wFloorArea", next)} unit="m²" hint="Calcul : 1 personne pour 100 m²." />}
                </>
              )}

              {type === "X" && (
                <>
                  <label className="erp-mode-select">
                    <span>Installation sportive</span>
                    <select value={xMode} onChange={(event) => setXMode(event.target.value as XMode)}>
                      <option value="omnisports">Salle omnisports ou sportive spécialisée</option>
                      <option value="ice">Patinoire</option>
                      <option value="sportsHall">Salle polyvalente à dominante sportive</option>
                      <option value="indoorPool">Piscine couverte</option>
                      <option value="outdoorPool">Piscine transformable découverte</option>
                      <option value="mixedPool">Piscine mixte</option>
                    </select>
                  </label>
                  <NumberField label="Effectif déclaré par le maître d’ouvrage" value={value("xDeclared")} onChange={(next) => setValue("xDeclared", next)} unit="personnes" hint="Le calcul retient automatiquement la valeur la plus élevée entre la déclaration et les densités réglementaires." />

                  {xMode === "omnisports" && (
                    <>
                      <NumberField label="Aire d’activité sportive hors courts de tennis" value={value("xActivityArea")} onChange={(next) => setValue("xActivityArea", next)} unit="m²" />
                      <NumberField label="Nombre de courts de tennis" value={value("xTennisCourts")} onChange={(next) => setValue("xTennisCourts", next)} unit="courts" hint="25 personnes par court pour la première valeur réglementaire." />
                    </>
                  )}
                  {xMode === "ice" && <NumberField label="Surface du plan de patinage" value={value("xIceArea")} onChange={(next) => setValue("xIceArea", next)} unit="m²" />}
                  {xMode === "sportsHall" && <NumberField label="Aire d’activité sportive" value={value("xSportsHallArea")} onChange={(next) => setValue("xSportsHallArea", next)} unit="m²" />}
                  {xMode === "indoorPool" && <NumberField label="Surface du plan d’eau couvert" value={value("xIndoorWaterArea")} onChange={(next) => setValue("xIndoorWaterArea", next)} unit="m²" hint="Ne pas inclure les bassins de plongeon indépendants ni les pataugeoires." />}
                  {xMode === "outdoorPool" && <NumberField label="Surface du plan d’eau découvert" value={value("xOutdoorWaterArea")} onChange={(next) => setValue("xOutdoorWaterArea", next)} unit="m²" hint="Ne pas inclure les bassins de plongeon indépendants ni les pataugeoires." />}
                  {xMode === "mixedPool" && (
                    <>
                      <NumberField label="Surface du plan d’eau couvert" value={value("xMixedCoveredArea")} onChange={(next) => setValue("xMixedCoveredArea", next)} unit="m²" />
                      <NumberField label="Surface du plan d’eau découvert" value={value("xMixedUncoveredArea")} onChange={(next) => setValue("xMixedUncoveredArea", next)} unit="m²" />
                    </>
                  )}

                  <NumberField label="Spectateurs assis sur sièges ou strapontins" value={value("xSpectatorSeats")} onChange={(next) => setValue("xSpectatorSeats", next)} unit="personnes" />
                  <NumberField label="Longueur des bancs de spectateurs" value={value("xSpectatorBenches")} onChange={(next) => setValue("xSpectatorBenches", next)} unit="m" hint="Calcul : 1 personne par 0,50 m." />
                  <NumberField label="Longueur des promenoirs pour spectateurs debout" value={value("xSpectatorPromenades")} onChange={(next) => setValue("xSpectatorPromenades", next)} unit="m" hint="Calcul : 5 personnes par mètre linéaire." />
                </>
              )}

              {type === "Y" && (
                <NumberField
                  label="Surface des salles accessibles au public"
                  value={value("yPublicArea")}
                  onChange={(next) => setValue("yPublicArea", next)}
                  unit="m²"
                  hint="Calcul théorique : 1 personne pour 5 m²."
                />
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
                    <NumberField label="Surface totale des mails (circulations communes)" value={value("mMalls")} onChange={(next) => setValue("mMalls", next)} unit="m²" hint="Ne pas inclure la surface des boutiques dans les mails." />
                  )}

                  {mMode === "general" && (
                    <>
                      <NumberField label="Surface de vente — sous-sol, RDC et 1er étage" value={value("mLower")} onChange={(next) => setValue("mLower", next)} unit="m²" />
                      <NumberField label="Surface de vente — 2e étage" value={value("mSecond")} onChange={(next) => setValue("mSecond", next)} unit="m²" />
                      <NumberField label="Surface de vente — étages supérieurs" value={value("mUpper")} onChange={(next) => setValue("mUpper", next)} unit="m²" />
                    </>
                  )}

                  {mMode === "mall" && (
                    <div className="erp-mall-shops">
                      <div className="erp-mall-shops-heading">
                        <div>
                          <h3>Locaux de vente du centre commercial</h3>
                          <p>Saisissez chaque boutique séparément, même à partir de 300 m². La densité dépend automatiquement de sa surface et de son étage.</p>
                        </div>
                        <button type="button" onClick={addMallShop}>+ Ajouter un local de vente</button>
                      </div>
                      {mallShops.map((shop, index) => {
                        const divisor = shop.surface < 300
                          ? 6
                          : shop.level === "lower" ? 3 : shop.level === "second" ? 6 : 15;
                        return (
                          <div className="erp-mall-shop" key={shop.id}>
                            <div className="erp-mall-shop-heading">
                              <strong>Boutique {index + 1}</strong>
                              <button type="button" onClick={() => removeMallShop(shop.id)} aria-label={`Supprimer la boutique ${index + 1}`}>Supprimer</button>
                            </div>
                            <NumberField
                              label="Surface de vente de cette boutique"
                              value={shop.surface}
                              onChange={(surface) => updateMallShop(shop.id, { surface })}
                              unit="m²"
                            />
                            <label className="erp-mall-shop-level">
                              <span>Étage de la boutique</span>
                              <select
                                value={shop.level}
                                onChange={(event) => updateMallShop(shop.id, { level: event.target.value as ShopLevel })}
                              >
                                <option value="lower">Sous-sol, RDC ou 1er étage</option>
                                <option value="second">2e étage</option>
                                <option value="upper">3e étage et au-delà</option>
                              </select>
                            </label>
                            <p className="erp-mall-shop-result" aria-live="polite">
                              {shop.surface > 0
                                ? `${shop.surface < 300 ? "Moins de 300 m²" : "À partir de 300 m²"} : 1 personne pour ${divisor} m², soit ${occupancy(shop.surface, divisor)} personne(s).`
                                : "Indiquez la surface pour afficher la règle appliquée."}
                            </p>
                          </div>
                        );
                      })}
                    </div>
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

          {type === "J" && calculation.total > 0 && (
            <div className="erp-calculation-rows" aria-live="polite">
              <div>
                <span>Classement ERP</span>
                <b>{jCategory}</b>
              </div>
              <p>{jClassificationReason}</p>
              {!jFirstGroup && calculation.total >= 7 && (
                <p>
                  Établissement du second groupe : les dispositions PE applicables aux petits établissements de type J avec locaux à sommeil doivent également être vérifiées.
                </p>
              )}
            </div>
          )}

          {type === "L" && calculation.total > 0 && (
            <div className="erp-calculation-rows" aria-live="polite">
              <div>
                <span>Classement ERP</span>
                <b>{lCategory}</b>
              </div>
              <div>
                <span>Effectif retenu pour la catégorie</span>
                <b>{lClassificationTotal}</b>
              </div>
              <p>{lClassificationReason}</p>
            </div>
          )}

          <p className="erp-rounding-note">
            Les résultats fractionnaires sont arrondis à l’entier supérieur.
          </p>
        </aside>
      </div>
    </section>
  );
}
