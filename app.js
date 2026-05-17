/* ============================
   SUPABASE CONFIG (REST API)
============================ */
const SUPABASE_URL = "https://gsirpvtsxxrbhefsoyfz.supabase.co";
const SUPABASE_KEY = "sb_publishable_L6Ax61Zq1BEQqapjq__8sQ_GAYUTo8o";

/* ============================
   INDEXEDDB — DATABASE
============================ */
let db;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("WorkoutDB", 1);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains("kgHistory")) {
                db.createObjectStore("kgHistory", { keyPath: "exId" });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };

        request.onerror = (event) => reject(event);
    });
}

/* ============================
   GENERA ID UNICO
============================ */
function newId() {
    return crypto.randomUUID();
}

/* ============================
   WORKOUTS
============================ */
let workouts = { 1: [], 2: [], 3: [] };
let currentDay = 1;
let openExerciseId = null;



function loadWorkoutsFromStorage() {
    const stored = localStorage.getItem("workouts");
    if (!stored) return;

    try {
        const parsed = JSON.parse(stored);
        // Copia dentro l'oggetto esistente senza riassegnare
        for (const day in parsed) {
            workouts[day] = parsed[day];
        }
    } catch (e) {
        console.error("Errore nel parsing dei workouts da localStorage", e);
    }
}

async function loadExercisesFromDB() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/exercises?select=*`, {
        method: "GET",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        }
    });

    const data = await res.json();

    console.log("DATI DAL DB:", data); // 👈 DEBUG

    // Reset struttura
    workouts = { 1: [], 2: [], 3: [] };

    data.forEach(ex => {
        workouts[ex.day].push({
            id: ex.id,
            name: ex.name,
            series: ex.series,
            reps: ex.reps,
            rest: ex.rest
        });
    });

    // Ordina per ID
    for (const day in workouts) {
        workouts[day].sort((a, b) => a.id - b.id);
    }
}


/* ============================
   CARICA GIORNO
============================ */
function loadDay(day) {
    // Salva il giorno attivo
    currentDay = day;

    const container = document.getElementById("exercise-list");

    // Effetto fade-out prima del reload
    container.classList.remove("show");
    container.classList.add("fade");

    container.innerHTML = "";

    workouts[day].forEach((ex) => {

        const wrapper = document.createElement("div");
        wrapper.className = "exercise";

        wrapper.innerHTML = `
            <div class="exercise-header" onclick="toggleExercise('${ex.id}')">
                <h2>${ex.name}</h2>
                <span id="check-${ex.id}" class="exercise-check"></span>
            </div>

            <div class="exercise-body" id="exercise-body-${ex.id}" style="display:none;">
                <p>${ex.series} serie × ${ex.reps} ripetizioni</p>
                <p>Recupero: ${ex.rest} sec</p>
            </div>
        `;

        const body = wrapper.querySelector(".exercise-body");

        for (let i = 1; i <= ex.series; i++) {
            const seriesDiv = document.createElement("div");
            seriesDiv.className = "series";

            seriesDiv.innerHTML = `
                <strong class="series-title">Serie ${i}</strong>

                <button class="btn-icon btn-start" onclick="startTimer(${ex.rest}, this)">Start</button>
                <button class="btn-icon btn-stop" onclick="stopTimer(this)">Stop</button>
                <button class="btn-icon btn-reset" onclick="resetTimer(${ex.rest}, this)">Reset</button>

                <span class="timer">⏱️ ${ex.rest}.00</span>

                <br><br>

                <div class="kg-row">
                    <label>Kg:</label>
                    <input id="kg-${ex.id}-${i}" type="number">
                    <button class="btn-icon btn-save" onclick="saveKg('${ex.id}', ${i})">Salva</button>
                </div>

                <div id="lastkg-${ex.id}-${i}" class="lastkg"></div>
            `;

            body.appendChild(seriesDiv);
        }

        setTimeout(() => {
            loadKgInputs(ex.id);
            loadLastKg(ex.id);
            updateExerciseCheck(ex.id);
        }, 0);

        container.appendChild(wrapper);
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "Modifica esercizi";
    editBtn.className = "edit-btn";
    editBtn.onclick = () => enterEditMode(day);
    container.appendChild(editBtn);

    // 🔥 Riapri l’esercizio che era aperto
    if (openExerciseId) {
        const body = document.getElementById(`exercise-body-${openExerciseId}`);
        if (body) body.style.display = "block";
    }

    // 🔥 Fade-in fluido
    setTimeout(() => {
        container.classList.add("show");
    }, 5);
}
/* ============================
   TOCGGLE EXERCISE
============================ */
function toggleExercise(id) {
    const body = document.getElementById(`exercise-body-${id}`);

    if (!body) return;

    if (body.style.display === "none") {
        body.style.display = "block";
        openExerciseId = id; // 👈 salva quale esercizio è aperto
    } else {
        body.style.display = "none";
        openExerciseId = null;
    }
}


/* ============================
   SALVATAGGIO KG (REST API)
============================ */
async function saveKg(exId, series) {
    const input = document.getElementById(`kg-${exId}-${series}`);
    const kgValue = input.value;
    if (!kgValue) return;

    const today = getTodayLocalDate();

    // Salva su Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/kg_history`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Prefer": "return=minimal"
        },
        body: JSON.stringify({
            ex_id: exId,
            series: series,
            kg: parseFloat(kgValue),
            date: today
        })
    });

    // Aggiorna SUBITO la UI
    const span = document.getElementById(`lastkg-${exId}-${series}`);
    if (span) {
        span.textContent = `Ultimo: ${kgValue}kg (${today})`;
    }

    // Aggiorna la spunta basandosi SOLO sulla UI
    await updateExerciseCheck(exId);

    // Aggiorna IndexedDB (solo storico, NON UI)
    await new Promise(async (resolve) => {
        await openDB();
        const tx = db.transaction("kgHistory", "readwrite");
        const store = tx.objectStore("kgHistory");

        const req = store.get(exId);
        req.onsuccess = () => {
            const record = req.result || { exId, data: {} };

            if (!record.data[series]) record.data[series] = [];
            record.data[series].push({ kg: parseFloat(kgValue), date: today });

            record.data[series].sort((a, b) => new Date(a.date) - new Date(b.date));

            const putReq = store.put(record);
            putReq.onsuccess = () => resolve();
        };
        // 👇 Ricarica l’intero giorno dopo il salvataggio
        loadDay(currentDay);
        scrollToExercise(exId);


    });
}




/* ============================
   CARICA ULTIMO KG
============================ */
async function loadLastKg(exId) {
    const exercise = findExerciseById(exId);
    if (!exercise) return;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/kg_history?ex_id=eq.${exId}&select=*`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });

    const data = await res.json();

    // 1. Aggiorna UI
    for (let s = 1; s <= exercise.series; s++) {
        const span = document.getElementById(`lastkg-${exId}-${s}`);
        if (!span) continue;

        const entries = data.filter(d => d.series === s);

        if (entries.length === 0) {
            span.textContent = "";
            continue;
        }

        // Ordina per data
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));

        const last = entries[entries.length - 1];
        span.textContent = `Ultimo: ${last.kg}kg (${last.date})`;
    }

    // 2. Sincronizza IndexedDB
    await openDB();
    const tx = db.transaction("kgHistory", "readwrite");
    const store = tx.objectStore("kgHistory");

    const record = { exId, data: {} };

    data.forEach(row => {
        if (!record.data[row.series]) record.data[row.series] = [];
        record.data[row.series].push({ kg: row.kg, date: row.date });

        // Ordina per data
        record.data[row.series].sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    store.put(record);

    await updateExerciseCheck(exId);

}
/* ============================
   SPUNTA ✔️ (IndexedDB)
============================ */
async function updateExerciseCheck(exId) {
    const exercise = findExerciseById(exId);
    if (!exercise) return;

    let completed = 0;
    const today = getTodayLocalDate();

    for (let s = 1; s <= exercise.series; s++) {
        const span = document.getElementById(`lastkg-${exId}-${s}`);
        if (!span) continue;

        if (span.textContent.includes(today)) {
            completed++;
        }
    }

    const checkSpan = document.getElementById(`check-${exId}`);
    if (!checkSpan) return;

    if (completed === exercise.series) {
        checkSpan.textContent = "✔️";
        checkSpan.classList.add("done");
    } else {
        checkSpan.textContent = "";
        checkSpan.classList.remove("done");
    }
}



/* ============================
   TROVA ESERCIZIO PER ID
============================ */
function findExerciseById(id) {
    for (const day in workouts) {
        for (const ex of workouts[day]) {
            if (ex.id === id) return ex;
        }
    }
    return null;
}

/* ============================
   EDIT MODE
============================ */
function enterEditMode(day) {
    const container = document.getElementById("exercise-list");
    container.innerHTML = "";

    workouts[day].forEach(ex => {
        const box = document.createElement("div");
        box.className = "edit-mode";

        box.innerHTML = `
            <div class="edit-header">
                <h3>${ex.name}</h3>
                <button class="delete-btn" onclick="deleteExerciseById('${ex.id}', ${day})">❌</button>
            </div>

            <div class="edit-body">
                <label>Nome esercizio</label>
                <input type="text" id="edit-name-${ex.id}" value="${ex.name}">

                <label>Serie</label>
                <input type="number" id="edit-series-${ex.id}" value="${ex.series}">

                <label>Ripetizioni</label>
                <input type="number" id="edit-reps-${ex.id}" value="${ex.reps}">

                <label>Recupero (sec)</label>
                <input type="number" id="edit-rest-${ex.id}" value="${ex.rest}">
            </div>

            <button class="save-btn" onclick="saveEditMode('${ex.id}', ${day})">Salva modifiche</button>
        `;

        container.appendChild(box);
    });

    const addBtn = document.createElement("button");
    addBtn.textContent = "Aggiungi esercizio";
    addBtn.className = "add-btn";
    addBtn.onclick = () => addNewExercise(day);
    container.appendChild(addBtn);

    const saveAllBtn = document.createElement("button");
    saveAllBtn.textContent = "Salva";
    saveAllBtn.className = "cancel-btn"; 
    saveAllBtn.onclick = () => saveAllExercises(day);
    container.appendChild(saveAllBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Annulla";
    cancelBtn.className = "cancel-btn";
    cancelBtn.onclick = () => loadDay(day);
    container.appendChild(cancelBtn);
}

/* ============================
   SALVA MODIFICHE SINGOLO EX
============================ */
async function saveEditMode(exId, day) {
    const nameEl = document.getElementById(`edit-name-${exId}`);
    const seriesEl = document.getElementById(`edit-series-${exId}`);
    const repsEl = document.getElementById(`edit-reps-${exId}`);
    const restEl = document.getElementById(`edit-rest-${exId}`);

    const name = nameEl ? nameEl.value.trim() : "";
    const series = seriesEl ? parseInt(seriesEl.value) : null;
    const reps = repsEl ? parseInt(repsEl.value) : null;
    const rest = restEl ? parseInt(restEl.value) : null;

    await fetch(`${SUPABASE_URL}/rest/v1/exercises?id=eq.${exId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ name, series, reps, rest })
    });

    // ricarica dati da DB e torna alla vista normale
    await loadExercisesFromDB();
    loadDay(day);

}

/* ============================
   AGGIUNGI NUOVO ESERCIZIO
============================ */
async function addNewExercise(day) {
    const newId = Date.now(); // id numerico fisso

    await fetch(`${SUPABASE_URL}/rest/v1/exercises`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
            id: newId,
            day: day,
            name: "Nuovo esercizio",
            series: 3,
            reps: 10,
            rest: 60
        })
    });

    await loadExercisesFromDB();
    enterEditMode(day);
}



/* ============================
   ELIMINA ESERCIZIO
============================ */
async function deleteExerciseById(exId, day) {
    await fetch(`${SUPABASE_URL}/rest/v1/exercises?id=eq.${exId}`, {
        method: "DELETE",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });

    await loadExercisesFromDB();
    enterEditMode(day);
}


/* ============================
   TIMER
============================ */
function startTimer(restSeconds, btn) {
    const seriesDiv = btn.closest(".series");
    const timerSpan = seriesDiv.querySelector(".timer");

    if (seriesDiv._timerInterval) return;

    let totalMs = seriesDiv._currentMs ?? restSeconds * 1000;
    seriesDiv._currentMs = totalMs;

    seriesDiv._timerInterval = setInterval(() => {
        totalMs -= 10;
        if (totalMs <= 0) {
            totalMs = 0;
            clearInterval(seriesDiv._timerInterval);
            seriesDiv._timerInterval = null;
        }

        seriesDiv._currentMs = totalMs;

        const sec = Math.floor(totalMs / 1000);
        const cs = Math.floor((totalMs % 1000) / 10);

        timerSpan.textContent = `⏱️ ${sec}.${cs.toString().padStart(2, "0")}`;
    }, 10);
}

function stopTimer(btn) {
    const seriesDiv = btn.closest(".series");
    if (seriesDiv._timerInterval) {
        clearInterval(seriesDiv._timerInterval);
        seriesDiv._timerInterval = null;
    }
}

function resetTimer(restSeconds, btn) {
    const seriesDiv = btn.closest(".series");
    const timerSpan = seriesDiv.querySelector(".timer");

    if (seriesDiv._timerInterval) {
        clearInterval(seriesDiv._timerInterval);
        seriesDiv._timerInterval = null;
    }

    const totalMs = restSeconds * 1000;
    seriesDiv._currentMs = totalMs;

    timerSpan.textContent = `⏱️ ${restSeconds}.00`;
}

/* ============================
   SALVA TUTTO (EDIT MODE)
============================ */
async function saveAllExercises(day) {
    const exercises = workouts[day];

    for (const ex of exercises) {
        const nameInput = document.getElementById(`edit-name-${ex.id}`);
        const seriesInput = document.getElementById(`edit-series-${ex.id}`);
        const repsInput = document.getElementById(`edit-reps-${ex.id}`);
        const restInput = document.getElementById(`edit-rest-${ex.id}`);

        const name = nameInput ? nameInput.value.trim() : ex.name;
        const series = seriesInput ? parseInt(seriesInput.value) : ex.series;
        const reps = repsInput ? parseInt(repsInput.value) : ex.reps;
        const rest = restInput ? parseInt(restInput.value) : ex.rest;

        await fetch(`${SUPABASE_URL}/rest/v1/exercises?id=eq.${ex.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ name, series, reps, rest })
        });
    }

    await loadExercisesFromDB();
    loadDay(day);
}



/* ============================
   RICARICA KG NEGLI INPUT
============================ */
async function loadKgInputs(exId) {
    const exercise = findExerciseById(exId);
    if (!exercise) return;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/kg_history?ex_id=eq.${exId}&select=*`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });

    const data = await res.json();

    for (let s = 1; s <= exercise.series; s++) {
        const input = document.getElementById(`kg-${exId}-${s}`);
        if (!input) continue;

        const entries = data.filter(d => d.series === s);
        if (entries.length === 0) {
            input.value = "";
            continue;
        }

        const last = entries[entries.length - 1];
        input.value = last.kg;
    }
}

function getTodayLocalDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`; // YYYY-MM-DD locale
}


/* ============================
   RICARICA TUTTO ALL’AVVIO
============================ */
document.addEventListener("DOMContentLoaded", async () => {
    await openDB();

    // 👇 ORA: carica gli esercizi da Supabase
    await loadExercisesFromDB();

    const today = new Date().getDay();
    const day = today === 0 ? 1 : today;

    loadDay(day);

    setTimeout(() => {
        for (const d in workouts) {
            workouts[d].forEach(ex => {
                loadKgInputs(ex.id);
                loadLastKg(ex.id);
                updateExerciseCheck(ex.id);
            });
        }
    }, 50);
});
