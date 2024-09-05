$(document).ready(function () {
    let routes = [];
    let movedRoutes = [];
    let timeMargin = 5; // Default margin in minutes

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
            const option = $('<option>').val(route.id).text(`${route.reference} - Dock: ${route.gate}`);
            select.append(option);
        });
    }

    function analyzeRoute() {
        const selectedRouteId = $("#routeSelect").val();
        if (!selectedRouteId) return displayMessage('Please select a route.', 'error');

        const selectedRoute = routes.find(route => route.id === selectedRouteId);
        const originalStartTime = new Date(selectedRoute.plannedArrival);

        const availableSlots = findAvailableSlots(originalStartTime);
        displayAvailableTimes(availableSlots);
    }

    function displayAvailableTimes(availableSlots) {
        const container = $("#possibleTimes");
        container.empty();

        availableSlots.forEach(slot => {
            const timeString = slot.time.toLocaleTimeString();
            const freeDocks = slot.freeDocks.length > 0 ? `Free Docks: ${slot.freeDocks.join(', ')}` : 'No Free Docks';
            const slotDiv = $('<div>').addClass('dock-time').html(`${timeString} - ${freeDocks}`);
            if (slot.freeDocks.length > 0) {
                const moveButton = $('<button>').text('Move').addClass('move-button');
                moveButton.click(() => moveRoute(slot.time, slot.freeDocks[0]));
                slotDiv.append(moveButton);
            }
            container.append(slotDiv);
        });
    }

    function moveRoute(newTime, dock) {
        const selectedRouteId = $("#routeSelect").val();
        const selectedRoute = routes.find(route => route.id === selectedRouteId);
        if (!selectedRoute || !dock) return;

        const newRoute = { ...selectedRoute, plannedArrival: newTime, gate: dock };
        movedRoutes.push(newRoute);
        renderCalendar();
    }

    function renderCalendar() {
        const docks = {};

        // Dynamically create docks based on the routes
        [...routes, ...movedRoutes].forEach(route => {
            const dock = normalizeDock(route.gate);
            if (!docks[dock]) {
                docks[dock] = [];  // Initialize if the dock doesn't exist
            }
            const startTime = new Date(route.plannedArrival).toLocaleTimeString();
            docks[dock].push({ startTime, reference: route.reference });
        });

        // Render docks
        $("#calendar").empty(); // Clear calendar before rendering
        Object.keys(docks).forEach(dock => {
            const dockElem = $('<div>').addClass('dock').html(`<strong>${dock}</strong><br>`);
            docks[dock]
                .sort((a, b) => new Date(`1970/01/01 ${a.startTime}`) - new Date(`1970/01/01 ${b.startTime}`))
                .forEach(slot => {
                    const timeSlot = $('<span>').html(`${slot.startTime} - ${slot.reference}`);
                    timeSlot.click(() => showRouteDetails(slot.reference));
                    dockElem.append(timeSlot);
                });
            $("#calendar").append(dockElem);
        });
    }

    function showRouteDetails(reference) {
        const route = routes.find(r => r.reference === reference) || movedRoutes.find(r => r.reference === reference);
        if (route) {
            const modal = $("#routeDetailsModal");
            $("#routeInfo").html(`<h2>Route Info</h2><p><strong>Reference:</strong> ${route.reference}</p><p><strong>Planned Arrival:</strong> ${route.plannedArrival}</p><p><strong>Driver:</strong> ${route.driver.name.first} ${route.driver.name.last}</p>`);
            modal.show();
        }
    }

    function getBusySlotsByDock() {
        const busySlotsByDock = {};

        routes.forEach(route => {
            const dock = normalizeDock(route.gate);
            if (!busySlotsByDock[dock]) {
                busySlotsByDock[dock] = [];
            }
            const startTime = new Date(route.plannedArrival);
            const endTime = new Date(route.plannedDeparture);
            const adjustedEndTime = new Date(endTime.getTime() - timeMargin * 60000); // Apply the time margin
            busySlotsByDock[dock].push({ startTime, endTime: adjustedEndTime });
        });

        return busySlotsByDock;
    }

    function findAvailableSlots(originalStartTime) {
        const busySlotsByDock = getBusySlotsByDock();

        const availableSlots = [];
        const interval = 30 * 60000; // 30-minute intervals

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

    function normalizeDock(dockName) {
        return dockName.trim();  // Normalize dock names (trim spaces)
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
