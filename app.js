$(document).ready(function () {
    let routes = [];
    let movedRoutes = [];
    let selectedRoute = null;
    let timeMargin = 5; // Default margin in minutes

    // Auto-load routes when page loads or JSON is edited
    $(window).on('load', loadRoutesFromJSON);
    $("#jsonInput").on('input', loadRoutesFromJSON);

    $("#loadButton").click(loadRoutesFromJSON);
    $("#analyzeButton").click(analyzeRoute);

    $("#dockMargin").change(function () {
        timeMargin = parseInt($("#dockMargin").val());
    });

    // Load routes from JSON and populate calendar
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

    // Populate dropdown with routes
    function populateRouteSelection() {
        const select = $("#routeSelect").empty().append('<option value="">Select a route</option>');
        routes.forEach(route => {
            const option = $('<option>').val(route.id).text(`${route.reference} (${new Date(route.plannedArrival).toLocaleTimeString()}) - Dock: ${route.gate}`);
            select.append(option);
        });
    }

    // Analyze selected route and display available docks
    function analyzeRoute() {
        const selectedRouteId = $("#routeSelect").val();
        if (!selectedRouteId) return displayMessage('Please select a route.', 'error');
        selectedRoute = routes.find(route => route.id === selectedRouteId);
        const originalStartTime = new Date(selectedRoute.plannedArrival);
        const availableSlots = findAvailableSlots(originalStartTime);
        displayAvailableDocks(availableSlots);
        highlightRouteInCalendar(selectedRouteId, 'selected-route'); // Highlight selected route
    }

    // Display available docks as grouped clickable buttons
    function displayAvailableDocks(availableSlots) {
        const container = $("#possibleTimes").empty();
        const groupedByDock = {};

        availableSlots.forEach(slot => {
            const timeString = slot.time.toLocaleTimeString();
            slot.freeDocks.forEach(dock => {
                if (!groupedByDock[dock]) groupedByDock[dock] = [];
                groupedByDock[dock].push(timeString);
            });
        });

        // Create button groups for each dock
        Object.keys(groupedByDock).forEach(dock => {
            const dockClass = getDockClass(dock);
            const dockLabel = $('<div>').addClass('dock-label').text(`${dock}:`);
            const dockTimes = $('<div>').addClass('dock-times');

            groupedByDock[dock].forEach(time => {
                const dockButton = $('<button>')
                    .addClass(`dock-button ${dockClass}`)
                    .text(time)
                    .click(() => moveRoute(time, dock)); // Assign new time and dock on click
                dockTimes.append(dockButton).append(' | '); // Add a separator
            });

            container.append(dockLabel);
            container.append(dockTimes);
        });
    }

    // Move selected route to a new time and dock
    function moveRoute(newTime, dock) {
        const newRoute = { ...selectedRoute, plannedArrival: newTime, gate: dock };
        movedRoutes.push(newRoute);
        renderCalendar(); // Re-render calendar with updated routes
    }

    // Render calendar with dock schedules, applying outlines for moved/selected routes
    function renderCalendar() {
        const docks = { 'Dock 1': [], 'Dock 2': [], 'Dock 3': [], 'Dock 4': [] };

        [...routes, ...movedRoutes].forEach(route => {
            const dock = normalizeDock(route.gate);
            const startTime = new Date(route.plannedArrival).toLocaleTimeString();
            if (!docks[dock]) docks[dock] = [];
            docks[dock].push({ startTime, reference: route.reference, routeId: route.id, moved: movedRoutes.includes(route) });
        });

        $("#calendar").empty();
        for (let i = 1; i <= 4; i++) {
            const dockName = `Dock ${i}`;
            const dockElem = $('<div>').addClass('dock').html(`<strong>${dockName}</strong><br>`);

            docks[dockName].sort((a, b) => new Date(`1970/01/01 ${a.startTime}`) - new Date(`1970/01/01 ${b.startTime}`)).forEach(slot => {
                const timeSlot = $('<span>').html(`${slot.startTime} - ${slot.reference}`);
                if (slot.routeId === selectedRoute?.id) timeSlot.addClass('selected-route');
                if (slot.moved) timeSlot.addClass('moved-route');
                const removeButton = $('<button>').addClass('remove-btn').text('Remove').click(() => removeRoute(slot.routeId));
                timeSlot.append(removeButton);
                dockElem.append(timeSlot);
            });

            $("#calendar").append(dockElem);
        }
    }

    // Highlight selected route in the calendar
    function highlightRouteInCalendar(routeId, className) {
        $(".dock span").removeClass(className); // Remove previous highlights
        $(`.dock span:contains(${routeId})`).addClass(className); // Highlight selected route
    }

    // Remove a route and update calendar
    function removeRoute(routeId) {
        movedRoutes = movedRoutes.filter(route => route.id !== routeId);
        if (selectedRoute?.id === routeId) selectedRoute = null; // Clear selection if route is removed
        renderCalendar(); // Re-render calendar
    }

    // Find available slots considering buffer times
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

    // Check if docks are free at a given time
    function findFreeDocksAtTime(busySlotsByDock, timeToCheck) {
        const freeDocks = [];

        Object.entries(busySlotsByDock).forEach(([dock, busySlots]) => {
            const isFree = busySlots.every(slot => {
                const marginAdjustedStart = new Date(slot.startTime.getTime() - timeMargin * 60000);
                return !(timeToCheck >= marginAdjustedStart && timeToCheck < slot.endTime);
            });
            if (isFree) freeDocks.push(dock);
        });

        return freeDocks;
    }

    // Get busy slots for each dock
    function getBusySlotsByDock() {
        const busySlotsByDock = { 'Dock 1': [], 'Dock 2': [], 'Dock 3': [], 'Dock 4': [] };

        routes.forEach(route => {
            const dock = normalizeDock(route.gate);
            const startTime = new Date(route.plannedArrival);
            const endTime = new Date(route.plannedDeparture);
            const adjustedEndTime = new Date(endTime.getTime() - timeMargin * 60000);
            busySlotsByDock[dock].push({ startTime, endTime: adjustedEndTime });
        });

        return busySlotsByDock;
    }

    // Normalize dock names
    function normalizeDock(dockName) {
        return dockName.match(/(Dock \d+)/)?.[1] || dockName;
    }

    // Get dock class for color-coding
    function getDockClass(dock) {
        return `dock-${dock.match(/\d+/)[0]}`;
    }

    // Display messages for success/errors
    function displayMessage(message, type) {
        const messageClass = type === 'success' ? 'success' : 'error';
        $("#possibleTimes").html(`<div class="${messageClass}">${message}</div>`);
    }
});
