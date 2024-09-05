# Dock Scheduler Application

## Overview

This application is designed to help manage and schedule loading docks for a warehouse. It allows users to:

1. **Load JSON route data**: Users can paste JSON route data and visualize scheduled dock times.
2. **Analyze routes**: It analyzes selected routes to determine available docks at alternate times.
3. **Move routes**: The application allows users to move routes to available time slots and docks.
4. **Display a calendar**: The dock calendar shows current and moved routes, ordered by time.
5. **Settings**: The margin between loading times can be adjusted.

## Core Features

### Route Loading
- Routes are loaded by pasting JSON data into the input field.
- The application checks the JSON format and alerts users if the format is invalid.

### Route Analysis
- Select a route to see alternative available times and docks.
- The application calculates free dock times using the configured margin.

### Moving Routes
- Users can move selected routes to an available dock and time using the "Move" button.
- Moved routes are reflected in the dock calendar in the correct time order.

### Dock Calendar
- The dock calendar displays all routes (existing and moved) in a grid format.
- Each dock shows the scheduled times, and users can easily see which docks are free at a given time.

## Settings

- **Time Margin**: Configurable time margin (default: 5 minutes) to account for buffer time between docked routes.

## File Structure

- **index.html**: Core HTML structure.
- **styles.css**: Layout and styling.
- **app.js**: Main application logic (route loading, analysis, moving).
- **calendar.js**: Handles the dock calendar rendering and updating.
