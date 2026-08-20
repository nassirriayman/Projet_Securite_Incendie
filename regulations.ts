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
  p_type: "Intérieur", p_smokeDevice: "Oui", p_system: "Électrique", p_command: "Oui", p_detector: "Oui", p_circulation: "Oui", p_noShaft: "Oui", p_lighting: "Oui", p_conduits: "C2", p_airOpen: "Oui", p_walls: "Oui", p_door: "Oui", p_topDevice: "Ouverture horizontale 1 m²", p_closedExit: "Oui", p_facade: "Façade latérale", p_distance: 2, p_exit: "Oui",
};

const yn = (id: string, index: string, title: string, hint?: string): QuestionDef => ({ id, index, title, hint, type: "yesno" });
const num = (id: string, index: string, title: string, unit: string, hint?: string): QuestionDef => ({ id, index, title, hint, type: "number", unit });
const select = (id: string, index: string, title: string, options: string[], hint?: string): QuestionDef => ({ id, index, title, hint, type: "select", options });
const result = (label: string, text: string, tone: ResultTone): ResultDef => ({ label, text, tone });
const yes = (a: ModuleAnswers, key: string) => String(a[key] ?? "").toLowerCase() === "oui";
const no = (a: ModuleAnswers, key: string) => String(a[key] ?? "").toLowerCase() === "non";
const value = (a: ModuleAnswers, key: string) => Number(a[key]);

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

function structure(ctx: ModuleContext, a: ModuleAnswers): ModuleConfig {
  const stability = { "1": 15, "2": 30, "3A": 60, "3B": 60, "4": 90 }[ctx.family] ?? 0;
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
  const recoupement = { "1": 30, "2": 60, "3A": 90, "3B": 90, "4": 90 }[ctx.family] ?? 0;
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
        const pos = String(a.e_position);
        const minimum = pos.startsWith("Latérale") ? 2 : pos.startsWith("En retour") ? 4 : 8;
        r.push(result("Parois", "Certaines parties ne sont pas PF 30 minutes : distance à contrôler.", "warning"));
        r.push(result("Distance", value(a, "e_distance") >= minimum ? `Conforme : ${value(a, "e_distance")} m, minimum ${minimum} m.` : `Non conforme : ${value(a, "e_distance")} m, minimum ${minimum} m.`, value(a, "e_distance") >= minimum ? "success" : "danger"));
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
      yn("n_imposts", "02", "Les parois comportent-elles des impostes ou oculi ?"),
    );
    if (yes(a, "n_imposts")) questions.push(select("n_impostRating", "03", "Degré pare-flammes des impostes ou oculi", ["PF 15", "PF 30", "PF 60", "PF 120"]));
    questions.push(yn("n_doors", "04", "Existe-t-il des portes séparant l’escalier des circulations horizontales ?"));
    if (yes(a, "n_doors")) questions.push(select("n_doorRating", "05", "Degré pare-flammes des blocs-portes", ["PF 15", "PF 30", "PF 60", "PF 120"]), yn("n_closer", "06", "Chaque porte est-elle munie d’un ferme-porte ?"), yn("n_exit", "07", "Chaque porte s’ouvre-t-elle dans le sens de la sortie ?"));
    questions.push(yn("n_room", "08", "Un local s’ouvre-t-il directement sur l’escalier ?"));
    const wall = fireDuration(a.n_wall);
    r.push(result("Applicabilité", "Article 20 applicable à l’habitation de 3e famille.", "warning"));
    r.push(result("Parois", wall >= 60 ? `Conforme : CF ${wall} min, minimum 60 min.` : `Non conforme : CF ${wall} min, minimum 60 min.`, wall >= 60 ? "success" : "danger"));
    const impost = fireDuration(a.n_impostRating);
    r.push(result("Impostes et oculi", no(a, "n_imposts") ? "Aucune imposte ni oculus : conforme." : impost >= 60 ? `Conforme : PF ${impost} min.` : `Non conforme : PF ${impost} min, minimum 60 min.`, no(a, "n_imposts") || impost >= 60 ? "success" : "danger"));
    const doorAnomalies = [fireDuration(a.n_doorRating) < 30 ? "PF inférieur à 30 min" : "", no(a, "n_closer") ? "ferme-porte absent" : "", no(a, "n_exit") ? "mauvais sens d’ouverture" : ""].filter(Boolean);
    r.push(result("Blocs-portes", no(a, "n_doors") ? "Non conforme : blocs-portes séparatifs absents." : doorAnomalies.length ? `Non conforme : ${doorAnomalies.join(" ; ")}.` : "Conforme : PF 30 min, ferme-porte et sens de sortie.", yes(a, "n_doors") && !doorAnomalies.length ? "success" : "danger"));
    r.push(result("Locaux ouvrant sur l’escalier", yes(a, "n_room") ? "Non conforme : aucun local ne doit s’ouvrir sur l’escalier." : "Conforme : aucun local ne s’ouvre sur l’escalier.", yes(a, "n_room") ? "danger" : "success"));
  } else {
    r.push(result("Applicabilité", "Le classeur source ne traite les articles 19–20 que pour les 2e et 3e familles.", "neutral"));
  }
  return {
    title: "Escaliers non situés en façade", kicker: "Articles 19 et 20", intro: "Contrôlez les parois, impostes, oculi, blocs-portes et ouvertures sur les cages d’escalier.", questions, results: r,
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
    r.push(result("Applicabilité", "Articles 25 à 29 bis non applicables aux habitations individuelles.", "success"));
    return { title: "Désenfumage & escaliers protégés", kicker: "Articles 25 à 29 bis", intro: "Vérifiez le désenfumage des cages et les dispositions des escaliers protégés ou extérieurs.", questions, results: r, reminder: ["Le présent module s’applique aux habitations collectives selon leur famille et le type d’escalier."] };
  }

  const stairTypes = ["Intérieur", "Protégé - à l’air libre", "Protégé - à l’abri des fumées", "Extérieur (Art. 29 bis)"];
  questions.push(select("p_type", "01", "Type d’escalier", stairTypes));
  const stairType = String(a.p_type);
  const exterior = stairType === "Extérieur (Art. 29 bis)";
  const article25 = ctx.family === "2" || ctx.family === "3A";
  const protectedFamily = ctx.family === "3B" || ctx.family === "4";

  if (exterior) {
    questions.push(
      select("p_facade", "14", "Position de la façade comportant des baies par rapport à l’escalier", ["Façade latérale", "Façade en retour", "Façade en vis-à-vis"]),
      num("p_distance", "15", "Distance entre l’escalier extérieur et la baie la plus proche", "mètres"),
      yn("p_exit", "16", "L’escalier débouche-t-il directement à l’extérieur au RDC, ou dans un hall ou une circulation largement ventilée sur l’extérieur ?"),
    );
    const minimum = stairType && String(a.p_facade) === "Façade latérale" ? 2 : String(a.p_facade) === "Façade en retour" ? 4 : 8;
    r.push(
      result("Art. 29 bis · Distance aux baies", value(a, "p_distance") >= minimum ? `Conforme : ${value(a, "p_distance")} m, minimum ${minimum} m pour une ${String(a.p_facade).toLowerCase()}.` : `Non conforme : ${value(a, "p_distance")} m, minimum ${minimum} m pour une ${String(a.p_facade).toLowerCase()}.`, value(a, "p_distance") >= minimum ? "success" : "danger"),
      result("Art. 29 bis · Débouché au rez-de-chaussée", yes(a, "p_exit") ? "Conforme : débouché extérieur ou dans un volume largement ventilé." : "Non conforme : l’escalier doit déboucher directement à l’extérieur ou dans un hall ou une circulation largement ventilée.", yes(a, "p_exit") ? "success" : "danger"),
    );
  } else if (article25) {
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
      r.push(result("Art. 26 · Protection de l’escalier", "Non conforme : l’escalier doit être protégé à l’air libre, protégé à l’abri des fumées ou extérieur.", "danger"));
    } else {
      questions.push(
        yn("p_circulation", "06", "À chaque niveau, la circulation protégée possède-t-elle au moins une issue donnant accès à l’escalier ?"),
        yn("p_noShaft", "07", "La cage est-elle exempte de gaines, trémies, vide-ordures et accès à des locaux non autorisés ?"),
        yn("p_lighting", "08", "L’éclairage électrique de l’escalier et de ses accès respecte-t-il les dispositions de sécurité prévues ?"),
        select("p_conduits", "08 bis", "Classement des conduits non encastrés présents dans la cage", ["C1", "C2", "C3", "C4", "Pas de conduit non encastré"]),
      );
      r.push(
        result("Art. 26 · Type d’escalier", `Conforme : escalier ${airOpen ? "protégé à l’air libre" : "protégé à l’abri des fumées"}.`, "success"),
        result("Art. 27 · Issues", yes(a, "p_circulation") ? "Conforme : chaque niveau dispose d’une issue vers l’escalier protégé." : "Non conforme : chaque niveau doit disposer d’au moins une issue vers l’escalier protégé.", yes(a, "p_circulation") ? "success" : "danger"),
        result("Art. 27 · Cage d’escalier", yes(a, "p_noShaft") ? "Conforme : aucun conduit, trémie ou accès interdit relevé." : "Non conforme : la cage comporte un élément ou un accès interdit.", yes(a, "p_noShaft") ? "success" : "danger"),
        result("Art. 27 · Éclairage", yes(a, "p_lighting") ? "Conforme : éclairage de sécurité déclaré conforme." : "Non conforme : l’éclairage de l’escalier et de ses accès doit respecter les dispositions de sécurité.", yes(a, "p_lighting") ? "success" : "danger"),
        result("Art. 27 · Conduits non encastrés", ["C1", "C2", "Pas de conduit non encastré"].includes(String(a.p_conduits)) ? `${a.p_conduits} : conforme.` : `${a.p_conduits} : non conforme, classement C2 ou plus performant exigé.`, ["C1", "C2", "Pas de conduit non encastré"].includes(String(a.p_conduits)) ? "success" : "danger"),
      );
      if (airOpen) {
        questions.push(yn("p_airOpen", "09", "La paroi donnant sur l’extérieur est-elle ouverte sur au moins la moitié de sa surface sur toute sa longueur, avec respect de l’article 18 ?"));
        r.push(result("Art. 28 · Escalier à l’air libre", yes(a, "p_airOpen") ? "Conforme : ouverture permanente suffisante et dispositions de façade respectées." : "Non conforme : la paroi extérieure doit être ouverte sur au moins la moitié de sa surface sur toute sa longueur.", yes(a, "p_airOpen") ? "success" : "danger"));
      } else {
        questions.push(
          yn("p_walls", "10", "Les parois de la cage sont-elles CF 60 min et les impostes ou oculi PF 60 min ?"),
          yn("p_door", "11", "Les blocs-portes sont-ils PF 30 min, d’au moins 0,80 m, munis d’un ferme-porte et ouvrant dans le sens de la sortie sans réduire le passage utile ?"),
          select("p_topDevice", "12", "Dispositif prévu en partie haute de la cage", ["Ouverture horizontale 1 m²", "Mise en surpression", "Aucun dispositif"]),
          yn("p_closedExit", "13", "La cage est-elle fermée en temps normal, ventilée en partie haute et basse, et son accès au RDC débouche-t-il directement dehors ou dans un hall ventilé ?"),
        );
        const topOkay = String(a.p_topDevice) !== "Aucun dispositif";
        r.push(
          result("Art. 29 · Parois", yes(a, "p_walls") ? "Conforme : parois CF 60 min et impostes ou oculi PF 60 min." : "Non conforme : parois CF 60 min et impostes ou oculi PF 60 min exigés.", yes(a, "p_walls") ? "success" : "danger"),
          result("Art. 29 · Blocs-portes", yes(a, "p_door") ? "Conforme : PF 30 min, largeur, ferme-porte, sens d’ouverture et passage utile respectés." : "Non conforme : le bloc-porte doit être PF 30 min, mesurer au moins 0,80 m et respecter les conditions d’évacuation.", yes(a, "p_door") ? "success" : "danger"),
          result("Art. 29 · Dispositif haut", topOkay ? `${a.p_topDevice} : solution admise.` : "Non conforme : une ouverture horizontale d’au moins 1 m² ou une mise en surpression est exigée.", topOkay ? "success" : "danger"),
          result("Art. 29 · Cage et débouché", yes(a, "p_closedExit") ? "Conforme : fermeture, ventilation et débouché déclarés conformes." : "Non conforme : la cage doit être fermée en temps normal, ventilée et déboucher dehors ou dans un hall ventilé.", yes(a, "p_closedExit") ? "success" : "danger"),
        );
      }
    }
  } else {
    r.push(result("Applicabilité", "Classement hors périmètre des articles 25 à 29 bis du classeur source.", "neutral"));
  }

  return {
    title: "Désenfumage & escaliers protégés", kicker: "Articles 25 à 29 bis", intro: "Vérifiez le désenfumage des cages et les dispositions des escaliers protégés ou extérieurs.", questions, results: r,
    reminder: ["Art. 25 : dispositif haut d’ouverture minimale 1 m², commandé au rez-de-chaussée.", "Art. 27 : les conduits non encastrés présents dans la cage sont classés C2 au minimum.", "Art. 29 bis : distances minimales aux baies de 2 m en façade latérale, 4 m en retour et 8 m en vis-à-vis."],
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
  return null;
}
