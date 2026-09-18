export type ErpTypeOption = {
  code: string;
  label: string;
};

export const ERP_TYPES_BUILDING: ErpTypeOption[] = [
  { code: "J", label: "Structures d’accueil pour personnes âgées et handicapées" },
  { code: "L", label: "Salles d’auditions, conférences, réunions, spectacles ou polyvalentes" },
  { code: "M", label: "Magasins de vente et centres commerciaux" },
  { code: "N", label: "Restaurants et débits de boissons" },
  { code: "O", label: "Hôtels et autres établissements d’hébergement" },
  { code: "P", label: "Salles de danse et salles de jeux" },
  { code: "R", label: "Établissements d’enseignement, de formation et centres de loisirs" },
  { code: "S", label: "Bibliothèques et centres de documentation" },
  { code: "T", label: "Salles d’expositions" },
  { code: "U", label: "Établissements sanitaires" },
  { code: "V", label: "Établissements de culte" },
  { code: "W", label: "Administrations, banques et bureaux" },
  { code: "X", label: "Établissements sportifs couverts" },
  { code: "Y", label: "Musées" },
];

export const ERP_TYPES_SPECIAL: ErpTypeOption[] = [
  { code: "PA", label: "Établissements de plein air" },
  { code: "CTS", label: "Chapiteaux, tentes et structures" },
  { code: "SG", label: "Structures gonflables" },
  { code: "PS", label: "Parcs de stationnement couverts" },
  { code: "GA", label: "Gares" },
  { code: "OA", label: "Hôtels-restaurants d’altitude" },
  { code: "EF", label: "Établissements flottants" },
  { code: "REF", label: "Refuges de montagne" },
];

export type ErpClassificationInput = {
  publicCount: number;
  countedStaffCount: number;
  fifthCategoryThreshold: number | null;
};

export type ErpClassificationResult = {
  category: string;
  group: string;
  countedTotal: number;
  tone: "success" | "warning" | "neutral";
  detail: string;
};

export function classifyErp(
  input: ErpClassificationInput,
): ErpClassificationResult {
  const publicCount = Math.max(0, input.publicCount || 0);
  const countedStaffCount = Math.max(0, input.countedStaffCount || 0);
  const countedTotal = publicCount + countedStaffCount;

  if (countedTotal > 1500) {
    return {
      category: "1re catégorie",
      group: "Premier groupe",
      countedTotal,
      tone: "warning",
      detail: "Effectif réglementaire supérieur à 1 500 personnes.",
    };
  }

  if (countedTotal >= 701) {
    return {
      category: "2e catégorie",
      group: "Premier groupe",
      countedTotal,
      tone: "warning",
      detail: "Effectif réglementaire compris entre 701 et 1 500 personnes.",
    };
  }

  if (countedTotal >= 301) {
    return {
      category: "3e catégorie",
      group: "Premier groupe",
      countedTotal,
      tone: "success",
      detail: "Effectif réglementaire compris entre 301 et 700 personnes.",
    };
  }

  if (
    input.fifthCategoryThreshold === null ||
    input.fifthCategoryThreshold <= 0
  ) {
    return {
      category: "4e ou 5e catégorie",
      group: "À déterminer",
      countedTotal,
      tone: "neutral",
      detail:
        "Le seuil de 5e catégorie propre au type ERP doit être renseigné.",
    };
  }

  if (publicCount < input.fifthCategoryThreshold) {
    return {
      category: "5e catégorie",
      group: "Deuxième groupe",
      countedTotal: publicCount,
      tone: "success",
      detail:
        `L’effectif du public (${publicCount}) est inférieur au seuil ` +
        `du type (${input.fifthCategoryThreshold}).`,
    };
  }

  return {
    category: "4e catégorie",
    group: "Premier groupe",
    countedTotal,
    tone: "success",
    detail:
      `L’effectif du public atteint le seuil du type ` +
      `(${input.fifthCategoryThreshold}) sans dépasser 300 personnes.`,
  };
}
