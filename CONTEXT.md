# Raman Spectroscopy Paleothermometer Web App

## Purpose

This web-based application is designed to analyze Raman spectroscopy data from ceramic samples. It serves as a paleothermometer — allowing users to both build calibration curves from experimental firing data and estimate firing temperatures of archaeological samples.

## Features

### 🔬 Dual Tab Interface
- **Experimental Data Tab**
  - Upload multiple spectrum files with known firing temperatures
  - Navigate through files using dropdown or quick navigation buttons (<<, >>)
  - Detect D and G peaks using two methods: Simple (moving average) and Voigt + Savitzky-Golay
  - Calculate key parameters: HD/HG, D Width, G Width, WD/WG
  - Plot calibration curves with individual data, averages, standard deviations, and trendlines
  - Compare Simple vs Voigt results with statistical significance testing
  - Selectively include/exclude samples using checkboxes
  - Toggle visibility of smoothing and fitting curves

- **Archaeological Samples Tab**
  - Upload multiple spectra of samples with unknown firing temperature
  - Navigate through samples using dropdown or quick navigation buttons (<<, >>)
  - Apply the same analysis pipeline (method, intervals, height %) as the Experimental Tab for consistency
  - Click "Derive Temperatures" button to (re)calculate and display derived temperatures and update calibration plots.
  - Derive temperature ranges based on calibration curves from experimental data. The derived temperature table shows:
    - "Best estimate" temperatures (where the archaeological sample's value crosses the mean calibration curve).
    - "Possible range" temperatures (where the archaeological sample's value falls within the mean ± standard deviation of the calibration curve).
    - For values outside the mean calibration curve but within the SD band, the "best estimate" shows the midpoint of the in-SD range.
    - If a value is entirely out of the calibration curve (even with SD), it's reported as "Out of range (closest: X°C)", indicating the temperature at the nearest edge of the calibration curve.
  - Show spectra and fitted peaks for each sample (if applicable based on selected method).
  - Display derived temperatures in a summary table for each parameter (HD/HG, D Width, G Width, WD/WG), including best estimates and SD ranges.
  - Overlay archaeological points on calibration charts:
    - Points are plotted at their derived temperature(s) against their parameter value.
    - Out-of-range archaeological points are visually distinguished (e.g., hollow circles with dashed borders).
    - Tooltips for out-of-range points display "Out of range (closest: X°C)".
    - Calibration chart Y-axis automatically adjusts with padding to ensure out-of-range points are visible.

### 📈 Plotting & Interactivity
- Full spectrum plot with:
  - Detected peak centers
  - Width lines at user-defined % height
  - Voigt fitted curves when applicable
  - Savitzky-Golay smoothing overlay
- Independent charts for each tab
- Chart.js based visualizations with hover tooltips and interactive legends
- Method-specific data visualization (Simple/Voigt) in statistical plots
- Error bars showing standard deviations
- Peak labels with wavelength values
- Width labels showing FWHM values
- Calibration charts in the Archaeological tab dynamically update with overlaid archaeological sample points.
  - Visual distinction for out-of-range points and informative tooltips.
  - Y-axis scales adjust to include all data points, including standard deviations and out-of-range archaeological samples.

### ⚙️ Custom Controls
- User-selectable peak intervals and search width height (% of peak)
- Drop-down to select method (Simple or Voigt)
- Mode selection (Broad/Conventional) with synchronized controls across tabs
- Quick file navigation with previous/next buttons
- Sample inclusion/exclusion controls for statistical analysis
- Button to re-analyze spectra
- Visual tab switching with active-state styling
- Toggle switches for smoothing and fitting visualization

### 📊 Statistics and Data Analysis
- Grouped results by firing temperature
- Average, Standard Deviation, and Standard Error calculations
- Overlay of means and error bars on scatter plots
- Method comparison table with paired t-test and significance flags
- Interactive data selection through checkboxes
- Separate statistical plots for:
  - HD/HG Ratio
  - D Width
  - G Width
  - WD/WG Ratio
- Method comparison charts showing both Simple and Voigt results
- Detailed statistical tables with temperature-wise breakdowns

### 🔄 Synchronization Features
- Synchronized method selection between tabs (Experimental tab controls Archaeological tab calculations).
- Synchronized mode selection (Broad/Conventional) (Experimental tab controls Archaeological tab calculations).
- Peak interval and width percentage settings from the Experimental tab are used for all calculations in the Archaeological tab to ensure consistency.
- Automatic parameter updates when changing methods.
- Default value restoration for different modes
- Consistent width percentage settings across tabs

### 🧮 Data Processing
- Savitzky-Golay smoothing for Voigt method
- Peak detection with multiple algorithms
- Width calculation at user-defined heights
- Automatic valley detection between peaks
- Temperature extraction from filenames
- Pseudo-Voigt function fitting for peak analysis
- Matrix operations for Savitzky-Golay coefficients
- Linear interpolation for precise width measurements

## Technologies Used

- HTML5 + CSS3 (custom styling)
- JavaScript (Vanilla)
- Chart.js with error bars plugin
- Chart.js Annotation plugin
- FileReader API (for .txt file loading)
- Client-side peak detection, fitting, and statistical analysis

## Project Structure

- `index.html` — dual-tab UI layout with synchronized controls
- `script.js` — full analysis pipeline, data processing, and visualization logic
- `styles.css` — UI and tab design

## Intended Usage

1. Upload experimental data in the first tab to build calibration models
2. Use checkboxes to include/exclude specific samples from analysis
3. Switch between Simple and Voigt methods to compare results
4. Navigate through files using dropdown or navigation buttons
5. Toggle smoothing and fitting visualization as needed
6. Switch to the archaeological tab to upload unknowns
7. Use plots and tables to interpret thermal history
8. Export or analyze results using the statistical tools provided

## Notes

- Designed for in-browser use (no server needed)
- Easy to port into Cursor or VSCode environments
- Lightweight, dependency-free except for Chart.js and its plugins
- Extensible for baseline correction, export, and trendline fitting
- Robust error handling and data validation
- Synchronized controls for consistent analysis across tabs
- Automatic peak detection and fitting with configurable parameters
- Statistical analysis with significance testing
- Interactive data visualization with error bars