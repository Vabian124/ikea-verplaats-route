let routes = [];
let movedRoutes = [];
let timeMargin = 5;  // Default margin in minutes

document.getElementById('loadButton').addEventListener('click', loadRoutesFromJSON);
document.getElementById('analyzeButton').addEventListener('click', analyzeRoute);

function loadRoutesFromJSON() {
    const jsonInput = document.getElementById('jsonInput').value;
    try {
        routes = JSON.parse(jsonInput);
        if (!Array.isArray(routes)) throw new Error("Invalid JSON format.");
        populateRouteSelection();
        renderCalendar();
        displayMessage('Routes loaded successfully.', 'success');
    } catch (e) {
        displayMessage(`Error: ${e.message}`, 'error');
    }
}

function populateRouteSelection() {
    const select = document.getElementById('routeSelect');
    select.innerHTML = '<option value="">Select a route</option>';
    routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = `${route.reference} (${new Date(route.plannedArrival).toLocaleTimeString()}) - Dock: ${route.gate}`;
        select.appendChild(option);
    });
}

function analyzeRoute() {
    const selectedRouteId = document.getElementById('routeSelect').value;
    if (!selectedRouteId) return displayMessage('Please select a route.', 'error');

    const selectedRoute = routes.find(route => route.id === selectedRouteId);
    const originalStartTime = new Date(selectedRoute.plannedArrival);

    const availableSlots = findAvailableSlots(originalStartTime);
    displayAvailableTimes(availableSlots);
}

function displayAvailableTimes(availableSlots) {
    const container = document.getElementById('possibleTimes');
    container.innerHTML = '';

    availableSlots.forEach(slot => {
        const timeString = slot.time.toLocaleTimeString();
        const freeDocks = slot.freeDocks.length > 0 ? `Free Docks: ${slot.freeDocks.join(', ')}` : 'No Free Docks';
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('dock-time');
        slotDiv.innerHTML = `${timeString} - ${freeDocks}`;
        if (slot.freeDocks.length > 0) {
            const moveButton = document.createElement('button');
            moveButton.textContent = 'Move';
            moveButton.classList.add('move-button');
            moveButton.onclick = () => moveRoute(slot.time, slot.freeDocks[0]);
            slotDiv.appendChild(moveButton);
        }
        container.appendChild(slotDiv);
    });
}

function moveRoute(newTime, dock) {
    const selectedRouteId = document.getElementById('routeSelect').value;
    const selectedRoute = routes.find(route => route.id === selectedRouteId);
    if (!selectedRoute || !dock) return;

    const newRoute = { ...selectedRoute, plannedArrival: newTime, gate: dock };
    movedRoutes.push(newRoute);
    renderCalendar();
}

function displayMessage(message, type) {
    const messageBox = document.getElementById('possibleTimes');
    const messageTypeClass = type === 'success' ? 'success' : 'error';
    messageBox.innerHTML = `<div class="${messageTypeClass}">${message}</div>`;
}
