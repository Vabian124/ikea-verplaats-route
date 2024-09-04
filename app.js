let routes = [];
let timeMargin = 5; // Default margin

// Event Listeners
document.getElementById('loadButton').addEventListener('click', loadRoutesFromJSON);
document.getElementById('analyzeButton').addEventListener('click', analyzeRoute);
document.getElementById('timeMargin').addEventListener('input', updateMargin);
document.getElementById('closeModal').addEventListener('click', closeModal);

// Close modal on clicking outside or pressing ESC
window.addEventListener('click', (event) => {
    const modal = document.getElementById('routeDetailsModal');
    if (event.target === modal) closeModal();
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
});

function updateMargin() {
    timeMargin = parseInt(document.getElementById('timeMargin').value);
}

function loadRoutesFromJSON() {
    const jsonInput = document.getElementById('jsonInput').value;
    try {
        const parsed = JSON.parse(jsonInput);
        if (!Array.isArray(parsed)) {
            throw new Error("Invalid format: Expected an array of routes.");
        }
        routes = parsed;
        populateRouteSelection();
        renderCalendar();
        displayMessage('Routes loaded successfully.', 'success');
    } catch (e) {
        displayError(`JSON parsing error: ${e.message}`);
    }
}

function displayError(message) {
    const modal = document.getElementById('errorModal');
    document.getElementById('errorMessage').textContent = message;
    modal.style.display = 'flex';
}

function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    modal.style.display = 'none';
}

function displayMessage(message, type = 'info') {
    const messageBox = document.getElementById('possibleTimes');
    messageBox.innerHTML = `<div class="${type}">${message}</div>`;
}

function populateRouteSelection() {
    const select = document.getElementById('routeSelect');
    select.innerHTML = '<option value="">Select a route</option>';
    routes.forEach(route => {
        const startTime = new Date(route.plannedArrival).toLocaleTimeString();
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = `${route.reference} (${startTime}) - Dock: ${route.gate}`;
        select.appendChild(option);
    });
}

function renderCalendar() {
    const docks = { 'Dock 1': [], 'Dock 2': [], 'Dock 3': [], 'Dock 4': [] };
    
    // Collect all dock slots with proper times and margins
    routes.forEach(route => {
        const dock = normalizeDock(route.gate);
        if (!docks[dock]) {
            docks[dock] = [];
        }
        const startTime = new Date(route.plannedArrival);
        const endTime = new Date(route.plannedDeparture); // Using full time from JSON
        docks[dock].push({ startTime, endTime, route });
    });

    for (let i = 1; i <= 4; i++) {
        const dockName = `Dock ${i}`;
        const dockElem = document.getElementById(`dock${i}`);
        dockElem.innerHTML = `<strong>${dockName}</strong><br>`;
        if (docks[dockName]) {
            docks[dockName]
                .sort((a, b) => a.startTime - b.startTime)
                .forEach(slot => {
                    const timeRange = `${slot.startTime.toLocaleTimeString()} - ${slot.endTime.toLocaleTimeString()}`;
                    const timeSlot = document.createElement('div');
                    timeSlot.innerHTML = timeRange;
                    timeSlot.addEventListener('click', () => showRouteDetails(slot.route));
                    dockElem.appendChild(timeSlot);
                });
        } else {
            dockElem.innerHTML += 'No schedules.<br>';
        }
    }
}

function normalizeDock(dockName) {
    if (dockName.startsWith('Dock 1')) return 'Dock 1';
    if (dockName.startsWith('Dock 2')) return 'Dock 2';
    if (dockName.startsWith('Dock 3')) return 'Dock 3';
    if (dockName.startsWith('Dock 4')) return 'Dock 4';
    return dockName;
}

// Analyze if the selected route can be moved earlier, considering time margins
function analyzeRoute() {
    const selectedRouteId = document.getElementById('routeSelect').value;
    const selectedRoute = routes.find(route => route.id === selectedRouteId);

    if (!selectedRoute) {
        displayError('Please select a route.');
        return;
    }

    const originalStartTime = new Date(selectedRoute.plannedArrival);

    const availableSlots = findAvailableSlots(originalStartTime);

    displayAvailableTimes(availableSlots);
}

function findAvailableSlots(originalStartTime) {
    // Get all the time slots for each dock and apply margin logic
    const busySlotsByDock = getBusySlotsByDock();

    const availableSlots = [];
    const interval = 30 * 60000; // 30-minute intervals

    // Check 3 hours before the current route and 3 hours after for available slots
    for (let i = -6; i <= 6; i++) {
        const checkTime = new Date(originalStartTime.getTime() + i * interval);
        const freeDocks = findFreeDocksAtTime(busySlotsByDock, checkTime);
        availableSlots.push({ time: checkTime, freeDocks });
    }

    return availableSlots;
}

function getBusySlotsByDock() {
    const busySlotsByDock = {
        'Dock 1': [],
        'Dock 2': [],
        'Dock 3': [],
        'Dock 4': [],
    };

    routes.forEach(route => {
        const dock = normalizeDock(route.gate);
        const startTime = new Date(route.plannedArrival);
        const endTime = new Date(route.plannedDeparture);
        busySlotsByDock[dock].push({ startTime, endTime });
    });

    return busySlotsByDock;
}

function findFreeDocksAtTime(busySlotsByDock, timeToCheck) {
    const freeDocks = [];

    for (const [dock, busySlots] of Object.entries(busySlotsByDock)) {
        const isDockFree = busySlots.every(slot => {
            const marginAdjustedStart = new Date(slot.startTime.getTime() - timeMargin * 60000);
            const marginAdjustedEnd = new Date(slot.endTime.getTime() + timeMargin * 60000);
            return !(timeToCheck >= marginAdjustedStart && timeToCheck < marginAdjustedEnd);
        });

        if (isDockFree) {
            freeDocks.push(dock);
        }
    }

    return freeDocks;
}

function displayAvailableTimes(availableSlots) {
    let message = '<ul>';
    availableSlots.sort((a, b) => a.time - b.time).forEach(slot => {
        const timeString = slot.time.toLocaleTimeString();
        const freeDocks = slot.freeDocks.length > 0 ? `Free Docks: ${slot.freeDocks.join(', ')}` : 'No Free Docks';
        message += `<li>${timeString} - ${freeDocks}</li>`;
    });
    message += '</ul>';
    displayMessage(message);
}

function showRouteDetails(route) {
    // Ensure no crashes if route.driver is undefined
    const driver = route.driver || { name: { first: 'Unknown', last: '' }, phone: { formatted: 'N/A' } };
    
    const modal = document.getElementById('routeDetailsModal');
    const routeDetails = document.getElementById('routeDetails');
    routeDetails.innerHTML = `
        <strong>Route Reference:</strong> ${route.reference}<br>
        <strong>Dock:</strong> ${route.gate}<br>
        <strong>Arrival Time:</strong> ${new Date(route.plannedArrival).toLocaleTimeString()}<br>
        <strong>Departure Time:</strong> ${new Date(route.plannedDeparture).toLocaleTimeString()}<br>
        <strong>Driver Name:</strong> ${driver.name.first} ${driver.name.last}<br>
        <strong>Driver Phone:</strong> ${driver.phone.formatted}
    `;
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('routeDetailsModal');
    modal.style.display = 'none';
}
