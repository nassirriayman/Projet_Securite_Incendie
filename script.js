// ============================================================================
// ETAT DU PROJET
// ============================================================================
let project = {
    typeHabitat: "oui", enBande: "non", nbEtages: 3, hauteur: 9, distEscalier: 10, voieEchelle: "oui",
    balcons: "non", sousSol: "non", videSani: "non", paroisCouv: "non", coursives: "non",
    jumeleBande: "non", locauxCollec: "non", celliers: "non", hauteur8m: "non", parc: "non", escalier: "non", distCellier: 0, nbCages: 1,
    isolee: "non", parementE: "non", ouverture: "oui", lameAir: "non", labo: "non",
    typeEscalier: "air libre", dispositifFumees: "oui", commandeRDC: "oui", circProtegee: "oui", absenceGaine: "oui", ouvertureAirLibre: "oui"
};

// ============================================================================
// MOTEUR DE RÈGLES
// ============================================================================
function calculerFamille(p) {
    if (p.hauteur > 50) return { code: "IGH", label: "HORS SCOPE - Bâtiment IGH (>50m)", tone: "danger" };
    if (p.hauteur > 28) return { code: "4", label: "4ème FAMILLE", tone: "warning" };
    if (p.typeHabitat === "non") {
        if (p.nbEtages <= 1) return { code: "1", label: p.enBande === "oui" ? "1ère FAMILLE - Bande" : "1ère FAMILLE - Isolée", tone: "success" };
        return { code: "2", label: p.enBande === "oui" ? "2ème FAMILLE - Bande (R+2+)" : "2ème FAMILLE - Isolée (R+2+)", tone: "success" };
    }
    if (p.nbEtages <= 3) return { code: "2", label: "2ème FAMILLE - Collectif (max R+3)", tone: "success" };
    if (p.distEscalier > 15) return { code: "NC", label: "NON CONFORME - Distance > 15m", tone: "danger" };
    if (p.nbEtages <= 7 && p.distEscalier <= 10 && p.voieEchelle === "oui") return { code: "3A", label: "3ème FAMILLE A", tone: "success" };
    return { code: "3B", label: "3ème FAMILLE B", tone: "warning" };
}

function analyserStructure(p, famille) {
    let res = [];
    if (famille === "1") res.push("EPV : SF 1/4h (15 min)");
    else if (famille === "2") res.push("EPV : SF 1/2h (30 min)");
    else if (famille === "3A" || famille === "3B") res.push("EPV : SF 1h (60 min)");
    else if (famille === "4") res.push("EPV : SF 1h30 (90 min)");

    if (famille === "2") res.push("Planchers : CF 1/2h");
    else if (famille === "3A" || famille === "3B") res.push("Planchers : CF 1h");
    return res;
}

function analyserParois(p, famille) {
    let res = [];
    if (famille === "2" && p.typeHabitat === "oui") res.push("Enveloppe CF 1/2h, Portes PF 1/4h");
    else if (famille === "3A" || famille === "3B") res.push("Enveloppe CF 1/2h, Portes PF 1/4h");
    else if (famille === "4") res.push("Enveloppe CF 1h, Portes PF 1/2h");
    return res;
}

function analyserEscaliers(p, famille) {
    let res = [];
    if (famille === "3A" || famille === "3B" || famille === "4") {
        res.push(p.circProtegee === "oui" && p.absenceGaine === "oui" ? "Circulations protégées : Conformes" : "Circulations : NON CONFORMES");
        if (p.typeEscalier === "air libre") res.push(p.ouvertureAirLibre === "oui" ? "Escalier air libre : Conforme" : "Escalier air libre : NON CONFORME");
    }
    return res;
}

function runAnalysis() {
    const classification = calculerFamille(project);
    return {
        classement: classification,
        structure: analyserStructure(project, classification.code),
        parois: analyserParois(project, classification.code),
        escaliers: analyserEscaliers(project, classification.code)
    };
}

// ============================================================================
// GESTION DE L'INTERFACE
// ============================================================================
function updateUI() {
    // 1. Lire les valeurs depuis le DOM
    ['typeHabitat', 'enBande', 'nbEtages', 'hauteur', 'distEscalier', 'voieEchelle'].forEach(id => {
        let el = document.getElementById('inp-' + id);
        if(el) {
            project[id] = el.type === 'number' ? Number(el.value) : el.value;
        }
    });

    // 2. Lancer l'analyse
    const analysis = runAnalysis();

    // 3. Mettre à jour la bannière
    const banner = document.getElementById('banner');
    banner.className = 'classification-banner ' + analysis.classement.tone;
    document.getElementById('calc-family').innerText = analysis.classement.label;

    // 4. Mettre à jour les détails
    const resultsContainer = document.getElementById('analysis-results');
    resultsContainer.innerHTML = '';

    const renderSection = (title, items) => {
        if (!items || items.length === 0) return;
        let html = `<div class="result-section"><h3>${title}</h3>`;
        items.forEach(item => { html += `<div class="result-item">${item}</div>`; });
        html += `</div>`;
        resultsContainer.innerHTML += html;
    };

    renderSection("Structure & Planchers (Art. 5 & 6)", analysis.structure);
    renderSection("Parois & Séparations (Art. 7 à 9)", analysis.parois);
    renderSection("Désenfumage & Escaliers (Art. 25 à 29bis)", analysis.escaliers);
}

// Ajouter les écouteurs d'événements
document.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', updateUI);
    el.addEventListener('change', updateUI);
});

// Init au chargement
document.addEventListener('DOMContentLoaded', updateUI);
