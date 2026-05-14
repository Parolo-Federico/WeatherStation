const SERVER_ADDRESS = "localhost:3000";
const dataSection = document.querySelector("#data-section");
const getDataButton = document.querySelector("#getData");
const addressField = document.querySelector("#ip-address");
const labsSelection = document.querySelector("#lab-selection");
const workstationsList = document.querySelector("#workstations-list");
const sidebarHider = document.querySelector("#sidebar-hider");
const leftPane = document.querySelector("#left-pane");
const resultLabel = document.querySelector("#result");

let data = []; // array that contains parsed json
let labs = {}; // object that contains a field for every lab with the respective measures
let currentServerAddress = "";

let tempChartInstance = null;
let humChartInstance = null;
let lumChartInstance = null;

let currentSelectedLabSamples = [];
let currentSelectedStation = null;

let shown = true;

// prediction of air quality

getDataButton.addEventListener("click", () => {
    getData(addressField.value);
});

addressField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        getData(addressField.value);
    }
});

sidebarHider.addEventListener('click', () => {
    if (shown) {
        leftPane.style.width = "0%";
        leftPane.style.visibility = "hidden";
    } else {
        leftPane.style.visibility = "visible";
        leftPane.style.width = "100%";
    }
    shown = !shown;
});

async function getData(address) {
    data = [];
    labs = {};
    const url = (!address || address === "")
        ? `http://${SERVER_ADDRESS}/data`
        : `http://${address}/data`;
    if (address === "") addressField.value = SERVER_ADDRESS;
    currentServerAddress = addressField.value;

    let response;

    try {
        response = await fetch(url);
        setFeedbacklabel(0);
        if (!response.ok) throw new Error(`Request error: ${response.status}`);
    } catch (err) {
        setFeedbacklabel(1);
        alert("Cannot fetch data from specified server");
        console.warn("Could not fetch from server, fetching local measures.json", err);
        try {
            response = await fetch("./Measures/measures.json");
            if (!response.ok) throw new Error("Could not fetch local file");
        } catch (err) {
            alert("Could not load data from server or local file.");
            setFeedbacklabel(2);
            console.error(err);
            return;
        }
    }

    try {
        let json = await response.json();
        if (json["data"]) {
            json = json["data"];
        }
        //console.log(json);

        if (JSON.stringify(data) === JSON.stringify(json)) {
            console.log("unnecessary reload, same data");
            return;
        }

        dataSection.textContent = '';
        data = json;

        for (const sample of json) {
            parseLabsSamples(sample);
        }

        createLabsSelections();

    } catch (err) {
        alert("Error parsing data.");
        console.error("Error:", err);
    }
}

function setFeedbacklabel(status) {
    if (status === 0) {
        resultLabel.innerHTML = "Connected to server: " + currentServerAddress;
    } else if (status === 1) {
        resultLabel.innerHTML = "Connected to local file";
    } else if (status === 2) {
        resultLabel.innerHTML = "No valid data found";
    } else {
        resultLabel.innerHTML = "Undefined problem";
    }

}

function parseLabsSamples(sample) {
    let lab = sample.position.split("-")[0];
    // setup array for existing workstation
    if (!(lab in labs)) {
        labs[lab] = [];
    }
    labs[lab].push(sample);
}

function createLabsSelections() {
    // empty last lab list
    while (labsSelection.firstChild) {
        labsSelection.removeChild(labsSelection.lastChild);
    }
    const sortedLabs = Object.entries(labs).sort(([a], [b]) =>
        a.localeCompare(b, undefined, { numeric: true }) // sort labs by number and alphabetic order
    );
    // create lab buttons
    for (const [lab, samples] of sortedLabs) {
        let labButton = document.createElement("input");
        labButton.type = "button";
        labButton.value = lab;
        labButton.classList.add("lab-button");
        labButton.addEventListener("click", e => {
            for (let child of labsSelection.children) {
                child.classList.remove("selected");
            }
            e.target.classList.add("selected");
            showLabDetails(samples);
        });
        labsSelection.appendChild(labButton);
    }
}

function showLabDetails(samples) {
    currentSelectedLabSamples = samples;
    currentSelectedStation = null;

    // Extract stations ordered by workstation number
    const stations = [...new Set(samples.map(s => s.position))].sort((a, b) => {
        const numA = parseInt(a.split("-")[1]);
        const numB = parseInt(b.split("-")[1]);
        return numA - numB;
    });

    // Fill workstation menu with data
    workstationsList.innerHTML = '';
    for (const station of stations) {
        let b = document.createElement("button");
        b.classList.add("station-button");
        b.innerText = station;
        b.addEventListener("click", (e) => {
            for (let b of workstationsList.children) {
                b.classList.remove("active-station");
            }
            b.classList.add("active-station");
            showStationDetails(station);
        });
        workstationsList.appendChild(b);
    }

    // update charts to show Lab Means
    updateChartsForLab(samples);
    // update heatmap
    drawLabHeatmap(samples);
}

// getssamples of the selected station and updates every chart
function showStationDetails(stationName) {
    currentSelectedStation = stationName;
    const stationSamples = currentSelectedLabSamples.filter(s => s.position === stationName);
    updateChartsForStation(stationSamples, stationName);
}

function getAggregatedData(samples) {
    const grouped = {};
    for (const s of samples) {
        if (!grouped[s.timestamp]) {
            grouped[s.timestamp] = { tempSum: 0, humSum: 0, lumSum: 0, count: 0 };
        }
        grouped[s.timestamp].tempSum += s.temperature;
        grouped[s.timestamp].humSum += s.humidity;
        grouped[s.timestamp].lumSum += s.luminosity;
        grouped[s.timestamp].count++;
    }

    const timestamps = Object.keys(grouped).sort();
    const temps = [];
    const hums = [];
    const lums = [];

    // get means of measurements
    for (const ts of timestamps) {
        const g = grouped[ts];
        temps.push(g.tempSum / g.count);
        hums.push(g.humSum / g.count);
        lums.push(g.lumSum / g.count);
    }

    return { timestamps, temps, hums, lums };
}

function updateChartsForLab(samples) {
    const { timestamps, temps, hums, lums } = getAggregatedData(samples);
    renderCharts(timestamps, temps, hums, lums, "Lab Mean");
}

function updateChartsForStation(samples, stationName) {
    // Already filtered by station, sort by timestamp
    console.log(stationName);
    console.log(currentSelectedStation);
    samples.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const timestamps = samples.map(s => s.timestamp);
    const temps = samples.map(s => s.temperature);
    const hums = samples.map(s => s.humidity);
    const lums = samples.map(s => s.luminosity);

    renderCharts(timestamps, temps, hums, lums, `Station ${stationName}`);
}

function renderCharts(labels, temps, hums, lums, title) {
    
    const TsLabels = labels.map(l => {
            return l.split(" ")[1] || l;

    });

    updateChart('tempChart', TsLabels, temps, `Temperature (°C) - ${title}`, 'rgb(255, 100,100)');
    updateChart('humChart', TsLabels, hums, `Humidity (%) - ${title}`, 'rgb(50,150,255)');
    updateChart('lumChart', TsLabels, lums, `Luminosity - ${title}`, 'rgb(255, 200,100)');
}

function updateChart(canvasId, labels, data, label, color) {
    let chartInstance;
    if (canvasId === 'tempChart') chartInstance = tempChartInstance;
    if (canvasId === 'humChart') chartInstance = humChartInstance;
    if (canvasId === 'lumChart') chartInstance = lumChartInstance;

    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.data.datasets[0].label = label;
        chartInstance.update();
    } else {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const newInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: color,
                    backgroundColor: "white",
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4, // 0 = straight, >1 = too curved
                    pointRadius: 2,
                    pointHoverRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { maxTicksLimit: 10 }
                    },
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });

        if (canvasId === 'tempChart') tempChartInstance = newInstance;
        if (canvasId === 'humChart') humChartInstance = newInstance;
        if (canvasId === 'lumChart') lumChartInstance = newInstance;
    }
}

function drawLabHeatmap(samples) {
    
    const canvas = document.getElementById('heatmap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Find latest temperature for each station
    const latestTemps = {};
    const latestTimestamps = {};

    for (const s of samples) {
        const parts = s.position.split('-');
        if (parts.length < 2) continue; // wrong format sample
        const id = Number(parts[1]);
        
        // find last temp for every workstation
        if (!latestTimestamps[id] || s.timestamp > latestTimestamps[id]) {
            latestTimestamps[id] = s.timestamp;
            latestTemps[id] = s.temperature;
        }
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Teacher desk (id 0) - or if 0 doesn't exist, we just draw the shape
    drawDesk(ctx, 0, latestTemps[0], canvas.width / 2 - 35, 50);

    // Draw 5x6 grid (30 student 30 workstations max)
    const rows = 5;
    const cols = 6;
    const startX = 70;
    const startY = 120;
    const spacingX = (canvas.width - 200) / (cols - 1);
    const spacingY = (canvas.height - 150) / (rows - 1);

    let currentId = 1;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;
            drawDesk(ctx, currentId, latestTemps[currentId], x, y);
            currentId++;
        }
    }
}

function drawDesk(ctx, id, temp, x, y) {
    let l = id === 0 ? 35 : 30;
    let height = id === 0 ? 25 : 20;
    if (temp !== undefined) {
        // temp to hue: 19 => 120 (green), 30 => 0 (red)
        // color chosen based on color circle 
        let t = (temp - 19) / (30 - 19);
        t = Math.max(0, Math.min(1, t));
        const hue = (1 - t) * 120;

        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
        // Rectangular workstation
        ctx.beginPath();
        ctx.lineTo(x, y, x + l, y);
        ctx.lineTo(x + l, y, x + l, y + height);
        ctx.lineTo(x + l, y + height, x, y + height);
        ctx.lineTo(x, y + height, x, y);
        ctx.fill();
    }

    // Text Label
    ctx.fillStyle = 'gainsboro';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(id === 0 ? "Teacher" : id, x + l * 0.5, y - height);
}


// Initial fetch
addressField.value = SERVER_ADDRESS;
getData(addressField.value);
