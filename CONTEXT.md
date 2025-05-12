# Raman Spectroscopy Paleothermometer Web App

## Purpose

This web-based application is designed to analyze Raman spectroscopy data from ceramic samples. It serves as a paleothermometer — allowing users to both build calibration curves from experimental firing data and estimate firing temperatures of archaeological samples.

## Features

### 🔬 Dual Tab Interface
- **Experimental Data Tab**
  - Upload multiple spectrum files with known firing temperatures
  - Navigate through files using dropdown or quick navigation buttons (<<, >>)
  - Detect D and G peaks using three methods: Simple (moving average), Voigt + Savitzky-Golay, and Voigt (5D).
    - The Voigt (5D) method's full fitting and detailed statistical calculations are explicitly triggered by a "Derive D/G parameters (Voigt 5D)" button press.
  - Calculate key parameters: HD/HG, D Width, G Width, WD/WG in a "Top Peaks" table.
  - **On-Demand Calibration Curves:**
    - Select desired parameters (HD/HG, D Width, G Width, WD/WG) via checkboxes.
    - Click "Build Selected Curves" button to generate and display statistical plots (calibration curves with individual data, averages, standard deviations, and trendlines) for the chosen parameters. This applies to all analysis methods.
  - Compare Simple vs Voigt results with statistical significance testing (this table still appears automatically after "Update Peaks").
  - Selectively include/exclude samples using checkboxes in the "Top Peaks" table. This efficiently updates the table display and clears any previously generated on-demand calibration plots.
  - Toggle visibility of smoothing and fitting curves.
  - Performance optimization: Voigt/Voigt5D analysis results for the currently displayed spectrum are cached to avoid redundant calculations when interactions don't change the underlying data.

- **Archaeological Samples Tab**
  - Upload multiple spectra of samples with unknown firing temperature
  - Navigate through samples using dropdown or quick navigation buttons (<<, >>)
  - Apply the same analysis pipeline (method, intervals, height %) as the Experimental Tab for consistency (using `window.calibrationStats` generated from experimental data).
    - For the Voigt (5D) method, analysis consistency also depends on the "Derive D/G parameters (Voigt 5D)" button having been previously pressed on the Experimental tab (state carried via `window.isVoigt5DTriggeredByButton`).
  - Click "Derive Temperatures" button to (re)calculate and display derived temperatures and update calibration plots.
  - The processing of archaeological samples (via `updateArchaeoPlot`) is only performed if this tab is currently active, enhancing performance when working on the Experimental tab.
  - Derive temperature ranges based on calibration curves from experimental data. The derived temperature table shows:
    - "Best estimate" temperatures: These are points where the archaeological sample's parameter value intersects the mean calibration curve. Each estimate is accompanied by a temperature uncertainty (ΔT), calculated from the local slope of the calibration curve and the parameter's standard deviation at that point. If a segment of the calibration curve is flat, the temperature may be reported as "Uncertain" or with a very high ΔT.
    - "Possible range" temperatures: These are temperature intervals where the archaeological sample's parameter value falls within the mean ± standard deviation band of the calibration curve. These ranges are processed to merge overlapping sections and round to sensible values.
    - For values that do not intersect the mean curve but fall within an SD band, the "best estimate" may reflect the midpoint of the temperature range where it's within the SD band.
    - If a value is entirely out of the calibration curve (even considering the SD band), it's reported as "Out of range (closest: X°C)", indicating the temperature at the nearest edge of the calibration curve's SD band.
  - Show spectra and fitted peaks for each sample (if applicable based on selected method).
  - Display derived temperatures in a summary table for each parameter (HD/HG, D Width, G Width, WD/WG), including best estimates with their uncertainties (ΔT) and consolidated SD ranges.
  - Overlay archaeological points on calibration charts:
    - Points are plotted at their derived temperature(s) against their parameter value.
    - Visual distinction for archaeological points:
      - Solid markers (e.g., rotated rectangles) if the value intersects the mean calibration line.
      - Markers with a border but transparent fill if the value is within an SD band but does not cross the mean line.
      - Hollow markers with dashed borders if the value is out of the calibration range (mean ± SD).
    - Tooltips provide detailed information, including "Out of range (closest: X°C)" for points outside the calibration band.
    - Calibration chart Y-axis automatically adjusts with padding to ensure all data points are visible, including calibration means, full standard deviation bands, and any out-of-range archaeological samples.

### 📈 Plotting & Interactivity
- Full spectrum plot with:
  - Detected peak centers
  - Width lines at user-defined % height
  - Voigt fitted curves when applicable (including individual components and total sum for Voigt (5D))
  - Savitzky-Golay smoothing overlay
- Independent charts for each tab
- Chart.js based visualizations with hover tooltips and interactive legends
- Method-specific data visualization (Simple/Voigt) in statistical plots
- Experimental tab statistical plots (calibration curves) are generated on user request via the "Build Selected Curves" button and feature vertical error bars for parameter standard deviation and horizontal error bars for estimated temperature uncertainty (ΔT).
- Peak labels with wavelength values
- Width labels showing FWHM or user-defined % height width values on main spectrum plots.
- Calibration charts in the Archaeological tab dynamically update with overlaid archaeological sample points, featuring distinct visual styles for points on the mean calibration line, within the SD band only, or out of range, along with informative tooltips.
- Y-axis scales on calibration charts adjust dynamically with padding to ensure all data points are visible, including calibration means, standard deviation bands, and out-of-range archaeological samples.

### ⚙️ Custom Controls
- User-selectable peak intervals and search width height (% of peak)
- Drop-down to select method (Simple, Voigt, or Voigt (5D))
- Mode selection (Broad/Conventional) with synchronized controls across tabs
- Quick file navigation with previous/next buttons
- Sample inclusion/exclusion controls for statistical analysis
- Button to re-analyze spectra
- Visual tab switching with active-state styling
- Toggle switches for smoothing and fitting visualization

### 📊 Statistics and Data Analysis
- Grouped results by firing temperature
- Average, Standard Deviation, and Standard Error calculations
- Calculation of estimated temperature uncertainty (ΔT) for experimental data, derived from the local slope of the calibration curve and the standard deviation of the measured parameter.
- Overlay of means and error bars (parameter SD and temperature ΔT) on scatter plots in the experimental tab.
- Method comparison table with paired t-test and significance flags
- Interactive data selection through checkboxes
- Separate statistical plots for:
  - HD/HG Ratio
  - D Width
  - G Width
  - WD/WG Ratio
- Method comparison charts showing both Simple and Voigt results
- Detailed statistical tables with temperature-wise breakdowns
- Peak detection with multiple algorithms
- Width calculation at user-defined heights (for Simple method and as a target for Voigt fitting).
- Automatic valley detection between peaks for defining Voigt fitting intervals.
- Temperature extraction from filenames
- Pseudo-Voigt function fitting for peak analysis, with width calculation at user-defined % height (from experimental tab settings) to determine the reported width.
- **Voigt (5D) Method:**
  - Execution of the full `fitDComplexAndGPeak_Voigt5D` fitting process, and subsequent detailed statistical calculations for all files (in `updatePlot` and `updateArchaeoPlot`), is gated by the "Derive D/G parameters (Voigt 5D)" button press (controlled by `window.isVoigt5DTriggeredByButton`). If this button has not been pressed for the current session, simpler Voigt results or placeholders may be used.
  - Deconvolves the D-band and G-band regions using a total of six pseudo-Voigt components (D1, D2, D3, D4, D5, and G).
  - The error calculation for the fitting process is holistic: the sum of all six components is compared against smoothed experimental data in both the D-band and G-band regions.
  - Employs an iterative gradient descent optimization to refine all peak parameters (Amplitude, Center, Sigma, Gamma, Eta) for all six components simultaneously.
  - The optimization process tracks and ultimately uses the set of parameters that achieved the lowest overall fitting error across all iterations.
  - Utilizes refined initial parameters and strict parameter clamping for peak positions (`mu`), widths (`sigma`, `gamma`), amplitudes (`A`), and Lorentzian/Gaussian mixing ratio (`eta`) for all components.
  - Operates on Savitzky-Golay smoothed spectral data for improved fitting stability.
  - The `findTopPeaks` function, when using the Voigt (5D) method and after the button trigger, calls `fitDComplexAndGPeak_Voigt5D`. It returns key parameters for the primary D-peak (approximated by D1) and G-peak for tabular display and calculations, along with *all* `fittedCurves` (individual D1-D5, G, and the total sum of these components) for detailed plotting.
  - Calculates and displays a "Total Fit (Sum)" curve (typically bold red) representing the sum of all six fitted components (D1-D5 + G).
  - Individual component curves for D1-D5 and the G peak are also plotted (typically as thinner lines of various colors).
- Sophisticated interpolation and range-finding logic (`findTemperaturesForValue`, `findTemperatureRangesWithinSD`) to derive temperatures and their uncertainties/ranges from calibration curves.

### 🔄 Synchronization Features
- Synchronized method selection between tabs (Experimental tab controls Archaeological tab calculations).
- Synchronized mode selection (Broad/Conventional) (Experimental tab controls Archaeological tab calculations).
- Peak interval and width percentage settings from the Experimental tab are used for all calculations in the Archaeological tab (including deriving `window.calibrationStats` and analyzing archaeological samples) to ensure consistency.
- Automatic parameter updates when changing methods.
- Default value restoration for different modes
- Consistent width percentage settings across tabs

### 🧮 Data Processing
- Savitzky-Golay smoothing for Voigt method
- Peak detection with multiple algorithms
- Width calculation at user-defined heights (for Simple method and as a target for Voigt fitting).
- Automatic valley detection between peaks for defining Voigt fitting intervals.
- Temperature extraction from filenames
- Pseudo-Voigt function fitting for peak analysis, with width calculation at user-defined % height (from experimental tab settings) to determine the reported width.
- **Voigt (5D) Method:**
  - Deconvolves the D-band and G-band regions using a total of six pseudo-Voigt components (D1, D2, D3, D4, D5, and G).
  - The error calculation for the fitting process is holistic: the sum of all six components is compared against smoothed experimental data in both the D-band and G-band regions.
  - Employs an iterative gradient descent optimization to refine all peak parameters (Amplitude, Center, Sigma, Gamma, Eta) for all six components simultaneously.
  - The optimization process tracks and ultimately uses the set of parameters that achieved the lowest overall fitting error across all iterations, rather than just the parameters from the final iteration.
  - Utilizes refined initial parameters and strict parameter clamping for peak positions (`mu`), widths (`sigma`, `gamma`), amplitudes (`A`), and Lorentzian/Gaussian mixing ratio (`eta`) for all components to ensure physically meaningful results and guide convergence.
  - Calculates and displays a "Total Fit (Sum)" curve (typically bold red) representing the sum of all six fitted components (D1-D5 + G).
  - Individual component curves for D1-D5 and the G peak are also plotted (typically as thinner lines of various colors) for detailed assessment.
  - Operates on Savitzky-Golay smoothed spectral data for improved fitting stability and robustness against noise.
- Sophisticated interpolation and range-finding logic (`findTemperaturesForValue`, `findTemperatureRangesWithinSD`) to derive temperatures and their uncertainties/ranges from calibration curves, including handling of flat or near-flat segments.
- Matrix operations for Savitzky-Golay coefficients
- Linear interpolation for precise width measurements in some contexts.

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
- **Performance Optimizations:**
  - Caching of Voigt/Voigt5D analysis results in `updatePlot` for the main experimental spectrum display to avoid redundant computations.
  - Conditional execution of `updateArchaeoPlot` (processing archaeological samples) only when its tab is visible.
  - Removal of redundant `findTopPeaks` call within `displayPeakInfo`; peak parameters are now sourced directly from pre-calculated results.
  - **On-demand generation of statistical plots (calibration curves) in the Experimental tab:** Reduces initial processing load when files are uploaded or settings are changed, improving app responsiveness.
  - **Efficient "Top Peaks" table updates:** Toggling sample inclusion checkboxes in the Experimental tab's "Top Peaks" table now directly updates the table display and clears old on-demand plots without triggering full recalculations of all peak parameters for all files.

