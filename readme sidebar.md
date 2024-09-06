# IKEA Route Status Checker

This Tampermonkey userscript enhances the IKEA route tracking page with additional features and improved visibility.

## Features

1. **Route Status Table**: Displays a comprehensive table of all routes and their stops, with filtering and sorting capabilities.
2. **Time Check Tool**: Allows you to check for segments that are shorter than a specified duration.
3. **Settings**: Customize the script's behavior and appearance.
4. **Sidebar Interface**: All new features are accessible through a collapsible sidebar.

## Installation

1. Install the Tampermonkey browser extension.
2. Create a new script in Tampermonkey and paste the entire code from the `ikea-route-checker.user.js` file.
3. Save the script and refresh the IKEA routes page.

## Usage

- Click the '☰' button in the top-right corner to toggle the sidebar.
- Use 'Ctrl + B' as a keyboard shortcut to toggle the sidebar.
- Navigate between different views using the sidebar menu.
- In the Status Table view:
  - Use the filter input to search for specific routes or statuses.
  - Click on column headers to sort the table.
  - Click on a route name to highlight it in the main page.
- In the Time Check view:
  - Set a minimum time using the input or slider.
  - Click "Check Segments" to highlight segments shorter than the specified time.
- In the Settings view:
  - Change the theme (Light/Dark).
  - Export route data as JSON.

## Customization

You can modify the `CONFIG` object at the top of the script to adjust default settings:

```javascript
const CONFIG = {
    DEFAULT_MIN_TIME: 130,
    CHECK_INTERVAL: 2500,
    MAX_RETRIES: 10
};
```

## Contributing

Feel free to fork this project and submit pull requests with any improvements or bug fixes.

## License

This project is open source and available under the [MIT License](LICENSE).
