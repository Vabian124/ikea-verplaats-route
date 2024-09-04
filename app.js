let routes = [];
let timeMargin = 5; // Default margin

// Event Listeners
document.getElementById('loadButton').addEventListener('click', loadRoutesFromJSON);
document.getElementById('analyzeButton').addEventListener('click', analyzeRoute);
document.getElementById('timeMargin').addEventListener('input', updateMargin);
document.getElementById('closeModal').addEventListener('click', closeModal);

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
    routes.forEach(route => {
        const dock = normalizeDock(route.gate);
        if (!docks[dock]) {
            docks[dock] = [];
        }
        const startTime = new Date(route.plannedArrival);
        const endTime = new Date(startTime.getTime() + 30 * 60000); // Half-hour interval
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
    const timeInterval = 30 * 60000; // 30 minutes
    const numberOfSlots = 6; // Number of slots to check before the original time

    timeSlots.push({ time: originalStartTime, available: true });

    for (let i = 1; i <= numberOfSlots; i++) {
        const newTime = new Date(originalStartTime.getTime() - i * timeInterval);
        if (newTime < new Date()) continue; // Skip times in the past
        const isAvailable = dockAvailabilityCheck(dock, newTime);
        timeSlots.push({ time: newTime, available: isAvailable });
    }

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

function dockAvailabilityCheck(dock, timeToCheck) {
    const busySlots = routes
        .filter(route => normalizeDock(route.gate) === dock)
        .map(route => ({
            startTime: new Date(route.plannedArrival),
            endTime: new Date(new Date(route.plannedArrival).getTime() + 30 * 60000)
        }));

    // 5-minute margin handling
    const marginTime = new Date(timeToCheck.getTime() - timeMargin * 60000);

    return !busySlots.some(slot =>
        (timeToCheck >= slot.startTime && timeToCheck < slot.endTime) ||
        (new Date(timeToCheck.getTime() + 30 * 60000) > slot.startTime && new Date(timeToCheck.getTime() + 30 * 60000) <= slot.endTime) ||
        (marginTime >= slot.startTime && marginTime < slot.endTime)
    );
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
