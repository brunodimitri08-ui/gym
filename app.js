/* ============================
   VERSION CHECK (AUTO UPDATE)
============================ */
async function checkVersion() {
    try {
        const response = await fetch("/gym/version.json", { cache: "no-store" });
        const text = await response.text();

        // Usa l'hash del contenuto come versione
        const hash = btoa(text);

        const localVersion = localStorage.getItem("app_version");

        if (localVersion !== hash) {
            localStorage.setItem("app_version", hash);

            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ action: "skipWaiting" });
            }

            location.reload();
        }
    } catch (e) {
        console.log("Version check failed", e);
    }
}

checkVersion();
setInterval(checkVersion, 5000);

/* ============================
   IL TUO APP.JS ORIGINALE
============================ */

const workouts = {
    1: [
        { name: "Panca piana bilanciere", series: 4, reps: 8, rest: 120 },
        { name: "Panca inclinata manubri", series: 3, reps: 10, rest: 90 },
        { name: "Chest press / Croci / Butterfly", series: 3, reps: 12, rest: 75 },
        { name: "Military press manubri", series: 3, reps: 10, rest: 90 },
        { name: "Alzate laterali", series: 3, reps: 15, rest: 60 },
        { name: "Tricipiti ai cavi", series: 3, reps: 15, rest: 60 },
        { name: "French press", series: 2, reps: 12, rest: 75 }
    ],
    2: [
        { name: "Lat machine", series: 4, reps: 8, rest: 120 },
        { name: "Pulley basso", series: 4, reps: 10, rest: 120 },
        { name: "Pulldown presa stretta", series: 3, reps: 12, rest: 90 },
        { name: "Rematore macchina", series: 3, reps: 10, rest: 120 },
        { name: "Curl bilanciere", series: 3, reps: 12, rest: 75 },
        { name: "Curl manubri alternati", series: 2, reps: 14, rest: 60 },
        { name: "Hammer curl", series: 3, reps: 12, rest: 75 }
    ],
    3: [
        { name: "Squat", series: 4, reps: 8, rest: 120 },
        { name: "Leg press", series: 4, reps: 12, rest: 120 },
        { name: "Leg curl", series: 3, reps: 15, rest: 75 },
        { name: "Chest press leggera", series: 2, reps: 15, rest: 60 },
        { name: "Pulley basso neutra", series: 2, reps: 15, rest: 60 },
        { name: "Addome", series: 3, reps: 15, rest: 60 }
    ]
};

/* ============================
   CARICAMENTO GIORNO
============================ */
function loadDay(day) {
    const container = document.getElementById("exercise-list");
    container.innerHTML = "";

    workouts[day].forEach((ex, idx) => {

        const wrapper = document.createElement("div");
        wrapper.className = "exercise";

        wrapper.innerHTML = `
            <div class="exercise-header" onclick="toggleExercise(${day}, ${idx})">
                <h2>${ex.name}</h2>
                <span id="check-${day}-${idx}" class="exercise-check"></span>
            </div>

            <div class="exercise-body" id="exercise-body-${day}-${idx}" style="display:none;">
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

                Kg: <input id="kg-${day}-${idx}-${i}" type="number">
                <button class="btn-icon btn-save" onclick="saveKg(${day}, ${idx}, ${i})">Salva</button>

                <span id="lastkg-${day}-${idx}-${i}" class="lastkg"></span>
            `;

            body.appendChild(seriesDiv);
        }

        setTimeout(() => {
            loadLastKg(day, idx);
            updateExerciseCheck(day, idx);
        }, 0);

        container.appendChild(wrapper);
    });
}

/* ============================
   TENDINA
============================ */
function toggleExercise(day, idx) {
    const body = document.getElementById(`exercise-body-${day}-${idx}`);
    body.style.display = body.style.display === "none" ? "block" : "none";
}

/* ============================
   TIMER CON CENTESIMI
============================ */
function startTimer(seconds, btn) {
    const parent = btn.parentElement;

    if (parent.timerInterval) return;

    const timerSpan = parent.querySelector(".timer");

    let totalMs = seconds * 1000;

    parent.timerInterval = setInterval(() => {
        totalMs -= 10;

        if (totalMs <= 0) {
            clearInterval(parent.timerInterval);
            parent.timerInterval = null;
            timerSpan.textContent = "✔️ Fine recupero";
            return;
        }

        const sec = Math.floor(totalMs / 1000);
        const ms = Math.floor((totalMs % 1000) / 10);

        timerSpan.textContent = `⏱️ ${sec}.${ms.toString().padStart(2, "0")}`;

    }, 10);
}

function stopTimer(btn) {
    const parent = btn.parentElement;

    if (parent.timerInterval) {
        clearInterval(parent.timerInterval);
        parent.timerInterval = null;
    }
}

function resetTimer(seconds, btn) {
    const parent = btn.parentElement;

    if (parent.timerInterval) {
        clearInterval(parent.timerInterval);
        parent.timerInterval = null;
    }

    const timerSpan = parent.querySelector(".timer");
    timerSpan.textContent = `⏱️ ${seconds}.00`;
}

/* ============================
   SALVATAGGIO KG
============================ */
function saveKg(day, exIndex, series) {
    const key = "kgHistory";
    const data = JSON.parse(localStorage.getItem(key)) || {};

    const today = new Date().toISOString().split("T")[0];
    const input = document.getElementById(`kg-${day}-${exIndex}-${series}`);
    const kg = Number(input.value);

    if (!kg) return;

    if (!data[day]) data[day] = {};
    if (!data[day][exIndex]) data[day][exIndex] = {};
    if (!data[day][exIndex][series]) data[day][exIndex][series] = [];

    data[day][exIndex][series].push({
        kg: kg,
        date: today
    });

    localStorage.setItem(key, JSON.stringify(data));

    loadLastKg(day, exIndex);
    updateExerciseCheck(day, exIndex);
}

/* ============================
   MOSTRA ULTIMO KG
============================ */
function loadLastKg(day, exIndex) {
    const key = "kgHistory";
    const data = JSON.parse(localStorage.getItem(key)) || {};

    if (!data[day] || !data[day][exIndex]) return;

    const seriesData = data[day][exIndex];

    Object.keys(seriesData).forEach(series => {
        const entries = seriesData[series];
        const last = entries[entries.length - 1];

        const span = document.getElementById(`lastkg-${day}-${exIndex}-${series}`);
        if (span) {
            span.textContent = `Ultimo: ${last.kg} kg (${last.date})`;
        }
    });

    updateExerciseCheck(day, exIndex);
}

/* ============================
   SPUNTA DI COMPLETAMENTO
============================ */
function updateExerciseCheck(day, exIndex) {
    const key = "kgHistory";
    const data = JSON.parse(localStorage.getItem(key)) || {};
    const today = new Date().toISOString().split("T")[0];

    const exercise = workouts[day][exIndex];
    const totalSeries = exercise.series;

    if (!data[day] || !data[day][exIndex]) return;

    let completed = 0;

    for (let s = 1; s <= totalSeries; s++) {
        const seriesData = data[day][exIndex][s];
        if (!seriesData) continue;

        const last = seriesData[seriesData.length - 1];
        if (last && last.date === today) {
            completed++;
        }
    }

    const checkSpan = document.getElementById(`check-${day}-${exIndex}`);

    if (completed === totalSeries) {
        checkSpan.classList.add("done");
    } else {
        checkSpan.classList.remove("done");
    }
}
