const sampleNotes = `+ Le pilote Belgique est terminé avec 94 % de scénarios validés
+ Le sponsor a confirmé le périmètre de la première mise en production
> Finaliser le plan de bascule avec les équipes locales
> Préparer le comité de décision de vendredi
! Le fournisseur annonce une marge de seulement trois jours sur la livraison
× L'accès à l'environnement de préproduction reste bloqué pour deux équipes
? Arbitrer le maintien ou le report du lot reporting
@ Nadia | Confirmer le budget de renfort | 24/10
@ Thomas | Obtenir les accès de préproduction | 23/10
@ Elliot | Envoyer le brief au comité de pilotage | 25/10`;

const healthLabels = {
  "on-track": "Maîtrisé",
  "at-risk": "À surveiller",
  critical: "Critique",
};

const elements = {
  projectName: document.querySelector("#projectName"),
  reportDate: document.querySelector("#reportDate"),
  notes: document.querySelector("#notes"),
  briefProject: document.querySelector("#briefProject"),
  briefDate: document.querySelector("#briefDate"),
  healthBadge: document.querySelector("#healthBadge"),
  summaryText: document.querySelector("#summaryText"),
  signalLine: document.querySelector("#signalLine"),
  toast: document.querySelector("#toast"),
};

const outputConfig = {
  highlights: { list: "#highlightsList", count: "#highlightsCount", empty: "Aucune avancée renseignée." },
  next: { list: "#nextList", count: "#nextCount", empty: "Aucune prochaine étape renseignée." },
  risks: { list: "#risksList", count: "#risksCount", empty: "Aucun risque ou blocage signalé." },
  decisions: { list: "#decisionsList", count: "#decisionsCount", empty: "Aucune décision en attente." },
};

let toastTimer;

function localDateValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function selectedHealth() {
  return document.querySelector('input[name="health"]:checked')?.value || "on-track";
}

function cleanText(value) {
  return value.trim().replace(/^[\s:–—-]+/, "").replace(/\s+/g, " ");
}

function inferredCategory(line) {
  const normalized = line.toLocaleLowerCase("fr");
  if (/\b(risque|retard|dépend|incertain|menac|risk|delay|dependency)\b/.test(normalized)) return "risks";
  if (/\b(bloqu|incident|problème|issue|blocker|impossible)\b/.test(normalized)) return "risks";
  if (/\b(décid|arbitr|approb|valider|decision|approve)\b/.test(normalized)) return "decisions";
  if (/\b(termin|livr|finalis|réalis|achev|completed|done|delivered)\b/.test(normalized)) return "highlights";
  return "next";
}

function parseNotes(value) {
  const result = { highlights: [], next: [], risks: [], decisions: [], actions: [] };

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const marker = line[0];
    const content = cleanText(line.slice(1));

    if (marker === "@") {
      const [owner = "À attribuer", action = "", due = "À définir"] = content.split("|").map(cleanText);
      result.actions.push({ owner: owner || "À attribuer", action: action || content, due: due || "À définir" });
      continue;
    }
    if (marker === "+") result.highlights.push(content);
    else if (marker === ">") result.next.push(content);
    else if (marker === "!") result.risks.push(content);
    else if (marker === "×" || marker.toLowerCase() === "x") result.risks.push(`Blocage — ${content}`);
    else if (marker === "?") result.decisions.push(content);
    else result[inferredCategory(line)].push(cleanText(line));
  }

  for (const key of ["highlights", "next", "risks", "decisions"]) {
    result[key] = result[key].filter(Boolean);
  }
  return result;
}

function renderList(items, selector, emptyMessage) {
  const list = document.querySelector(selector);
  list.replaceChildren();
  const values = items.length ? items : [emptyMessage];
  for (const value of values) {
    const item = document.createElement("li");
    item.textContent = value;
    if (!items.length) item.className = "empty-item";
    list.append(item);
  }
}

function renderActions(actions) {
  const table = document.querySelector("#actionsTable");
  table.replaceChildren();
  if (!actions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-action";
    empty.textContent = "Ajoutez une ligne @ responsable | action | échéance.";
    table.append(empty);
    return;
  }

  for (const action of actions) {
    const row = document.createElement("div");
    row.className = "action-row";
    const owner = document.createElement("span");
    owner.className = "action-owner";
    owner.textContent = action.owner;
    const task = document.createElement("span");
    task.textContent = action.action;
    const due = document.createElement("span");
    due.className = "action-due";
    due.textContent = action.due;
    row.append(owner, task, due);
    table.append(row);
  }
}

function summaryFor(data, health) {
  const total = data.highlights.length + data.next.length + data.risks.length + data.decisions.length + data.actions.length;
  if (!total) return "Ajoutez quelques notes pour faire émerger la synthèse.";

  const progress = data.highlights.length ? `${data.highlights.length} avancée${data.highlights.length > 1 ? "s" : ""} confirmée${data.highlights.length > 1 ? "s" : ""}` : "les travaux se poursuivent";
  const vigilance = data.risks.length ? `${data.risks.length} point${data.risks.length > 1 ? "s" : ""} de vigilance` : "aucun risque majeur signalé";
  const decisions = data.decisions.length ? ` et ${data.decisions.length} décision${data.decisions.length > 1 ? "s" : ""} attendue${data.decisions.length > 1 ? "s" : ""}` : "";

  if (health === "critical") return `Le projet nécessite une intervention rapide : ${vigilance}${decisions}.`;
  if (health === "at-risk") return `Le projet reste pilotable avec ${progress}, mais demande une attention particulière sur ${vigilance}${decisions}.`;
  return `Le projet est maîtrisé : ${progress}, ${vigilance}${decisions}.`;
}

function formattedDate(value) {
  if (!value) return "Date à définir";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
}

function render() {
  const data = parseNotes(elements.notes.value);
  const health = selectedHealth();
  const project = elements.projectName.value.trim() || "Projet sans titre";

  elements.briefProject.textContent = project;
  elements.briefDate.textContent = `Point de situation · ${formattedDate(elements.reportDate.value)}`;
  elements.healthBadge.className = `health-badge ${health}`;
  elements.healthBadge.querySelector("b").textContent = healthLabels[health];
  elements.summaryText.textContent = summaryFor(data, health);

  for (const [key, config] of Object.entries(outputConfig)) {
    renderList(data[key], config.list, config.empty);
    document.querySelector(config.count).textContent = data[key].length;
  }
  renderActions(data.actions);
  document.querySelector("#actionsCount").textContent = data.actions.length;

  const total = data.highlights.length + data.next.length + data.risks.length + data.decisions.length + data.actions.length;
  elements.signalLine.textContent = `${total} signal${total === 1 ? "" : "s"} structuré${total === 1 ? "" : "s"}`;

  localStorage.setItem("pulse-brief", JSON.stringify({ project, date: elements.reportDate.value, health, notes: elements.notes.value }));
  return { data, health, project };
}

function markdownReport() {
  const { data, health, project } = render();
  const section = (title, items) => `## ${title}\n\n${items.length ? items.map((item) => `- ${item}`).join("\n") : "- Aucun élément renseigné."}`;
  const actions = data.actions.length
    ? ["| Responsable | Action | Échéance |", "|---|---|---|", ...data.actions.map((item) => `| ${item.owner} | ${item.action} | ${item.due} |`)].join("\n")
    : "Aucune action nominative renseignée.";
  return `# ${project}\n\n**Point de situation :** ${formattedDate(elements.reportDate.value)}  \n**Santé :** ${healthLabels[health]}\n\n> ${summaryFor(data, health)}\n\n${section("Avancées", data.highlights)}\n\n${section("Prochaines étapes", data.next)}\n\n${section("Risques & blocages", data.risks)}\n\n${section("Décisions attendues", data.decisions)}\n\n## Actions nominatives\n\n${actions}\n\n---\n_Généré avec Pulse Brief — pulse.ananaba.be_\n`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

async function copyBrief() {
  const report = markdownReport();
  try {
    await navigator.clipboard.writeText(report);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = report;
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
  showToast("Brief copié");
}

function downloadBrief() {
  const blob = new Blob([markdownReport()], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = (elements.projectName.value || "pulse-brief").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  link.href = url;
  link.download = `${filename || "pulse-brief"}.md`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Brief téléchargé");
}

function restore() {
  elements.reportDate.value = localDateValue();
  const saved = JSON.parse(localStorage.getItem("pulse-brief") || "null");
  if (!saved) {
    elements.notes.value = sampleNotes;
    document.querySelector('input[name="health"][value="at-risk"]').checked = true;
    render();
    return;
  }
  elements.projectName.value = saved.project || "Programme Atlas";
  elements.reportDate.value = saved.date || localDateValue();
  elements.notes.value = saved.notes || "";
  const healthInput = document.querySelector(`input[name="health"][value="${saved.health}"]`);
  if (healthInput) healthInput.checked = true;
  render();
}

for (const input of [elements.projectName, elements.reportDate, elements.notes, ...document.querySelectorAll('input[name="health"]')]) {
  input.addEventListener("input", render);
  input.addEventListener("change", render);
}

document.querySelector("#loadExample").addEventListener("click", () => {
  elements.projectName.value = "Programme Atlas";
  elements.reportDate.value = localDateValue();
  elements.notes.value = sampleNotes;
  document.querySelector('input[name="health"][value="at-risk"]').checked = true;
  render();
  showToast("Exemple chargé");
});
document.querySelector("#clearAll").addEventListener("click", () => {
  elements.notes.value = "";
  render();
  elements.notes.focus();
});
document.querySelector("#copyBrief").addEventListener("click", copyBrief);
document.querySelector("#downloadBrief").addEventListener("click", downloadBrief);
document.querySelector("#printBrief").addEventListener("click", () => window.print());

restore();
