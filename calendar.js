function renderCalendar() {
    const docks = { 'Dock 1': [], 'Dock 2': [], 'Dock 3': [], 'Dock 4': [] };
    
    // Add existing routes
    routes.forEach(route => {
        const dock = normalizeDock(route.gate);
        const startTime = new Date(route.plannedArrival).toLocaleTimeString();
        docks[dock].push({ startTime, reference: route.reference });
    });
    
    // Add moved routes
    movedRoutes.forEach(route => {
        const dock = normalizeDock(route.gate);
        const startTime = new Date(route.plannedArrival).toLocaleTimeString();
        docks[dock].push({ startTime, reference: route.reference, isMoved: true });
    });
    
    // Render dock slots
    for (let i = 1; i <= 4; i++) {
        const dockName = `Dock ${i}`;
        const dockElem = document.getElementById(`dock${i}`);
        dockElem.innerHTML = `<strong>${dockName}</strong><br>`;
        docks[dockName].forEach(slot => {
            const timeSlot = document.createElement('span');
            timeSlot.innerHTML = `${slot.startTime} - ${slot.reference}`;
            if (slot.isMoved) {
                timeSlot.innerHTML += ` <button onclick="removeMovedRoute('${slot.reference}')">Remove</button>`;
            }
            dockElem.appendChild(timeSlot);
        });
    }
}

function removeMovedRoute(reference) {
    movedRoutes = movedRoutes.filter(route => route.reference !== reference);
    renderCalendar();  // Re-render without the removed route
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
