let routes = [];

// Event Listeners
document.getElementById('loadButton').addEventListener('click', loadRoutesFromJSON);
document.getElementById('analyzeButton').addEventListener('click', analyzeRoute);
window.onclick = function(event) {
    const modal = document.getElementById('errorModal');
    if (event.target === modal) {
        closeErrorModal();
    }
};

// Load Routes from JSON
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

// Display Error Modal
function displayError(message) {
    const modal = document.getElementById('errorModal');
    document.getElementById('errorMessage').textContent = message;
    modal.style.display = 'flex';
}

// Close Error Modal
function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    modal.style.display = 'none';
}

// Display Messages
function displayMessage(message, type = 'info') {
    const messageBox = document.getElementById('possibleTimes');
    messageBox.innerHTML = `<div class="${type}">${message}</div>`;
}

// Populate Route Selection Dropdown
function populateRouteSelection() {
    const select = document.getElementById('routeSelect');
    select.innerHTML = '<option value="">Select a route</option>';
    routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = `${route.reference} (Dock: ${route.gate})`;
        select.appendChild(option);
    });
}

// Render Dock Calendar
function renderCalendar() {
    const docks = { 'Dock 1': [], 'Dock 2': [], 'Dock 3': [], 'Dock 4': [] };
    routes.forEach(route => {
        const dock = normalizeDock(route.gate);
        if (!docks[dock]) {
            docks[dock] = [];
        }
        const startTime = new Date(route.plannedArrival);
        const endTime = new Date(startTime.getTime() + 30 * 60000); // Half-hour interval
        docks[dock].push({ startTime, endTime });
    });

    for (let i = 1; i <= 4; i++) {
        const dockName = `Dock ${i}`;
        const dockElem = document.getElementById(`dock${i}`);
        dockElem.innerHTML = `<strong>${dockName}</strong><br>`;
        if (docks[dockName]) {
            docks[dockName]
                .sort((a, b) => a.startTime - b.startTime)
                .forEach(slot => {
                    dockElem.innerHTML += `${slot.startTime.toLocaleTimeString()} - ${slot.endTime.toLocaleTimeString()}<br>`;
                });
        } else {
            dockElem.innerHTML += 'No schedules.<br>';
        }
    }
}

// Normalize Dock Names
function normalizeDock(dockName) {
    if (dockName.startsWith('Dock 1')) return 'Dock 1';
    if (dockName.startsWith('Dock 2')) return 'Dock 2';
    if (dockName.startsWith('Dock 3')) return 'Dock 3';
    if (dockName.startsWith('Dock 4')) return 'Dock 4';
    return dockName;
}

// Analyze Route for Possible Times
function analyzeRoute() {
    const selectedRouteId = document.getElementById('routeSelect').value;
    const selectedRoute = routes.find(route => route.id === selectedRouteId);

    if (!selectedRoute) {
        displayError('Please select a route.');
        return;
    }

    const dock = normalizeDock(selectedRoute.gate);
    const originalStartTime = new Date(selectedRoute.plannedArrival);

    // Define the time range to check (e.g., 3 hours before the original time)
    const timeSlots = [];
    const timeInterval = 25 * 60000; // 30 minutes
    const numberOfSlots = 6; // Number of slots to check before the original time

    // Include the original scheduled time
    timeSlots.push({ time: originalStartTime, available: true });

    for (let i = 1; i <= numberOfSlots; i++) {
        const newTime = new Date(originalStartTime.getTime() - i * timeInterval);
        if (newTime < new Date()) {
            continue; // Skip times in the past
        }
        const isAvailable = dockAvailabilityCheck(dock, newTime);
        timeSlots.push({ time: newTime, available: isAvailable });
    }

    // Display Possible Times
    let message = '<ul>';
    timeSlots.sort((a, b) => a.time - b.time).forEach(slot => {
        const timeString = slot.time.toLocaleTimeString();
        const status = slot.available ? 'Available' : 'Occupied';
        const statusClass = slot.available ? 'success' : 'error';
        message += `<li class="${statusClass}">${timeString} - ${status}</li>`;
    });
    message += '</ul>';
    displayMessage(message);
}

// Check Dock Availability at a Given Time
function dockAvailabilityCheck(dock, timeToCheck) {
    const busySlots = routes
        .filter(route => normalizeDock(route.gate) === dock)
        .map(route => ({
            startTime: new Date(route.plannedArrival),
            endTime: new Date(new Date(route.plannedArrival).getTime() + 30 * 60000)
        }));

    return !busySlots.some(slot => 
        (timeToCheck >= slot.startTime && timeToCheck < slot.endTime) ||
        (new Date(timeToCheck.getTime() + 30 * 60000) > slot.startTime && new Date(timeToCheck.getTime() + 30 * 60000) <= slot.endTime)
    );
}
