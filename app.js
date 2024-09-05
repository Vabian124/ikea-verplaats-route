let routes = [];
let movedRoutes = [];

document.getElementById('loadButton').addEventListener('click', loadRoutesFromJSON);
document.getElementById('analyzeButton').addEventListener('click', analyzeRoute);

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

function displayAvailableTimes(availableSlots) {
    let message = '<ul>';
    availableSlots.forEach(slot => {
        const timeString = slot.time.toLocaleTimeString();
        const freeDocks = slot.freeDocks.length > 0 ? `Free Docks: ${slot.freeDocks.join(', ')}` : 'No Free Docks';
        message += `
            <div class="dock-time">
                ${timeString} - ${freeDocks}
                <button class="move-button" onclick="moveRoute('${slot.time}', '${slot.freeDocks[0]}')">Move</button>
            </div>`;
    });
    message += '</ul>';
    document.getElementById('possibleTimes').innerHTML = message;
}

function moveRoute(newTime, dock) {
    const selectedRouteId = document.getElementById('routeSelect').value;
    const selectedRoute = routes.find(route => route.id === selectedRouteId);
    
    if (!selectedRoute || !dock) return;
    
    const newRoute = { ...selectedRoute, plannedArrival: newTime, gate: dock };
    movedRoutes.push(newRoute);
    
    renderCalendar();  // Re-render with updated moved routes
}

function displayError(message) {
    const messageBox = document.getElementById('possibleTimes');
    messageBox.innerHTML = `<div class="error">${message}</div>`;
}
