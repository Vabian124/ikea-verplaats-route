$(document).ready(function () {
    let routes = [];
    let movedRoutes = [];
    let timeMargin = 5; // Default margin in minutes

    // Load routes automatically when page loads or JSON is edited
    $(window).on('load', loadRoutesFromJSON);
    $("#jsonInput").on('input', loadRoutesFromJSON);

    $("#loadButton").click(function () {
        loadRoutesFromJSON();
    });

    $("#analyzeButton").click(function () {
        analyzeRoute();
    });

    $("#dockMargin").change(function () {
        timeMargin = parseInt($("#dockMargin").val());
    });

    function loadRoutesFromJSON() {
        const jsonInput = $("#jsonInput").val();
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
        const select = $("#routeSelect");
        select.empty().append('<option value="">Select a route</option>');
        routes.forEach(route => {
            const option = $('<option>').val(route.id).text(`${route.reference} (${new Date(route.plannedArrival).toLocaleTimeString()}) - Dock: ${route.gate}`);
            select.append(option);
        });
    }

    function analyzeRoute() {
        const selectedRouteId = $("#routeSelect").val();
        if (!selectedRouteId) return displayMessage('Please select a route.', 'error');

        const selectedRoute = routes.find(route => route.id === selectedRouteId);
        const originalStartTime = new Date(selectedRoute.plannedArrival);

        const availableSlots = findAvailableSlots(originalStartTime);
        displayAvailableDocks(selectedRoute, availableSlots);
    }

    function displayAvailableDocks(route, availableSlots) {
        const container = $("#possibleTimes");
        container.empty();

        availableSlots.forEach(slot => {
            const timeString = slot.time.toLocaleTimeString();
            const freeDocks = slot.freeDocks;
            if (freeDocks.length > 0) {
                freeDocks.forEach(dock => {
                    const dockClass = getDockClass(dock); // Get color class for each dock
                    const dockButton = $('<button>').addClass(`dock-button ${dockClass}`).text(`${dock} at ${timeString}`);
                    dockButton.click(() => moveRoute(route, slot.time, dock));
                    container.append(dockButton);
                });
            }
        });
    }

    function moveRoute(route, newTime, dock) {
        const newRoute = { ...route, plannedArrival: newTime, gate: dock };
        movedRoutes.push(newRoute);
        renderCalendar();
    }

    function renderCalendar() {
        const docks = { 'Dock 1': [], 'Dock 2': [], 'Dock 3': [], 'Dock 4': [] };

        [...routes, ...movedRoutes].forEach(route => {
            const dock = normalizeDock(route.gate);  // Normalize dock names
            const startTime = new Date(route.plannedArrival).toLocaleTimeString();

            if (!docks[dock]) {
                docks[dock] = [];  // Initialize dock if it doesn't exist
            }

            docks[dock].push({ startTime, reference: route.reference, routeId: route.id, moved: movedRoutes.includes(route) });
        });

        $("#calendar").empty();
        for (let i = 1; i <= 4; i++) {
            const dockName = `Dock ${i}`;
            const dockElem = $('<div>').addClass('dock').html(`<strong>${dockName}</strong><br>`);

            docks[dockName]
                .sort((a, b) => new Date(`1970/01/01 ${a.startTime}`) - new Date(`1970/01/01 ${b.startTime}`))
                .forEach(slot => {
                    const timeSlot = $('<span>').html(`${slot.startTime} - ${slot.reference}`);
                    if (slot.moved) {
                        timeSlot.addClass('moved-route'); // Add orange outline if route was moved
                    }
                    const removeButton = $('<button>').addClass('remove-btn').text('Remove').click(() => removeRoute(slot.routeId));
                    timeSlot.append(removeButton);
                    dockElem.append(timeSlot);
                });

            $("#calendar").append(dockElem);
        }
    }

    function removeRoute(routeId) {
        movedRoutes = movedRoutes.filter(route => route.id !== routeId);
        renderCalendar();
    }

    function getBusySlotsByDock() {
        const busySlotsByDock = { 'Dock 1': [], 'Dock 2': [], 'Dock 3': [], 'Dock 4': [] };

        routes.forEach(route => {
            const dock = normalizeDock(route.gate);
            const startTime = new Date(route.plannedArrival);
            const endTime = new Date(route.plannedDeparture);
            const adjustedEndTime = new Date(endTime.getTime() - timeMargin * 60000); // Apply the time margin

            if (!busySlotsByDock[dock]) {
                busySlotsByDock[dock] = [];
            }

            busySlotsByDock[dock].push({ startTime, endTime: adjustedEndTime });
        });

        return busySlotsByDock;
    }

    function findAvailableSlots(originalStartTime) {
        const busySlotsByDock = getBusySlotsByDock();

        const availableSlots = [];
        const interval = 30 * 60000;

        for (let i = -6; i <= 6; i++) {
            const checkTime = new Date(originalStartTime.getTime() + i * interval);
            const freeDocks = findFreeDocksAtTime(busySlotsByDock, checkTime);
            availableSlots.push({ time: checkTime, freeDocks });
        }

        return availableSlots;
    }

    function findFreeDocksAtTime(busySlotsByDock, timeToCheck) {
        const freeDocks = [];

        for (const [dock, busySlots] of Object.entries(busySlotsByDock)) {
            const isDockFree = busySlots.every(slot => {
                const marginAdjustedStart = new Date(slot.startTime.getTime() - timeMargin * 60000);
                const marginAdjustedEnd = slot.endTime;
                return !(timeToCheck >= marginAdjustedStart && timeToCheck < marginAdjustedEnd);
            });

            if (isDockFree) {
                freeDocks.push(dock);
            }
        }

        return freeDocks;
    }

    // Normalize dock names, strip out any suffix after "Dock X"
    function normalizeDock(dockName) {
        const match = dockName.match(/(Dock \d+)/);  // Match "Dock X" part only
        return match ? match[1] : dockName;  // Return normalized dock name or fallback
    }

    // Get the dock class to assign the right color for each button
    function getDockClass(dock) {
        const dockNumber = dock.match(/\d+/)[0];  // Extract the dock number
        return `dock-${dockNumber}`;  // Return the appropriate class (dock-1, dock-2, etc.)
    }

    function displayMessage(message, type) {
        const container = $("#possibleTimes");
        const messageClass = type === 'success' ? 'success' : 'error';
        container.html(`<div class="${messageClass}">${message}</div>`);
    }

    // Modal Handling
    $(".close").click(function () {
        $("#routeDetailsModal").hide();
    });

    $(window).click(function (event) {
        if (event.target == document.getElementById("routeDetailsModal")) {
            $("#routeDetailsModal").hide();
        }
    });
});
