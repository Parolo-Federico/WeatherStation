# Weather Station Dashboard

A modern, interactive web application for monitoring environmental conditions (Temperature, Humidity, and Luminosity) across multiple laboratory workstations. 

## Overview
This dashboard connects to a configurable data server to fetch real-time environmental metrics for various lab workstations. If the server is unavailable, the application gracefully falls back to a set of local sample data, ensuring the dashboard can always be demonstrated or tested offline.

## Features
- **Dynamic Data Fetching**: Users can input a custom server IP address and port to fetch live data.
- **Offline Fallback**: Automatically loads local sample data (`Measures/measures.json`) if the specified server cannot be reached.
- **Interactive Heatmap**: Features a 2D HTML5 Canvas heatmap representing a lab layout (up to 30 student workstations and 1 teacher desk). Workstations change color dynamically based on their latest temperature readings (ranging from green at 19°C to red at 30°C+).
- **Data Visualization**: Integrates **Chart.js** to display detailed line charts for Temperature, Humidity, and Luminosity over time.
- **Lab & Workstation Selection**: A sidebar allows users to switch between different labs. Upon selecting a lab, users can view aggregated mean data for the entire lab or drill down to individual workstations.
- **Excel Report Generation**: Includes a standalone Python script (`generate_excel.py`) that parses the local JSON data and generates a nicely formatted, multi-sheet Excel workbook (`weather_data.xlsx`) using `openpyxl`.

## Project Structure
- `index.html`: The main HTML structure, defining the layout of the sidebar, options pane, heatmap canvas, and chart containers.
- `styles.css`: The stylesheet providing a clean, responsive, and modern UI, including a collapsible sidebar and styled buttons.
- `main.js`: The core JavaScript logic that handles data fetching, JSON parsing, UI state management, Chart.js integration, and canvas heatmap rendering.
- `generate_excel.py`: A Python utility script to convert the JSON data into a structured Excel spreadsheet.
- `Measures/`: Directory containing the fallback `measures.json` and the output `weather_data.xlsx`.

## Getting Started

### Running the Web Dashboard
1. Open the `index.html` file in any modern web browser.
2. The dashboard will attempt to connect to `localhost:3000` by default.
3. To connect to a different server, enter the address (e.g., `192.168.1.100:8080`) in the "Insert server address and port" field and click **Fetch**.
4. If no server is running, the app will display a warning and automatically load the sample data from `Measures/measures.json`.

### Generating the Excel Report
To run the Python script that generates the Excel report, you will need Python installed along with the `openpyxl` library:

```bash
pip install openpyxl
python generate_excel.py
```
This will read from `Measures/measures.json` and generate `Measures/weather_data.xlsx`.

## Technologies Used
- **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript
- **Libraries**: [Chart.js](https://www.chartjs.org/) (via CDN) for data visualization
- **Tools**: Python 3 & `openpyxl` for Excel report generation
