const STORAGE_KEY = "philanthropyChairmanHub.v2";

const DEFAULT_DATA = {
  checklist: {},
  events: [],
  files: [],
  costs: [],
  handoff: {}
};

const checklistGroups = [
  {
    title: "Start of Term",
    items: [
      "Meet with the outgoing chairman",
      "Find the current Drive folder",
      "Review existing templates and spreadsheets",
      "Confirm expectations with chapter leadership"
    ]
  },
  {
    title: "Planning",
    items: [
      "Build the semester philanthropy calendar",
      "Confirm beneficiary or partner organization",
      "Draft estimated budget",
      "Assign committee responsibilities"
    ]
  },
  {
    title: "Before Event",
    items: [
      "Create promotional materials",
      "Track sales and donations",
      "Prepare event-day materials",
      "Confirm setup, cleanup, and money-handling roles"
    ]
  },
  {
    title: "After Event",
    items: [
      "Record final results",
      "Upload receipts and files",
      "Write what worked and what should improve",
      "Write handoff notes"
    ]
  }
];

let data = loadData();

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return structuredCloneSafe(DEFAULT_DATA);
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      checklist: parsed.checklist || {},
      events: Array.isArray(parsed.events) ? parsed.events : [],
      files: Array.isArray(parsed.files) ? parsed.files : [],
      costs: Array.isArray(parsed.costs) ? parsed.costs : [],
      handoff: parsed.handoff || {}
    };
  } catch {
    return structuredCloneSafe(DEFAULT_DATA);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  updateStats();
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function money(value) {
  const number = Number(value || 0);

  return number.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function blank(value) {
  return value === undefined || value === null || String(value).trim() === ""
    ? "Not recorded yet"
    : String(value);
}

function normalizeUrl(value) {
  let raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (
    raw.startsWith("docs.google.com") ||
    raw.startsWith("drive.google.com") ||
    raw.startsWith("sheets.google.com") ||
    raw.startsWith("forms.google.com") ||
    raw.startsWith("www.")
  ) {
    raw = "https://" + raw;
  }

  try {
    const url = new URL(raw);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }

    return "";
  } catch {
    return "";
  }
}

function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function fillForm(form, record) {
  Object.keys(record).forEach((key) => {
    if (form.elements[key]) {
      form.elements[key].value = record[key] ?? "";
    }
  });
}

function resetForm(form, titleElement, titleText, cancelButton) {
  form.reset();
  form.elements.id.value = "";
  titleElement.textContent = titleText;
  cancelButton.hidden = true;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function appendTextBlock(parent, label, value) {
  const paragraph = document.createElement("p");

  const strong = document.createElement("strong");
  strong.textContent = label + ": ";

  paragraph.appendChild(strong);
  paragraph.append(document.createTextNode(blank(value)));

  parent.appendChild(paragraph);
}

function createActionButton(text, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "text-button";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function createLinkButton(label, href) {
  const url = normalizeUrl(href);

  if (!url) {
    return null;
  }

  const link = document.createElement("a");
  link.className = "link-button";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = label;

  return link;
}

function scrollToElement(element) {
  element.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function renderChecklist() {
  const container = document.getElementById("checklistContainer");
  container.innerHTML = "";

  checklistGroups.forEach((group) => {
    const groupElement = createElement("article", "checklist-group");
    groupElement.appendChild(createElement("h3", null, group.title));

    group.items.forEach((item) => {
      const key = `${group.title}::${item}`;
      const label = createElement("label", "checklist-item");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(data.checklist[key]);

      const text = createElement("span", checkbox.checked ? "done" : "", item);

      checkbox.addEventListener("change", () => {
        data.checklist[key] = checkbox.checked;
        text.classList.toggle("done", checkbox.checked);
        saveData();
      });

      label.appendChild(checkbox);
      label.appendChild(text);
      groupElement.appendChild(label);
    });

    container.appendChild(groupElement);
  });

  updateStats();
}

function renderEvents() {
  const container = document.getElementById("eventRecords");
  container.innerHTML = "";

  if (!data.events.length) {
    container.appendChild(createElement("div", "empty", "No event records yet. Add the first real record above."));
    updateStats();
    return;
  }

  data.events.forEach((eventRecord) => {
    const record = createElement("article", "record");

    const header = createElement("div", "record-header");
    const titleBlock = document.createElement("div");

    titleBlock.appendChild(createElement("h3", null, eventRecord.eventName));
    titleBlock.appendChild(
      createElement(
        "p",
        "record-meta",
        `${blank(eventRecord.semester)} · ${blank(eventRecord.beneficiary)}`
      )
    );

    const actions = createElement("div", "record-actions");
    actions.appendChild(createActionButton("Edit", () => editEvent(eventRecord.id)));
    actions.appendChild(createActionButton("Remove", () => deleteEvent(eventRecord.id)));

    header.appendChild(titleBlock);
    header.appendChild(actions);
    record.appendChild(header);

    const gross = eventRecord.gross === "" ? "Not recorded yet" : money(eventRecord.gross);
    const costs = eventRecord.costs === "" ? "Not recorded yet" : money(eventRecord.costs);
    const net =
      eventRecord.gross === "" && eventRecord.costs === ""
        ? "Not recorded yet"
        : money(Number(eventRecord.gross || 0) - Number(eventRecord.costs || 0));

    const grid = createElement("div", "record-grid");
    grid.appendChild(createMiniStat("Gross", gross));
    grid.appendChild(createMiniStat("Costs", costs));
    grid.appendChild(createMiniStat("Net", net));
    record.appendChild(grid);

    appendTextBlock(record, "What worked", eventRecord.worked);
    appendTextBlock(record, "What should improve", eventRecord.improve);

    const link = createLinkButton("Open file/folder", eventRecord.fileLink);

    if (link) {
      record.appendChild(link);
    }

    container.appendChild(record);
  });

  updateStats();
}

function createMiniStat(label, value) {
  const box = document.createElement("div");

  box.appendChild(createElement("span", null, label));
  box.appendChild(createElement("strong", null, value));

  return box;
}

function editEvent(id) {
  const record = data.events.find((item) => item.id === id);

  if (!record) {
    return;
  }

  const form = document.getElementById("eventForm");

  fillForm(form, record);

  document.getElementById("eventFormTitle").textContent = "Edit Event Record";
  document.getElementById("cancelEventEdit").hidden = false;

  scrollToElement(form);
}

function deleteEvent(id) {
  if (!confirm("Remove this event record?")) {
    return;
  }

  data.events = data.events.filter((item) => item.id !== id);
  saveData();
  renderEvents();
}

function initEventForm() {
  const form = document.getElementById("eventForm");
  const title = document.getElementById("eventFormTitle");
  const cancel = document.getElementById("cancelEventEdit");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = getFormData(form);
    const id = formData.id || makeId();

    const record = {
      id,
      eventName: String(formData.eventName || "").trim(),
      semester: String(formData.semester || "").trim(),
      beneficiary: String(formData.beneficiary || "").trim(),
      gross: formData.gross,
      costs: formData.costs,
      fileLink: normalizeUrl(formData.fileLink),
      worked: String(formData.worked || "").trim(),
      improve: String(formData.improve || "").trim()
    };

    if (!record.eventName) {
      alert("Event name is required.");
      return;
    }

    const existingIndex = data.events.findIndex((item) => item.id === id);

    if (existingIndex >= 0) {
      data.events[existingIndex] = record;
    } else {
      data.events.unshift(record);
    }

    saveData();
    resetForm(form, title, "Add Event Record", cancel);
    renderEvents();
  });

  cancel.addEventListener("click", () => {
    resetForm(form, title, "Add Event Record", cancel);
  });
}

function renderFiles() {
  const container = document.getElementById("fileRecords");
  container.innerHTML = "";

  if (!data.files.length) {
    container.appendChild(createElement("div", "empty", "No file links added yet."));
    updateStats();
    return;
  }

  data.files.forEach((fileRecord) => {
    const record = createElement("article", "record");

    const header = createElement("div", "record-header");
    const titleBlock = document.createElement("div");

    titleBlock.appendChild(createElement("h3", null, fileRecord.fileName));
    titleBlock.appendChild(createElement("p", "record-meta", blank(fileRecord.category)));

    const actions = createElement("div", "record-actions");
    actions.appendChild(createActionButton("Edit", () => editFile(fileRecord.id)));
    actions.appendChild(createActionButton("Remove", () => deleteFile(fileRecord.id)));

    header.appendChild(titleBlock);
    header.appendChild(actions);

    record.appendChild(header);
    appendTextBlock(record, "Description", fileRecord.description);

    const link = createLinkButton("Open file", fileRecord.fileLink);

    if (link) {
      record.appendChild(link);
    }

    container.appendChild(record);
  });

  updateStats();
}

function editFile(id) {
  const record = data.files.find((item) => item.id === id);

  if (!record) {
    return;
  }

  const form = document.getElementById("fileForm");

  fillForm(form, record);

  document.getElementById("fileFormTitle").textContent = "Edit File";
  document.getElementById("cancelFileEdit").hidden = false;

  scrollToElement(form);
}

function deleteFile(id) {
  if (!confirm("Remove this file link?")) {
    return;
  }

  data.files = data.files.filter((item) => item.id !== id);
  saveData();
  renderFiles();
}

function initFileForm() {
  const form = document.getElementById("fileForm");
  const title = document.getElementById("fileFormTitle");
  const cancel = document.getElementById("cancelFileEdit");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = getFormData(form);
    const id = formData.id || makeId();

    const record = {
      id,
      fileName: String(formData.fileName || "").trim(),
      category: String(formData.category || "").trim(),
      fileLink: normalizeUrl(formData.fileLink),
      description: String(formData.description || "").trim()
    };

    if (!record.fileName) {
      alert("File/template name is required.");
      return;
    }

    const existingIndex = data.files.findIndex((item) => item.id === id);

    if (existingIndex >= 0) {
      data.files[existingIndex] = record;
    } else {
      data.files.unshift(record);
    }

    saveData();
    resetForm(form, title, "Add File or Template", cancel);
    renderFiles();
  });

  cancel.addEventListener("click", () => {
    resetForm(form, title, "Add File or Template", cancel);
  });
}

function renderCosts() {
  const container = document.getElementById("costRecords");
  container.innerHTML = "";

  const estimatedTotal = data.costs.reduce((sum, item) => sum + Number(item.estimated || 0), 0);
  const actualTotal = data.costs.reduce((sum, item) => sum + Number(item.actual || 0), 0);

  document.getElementById("totalEstimated").textContent = money(estimatedTotal);
  document.getElementById("totalActual").textContent = money(actualTotal);
  document.getElementById("totalVariance").textContent = money(actualTotal - estimatedTotal);

  if (!data.costs.length) {
    container.appendChild(createElement("div", "empty", "No cost records yet."));
    updateStats();
    return;
  }

  data.costs.forEach((costRecord) => {
    const record = createElement("article", "record");

    const header = createElement("div", "record-header");
    const titleBlock = document.createElement("div");

    titleBlock.appendChild(createElement("h3", null, costRecord.item));
    titleBlock.appendChild(createElement("p", "record-meta", blank(costRecord.event)));

    const actions = createElement("div", "record-actions");
    actions.appendChild(createActionButton("Edit", () => editCost(costRecord.id)));
    actions.appendChild(createActionButton("Remove", () => deleteCost(costRecord.id)));

    header.appendChild(titleBlock);
    header.appendChild(actions);
    record.appendChild(header);

    const estimated = money(costRecord.estimated);
    const actual = money(costRecord.actual);
    const variance = money(Number(costRecord.actual || 0) - Number(costRecord.estimated || 0));

    const grid = createElement("div", "record-grid");
    grid.appendChild(createMiniStat("Estimated", estimated));
    grid.appendChild(createMiniStat("Actual", actual));
    grid.appendChild(createMiniStat("Variance", variance));
    record.appendChild(grid);

    appendTextBlock(record, "Notes", costRecord.notes);

    const link = createLinkButton("Open receipt", costRecord.receipt);

    if (link) {
      record.appendChild(link);
    }

    container.appendChild(record);
  });

  updateStats();
}

function editCost(id) {
  const record = data.costs.find((item) => item.id === id);

  if (!record) {
    return;
  }

  const form = document.getElementById("costForm");

  fillForm(form, record);

  document.getElementById("costFormTitle").textContent = "Edit Cost";
  document.getElementById("cancelCostEdit").hidden = false;

  scrollToElement(form);
}

function deleteCost(id) {
  if (!confirm("Remove this cost record?")) {
    return;
  }

  data.costs = data.costs.filter((item) => item.id !== id);
  saveData();
  renderCosts();
}

function initCostForm() {
  const form = document.getElementById("costForm");
  const title = document.getElementById("costFormTitle");
  const cancel = document.getElementById("cancelCostEdit");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = getFormData(form);
    const id = formData.id || makeId();

    const record = {
      id,
      item: String(formData.item || "").trim(),
      event: String(formData.event || "").trim(),
      estimated: formData.estimated,
      actual: formData.actual,
      receipt: normalizeUrl(formData.receipt),
      notes: String(formData.notes || "").trim()
    };

    if (!record.item) {
      alert("Cost item is required.");
      return;
    }

    const existingIndex = data.costs.findIndex((item) => item.id === id);

    if (existingIndex >= 0) {
      data.costs[existingIndex] = record;
    } else {
      data.costs.unshift(record);
    }

    saveData();
    resetForm(form, title, "Add Cost", cancel);
    renderCosts();
  });

  cancel.addEventListener("click", () => {
    resetForm(form, title, "Add Cost", cancel);
  });
}

function renderHandoff() {
  const form = document.getElementById("handoffForm");
  fillForm(form, data.handoff);
}

function initHandoffForm() {
  const form = document.getElementById("handoffForm");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    data.handoff = getFormData(form);
    saveData();

    const message = document.getElementById("handoffSaved");
    message.textContent = "Saved in this browser.";

    setTimeout(() => {
      message.textContent = "";
    }, 2200);
  });
}

function updateStats() {
  const totalChecklistItems = checklistGroups.reduce((sum, group) => sum + group.items.length, 0);
  const completedChecklistItems = Object.values(data.checklist).filter(Boolean).length;

  const checklistPercent = totalChecklistItems
    ? Math.round((completedChecklistItems / totalChecklistItems) * 100)
    : 0;

  const actualCosts = data.costs.reduce((sum, item) => sum + Number(item.actual || 0), 0);

  document.getElementById("statChecklist").textContent = `${checklistPercent}%`;
  document.getElementById("statEvents").textContent = String(data.events.length);
  document.getElementById("statFiles").textContent = String(data.files.length);
  document.getElementById("statCosts").textContent = money(actualCosts);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

function exportBackup() {
  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data
  };

  downloadFile(
    "philanthropy-chairman-hub-backup.json",
    JSON.stringify(backup, null, 2),
    "application/json"
  );
}

function importBackup(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);
      const imported = backup.data || backup;

      if (!imported || typeof imported !== "object") {
        throw new Error("Invalid backup format.");
      }

      if (!confirm("Import this backup? This will replace the data saved in this browser.")) {
        return;
      }

      data = {
        checklist: imported.checklist || {},
        events: Array.isArray(imported.events) ? imported.events : [],
        files: Array.isArray(imported.files) ? imported.files : [],
        costs: Array.isArray(imported.costs) ? imported.costs : [],
        handoff: imported.handoff || {}
      };

      saveData();
      renderAll();

      alert("Backup imported.");
    } catch {
      alert("That file could not be imported. Make sure it is a valid backup JSON file.");
    }
  };

  reader.readAsText(file);
}

function rowsToCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);

  const escapeCsv = (value) => {
    const text = String(value ?? "");

    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ];

  return lines.join("\n");
}

function exportEventsCsv() {
  const rows = data.events.map((item) => ({
    eventName: item.eventName,
    semester: item.semester,
    beneficiary: item.beneficiary,
    gross: item.gross,
    costs: item.costs,
    net: Number(item.gross || 0) - Number(item.costs || 0),
    fileLink: item.fileLink,
    worked: item.worked,
    improve: item.improve
  }));

  downloadFile("philanthropy-events.csv", rowsToCsv(rows), "text/csv");
}

function exportCostsCsv() {
  const rows = data.costs.map((item) => ({
    item: item.item,
    event: item.event,
    estimated: item.estimated,
    actual: item.actual,
    variance: Number(item.actual || 0) - Number(item.estimated || 0),
    receipt: item.receipt,
    notes: item.notes
  }));

  downloadFile("philanthropy-costs.csv", rowsToCsv(rows), "text/csv");
}

function clearSavedData() {
  if (!confirm("Clear all saved hub data in this browser? Export a backup first if you need it.")) {
    return;
  }

  data = structuredCloneSafe(DEFAULT_DATA);
  saveData();
  renderAll();
}

function initBackupControls() {
  document.getElementById("exportBackup").addEventListener("click", exportBackup);

  document.getElementById("importBackup").addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (file) {
      importBackup(file);
    }

    event.target.value = "";
  });

  document.getElementById("exportEventsCsv").addEventListener("click", exportEventsCsv);
  document.getElementById("exportCostsCsv").addEventListener("click", exportCostsCsv);
  document.getElementById("printPage").addEventListener("click", () => window.print());
  document.getElementById("clearData").addEventListener("click", clearSavedData);
}

function initChecklistControls() {
  document.getElementById("resetChecklist").addEventListener("click", () => {
    if (!confirm("Reset checklist progress in this browser?")) {
      return;
    }

    data.checklist = {};
    saveData();
    renderChecklist();
  });
}

function renderAll() {
  renderChecklist();
  renderEvents();
  renderFiles();
  renderCosts();
  renderHandoff();
  updateStats();
}

function init() {
  initChecklistControls();
  initEventForm();
  initFileForm();
  initCostForm();
  initHandoffForm();
  initBackupControls();
  renderAll();
}

init();