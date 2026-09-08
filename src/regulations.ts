export type ModuleValue = string | number;
export type ModuleAnswers = Record<string, ModuleValue>;
export type ResultTone = "success" | "warning" | "danger" | "neutral";

export type QuestionDef = {
  id: string;
  index: string;
  title: string;
  hint?: string;
  type: "yesno" | "number" | "select";
  options?: string[];
  unit?: string;
};

export type ResultDef = { label: string; text: string; tone: ResultTone };

export type ModuleContext = {
  family: "1" | "2" | "3A" | "3B" | "4" | "IGH" | "NC";
  familyLabel: string;
  collective: boolean;
  height: number;
  stairDistance: number;
};

export type ModuleConfig = {
  title: string;
  kicker: string;
  intro: string;
  questions: QuestionDef[];
  results: ResultDef[];
  reminder: string[];
};

export const initialModuleAnswers: ModuleAnswers = {
  s_balcon: "Oui", s_basement: "Oui", s_crawl: "Oui", s_topWalls: "Non", s_walkways: "Non",
  w_banded: "Oui", w_jumel: "Oui", w_locals: "Oui",
  c_present: "Oui", c_parking: "Non", c_stair: "Non", c_distance: 18, c_air: "Non", c_cages: 2,
  f_isolated: "Non", f_classE: "Non", f_limit: 4, f_airgap: "Non", f_lab: "Non", f_open: "Oui", f_mass: 130, f_cd: 65, f_angle: 140,
  r_class: "M4", r_support: "Non", r_penetration: "T/5", r_distance: 11, r_neighbor: "2", r_banded: "Oui", r_length: 46,
  i_disposition: "B", i_location: "Paroi verticale", i_rating: "A2-s2,d0 (ou plus performant)", i_position: "Plafond / Sous-face plancher", i_duration: 30,
  e_under8: "Non", e_pf: "Non", e_position: "Latérale (dièdre > 135°)", e_distance: 2,
  n_wall: "CF 15", n_imposts: "Oui", n_impostRating: "PF 15", n_doors: "Oui", n_doorRating: "PF 30", n_closer: "Oui", n_exit: "Oui", n_room: "Non",
  t_floor: "M4", t_ceiling: "M2", t_walls: "M2", t_incombustible: "Oui", t_basementLink: "Oui", t_door: "Oui", t_doorRating: "CF 60", t_doorConditions: "Oui",
  p_type: "Intérieur", p_smokeDevice: "Oui", p_system: "Électrique", p_command: "Oui", p_detector: "Oui", p_circulation: "Oui", p_noShaft: "Oui", p_lighting: "Oui", p_conduits: "C2", p_airOpen: "Oui", p_airOpenDoors: "Non", p_airOpenDoorsCompliant: "Oui", p_walls: "Oui", p_door: "Oui", p_topDevice: "Ouverture horizontale 1 m²", p_closedExit: "Oui",
};

const yn = (id: string, index: string, title: string, hint?: string): QuestionDef => ({ id, index, title, hint, type: "yesno" });
const num = (id: string, index: string, title: string, unit: string, hint?: string): QuestionDef => ({ id, index, title, hint, type: "number", unit });
const select = (id: string, index: string, title: string, options: string[], hint?: string): QuestionDef => ({ id, index, title, hint, type: "select", options });
const result = (label: string, text: string, tone: ResultTone): ResultDef => ({ label, text, tone });
const yes = (a: ModuleAnswers, key: string) => String(a[key] ?? "").toLowerCase() === "oui";
const no = (a: ModuleAnswers, key: string) => String(a[key] ?? "").toLowerCase() === "non";
const value = (a: ModuleAnswers, key: string) => Number(a[key]);
const answered = (a: ModuleAnswers, key: string) => a[key] !== undefined && String(a[key]).trim() !== "";

function fireDuration(raw: ModuleValue): number {
  const text = String(raw ?? "").toUpperCase().replaceAll(" ", "");
  if (text.includes("120")) return 120;
  if (text.includes("60") || text === "CF1H" || text === "PF1H") return 60;
  if (text.includes("30") || text.includes("1/2H")) return 30;
  if (text.includes("15") || text.includes("1/4H")) return 15;
  return 0;
}

function reactionRank(raw: ModuleValue): number {
  const match = String(raw ?? "").toUpperCase().match(/M([0-4])/);
  return match ? Number(match[1]) : 99;
}

function article18FacadeCompliance(a: ModuleAnswers) {
  const position = String(a.e_position);
  const minimum = position.startsWith("Latérale") ? 2 : position.startsWith("En retour") ? 4 : 8;
  const distance = value(a, "e_distance");
  return {
    compliant: yes(a, "e_pf") || distance >= minimum,
    distance,
    minimum,
    position,
  };
}

function structure(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const stability = ({ "1": 15, "2": 30, "3A": 60, "3B": 60, "4": 90 } as Record<string, number>)[ctx.family] ?? 0;
  const floorFire = stability;
  const r: ResultDef[] = [
    result("Éléments porteurs verticaux", stability ? `Stabilité au feu requise : SF ${stability} minutes.` : "Classement hors périmètre de ce module.", stability ? "warning" : "neutral"),
    result("Balcons, coursives et circulations à l’air libre", yes(a, "s_balcon") && ctx.family !== "1" ? "Structures indépendantes : SF 30 minutes ou R 30 obligatoire." : "Non applicable pour la configuration déclarée.", yes(a, "s_balcon") && ctx.family !== "1" ? "warning" : "neutral"),
  ];
  if (ctx.family === "1") {
    r.push(result("Planchers", yes(a, "s_basement") ? "CF 15 minutes sur le plancher haut du sous-sol uniquement." : "Pas de sous-sol : aucune exigence spécifique sur les planchers.", yes(a, "s_basement") ? "warning" : "success"));
  } else {
    r.push(result("Planchers", `CF ${floorFire} minutes sur tous les planchers entre logements.`, "warning"));
  }
  r.push(
    result("Vide sanitaire", yes(a, "s_crawl") ? "Vide sanitaire non accessible : pas d’exigence CF sur ce plancher." : "Exception non applicable.", yes(a, "s_crawl") ? "success" : "neutral"),
    result("Plancher haut du dernier niveau", yes(a, "s_topWalls") ? "Pas d’exigence CF : parois prolongées jusqu’à la couverture." : "L’exigence CF reste applicable.", yes(a, "s_topWalls") ? "success" : "warning"),
    result("Coursives et passerelles", yes(a, "s_walkways") ? `Pare-flammes ${ctx.family === "1" ? "15" : "30"} minutes ou RE ${ctx.family === "1" ? "15" : "30"}.` : "Non applicable.", yes(a, "s_walkways") ? "warning" : "neutral"),
  );
  return {
    title: "Éléments porteurs & planchers", kicker: "Articles 5 et 6", intro: "Déterminez les degrés de stabilité et de résistance au feu à retenir pour la structure du projet.",
    questions: [
      yn("s_balcon", "01", "Le bâtiment comporte-t-il des balcons, coursives ou circulations à l’air libre à structure indépendante ?"),
      yn("s_basement", "02", "Le bâtiment comporte-t-il un sous-sol ?"),
      yn("s_crawl", "03", "Existe-t-il un vide sanitaire non accessible ?"),
      yn("s_topWalls", "04", "Les parois verticales du dernier niveau sont-elles prolongées jusqu’à la couverture ?"),
      yn("s_walkways", "05", "Existe-t-il des coursives ou passerelles extérieures ?"),
    ], results: r,
    reminder: ["Art. 5 : SF 15 min en 1re famille, 30 min en 2e, 60 min en 3e, 90 min en 4e.", "Art. 6 : les coursives sont PF 15 min ou RE 15 en 1re famille, PF 30 min ou RE 30 au-delà."],
  };
}

function walls(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const recoupement = ({ "1": 30, "2": 60, "3A": 90, "3B": 90, "4": 90 } as Record<string, number>)[ctx.family] ?? 0;
  const r: ResultDef[] = [];
  if (yes(a, "w_banded")) {
    r.push(result("Art. 7 · Mur de recoupement", `CF ${recoupement} minutes tous les 45 m.`, "warning"));
    r.push(result("Art. 7 · Bloc-porte", `CF ${ctx.family === "4" ? 60 : 30} minutes dans le mur de recoupement.`, "warning"));
  } else {
    r.push(result("Article 7", "Non applicable : pas de groupement en bande ni de bâtiment de grande longueur.", "neutral"));
  }
  r.push(result("Art. 8 · Parois séparatives", yes(a, "w_jumel") && ["1", "2"].includes(ctx.family) ? "CF 15 minutes entre logements juxtaposés." : "Non applicable à la configuration déclarée.", yes(a, "w_jumel") && ["1", "2"].includes(ctx.family) ? "warning" : "neutral"));
  if (ctx.family === "1" || (ctx.family === "2" && !ctx.collective)) {
    r.push(result("Art. 8 · Enveloppe du logement", "Non applicable.", "neutral"), result("Art. 8 · Portes palières", "Non applicable.", "neutral"));
  } else {
    r.push(result("Art. 8 · Enveloppe du logement", `Parois verticales hors façades : CF ${ctx.family === "4" ? 60 : 30} minutes.`, "warning"));
    r.push(result("Art. 8 · Portes palières", `Pare-flammes ${ctx.family === "4" ? 30 : 15} minutes.`, "warning"));
  }
  r.push(result("Art. 9 · Locaux collectifs > 50 m²", yes(a, "w_locals") ? "Réglementation ERP applicable." : "Non applicable.", yes(a, "w_locals") ? "danger" : "success"));
  return {
    title: "Parois & recoupement", kicker: "Articles 7 à 9", intro: "Vérifiez le recoupement des bâtiments longs, les séparations entre logements et les locaux collectifs.",
    questions: [
      yn("w_banded", "01", "Le projet est-il un groupement en bande ou un bâtiment de grande longueur ?", "Recoupement à vérifier tous les 45 mètres."),
      yn("w_jumel", "02", "Le bâtiment comporte-t-il des habitations individuelles jumelées ou en bande ?"),
      yn("w_locals", "03", "Le bâtiment comporte-t-il des locaux collectifs résidentiels de plus de 50 m² ?"),
    ], results: r,
    reminder: ["Art. 7 : recoupement tous les 45 m.", "Art. 8 : portes palières PF 15 min en 2e collective et 3e famille, PF 30 min en 4e famille.", "Art. 9 : un local collectif de plus de 50 m² relève de la réglementation ERP."],
  };
}

function cellars(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const questions: QuestionDef[] = [yn("c_present", "01", "Le bâtiment comporte-t-il des celliers ou caves indépendants des logements ?")];
  const r: ResultDef[] = [];
  if (ctx.family === "1") {
    r.push(result("Applicabilité", "Article 10 non applicable à la 1re famille.", "neutral"));
  } else if (no(a, "c_present")) {
    r.push(result("Applicabilité", "Article 10 non applicable : aucun cellier ou cave indépendant déclaré.", "neutral"));
  } else {
    const lowSecondFamily = ctx.family === "2" && ctx.height < 8;
    if (lowSecondFamily) {
      questions.push(num("c_distance", "02", "Distance entre la porte la plus éloignée et la sortie de l’ensemble", "mètres"));
      r.push(result("Applicabilité", "2e famille avec plancher bas inférieur à 8 m : communication autorisée.", "success"));
      r.push(result("Distance à la sortie", value(a, "c_distance") <= 20 ? `Conforme : ${value(a, "c_distance")} m, maximum 20 m.` : `Non conforme : ${value(a, "c_distance")} m dépasse 20 m.`, value(a, "c_distance") <= 20 ? "success" : "danger"));
    } else {
      questions.push(
        yn("c_parking", "02", "Les blocs-portes s’ouvrent-ils sur un parc de stationnement ?"),
        yn("c_stair", "03", "Les blocs-portes s’ouvrent-ils sur des escaliers encloisonnés desservant les logements ?"),
        num("c_distance", "04", "Distance entre la porte la plus éloignée et la sortie de l’ensemble", "mètres"),
        yn("c_air", "05", "Une aération donne-t-elle directement sur d’autres circulations de l’immeuble ?"),
        num("c_cages", "06", "Nombre de cages d’escalier desservant l’ensemble", "cages"),
      );
      r.push(
        result("Applicabilité", `Article 10 applicable : ${ctx.familyLabel}, celliers indépendants présents.`, "warning"),
        result("Parois de séparation", "CF 60 minutes obligatoire.", "warning"),
        result("Blocs-portes", "CF 30 minutes, ferme-porte et ouverture sans clé depuis l’intérieur.", "warning"),
        result("Ouverture sur stationnement", yes(a, "c_parking") ? "Autre accès obligatoire et sas entre parc et celliers." : "Pas d’ouverture sur parc : conforme.", yes(a, "c_parking") ? "danger" : "success"),
        result("Ouverture sur escalier encloisonné", yes(a, "c_stair") ? "Non conforme : ouverture formellement interdite." : "Aucune ouverture : conforme.", yes(a, "c_stair") ? "danger" : "success"),
        result("Distance à la sortie", value(a, "c_distance") <= 20 ? `Conforme : ${value(a, "c_distance")} m, maximum 20 m.` : `Non conforme : ${value(a, "c_distance")} m dépasse 20 m.`, value(a, "c_distance") <= 20 ? "success" : "danger"),
        result("Aération", yes(a, "c_air") ? "Non conforme : aération vers les circulations interdite." : "Pas d’aération vers les circulations : conforme.", yes(a, "c_air") ? "danger" : "success"),
        result("Recoupement", value(a, "c_cages") > 0 ? `${value(a, "c_cages")} volume(s), un par cage : parois CF 60 et portes PF 30.` : "Indiquez un nombre de cages valide.", value(a, "c_cages") > 0 ? "warning" : "neutral"),
      );
    }
  }
  return {
    title: "Celliers & caves indépendants", kicker: "Article 10", intro: "Contrôlez les séparations, accès, distances et aérations des ensembles de celliers ou caves.", questions, results: r,
    reminder: ["Distance maximale entre la porte la plus éloignée et la sortie : 20 m.", "Ouverture interdite sur un escalier encloisonné desservant les logements.", "Recoupement par cage : parois CF 60 min et portes PF 30 min."],
  };
}

function facades(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const third = ctx.family === "3A" || ctx.family === "3B";
  const questions: QuestionDef[] = third ? [
    yn("f_airgap", "01", "Le système de façade comporte-t-il une lame d’air ?"),
    yn("f_lab", "02", "Disposez-vous d’une appréciation de laboratoire agréé ?"),
    yn("f_open", "03", "La façade comporte-t-elle des ouvertures ?"),
  ] : [
    yn("f_isolated", "01", "Le bâtiment est-il une maison individuelle isolée ?"),
    yn("f_classE", "02", "Le parement extérieur des parties pleines est-il classé E ?"),
    num("f_limit", "03", "Distance entre la façade et la limite de propriété", "mètres"),
  ];
  if (third && yes(a, "f_open")) questions.push(num("f_mass", "04", "Masse combustible mobilisable M de la façade", "MJ/m²"), num("f_cd", "05", "Valeur C+D mesurée sur le projet", "cm"));
  if (third && no(a, "f_open")) questions.push(num("f_angle", "04", "Angle du dièdre avec une façade contiguë comportant des ouvertures", "degrés", "Laissez 0 si aucune façade contiguë n’est concernée."));
  const r: ResultDef[] = [];
  if (ctx.family === "1") {
    const exception = yes(a, "f_isolated") && yes(a, "f_classE") && value(a, "f_limit") >= 4;
    r.push(result("Art. 12 · Parement extérieur", exception ? `Exception applicable : parement E autorisé à ${value(a, "f_limit")} m de la limite.` : "Parement D-s3,d0 ou bois minimum.", exception ? "success" : "warning"));
  } else if (ctx.family === "2") {
    r.push(result("Art. 12 · Parement extérieur", "Parement D-s3,d0 minimum.", "warning"));
  } else if (third) {
    r.push(result("Art. 13 · Système de façade", yes(a, "f_lab") ? "Solution 2 justifiée par appréciation de laboratoire : conforme." : no(a, "f_airgap") ? "Solution 1 possible : chaque élément doit être A2-s3,d0, sans lame d’air." : "Lame d’air sans appréciation : recoupement et appréciation de laboratoire requis.", yes(a, "f_lab") ? "success" : no(a, "f_airgap") ? "warning" : "danger"));
    if (yes(a, "f_open")) {
      const mass = value(a, "f_mass");
      const minimum = ctx.family === "3A" ? (mass <= 80 ? 60 : mass <= 130 ? 80 : 110) : (mass <= 80 ? 80 : mass <= 130 ? 100 : 130);
      const measured = value(a, "f_cd");
      r.push(result("Art. 14 · Règle C+D", measured >= minimum ? `Conforme : ${measured} cm, minimum ${minimum} cm pour M = ${mass} MJ/m².` : `Non conforme : ${measured} cm, minimum requis ${minimum} cm pour M = ${mass} MJ/m².`, measured >= minimum ? "success" : "danger"));
    } else {
      const angle = value(a, "f_angle");
      r.push(result("Art. 14 · Façade sans ouverture", angle === 0 ? "Façade isolée : aucune exigence spécifique de cet article." : angle <= 135 ? `Dièdre ${angle}° : traiter la façade comme une façade avec ouverture et appliquer C+D.` : `Dièdre ${angle}° : degré coupe-feu 30 minutes dans les deux sens.`, angle === 0 ? "success" : "warning"));
    }
  } else {
    r.push(result("Applicabilité", "Classement hors périmètre du module du classeur source.", "neutral"));
  }
  return {
    title: "Façades & propagation du feu", kicker: "Articles 11 à 14", intro: "Analysez les parements, systèmes avec lame d’air et la règle du C+D.", questions, results: r,
    reminder: ["3e famille A : C+D minimal 60 / 80 / 110 cm selon M.", "3e famille B : C+D minimal 80 / 100 / 130 cm selon M.", "Dièdre supérieur à 135° : façade sans ouverture CF 30 min dans les deux sens."],
  };
}

function roofs(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const questions: QuestionDef[] = [
    select("r_class", "01", "Classement du revêtement de couverture", ["M1", "M2", "M3", "M4"]),
    yn("r_support", "02", "Le revêtement est-il établi sur un support continu incombustible ?"),
  ];
  const needsPenetration = String(a.r_class) === "M4" || no(a, "r_support");
  if (needsPenetration) questions.push(select("r_penetration", "03", "Classe de pénétration", ["T/5", "T/15", "T/30", "Moins performant"]));
  if (String(a.r_class) === "M4") questions.push(num("r_distance", "04", "Distance à l’immeuble voisin ou à la limite de propriété", "mètres"), select("r_neighbor", "05", "Indice de propagation de la couverture voisine", ["1", "2", "3"]));
  questions.push(yn("r_banded", "06", "Le bâtiment fait-il partie d’un ensemble en bande ou d’immeubles jointifs ?"));
  if (yes(a, "r_banded")) questions.push(num("r_length", "07", "Longueur totale de l’ensemble mesurée suivant son axe", "mètres"));
  const allowed = ctx.family === "1" ? ["T/5", "T/15", "T/30"] : ctx.family === "2" ? ["T/15", "T/30"] : ["T/30"];
  const r: ResultDef[] = [];
  if (["M1", "M2", "M3"].includes(String(a.r_class)) && yes(a, "r_support")) {
    r.push(result("Revêtement", `${a.r_class} sur support incombustible : utilisation libre.`, "success"));
  } else {
    r.push(result("Revêtement", `${a.r_class} soumis à la classe de pénétration.`, "warning"));
    r.push(result("Classe de pénétration", allowed.includes(String(a.r_penetration)) ? `${a.r_penetration} admise pour ${ctx.familyLabel}.` : `Non conforme : classe admise ${allowed.join(" ou ")}.`, allowed.includes(String(a.r_penetration)) ? "success" : "danger"));
  }
  if (String(a.r_class) === "M4") {
    const distance = value(a, "r_distance");
    if (distance > 12) r.push(result("Indice de propagation", "Aucune restriction au-delà de 12 m.", "success"));
    else {
      const neighbor = Number(a.r_neighbor);
      const minimum = distance < 4 ? (neighbor === 1 ? 1 : 0) : distance < 8 ? (neighbor === 1 ? 2 : neighbor === 2 ? 1 : 0) : (neighbor === 1 ? 3 : neighbor === 2 ? 2 : neighbor === 3 ? 1 : 0);
      r.push(result("Indice de propagation", minimum ? `Indice minimal requis : ${minimum}.` : "Combinaison non prévue par le tableau de l’article 15.", minimum ? "warning" : "neutral"));
    }
  }
  r.push(result("Bâtiment distinct", no(a, "r_banded") ? "Habitation isolée ou jumelée : bâtiment distinct." : value(a, "r_length") <= 45 ? `Ensemble de ${value(a, "r_length")} m : bâtiment distinct.` : `Ensemble de ${value(a, "r_length")} m : analyse par tronçons nécessaire.`, no(a, "r_banded") || value(a, "r_length") <= 45 ? "success" : "warning"));
  return {
    title: "Couvertures", kicker: "Article 15", intro: "Vérifiez le classement du revêtement, la pénétration, la propagation et la notion de bâtiment distinct.", questions, results: r,
    reminder: ["Au-delà de 12 m, toute couverture peut être utilisée sans restriction.", "Un ensemble en bande constitue un bâtiment distinct jusqu’à 45 m de longueur."],
  };
}

function insulation(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const dispositionA = String(a.i_disposition) === "A";
  const questions: QuestionDef[] = [select("i_disposition", "01", "Disposition retenue", ["A", "B"], "A : classement du matériau · B : protection par écran thermique")];
  const r: ResultDef[] = [result("Disposition", dispositionA ? "Disposition A : classement du matériau." : "Disposition B : protection par écran thermique.", "warning")];
  if (dispositionA) {
    questions.push(select("i_location", "02", "Localisation du matériau", ["Paroi verticale", "Plafond", "Toiture", "Plancher / Sol"]), select("i_rating", "03", "Classement de réaction au feu", ["A2-s2,d0 (ou plus performant)", "A2fl-s1 (ou plus performant)", "Autre (moins performant)"]));
    const floor = String(a.i_location) === "Plancher / Sol";
    const expected = floor ? "A2fl-s1 (ou plus performant)" : "A2-s2,d0 (ou plus performant)";
    r.push(result("Classement requis", floor ? "A2fl-s1." : "A2-s2,d0.", "warning"));
    r.push(result("Conformité", String(a.i_rating) === expected ? "Le matériau respecte le classement exigé." : "Le matériau ne respecte pas le classement exigé.", String(a.i_rating) === expected ? "success" : "danger"));
  } else {
    const third = ctx.family === "3A" || ctx.family === "3B";
    if (third) questions.push(select("i_position", "02", "Position de la paroi protégée", ["Plafond / Sous-face plancher", "Paroi verticale", "Sol", "Plafond situé au dernier niveau"]));
    questions.push(num("i_duration", third ? "03" : "02", "Durée de protection de l’écran thermique", "minutes"));
    const minimum = third && String(a.i_position) === "Plafond / Sous-face plancher" ? 30 : 15;
    r.push(result("Durée minimale", `${minimum} minutes pour la configuration déclarée.`, "warning"));
    r.push(result("Conformité", value(a, "i_duration") >= minimum ? `Conforme : ${value(a, "i_duration")} minutes.` : `Non conforme : ${value(a, "i_duration")} minutes, minimum ${minimum}.`, value(a, "i_duration") >= minimum ? "success" : "danger"));
  }
  return {
    title: "Matériaux d’isolation", kicker: "Article 16", intro: "Choisissez entre le classement intrinsèque du matériau et sa protection par écran thermique.", questions, results: r,
    reminder: ["Disposition A : A2-s2,d0 sur parois, plafonds et toitures ; A2fl-s1 sur sols.", "Disposition B : écran 15 min, porté à 30 min sous plafonds et planchers en 3e famille."],
  };
}

function stairsFacade(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const individual = !ctx.collective;
  const questions: QuestionDef[] = [];
  const r: ResultDef[] = [];
  if (individual) {
    r.push(result("Applicabilité", "Article 18 non applicable aux habitations individuelles.", "success"));
  } else {
    if (ctx.family === "2") questions.push(yn("e_under8", "01", "Le plancher le plus haut desservi par l’escalier est-il situé à 8 m ou moins ?"));
    const exempt = ctx.family === "2" && yes(a, "e_under8");
    if (exempt) {
      r.push(result("Applicabilité", "Article 18 non applicable : 2e famille collective, plancher desservi à 8 m ou moins.", "success"));
    } else {
      questions.push(yn("e_pf", ctx.family === "2" ? "02" : "01", "Les parois de la cage situées en façade sont-elles intégralement PF 30 minutes ?"));
      r.push(result("Applicabilité", "Article 18 applicable aux parois de cage d’escalier en façade.", "warning"));
      if (yes(a, "e_pf")) {
        r.push(result("Parois", "Parois intégralement PF 30 minutes : conforme.", "success"));
      } else {
        questions.push(select("e_position", ctx.family === "2" ? "03" : "02", "Position de la façade voisine comportant des fenêtres", ["Latérale (dièdre > 135°)", "En retour (dièdre 90° à 135°)", "Vis-à-vis (dièdre < 90°)"]), num("e_distance", ctx.family === "2" ? "04" : "03", "Distance entre partie non PF et fenêtre voisine", "mètres"));
        const article18 = article18FacadeCompliance(a);
        r.push(result("Parois", "Certaines parties ne sont pas PF 30 minutes : distance à contrôler.", "warning"));
        r.push(result("Distance", article18.compliant ? `Conforme : ${article18.distance} m, minimum ${article18.minimum} m.` : `Non conforme : ${article18.distance} m, minimum ${article18.minimum} m.`, article18.compliant ? "success" : "danger"));
      }
    }
  }
  return {
    title: "Escaliers en façade", kicker: "Article 18", intro: "Contrôlez la résistance des parois de cage et les distances aux fenêtres voisines.", questions, results: r,
    reminder: ["Distance minimale : 2 m en façade latérale, 4 m en retour, 8 m en vis-à-vis.", "Les parois situées en façade sont en principe PF 30 minutes."],
  };
}

function stairsInside(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const r: ResultDef[] = [];
  const questions: QuestionDef[] = [];
  if (!ctx.collective) {
    r.push(result("Applicabilité", "Articles 19 et 20 non applicables aux habitations individuelles.", "success"));
  } else if (ctx.family === "2") {
    questions.push(select("n_wall", "01", "Degré coupe-feu des parois non situées en façade", ["CF 15", "CF 30", "CF 60", "CF 120"]));
    if (ctx.height > 8) questions.push(yn("n_doors", "02", "Existe-t-il des portes séparant l’escalier des circulations horizontales ?"));
    const wall = fireDuration(a.n_wall);
    r.push(result("Applicabilité", "Article 19 applicable à l’habitation collective de 2e famille.", "warning"));
    r.push(result("Parois", wall >= 30 ? `Conforme : CF ${wall} min, minimum 30 min.` : `Non conforme : CF ${wall} min, minimum 30 min.`, wall >= 30 ? "success" : "danger"));
    r.push(result("Portes séparatives", ctx.height <= 8 ? "Non exigées : hauteur du plancher à 8 m ou moins." : yes(a, "n_doors") ? "Portes séparatives présentes : conforme." : "Non conforme : portes séparatives exigées au-dessus de 8 m.", ctx.height <= 8 ? "neutral" : yes(a, "n_doors") ? "success" : "danger"));
  } else if (ctx.family === "3A" || ctx.family === "3B") {
    questions.push(
      select("n_wall", "01", "Degré coupe-feu des parois non situées en façade", ["CF 15", "CF 30", "CF 60", "CF 120"]),
      yn("n_imposts", "02", "Les parois comportent-elles des impostes ou oculus ?"),
    );
    if (yes(a, "n_imposts")) questions.push(select("n_impostRating", "03", "Degré pare-flammes des impostes ou oculus", ["PF 15", "PF 30", "PF 60", "PF 120"]));
    questions.push(yn("n_doors", "04", "Existe-t-il des portes séparant l’escalier des circulations horizontales ?"));
    if (yes(a, "n_doors")) questions.push(select("n_doorRating", "05", "Degré pare-flammes des blocs-portes", ["PF 15", "PF 30", "PF 60", "PF 120"]), yn("n_closer", "06", "Chaque porte est-elle munie d’un ferme-porte ?"), yn("n_exit", "07", "Chaque porte s’ouvre-t-elle dans le sens de la sortie ?"));
    questions.push(yn("n_room", "08", "Un local s’ouvre-t-il directement sur l’escalier ?"));
    const wall = fireDuration(a.n_wall);
    r.push(result("Applicabilité", "Article 20 applicable à l’habitation de 3e famille.", "warning"));
    r.push(result("Parois", wall >= 60 ? `Conforme : CF ${wall} min, minimum 60 min.` : `Non conforme : CF ${wall} min, minimum 60 min.`, wall >= 60 ? "success" : "danger"));
    const impost = fireDuration(a.n_impostRating);
    r.push(result("Impostes et oculus", no(a, "n_imposts") ? "Aucune imposte ni oculus : conforme." : impost >= 60 ? `Conforme : PF ${impost} min.` : `Non conforme : PF ${impost} min, minimum 60 min.`, no(a, "n_imposts") || impost >= 60 ? "success" : "danger"));
    const doorAnomalies = [fireDuration(a.n_doorRating) < 30 ? "PF inférieur à 30 min" : "", no(a, "n_closer") ? "ferme-porte absent" : "", no(a, "n_exit") ? "mauvais sens d’ouverture" : ""].filter(Boolean);
    r.push(result("Blocs-portes", no(a, "n_doors") ? "Non conforme : blocs-portes séparatifs absents." : doorAnomalies.length ? `Non conforme : ${doorAnomalies.join(" ; ")}.` : "Conforme : PF 30 min, ferme-porte et sens de sortie.", yes(a, "n_doors") && !doorAnomalies.length ? "success" : "danger"));
    r.push(result("Locaux ouvrant sur l’escalier", yes(a, "n_room") ? "Non conforme : aucun local ne doit s’ouvrir sur l’escalier." : "Conforme : aucun local ne s’ouvre sur l’escalier.", yes(a, "n_room") ? "danger" : "success"));
  } else {
    r.push(result("Applicabilité", "Le classeur source ne traite les articles 19–20 que pour les 2e et 3e familles.", "neutral"));
  }
  return {
    title: "Escaliers non situés en façade", kicker: "Articles 19 et 20", intro: "Contrôlez les parois, impostes, oculus, blocs-portes et ouvertures sur les cages d’escalier.", questions, results: r,
    reminder: ["Art. 19 : parois CF 30 min ; portes séparatives exigées au-dessus de 8 m.", "Art. 20 : parois et impostes PF/CF 60 min ; blocs-portes PF 30 min avec ferme-porte."],
  };
}

function stairsFinishes(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const questions: QuestionDef[] = [];
  const r: ResultDef[] = [];
  if (!ctx.collective) {
    r.push(result("Applicabilité", "Articles 22 à 24 non applicables aux habitations individuelles.", "success"));
  } else {
    questions.push(
      select("t_floor", "01", "Classement de réaction au feu du revêtement de sol", ["M0", "M1", "M2", "M3", "M4"]),
      select("t_ceiling", "02", "Classement de réaction au feu des plafonds et rampants", ["M0", "M1", "M2", "M3", "M4"]),
      select("t_walls", "03", "Classement de réaction au feu des parois verticales", ["M0", "M1", "M2", "M3", "M4"]),
    );

    const article22Applies = ctx.family === "3A" || ctx.family === "3B" || ctx.family === "4";
    if (article22Applies) questions.push(yn("t_incombustible", "04", "Les marches, volées et paliers sont-ils construits en matériaux incombustibles ?"));
    questions.push(yn("t_basementLink", article22Applies ? "05" : "04", "L’escalier met-il en communication les sous-sols et le reste du bâtiment ?"));
    if (yes(a, "t_basementLink")) {
      questions.push(yn("t_door", article22Applies ? "06" : "05", "Au moins un bloc-porte sépare-t-il le sous-sol du reste du bâtiment ?"));
      if (yes(a, "t_door")) {
        questions.push(
          select("t_doorRating", article22Applies ? "07" : "06", "Degré coupe-feu du bloc-porte", ["CF 15", "CF 30", "CF 60", "CF 120"]),
          yn("t_doorConditions", article22Applies ? "08" : "07", "Le bloc-porte possède-t-il un ferme-porte, s’ouvre-t-il dans le sens de la sortie et l’escalier du sous-sol aboutit-il au RDC sans être en continuité avec l’escalier des étages ?"),
        );
      }
    }

    if (article22Applies) {
      r.push(result("Art. 22 · Marches, volées et paliers", yes(a, "t_incombustible") ? "Conforme : les éléments porteurs de l’escalier sont incombustibles." : "Non conforme : les marches, volées et paliers doivent être construits en matériaux incombustibles.", yes(a, "t_incombustible") ? "success" : "danger"));
    } else {
      r.push(result("Article 22", "Non applicable à l’habitation collective de 2e famille.", "neutral"));
    }

    const requiredClass = ctx.family === "2" ? 2 : 0;
    const requiredLabel = `M${requiredClass}`;
    const ceilingOkay = reactionRank(a.t_ceiling) <= requiredClass;
    const wallsOkay = reactionRank(a.t_walls) <= requiredClass;
    r.push(
      result("Art. 23 · Revêtement de sol", `${a.t_floor} relevé à titre informatif : l’article 23 ne fixe pas d’exigence pour le sol de la circulation.`, "success"),
      result("Art. 23 · Plafonds et rampants", ceilingOkay ? `Conforme : ${a.t_ceiling}, exigence ${requiredLabel} ou plus performante.` : `Non conforme : ${a.t_ceiling}, classement ${requiredLabel} ou plus performant exigé.`, ceilingOkay ? "success" : "danger"),
      result("Art. 23 · Parois verticales", wallsOkay ? `Conforme : ${a.t_walls}, exigence ${requiredLabel} ou plus performante.` : `Non conforme : ${a.t_walls}, classement ${requiredLabel} ou plus performant exigé.`, wallsOkay ? "success" : "danger"),
    );

    if (no(a, "t_basementLink")) {
      r.push(result("Article 24", "Non applicable : l’escalier ne met pas en communication les sous-sols et le reste du bâtiment.", "success"));
    } else if (no(a, "t_door")) {
      r.push(result("Art. 24 · Séparation du sous-sol", "Non conforme : au moins un bloc-porte coupe-feu doit séparer le sous-sol du reste du bâtiment.", "danger"));
    } else {
      const ratingOkay = fireDuration(a.t_doorRating) >= 30;
      r.push(
        result("Art. 24 · Bloc-porte", ratingOkay ? `Conforme : ${a.t_doorRating}, minimum CF 30 minutes.` : `Non conforme : ${a.t_doorRating}, minimum CF 30 minutes.`, ratingOkay ? "success" : "danger"),
        result("Art. 24 · Organisation de l’escalier", yes(a, "t_doorConditions") ? "Conforme : ferme-porte, sens d’évacuation et séparation des volées respectés." : "Non conforme : ferme-porte, sens d’ouverture vers la sortie et débouché indépendant au RDC sont exigés.", yes(a, "t_doorConditions") ? "success" : "danger"),
      );
    }
  }

  return {
    title: "Réaction au feu des escaliers", kicker: "Articles 22 à 24", intro: "Contrôlez les matériaux des escaliers, les revêtements des circulations et la séparation avec les sous-sols.", questions, results: r,
    reminder: ["Art. 23 : en 2e famille collective, plafonds, rampants et parois verticales sont classés M2 au minimum ; dans les autres habitations collectives, ils sont M0.", "Dans les autres habitations collectives, les revêtements éventuels des marches et contremarches sont classés M3 au minimum.", "Art. 24 : la communication avec un sous-sol comporte au moins un bloc-porte CF 30 min muni d’un ferme-porte."],
  };
}

function protectedStairs(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const questions: QuestionDef[] = [];
  const r: ResultDef[] = [];
  if (!ctx.collective) {
    r.push(result("Applicabilité", "Articles 25 à 29 non applicables aux habitations individuelles.", "success"));
    return { title: "Désenfumage & escaliers protégés", kicker: "Articles 25 à 29", intro: "Vérifiez le désenfumage des cages et les dispositions des escaliers protégés.", questions, results: r, reminder: ["Le présent module s’applique aux habitations collectives selon leur famille et le type d’escalier."] };
  }

  const stairTypes = ["Intérieur", "Protégé - à l’air libre", "Protégé - à l’abri des fumées"];
  questions.push(select("p_type", "01", "Type d’escalier", stairTypes));
  const savedStairType = String(a.p_type);
  const stairType = stairTypes.includes(savedStairType) ? savedStairType : stairTypes[0];
  const article25 = ctx.family === "2" || ctx.family === "3A";
  const protectedFamily = ctx.family === "3B" || ctx.family === "4";

  if (article25) {
    questions.push(
      yn("p_smokeDevice", "02", "La cage comporte-t-elle en partie haute un dispositif fermé en temps normal permettant une ouverture d’au moins 1 m² ?"),
      select("p_system", "03", "Système de commande du dispositif", ["Électrique", "Pneumatique", "Hydraulique", "Électromagnétique", "Électro-pneumatique", "Tringlerie mécanique", "Autre / non conforme"]),
      yn("p_command", "04", "La commande est-elle située au RDC, près de l’escalier, facilement accessible et réservée aux personnes habilitées ?"),
    );
    if (ctx.family === "3A") questions.push(yn("p_detector", "05", "Un détecteur autonome déclenche-t-il automatiquement l’ouverture du dispositif en 3e famille A ?"));
    const allowedSystems = ["Électrique", "Pneumatique", "Hydraulique", "Électromagnétique", "Électro-pneumatique"];
    const systemOkay = allowedSystems.includes(String(a.p_system)) || (ctx.family === "2" && String(a.p_system) === "Tringlerie mécanique");
    r.push(
      result("Art. 25 · Exutoire", yes(a, "p_smokeDevice") ? "Conforme : dispositif haut fermé en temps normal et ouverture minimale de 1 m²." : "Non conforme : un dispositif haut ouvrant sur au moins 1 m² est exigé.", yes(a, "p_smokeDevice") ? "success" : "danger"),
      result("Art. 25 · Commande", systemOkay ? `${a.p_system} : système de commande admis pour la configuration.` : `${a.p_system} : système de commande non conforme pour la configuration.`, systemOkay ? "success" : "danger"),
      result("Art. 25 · Implantation de la commande", yes(a, "p_command") ? "Conforme : commande accessible au RDC et réservée aux personnes habilitées." : "Non conforme : la commande doit être implantée au RDC près de l’escalier et son accès réservé.", yes(a, "p_command") ? "success" : "danger"),
    );
    if (ctx.family === "3A") r.push(result("Art. 25 · Détection automatique", yes(a, "p_detector") ? "Conforme : détecteur autonome prévu." : "Non conforme : un détecteur autonome doit commander automatiquement l’ouverture.", yes(a, "p_detector") ? "success" : "danger"));
  } else if (protectedFamily) {
    const airOpen = stairType === "Protégé - à l’air libre";
    const smokeProtected = stairType === "Protégé - à l’abri des fumées";
    if (!airOpen && !smokeProtected) {
      r.push(result("Art. 26 · Protection de l’escalier", "Non conforme : l’escalier doit être protégé à l’air libre ou protégé à l’abri des fumées.", "danger"));
    } else {
      questions.push(
        yn("p_circulation", "06", "L'escalier est-il desservi à chaque niveau par une circulation horizontale protégée, avec laquelle  il ne communique que par une seule issue ?"),
        yn("p_noShaft", "07", "La cage est-elle exemptée de gaines, trémies, vide-ordures et accès à des locaux non autorisés ?"),
        yn("p_lighting", "08", "Est ce que l'escalier comporte un éclairage électrique constitué soit par une dérivation issue directement du tableau principal (sans traverser les sous-sols) et sélectivement protégée, soit par des blocs autonomes de type non permanent conformes aux normes françaises les concernant?"),
        select("p_conduits", "08 bis", "Classement des conduits non encastrés présents dans la cage", ["C1", "C2", "C3", "C4", "Pas de conduit non encastré"]),
      );
      r.push(
        result("Art. 26 · Type d’escalier", `Conforme : escalier ${airOpen ? "protégé à l’air libre" : "protégé à l’abri des fumées"}.`, "success"),
        result("Art. 27 · Issues", yes(a, "p_circulation") ? "Conforme : chaque niveau dispose d’une issue vers l’escalier protégé." : "Non conforme : L'escalier n'est pas desservi à chaque niveau par une circulation horizontale protégée et/ou il communique par plusieurs issues", yes(a, "p_circulation") ? "success" : "danger"),
        result("Art. 27 · Cage d’escalier", yes(a, "p_noShaft") ? "Conforme : aucun conduit, trémie ou accès interdit relevé." : "Non conforme : la cage comporte un élément ou un accès interdit.", yes(a, "p_noShaft") ? "success" : "danger"),
        result("Art. 27 · Éclairage", yes(a, "p_lighting") ? "Conforme : éclairage de sécurité déclaré conforme." : "Non conforme : l’éclairage de l’escalier et de ses accès doit respecter les dispositions de sécurité.", yes(a, "p_lighting") ? "success" : "danger"),
        result("Art. 27 · Conduits non encastrés", ["C1", "C2", "Pas de conduit non encastré"].includes(String(a.p_conduits)) ? `${a.p_conduits} : conforme.` : `${a.p_conduits} : non conforme, classement C2 ou plus performant exigé.`, ["C1", "C2", "Pas de conduit non encastré"].includes(String(a.p_conduits)) ? "success" : "danger"),
      );
      if (airOpen) {
        questions.push(yn("p_airOpen", "09", "La paroi donnant sur l’extérieur est-elle ouverte sur au moins la moitié de sa surface sur toute sa longueur ?", "Le respect de l’article 18 est contrôlé automatiquement à partir des réponses de l’onglet 08."));
        questions.push(yn("p_airOpenDoors", "09 bis", "L’escalier comporte-t-il des portes desservant des circulations protégées ?"));
        const hasProtectedDoors = yes(a, "p_airOpenDoors");
        if (hasProtectedDoors) questions.push(yn("p_airOpenDoorsCompliant", "09 ter", "Les blocs-portes sont-ils PF 30 min, d'une largeur minimale de 0,80 m, munis d'un ferme-porte (ouverture dans le sens de la sortie et passage utile préservé).",));
        const article18 = article18FacadeCompliance(a);
        const openingCompliant = yes(a, "p_airOpen");
        const doorsCompliant = !hasProtectedDoors || yes(a, "p_airOpenDoorsCompliant");
        const article28Compliant = openingCompliant && article18.compliant && doorsCompliant;
        const issues: string[] = [];
        if (!openingCompliant) issues.push("la paroi extérieure doit être ouverte sur au moins la moitié de sa surface sur toute sa longueur");
        if (!article18.compliant) issues.push(`l’article 18 n’est pas respecté : ${article18.distance} m déclarés, minimum ${article18.minimum} m pour une ${article18.position.toLowerCase()}`);
        if (!doorsCompliant) issues.push("les portes desservant les circulations protégées ne respectent pas les dispositions prévues pour les escaliers à l’abri des fumées");
        const successText = hasProtectedDoors ? "Conforme : ouverture permanente suffisante, exigences de l’article 18 respectées et portes des circulations protégées conformes." : "Conforme : ouverture permanente suffisante et exigences de l’article 18 respectées ; aucune porte desservant une circulation protégée n’est déclarée.";
        r.push(result("Art. 28 · Escalier à l’air libre", article28Compliant ? successText : `Non conforme : ${issues.join(". De plus, ")}.`, article28Compliant ? "success" : "danger"));
      } else {
        questions.push(
          yn("p_walls", "10", "Les parois de la cage sont-elles CF 60 min et les impostes ou oculus PF 60 min ?"),
          yn("p_door", "11", "Les blocs-portes sont-ils PF 30 min, d’au moins 0,80 m, munis d’un ferme-porte et ouvrant dans le sens de la sortie sans réduire le passage utile ?"),
          select("p_topDevice", "12", "Dispositif prévu en partie haute de la cage", ["Ouverture horizontale 1 m²", "Mise en surpression", "Aucun dispositif"]),
          yn("p_closedExit", "13", "La cage est-elle fermée en temps normal, ventilée en partie haute et basse, et son accès au RDC débouche-t-il directement dehors ou dans un hall ventilé ?"),
        );
        const topOkay = String(a.p_topDevice) !== "Aucun dispositif";
        r.push(
          result("Art. 29 · Parois", yes(a, "p_walls") ? "Conforme : parois CF 60 min et impostes ou oculus PF 60 min." : "Non conforme : parois CF 60 min et impostes ou oculus PF 60 min exigés.", yes(a, "p_walls") ? "success" : "danger"),
          result("Art. 29 · Blocs-portes", yes(a, "p_door") ? "Conforme : PF 30 min, largeur, ferme-porte, sens d’ouverture et passage utile respectés." : "Non conforme : le bloc-porte doit être PF 30 min, mesurer au moins 0,80 m et respecter les conditions d’évacuation.", yes(a, "p_door") ? "success" : "danger"),
          result("Art. 29 · Dispositif haut", topOkay ? `${a.p_topDevice} : solution admise.` : "Non conforme : une ouverture horizontale d’au moins 1 m² ou une mise en surpression est exigée.", topOkay ? "success" : "danger"),
          result("Art. 29 · Cage et débouché", yes(a, "p_closedExit") ? "Conforme : fermeture, ventilation et débouché déclarés conformes." : "Non conforme : la cage doit être fermée en temps normal, ventilée et déboucher dehors ou dans un hall ventilé.", yes(a, "p_closedExit") ? "success" : "danger"),
        );
      }
    }
  } else {
    r.push(result("Applicabilité", "Classement hors périmètre des articles 25 à 29 du classeur source.", "neutral"));
  }

  return {
    title: "Désenfumage & escaliers protégés", kicker: "Articles 25 à 29", intro: "Vérifiez le désenfumage des cages et les dispositions des escaliers protégés.", questions, results: r,
    reminder: ["Art. 25 : dispositif haut d’ouverture minimale 1 m², commandé au rez-de-chaussée.", "Art. 27 : les conduits non encastrés présents dans la cage sont classés C2 au minimum.", "Art. 28 : l’escalier à l’air libre comporte une paroi extérieure ouverte sur au moins la moitié de sa surface sur toute sa longueur et respecte l’article 18. Ses éventuelles portes desservant des circulations protégées répondent aux dispositions prévues pour celles des escaliers à l’abri des fumées."],
  };
}

function protectedCorridors(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const questions: QuestionDef[] = [];
  const r: ResultDef[] = [];
  const pending = (label: string) => r.push(result(label, "À renseigner pour conclure.", "neutral"));
  const addYesCheck = (label: string, key: string, successText: string, failureText: string) => {
    if (!answered(a, key)) pending(label);
    else r.push(result(label, yes(a, key) ? successText : failureText, yes(a, key) ? "success" : "danger"));
  };
  const addNumberCheck = (label: string, key: string, okay: (number: number) => boolean, successText: (number: number) => string, failureText: (number: number) => string) => {
    if (!answered(a, key)) pending(label);
    else {
      const current = value(a, key);
      r.push(result(label, okay(current) ? successText(current) : failureText(current), okay(current) ? "success" : "danger"));
    }
  };
  const reactionOptions = ["M0", "M1", "M2", "M3", "M4"];
  const airReactionOptions = [...reactionOptions, "Bois"];
  const ratingOptions = ["15 min", "30 min", "60 min", "90 min", "120 min"];

  if (!ctx.collective) {
    r.push(result("Applicabilité", "Articles 30 à 38 non applicables : aucune circulation horizontale commune d’habitation collective n’est déclarée.", "neutral"));
    return {
      title: "Circulations horizontales protégées",
      kicker: "Articles 30 à 38",
      intro: "Contrôlez les circulations à l’air libre ou à l’abri des fumées et leur désenfumage.",
      questions,
      results: r,
      reminder: ["Ce module vise les circulations horizontales protégées des bâtiments d’habitation collectifs."],
    };
  }

  const corridorTypes = ["À l’air libre", "À l’abri des fumées", "Configuration mixte", "Aucune circulation protégée"];
  questions.push(select("h_type", "01", "Type de circulation horizontale protégée", corridorTypes, "La réponse est rapprochée de la circulation déclarée dans l’onglet des articles 25 à 29."));
  const corridorType = String(a.h_type ?? "");
  if (!corridorTypes.includes(corridorType)) {
    pending("Orientation");
    return {
      title: "Circulations horizontales protégées",
      kicker: "Articles 30 à 38",
      intro: "Contrôlez les circulations à l’air libre ou à l’abri des fumées et leur désenfumage.",
      questions,
      results: r,
      reminder: ["Art. 30 : circulation à l’air libre.", "Art. 31 à 38 : circulation à l’abri des fumées."],
    };
  }

  const hasCorridor = corridorType !== "Aucune circulation protégée";
  if (answered(a, "p_circulation") && yes(a, "p_circulation") !== hasCorridor) {
    r.push(result("Liaison avec l’article 27", "Incohérence : la présence d’une circulation protégée ne correspond pas à la réponse enregistrée dans l’onglet des articles 25 à 29.", "danger"));
  } else {
    r.push(result("Liaison avec l’article 27", hasCorridor ? "La circulation protégée déclarée est cohérente avec l’article 27." : "Aucune circulation protégée déclarée.", hasCorridor ? "success" : "neutral"));
  }

  if (!hasCorridor) {
    return {
      title: "Circulations horizontales protégées",
      kicker: "Articles 30 à 38",
      intro: "Contrôlez les circulations à l’air libre ou à l’abri des fumées et leur désenfumage.",
      questions,
      results: r,
      reminder: ["Les articles 30 à 38 ne peuvent être contrôlés sans circulation horizontale protégée déclarée."],
    };
  }

  const checksAirOpen = corridorType === "À l’air libre" || corridorType === "Configuration mixte";
  let closedPortionNeedsSmokeControl = false;

  if (checksAirOpen) {
    questions.push(
      yn("h_permanent", "30.1", "La circulation est-elle constituée d’un balcon, d’une coursive ou d’une terrasse praticable en permanence ?"),
      num("h_voidRatio", "30.2", "Pourcentage de vides de la paroi donnant sur l’extérieur, sur toute sa longueur", "%"),
      yn("h_separations", "30.3", "Des séparations recoupent-elles la circulation ?"),
    );
    if (yes(a, "h_separations")) questions.push(yn("h_separationsRemovable", "30.4", "Ces séparations sont-elles facilement amovibles ou destructibles ?"));
    questions.push(yn("h_glazedBays", "30.5", "Des baies vitrées donnent-elles sur la circulation à l’air libre ?"));
    if (yes(a, "h_glazedBays")) {
      questions.push(select("h_baySolution", "30.6", "Solution retenue pour protéger les baies vitrées", ["Allège résistante au feu", "Baie fixe E30"]));
      if (String(a.h_baySolution) === "Allège résistante au feu") {
        questions.push(
          num("h_spandrelHeight", "30.7", "Hauteur de l’allège", "m"),
          select("h_spandrelRating", "30.8", "Classement de résistance au feu de l’allège", ratingOptions),
        );
      } else if (String(a.h_baySolution) === "Baie fixe E30") {
        questions.push(
          yn("h_bayFixed", "30.7", "La baie est-elle fixe et inaccessible aux occupants ?"),
          select("h_bayRating", "30.8", "Classement pare-flammes de la baie", ratingOptions),
        );
      }
    }
    questions.push(yn("h_closedPortion", "30.9", "Existe-t-il une portion qui ne répond pas à la définition de circulation à l’air libre ?"));
    if (yes(a, "h_closedPortion")) {
      questions.push(
        num("h_closedLength", "30.10", "Longueur maximale de cette portion", "m"),
        yn("h_closedContinuous", "30.11", "Cette portion est-elle dans la continuité directe de la circulation à l’air libre ?"),
      );
    }
    questions.push(
      select("h_airWalls", "30.12", "Classement des revêtements des parois verticales", airReactionOptions),
      select("h_airCeiling", "30.13", "Classement des revêtements des plafonds", airReactionOptions),
    );

    addYesCheck("Art. 30 · Caractère praticable", "h_permanent", "Conforme : balcon, coursive ou terrasse praticable en permanence.", "Non conforme : la circulation doit être praticable en permanence.");
    addNumberCheck("Art. 30 · Ouverture sur l’extérieur", "h_voidRatio", (n) => n >= 50, (n) => `Conforme : ${n} % de vides sur la paroi extérieure.`, (n) => `Non conforme : ${n} % déclarés, au moins 50 % sont exigés sur toute la longueur.`);
    if (!answered(a, "h_separations")) pending("Art. 30 · Séparations");
    else if (no(a, "h_separations")) r.push(result("Art. 30 · Séparations", "Conforme : aucune séparation transversale déclarée.", "success"));
    else addYesCheck("Art. 30 · Séparations", "h_separationsRemovable", "Conforme : les séparations sont facilement amovibles ou destructibles.", "Non conforme : les séparations doivent être facilement amovibles ou destructibles.");

    if (!answered(a, "h_glazedBays")) pending("Art. 30 · Baies vitrées");
    else if (no(a, "h_glazedBays")) r.push(result("Art. 30 · Baies vitrées", "Conforme : aucune baie vitrée donnant sur la circulation n’est déclarée.", "success"));
    else if (!answered(a, "h_baySolution")) pending("Art. 30 · Protection des baies");
    else if (String(a.h_baySolution) === "Allège résistante au feu") {
      const required = ctx.family === "4" ? 60 : 30;
      addNumberCheck("Art. 30 · Hauteur d’allège", "h_spandrelHeight", (n) => n >= 1, (n) => `Conforme : allège de ${n} m.`, (n) => `Non conforme : allège de ${n} m, minimum 1 m.`);
      if (!answered(a, "h_spandrelRating")) pending("Art. 30 · Résistance de l’allège");
      else {
        const duration = fireDuration(a.h_spandrelRating);
        r.push(result("Art. 30 · Résistance de l’allège", duration >= required ? `Conforme : EI ${duration} min pour la ${ctx.familyLabel}.` : `Non conforme : EI ${duration} min déclaré, EI ${required} min exigé pour la ${ctx.familyLabel}.`, duration >= required ? "success" : "danger"));
      }
    } else {
      addYesCheck("Art. 30 · Fixité de la baie", "h_bayFixed", "Conforme : baie fixe et inaccessible aux occupants.", "Non conforme : la baie de substitution doit être fixe.");
      if (!answered(a, "h_bayRating")) pending("Art. 30 · Classement de la baie");
      else {
        const duration = fireDuration(a.h_bayRating);
        r.push(result("Art. 30 · Classement de la baie", duration >= 30 ? `Conforme : baie fixe E ${duration} min.` : `Non conforme : E ${duration} min déclaré, E 30 min exigé.`, duration >= 30 ? "success" : "danger"));
      }
    }

    if (ctx.family === "3B" || ctx.family === "4") {
      r.push(result("Art. 30 · Distance de parcours", ctx.stairDistance <= 25 ? `Conforme : ${ctx.stairDistance} m entre la porte la plus éloignée et l’accès à l’escalier.` : `Non conforme : ${ctx.stairDistance} m déclarés, maximum 25 m.`, ctx.stairDistance <= 25 ? "success" : "danger"));
    } else {
      r.push(result("Art. 30 · Distance de parcours", "Le seuil de 25 m de l’article 30 vise les bâtiments de 3e famille B et de 4e famille.", "neutral"));
    }

    if (!answered(a, "h_closedPortion")) pending("Art. 30 · Portion non ouverte");
    else if (no(a, "h_closedPortion")) r.push(result("Art. 30 · Portion non ouverte", "Conforme : aucune portion fermée déclarée.", "success"));
    else if (!answered(a, "h_closedLength") || !answered(a, "h_closedContinuous")) pending("Art. 30 · Exemption de désenfumage");
    else {
      const exempt = value(a, "h_closedLength") < 10 && yes(a, "h_closedContinuous");
      closedPortionNeedsSmokeControl = !exempt;
      r.push(result("Art. 30 · Exemption de désenfumage", exempt ? `Exemption admise : portion de ${value(a, "h_closedLength")} m, inférieure à 10 m et dans la continuité de la circulation à l’air libre.` : "Exemption non acquise : cette portion doit être contrôlée comme une circulation à l’abri des fumées.", exempt ? "success" : "warning"));
    }

    for (const [key, label] of [["h_airWalls", "Art. 30 · Parois verticales"], ["h_airCeiling", "Art. 30 · Plafond"]] as const) {
      if (!answered(a, key)) pending(label);
      else {
        const raw = String(a[key]);
        const okay = raw === "Bois" || reactionRank(raw) <= 2;
        r.push(result(label, okay ? `Conforme : revêtement ${raw}.` : `Non conforme : revêtement ${raw}, classement M2 ou plus performant, ou bois, exigé.`, okay ? "success" : "danger"));
      }
    }
  }

  const checksSmokeProtected = corridorType === "À l’abri des fumées" || corridorType === "Configuration mixte" || closedPortionNeedsSmokeControl;
  if (checksSmokeProtected) {
    r.push(result("Art. 31 · Distance de parcours", ctx.stairDistance <= 15 ? `Conforme : ${ctx.stairDistance} m entre la porte palière la plus éloignée et l’escalier ou l’accès à l’air libre.` : `Non conforme : ${ctx.stairDistance} m déclarés, maximum 15 m.`, ctx.stairDistance <= 15 ? "success" : "danger"));

    questions.push(
      select("h_smokeCeiling", "32.1", "Classement du revêtement de plafond", reactionOptions),
      select("h_smokeWalls", "32.2", "Classement du revêtement des parois verticales", reactionOptions),
      select("h_smokeFloor", "32.3", "Classement du revêtement de sol", reactionOptions),
      yn("h_woodHall", "32.4", "Du bois est-il employé dans le hall d’entrée ?"),
    );
    if (yes(a, "h_woodHall")) questions.push(yn("h_stairDirectOutside", "32.5", "L’escalier protégé aboutit-il directement à l’extérieur, en dehors du hall d’entrée ?"));

    for (const [key, label, maximum] of [["h_smokeCeiling", "Art. 32 · Plafond", 1], ["h_smokeWalls", "Art. 32 · Parois verticales", 2], ["h_smokeFloor", "Art. 32 · Sol", 3]] as const) {
      if (!answered(a, key)) pending(label);
      else {
        const raw = String(a[key]);
        const okay = reactionRank(raw) <= maximum;
        r.push(result(label, okay ? `Conforme : revêtement ${raw}.` : `Non conforme : revêtement ${raw}, classement M${maximum} ou plus performant exigé.`, okay ? "success" : "danger"));
      }
    }
    if (!answered(a, "h_woodHall")) pending("Art. 32 · Bois dans le hall");
    else if (no(a, "h_woodHall")) r.push(result("Art. 32 · Bois dans le hall", "Aucun emploi du bois déclaré dans le hall.", "success"));
    else addYesCheck("Art. 32 · Bois dans le hall", "h_stairDirectOutside", "Exception admise : l’escalier protégé aboutit directement à l’extérieur en dehors du hall.", "Non conforme : l’emploi du bois dans le hall n’est admis que si l’escalier protégé aboutit directement à l’extérieur en dehors du hall.");

    questions.push(select("h_smokeSystem", "33.1", "Système de désenfumage de la circulation", ["Tirage naturel", "Extraction mécanique", "Aucun système"]));
    if (!answered(a, "h_smokeSystem")) pending("Art. 33 · Désenfumage");
    else {
      const system = String(a.h_smokeSystem);
      r.push(result("Art. 33 · Désenfumage", system === "Aucun système" ? "Non conforme : un désenfumage naturel ou mécanique est exigé." : `Solution déclarée : ${system.toLowerCase()}.`, system === "Aucun système" ? "danger" : "success"));
    }

    questions.push(select("h_ductType", "34.1", "Type de conduits de désenfumage", ["Conduits collectifs", "Conduits collecteurs avec shunts", "Autre ou non défini"]));
    const ductType = String(a.h_ductType ?? "");
    if (ductType === "Conduits collectifs") {
      questions.push(
        select("h_collectiveMouths", "34.2", "État des bouches en temps normal", ["Fermées", "Ouvertes pour ventilation permanente", "Autre"]),
        yn("h_exhaustDamper", "34.3", "Les volets d’évacuation sont-ils incombustibles et coupe-feu 1 heure ?"),
        yn("h_supplyDamper", "34.4", "Les volets d’amenée d’air sont-ils incombustibles et pare-flammes 1 heure ?"),
      );
    } else if (ductType === "Conduits collecteurs avec shunts") {
      questions.push(select("h_shuntMouths", "34.2", "État des bouches sur les conduits shunts", ["Ouvertes en permanence", "Fermées par des volets incombustibles"]));
      if (String(a.h_shuntMouths) === "Ouvertes en permanence") questions.push(num("h_shuntLevels", "34.3", "Nombre maximal de niveaux desservis par un même collecteur", "niveaux"));
      questions.push(num("h_shuntDraftHeight", "34.4", "Hauteur minimale de tirage disponible pour chaque bouche d’évacuation", "m"));
      if (answered(a, "h_shuntDraftHeight") && value(a, "h_shuntDraftHeight") < 4.25) questions.push(yn("h_shuntIndividual", "34.5", "Chaque bouche insuffisamment haute est-elle reliée par un conduit individuel jusqu’à l’extérieur ?"));
    }
    questions.push(
      yn("h_higherObstacle", "34.6", "Existe-t-il un obstacle plus haut que le débouché à l’air libre ?"),
    );
    if (yes(a, "h_higherObstacle")) {
      questions.push(
        num("h_obstacleHeight", "34.7", "Hauteur de l’obstacle au-dessus du débouché", "m"),
        num("h_outletDistance", "34.8", "Distance horizontale entre le débouché et cet obstacle", "m"),
      );
    }
    questions.push(
      num("h_supplySection", "34.9", "Section libre minimale du conduit d’amenée d’air", "dm²"),
      num("h_exhaustSection", "34.10", "Section libre minimale du conduit d’évacuation", "dm²"),
      num("h_sectionRatio", "34.11", "Rapport entre la plus grande et la plus petite dimension des conduits", ""),
      num("h_horizontalLength", "34.12", "Longueur maximale des raccordements horizontaux d’étage", "m"),
      yn("h_ductIncombustible", "34.13", "Les conduits et raccordements sont-ils réalisés en matériaux incombustibles ?"),
      select("h_ductFireRating", "34.14", "Degré coupe-feu des conduits", ratingOptions),
      yn("h_ductWatertight", "34.15", "La construction des conduits satisfait-elle aux conditions d’étanchéité requises ?"),
      yn("h_leakCompliant", "34.16", "Le débit de fuite des conduits d’extraction est-il inférieur à la moitié de la somme des débits exigés aux bouches les plus défavorisées ?"),
    );

    if (!answered(a, "h_ductType")) pending("Art. 34 · Type de conduits");
    else r.push(result("Art. 34 · Type de conduits", ductType === "Autre ou non défini" ? "Non conforme : le réseau doit utiliser des conduits collectifs ou des conduits collecteurs avec shunts." : `Solution admise : ${ductType.toLowerCase()}.`, ductType === "Autre ou non défini" ? "danger" : "success"));
    if (ductType === "Conduits collectifs") {
      if (!answered(a, "h_collectiveMouths")) pending("Art. 34 · Bouches des conduits collectifs");
      else {
        const mouthState = String(a.h_collectiveMouths);
        const permanentOpening = mouthState === "Ouvertes pour ventilation permanente";
        if (permanentOpening && !answered(a, "h_permanentVentilation")) {
          pending("Art. 34 · Bouches des conduits collectifs");
        } else {
        const stateAllowed = mouthState === "Fermées" || permanentOpening;
        const ventilationConsistent = !permanentOpening || yes(a, "h_permanentVentilation");
        const okay = stateAllowed && ventilationConsistent;
        const text = !stateAllowed
          ? "Non conforme : les bouches doivent être fermées en temps normal, sauf usage autorisé pour la ventilation permanente."
          : !ventilationConsistent
            ? "Non conforme : les bouches sont déclarées ouvertes pour une ventilation permanente qui n’est pas déclarée dans l’article 38."
            : `État admis : ${mouthState.toLowerCase()}.`;
        r.push(result("Art. 34 · Bouches des conduits collectifs", text, okay ? "success" : "danger"));
        }
      }
      addYesCheck("Art. 34 · Volets d’évacuation", "h_exhaustDamper", "Conforme : volets incombustibles et CF 1 h.", "Non conforme : volets incombustibles et CF 1 h exigés.");
      addYesCheck("Art. 34 · Volets d’amenée", "h_supplyDamper", "Conforme : volets incombustibles et PF 1 h.", "Non conforme : volets incombustibles et PF 1 h exigés.");
    } else if (ductType === "Conduits collecteurs avec shunts") {
      if (!answered(a, "h_shuntMouths")) pending("Art. 34 · Bouches des shunts");
      else r.push(result("Art. 34 · Bouches des shunts", `${a.h_shuntMouths}.`, "success"));
      if (String(a.h_shuntMouths) === "Ouvertes en permanence") addNumberCheck("Art. 34 · Niveaux desservis", "h_shuntLevels", (n) => n <= 5, (n) => `Conforme : ${n} niveaux desservis.`, (n) => `Non conforme : ${n} niveaux desservis, maximum 5.`);
      if (!answered(a, "h_shuntDraftHeight")) pending("Art. 34 · Hauteur de tirage");
      else if (value(a, "h_shuntDraftHeight") >= 4.25) r.push(result("Art. 34 · Hauteur de tirage", `Conforme : ${value(a, "h_shuntDraftHeight")} m.`, "success"));
      else addYesCheck("Art. 34 · Conduit individuel", "h_shuntIndividual", "Conforme : un conduit individuel compense la hauteur de tirage insuffisante.", `Non conforme : ${value(a, "h_shuntDraftHeight")} m de tirage et aucun conduit individuel jusqu’à l’extérieur.`);
    }
    if (!answered(a, "h_higherObstacle")) pending("Art. 34 · Débouché extérieur");
    else if (no(a, "h_higherObstacle")) r.push(result("Art. 34 · Débouché extérieur", "Aucun obstacle plus haut que le débouché déclaré.", "success"));
    else if (!answered(a, "h_obstacleHeight") || !answered(a, "h_outletDistance")) pending("Art. 34 · Distance aux obstacles");
    else {
      const minimum = Math.min(value(a, "h_obstacleHeight"), 8);
      const okay = value(a, "h_outletDistance") >= minimum;
      r.push(result("Art. 34 · Distance aux obstacles", okay ? `Conforme : ${value(a, "h_outletDistance")} m, minimum calculé ${minimum} m.` : `Non conforme : ${value(a, "h_outletDistance")} m, minimum calculé ${minimum} m.`, okay ? "success" : "danger"));
    }
    addNumberCheck("Art. 34 · Conduit d’amenée", "h_supplySection", (n) => n >= 20, (n) => `Conforme : section libre ${n} dm².`, (n) => `Non conforme : ${n} dm², minimum 20 dm².`);
    addNumberCheck("Art. 34 · Conduit d’évacuation", "h_exhaustSection", (n) => n >= 20, (n) => `Conforme : section libre ${n} dm².`, (n) => `Non conforme : ${n} dm², minimum 20 dm².`);
    addNumberCheck("Art. 34 · Proportions des conduits", "h_sectionRatio", (n) => n <= 2, (n) => `Conforme : rapport ${n}.`, (n) => `Non conforme : rapport ${n}, maximum 2.`);
    addNumberCheck("Art. 34 · Raccordements horizontaux", "h_horizontalLength", (n) => n <= 2, (n) => `Conforme : longueur maximale ${n} m.`, (n) => `Non conforme : ${n} m, maximum 2 m.`);
    addYesCheck("Art. 34 · Matériaux des conduits", "h_ductIncombustible", "Conforme : matériaux incombustibles.", "Non conforme : les conduits et raccordements doivent être incombustibles.");
    const requiredDuctFire = ctx.family === "4" ? 60 : (ctx.family === "3A" || ctx.family === "3B") ? 30 : 0;
    if (!answered(a, "h_ductFireRating")) pending("Art. 34 · Résistance au feu des conduits");
    else if (!requiredDuctFire) r.push(result("Art. 34 · Résistance au feu des conduits", "Le paragraphe fixe un degré spécifique pour les 3e et 4e familles.", "neutral"));
    else {
      const duration = fireDuration(a.h_ductFireRating);
      r.push(result("Art. 34 · Résistance au feu des conduits", duration >= requiredDuctFire ? `Conforme : CF ${duration} min.` : `Non conforme : CF ${duration} min déclaré, CF ${requiredDuctFire} min exigé.`, duration >= requiredDuctFire ? "success" : "danger"));
    }
    addYesCheck("Art. 34 · Étanchéité", "h_ductWatertight", "Conforme : étanchéité adaptée à l’usage.", "Non conforme : les conditions d’étanchéité ne sont pas satisfaites.");
    addYesCheck("Art. 34 · Débits de fuite", "h_leakCompliant", "Conforme : débit de fuite inférieur à la limite réglementaire.", "Non conforme : débit de fuite supérieur ou égal à la moitié de la somme de référence.");

    questions.push(
      num("h_inletMouthSection", "35.1", "Section libre minimale des bouches d’amenée d’air", "dm²"),
      num("h_exhaustMouthSection", "35.2", "Section libre minimale des bouches d’évacuation", "dm²"),
      yn("h_alternating", "35.3", "Les bouches d’amenée et d’évacuation sont-elles réparties de façon alternée ?"),
      select("h_routeType", "35.4", "Forme du parcours de la circulation", ["Rectiligne", "Non rectiligne"]),
      num("h_mouthDistance", "35.5", "Distance horizontale maximale entre deux bouches de nature différente", "m"),
      yn("h_unframedDoor", "35.6", "Existe-t-il une porte palière qui n’est pas située entre une bouche d’amenée et une bouche d’évacuation ?"),
    );
    if (yes(a, "h_unframedDoor")) questions.push(num("h_doorMouthDistance", "35.7", "Distance maximale de cette porte à la bouche la plus proche", "m"));
    questions.push(
      yn("h_multipleMouths", "35.8", "La circulation comporte-t-elle plusieurs bouches d’amenée d’air ou plusieurs bouches d’évacuation ?"),
    );
    if (yes(a, "h_multipleMouths")) {
      questions.push(
        yn("h_equalAreasPossible", "35.9", "Est-il possible d’obtenir des surfaces totales équivalentes entre amenée d’air et évacuation ?"),
        num("h_totalSupplyArea", "35.10", "Surface totale des bouches d’amenée d’air", "dm²"),
        num("h_totalExhaustArea", "35.11", "Surface totale des bouches d’évacuation", "dm²"),
      );
    }
    questions.push(
      num("h_exhaustBottomHeight", "35.12", "Hauteur de la partie basse de la bouche d’évacuation", "m"),
      yn("h_exhaustUpperThird", "35.13", "La bouche d’évacuation est-elle entièrement située dans le tiers supérieur de la circulation ?"),
      num("h_supplyTopHeight", "35.14", "Hauteur de la partie haute de la bouche d’amenée d’air", "m"),
      select("h_hallSupply", "35.15", "Mode d’amenée d’air dans le hall d’entrée", ["Bouche d’amenée d’air", "Porte donnant sur l’extérieur", "Autre ou non conforme"]),
    );

    addNumberCheck("Art. 35 · Bouches d’amenée", "h_inletMouthSection", (n) => n >= 20, (n) => `Conforme : ${n} dm².`, (n) => `Non conforme : ${n} dm², minimum 20 dm².`);
    addNumberCheck("Art. 35 · Bouches d’évacuation", "h_exhaustMouthSection", (n) => n >= 20, (n) => `Conforme : ${n} dm².`, (n) => `Non conforme : ${n} dm², minimum 20 dm².`);
    addYesCheck("Art. 35 · Alternance des bouches", "h_alternating", "Conforme : répartition alternée.", "Non conforme : les bouches doivent être réparties de façon alternée.");
    if (!answered(a, "h_routeType") || !answered(a, "h_mouthDistance")) pending("Art. 35 · Espacement des bouches");
    else {
      const maximum = String(a.h_routeType) === "Rectiligne" ? 10 : 7;
      const okay = value(a, "h_mouthDistance") <= maximum;
      r.push(result("Art. 35 · Espacement des bouches", okay ? `Conforme : ${value(a, "h_mouthDistance")} m sur un parcours ${String(a.h_routeType).toLowerCase()}.` : `Non conforme : ${value(a, "h_mouthDistance")} m, maximum ${maximum} m sur un parcours ${String(a.h_routeType).toLowerCase()}.`, okay ? "success" : "danger"));
    }
    if (!answered(a, "h_unframedDoor")) pending("Art. 35 · Porte hors alternance");
    else if (no(a, "h_unframedDoor")) r.push(result("Art. 35 · Porte hors alternance", "Toutes les portes palières sont situées entre une amenée et une évacuation.", "success"));
    else addNumberCheck("Art. 35 · Distance porte-bouche", "h_doorMouthDistance", (n) => n <= 5, (n) => `Conforme : ${n} m.`, (n) => `Non conforme : ${n} m, maximum 5 m.`);
    if (!answered(a, "h_multipleMouths")) pending("Art. 35 · Équilibre des surfaces");
    else if (no(a, "h_multipleMouths")) r.push(result("Art. 35 · Équilibre des surfaces", "Prescription sur les surfaces totales non applicable : aucune pluralité de bouches déclarée.", "neutral"));
    else if (!answered(a, "h_equalAreasPossible") || !answered(a, "h_totalSupplyArea") || !answered(a, "h_totalExhaustArea")) pending("Art. 35 · Équilibre des surfaces");
    else {
      const supply = value(a, "h_totalSupplyArea");
      const exhaust = value(a, "h_totalExhaustArea");
      const ratio = supply > 0 ? exhaust / supply : Number.POSITIVE_INFINITY;
      const okay = yes(a, "h_equalAreasPossible") ? Math.abs(exhaust - supply) < 0.01 : ratio >= 0.5 && ratio <= 1;
      const rule = yes(a, "h_equalAreasPossible") ? "surfaces équivalentes exigées" : "rapport évacuation/amenée admis entre 0,5 et 1";
      r.push(result("Art. 35 · Équilibre des surfaces", okay ? `Conforme : amenée ${supply} dm², évacuation ${exhaust} dm².` : `Non conforme : amenée ${supply} dm², évacuation ${exhaust} dm² ; ${rule}.`, okay ? "success" : "danger"));
    }
    addNumberCheck("Art. 35 · Position de l’évacuation", "h_exhaustBottomHeight", (n) => n >= 1.8, (n) => `Conforme : partie basse à ${n} m.`, (n) => `Non conforme : partie basse à ${n} m, minimum 1,80 m.`);
    addYesCheck("Art. 35 · Tiers supérieur", "h_exhaustUpperThird", "Conforme : bouche d’évacuation entièrement dans le tiers supérieur.", "Non conforme : la bouche d’évacuation doit être entièrement dans le tiers supérieur.");
    addNumberCheck("Art. 35 · Position de l’amenée", "h_supplyTopHeight", (n) => n <= 1, (n) => `Conforme : partie haute à ${n} m.`, (n) => `Non conforme : partie haute à ${n} m, maximum 1 m.`);
    if (!answered(a, "h_hallSupply")) pending("Art. 35 · Amenée d’air du hall");
    else {
      const hallOkay = String(a.h_hallSupply) !== "Autre ou non conforme";
      r.push(result("Art. 35 · Amenée d’air du hall", hallOkay ? `Solution admise : ${String(a.h_hallSupply).toLowerCase()}.` : "Solution d’amenée d’air du hall non reconnue par le module.", hallOkay ? "success" : "danger"));
    }

    questions.push(
      yn("h_detectorsConform", "36.1", "Les détecteurs sont-ils sensibles aux fumées et aux gaz de combustion et conformes aux normes applicables ?"),
      yn("h_detectorOpens", "36.2", "Les détecteurs commandent-ils l’ouverture des bouches d’amenée et d’évacuation de l’étage sinistré ?"),
    );
    if (ductType !== "Conduits collecteurs avec shunts") questions.push(yn("h_otherFloorBlocked", "36.3", "Le déclenchement interdit-il le fonctionnement automatique des volets des autres étages ?"));
    questions.push(
      yn("h_autoAlways", "36.4", "L’ouverture automatique des bouches peut-elle être assurée en permanence ?"),
      yn("h_manualControl", "36.5", "Une commande manuelle est-elle située dans l’escalier, à proximité de la porte palière ?"),
      yn("h_detectorsAxis", "36.6", "Les détecteurs sont-ils placés dans l’axe de la circulation ?"),
      num("h_detectorDoorDistance", "36.7", "Distance maximale entre un détecteur et une porte palière", "m"),
    );
    addYesCheck("Art. 36 · Détecteurs", "h_detectorsConform", "Conforme : détecteurs adaptés et conformes.", "Non conforme : détecteurs adaptés et conformes aux normes exigés.");
    addYesCheck("Art. 36 · Ouverture à l’étage sinistré", "h_detectorOpens", "Conforme : ouverture commandée à l’étage sinistré.", "Non conforme : la détection doit commander les bouches de l’étage sinistré.");
    if (ductType !== "Conduits collecteurs avec shunts") addYesCheck("Art. 36 · Autres étages", "h_otherFloorBlocked", "Conforme : l’ouverture automatique des autres étages est interdite.", "Non conforme : les volets des autres étages ne doivent pas s’ouvrir automatiquement.");
    else r.push(result("Art. 36 · Autres étages", "Prescription non applicable aux shunts.", "neutral"));
    addYesCheck("Art. 36 · Disponibilité automatique", "h_autoAlways", "Conforme : ouverture automatique assurée en permanence.", "Non conforme : l’ouverture automatique doit être disponible en permanence.");
    addYesCheck("Art. 36 · Commande manuelle", "h_manualControl", "Conforme : commande manuelle correctement implantée.", "Non conforme : commande manuelle exigée dans l’escalier près de la porte palière.");
    addYesCheck("Art. 36 · Implantation des détecteurs", "h_detectorsAxis", "Conforme : détecteurs dans l’axe de la circulation.", "Non conforme : les détecteurs doivent être situés dans l’axe de la circulation.");
    addNumberCheck("Art. 36 · Distance détecteur-porte", "h_detectorDoorDistance", (n) => n <= 10, (n) => `Conforme : ${n} m.`, (n) => `Non conforme : ${n} m, maximum 10 m.`);

    if (String(a.h_smokeSystem) === "Extraction mécanique") {
      questions.push(
        num("h_extractionPerMouth", "37.1", "Débit minimal d’extraction par bouche", "m³/s"),
        num("h_supplyMouthCount", "37.2", "Nombre N de bouches d’amenée d’air dans la circulation", "bouches"),
        num("h_totalExtraction", "37.3", "Débit total d’extraction", "m³/s"),
        yn("h_fanDetectionStart", "37.4", "La détection commande-t-elle simultanément la mise en marche des ventilateurs et l’ouverture des volets ?"),
        yn("h_naturalFallback", "37.5", "Le désenfumage peut-il fonctionner par tirage naturel en cas de panne du ventilateur ?"),
        yn("h_topOpening", "37.6", "Le conduit d’extraction comporte-t-il en partie haute une ouverture sur l’extérieur égale à sa section ?"),
        yn("h_failureCommand", "37.7", "Cette ouverture est-elle commandée par le défaut de fonctionnement du ventilateur ?"),
        yn("h_fanRating", "37.8", "Les ventilateurs assurent-ils leur fonction pendant une heure avec des fumées à 400 °C ?"),
        yn("h_powerBeforeCutoff", "37.9", "L’alimentation des ventilateurs prend-elle son origine avant la coupure générale du bâtiment ?"),
        yn("h_powerProtected", "37.10", "L’alimentation est-elle protégée contre les incidents affectant les autres circuits ?"),
        yn("h_riskRoomProtected", "37.11", "Toute traversée de locaux à risques particuliers est-elle protégée ?"),
      );
      addNumberCheck("Art. 37 · Débit par bouche", "h_extractionPerMouth", (n) => n >= 1, (n) => `Conforme : ${n} m³/s par bouche.`, (n) => `Non conforme : ${n} m³/s, minimum 1 m³/s par bouche.`);
      if (!answered(a, "h_supplyMouthCount") || !answered(a, "h_totalExtraction")) pending("Art. 37 · Débit total");
      else {
        const minimum = value(a, "h_supplyMouthCount") / 2;
        const actual = value(a, "h_totalExtraction");
        r.push(result("Art. 37 · Débit total", actual >= minimum ? `Conforme : ${actual} m³/s, minimum N/2 = ${minimum} m³/s.` : `Non conforme : ${actual} m³/s, minimum N/2 = ${minimum} m³/s.`, actual >= minimum ? "success" : "danger"));
      }
      addYesCheck("Art. 37 · Commande par détection", "h_fanDetectionStart", "Conforme : ventilateurs et volets sont commandés simultanément par la détection.", "Non conforme : la détection doit commander simultanément les ventilateurs et l’ouverture des volets.");
      addYesCheck("Art. 37 · Tirage naturel de secours", "h_naturalFallback", "Conforme : fonctionnement naturel de secours prévu.", "Non conforme : le désenfumage doit pouvoir fonctionner naturellement en cas de panne du ventilateur.");
      addYesCheck("Art. 37 · Ouverture haute", "h_topOpening", "Conforme : ouverture haute égale à la section du conduit.", "Non conforme : ouverture haute égale à la section du conduit exigée.");
      addYesCheck("Art. 37 · Commande sur défaut", "h_failureCommand", "Conforme : ouverture commandée par le défaut du ventilateur.", "Non conforme : l’ouverture haute doit être commandée par le défaut du ventilateur.");
      addYesCheck("Art. 37 · Tenue des ventilateurs", "h_fanRating", "Conforme : tenue déclarée de 1 h à 400 °C.", "Non conforme : tenue de 1 h à 400 °C exigée.");
      addYesCheck("Art. 37 · Origine de l’alimentation", "h_powerBeforeCutoff", "Conforme : alimentation prise avant la coupure générale.", "Non conforme : l’alimentation doit prendre son origine avant la coupure générale.");
      addYesCheck("Art. 37 · Protection de l’alimentation", "h_powerProtected", "Conforme : circuit indépendant protégé.", "Non conforme : l’alimentation ne doit pas être affectée par un incident sur les autres circuits.");
      addYesCheck("Art. 37 · Traversées à risques", "h_riskRoomProtected", "Conforme : traversées protégées.", "Non conforme : l’alimentation ne doit pas traverser sans protection un local à risque particulier.");
    } else {
      r.push(result("Article 37", "Non applicable : l’extraction mécanique n’est pas sélectionnée.", "neutral"));
    }

    questions.push(yn("h_permanentVentilation", "38.1", "Une ventilation permanente des circulations utilise-t-elle ou doit-elle utiliser l’installation de désenfumage ?"));
    if (yes(a, "h_permanentVentilation")) {
      questions.push(
        yn("h_permanentDampers", "38.2", "L’installation utilisée pour la ventilation permanente est-elle munie de volets ?"),
        yn("h_noSmokeSpread", "38.3", "Des dispositions empêchent-elles la propagation des fumées vers les autres étages ?"),
      );
    }
    if (!answered(a, "h_permanentVentilation")) pending("Art. 38 · Ventilation permanente");
    else if (no(a, "h_permanentVentilation")) r.push(result("Art. 38 · Ventilation permanente", "Non applicable : l’installation de désenfumage n’est pas utilisée pour la ventilation permanente.", "neutral"));
    else {
      addYesCheck("Art. 38 · Volets", "h_permanentDampers", "Conforme : installation munie de volets.", "Non conforme : des volets sont exigés lorsque la ventilation permanente utilise le désenfumage.");
      addYesCheck("Art. 38 · Propagation entre étages", "h_noSmokeSpread", "Conforme : propagation des fumées vers les autres étages empêchée.", "Non conforme : des dispositions doivent empêcher la propagation des fumées vers les autres étages.");
    }
  }

  return {
    title: "Circulations horizontales protégées",
    kicker: "Articles 30 à 38",
    intro: "Contrôlez les circulations à l’air libre ou à l’abri des fumées et leur système de désenfumage.",
    questions,
    results: r,
    reminder: [
      "Art. 30 : ouverture extérieure d’au moins 50 %, distance maximale de 25 m en 3e famille B et 4e famille.",
      "Art. 31–32 : distance maximale de 15 m et revêtements M1 au plafond, M2 aux parois, M3 au sol.",
      "Art. 33–36 : les dispositions relatives aux conduits, bouches et commandes sont communes au tirage naturel et à l’extraction mécanique.",
      "Art. 37 : en extraction mécanique, débit minimal de 1 m³/s par bouche et débit total au moins égal à N/2 m³/s.",
      "Art. 38 : la ventilation permanente utilisant le désenfumage doit comporter des volets et empêcher la propagation entre étages.",
    ],
  };
}

export function getModuleConfig(id: string, context: ModuleContext, answers: ModuleAnswers): ModuleConfig | null {
  if (id === "structure") return structure(context, answers);
  if (id === "walls") return walls(context, answers);
  if (id === "cellars") return cellars(context, answers);
  if (id === "facades") return facades(context, answers);
  if (id === "roofs") return roofs(context, answers);
  if (id === "insulation") return insulation(context, answers);
  if (id === "stairs-facade") return stairsFacade(context, answers);
  if (id === "stairs-inside") return stairsInside(context, answers);
  if (id === "stairs-finishes") return stairsFinishes(context, answers);
  if (id === "stairs-protected") return protectedStairs(context, answers);
  if (id === "corridors-protected") return protectedCorridors(context, answers);
  return null;
}
