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
