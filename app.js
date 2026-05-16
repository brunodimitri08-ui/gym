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
   WORKOUTS CON ID AUTOMATICI
============================ */
const workouts = {
    1: [
        { id: "1", name: "Panca piana bilanciere", series: 4, reps: 8, rest: 120 },
        { id: "2", name: "Panca inclinata manubri", series: 3, reps: 10, rest: 90 },
        { id: "3", name: "Chest press / Croci / Butterfly", series: 3, reps: 12, rest: 75 },
        { id: "4", name: "Military press manubri", series: 3, reps: 10, rest: 90 },
        { id: "5", name: "Alzate laterali", series: 3, reps: 15, rest: 60 },
        { id: "6", name: "Tricipiti ai cavi", series: 3, reps: 15, rest: 60 },
        { id: "7", name: "French press", series: 2, reps: 12, rest: 75 }
    ],
    2: [
        { id: "8", name: "Lat machine", series: 4, reps: 8, rest: 120 },
        { id: "9", name: "Pulley basso", series: 4, reps: 10, rest: 120 },
        { id: "10", name: "Pulldown presa stretta", series: 3, reps: 12, rest: 90 },
        { id: "11", name: "Rematore macchina", series: 3, reps: 10, rest: 120 },
        { id: "12", name: "Curl bilanciere", series: 3, reps: 12, rest: 75 },
        { id: "13", name: "Curl manubri alternati", series: 2, reps: 14, rest: 60 },
        { id: "14", name: "Hammer curl", series: 3, reps: 12, rest: 75 }
    ],
    3: [
        { id: "15", name: "Squat", series: 4, reps: 8, rest: 120 },
        { id: "16", name: "Leg press", series: 4, reps: 12, rest: 120 },
        { id: "17", name: "Leg curl", series: 3, reps: 15, rest: 75 },
        { id: "18", name: "Chest press leggera", series: 2, reps: 15, rest: 60 },
        { id: "19", name: "Pulley basso neutra", series: 2, reps: 15, rest: 60 },
        { id: "20", name: "Addome", series: 3, reps: 15, rest: 60 }
    ]
};

/* ============================
   CARICA GIORNO
============================ */
function loadDay(day) {
    const container = document.getElementById("exercise-list");
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
            updateExerciseCheck(ex.id, ex.series);

        }, 0);

        container.appendChild(wrapper);
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "Modifica esercizi";
    editBtn.className = "edit-btn";
    editBtn.onclick = () => enterEditMode(day);
    container.appendChild(editBtn);
}

/* ============================
   TOGGLE
============================ */
function toggleExercise(id) {
    const body = document.getElementById(`exercise-body-${id}`);
    body.style.display = body.style.display === "none" ? "block" : "none";
}

/* ============================
   SALVATAGGIO KG (FORMATO UNICO)
============================ */
async function saveKg(exId, series) {
    const input = document.getElementById(`kg-${exId}-${series}`);
    const kgValue = input.value;
    if (!kgValue) return;

    const today = new Date().toISOString().split("T")[0];

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
            kg: parseInt(kgValue),
            date: today
        })
    });

    loadLastKg(exId);
    updateExerciseCheck(exId);
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

    for (let s = 1; s <= exercise.series; s++) {
        const span = document.getElementById(`lastkg-${exId}-${s}`);
        if (!span) continue;

        const entries = data.filter(d => d.series === s);
        if (entries.length === 0) {
            span.textContent = "";
            continue;
        }

        const last = entries[entries.length - 1];
        span.textContent = `Ultimo: ${last.kg}kg (${last.date})`;
    }

    updateExerciseCheck(exId);
}

/* ============================
   SPUNTA ✔️
============================ */
async function updateExerciseCheck(ex_id, totalSeries) {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
        .from("kg_history")
        .select("series, date")
        .eq("ex_id", ex_id)
        .eq("date", today);

    if (error) {
        console.error("Errore updateExerciseCheck:", error);
        return;
    }

    const checkSpan = document.getElementById(`check-${ex_id}`);

    if (!data || data.length === 0) {
        if (checkSpan) checkSpan.textContent = "";
        return;
    }

    const completedSeries = new Set(data.map(row => row.series));

    if (completedSeries.size === totalSeries) {
        checkSpan.textContent = "✔️";
    } else {
        checkSpan.textContent = "";
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
function saveEditMode(exId, day) {
    const ex = findExerciseById(exId);
    if (!ex) return;

    ex.name = document.getElementById(`edit-name-${exId}`).value;
    ex.series = parseInt(document.getElementById(`edit-series-${exId}`).value);
    ex.reps = parseInt(document.getElementById(`edit-reps-${exId}`).value);
    ex.rest = parseInt(document.getElementById(`edit-rest-${exId}`).value);

    loadDay(day);
}

/* ============================
   AGGIUNGI NUOVO ESERCIZIO
============================ */
function addNewExercise(day) {
    const newEx = {
        id: newId(),
        name: "Nuovo esercizio",
        series: 3,
        reps: 10,
        rest: 60
    };

    workouts[day].push(newEx);
    enterEditMode(day);
}

/* ============================
   ELIMINA ESERCIZIO
============================ */
function deleteExerciseById(exId, day) {
    workouts[day] = workouts[day].filter(ex => ex.id !== exId);
    enterEditMode(day);
}

/* ============================
   TIMER CON MILLISECONDI
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
function saveAllExercises(day) {
    const exercises = workouts[day];

    exercises.forEach((ex) => {
        const nameInput = document.getElementById(`edit-name-${ex.id}`);
        const seriesInput = document.getElementById(`edit-series-${ex.id}`);
        const repsInput = document.getElementById(`edit-reps-${ex.id}`);
        const restInput = document.getElementById(`edit-rest-${ex.id}`);

        if (nameInput) ex.name = nameInput.value.trim();
        if (seriesInput) ex.series = parseInt(seriesInput.value);
        if (repsInput) ex.reps = parseInt(repsInput.value);
        if (restInput) ex.rest = parseInt(restInput.value);
    });

    localStorage.setItem("workouts", JSON.stringify(workouts));

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

/* ============================
   RICARICA TUTTO ALL’AVVIO
============================ */
document.addEventListener("DOMContentLoaded", () => {
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

async function loadAllLatestKg() {
    for (const d in workouts) {
        for (const ex of workouts[d]) {
            await loadKgInputs(ex.id);
            await loadLastKg(ex.id);
            await updateExerciseCheck(ex.id);
        }
    }
}


document.addEventListener("DOMContentLoaded", () => {
    loadDay(1);

    setTimeout(() => {
        loadAllLatestKg();
    }, 300);
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        for (const d in workouts) {
            workouts[d].forEach(ex => {
                updateExerciseCheck(ex.id, ex.series);
            });
        }
    }
});
