// ==UserScript==
// @name         IKEA Route Status Checker
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Check and display status of IKEA route stops with advanced features
// @match        https://services.ikea.nl/routes/timelines*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        DEFAULT_MIN_TIME: 130,
        CHECK_INTERVAL: 2500,
        MAX_RETRIES: 10
    };

    let routes = [];
    let currentHighlights = [];
    let latestApiData = null;
    let isFirstApiRequest = true;

    function createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'route-checker-sidebar';
        sidebar.style.cssText = `
            position: fixed;
            top: 0;
            right: -300px;
            width: 300px;
            height: 100%;
            background-color: white;
            border-left: 1px solid #ccc;
            transition: right 0.3s;
            z-index: 10000;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
        `;

        const resizer = document.createElement('div');
        resizer.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 5px;
            cursor: ew-resize;
        `;
        sidebar.appendChild(resizer);

        const toggleButton = document.createElement('button');
        toggleButton.textContent = '☰';
        toggleButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 10001;
            font-size: 24px;
            background: none;
            border: none;
            cursor: pointer;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex-grow: 1;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Route Checker';
        content.appendChild(title);

        const updateDataButton = document.createElement('button');
        updateDataButton.textContent = 'Update Data';
        updateDataButton.style.display = 'none';
        updateDataButton.addEventListener('click', () => {
            if (latestApiData) {
                routes = latestApiData.routes;
                showView('status');
                updateDataButton.style.display = 'none';
            }
        });
        content.appendChild(updateDataButton);

        const nav = document.createElement('nav');
        nav.innerHTML = `
            <ul style="list-style-type: none; padding: 0;">
                <li><a href="#" data-view="status">Status Table</a></li>
                <li><a href="#" data-view="time-check">Time Check</a></li>
                <li><a href="#" data-view="settings">Settings</a></li>
            </ul>
        `;
        content.appendChild(nav);

        const viewContainer = document.createElement('div');
        viewContainer.id = 'view-container';
        content.appendChild(viewContainer);

        sidebar.appendChild(content);
        document.body.appendChild(sidebar);
        document.body.appendChild(toggleButton);

        toggleButton.addEventListener('click', () => {
            sidebar.style.right = sidebar.style.right === '0px' ? '-300px' : '0px';
        });

        nav.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                showView(e.target.dataset.view);
            }
        });

        let isResizing = false;
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', () => {
                isResizing = false;
                document.removeEventListener('mousemove', handleMouseMove);
            });
        });

        function handleMouseMove(e) {
            if (isResizing) {
                const newWidth = window.innerWidth - e.clientX;
                sidebar.style.width = `${newWidth}px`;
            }
        }

        return { sidebar, updateDataButton };
    }

    function showView(viewName) {
        const container = document.getElementById('view-container');
        container.innerHTML = '';

        switch (viewName) {
            case 'status':
                container.appendChild(createStatusTable());
                break;
            case 'time-check':
                container.appendChild(createTimeCheckTool());
                break;
            case 'settings':
                container.appendChild(createSettingsView());
                break;
        }
    }

    function createStatusTable() {
        const tableContainer = document.createElement('div');
        tableContainer.style.overflowX = 'auto';

        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Filter routes...';
        filterInput.style.width = '100%';
        filterInput.style.marginBottom = '10px';
        tableContainer.appendChild(filterInput);

        const showIncompleteToggle = document.createElement('label');
        showIncompleteToggle.innerHTML = '<input type="checkbox"> Show incomplete only';
        showIncompleteToggle.style.marginBottom = '10px';
        showIncompleteToggle.style.display = 'block';
        tableContainer.appendChild(showIncompleteToggle);

        const table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';

        const headerRow = table.insertRow();
        ['Route', 'Stop', 'Status', 'Failed'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            th.style.border = '1px solid black';
            th.style.padding = '8px';
            th.style.backgroundColor = '#f2f2f2';
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => sortTable(table, th.cellIndex));
            headerRow.appendChild(th);
        });

        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        tableContainer.appendChild(table);

        const removeHighlightButton = document.createElement('button');
        removeHighlightButton.textContent = 'Remove Highlights';
        removeHighlightButton.style.marginTop = '10px';
        removeHighlightButton.addEventListener('click', removeHighlights);
        tableContainer.appendChild(removeHighlightButton);

        filterInput.addEventListener('input', () => updateTable(tbody, filterInput.value, showIncompleteToggle.querySelector('input').checked));
        showIncompleteToggle.querySelector('input').addEventListener('change', () => updateTable(tbody, filterInput.value, showIncompleteToggle.querySelector('input').checked));
        updateTable(tbody, '', false);

        return tableContainer;
    }

    function updateTable(tbody, filter, showIncompleteOnly) {
        tbody.innerHTML = '';
        routes.forEach((route, routeIndex) => {
            route.stops.forEach((stop, index) => {
                if ((!showIncompleteOnly || stop.status !== 'Completed') &&
                    (route.slug.toLowerCase().includes(filter.toLowerCase()) ||
                     `Stop ${index + 1}`.toLowerCase().includes(filter.toLowerCase()) ||
                     stop.status.toLowerCase().includes(filter.toLowerCase()) ||
                     (stop.status !== 'Completed').toString().toLowerCase().includes(filter.toLowerCase()))) {
                    const row = tbody.insertRow();
                    [route.slug, `Stop ${index + 1}`, stop.status, stop.status !== 'Completed'].forEach((text, cellIndex) => {
                        const cell = row.insertCell();
                        if (cellIndex === 1) {
                            const link = document.createElement('a');
                            link.href = `https://services.ikea.nl/routes/details/${route.slug}`;
                            link.textContent = text.toString();
                            link.target = '_blank';
                            cell.appendChild(link);
                        } else {
                            cell.textContent = text.toString();
                        }
                        cell.style.border = '1px solid black';
                        cell.style.padding = '8px';
                        cell.style.userSelect = 'text';

                        // Alternating colors for routes and stops
                        const routeColor = routeIndex % 2 === 0 ? ['#e6f2ff', '#b3d9ff'] : ['#e6ffe6', '#b3ffb3'];
                        cell.style.backgroundColor = index % 2 === 0 ? routeColor[0] : routeColor[1];

                        if (cellIndex === 3) {
                            cell.style.backgroundColor = text ? '#ffcccb' : '#90EE90';
                        }
                        if (cellIndex === 0) {
                            cell.style.cursor = 'pointer';
                            cell.addEventListener('click', () => highlightSlug(route.slug));
                        }
                    });
                }
            });
        });
    }

    function sortTable(table, columnIndex) {
        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.rows);
        const direction = table.dataset.sortDirection === 'asc' ? -1 : 1;

        rows.sort((a, b) => {
            let aValue = a.cells[columnIndex].textContent;
            let bValue = b.cells[columnIndex].textContent;
            if (columnIndex === 1) { // Sort "Stop X" numerically
                aValue = parseInt(aValue.split(' ')[1]);
                bValue = parseInt(bValue.split(' ')[1]);
            } else if (columnIndex === 3) { // Sort boolean values
                aValue = aValue === 'true';
                bValue = bValue === 'true';
            }
            if (aValue < bValue) return -direction;
            if (aValue > bValue) return direction;
            return 0;
        });

        rows.forEach(row => tbody.appendChild(row));
        table.dataset.sortDirection = direction === 1 ? 'asc' : 'desc';
    }

    function highlightSlug(slug) {
        removeHighlights();
        const dataTable = document.querySelector('data-table');
        if (dataTable) {
            const elements = dataTable.querySelectorAll('*');
            elements.forEach(element => {
                if (element.textContent.includes(slug)) {
                    element.style.backgroundColor = 'yellow';
                    currentHighlights.push(element);
                }
            });
        }
    }

    function removeHighlights() {
        currentHighlights.forEach(element => {
            element.style.backgroundColor = '';
        });
        currentHighlights = [];
    }

    function createTimeCheckTool() {
        const container = document.createElement('div');

        const timeInput = document.createElement('input');
        timeInput.type = 'number';
        timeInput.value = CONFIG.DEFAULT_MIN_TIME;
        timeInput.min = 0;
        timeInput.style.width = '100%';
        timeInput.style.marginBottom = '10px';
        container.appendChild(timeInput);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = 300;
        slider.value = CONFIG.DEFAULT_MIN_TIME;
        slider.style.width = '100%';
        slider.style.marginBottom = '10px';
        container.appendChild(slider);

        const checkButton = document.createElement('button');
        checkButton.textContent = 'Check Segments';
        checkButton.style.width = '100%';
        container.appendChild(checkButton);

        timeInput.addEventListener('input', () => slider.value = timeInput.value);
        slider.addEventListener('input', () => timeInput.value = slider.value);

        checkButton.addEventListener('click', () => {
            const minTime = parseInt(timeInput.value);
            checkSegmentsWithRetry(minTime);
        });

        return container;
    }

    function createSettingsView() {
        const container = document.createElement('div');
        container.textContent = 'Settings view (placeholder)';
        return container;
    }

    function checkSegments(minTime) {
        console.log(`Checking segments with minimum time: ${minTime} seconds`);
        const segments = document.querySelectorAll('.route-timeline-segment-stop.--past');

        if (segments.length === 0) {
            console.log('No segments found. Will retry.');
            return false;
        }

        segments.forEach(segment => {
            const titleAttr = segment.getAttribute('title');
            if (titleAttr) {
                const match = titleAttr.match(/Stop: (\d+)m, (\d+)s/);
                if (match) {
                    const totalSeconds = parseInt(match[1]) * 60 + parseInt(match[2]);
                    if (totalSeconds < minTime) {
                        segment.style.color = 'red';
                        console.log(`Segment marked red: ${titleAttr}`);
                    } else {
                        segment.style.color = '';
                    }
                }
            }
        });

        console.log(`Checked ${segments.length} segments`);
        return true;
    }

    function checkSegmentsWithRetry(minTime, retries = 0) {
        if (checkSegments(minTime)) return;

        if (retries < CONFIG.MAX_RETRIES) {
            console.log(`Retry ${retries + 1}/${CONFIG.MAX_RETRIES}`);
            setTimeout(() => checkSegmentsWithRetry(minTime, retries + 1), CONFIG.CHECK_INTERVAL);
        } else {
            console.log('Max retries reached. Segments not found.');
        }
    }

    function handleInterceptedResponse(response) {
        response.clone().json().then(data => {
            latestApiData = data;
            if (isFirstApiRequest) {
                routes = data.routes;
                showView('status');
                isFirstApiRequest = false;
            } else {
                updateDataButton.style.display = 'block';
            }
        });
        return response;
    }

    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
            if (response.url.includes('/api/v2/routes/list')) {
                return handleInterceptedResponse(response);
            }
            return response;
        });
    };

    const { sidebar, updateDataButton } = createSidebar();
    showView('status');
    setInterval(() => checkSegmentsWithRetry(CONFIG.DEFAULT_MIN_TIME), 30000);
})();