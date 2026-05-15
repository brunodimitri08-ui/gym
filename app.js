/* ==========================================================
   WORKOUT APP — APP.JS
   Versione: 2.2 — ID Unici + Edit Mode Completo
   Ultima modifica: 15/05/2026
   ========================================================== */

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
        { id: newId(), name: "Panca piana bilanciere", series: 4, reps: 8, rest: 120 },
        { id: newId(), name: "Panca inclinata manubri", series: 3, reps: 10, rest: 90 },
        { id: newId(), name: "Chest press / Croci / Butterfly", series: 3, reps: 12, rest: 75 },
        { id: newId(), name: "Military press manubri", series: 3, reps: 10, rest: 90 },
        { id: newId(), name: "Alzate laterali", series: 3, reps: 15, rest: 60 },
        { id: newId(), name: "Tricipiti ai cavi", series: 3, reps: 15, rest: 60 },
        { id: newId(), name: "French press", series: 2, reps: 12, rest: 75 }
    ],
    2: [
        { id: newId(), name: "Lat machine", series: 4, reps: 8, rest: 120 },
        { id: newId(), name: "Pulley basso", series: 4, reps: 10, rest: 120 },
        { id: newId(), name: "Pulldown presa stretta", series: 3, reps: 12, rest: 90 },
        { id: newId(), name: "Rematore macchina", series: 3, reps: 10, rest: 120 },
        { id: newId(), name: "Curl bilanciere", series: 3, reps: 12, rest: 75 },
        { id: newId(), name: "Curl manubri alternati", series: 2, reps: 14, rest: 60 },
        { id: newId(), name: "Hammer curl", series: 3, reps: 12, rest: 75 }
    ],
    3: [
        { id: newId(), name: "Squat", series: 4, reps: 8, rest: 120 },
        { id: newId(), name: "Leg press", series: 4, reps: 12, rest: 120 },
        { id: newId(), name: "Leg curl", series: 3, reps: 15, rest: 75 },
        { id: newId(), name: "Chest press leggera", series: 2, reps: 15, rest: 60 },
        { id: newId(), name: "Pulley basso neutra", series: 2, reps: 15, rest: 60 },
        { id: newId(), name: "Addome", series: 3, reps: 15, rest: 60 }
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
}

/* ============================
   TOGGLE
============================ */
function toggleExercise(id) {
    const body = document.getElementById(`exercise-body-${id}`);
    body.style.display = body.style.display === "none" ? "block" : "none";
}

/* ============================
   SALVATAGGIO KG
============================ */
function saveKg(exId, series) {
    const key = "kgHistory";
    const data = JSON.parse(localStorage.getItem(key)) || {};
    const today = new Date().toISOString().split("T")[0];

    if (!data[exId]) data[exId] = {};
    if (!data[exId][series]) data[exId][series] = [];

    const input = document.getElementById(`kg-${exId}-${series}`);
    const kgValue = input.value;

    if (!kgValue) return;

    data[exId][series].push({
        kg: kgValue,
        date: today
    });

    localStorage.setItem(key, JSON.stringify(data));

    loadLastKg(exId);
    updateExerciseCheck(exId);
}

/* ============================
   CARICA ULTIMO KG
============================ */
function loadLastKg(exId) {
    const key = "kgHistory";
    const data = JSON.parse(localStorage.getItem(key)) || {};

    if (!data[exId]) return;

    const exercise = findExerciseById(exId);
    if (!exercise) return;

    for (let s = 1; s <= exercise.series; s++) {
        const span = document.getElementById(`lastkg-${exId}-${s}`);
        if (!span) continue;

        const seriesData = data[exId][s];
        if (!seriesData || seriesData.length === 0) {
            span.textContent = "";
            continue;
        }

        const last = seriesData[seriesData.length - 1];
        span.textContent = `Ultimo: ${last.kg}kg (${last.date})`;
    }

    updateExerciseCheck(exId);
}

/* ============================
   SPUNTA ✔️
============================ */
function updateExerciseCheck(exId) {
    const key = "kgHistory";
    const data = JSON.parse(localStorage.getItem(key)) || {};
    const today = new Date().toISOString().split("T")[0];

    const exercise = findExerciseById(exId);
    if (!exercise) return;

    const totalSeries = exercise.series;
    let completed = 0;

    if (!data[exId]) return;

    for (let s = 1; s <= totalSeries; s++) {
        const seriesData = data[exId][s];
        if (!seriesData) continue;

        const last = seriesData[seriesData.length - 1];
        if (last && last.date === today) {
            completed++;
        }
    }

    const checkSpan = document.getElementById(`check-${exId}`);
    if (!checkSpan) return;

    if (completed === totalSeries) {
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
   EDIT MODE — VERSIONE COMPLETA
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
    saveAllBtn.className = "save-all-btn";
    saveAllBtn.onclick = () => saveAllExercises(day);
    container.appendChild(saveAllBtn);


    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Annulla";
    cancelBtn.className = "cancel-btn";
    cancelBtn.onclick = () => loadDay(day);
    container.appendChild(cancelBtn);
}

/* ============================
   SALVA MODIFICHE
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
   TIMER CON MILLISECONDI (2 cifre)
============================ */

function startTimer(restSeconds, btn) {
    const seriesDiv = btn.closest(".series");
    const timerSpan = seriesDiv.querySelector(".timer");

    // Se esiste già un timer attivo, non avviarne un altro
    if (seriesDiv._timerInterval) return;

    // Tempo totale in millisecondi
    let totalMs = seriesDiv._currentMs ?? restSeconds * 1000;

    seriesDiv._currentMs = totalMs;

    seriesDiv._timerInterval = setInterval(() => {
        totalMs -= 10; // aggiorna ogni 10 ms
        if (totalMs <= 0) {
            totalMs = 0;
            clearInterval(seriesDiv._timerInterval);
            seriesDiv._timerInterval = null;
        }

        seriesDiv._currentMs = totalMs;

        const sec = Math.floor(totalMs / 1000);
        const cs = Math.floor((totalMs % 1000) / 10); // centisecondi (00–99)

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

function saveAllExercises(day) {
    const key = "kgHistory";
    const data = JSON.parse(localStorage.getItem(key)) || {};

    const exercises = days[day].exercises;

    if (!data[day]) data[day] = {};

    exercises.forEach((ex, exIndex) => {
        if (!data[day][exIndex]) data[day][exIndex] = {};

        for (let s = 1; s <= ex.series; s++) {
            const input = document.getElementById(`kg-${day}-${exIndex}-${s}`);
            if (!input) continue;

            const kg = input.value.trim();
            if (kg === "") continue;

            if (!data[day][exIndex][s]) data[day][exIndex][s] = [];

            data[day][exIndex][s].push({
                kg: kg,
                date: new Date().toLocaleString()
            });
        }

        // aggiorna lo storico
        loadExerciseHistory(day, exIndex);

        // aggiorna il check verde
        updateExerciseCompletion(day, exIndex);
    });

    localStorage.setItem(key, JSON.stringify(data));

    alert("Tutti gli esercizi sono stati salvati!");
}

