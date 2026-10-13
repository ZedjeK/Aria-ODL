// Aria ODL — popup : réglages de la correction en direct (stockés localement)
// et traduction rapide dans les deux sens entre deux bulles.

const DEFAULTS = { liveEnabled: true, disabledHosts: [] };
const $ = (selector) => document.querySelector(selector);

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
let host = "";
try {
    const url = new URL(tab?.url ?? "");
    if (url.protocol === "http:" || url.protocol === "https:") {
        host = url.hostname;
    }
} catch {
    // page interne du navigateur
}

let settings = await chrome.storage.local.get(DEFAULTS);

function render() {
    $("#live").checked = settings.liveEnabled;
    const siteToggle = $("#site");
    const siteRow = $("#site-row");
    if (!host) {
        $("#site-name").textContent = "Page interne : non prise en charge";
        siteToggle.checked = false;
        siteToggle.disabled = true;
        siteRow.classList.add("disabled");
        $("#check").disabled = true;
        $("#translate-page").disabled = true;
        return;
    }
    $("#site-name").textContent = host;
    siteToggle.checked = !settings.disabledHosts.includes(host);
    siteToggle.disabled = !settings.liveEnabled;
    siteRow.classList.toggle("disabled", !settings.liveEnabled);
}

async function save(patch) {
    settings = { ...settings, ...patch };
    await chrome.storage.local.set(patch);
    render();

}

$("#live").addEventListener("change", (event) => save({ liveEnabled: event.target.checked }));

$("#site").addEventListener("change", (event) => {
    const others = settings.disabledHosts.filter((h) => h !== host);
    save({ disabledHosts: event.target.checked ? others : [...others, host] });
});

$("#check").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ target: "sw", cmd: "open-panel", tabId: tab.id });
    window.close();
});

$("#translate-page").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ target: "sw", cmd: "translate-page", tabId: tab.id });
    window.close();
});

$("#bench").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("test/test.html") });
    window.close();
});

render();

// --- Traduction rapide ---
// Écrire dans une bulle traduit vers l'autre (sens détecté automatiquement).
// Les textes sont gardés dans le stockage de session : locaux, effacés à la fermeture d'Opera.

const QUICK_DELAY_MS = 400;
const bubbles = { a: $("#qt-a"), b: $("#qt-b") };
const labels = { a: $("#qt-lang-a"), b: $("#qt-lang-b") };
const other = { a: "b", b: "a" };
let quickSeq = 0;
let quickTimer = null;

function setStatus(text, isError = false) {
    const status = $("#qt-status");
    status.textContent = text;
    status.className = isError ? "qt-status ko" : "qt-status";
}

function setLabels(side, from, to) {
    labels[side].textContent = from.toUpperCase();
    labels[other[side]].textContent = to.toUpperCase();
}

function remember() {
    chrome.storage.session?.set({ quickA: bubbles.a.value, quickB: bubbles.b.value, quickLabels: [labels.a.textContent, labels.b.textContent] }).catch(() => {});
}

async function translateFrom(side) {
    const seq = ++quickSeq;
    const text = bubbles[side].value;
    const target = other[side];
    if (text.trim() === "") {
        bubbles[target].value = "";
        setStatus("");
        remember();
        return;
    }
    setStatus("traduction…");
    let response;
    try {
        response = await chrome.runtime.sendMessage({ target: "sw", cmd: "translate", from: "auto", text, priority: 0 });
    } catch (error) {
        response = { ok: false, error: error.message };
    }
    // Une frappe plus récente (dans l'une ou l'autre bulle) l'emporte.
    if (seq !== quickSeq) {
        return;
    }
    if (!response?.ok) {
        setStatus(response?.error ?? "Pas de réponse de l'extension.", true);
        return;
    }
    bubbles[target].value = response.text;
    setLabels(side, response.from, response.to);
    setStatus(`${response.from.toUpperCase()} → ${response.to.toUpperCase()} · ${Math.round(response.engineMs ?? 0)} ms`);
    remember();
}

for (const side of ["a", "b"]) {
    bubbles[side].addEventListener("input", () => {
        clearTimeout(quickTimer);
        remember();
        quickTimer = setTimeout(() => translateFrom(side), QUICK_DELAY_MS);
    });
    $(`#qt-copy-${side}`).addEventListener("click", async (event) => {
        const button = event.currentTarget;
        try {
            await navigator.clipboard.writeText(bubbles[side].value);
            button.textContent = "Copié ✓";
        } catch {
            button.textContent = "Échec";
        }
        setTimeout(() => {
            button.textContent = "Copier";
        }, 1200);
    });
}

$("#qt-swap").addEventListener("click", () => {
    clearTimeout(quickTimer);
    quickSeq++;
    [bubbles.a.value, bubbles.b.value] = [bubbles.b.value, bubbles.a.value];
    [labels.a.textContent, labels.b.textContent] = [labels.b.textContent, labels.a.textContent];
    setStatus("");
    remember();
    bubbles.a.focus();
});

try {
    const saved = await chrome.storage.session.get({ quickA: "", quickB: "", quickLabels: null });
    bubbles.a.value = saved.quickA;
    bubbles.b.value = saved.quickB;
    if (saved.quickLabels) {
        [labels.a.textContent, labels.b.textContent] = saved.quickLabels;
    }
} catch {
    // stockage de session indisponible : bulles vides
}
bubbles.a.focus();
