function renderCalendar() {
    const docks = { 'Dock 1': [], 'Dock 2': [], 'Dock 3': [], 'Dock 4': [] };

    [...routes, ...movedRoutes].forEach(route => {
        const dock = normalizeDock(route.gate);
        const startTime = new Date(route.plannedArrival).toLocaleTimeString();
        docks[dock].push({ startTime, reference: route.reference });
    });

    // Ensure dock elements exist before rendering them
    for (let i = 1; i <= 4; i++) {
        const dockName = `Dock ${i}`;
        const dockElem = document.getElementById(`dock${i}`);

        if (!dockElem) {
            console.error(`Error: dockElem for ${dockName} is null`);
            continue;
        }

        dockElem.innerHTML = `<strong>${dockName}</strong><br>`;

        docks[dockName]
            .sort((a, b) => new Date(`1970/01/01 ${a.startTime}`) - new Date(`1970/01/01 ${b.startTime}`))
            .forEach(slot => {
                const timeSlot = document.createElement('span');
                timeSlot.innerHTML = `${slot.startTime} - ${slot.reference}`;
                dockElem.appendChild(timeSlot);
            });
    }
}

function normalizeDock(dockName) {
    if (dockName.startsWith('Dock 1')) return 'Dock 1';
    if (dockName.startsWith('Dock 2')) return 'Dock 2';
    if (dockName.startsWith('Dock 3')) return 'Dock 3';
    if (dockName.startsWith('Dock 4')) return 'Dock 4';
    return dockName;
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
        const adjustedEndTime = new Date(endTime.getTime() - timeMargin * 60000); // Apply the time margin
        busySlotsByDock[dock].push({ startTime, endTime: adjustedEndTime });
    });

    return busySlotsByDock;
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

function renderCalendar() {
    const docks = { 'Dock 1': [], 'Dock 2': [], 'Dock 3': [], 'Dock 4': [] };

    // Merge routes and moved routes
    [...routes, ...movedRoutes].forEach(route => {
        const dock = normalizeDock(route.gate);
        const startTime = new Date(route.plannedArrival).toLocaleTimeString();
        docks[dock].push({ startTime, reference: route.reference });
    });

    // Render each dock
    for (let i = 1; i <= 4; i++) {
        const dockName = `Dock ${i}`;
        const dockElem = document.getElementById(`dock${i}`);

        if (!dockElem) {
            console.error(`Error: dockElem for ${dockName} is null`);
            continue;
        }

        dockElem.innerHTML = `<strong>${dockName}</strong><br>`;

        // Sort by time
        docks[dockName].sort((a, b) => new Date(`1970/01/01 ${a.startTime}`) - new Date(`1970/01/01 ${b.startTime}`))
            .forEach(slot => {
                const timeSlot = document.createElement('span');
                timeSlot.classList.add('dock-slot');
                timeSlot.innerHTML = `${slot.startTime} - ${slot.reference}`;
                timeSlot.onclick = () => displayRouteInfo(slot.reference); // Add click handler
                dockElem.appendChild(timeSlot);
            });
    }
}

// Function to display route info when a dock time is clicked
function displayRouteInfo(reference) {
    const route = routes.find(r => r.reference === reference) || movedRoutes.find(r => r.reference === reference);
    if (route) {
        alert(`Route Info:\nReference: ${route.reference}\nPlanned Arrival: ${route.plannedArrival}\nDock: ${route.gate}`);
    } else {
        alert('Route not found');
    }
}
