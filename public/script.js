let allFilesData = [];
let displayedFileIndex = 0;
let includedSamples = new Set(); // Track which samples are included in calculations
let archaeologicalFiles = [];
let selectedArchaeoIndex = 0;
window.isVoigt5DTriggeredByButton = false; // Corrected global flag initialization

// Add this flag at the top of your script
let isLoadingState = false;

// Add new global/window variable if not already present
if (typeof window.archaeologicalFiles === 'undefined') {
    window.archaeologicalFiles = [];
}

if (!window.statsCharts) window.statsCharts = {};
if (!window.myCharts) window.myCharts = {}; // Ensure this is also initialized if not already

// Add this new function
function saveAppState() {
    if (isLoadingState) {
        console.log("Skipping saveAppState during load phase.");
        return;
    }

    const state = {
        allFilesData: allFilesData,
        displayedFileIndex: displayedFileIndex,
        archaeologicalFiles: archaeologicalFiles,
        selectedArchaeoIndex: selectedArchaeoIndex,
        includedSamples: Array.from(includedSamples), // Convert Set to Array for JSON
        uiSettings: {
            analysisMethod: document.getElementById("analysisMethod")?.value,
            peak1Mode: document.getElementById("peak1Mode")?.value,
            peak1Start: document.getElementById("peak1Start")?.value,
            peak1End: document.getElementById("peak1End")?.value,
            peak2Start: document.getElementById("peak2Start")?.value,
            peak2End: document.getElementById("peak2End")?.value,
            dBandWidthHeight: document.getElementById("dBandWidthHeight")?.value,
            gBandWidthHeight: document.getElementById("gBandWidthHeight")?.value,
            showSmoothing: document.getElementById("showSmoothing")?.checked,
            showFitting: document.getElementById("showFitting")?.checked,
            archaeoShowSmoothing: document.getElementById("archaeoShowSmoothing")?.checked,
            archaeoShowFitting: document.getElementById("archaeoShowFitting")?.checked,
            // Add new checkboxes for calibration curve parameters
            cbParamHdHg: document.getElementById("cbParamHdHg")?.checked,
            cbParamWdWg: document.getElementById("cbParamWdWg")?.checked,
            cbParamDWidth: document.getElementById("cbParamDWidth")?.checked,
            cbParamGWidth: document.getElementById("cbParamGWidth")?.checked,
            // New for Archaeo Tab
            archaeoCbParamHdHg: document.getElementById("archaeoCbParamHdHg")?.checked,
            archaeoCbParamWdWg: document.getElementById("archaeoCbParamWdWg")?.checked,
            archaeoCbParamDWidth: document.getElementById("archaeoCbParamDWidth")?.checked,
            archaeoCbParamGWidth: document.getElementById("archaeoCbParamGWidth")?.checked,
        }
    };
    try {
        sessionStorage.setItem('ramanAppState', JSON.stringify(state));
        console.log("App state saved.");
    } catch (e) {
        console.error("Error saving app state to session storage:", e);
    }
}

// Add this new function
function loadAppState() {
    isLoadingState = true;
    try {
        const storedState = sessionStorage.getItem('ramanAppState');
        if (storedState) {
            const state = JSON.parse(storedState);
            console.log("Loading app state:", state);

            allFilesData = state.allFilesData || [];
            displayedFileIndex = state.displayedFileIndex || 0;
            archaeologicalFiles = state.archaeologicalFiles || [];
            window.archaeologicalFiles = archaeologicalFiles; // Ensure global window object is updated if used directly
            selectedArchaeoIndex = state.selectedArchaeoIndex || 0;
            includedSamples = new Set(state.includedSamples || []);

            if (state.uiSettings) {
                const settings = state.uiSettings;
                const setValue = (id, value) => { const el = document.getElementById(id); if (el && value !== undefined && value !== null) el.value = value; };
                const setChecked = (id, checked) => { const el = document.getElementById(id); if (el && checked !== undefined && checked !== null) el.checked = checked; };

                setValue("analysisMethod", settings.analysisMethod);
                setValue("peak1Mode", settings.peak1Mode);
                setValue("peak1Start", settings.peak1Start);
                setValue("peak1End", settings.peak1End);
                setValue("peak2Start", settings.peak2Start);
                setValue("peak2End", settings.peak2End);
                setValue("dBandWidthHeight", settings.dBandWidthHeight);
                setValue("gBandWidthHeight", settings.gBandWidthHeight);

                setChecked("showSmoothing", settings.showSmoothing);
                setChecked("showFitting", settings.showFitting);
                setChecked("archaeoShowSmoothing", settings.archaeoShowSmoothing);
                setChecked("archaeoShowFitting", settings.archaeoShowFitting);

                // Load states for new checkboxes
                setChecked("cbParamHdHg", settings.cbParamHdHg);
                setChecked("cbParamWdWg", settings.cbParamWdWg);
                setChecked("cbParamDWidth", settings.cbParamDWidth);
                setChecked("cbParamGWidth", settings.cbParamGWidth);

                // Load states for new archaeo checkboxes
                setChecked("archaeoCbParamHdHg", settings.archaeoCbParamHdHg);
                setChecked("archaeoCbParamWdWg", settings.archaeoCbParamWdWg);
                setChecked("archaeoCbParamDWidth", settings.archaeoCbParamDWidth);
                setChecked("archaeoCbParamGWidth", settings.archaeoCbParamGWidth);
            }

            const fileSelector = document.getElementById("fileSelector");
            if (fileSelector) {
                fileSelector.innerHTML = "";
                allFilesData.forEach((fileData, index) => {
                    const option = document.createElement("option");
                    option.value = index;
                    option.textContent = fileData.name;
                    fileSelector.appendChild(option);
                });
                if (allFilesData.length > 0 && displayedFileIndex < allFilesData.length) {
                    fileSelector.value = displayedFileIndex;
                } else if (allFilesData.length > 0) {
                    fileSelector.value = 0;
                    displayedFileIndex = 0;
                }
            }

            const archaeoFileSelector = document.getElementById("archaeoFileSelector");
            if (archaeoFileSelector) {
                archaeoFileSelector.innerHTML = "";
                archaeologicalFiles.forEach((fileData, index) => {
                    const option = document.createElement("option");
                    option.value = index;
                    option.textContent = fileData.name;
                    archaeoFileSelector.appendChild(option);
                });
                if (archaeologicalFiles.length > 0 && selectedArchaeoIndex < archaeologicalFiles.length) {
                    archaeoFileSelector.value = selectedArchaeoIndex;
                } else if (archaeologicalFiles.length > 0) {
                    archaeoFileSelector.value = 0;
                    selectedArchaeoIndex = 0;
                }
            }
            console.log("App state loaded successfully from session storage.");
        } else {
            console.log("No app state found in session storage.");
        }
    } catch (e) {
        console.error("Error loading app state from session storage:", e);
    } finally {
        isLoadingState = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
  loadAppState(); // Load state first thing. This populates UI elements if state exists.

  // If after loading, critical inputs are still empty (e.g. first visit or cleared session storage)
  // then apply initial default UI settings and save them.
  const peak1StartInput = document.getElementById("peak1Start");
  if (!peak1StartInput.value) {
      console.log("No saved state for peak1Start, applying initial defaults to UI.");
      // Ensure method and mode dropdowns have a basic value if not set by loadAppState,
      // before calling updatePeak1Inputs which reads them.
      const analysisMethodInput = document.getElementById("analysisMethod");
      if (!analysisMethodInput.value) analysisMethodInput.value = "simple"; // Default to simple
      const peak1ModeInput = document.getElementById("peak1Mode");
      if (!peak1ModeInput.value) peak1ModeInput.value = "broad"; // Default to broad

      updatePeak1Inputs(); // This function now ONLY sets UI default values based on current method/mode
      saveAppState();      // Save these initial defaults.
  }

  // Initial plot update using values now in the UI (either from storage or initial defaults)
  // Ensures a plot is shown on first load or refresh.
  if (allFilesData.length > 0) {
      updateDisplayedFile();
  }
  // The direct call to updatePeak1Inputs() that was previously here (before it was parameterized) is removed.

  // Event listener for the NEW "Restore Default Settings" button
  // User needs to add <button id="restoreDefaultsButton">Restore Default Settings</button> to HTML
  const restoreBtn = document.getElementById("restoreDefaultsButton");
  if (restoreBtn) {
      restoreBtn.addEventListener("click", () => {
          console.log("Restore Defaults button clicked.");
          updatePeak1Inputs(); // Resets UI to defaults based on current method/mode
          saveAppState();      // Saves these restored defaults
                               // No plot update is triggered here by design.
      });
  } else {
      console.warn("restoreDefaultsButton not found in HTML. Please add it to index.html.");
  }

  document.getElementById("analysisMethod").addEventListener("change", () => {
    const analysisMethodValue = document.getElementById("analysisMethod").value;
    if (analysisMethodValue === "voigt" || analysisMethodValue === "voigt5d") {
      // If method changes to Voigt/Voigt5D, peak1Mode dropdown should visually switch to "broad".
      // This change will be saved by saveAppState().
      document.getElementById("peak1Mode").value = "broad";
    }
    saveAppState(); // Only save state. Defaults are not applied on method change.
  });

  // Add event listeners for smoothing/fitting checkboxes in both tabs
  ["showSmoothing", "showFitting", "archaeoShowSmoothing", "archaeoShowFitting"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        if (id.startsWith("archaeo")) {
          updateArchaeoPlot();
        } else {
          updateDisplayedFile(); // Checkboxes should still trigger updates
        }
        saveAppState();
      });
    }
  });

  // Add event listeners for width height inputs in both tabs
  // These are the experimental tab controls which affect both tabs
  ["dBandWidthHeight", "gBandWidthHeight"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        // No plot update here, just save the state. Plot updates on button press.
        saveAppState();
      });
    }
  });

  document.getElementById("peak1Mode").addEventListener("change", () => {
    // Changing mode only saves state. Defaults for this mode are applied via "Restore Defaults".
    saveAppState();
  });

  // Add event listeners for peak interval inputs
  ["peak1Start", "peak1End", "peak2Start", "peak2End"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        // No plot update here, just save the state. Plot updates on button press.
        saveAppState();
      });
    }
  });

  // Add navigation button event listeners for experimental tab
  document.getElementById("prevFile").addEventListener("click", () => {
    const selector = document.getElementById("fileSelector");
    if (selector.selectedIndex > 0) {
      selector.selectedIndex--;
      displayedFileIndex = parseInt(selector.value);
      updateDisplayedFile();
      saveAppState();
    }
  });

  document.getElementById("nextFile").addEventListener("click", () => {
    const selector = document.getElementById("fileSelector");
    if (selector.selectedIndex < selector.options.length - 1) {
      selector.selectedIndex++;
      displayedFileIndex = parseInt(selector.value);
      updateDisplayedFile();
      saveAppState();
    }
  });
  
  // File selector change listener for experimental tab
  const expFileSelector = document.getElementById("fileSelector");
  if (expFileSelector) {
      expFileSelector.addEventListener("change", () => {
          displayedFileIndex = parseInt(expFileSelector.value);
          updateDisplayedFile();
          saveAppState();
      });
  }


  // Add navigation button event listeners for archaeological tab
  document.getElementById("archaeoPrevFile").addEventListener("click", () => {
    const selector = document.getElementById("archaeoFileSelector");
    if (selector.selectedIndex > 0) {
      selector.selectedIndex--;
      selectedArchaeoIndex = parseInt(selector.value);
      updateArchaeoPlot();
      saveAppState();
    }
  });

  document.getElementById("archaeoNextFile").addEventListener("click", () => {
    const selector = document.getElementById("archaeoFileSelector");
    if (selector.selectedIndex < selector.options.length - 1) {
      selector.selectedIndex++;
      selectedArchaeoIndex = parseInt(selector.value);
      updateArchaeoPlot();
      saveAppState();
    }
  });
  
  // File selector change listener for archaeological tab
  const archFileSelector = document.getElementById("archaeoFileSelector");
  if (archFileSelector) {
      archFileSelector.addEventListener("change", () => {
          selectedArchaeoIndex = parseInt(archFileSelector.value);
          updateArchaeoPlot();
          saveAppState();
      });
  }

  // Add event listener for the Update Peaks button
  document.getElementById("updateButton").addEventListener("click", () => {
    // No call to updatePeak1Inputs() here. It uses current UI values.
    const analysisMethodValue = document.getElementById("analysisMethod").value;
    if (analysisMethodValue === "voigt5d") {
      window.isVoigt5DTriggeredByButton = true;
      updateDisplayedFile();
      window.isVoigt5DTriggeredByButton = false;
    } else {
      updateDisplayedFile();
    }
    saveAppState();
  });

  // Add event listeners for tab switching
  document.getElementById("tabExperimental").addEventListener("click", () => {
    document.getElementById("experimentalSection").style.display = "block";
    document.getElementById("archaeologicalSection").style.display = "none";
    document.getElementById("tabExperimental").classList.add("active");
    document.getElementById("tabArchaeological").classList.remove("active");
  });

  document.getElementById("tabArchaeological").addEventListener("click", () => {
    document.getElementById("experimentalSection").style.display = "none";
    document.getElementById("archaeologicalSection").style.display = "block";
    document.getElementById("tabArchaeological").classList.add("active");
    document.getElementById("tabExperimental").classList.remove("active");
    // Update archaeological tab when switching to it
    updateArchaeoPlot();
  });

  // Add event listener for the new Derive Temperatures button in the archaeological tab
  const archUpdateBtn = document.getElementById("archaeoUpdateButton");
  if (archUpdateBtn) {
    archUpdateBtn.addEventListener("click", () => {
      const analysisMethodValue = document.getElementById("analysisMethod").value;
      if (analysisMethodValue === "voigt5d") {
        window.isVoigt5DTriggeredByButton = true;
        updateArchaeoPlot();
        window.isVoigt5DTriggeredByButton = false;
      } else {
        updateArchaeoPlot();
      }
      saveAppState(); // Added saveAppState for consistency
    });
  }

  const buildCurvesButton = document.getElementById("buildCalibrationCurvesButton");
  if (buildCurvesButton) {
    buildCurvesButton.addEventListener("click", () => {
      const plotsContainer = document.getElementById("experimentalStatsPlotsContainer");
      if (!plotsContainer) return;
      plotsContainer.innerHTML = ''; // Clear previous plots

      // Retrieve the stored data
      const resultsByMethod = window.latestResultsByMethod;
      const currentMethod = window.latestCurrentMethod;
      // const dBandWidthHeight = window.latestDBandWidthHeight; // Not directly used here, but generateStatsPlot might need them via its own logic
      // const gBandWidthHeight = window.latestGBandWidthHeight;

      if (!resultsByMethod || !currentMethod) {
        plotsContainer.innerHTML = "<p>Please upload data and update peaks first.</p>";
        return;
      }

      const allPeaksForCurrentMethod = resultsByMethod[currentMethod];
      if (!allPeaksForCurrentMethod || allPeaksForCurrentMethod.length === 0) {
          plotsContainer.innerHTML = "<p>No peak data available for the current method to build curves.</p>";
          return;
      }

      const currentMethodName = currentMethod === 'simple' ? 'Simple' : (currentMethod === 'voigt' ? 'Voigt' : 'Voigt (5D)');
      
      let otherMethodDataForComparisonPlot;
      let otherMethodName = "";
      if (currentMethod === 'simple') {
        otherMethodDataForComparisonPlot = resultsByMethod.voigt;
        otherMethodName = 'Voigt';
      } else if (currentMethod === 'voigt') {
        otherMethodDataForComparisonPlot = resultsByMethod.simple;
        otherMethodName = 'Simple';
      } else if (currentMethod === 'voigt5d') {
        otherMethodDataForComparisonPlot = resultsByMethod.voigt || resultsByMethod.simple; // Default to Voigt, fallback to Simple
        otherMethodName = resultsByMethod.voigt ? 'Voigt' : (resultsByMethod.simple ? 'Simple' : '');
      }

      const checkedParams = [];
      if (document.getElementById("cbParamHdHg")?.checked) checkedParams.push({ id: "hdHg", label: "HD/HG Ratio"});
      if (document.getElementById("cbParamWdWg")?.checked) checkedParams.push({ id: "wdWg", label: "WD/WG Ratio"});
      if (document.getElementById("cbParamDWidth")?.checked) checkedParams.push({ id: "dWidth", label: "D Width"});
      if (document.getElementById("cbParamGWidth")?.checked) checkedParams.push({ id: "gWidth", label: "G Width"});

      if (checkedParams.length === 0) {
          plotsContainer.innerHTML = "<p>Please select at least one parameter to build calibration curves.</p>";
          return;
      }
      
      const individualDataMaster = { hdHg: [], dWidth: [], gWidth: [], wdWg: [] };
      allPeaksForCurrentMethod.forEach((file) => {
          if (includedSamples.has(file.name)) { // Only use included samples
              const temp = file.temperature.replace(" °C", "");
              if (temp !== "N/A") {
                  if (file.hdHg != null) individualDataMaster.hdHg.push({ name: file.name, temperature: temp, value: file.hdHg });
                  if (file.wdWg != null) individualDataMaster.wdWg.push({ name: file.name, temperature: temp, value: file.wdWg });
                  if (file.dWidth != null) individualDataMaster.dWidth.push({ name: file.name, temperature: temp, value: file.dWidth });
                  if (file.gWidth != null) individualDataMaster.gWidth.push({ name: file.name, temperature: temp, value: file.gWidth });
              }
          }
      });

      checkedParams.forEach(paramInfo => {
        const dataForParam = individualDataMaster[paramInfo.id];
        
        let otherDataSubsetForParam = null;
        if (otherMethodDataForComparisonPlot && otherMethodDataForComparisonPlot.length > 0) {
            otherDataSubsetForParam = otherMethodDataForComparisonPlot.map(d => ({
                name: d.name, 
                temperature: d.temperature.replace(" °C", ""), // Ensure temp is numeric string here too
                value: d[paramInfo.id]
            })).filter(d => d.value != null); // Filter out points where the specific param is null for the other method
        }

        const plotElement = generateStatsPlot(dataForParam, paramInfo.label, otherDataSubsetForParam, currentMethodName, otherMethodName);
        plotsContainer.appendChild(plotElement);
      });
      saveAppState(); // Save checkbox states
    });
  }

  // Add event listener for the new "Build Selected Curves (Archaeo)" button
  const archaeoBuildCurvesButton = document.getElementById("archaeoBuildCalibrationCurvesButton");
  if (archaeoBuildCurvesButton) {
    archaeoBuildCurvesButton.addEventListener("click", () => {
      const archaeoPlotsContainer = document.getElementById("archaeoCalibrationPlots");
      if (!archaeoPlotsContainer) {
          console.error("archaeoCalibrationPlots container not found!");
          return;
      }
      archaeoPlotsContainer.innerHTML = ''; // Clear previous plots

      if (!window.calibrationStats || Object.keys(window.calibrationStats).length === 0) {
          archaeoPlotsContainer.innerHTML = "<p>Calibration data not yet processed. Please ensure experimental data is loaded and an analysis method is active.</p>";
          return;
      }

      const archaeoCheckedParams = [];
      if (document.getElementById("archaeoCbParamHdHg")?.checked) archaeoCheckedParams.push({ id: "hdHg", label: "HD/HG Ratio"});
      if (document.getElementById("archaeoCbParamWdWg")?.checked) archaeoCheckedParams.push({ id: "wdWg", label: "WD/WG Ratio"});
      if (document.getElementById("archaeoCbParamDWidth")?.checked) archaeoCheckedParams.push({ id: "dWidth", label: "D Width"});
      if (document.getElementById("archaeoCbParamGWidth")?.checked) archaeoCheckedParams.push({ id: "gWidth", label: "G Width"});

      if (archaeoCheckedParams.length === 0) {
          archaeoPlotsContainer.innerHTML = "<p>Please select at least one parameter to build calibration curves for the archaeological samples.</p>";
          return;
      }
      
      generateCalibrationCharts(archaeoCheckedParams); 
      saveAppState(); 
    });
  } else {
      console.warn("archaeoBuildCalibrationCurvesButton not found. Please add it to index.html.");
  }
});

// Register the error bars plugin
Chart.register({
  id: 'chartjs-plugin-error-bars',
  afterDraw: (chart) => {
    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset, i) => {
      if (dataset.errorBars) {
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach((point, index) => {
          if (dataset.data[index].y !== null) {
            const { x, y } = point.getCenterPoint();
            const yScale = chart.scales.y;
            const errorBar = dataset.errorBars.y.array[index];
            
            // Draw error bar
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = dataset.errorBars.y.color || dataset.borderColor;
            ctx.lineWidth = dataset.errorBars.y.width || 2;
            
            // Vertical line
            ctx.moveTo(x, yScale.getPixelForValue(dataset.data[index].y - errorBar));
            ctx.lineTo(x, yScale.getPixelForValue(dataset.data[index].y + errorBar));
            
            // Top cap
            ctx.moveTo(x - 5, yScale.getPixelForValue(dataset.data[index].y + errorBar));
            ctx.lineTo(x + 5, yScale.getPixelForValue(dataset.data[index].y + errorBar));
            
            // Bottom cap
            ctx.moveTo(x - 5, yScale.getPixelForValue(dataset.data[index].y - errorBar));
            ctx.lineTo(x + 5, yScale.getPixelForValue(dataset.data[index].y - errorBar));
            
            ctx.stroke();
            ctx.restore();
          }
        });
      }
    });
  }
});

document.getElementById("fileInput").addEventListener("change", function (e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  allFilesData = [];
  const fileSelector = document.getElementById("fileSelector");
  fileSelector.innerHTML = ""; // Clear existing options

  const loadPromises = Array.from(files).map((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const text = event.target.result;
        const spectrumData = parseSpectrumData(text);
        resolve({
          name: file.name,
          spectrumData: spectrumData,
        });
      };
      reader.readAsText(file);
    });
  });

  Promise.all(loadPromises).then((loadedFiles) => {
    allFilesData = loadedFiles;

    loadedFiles.forEach((fileData, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = fileData.name;
      fileSelector.appendChild(option);
    });

    console.log(
      "All files loaded:",
      allFilesData.map((f) => f.name),
    );
    if (allFilesData.length > 0) {
        displayedFileIndex = 0;
        fileSelector.value = displayedFileIndex;
    } else {
        displayedFileIndex = 0; // or -1 if no files
    }
    updateDisplayedFile();
    saveAppState(); // Save state after loading new files
  });
});

// REMOVE THIS REDUNDANT LISTENER (already handled or should be commented out)
// document.getElementById("updateButton").addEventListener("click", function () {
//   updatePeak1Inputs();
//   updateDisplayedFile();
//   if (document.getElementById("archaeologicalSection").style.display !== "none") {
//     updateArchaeoPlot();
//   }
// });

// Ensure these specific listeners for width/height inputs are commented out
// as they cause automatic updates instead of waiting for the button.
// document.getElementById("dBandWidthHeight").addEventListener("input", () => {
//   updateDisplayedFile();
// });

// document.getElementById("gBandWidthHeight").addEventListener("input", () => {
//   updateDisplayedFile();
// });

function updateDisplayedFile() {
  displayedFileIndex = parseInt(document.getElementById("fileSelector").value);
  if (allFilesData.length === 0) return;

  // Always update calibration stats using the first file (ensures stats are up-to-date)
  // updatePlot(allFilesData[0].spectrumData); // OLD LINE - Always uses the first file

  // Use the selected file's spectrum data to update the main plot
  if (allFilesData[displayedFileIndex]) {
    updatePlot(allFilesData[displayedFileIndex].spectrumData);
  }

  // Only update the archaeological plot if its tab is currently visible
  if (document.getElementById("archaeologicalSection").style.display !== "none") {
    updateArchaeoPlot();
  }
  // saveAppState(); // saveAppState is often called by the calling context or by updatePlot/updateArchaeoPlot directly if needed
}

document.getElementById("archaeoFileInput").addEventListener("change", (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  archaeologicalFiles = [];
  window.archaeologicalFiles = archaeologicalFiles; // Ensure global reference
  const selector = document.getElementById("archaeoFileSelector");
  selector.innerHTML = "";

  const loadPromises = Array.from(files).map((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const spectrumData = parseSpectrumData(text);
        resolve({ name: file.name, spectrumData });
      };
      reader.readAsText(file);
    });
  });

  Promise.all(loadPromises).then((loaded) => {
    archaeologicalFiles = loaded;
    window.archaeologicalFiles = archaeologicalFiles; // Ensure global reference after loading

    loaded.forEach((f, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = f.name;
      selector.appendChild(opt);
    });

    if (archaeologicalFiles.length > 0) {
        selectedArchaeoIndex = 0;
        selector.value = selectedArchaeoIndex;
    } else {
        selectedArchaeoIndex = 0; // or -1
    }
    
    // Fix: ensure calibration stats are up-to-date before updating archaeological tab
    if (allFilesData.length > 0) {
      updateDisplayedFile(); // This will update both tabs and calibration
    } else {
      updateArchaeoPlot();
    }
    saveAppState(); // Save state after loading new archaeological files
  });
});

document
  .getElementById("archaeoFileSelector")
  .addEventListener("change", () => {
    updateArchaeoPlot();
  });

function updateArchaeoPlot() {
  selectedArchaeoIndex = parseInt(
    document.getElementById("archaeoFileSelector").value,
  );
  if (!archaeologicalFiles[selectedArchaeoIndex]) return;

  const { spectrumData } = archaeologicalFiles[selectedArchaeoIndex];

  const method = document.getElementById("analysisMethod").value;
  console.log(`DEBUG_UPDATEARCHAEOPLOT: UI method at function start: ${method}`);

  const intervals = [
    {
      start: parseFloat(document.getElementById("peak1Start").value),
      end: parseFloat(document.getElementById("peak1End").value),
    },
    {
      start: parseFloat(document.getElementById("peak2Start").value),
      end: parseFloat(document.getElementById("peak2End").value),
    },
  ];

  const dBandWidthHeight = parseFloat(document.getElementById("dBandWidthHeight").value);
  const gBandWidthHeight = parseFloat(document.getElementById("gBandWidthHeight").value);
  const widthPercentages = [dBandWidthHeight / 100, gBandWidthHeight / 100];

  // Use broad intervals only for Voigt, otherwise use user intervals
  let plotIntervals; // This definition of plotIntervals is for the main archaeo plot
  const divisionPointForDisplayPlot = getDivisionPoint( // Calculate division point for the display plot
    spectrumData.wavelengths,
    spectrumData.intensities,
    intervals,
    method
  );
  if (method === "voigt" || method === "voigt5d") { // Modified to include voigt5d
    plotIntervals = [
      { start: 1150, end: divisionPointForDisplayPlot }, // Use specific division point
      { start: divisionPointForDisplayPlot, end: 1700 }
    ];
  } else {
    plotIntervals = intervals;
  }

  // This is for the main archaeo plot display
  console.log(`DEBUG_UPDATEARCHAEOPLOT: UI method just before main findTopPeaks call: ${method}`);
  const { topPeaks: displayTopPeaks, fittedCurves: displayFittedCurves } = (() => {
    if (method === "voigt5d" && !window.isVoigt5DTriggeredByButton) {
      console.log("Voigt (5D) selected for Archaeo, but button not pressed. Skipping main plot calculation.");
      return { topPeaks: [], fittedCurves: [] };
    }
    // 'plotIntervals' is already correctly defined above for the display plot based on 'method'
    return findTopPeaks(
      spectrumData.wavelengths,
      spectrumData.intensities,
      plotIntervals, // Use the plotIntervals defined for the display plot
      widthPercentages,
      method,
      "archaeoSpectrumChart"
    );
  })();

  // Create the main spectrum chart
  const ctx = document.getElementById("archaeoSpectrumChart").getContext("2d");
  if (window.myCharts && window.myCharts["archaeoSpectrumChart"]) {
    window.myCharts["archaeoSpectrumChart"].destroy();
  }

  plotSpectrum(
    spectrumData,
    displayTopPeaks,
    displayFittedCurves,
    intervals,
    widthPercentages,
    method,
    "archaeoSpectrumChart",
  );

  // Display derived temperatures table
  displayDerivedTemperatures(
    archaeologicalFiles.map(fileData => {
      // This findTopPeaks is for deriving parameters for the table.
      // It should use the UI selected method.
      const { topPeaks: derivedTopPeaks } = (() => {
        if (method === "voigt5d" && !window.isVoigt5DTriggeredByButton) {
          return { topPeaks: [{}, {}] }; // Return placeholder to avoid errors
        }
        // Ensure plotIntervals for derivation are correctly defined based on 'method'
        // It might need its own divisionPoint calculation if fileData is different from main display
        const divisionPointForDerivation = getDivisionPoint(
            fileData.spectrumData.wavelengths,
            fileData.spectrumData.intensities,
            intervals, // UI intervals
            method
        );
        let intervalsForDerivation;
        if (method === "voigt" || method === "voigt5d") {
            intervalsForDerivation = [
                { start: 1150, end: divisionPointForDerivation },
                { start: divisionPointForDerivation, end: 1700 }
            ];
        } else {
            intervalsForDerivation = intervals;
        }
        return findTopPeaks(
          fileData.spectrumData.wavelengths,
          fileData.spectrumData.intensities,
          intervalsForDerivation, // Use intervals specific to this derivation context
          widthPercentages,
          method, // UI selected method
          "archaeoSpectrumChart_derivedTemp" // Different context
        );
      })();

      const d = derivedTopPeaks[0] || {}; // Use renamed
      const g = derivedTopPeaks[1] || {}; // Use renamed
      const hdHg = d.height && g.height && g.height !== 0 ? d.height / g.height : null;
      const wdWg = d.width && g.width && g.width !== 0 ? d.width / g.width : null;

      return {
        name: fileData.name,
        hdHg,
        dWidth: d.width || null,
        gWidth: g.width || null,
        wdWg,
        dPeak: d.wavelength || null,
        gPeak: g.wavelength || null,
        dPeakWavelength: d.wavelength || null, // Store D peak wavelength
        gPeakWavelength: g.wavelength || null  // Store G peak wavelength
      };
    }),
    method,
    dBandWidthHeight,
    gBandWidthHeight
  );

  // Always update calibration charts if we have experimental data
  if (allFilesData.length > 0) {
    // ***** START OF MODIFICATION *****
    let resultsForCalibration; // This will hold the data for generateCalibrationCharts

    const currentDBandWidth = parseFloat(document.getElementById("dBandWidthHeight").value);
    const currentGBandWidth = parseFloat(document.getElementById("gBandWidthHeight").value);
    // currentMethodForDisplay is defined later, but we might need it for a more complex check in the future
    // const currentAnalysisMethodForUI = document.getElementById("analysisMethod").value;

    // Check if global results are available and suitable
    if (window.latestResultsByMethod &&
        typeof window.latestResultsByMethod === 'object' &&
        Array.isArray(window.latestResultsByMethod.simple) &&
        Array.isArray(window.latestResultsByMethod.voigt) &&
        Array.isArray(window.latestResultsByMethod.voigt5d) &&
        window.latestDBandWidthHeight === currentDBandWidth && // Compare width settings
        window.latestGBandWidthHeight === currentGBandWidth    // Compare width settings
       ) {
        console.log("updateArchaeoPlot: Using pre-calculated results from window.latestResultsByMethod for calibration charts.");
        resultsForCalibration = window.latestResultsByMethod;
    } else {
        console.log("updateArchaeoPlot: Recalculating results for calibration charts as pre-calculated data is unsuitable or unavailable.");
        // This block is the original calculation logic for resultsByMethod, now assigned to resultsForCalibration
        resultsForCalibration = { // Initialize the object to be populated
            simple: [],
            voigt: [],
            voigt5d: [],
        };

        // Get the currently selected analysis method from the UI
        // 'method' is defined earlier in updateArchaeoPlot and holds document.getElementById("analysisMethod").value
        const currentMethodForDisplay = method; // Use the 'method' variable available in this scope

        allFilesData.forEach((fileData) => {
            const methodsToFullyProcess = ["simple", "voigt"];
            // 'currentMethodForDisplay' is the analysis method selected in the UI when updateArchaeoPlot is called
            if (currentMethodForDisplay === "voigt5d") {
                methodsToFullyProcess.push("voigt5d");
            }

            ["simple", "voigt", "voigt5d"].forEach((methodName) => {
                const callContextId = methodName + "_stats_context_archaeo_recalc"; // Distinct context ID

                let shouldFullyProcessThisStat;
                if (methodName === "voigt5d") {
                    // For Voigt (5D) stats, only process if it's the current method AND button was pressed
                    shouldFullyProcessThisStat = (currentMethodForDisplay === "voigt5d" && window.isVoigt5DTriggeredByButton);
                } else {
                    shouldFullyProcessThisStat = methodsToFullyProcess.includes(methodName);
                }

                if (shouldFullyProcessThisStat) {
                    const divisionPointForStatsLoop = getDivisionPoint(
                        fileData.spectrumData.wavelengths,
                        fileData.spectrumData.intensities,
                        intervals, // These are UI intervals, defined earlier in updateArchaeoPlot
                        methodName
                    );

                    let plotIntervalsForStats;
                    if (methodName === "voigt" || methodName === "voigt5d") {
                        plotIntervalsForStats = [
                            { start: 1150, end: divisionPointForStatsLoop },
                            { start: divisionPointForStatsLoop, end: 1700 }
                        ];
                    } else {
                        plotIntervalsForStats = intervals; // Use UI intervals for simple
                    }

                    // widthPercentages is defined earlier in updateArchaeoPlot
                    const { topPeaks } = findTopPeaks(
                        fileData.spectrumData.wavelengths,
                        fileData.spectrumData.intensities,
                        plotIntervalsForStats,
                        widthPercentages, // This comes from the UI (dBandWidthHeight, gBandWidthHeight)
                        methodName,
                        callContextId
                    );

                    const d = topPeaks[0] || {};
                    const g = topPeaks[1] || {};
                    const hdHg = d.height && g.height && g.height !== 0 ? d.height / g.height : null;
                    const wdWg = d.width && g.width && g.width !== 0 ? d.width / g.width : null;
                    const match = fileData.name.match(/(^|[^0-9])\d{3,4}(?![0-9])/);
                    const temperature = match ? `${match[0].replace(/[^0-9]/g, "")}` : "N/A";

                    resultsForCalibration[methodName].push({
                        name: fileData.name,
                        temperature,
                        hdHg,
                        dHeight: d.height || null,
                        gHeight: g.height || null,
                        dWidth: d.width || null,
                        gWidth: g.width || null,
                        wdWg,
                        dPeakWavelength: d.wavelength || null,
                        gPeakWavelength: g.wavelength || null
                    });
                } else {
                    // This case applies to "voigt5d" when it's not the currentMethodForDisplay OR button not pressed.
                    // Populate with placeholder data.
                    const match = fileData.name.match(/(^|[^0-9])\d{3,4}(?![0-9])/);
                    const temperature = match ? `${match[0].replace(/[^0-9]/g, "")}` : "N/A";
                    resultsForCalibration[methodName].push({ // methodName here will be "voigt5d"
                        name: fileData.name,
                        temperature,
                        hdHg: null, dHeight: null, gHeight: null, dWidth: null, gWidth: null, wdWg: null,
                        dPeakWavelength: null, gPeakWavelength: null
                    });
                }
            });
        });

        // Ensure resultsForCalibration.voigt5d is at least an empty array if not processed/initialized
        if (!resultsForCalibration.voigt5d) {
            resultsForCalibration.voigt5d = [];
        }
    } // ***** END OF MODIFICATION for populating resultsForCalibration *****


    // Calculate divisionPoint for the current spectrum being displayed
    const divisionPointForDisplay = getDivisionPoint(
      spectrumData.wavelengths,
      spectrumData.intensities,
      intervals, // UI intervals for the specific method being displayed
      method // 'method' is the currentMethodForDisplay for the archaeo plot
    );

    // Use broad intervals only for Voigt, otherwise use user intervals for display
    let plotIntervalsForDisplay;
    if (method === "voigt" || method === "voigt5d") {
      plotIntervalsForDisplay = [
        { start: 1150, end: divisionPointForDisplay },
        { start: divisionPointForDisplay, end: 1700 }
      ];
    } else {
      plotIntervalsForDisplay = intervals;
    }

    const { topPeaks, fittedCurves } = findTopPeaks(
      spectrumData.wavelengths,
      spectrumData.intensities,
      plotIntervalsForDisplay, // Use display-specific intervals
      widthPercentages,
      method, // Use the method selected in the UI for the archaeo plot
      "archaeoSpectrumChart" 
    );

    // **NEW**: Calculate and store calibration stats but don't plot yet
    if (resultsForCalibration && resultsForCalibration.voigt) { // Assuming Voigt is default for calibration stats
        calculateAndStoreCalibrationStats(resultsForCalibration.voigt, "voigt");
    } else {
        console.warn("updateArchaeoPlot: Voigt data not available in resultsForCalibration for calibration stats calculation.");
        window.calibrationStats = {}; // Ensure it's cleared or empty
    }

    // Clear the calibration plots container in archaeo tab, user will click button to build them
    const archaeoPlotsContainer = document.getElementById('archaeoCalibrationPlots');
    if (archaeoPlotsContainer) {
        archaeoPlotsContainer.innerHTML = '<p style="text-align: center; margin-top: 20px;">Select parameters and click "Build Selected Curves" to generate calibration plots.</p>';
    }
    // The original call to generateCalibrationCharts is removed from here.
  }
}

function displayDerivedTemperatures(allPeaks, method, dBandWidthHeight, gBandWidthHeight, resultsByMethod) {
  const tableDiv = document.getElementById("derivedTemperatureTable");
  if (!Array.isArray(allPeaks) || allPeaks.length === 0) {
    tableDiv.innerHTML = "<h3>Derived Temperatures:</h3><p>No peak data available for this method.</p>";
    return;
  }

  // Clear the container first
  tableDiv.innerHTML = '';

  // Get calibration stats from global
  const stats = window.calibrationStats;
  const paramList = ['hdHg', 'dWidth', 'gWidth', 'wdWg'];

  // Create table container HTML
  const tableContainer = document.createElement('div');
  tableContainer.innerHTML = `
    <h3>Derived Temperatures:</h3>
    <table border="1" style="border-collapse: collapse; width: 100%; max-width: 1200px; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 5px; text-align: left; width: 300px;">Name</th>
          <th>HD/HG</th>
          <th>D Peak (cm⁻¹)</th>
          <th>G Peak (cm⁻¹)</th>
          <th>D width ${dBandWidthHeight + "%H"}</th>
          <th>G width ${gBandWidthHeight + "%H"}</th>
          <th>WD/WG</th>
          <th>HD/HG Temp (°C)</th>
          <th>HD/HG Range (°C)</th>
          <th>D Width Temp (°C)</th>
          <th>D Width Range (°C)</th>
          <th>G Width Temp (°C)</th>
          <th>G Width Range (°C)</th>
          <th>WD/WG Temp (°C)</th>
          <th>WD/WG Range (°C)</th>
        </tr>
      </thead>
      <tbody>
        <!-- Rows will be added here -->
      </tbody>
    </table>
  `;

  const tbodyElement = tableContainer.querySelector('tbody');

  // Populate table rows
  allPeaks.forEach((file) => {
    const hdHg = file.hdHg != null ? file.hdHg.toFixed(2) : "N/A";
    const dWidth = file.dWidth != null ? parseFloat(file.dWidth).toFixed(0) : "N/A";
    const gWidth = file.gWidth != null ? parseFloat(file.gWidth).toFixed(0) : "N/A";
    const wdWg = file.wdWg != null ? file.wdWg.toFixed(2) : "N/A";
    const dPeak = file.dPeak != null ? parseFloat(file.dPeak).toFixed(0) : "N/A";
    const gPeak = file.gPeak != null ? parseFloat(file.gPeak).toFixed(0) : "N/A";

    // For each parameter, derive all possible temperatures and ranges
    const derivedTemps = paramList.map(param => {
      if (!stats || !stats[param] || file[param] == null) return { best: 'N/A', range: 'N/A' };
      const arr = stats[param];
      const temps = arr.map(pt => pt.x);
      const means = arr.map(pt => pt.y);
      const stds = arr.map(pt => pt.stdDev);
      const minY = Math.min(...arr.map(pt => pt.y - pt.stdDev));
      const maxY = Math.max(...arr.map(pt => pt.y + pt.stdDev));
      const isOutOfRange = file[param] < minY || file[param] > maxY;
      let closestTemp = null;
      if (isOutOfRange) {
        if (file[param] < minY) {
          closestTemp = temps[0];
        } else {
          closestTemp = temps[temps.length - 1];
        }
      }
      
      // Declare initialRanges once here, before it's used for 'best' and 'processedRangeStr'
      const initialRanges = findTemperatureRangesWithinSD(temps, means, stds, file[param]);

      const results = findTemperaturesForValue(temps, means, stds, file[param]);
      let best;

      if (results && results.length > 0) {
        best = results.map(r => {
          if (r.stdDev === 9999) { // Check for our placeholder
            return `${r.temperature.toFixed(0)} (Uncertain)`;
          } else {
            return `${r.temperature.toFixed(0)} ± ${r.stdDev.toFixed(0)}`;
          }
        }).join('; ');
      } else if (initialRanges && initialRanges.length > 0) { // Use initialRanges here
        best = initialRanges.map(r => { // And here
          const mid = (r.start + r.end) / 2;
          let sd = null;
          for (let i = 0; i < temps.length - 1; i++) {
            if (mid >= temps[i] && mid <= temps[i + 1]) {
              const t = (mid - temps[i]) / (temps[i + 1] - temps[i]);
              sd = stds[i] + t * (stds[i + 1] - stds[i]);
              break;
            }
          }
          return `${mid.toFixed(0)} ± ${sd != null ? sd.toFixed(0) : '?'} (in SD)`;
        }).join('; ');
      } else if (isOutOfRange) {
        best = `Out of range (closest: ${closestTemp.toFixed(0)}°C)`;
      } else {
        best = 'Out of range';
      }

      // Now, use initialRanges for processing the range string
      let processedRangeStr;
      let finalMergedRoundedRanges = []; // Initialize to empty

      if (initialRanges && initialRanges.length > 0) {
        // 1. Apply rounding to each range object
        let roundedRangeObjects = initialRanges.map(r => {
          return {
            start: Math.floor(r.start / 100) * 100,
            end: Math.ceil(r.end / 100) * 100
          };
        }).filter(r => r.end > r.start); // Ensure rounded range is still valid

        // 2. Merge these rounded range objects (IIFE will return [] if roundedRangeObjects is [])
        if (roundedRangeObjects.length > 0) { // Only merge if there's something to merge
            finalMergedRoundedRanges = (function mergeThese(arrToMerge) {
                if (!arrToMerge || arrToMerge.length === 0) return []; // Should not happen due to outer check, but good for safety
                // Sort by start time, then by end time for consistent merging
                arrToMerge.sort((a, b) => a.start - b.start || a.end - b.end);
                
                const merged = [];
                merged.push({ ...arrToMerge[0] });
                for (let i = 1; i < arrToMerge.length; i++) {
                    const current = arrToMerge[i];
                    const previous = merged[merged.length - 1];
                    // If current range starts at or before the previous one ends, they touch or overlap
                    if (current.start <= previous.end) {
                        previous.end = Math.max(previous.end, current.end); // Extend the previous range
                    } else {
                        merged.push({ ...current }); // Add as a new, distinct range
                    }
                }
                return merged;
            })(roundedRangeObjects);
        }
      }

      // 3. Convert to string or set "Out of range" message
      if (finalMergedRoundedRanges.length === 0) {
        // No valid ranges to show (either initially or after processing)
        if (isOutOfRange && closestTemp !== null) {
          processedRangeStr = `Out of range (closest: ${closestTemp.toFixed(0)}°C)`;
        } else {
          processedRangeStr = 'Out of range';
        }
      } else {
        processedRangeStr = finalMergedRoundedRanges.map(r => `${r.start.toFixed(0)}–${r.end.toFixed(0)}`).join('; ');
      }
      
      return { best, range: processedRangeStr };
    });

    tbodyElement.innerHTML += `
      <tr>
        <td title="${file.name}">${file.name}</td>
        <td>${hdHg}</td>
        <td>${dPeak}</td>
        <td>${gPeak}</td>
        <td>${dWidth}</td>
        <td>${gWidth}</td>
        <td>${wdWg}</td>
        <td>${derivedTemps[0].best}</td>
        <td>${derivedTemps[0].range}</td>
        <td>${derivedTemps[1].best}</td>
        <td>${derivedTemps[1].range}</td>
        <td>${derivedTemps[2].best}</td>
        <td>${derivedTemps[2].range}</td>
        <td>${derivedTemps[3].best}</td>
        <td>${derivedTemps[3].range}</td>
      </tr>
    `;
  });
  
  // Append the table container
  tableDiv.appendChild(tableContainer);
}

function updatePeak1Inputs() { // Rewritten to ONLY set UI defaults. No parameters.
  const analysisMethod = document.getElementById("analysisMethod").value;
  const peak1ModeInput = document.getElementById("peak1Mode"); // Get the select element

  const peak1StartInput = document.getElementById("peak1Start");
  const peak1EndInput = document.getElementById("peak1End");
  const peak2StartInput = document.getElementById("peak2Start");
  const peak2EndInput = document.getElementById("peak2End");
  const dBandWidthHeightInput = document.getElementById("dBandWidthHeight");
  const gBandWidthHeightInput = document.getElementById("gBandWidthHeight");

  console.log(`updatePeak1Inputs called. Method: ${analysisMethod}, Mode: ${peak1ModeInput.value}`);

  if (analysisMethod === "voigt" || analysisMethod === "voigt5d") {
      peak1ModeInput.value = "broad"; // Force mode to broad for Voigt methods

      // Apply broad D/G peak interval defaults
      peak1StartInput.value = 1300;
      peak1EndInput.value = 1450;
      peak2StartInput.value = 1585;
      peak2EndInput.value = 1620;

      // Apply 50% width/height defaults for Voigt methods
      dBandWidthHeightInput.value = 50;
      gBandWidthHeightInput.value = 50;
      console.log("Defaults applied for Voigt/Voigt5D method.");

  } else { // For "simple" method (or any other non-Voigt method)
      const currentPeak1Mode = peak1ModeInput.value; // Use the current mode for simple
      if (currentPeak1Mode === "broad") {
          peak1StartInput.value = 1300;
          peak1EndInput.value = 1450;
          peak2StartInput.value = 1585;
          peak2EndInput.value = 1620;
          console.log("D/G Interval defaults applied for Simple method, Broad mode.");
      } else if (currentPeak1Mode === "conventional") {
          peak1StartInput.value = 1349;
          peak1EndInput.value = 1352;
          peak2StartInput.value = 1590;
          peak2EndInput.value = 1610;
          console.log("D/G Interval defaults applied for Simple method, Conventional mode.");
      }
      // For "simple" method, D/G band width/height inputs are NOT changed by this function.
      // They retain their user-edited values or previously set values.
      console.log("Width/Height inputs untouched for Simple method by updatePeak1Inputs.");
  }
  // This function no longer calls saveAppState() or updateDisplayedFile().
  // The caller is responsible for that if needed (e.g., after initial load or restore defaults).
}

function updatePlot(spectrumData) {
  if (!spectrumData || allFilesData.length === 0) return;

  const currentMethodForDisplay = document.getElementById("analysisMethod").value;
  console.log(`DEBUG_UPDATEPLOT: currentMethodForDisplay at function start: ${currentMethodForDisplay}`);

  const intervals = [
    {
      start: parseFloat(document.getElementById("peak1Start").value),
      end: parseFloat(document.getElementById("peak1End").value),
    },
    {
      start: parseFloat(document.getElementById("peak2Start").value),
      end: parseFloat(document.getElementById("peak2End").value),
    },
  ];

  const dBandWidthHeight = parseFloat(
    document.getElementById("dBandWidthHeight").value,
  );
  const gBandWidthHeight = parseFloat(
    document.getElementById("gBandWidthHeight").value,
  );
  const widthPercentages = [dBandWidthHeight / 100, gBandWidthHeight / 100];

  const resultsByMethod = {
    simple: [],
    voigt: [],
    voigt5d: [], // Add new method here
  };

  let cachedTopPeaksForCurrentSpectrum = null;
  let cachedFittedCurvesForCurrentSpectrum = null;

  allFilesData.forEach((fileData) => {
    const methodsToFullyProcess = ["simple", "voigt"];
    if (currentMethodForDisplay === "voigt5d") {
        methodsToFullyProcess.push("voigt5d");
    }

    ["simple", "voigt", "voigt5d"].forEach((methodName) => {
      const callContextId = methodName + "_stats_context"; // Create a distinct context ID

      let shouldFullyProcessThisStat;
      if (methodName === "voigt5d") {
        // For Voigt (5D) stats, only process if it's the current method AND button was pressed
        shouldFullyProcessThisStat = (currentMethodForDisplay === "voigt5d" && window.isVoigt5DTriggeredByButton);
      } else {
        // For simple and voigt, process them (they are always in methodsToFullyProcess if they are the current method or implicitly needed)
        shouldFullyProcessThisStat = methodsToFullyProcess.includes(methodName); // This remains as is, simple/voigt run if in the list
      }

      if (shouldFullyProcessThisStat) {
        const divisionPoint = getDivisionPoint(
          fileData.spectrumData.wavelengths,
          fileData.spectrumData.intensities,
          intervals, // These are UI intervals
          methodName
        );

        let plotIntervalsForStats;
        if (methodName === "voigt" || methodName === "voigt5d") {
          plotIntervalsForStats = [
            { start: 1150, end: divisionPoint },
            { start: divisionPoint, end: 1700 }
          ];
        } else {
          plotIntervalsForStats = intervals; // Use UI intervals for simple
        }

        const { topPeaks, fittedCurves } = findTopPeaks(
          fileData.spectrumData.wavelengths,
          fileData.spectrumData.intensities,
          plotIntervalsForStats,
          widthPercentages,
          methodName,
          callContextId // Pass distinct context ID
        );

        // Cache results if it's the current spectrum and current method
        if (fileData.spectrumData === spectrumData && methodName === currentMethodForDisplay) {
          cachedTopPeaksForCurrentSpectrum = topPeaks;
          cachedFittedCurvesForCurrentSpectrum = fittedCurves;
        }

        const d = topPeaks[0] || {};
        const g = topPeaks[1] || {};
        const hdHg = d.height && g.height && g.height !== 0 ? d.height / g.height : null;
        const wdWg = d.width && g.width && g.width !== 0 ? d.width / g.width : null;
        const match = fileData.name.match(/(^|[^0-9])\d{3,4}(?![0-9])/);
        const temperature = match ? `${match[0].replace(/[^0-9]/g, "")}` : "N/A";

        resultsByMethod[methodName].push({
          name: fileData.name,
          temperature,
          hdHg,
          dHeight: d.height || null,
          gHeight: g.height || null,
          dWidth: d.width || null,
          gWidth: g.width || null,
          wdWg,
          dPeakWavelength: d.wavelength || null,
          gPeakWavelength: g.wavelength || null
        });
      } else {
        // This case applies to "voigt5d" when it's not the currentMethodForDisplay.
        // Populate with placeholder data.
        const match = fileData.name.match(/(^|[^0-9])\d{3,4}(?![0-9])/);
        const temperature = match ? `${match[0].replace(/[^0-9]/g, "")}` : "N/A";
        resultsByMethod[methodName].push({ // methodName here will be "voigt5d"
          name: fileData.name,
          temperature,
          hdHg: null, dHeight: null, gHeight: null, dWidth: null, gWidth: null, wdWg: null,
          dPeakWavelength: null, gPeakWavelength: null
        });
      }
    });
  });

  // Calculate divisionPoint for the current spectrum being displayed
  const divisionPoint = getDivisionPoint(
    spectrumData.wavelengths,
    spectrumData.intensities,
    intervals,
    currentMethodForDisplay
  );

  // Use broad intervals only for Voigt, otherwise use user intervals
  let plotIntervals;
  if (currentMethodForDisplay === "voigt" || currentMethodForDisplay === "voigt5d") {
    plotIntervals = [
      { start: 1150, end: divisionPoint },
      { start: divisionPoint, end: 1700 }
    ];
  } else {
    plotIntervals = intervals;
  }

  let topPeaks, fittedCurves; // Declare variables
  if (cachedTopPeaksForCurrentSpectrum && cachedFittedCurvesForCurrentSpectrum && currentMethodForDisplay !== "simple") {
    // Use cached results if available
    console.log("DEBUG_UPDATEPLOT: Using cached Voigt/Voigt5D results for main spectrumChart plot.");
    topPeaks = cachedTopPeaksForCurrentSpectrum;
    fittedCurves = cachedFittedCurvesForCurrentSpectrum;
  } else {
    // Otherwise, calculate fresh 
    console.log("DEBUG_UPDATEPLOT: Calculating fresh results for main spectrumChart plot. (ELSE BLOCK ENTERED)"); 
    const analysisResult = findTopPeaks(  // Restoring this call
      spectrumData.wavelengths,
      spectrumData.intensities,
      plotIntervals,
      widthPercentages,
      currentMethodForDisplay,
      "spectrumChart"
    );
    topPeaks = analysisResult.topPeaks; // Restoring this assignment
    fittedCurves = analysisResult.fittedCurves; // Restoring this assignment
    // console.log("DEBUG_UPDATEPLOT: findTopPeaks for spectrumChart in ELSE block was COMMENTED OUT."); // Removing this debug log
  }

  plotSpectrum(
    spectrumData,
    topPeaks,
    fittedCurves,
    intervals,
    widthPercentages,
    currentMethodForDisplay,
  );

  // Display normal peak info table
  displayPeakInfo(
    resultsByMethod[currentMethodForDisplay],
    currentMethodForDisplay,
    dBandWidthHeight,
    gBandWidthHeight,
    resultsByMethod
  );

  // Compare results from both methods
  compareMethods(resultsByMethod.simple, resultsByMethod.voigt);

  // Ensure resultsByMethod.voigt5d is at least an empty array if not processed
  if (!resultsByMethod.voigt5d) {
      resultsByMethod.voigt5d = [];
  }

  // Store these for the new button to use
  window.latestResultsByMethod = resultsByMethod;
  window.latestCurrentMethod = currentMethodForDisplay;
  window.latestDBandWidthHeight = dBandWidthHeight;
  window.latestGBandWidthHeight = gBandWidthHeight;
}

function parseSpectrumData(text) {
  const lines = text.split("\n");
  const wavelengths = [];
  const intensities = [];

  lines.forEach((line) => {
    const [wavelength, intensity] = line.trim().split("\t").map(Number);
    if (!isNaN(wavelength) && !isNaN(intensity)) {
      wavelengths.push(wavelength);
      intensities.push(intensity);
    }
  });

  console.log("Parsed wavelengths (first 5):", wavelengths.slice(0, 5));
  console.log("Parsed intensities (first 5):", intensities.slice(0, 5));

  return { wavelengths, intensities };
}

function plotSpectrum(
  spectrumData,
  topPeaks,
  fittedCurves,
  intervals,
  widthPercentages,
  method,
  canvasId = "spectrumChart",
) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (!window.myCharts) window.myCharts = {};
  if (window.myCharts[canvasId]) {
    window.myCharts[canvasId].destroy();
  }

  const showSmoothing = document.getElementById(canvasId === "archaeoSpectrumChart" ? "archaeoShowSmoothing" : "showSmoothing")?.checked ?? true;
  const showFitting = document.getElementById(canvasId === "archaeoSpectrumChart" ? "archaeoShowFitting" : "showFitting")?.checked ?? true;

  let effectiveTopPeaks = topPeaks;
  if (method === "voigt5d" && !window.isVoigt5DTriggeredByButton && canvasId === "spectrumChart") {
    console.log("plotSpectrum (Experimental): Voigt (5D) selected, button not pressed. Clearing topPeaks for annotation purposes.");
    effectiveTopPeaks = [];
  }

  const datasets = [
    {
      label: "Spectrum",
      data: spectrumData.wavelengths.map((x, i) => ({
        x,
        y: spectrumData.intensities[i],
      })),
      borderColor: "blue",
      borderWidth: 0.5,
      pointRadius: 0,
      showLine: true,
      tension: 0,
    },
  ];

  // Updated condition to draw fitted curves for Voigt OR Voigt5D
  if (showFitting && (method === "voigt" || method === "voigt5d") && fittedCurves && fittedCurves.length > 0) {
    const colors = ["red", "purple", "orange", "cyan", "magenta", "lime", "brown", "black"]; 
    
    fittedCurves.forEach((curve, index) => {
      let borderColor = colors[index % colors.length]; 
      let curveLabel = curve.label || `Fit ${index + 1}`; 
      let curveOrder = 2; 
      let curveWidth = 1.5; 

      if (method === "voigt") {
        // Specific styling for the standard 2-peak Voigt fit
        borderColor = index === 0 ? "red" : "green"; 
        curveLabel = curve.label || `Fitted ${index === 0 ? 'D' : 'G'}`; 
        curveWidth = 2;
        curveOrder = 1; 
      } else if (method === "voigt5d") {
        // Specific styling for Voigt (5D)
        if (curve.type === "total-fit-sum") { // Style the new Total Fit Sum
          borderColor = "firebrick"; 
          curveOrder = 0;    // Draw on top
          curveWidth = 2.5;  // Bold line
        } else if (curve.type === "g-peak-individual") { // Style the individual G peak (now thinner)
          borderColor = "green"; 
          curveOrder = 1;     // Draw below sum but above D-subpeaks
          curveWidth = 1.5;   // Thinner line
        } else if (curve.type && curve.type.startsWith("d-subpeak-")) { // Style D1, D2, D3, D4, D5
          const subPeakColors = ["purple", "orange", "teal", "magenta", "olive"];
          let colorIndex = index; // Fallback
          if (curve.type.includes("D1")) colorIndex = 0;
          else if (curve.type.includes("D2")) colorIndex = 1;
          else if (curve.type.includes("D3")) colorIndex = 2;
          else if (curve.type.includes("D4")) colorIndex = 3;
          else if (curve.type.includes("D5")) colorIndex = 4;
          
          borderColor = subPeakColors[colorIndex % subPeakColors.length]; 
          curveWidth = 1; // Thin lines for D sub-peaks
          curveOrder = 2; // Draw D sub-peaks below G and Sum
        } else {
          // Fallback for any other unexpected curve type in voigt5d
          borderColor = colors[index % colors.length]; // Default color cycling
          curveWidth = 1; // Default thin line
          curveOrder = 3; // Draw further below
        }
      }
      
      datasets.push({
        label: curveLabel,
        data: curve.x.map((xVal, i) => ({ x: xVal, y: curve.y[i] })),
        borderColor: borderColor,
        borderWidth: curveWidth,
        pointRadius: 0,
        showLine: true,
        tension: 0, 
        order: curveOrder, 
      });
    });
  }

  // Updated condition for smoothing display
  if (showSmoothing && (method === "voigt" || method === "voigt5d")) {
    const smoothed = savitzkyGolaySmooth(spectrumData.intensities, 11, 2);
    datasets.push({
      label: "Smoothed (SG)",
      data: spectrumData.wavelengths.map((x, i) => ({
        x,
        y: smoothed[i],
      })),
      borderColor: "rgba(0,0,0,0.6)", // Semi-transparent black for smoothed
      borderWidth: 1.5,
      pointRadius: 0,
      showLine: true,
      tension: 0, // Smoothed data itself, so no line tension
      fill: false,
      order: 3, // Draw smoothed line behind fitted peaks but above raw data
    });
  }

  const annotations = {
    baseline: {
      type: "line",
      yMin: 0,
      yMax: 0,
      borderColor: "black",
      borderWidth: 1,
      borderDash: [5, 5],
    },
  };

  // Use effectiveTopPeaks for drawing annotations
  effectiveTopPeaks.forEach((peak, index) => {
    annotations[`peakLine${index}`] = {
      type: "line",
      xMin: peak.wavelength,
      xMax: peak.wavelength,
      yMin: 0,
      yMax: peak.intensity,
      borderColor: index === 0 ? "red" : "green",
      borderWidth: 1,
    };
    if (peak.widthLeftX && peak.widthRightX) {
      annotations[`widthLine${index}`] = {
        type: "line",
        xMin: peak.widthLeftX,
        xMax: peak.widthRightX,
        yMin: peak.widthHeight,
        yMax: peak.widthHeight,
        borderColor: index === 0 ? "red" : "green",
        borderWidth: 1,
      };
      // Add width label annotation
      annotations[`widthLabel${index}`] = {
        type: "label",
        xValue: (peak.widthLeftX + peak.widthRightX) / 2,
        yValue: peak.widthHeight,
        backgroundColor: "rgba(255,255,255,0.8)",
        borderColor: index === 0 ? "red" : "green",
        borderWidth: 0,
        color: index === 0 ? "red" : "green",
        font: {
          size: 13,
          weight: "bold"
        },
        content: [
          `${index === 0 ? "D" : "G"} width: ${(parseFloat(peak.width).toFixed(0))}` // Changed from toFixed(1)
        ],
        xAdjust: 0,
        yAdjust: 18,
        textAlign: "center",
        display: true
      };
    }
    annotations[`peakLabel${index}`] = {
      type: "label",
      xValue: peak.wavelength,
      yValue: peak.intensity,
      backgroundColor: "rgba(255,255,255,0.8)",
      borderColor: index === 0 ? "red" : "green",
      borderWidth: 0,
      color: index === 0 ? "red" : "green",
      font: {
        size: 14,
        weight: "bold"
      },
      content: [
        `${index === 0 ? "D" : "G"}: ${parseFloat(peak.wavelength).toFixed(0)}` // Changed from toFixed(1)
      ],
      xAdjust: 0,
      yAdjust: -20,
      textAlign: "center",
      display: true
    };
  });

  window.myCharts[canvasId] = new Chart(ctx, {
    type: "scatter",
    data: { datasets },
    options: {
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: "Wavelength (cm⁻¹)" },
          min: 850,
          max: 2150,
        },
        y: {
          title: { display: true, text: "Intensity" },
          min: Math.min(...spectrumData.intensities) * 0.95,
          max: Math.max(...spectrumData.intensities) * 1.05,
        },
      },
      plugins: {
        legend: { display: true },
        tooltip: { mode: "nearest" },
        annotation: { annotations },
      },
    },
  });
}

function findTopPeaks(
  wavelengths,
  intensities,
  intervals,
  widthPercentages,
  method,
  canvasId = "spectrumChart"
) {
  console.log(`DEBUG_FINDTOPPEAKS: Entry. Method: '${method}', CanvasID: '${canvasId}'`); // Added this log
  let topPeaks = [];
  let fittedCurves = []; 

  if (method === "voigt5d") {
    console.log("findTopPeaks: Voigt (5D) method selected.");

    const smoothedIntensities = savitzkyGolaySmooth(intensities, 11, 2); // Smooth the intensities once

    const dComplexDataRegion = { start: 1100, end: 1680 }; 
    const gPeakDataRegion    = { start: 1500, end: 1750 }; 

    const dIndices = wavelengths.map((w, i) => i).filter(i => wavelengths[i] >= dComplexDataRegion.start && wavelengths[i] <= dComplexDataRegion.end);
    const xDataD = dIndices.map(i => wavelengths[i]);
    const yDataD = dIndices.map(i => smoothedIntensities[i]); // Use smoothed intensities for D-band data

    const gIndices = wavelengths.map((w, i) => i).filter(i => wavelengths[i] >= gPeakDataRegion.start && wavelengths[i] <= gPeakDataRegion.end);
    const xDataG = gIndices.map(i => wavelengths[i]);
    const yDataG = gIndices.map(i => smoothedIntensities[i]); // Use smoothed intensities for G-band data

    if (typeof fitDComplexAndGPeak_Voigt5D !== 'function') {
        console.error("CRITICAL: fitDComplexAndGPeak_Voigt5D function is not defined! Cannot perform Voigt (5D) fitting.");
        return { topPeaks: [], fittedCurves: [] };
    }

    const voigt5dResults = fitDComplexAndGPeak_Voigt5D(xDataD, yDataD, xDataG, yDataG, canvasId + "_voigt5d_context");

    fittedCurves = voigt5dResults.fittedCurves || []; 

    const peaksForTable = [];
    if (voigt5dResults.d1Peak) {
        peaksForTable.push(voigt5dResults.d1Peak);
    } else {
        console.warn("Voigt (5D) fitDComplexAndGPeak_Voigt5D did not return d1Peak.");
        peaksForTable.push({wavelength: null, intensity: null, height: null, width: null});
    }
    if (voigt5dResults.gPeak) {
        peaksForTable.push(voigt5dResults.gPeak);
    } else {
        console.warn("Voigt (5D) fitDComplexAndGPeak_Voigt5D did not return gPeak.");
        peaksForTable.push({wavelength: null, intensity: null, height: null, width: null});
    }
    topPeaks = peaksForTable;

    console.log(`Voigt (5D) processing complete. Fitted curves: ${fittedCurves.length}, Top peaks for table: ${topPeaks.length}`);

  } else if (method === "voigt") {
    let processedIntensities = savitzkyGolaySmooth(intensities, 11, 2);

    const divisionPoint = getDivisionPoint(
        wavelengths,
        processedIntensities, 
        intervals, 
        method 
    );

    const broadFittingIntervals = [
        { start: 1150, end: divisionPoint },
        { start: divisionPoint, end: 1700 }
    ];

    const peaksFromFit = broadFittingIntervals.map((fittingRegion, intervalIndex) => {
        const broadIndices = wavelengths
            .map((w, i) => ({ w, i }))
            .filter(({ w }) => w >= fittingRegion.start && w <= fittingRegion.end)
            .map(({ i }) => i);

        if (broadIndices.length === 0) {
            console.warn(`Voigt: No data points in broad fitting interval for peak ${intervalIndex === 0 ? 'D' : 'G'}: [${fittingRegion.start}, ${fittingRegion.end}]`);
            return null;
        }
        const xBroad = broadIndices.map(i => wavelengths[i]);
        const yBroad = broadIndices.map(i => processedIntensities[i]); 

        const fitResult = fitPseudoVoigt(xBroad, yBroad, intervalIndex, canvasId);

        const fullX = []; for (let x = 1000; x <= 1900; x += 1) fullX.push(x);
        const fittedCurveY = fullX.map((xVal) =>
            pseudoVoigt(xVal, fitResult.A, fitResult.mu, fitResult.sigma, fitResult.gamma, fitResult.eta)
        );
        fittedCurves.push({
            x: fullX,
            y: fittedCurveY,
            label: `Fitted ${intervalIndex === 0 ? 'D' : 'G'} (Voigt)`
        });

        return {
            wavelength: fitResult.mu,
            intensity: fitResult.A, 
            height: fitResult.A,     
            width: fitResult.rightX - fitResult.leftX, 
            widthLeftX: fitResult.leftX,
            widthRightX: fitResult.rightX,
            widthHeight: fitResult.A * widthPercentages[intervalIndex], 
        };
    });

    topPeaks = peaksFromFit.filter(peak => peak !== null);
    if (topPeaks.length < 2 && peaksFromFit.some(p => p === null)) {
        console.warn("Voigt: Could not fit one or both D/G peaks.");
    }

  } else { 
    const simplePeaks = intervals.map((interval, intervalIndex) => {
        const filteredIndices = wavelengths
            .map((wavelength, index) => ({ wavelength, index }))
            .filter(point => point.wavelength >= interval.start && point.wavelength <= interval.end)
            .map(point => point.index);

        if (filteredIndices.length === 0) {
            console.warn(`Simple: No data points in user interval for peak ${intervalIndex === 0 ? 'D' : 'G'}: [${interval.start}, ${interval.end}]`);
            return null;
        }

        const peakPoint = filteredIndices.reduce((maxIdx, currentIdx) =>
            intensities[currentIdx] > intensities[maxIdx] ? currentIdx : maxIdx,
            filteredIndices[0]
        );

        return {
            wavelength: wavelengths[peakPoint],
            intensity: intensities[peakPoint], 
        };
    });

    topPeaks = simplePeaks.filter(peak => peak !== null).map((peak, index) => {
        if (!peak) return null; 
        const percentage = widthPercentages[index];
        const widthData = calculatePeakWidth(
            wavelengths,
            intensities,
            peak.wavelength,
            peak.intensity,
            percentage,
            index
        );
        return {
            wavelength: peak.wavelength,
            intensity: peak.intensity,
            height: peak.intensity, 
            width: widthData ? widthData.width : null,
            widthLeftX: widthData ? widthData.leftX : null,
            widthRightX: widthData ? widthData.rightX : null,
            widthHeight: widthData ? widthData.targetHeight : null,
        };
    }).filter(p => p !== null);
     if (topPeaks.length < 2 && simplePeaks.some(p => p === null)) {
        console.warn("Simple: Could not find one or both D/G peaks in user intervals.");
    }
  }

  return { topPeaks, fittedCurves };
}

function calculatePeakWidth(
  wavelengths,
  intensities,
  peakWavelength,
  peakIntensity,
  percentage,
  peakIndex,
) {
  const targetHeight = peakIntensity * percentage;
  let leftIndex = wavelengths.findIndex((w) => w >= peakWavelength);
  let rightIndex = leftIndex;

  while (leftIndex > 0 && intensities[leftIndex] > targetHeight) {
    leftIndex--;
  }
  while (
    rightIndex < intensities.length - 1 &&
    intensities[rightIndex] > targetHeight
  ) {
    rightIndex++;
  }

  const leftX = wavelengths[leftIndex];
  const rightX = wavelengths[rightIndex];
  const width = rightX - leftX;

  return { width, leftX, rightX, targetHeight };
}

function savitzkyGolaySmooth(data, windowSize, polynomialOrder) {
  if (windowSize % 2 === 0 || windowSize < 3) {
    throw new Error("Window size must be an odd number >= 3");
  }
  if (polynomialOrder >= windowSize) {
    throw new Error("Polynomial order must be less than window size");
  }

  const halfWindow = Math.floor(windowSize / 2);
  const smoothed = new Array(data.length);
  const coeffs = computeSavitzkyGolayCoefficients(windowSize, polynomialOrder);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < data.length) {
        sum += data[idx] * coeffs[j + halfWindow];
      }
    }
    smoothed[i] = sum;
  }

  return smoothed;
}

function computeSavitzkyGolayCoefficients(windowSize, polynomialOrder) {
  const halfWindow = Math.floor(windowSize / 2);
  const coeffs = new Array(windowSize);

  const X = [];
  for (let i = -halfWindow; i <= halfWindow; i++) {
    const row = [];
    for (let j = 0; j <= polynomialOrder; j++) {
      row.push(Math.pow(i, j));
    }
    X.push(row);
  }

  const XT = transpose(X);
  const XTX = matrixMultiply(XT, X);
  const XTX_inv = matrixInverse(XTX);
  const XTX_inv_XT = matrixMultiply(XTX_inv, XT);

  const smoothingCoeffs = XTX_inv_XT[0];
  for (let i = 0; i < windowSize; i++) {
    coeffs[i] = smoothingCoeffs[i];
  }

  return coeffs;
}

function transpose(matrix) {
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

function matrixMultiply(A, B) {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result = Array(rowsA)
    .fill()
    .map(() => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return result;
}

function matrixInverse(matrix) {
  if (matrix.length !== 3 || matrix[0].length !== 3) {
    throw new Error("Matrix inverse implemented only for 3x3 matrices");
  }

  const a = matrix[0][0],
    b = matrix[0][1],
    c = matrix[0][2];
  const d = matrix[1][0],
    e = matrix[1][1],
    f = matrix[1][2];
  const g = matrix[2][0],
    h = matrix[2][1],
    i = matrix[2][2];

  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (det === 0) throw new Error("Matrix is not invertible");

  const invDet = 1 / det;

  return [
    [
      (e * i - f * h) * invDet,
      (c * h - b * i) * invDet,
      (b * f - c * e) * invDet,
    ],
    [
      (f * g - d * i) * invDet,
      (a * i - c * g) * invDet,
      (c * d - a * f) * invDet,
    ],
    [
      (d * h - e * g) * invDet,
      (b * g - a * h) * invDet,
      (a * e - b * d) * invDet,
    ],
  ];
}

function pseudoVoigt(x, A, mu, sigma, gamma, eta) {
  const gaussian =
    A * Math.exp(-Math.pow(x - mu, 2) / (2 * Math.pow(sigma, 2)));
  const lorentzian =
    A * (Math.pow(gamma, 2) / (Math.pow(x - mu, 2) + Math.pow(gamma, 2)));
  return eta * lorentzian + (1 - eta) * gaussian;
}

function fitPseudoVoigt(xData, yData, peakIndex, canvasId = "spectrumChart") {
  // Smooth the data before estimating the peak center
  const smoothedY = savitzkyGolaySmooth(yData, 11, 2);

  // Find max in smoothed data
  let maxY = Math.max(...smoothedY);
  let maxYIndex = smoothedY.indexOf(maxY);
  let muGuess = xData[maxYIndex];
  const AGuess = maxY;

  // Also find max in raw data
  let rawMaxY = Math.max(...yData);
  let rawMaxYIndex = yData.indexOf(rawMaxY);
  let rawMuGuess = xData[rawMaxYIndex];

  // Log fitting interval and peak info
  console.log(`--- Voigt Fit Debug (Peak ${peakIndex === 0 ? "D" : "G"}) ---`);
  console.log(`Fitting interval: [${Math.min(...xData)}, ${Math.max(...xData)}]`);
  console.log(`Smoothed max: y=${maxY} at x=${muGuess}`);
  console.log(`Raw max: y=${rawMaxY} at x=${rawMuGuess}`);

  // Adjust initial guesses based on peak type
  const expectedWidth = peakIndex === 0 ? 300 : 200; // D peak typically wider than G peak
  const sigmaGuess = expectedWidth / (2 * Math.sqrt(2 * Math.log(2)));
  const gammaGuess = expectedWidth / 2;
  let etaGuess = 0.7; // Default eta

  /* if (peakIndex === 1) { // G-peak
    etaGuess = 0.4; // Lower eta for a more Gaussian initial shape for the G-peak
  } */

  let params = [AGuess, muGuess, sigmaGuess, gammaGuess, etaGuess];
  const stepSizes = [
    AGuess * 0.1,
    1.0,
    sigmaGuess * 0.2,
    gammaGuess * 0.2,
    0.1,
  ];
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let iter = 0; iter < maxIterations; iter++) {
    let bestError = Infinity;
    let bestParams = [...params];

    for (let i = 0; i < params.length; i++) {
      for (let delta of [-stepSizes[i], 0, stepSizes[i]]) {
        const testParams = [...params];
        testParams[i] += delta;

        // Clamp eta between 0.2–0.9
        if (i === 4) {
          testParams[4] = Math.max(0.2, Math.min(0.9, testParams[4]));
        }

        let error = 0;
        for (let j = 0; j < xData.length; j++) {
          const yFit = pseudoVoigt(xData[j], ...testParams);
          error += Math.pow(yFit - yData[j], 2);
        }

        if (error < bestError) {
          bestError = error;
          bestParams = testParams;
        }
      }
    }

    const change = params.reduce(
      (sum, p, idx) => sum + Math.abs(bestParams[idx] - p),
      0,
    );
    params = bestParams;
    stepSizes.forEach((_, idx) => (stepSizes[idx] *= 0.9));

    if (change < tolerance) break;
  }

  let [A, mu, sigma, gamma, eta] = params;
  let fwhm = approximateVoigtFWHM(sigma, gamma, eta);

  // Calculate custom width at targetHeight - Use experimental tab inputs
  const percentage = peakIndex === 0
    ? parseFloat(document.getElementById("dBandWidthHeight").value) / 100
    : parseFloat(document.getElementById("gBandWidthHeight").value) / 100;

  const targetHeight = A * percentage;
  
  // Increase search range for D peak to ensure we find the full width
  const searchRange = peakIndex === 0 ? 600 : 400; // Wider search for D peak
  const { xLeft, xRight } = findWidthAtHeightVoigt(
    [A, mu, sigma, gamma, eta],
    targetHeight,
    searchRange,
    0.5
  );
  
  // If we couldn't find the width points, use FWHM as fallback
  const leftX = xLeft ?? mu - fwhm / 2;
  const rightX = xRight ?? mu + fwhm / 2;
  fwhm = rightX - leftX;

  console.log(`Final fitted mu: ${mu}`);
  console.log(`Width parameters - sigma: ${sigma}, gamma: ${gamma}, eta: ${eta}`);
  console.log(`Calculated width: ${fwhm}`);

  return { A, mu, sigma, gamma, eta, fwhm, leftX, rightX };
}

function approximateVoigtFWHM(sigma, gamma, eta) {
  const fwhmG = 2 * sigma * Math.sqrt(2 * Math.log(2));
  const fwhmL = 2 * gamma;
  return eta * fwhmL + (1 - eta) * fwhmG;
}

function displayPeakInfo(allPeaks, method, dBandWidthHeight, gBandWidthHeight, resultsByMethod) {
  const peakInfoDiv = document.getElementById("peakInfo");
  if (!Array.isArray(allPeaks) || allPeaks.length === 0) {
    peakInfoDiv.innerHTML = "<h3>Top Peaks:</h3><p>No peak data available for this method.</p>";
    return;
  }

  // Get the list of sample names for the current view
  const sampleNames = allPeaks.map(file => file.name);

  // Initialize includedSamples if it's the first load for *these* samples
  if (peakInfoDiv.innerHTML.trim() === '' && includedSamples.size === 0 && sampleNames.length > 0) {
    sampleNames.forEach(name => includedSamples.add(name));
  }

  // Determine if all currently displayed samples are selected
  const areAllSelected = sampleNames.length > 0 && sampleNames.every(name => includedSamples.has(name));

  // Clear the container first
  peakInfoDiv.innerHTML = '';

  // Create table container HTML - Set header checkbox state here
  const tableContainer = document.createElement('div');
  tableContainer.innerHTML = `
    <h3>Top Peaks:</h3>
    <table class="peak-info-table" border="1">
      <thead>
        <tr>
          <th>
            <input type="checkbox" id="selectAllCheckbox" ${areAllSelected ? 'checked' : ''}>
          </th>
          <th title="Sample name/identifier">Name</th>
          <th title="Sample temperature in degrees Celsius">Temperature</th>
          <th title="Position of the D band peak in wavenumbers">D Peak (cm⁻¹)</th>
          <th title="Position of the G band peak in wavenumbers">G Peak (cm⁻¹)</th>
          <th title="Height of the D band peak">D Peak Height</th>
          <th title="Height of the G band peak">G Peak Height</th>
          <th title="Ratio of D band height to G band height">HD/HG</th>
          <th title="Width of D band peak at ${dBandWidthHeight}% of maximum height">D width ${dBandWidthHeight + "%H"}</th>
          <th title="Width of G band peak at ${gBandWidthHeight}% of maximum height">G width ${gBandWidthHeight + "%H"}</th>
          <th title="Ratio of D band width to G band width">WD/WG</th>
        </tr>
      </thead>
      <tbody>
        <!-- Rows will be added here -->
      </tbody>
    </table>
  `;

  const individualData = { hdHg: [], dWidth: [], gWidth: [], wdWg: [] };
  const tbodyElement = tableContainer.querySelector('tbody');

  // Populate table rows and gather data for plots
  allPeaks.forEach((file) => {
    const temp = file.temperature.replace(" °C", "");
    const hdHg = file.hdHg != null ? file.hdHg.toFixed(2) : "N/A";
    const dHeight = file.dHeight != null ? parseFloat(file.dHeight).toFixed(0) : "N/A";
    const gHeight = file.gHeight != null ? parseFloat(file.gHeight).toFixed(0) : "N/A";
    const dWidth = file.dWidth != null ? parseFloat(file.dWidth).toFixed(0) : "N/A";
    const gWidth = file.gWidth != null ? parseFloat(file.gWidth).toFixed(0) : "N/A";
    const wdWg = file.wdWg != null ? file.wdWg.toFixed(2) : "N/A";
    const isChecked = includedSamples.has(file.name);

    const dPeakWavelength = file.dPeakWavelength != null ? parseFloat(file.dPeakWavelength).toFixed(0) : "N/A";
    const gPeakWavelength = file.gPeakWavelength != null ? parseFloat(file.gPeakWavelength).toFixed(0) : "N/A";

    tbodyElement.innerHTML += `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" 
                 class="sample-checkbox" 
                 data-sample-name="${file.name}" 
                 ${isChecked ? 'checked' : ''}>
        </td>
        <td title="${file.name}">${file.name}</td>
        <td>${temp}</td>
        <td>${dPeakWavelength}</td>
        <td>${gPeakWavelength}</td>
        <td>${dHeight}</td>
        <td>${gHeight}</td>
        <td>${hdHg}</td>
        <td>${dWidth}</td>
        <td>${gWidth}</td>
        <td>${wdWg}</td>
      </tr>
    `;

    // Only include in statistics if sample is checked
    if (isChecked) {
      if (temp !== "N/A") {
        if (file.hdHg != null)
          individualData.hdHg.push({ name: file.name, temperature: temp, value: file.hdHg });
        // dHeight and gHeight are not typically plotted against temperature in the same way as ratios/widths
        // So, not adding them to individualData for plotting here, but they are in the table.
        if (file.dWidth != null)
          individualData.dWidth.push({ name: file.name, temperature: temp, value: file.dWidth });
        if (file.gWidth != null)
          individualData.gWidth.push({ name: file.name, temperature: temp, value: file.gWidth });
        if (file.wdWg != null)
          individualData.wdWg.push({ name: file.name, temperature: temp, value: file.wdWg });
      }
    }
  });
  
  // Append the table container to peakInfoDiv
  peakInfoDiv.appendChild(tableContainer);

  // Add event listeners after elements are in the DOM
  setTimeout(() => {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const sampleCheckboxes = document.querySelectorAll('.sample-checkbox');

    // Listener for "Select All" checkbox
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            const currentSampleNamesOnDisplay = allPeaks.map(file => file.name);
            if (isChecked) {
                currentSampleNamesOnDisplay.forEach(name => includedSamples.add(name));
            } else {
                currentSampleNamesOnDisplay.forEach(name => includedSamples.delete(name));
            }
            const plotsContainer = document.getElementById("experimentalStatsPlotsContainer");
            if (plotsContainer) plotsContainer.innerHTML = '';

            // Instead, re-render the peak info table directly
            if (window.latestResultsByMethod && window.latestCurrentMethod) {
                displayPeakInfo(window.latestResultsByMethod[window.latestCurrentMethod], window.latestCurrentMethod, window.latestDBandWidthHeight, window.latestGBandWidthHeight, window.latestResultsByMethod);
            }

            if (document.getElementById("archaeologicalSection").style.display !== "none") {
                updateArchaeoPlot();
            }
            saveAppState(); 
        });
    }

    // Listeners for individual sample checkboxes
    sampleCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const sampleName = this.dataset.sampleName;
        if (this.checked) {
          includedSamples.add(sampleName);
        } else {
          includedSamples.delete(sampleName);
        }
        const plotsContainer = document.getElementById("experimentalStatsPlotsContainer");
        if (plotsContainer) plotsContainer.innerHTML = '';

        // Instead, re-render the peak info table directly
        if (window.latestResultsByMethod && window.latestCurrentMethod) {
            displayPeakInfo(window.latestResultsByMethod[window.latestCurrentMethod], window.latestCurrentMethod, window.latestDBandWidthHeight, window.latestGBandWidthHeight, window.latestResultsByMethod);
        }

        if (document.getElementById("archaeologicalSection").style.display !== "none") {
            updateArchaeoPlot();
        }
        saveAppState(); // Save state
      });
    });
  }, 0);
}

function compareMethods(simpleData, voigtData) {
  const outputDiv = document.getElementById("methodComparisonResults");
  if (!outputDiv) return;

  const parameters = ["hdHg", "dWidth", "gWidth", "wdWg"];
  const rows = [];

  parameters.forEach((param) => {
    const paired = [];

    simpleData.forEach((simple) => {
      const match = voigtData.find((v) => v.name === simple.name);
      if (!match || simple[param] == null || match[param] == null) return;

      paired.push({
        simple: simple[param],
        voigt: match[param],
        diff: match[param] - simple[param],
      });
    });

    const n = paired.length;
    const diffs = paired.map((p) => p.diff);
    const meanSimple = average(paired.map((p) => p.simple));
    const meanVoigt = average(paired.map((p) => p.voigt));
    const meanDiff = average(diffs);
    const stdDev = standardDeviation(diffs, meanDiff);
    const stdError = stdDev / Math.sqrt(n);
    const tStat = meanDiff / stdError;
    const pValue = 2 * (1 - tDistApproxCDF(Math.abs(tStat), n - 1));
    const significant = pValue < 0.05 ? "✅ Yes" : "❌ No";

    rows.push({
      param,
      meanSimple: meanSimple.toFixed(3),
      meanVoigt: meanVoigt.toFixed(3),
      meanDiff: meanDiff.toFixed(3),
      stdDev: stdDev.toFixed(3),
      stdError: stdError.toFixed(3),
      tStat: tStat.toFixed(2),
      pValue: pValue.toExponential(2),
      significant,
    });
  });

  let html = `
    <h3>📊 Method Comparison: Simple vs. Voigt</h3>
    <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th title="The parameter being compared between methods">Parameter</th>
          <th title="Mean value using the Simple method">Mean (Simple)</th>
          <th title="Mean value using the Voigt method">Mean (Voigt)</th>
          <th title="Mean difference between Voigt and Simple methods">Mean Δ</th>
          <th title="Standard deviation of the differences">ST.DEV Δ</th>
          <th title="Standard error of the mean difference">ST.ERROR Δ</th>
          <th title="T-statistic for testing if the difference is significantly different from zero">t-stat</th>
          <th title="P-value for the t-test (values < 0.05 indicate significant difference)">p-value</th>
          <th title="Whether the difference between methods is statistically significant (p < 0.05)">Significant?</th>
        </tr>
      </thead>
      <tbody>
  `;
  rows.forEach((r) => {
    html += `
      <tr>
        <td>${r.param}</td>
        <td>${r.meanSimple}</td>
        <td>${r.meanVoigt}</td>
        <td>${r.meanDiff}</td>
        <td>${r.stdDev}</td>
        <td>${r.stdError}</td>
        <td>${r.tStat}</td>
        <td>${r.pValue}</td>
        <td>${r.significant}</td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  outputDiv.innerHTML = html;
}

function average(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values, mean) {
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Approximate CDF for Student's t-distribution (for p-value estimation)
function tDistApproxCDF(t, df) {
  // Use a rough approximation from Abramowitz & Stegun (good for moderate df)
  const x = df / (t * t + df);
  const a = 0.5;
  const b = df / 2;
  return 1 - 0.5 * Math.pow(x, b); // Two-tailed
}

function findWidthAtHeightVoigt(params, targetHeight, searchRange = 100, step = 0.5) {
  const [A, mu, sigma, gamma, eta] = params;

  let xLeft = null;
  let xRight = null;

  // Search left of mu
  for (let x = mu; x >= mu - searchRange; x -= step) {
    const y = pseudoVoigt(x, A, mu, sigma, gamma, eta);
    if (y <= targetHeight) {
      // Use linear interpolation for more accurate width point
      const x1 = x;
      const x2 = x + step;
      const y1 = y;
      const y2 = pseudoVoigt(x2, A, mu, sigma, gamma, eta);
      xLeft = x1 + (targetHeight - y1) * (x2 - x1) / (y2 - y1);
      break;
    }
  }

  // Search right of mu
  for (let x = mu; x <= mu + searchRange; x += step) {
    const y = pseudoVoigt(x, A, mu, sigma, gamma, eta);
    if (y <= targetHeight) {
      // Use linear interpolation for more accurate width point
      const x1 = x - step;
      const x2 = x;
      const y1 = pseudoVoigt(x1, A, mu, sigma, gamma, eta);
      const y2 = y;
      xRight = x1 + (targetHeight - y1) * (x2 - x1) / (y2 - y1);
      break;
    }
  }

  return { xLeft, xRight };
}

function generateStatsPlot(data, method, otherMethodData, currentMethodName, otherMethodName) {
  if (!data || data.length === 0) return document.createElement('div');

  // Filter data to only include checked samples
  const filteredData = data.filter(point => includedSamples.has(point.name));
  const filteredOtherData = otherMethodData ? otherMethodData.filter(point => includedSamples.has(point.name)) : null;

  // Normalize temperature to number for both datasets
  filteredData.forEach(point => point.temperature = Number(point.temperature));
  if (filteredOtherData) {
    filteredOtherData.forEach(point => point.temperature = Number(point.temperature));
  }

  // Calculate means and standard deviations for current method
  const groupedData = {};
  filteredData.forEach(point => {
    if (!groupedData[point.temperature]) {
      groupedData[point.temperature] = [];
    }
    groupedData[point.temperature].push(point.value);
  });

  const means = Object.entries(groupedData).map(([temp, values]) => ({
    x: parseFloat(temp), // Temperature
    y: values.reduce((a, b) => a + b) / values.length // Mean parameter value
  }));

  const stdDevs = Object.entries(groupedData).map(([temp, values]) => {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squareDiffs.reduce((a, b) => a + b) / values.length;
    return {
      x: parseFloat(temp), 
      y: Math.sqrt(variance) // Standard deviation of the parameter
    };
  });

  // Sort data points by temperature
  means.sort((a, b) => a.x - b.x);
  stdDevs.sort((a, b) => a.x - b.x); 

  const segmentTempUncertainties = []; // Will store {temp: T, uncertainty: ΔT_value_or_string}
  const tempUncertaintyValues_currentMethod = []; // Will store numerical ΔT or null for charting

  if (means.length >= 1) {
    if (means.length >= 2) {
      for (let i = 0; i < means.length - 1; i++) {
        const T1 = means[i].x;
        const P_mean1 = means[i].y;
        const P_std1_obj = stdDevs.find(sd => sd.x === T1);
        const P_std1 = P_std1_obj ? P_std1_obj.y : 0;

        const T2 = means[i+1].x;
        const P_mean2 = means[i+1].y;
        const P_std2_obj = stdDevs.find(sd => sd.x === T2);
        const P_std2 = P_std2_obj ? P_std2_obj.y : 0;

        const delta_T_actual = T2 - T1;
        const delta_P_mean = P_mean2 - P_mean1;
        let local_delta_T_uncert;

        if (Math.abs(delta_T_actual) < 1e-6) {
          local_delta_T_uncert = "N/A (Identical Temps)";
        } else {
          const slope_m = delta_P_mean / delta_T_actual;
          const avg_P_std_segment = (P_std1 + P_std2) / 2;
          if (Math.abs(slope_m) < 1e-9) {
            local_delta_T_uncert = "High (Flat Segment)";
          } else {
            local_delta_T_uncert = Math.abs(avg_P_std_segment / slope_m);
          }
        }
        segmentTempUncertainties.push({ temp: T1, uncertainty: local_delta_T_uncert });
      }
    }

    const lastTempPoint = means[means.length - 1];
    let lastPointUncertaintyDisplay;
    let lastPointNumericalUncertainty = null;

    if (means.length < 2) {
      lastPointUncertaintyDisplay = "N/A (Single Point)";
    } else {
      const T_before_last = means[means.length - 2].x;
      const P_mean_before_last = means[means.length - 2].y;
      const T_last = lastTempPoint.x;
      const P_mean_last = lastTempPoint.y;
      const P_std_last_obj = stdDevs.find(sd => sd.x === T_last);
      const P_std_last = P_std_last_obj ? P_std_last_obj.y : 0;
      const delta_T_last_segment = T_last - T_before_last;
      const delta_P_last_segment = P_mean_last - P_mean_before_last;
      let calculatedUncertainty;

      if (Math.abs(delta_T_last_segment) < 1e-6) {
        calculatedUncertainty = "N/A (Prev. Temps Identical)";
      } else {
        const slope_m_last_segment = delta_P_last_segment / delta_T_last_segment;
        if (Math.abs(slope_m_last_segment) < 1e-9) {
          calculatedUncertainty = "High (Prev. Segment Flat)";
        } else {
          calculatedUncertainty = Math.abs(P_std_last / slope_m_last_segment);
        }
      }
      if (typeof calculatedUncertainty === 'number') {
        lastPointUncertaintyDisplay = `End: ${calculatedUncertainty.toFixed(0)}`;
        lastPointNumericalUncertainty = calculatedUncertainty;
      } else {
        lastPointUncertaintyDisplay = calculatedUncertainty;
      }
    }
    segmentTempUncertainties.push({ temp: lastTempPoint.x, uncertainty: lastPointUncertaintyDisplay });

    // Populate tempUncertaintyValues_currentMethod for charting
    // This array must align with the `means` array
    means.forEach(meanPoint => {
        const foundUncertainty = segmentTempUncertainties.find(u => u.temp === meanPoint.x);
        if (foundUncertainty) {
            if (typeof foundUncertainty.uncertainty === 'number') {
                tempUncertaintyValues_currentMethod.push(foundUncertainty.uncertainty);
            } else if (meanPoint.x === lastTempPoint.x && lastPointNumericalUncertainty !== null) {
                // Special case for the last point if its "End-Pt. Est:" was numerical
                tempUncertaintyValues_currentMethod.push(lastPointNumericalUncertainty);
            }
            else {
                tempUncertaintyValues_currentMethod.push(null); // No bar for "High", "N/A" etc.
            }
        } else {
            tempUncertaintyValues_currentMethod.push(null); // Should not happen if logic is correct
        }
    });
  }


  // Calculate means and standard deviations for other method if available
  let otherMethodStats = null;
  if (filteredOtherData && filteredOtherData.length > 0) {
    const groupedOtherData = {};
    filteredOtherData.forEach(point => {
      if (!groupedOtherData[point.temperature]) {
        groupedOtherData[point.temperature] = [];
      }
      groupedOtherData[point.temperature].push(point.value);
    });

    const otherMeans = Object.entries(groupedOtherData).map(([temp, values]) => ({
      x: parseFloat(temp),
      y: values.reduce((a, b) => a + b) / values.length
    }));

    const otherStdDevs = Object.entries(groupedOtherData).map(([temp, values]) => {
      const mean = values.reduce((a, b) => a + b) / values.length;
      const squareDiffs = values.map(value => Math.pow(value - mean, 2));
      const variance = squareDiffs.reduce((a, b) => a + b) / values.length;
      return {
        x: parseFloat(temp),
        y: Math.sqrt(variance)
      };
    });

    otherMethodStats = { means: otherMeans, stdDevs: otherStdDevs };
    // Sort other method data as well
    if (otherMethodStats) {
        otherMethodStats.means.sort((a, b) => a.x - b.x);
        otherMethodStats.stdDevs.sort((a, b) => a.x - b.x);
    }
  }


  // Create the plots container
  const plotsContainer = document.createElement('div');
  plotsContainer.style.cssText = 'margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px;';
  
  // Add title
  const titleElement = document.createElement('h3'); 
  titleElement.textContent = method; 
  plotsContainer.appendChild(titleElement);

  // Create flex container for plots
  const flexContainer = document.createElement('div');
  flexContainer.style.cssText = 'display: flex; gap: 40px; flex-wrap: wrap;';
  
  // Create table container
  const tableContainer = document.createElement('div');
  tableContainer.style.cssText = 'flex: 0 1 250px;'; 
  
  // Create and populate table
  const table = document.createElement('table');
  table.className = 'stats-parameter-table';
  
  // Add table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Temp (°C)</th>
      <th title="Average value for this parameter at this temperature">Avg</th>
      <th title="Standard deviation of measurements at this temperature">ST.DEV</th>
      <th title="Temperature uncertainty derived from calibration curve slope and parameter standard deviation">(ΔT °C)</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Add table body
  const tbody = document.createElement('tbody');
  means.forEach((point, index) => {
    const row = document.createElement('tr');
    const paramStdDevPoint = stdDevs.find(sd => sd.x === point.x);

    const isWidthMetric = method.includes("Width");
    const currentValPrecision = isWidthMetric ? 0 : (method.includes("Ratio") ? 2 : 3);
    const currentStdDevPrecision = isWidthMetric ? 0 : (method.includes("Ratio") ? 2 : 3);

    const avgFormatted = point.y.toFixed(currentValPrecision);
    const paramStdDev = paramStdDevPoint ? paramStdDevPoint.y.toFixed(currentStdDevPrecision) : "N/A";
    
    const tempUncertData = segmentTempUncertainties.find(u => u.temp === point.x);
    let tempUncertaintyDisplay = "N/A"; 
    if (tempUncertData) {
        if (typeof tempUncertData.uncertainty === 'number' && !(tempUncertData.uncertainty.toString().startsWith("End"))) { // Check it's not the pre-formatted string
             tempUncertaintyDisplay = tempUncertData.uncertainty.toFixed(0);
        } else {
            tempUncertaintyDisplay = tempUncertData.uncertainty;
        }
    }

    row.innerHTML = `
      <td style="text-align:center">${point.x}</td>
      <td style="text-align:center">${avgFormatted}</td>
      <td style="text-align:center">${paramStdDev}</td>
      <td style="text-align:center">${tempUncertaintyDisplay}</td>
    `;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  
  // Create charts container
  const chartsContainer = document.createElement('div');
  chartsContainer.style.cssText = 'flex: 1; min-width: 600px; display: flex; gap: 20px;';
  
  // Create individual data chart container
  const individualChartContainer = document.createElement('div');
  individualChartContainer.style.cssText = 'flex: 1;';
  const individualChartTitle = document.createElement('h4');
  individualChartTitle.style.cssText = 'text-align: center; margin: 0 0 10px 0';
  individualChartTitle.textContent = `${currentMethodName} Data & Averages`;
  const individualCanvas = document.createElement('canvas');
  individualCanvas.id = `${method.replace(/[^a-zA-Z0-9]/g, '')}_Chart`;
  individualCanvas.width = 620;
  individualCanvas.height = 400;
  individualCanvas.style.cssText = 'max-width: 620px; height: 400px;';
  individualChartContainer.appendChild(individualChartTitle);
  individualChartContainer.appendChild(individualCanvas);
  
  // Create comparison chart container
  const comparisonChartContainer = document.createElement('div');
  comparisonChartContainer.style.cssText = 'flex: 1;';
  const comparisonChartTitle = document.createElement('h4');
  comparisonChartTitle.style.cssText = 'text-align: center; margin: 0 0 10px 0';
  comparisonChartTitle.textContent = 'Method Comparison';
  const comparisonCanvas = document.createElement('canvas');
  comparisonCanvas.id = `${method.replace(/[^a-zA-Z0-9]/g, '')}_ComparisonChart`;
  comparisonCanvas.width = 620;
  comparisonCanvas.height = 400;
  comparisonCanvas.style.cssText = 'max-width: 620px; height: 400px;';
  comparisonChartContainer.appendChild(comparisonChartTitle);
  comparisonChartContainer.appendChild(comparisonCanvas);
  
  // Assemble the containers
  chartsContainer.appendChild(individualChartContainer);
  chartsContainer.appendChild(comparisonChartContainer);
  flexContainer.appendChild(tableContainer);
  flexContainer.appendChild(chartsContainer);
  plotsContainer.appendChild(flexContainer);

  // Create the charts after a short delay
  setTimeout(() => {
    const chartId = `${method.replace(/[^a-zA-Z0-9]/g, '')}_Chart`;
    const comparisonChartId = `${method.replace(/[^a-zA-Z0-9]/g, '')}_ComparisonChart`;

    const ctx = document.getElementById(chartId).getContext('2d');
    const ctxComparison = document.getElementById(comparisonChartId).getContext('2d');

    if (window.statsCharts[chartId]) window.statsCharts[chartId].destroy();
    if (window.statsCharts[comparisonChartId]) window.statsCharts[comparisonChartId].destroy();
    
    const paramErrorBarData_currentMethod = means.map(meanPoint => { // Renamed for clarity
        const stdDevPoint = stdDevs.find(sd => sd.x === meanPoint.x);
        return stdDevPoint ? stdDevPoint.y : 0;
    });

    let paramErrorBarData_otherMethod = null; // Renamed
    if (otherMethodStats && otherMethodStats.means.length > 0) {
        paramErrorBarData_otherMethod = otherMethodStats.means.map(meanPoint => {
            const stdDevPoint = otherMethodStats.stdDevs.find(sd => sd.x === meanPoint.x);
            return stdDevPoint ? stdDevPoint.y : 0;
        });
    }

    window.statsCharts[chartId] = new Chart(ctx, { // INDIVIDUAL PLOT
      type: 'scatter',
      data: {
        datasets: [
          { /* Individual points dataset ... */ 
            label: 'Individual',
            data: filteredData.map(point => ({ x: parseFloat(point.temperature), y: point.value })),
            backgroundColor: 'blue', pointRadius: 2, pointHoverRadius: 3, showLine: false,
          },
          {
            label: `${currentMethodName} Average ± SD / ± ΔT`,
            data: means, 
            borderColor: 'red', backgroundColor: 'red', pointRadius: 4, showLine: true, tension: 0.3,
            errorBars: {
              y: { // Vertical error bars for parameter SD
                array: paramErrorBarData_currentMethod, 
                color: 'rgba(255, 0, 0, 0.5)', // Color of y-error bar
                width: 2, // Thickness of y-error bar line
                lineWidth: 1 // Thickness of y-error bar cap line (if applicable)
              },
              x: { // Horizontal error bars for temperature uncertainty (ΔT)
                array: tempUncertaintyValues_currentMethod.map(val => val === null ? 0 : val), // Use 'array' for symmetric ΔT
                color: 'rgba(0, 100, 255, 0.6)', // Distinct color for x-error bar
                width: 2, // Thickness of x-error bar line
                lineWidth: 1 // Thickness of x-error bar cap line
              }
            }
          },
        ],
      },
      options: { /* ... existing options from your previous correct version ... */
        responsive: true,
        scales: {
          x: { type: 'linear', title: { display: true, text: 'Temperature (°C)' } },
          y: { type: 'linear', title: { display: true, text: 'Value' } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const isWidthMetric = method.toLowerCase().includes("width");
                const currentValPrecision = isWidthMetric ? 0 : (method.toLowerCase().includes("ratio") ? 2 : 3);
                const currentStdDevPrecision = isWidthMetric ? 0 : (method.toLowerCase().includes("ratio") ? 2 : 3);

                const dsLabel = context.dataset.label;
                const idx = context.dataIndex;
                if (dsLabel === `${currentMethodName} Average ± SD / ± ΔT`) {
                  const meanVal = means[idx] ? means[idx].y.toFixed(currentValPrecision) : 'N/A'; // Used currentValPrecision
                  const paramSD = paramErrorBarData_currentMethod[idx] ? paramErrorBarData_currentMethod[idx].toFixed(currentStdDevPrecision) : 'N/A'; // Used currentStdDevPrecision
                  const tempVal = means[idx] ? means[idx].x.toFixed(0) : 'N/A';
                  // For tooltip, directly use the numerical value if available, or lookup string
                  const numericalTempUncert = tempUncertaintyValues_currentMethod[idx]; // This is ΔT or null
                  
                  let tooltipText = [`Avg ${method}: ${meanVal} ± ${paramSD} (SD)`];

                  if (numericalTempUncert !== null) {
                      tooltipText.push(`Temp: ${tempVal} ± ${numericalTempUncert.toFixed(0)} (°C ΔT)`);
                  } else {
                      // Fallback to the string version if numerical was null (e.g. "High", "N/A")
                      const stringUncertData = segmentTempUncertainties.find(u => u.temp === parseFloat(tempVal));
                      if (stringUncertData && typeof stringUncertData.uncertainty === 'string') {
                          tooltipText.push(`Temp: ${tempVal} (${stringUncertData.uncertainty})`);
                      } else {
                          tooltipText.push(`Temp: ${tempVal}`);
                      }
                  }
                  return tooltipText;
                }
                const pointData = filteredData[idx];
                if (pointData) return `${pointData.name}: ${pointData.value.toFixed(currentValPrecision)}`; // Used currentValPrecision
                return `Value: ${context.parsed.y.toFixed(currentValPrecision)}`; // Used currentValPrecision
              }
            }
          }
        }
      },
    });

    if (otherMethodStats && otherMethodStats.means.length > 0 && paramErrorBarData_otherMethod) { // COMPARISON PLOT
      window.statsCharts[comparisonChartId] = new Chart(ctxComparison, {
        type: 'scatter',
        data: {
          datasets: [
            { /* Current method average dataset */
              label: `${currentMethodName} Average`, // Simpler label for comparison chart clarity
              data: means, borderColor: 'red', backgroundColor: 'red', pointRadius: 4, showLine: true, tension: 0.3,
              errorBars: {
                y: { 
                    array: paramErrorBarData_currentMethod, 
                    color: 'rgba(255, 0, 0, 0.5)', 
                    width: 2,
                    lineWidth: 1
                },
                x: { 
                    array: tempUncertaintyValues_currentMethod.map(val => val === null ? 0 : val), 
                    color: 'rgba(0, 100, 255, 0.6)', 
                    width: 2, 
                    lineWidth: 1
                }
              }
            },
            { /* Other method average dataset */
              label: `${otherMethodName} Average`,
              data: otherMethodStats.means, borderColor: 'green', backgroundColor: 'green', pointRadius: 4, showLine: true, tension: 0.3,
              errorBars: { 
                y: { 
                    array: paramErrorBarData_otherMethod, 
                    color: 'rgba(0, 128, 0, 0.5)', 
                    width: 2,
                    lineWidth: 1
                }
                // No x-error bars for the 'other' method in this iteration for simplicity
              }
            }
          ],
        },
        options: { /* ... existing options from your previous correct version ... */
            responsive: true,
            scales: {
              x: { type: 'linear', title: { display: true, text: 'Temperature (°C)' } },
              y: { type: 'linear', title: { display: true, text: 'Value' } },
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const isWidthMetric = method.toLowerCase().includes("width");
                    const currentValPrecision = isWidthMetric ? 0 : (method.toLowerCase().includes("ratio") ? 2 : 3);
                    const currentStdDevPrecision = isWidthMetric ? 0 : (method.toLowerCase().includes("ratio") ? 2 : 3);

                    const dsLabel = context.dataset.label;
                    const idx = context.dataIndex;
                    let meanValue, paramSD, tempVal, tempUncertVal, stringUncertData;

                    if (dsLabel.includes(currentMethodName)) { // Check if it's the current method's dataset
                      meanValue = means[idx] ? means[idx].y.toFixed(currentValPrecision) : 'N/A'; // Used currentValPrecision
                      paramSD = paramErrorBarData_currentMethod[idx] ? paramErrorBarData_currentMethod[idx].toFixed(currentStdDevPrecision) : 'N/A'; // Used currentStdDevPrecision
                      tempVal = means[idx] ? means[idx].x.toFixed(0) : 'N/A';
                      // For tooltip, directly use the numerical value if available for ΔT
                      const numericalTempUncert = tempUncertaintyValues_currentMethod[idx];
                      
                      let tooltipText = [`${currentMethodName} Avg: ${meanValue} ± ${paramSD} (SD)`]; // Clarify method name
                      if (numericalTempUncert !== null) {
                          tooltipText.push(`Temp: ${tempVal} ± ${numericalTempUncert.toFixed(0)} (°C ΔT)`);
                      } else {
                          const stringUncertLookup = segmentTempUncertainties.find(u => u.temp === parseFloat(tempVal));
                          if (stringUncertLookup && typeof stringUncertLookup.uncertainty === 'string') {
                              tooltipText.push(`Temp: ${tempVal} (${stringUncertLookup.uncertainty})`);
                          } else {
                             tooltipText.push(`Temp: ${tempVal}`);
                          }
                      }
                      return tooltipText;

                    } else if (dsLabel.includes(otherMethodName)) {
                      // For 'other' method, apply same precision logic based on the *current* plot's method title
                      meanValue = otherMethodStats.means[idx] ? otherMethodStats.means[idx].y.toFixed(currentValPrecision) : 'N/A'; // Used currentValPrecision
                      paramSD = paramErrorBarData_otherMethod[idx] ? paramErrorBarData_otherMethod[idx].toFixed(currentStdDevPrecision) : 'N/A'; // Used currentStdDevPrecision
                      tempVal = otherMethodStats.means[idx] ? otherMethodStats.means[idx].x.toFixed(0) : 'N/A';
                      return [`${otherMethodName} Avg: ${meanValue} ± ${paramSD} (SD)`, `Temp: ${tempVal}`];
                    }
                    // Fallback for any other dataset
                    const pointData = context.chart.data.datasets[context.datasetIndex].data[idx];
                    if(pointData && pointData.name) return `${pointData.name}: ${pointData.value.toFixed(currentValPrecision)}`; // Used currentValPrecision
                    return `Value: ${context.parsed.y.toFixed(currentValPrecision)}`; // Used currentValPrecision
                  }
                }
              }
            }
        },
      });
    }
  }, 100);

  return plotsContainer;
}

function getDivisionPoint(wavelengths, intensities, intervals, method) {
  // Find D and G peak centers in user intervals
  const processedIntensities = (method === "voigt" || method === "voigt5d") // Also smooth for voigt5d context here
    ? savitzkyGolaySmooth(intensities, 11, 2)
    : intensities;

  const approximatePeaks = intervals.map(({ start, end }) => {
    const filteredIndices = wavelengths
      .map((wavelength, index) => ({ wavelength, index }))
      .filter((point) => point.wavelength >= start && point.wavelength <= end)
      .map((point) => point.index);

    if (filteredIndices.length === 0) return null;

    const filteredPoints = filteredIndices.map((idx) => ({
      wavelength: wavelengths[idx],
      intensity: processedIntensities[idx],
    }));

    const peak = filteredPoints.reduce((max, point) =>
      point.intensity > max.intensity ? point : max,
    );
    return peak.wavelength;
  });

  let divisionPoint = 1500;
  if (
    approximatePeaks.length === 2 &&
    approximatePeaks[0] &&
    approximatePeaks[1]
  ) {
    const dPeakCenter = approximatePeaks[0];
    const gPeakCenter = approximatePeaks[1];

    if (dPeakCenter < gPeakCenter) {
      // Find valley between the two peaks
      const valleyIndices = wavelengths
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => w >= dPeakCenter && w <= gPeakCenter)
        .map(({ i }) => i);

      if (valleyIndices.length > 0) {
        let valleyIntensities;
        if (method === "voigt") {
          const smoothed = savitzkyGolaySmooth(intensities, 11, 2);
          valleyIntensities = valleyIndices.map(i => smoothed[i]);
        } else {
          valleyIntensities = valleyIndices.map(i => intensities[i]);
        }
        const minIndex =
          valleyIndices[
            valleyIntensities.indexOf(Math.min(...valleyIntensities))
          ];
        divisionPoint = wavelengths[minIndex];

        // Prevent overlap: enforce margin from both peak centers
        const minDistance = 50;
        divisionPoint = Math.max(
          dPeakCenter + minDistance,
          Math.min(divisionPoint, gPeakCenter - minDistance),
        );
      }
    }
  }
  return divisionPoint;
}

function generateCalibrationCharts(selectedParameters) { // NEW SIGNATURE
  // if (!data || data.length === 0) return; // OLD CHECK - data is no longer a direct param

  if (!window.calibrationStats || Object.keys(window.calibrationStats).length === 0) {
      console.warn("generateCalibrationCharts: window.calibrationStats is not available or empty.");
      const container = document.getElementById('archaeoCalibrationPlots');
      if (container) container.innerHTML = '<p>Calibration statistics not available. Please process experimental data first.</p>';
      return;
  }
  // selectedParameters is already checked by the caller button's event listener

  const stats = window.calibrationStats; // Use global stats

  // Create container for all plots
  const container = document.getElementById('archaeoCalibrationPlots');
  if (!container) return;
  // container.innerHTML = ''; // Clearing is now done by the button click handler

  // Create a flex container for the grid layout with fixed height
  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; height: 850px;'; // Keep existing style
  container.appendChild(gridContainer);

  // Create individual chart containers
  // parameters.forEach((param, index) => { // OLD ITERATION
  selectedParameters.forEach(paramInfo => { // NEW ITERATION over selected params
    const param = paramInfo.id; // e.g., 'hdHg'
    const paramLabel = paramInfo.label; // e.g., 'HD/HG Ratio'

    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = 'flex: 0 1 calc(50% - 10px); min-width: 300px; height: 400px; margin-bottom: 20px;';
    
    const title = document.createElement('h4');
    title.style.cssText = 'text-align: center; margin: 0 0 10px 0';
    // title.textContent = param === 'hdHg' ? 'HD/HG Ratio' : // OLD TITLE LOGIC
    //                    param === 'dWidth' ? 'D Width' :
    //                    param === 'gWidth' ? 'G Width' : 'WD/WG Ratio';
    title.textContent = paramLabel; // NEW: Use paramLabel from selectedParameters
    
    const canvas = document.createElement('canvas');
    canvas.id = `archaeoCalibration_${param}`;
    canvas.style.cssText = 'width: 100%; height: 350px;';
    
    chartContainer.appendChild(title);
    chartContainer.appendChild(canvas);
    gridContainer.appendChild(chartContainer);

    // Prepare archaeological overlay points
    let archOverlayPoints = [];
    if (window.archaeologicalFiles && window.archaeologicalFiles.length > 0) {
      const statsArr = stats[param]; // stats[param] contains {x, y, stdDev} for the calibration curve
      if (statsArr && statsArr.length > 0) { // Ensure calibration data exists for this parameter
        const temps = statsArr.map(pt => pt.x);
        const means = statsArr.map(pt => pt.y);
        const stds = statsArr.map(pt => pt.stdDev);

        (window.archaeologicalFiles || []).forEach(fileData => {
          const name = fileData.name;
          let archValue = null;

          // Calculate archValue for the current fileData and param
          if (fileData.spectrumData && fileData.spectrumData.wavelengths && fileData.spectrumData.intensities) {
            const currentAnalysisMethod = document.getElementById("analysisMethod").value;
            const dBandWidthHeightVal = parseFloat(document.getElementById("dBandWidthHeight").value);
            const gBandWidthHeightVal = parseFloat(document.getElementById("gBandWidthHeight").value);
            const currentWidthPercentages = [dBandWidthHeightVal / 100, gBandWidthHeightVal / 100];
            const currentIntervals = [
              { start: parseFloat(document.getElementById("peak1Start").value), end: parseFloat(document.getElementById("peak1End").value) },
              { start: parseFloat(document.getElementById("peak2Start").value), end: parseFloat(document.getElementById("peak2End").value) },
            ];
            
            let d_peak = {};
            let g_peak = {};

            if (currentAnalysisMethod === "voigt5d") {
              // For Voigt (5D) overlay, use pre-calculated and stored peaks if available
              if (fileData.derivedD1Peak && fileData.derivedGPeak) {
                d_peak = fileData.derivedD1Peak;
                g_peak = fileData.derivedGPeak;
                console.log(`generateCalibrationCharts: Using stored D1/G for Voigt (5D) overlay for '${name}'.`);
              } else {
                // If Voigt (5D) is selected but button not pressed OR peaks not stored, don't attempt to find peaks for overlay.
                // archValue will remain null, and the point won't be meaningfully plotted or will be out of range.
                console.log(`generateCalibrationCharts: Voigt (5D) selected for '${name}', but derived peaks not available or button not pressed. Skipping findTopPeaks for overlay.`);
              }
            } else {
              // For Simple or Voigt (non-5D), proceed with existing findTopPeaks (which is faster)
              const divisionPointVal = getDivisionPoint(
                fileData.spectrumData.wavelengths,
                fileData.spectrumData.intensities,
                currentIntervals,
                currentAnalysisMethod
              );
              let currentPlotIntervals;
              if (currentAnalysisMethod === "voigt" || currentAnalysisMethod === "voigt5d") { // Include voigt5d here
                currentPlotIntervals = [
                  { start: 1150, end: divisionPointVal },
                  { start: divisionPointVal, end: 1700 }
                ];
              } else {
                currentPlotIntervals = currentIntervals;
              }
              const { topPeaks } = findTopPeaks(
                fileData.spectrumData.wavelengths,
                fileData.spectrumData.intensities,
                currentPlotIntervals,
                currentWidthPercentages,
                currentAnalysisMethod,
                "archaeoSpectrumChart_overlay" // Distinct context for this findTopPeaks call
              );
              d_peak = topPeaks[0] || {};
              g_peak = topPeaks[1] || {};
            }
            
            if (param === 'hdHg') archValue = d_peak.height && g_peak.height && g_peak.height !== 0 ? d_peak.height / g_peak.height : null;
            else if (param === 'dWidth') archValue = d_peak.width || null;
            else if (param === 'gWidth') archValue = g_peak.width || null;
            else if (param === 'wdWg') archValue = d_peak.width && g_peak.width && g_peak.width !== 0 ? d_peak.width / g_peak.width : null;
          }

          if (archValue == null || isNaN(archValue)) return; // Skip if value cannot be determined

          const minY_calib_band = Math.min(...statsArr.map(pt => pt.y - pt.stdDev));
          const maxY_calib_band = Math.max(...statsArr.map(pt => pt.y + pt.stdDev));
          const isArchValueOutOfRange = archValue < minY_calib_band || archValue > maxY_calib_band;
          
          let closestTempForTooltip;
          let x_coord_for_plot;

          if (isArchValueOutOfRange) {
            if (temps.length > 0) { // Ensure temps array is not empty
                if (archValue < minY_calib_band) {
                    x_coord_for_plot = temps[0];
                    closestTempForTooltip = temps[0];
                } else {
                    x_coord_for_plot = temps[temps.length - 1];
                    closestTempForTooltip = temps[temps.length - 1];
                }
            } else { // Fallback if temps is empty, though unlikely if statsArr is populated
                x_coord_for_plot = 0; 
                closestTempForTooltip = 0;
            }
            archOverlayPoints.push({
              x: x_coord_for_plot,
              y: archValue,
              name,
              style: 'outOfRange',
              closestTemp: closestTempForTooltip 
            });
          } else {
            const meanLineIntersections = findTemperaturesForValue(temps, means, stds, archValue);
            
            if (meanLineIntersections.length > 0) {
              meanLineIntersections.forEach(intersection => {
                archOverlayPoints.push({
                  x: intersection.temperature,
                  y: archValue,
                  name,
                  style: 'onMeanLine',
                });
              });
            } else {
              // Not out of range, and no mean line intersections.
              // This implies it must be within an SD band.
              const sdBandRanges = findTemperatureRangesWithinSD(temps, means, stds, archValue);
              sdBandRanges.forEach(sdRange => {
                const midPointTemp = (sdRange.start + sdRange.end) / 2;
                archOverlayPoints.push({
                  x: midPointTemp,
                  y: archValue,
                  name,
                  style: 'inSdOnly',
                });
              });
            }
          }
        });
      }
    }

    // Prepare data for mean line and SD bands
    const meanCalibrationData = stats[param].map(point => ({
      x: point.x,
      y: point.y
    }));
    const sdValuesForErrorBars = stats[param].map(point => point.stdDev);

    const lowerBandData = stats[param].map(point => ({ x: point.x, y: point.y - point.stdDev }));
    const upperBandData = stats[param].map(point => ({ x: point.x, y: point.y + point.stdDev }));

    // START OF REPLACEMENT BLOCK for Y-axis calculation
    let minY, maxY; // These will be the final values for the chart axis

    let dataDrivenMinY = Infinity;
    let dataDrivenMaxY = -Infinity;

    // Consider calibration stats (mean +/- SD)
    if (stats[param] && stats[param].length > 0) {
        stats[param].forEach(point => {
            if (point && typeof point.y === 'number' && isFinite(point.y) && typeof point.stdDev === 'number' && isFinite(point.stdDev)) {
                 dataDrivenMinY = Math.min(dataDrivenMinY, point.y - point.stdDev);
                 dataDrivenMaxY = Math.max(dataDrivenMaxY, point.y + point.stdDev);
            }
        });
    }

    // Consider archaeological overlay points' Y values
    if (archOverlayPoints && archOverlayPoints.length > 0) {
        archOverlayPoints.forEach(point => {
            if (point && typeof point.y === 'number' && isFinite(point.y)) {
                dataDrivenMinY = Math.min(dataDrivenMinY, point.y);
                dataDrivenMaxY = Math.max(dataDrivenMaxY, point.y);
            }
        });
    }

    if (dataDrivenMinY === Infinity || dataDrivenMaxY === -Infinity) {
        // No valid data points found from any source
        minY = 0;
        maxY = 1; // Default Y range
    } else {
        const yRangeValue = dataDrivenMaxY - dataDrivenMinY;
        if (yRangeValue === 0) {
            // Single data point or all points at the same y-value.
            const padding = Math.abs(dataDrivenMinY * 0.1) || 0.1;
            minY = dataDrivenMinY - padding;
            maxY = dataDrivenMaxY + padding;
        } else {
            // Apply 10% padding to the actual data range
            minY = dataDrivenMinY - yRangeValue * 0.1;
            maxY = dataDrivenMaxY + yRangeValue * 0.1;
        }
    }
    // END OF REPLACEMENT BLOCK for Y-axis calculation

    // Create the chart after a short delay to ensure canvas is ready
    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      
      // Destroy previous chart if it exists
      if (window.statsCharts[canvas.id]) {
        window.statsCharts[canvas.id].destroy();
      }

      // Create new chart
      const chartDatasets = [
        // Dataset 1: Lower SD Boundary (invisible, for fill target)
        {
            data: lowerBandData,
            borderColor: 'transparent', 
            pointRadius: 0,
            showLine: true, // Needs to be true for tension to apply and for fill to work correctly
            tension: 0.3,    
            order: 3         
        },
        // Dataset 2: Upper SD Boundary (this creates the shaded band)
        {
            label: 'Calibration Range (Mean ± SD)', 
            data: upperBandData,
            borderColor: 'rgba(255, 150, 150, 0.3)', 
            borderWidth: 1,
            borderDash: [3, 3], 
            backgroundColor: 'rgba(255, 0, 0, 0.05)',  // Very light red, semi-transparent fill
            pointRadius: 0,
            showLine: true,     
            tension: 0.3,
            fill: '-1',         // Fill to the previous dataset (lowerBandData)
            order: 2            
        },
        // Dataset 3: Original Calibration Mean Line with Error Bars
        {
          label: 'Calibration Mean', // Changed from 'Calibration Data' for clarity if needed
          data: meanCalibrationData, // Use the mapped mean data
          borderColor: 'red',
          backgroundColor: 'red',
          pointRadius: 4,
          showLine: true,
          tension: 0.3,
          errorBars: {
            y: {
              array: sdValuesForErrorBars, // Use the mapped SD values
              color: 'rgba(255, 0, 0, 0.5)',
              width: 2
            }
          },
          order: 1 // Drawn on top of the band
        }
      ];

      // Add archaeological overlay points dataset if they exist
      if (archOverlayPoints.length > 0) {
        chartDatasets.push({
            label: 'Archaeological Sample(s)',
            data: archOverlayPoints,
            backgroundColor: function(context) {
              const style = context.raw.style;
              if (style === 'outOfRange') return 'white';
              if (style === 'inSdOnly') return 'rgba(0, 0, 0, 0)'; // Transparent fill
              return 'blue'; // onMeanLine
            },
            borderColor: 'blue',
            pointRadius: 7,
            showLine: false,
            pointStyle: function(context) {
              const style = context.raw.style;
              if (style === 'outOfRange') return 'circle';
              return 'rectRot'; // for onMeanLine and inSdOnly
            },
            borderDash: function(context) {
              const style = context.raw.style;
              return style === 'outOfRange' ? [5, 5] : [];
            },
            borderWidth: 2, // Ensure border is visible for inSdOnly
            hoverRadius: 9,
            parsing: false, 
            datalabels: { 
              align: 'top',
              anchor: 'end',
              color: 'blue',
              font: { weight: 'bold' },
              formatter: function(value, context) {
                return value.name || '';
              }
            },
            order: 0 
        });
      }
      
      window.statsCharts[canvas.id] = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: chartDatasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'linear',
              title: { display: true, text: 'Temperature' }
            },
            y: {
              type: 'linear',
              title: { display: true, text: paramLabel }, // NEW Y-AXIS TITLE from paramInfo
              min: minY,
              max: maxY
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  if (context.dataset.label === 'Archaeological Sample(s)') {
                    const point = context.raw;
                    const isArchWidthMetric = param.toLowerCase().includes("width");
                    const archYPrecision = isArchWidthMetric ? 0 : (param.toLowerCase().includes("ratio") || param.toLowerCase().includes("hdhg") || param.toLowerCase().includes("wdwg") ? 2 : 2);
                    const archYFormatted = parseFloat(point.y).toFixed(archYPrecision);

                    if (point.style === 'outOfRange') {
                      return `${point.name || ''}: ${archYFormatted} (Out of range, closest: ${point.closestTemp ? parseFloat(point.closestTemp).toFixed(0) : 'N/A'}°C)`;
                    }
                    // For 'onMeanLine' and 'inSdOnly'
                    return `${point.name || ''}: (${parseFloat(point.x).toFixed(0)}, ${archYFormatted})`;
                  }
                  // Tooltip for points on the mean line (original dataset)
                  if (context.dataset.label === 'Calibration Mean') { 
                    const index = context.dataIndex;
                    // Ensure stats[param][index] is valid before accessing
                    if (stats[param] && stats[param][index]) {
                      const isCalibWidthMetric = param.toLowerCase().includes("width");
                      const calibValPrecision = isCalibWidthMetric ? 0 : (param.toLowerCase().includes("ratio") || param.toLowerCase().includes("hdhg") || param.toLowerCase().includes("wdwg") ? 2 : 3);
                      const calibStdDevPrecision = isCalibWidthMetric ? 0 : (param.toLowerCase().includes("ratio") || param.toLowerCase().includes("hdhg") || param.toLowerCase().includes("wdwg") ? 2 : 3);

                      const meanCalibFormatted = parseFloat(stats[param][index].y).toFixed(calibValPrecision);
                      const stdDevCalibFormatted = parseFloat(stats[param][index].stdDev).toFixed(calibStdDevPrecision);
                      return [
                        `Mean: ${meanCalibFormatted} (Temp: ${parseFloat(stats[param][index].x).toFixed(0)})`,
                        `± SD: ${stdDevCalibFormatted}`
                      ];
                    }
                    return `Mean: ${parseFloat(context.parsed.y).toFixed(3)}`; // Fallback
                  }
                  // Tooltip for the band itself (upper SD line hover)
                  if (context.dataset.label === 'Calibration Range (Mean ± SD)') {
                    const index = context.dataIndex;
                     // Ensure stats[param][index] is valid before accessing
                    if (stats[param] && stats[param][index]) {
                        const isCalibWidthMetric = param.toLowerCase().includes("width");
                        const calibValPrecision = isCalibWidthMetric ? 0 : (param.toLowerCase().includes("ratio") || param.toLowerCase().includes("hdhg") || param.toLowerCase().includes("wdwg") ? 2 : 3);
                        return `Upper SD: ${(parseFloat(stats[param][index].y) + parseFloat(stats[param][index].stdDev)).toFixed(calibValPrecision)} (Temp: ${parseFloat(stats[param][index].x).toFixed(0)})`;
                    }
                    return `Upper SD: ${parseFloat(context.parsed.y).toFixed(3)}`; // Fallback
                  }
                  // Fallback tooltip for other cases (e.g. lower bound if made visible)
                  const val = context.dataset.data[context.dataIndex];
                  if (val && typeof val.x !== 'undefined' && typeof val.y !== 'undefined') {
                    const isValWidthMetric = param.toLowerCase().includes("width");
                    const valPrecision = isValWidthMetric ? 0 : (param.toLowerCase().includes("ratio") || param.toLowerCase().includes("hdhg") || param.toLowerCase().includes("wdwg") ? 2 : 3);
                    return `${context.dataset.label || 'Data'}: (${parseFloat(val.x).toFixed(0)}, ${parseFloat(val.y).toFixed(valPrecision)})`;
                  }
                  return `${context.dataset.label || 'Data'}: Y-value ${parseFloat(context.parsed.y).toFixed(3)}`;
                }
              }
            }
          }
        }
      });
    }, 100);
  });
}

/**
 * Find all temperature(s) where the calibration curve (piecewise linear) crosses the given value.
 * Returns an array of { temperature, stdDev } objects, where stdDev is the uncertainty in temperature (ΔT).
 *
 * @param {number[]} temps - Array of calibration temperatures (sorted ascending)
 * @param {number[]} means - Array of mean parameter values at each temperature
 * @param {number[]} stds - Array of stdDev values of the *parameter* at each temperature
 * @param {number} value - Archaeological sample's parameter value
 * @returns {Array<{temperature: number, stdDev: number}>}
 */
function findTemperaturesForValue(temps, means, stds, value) {
  const results = [];
  const slopeThreshold = 1e-9; // To avoid division by zero or near-zero slopes
  const veryHighUncertainty = 9999; // Placeholder for unconstrained temperature

  for (let i = 0; i < temps.length - 1; i++) {
    const x0 = temps[i], x1 = temps[i + 1]; // Temperatures
    const y0 = means[i], y1 = means[i + 1]; // Mean parameter values
    const s0 = stds[i], s1 = stds[i + 1];   // SD of parameter values

    if (x1 <= x0) continue; // Skip invalid segments

    // Check if value is between y0 and y1 (inclusive of endpoints)
    if ((value >= y0 && value <= y1) || (value <= y0 && value >= y1)) {
      let derivedTemp, tempUncertainty;
      const parameterDiff = y1 - y0;
      const temperatureDiff = x1 - x0;

      if (Math.abs(parameterDiff) < slopeThreshold) {
        // Segment is effectively flat
        if (Math.abs(value - y0) < slopeThreshold) { // Value is on the flat line
          derivedTemp = (x0 + x1) / 2; // Midpoint as best guess
          // If flat, temperature is poorly constrained by this parameter value.
          // A simple representation of this uncertainty could be half the segment length.
          // Or, use the placeholder to indicate it's poorly constrained.
          tempUncertainty = veryHighUncertainty;
        } else {
          // Value is not on the flat line, but logic entered here due to y0/y1 range check.
          // This specific case should ideally not be a primary match.
          // However, if forced, the uncertainty is very high.
          derivedTemp = (x0 + x1) / 2;
          tempUncertainty = veryHighUncertainty;
        }
      } else {
        // Segment is not flat, proceed with interpolation
        const t_ratio = (value - y0) / parameterDiff;
        derivedTemp = x0 + t_ratio * temperatureDiff;

        // Clamp derivedTemp to the segment [x0, x1] to be safe,
        // although t_ratio should be [0,1] if value is between y0,y1
        derivedTemp = Math.max(x0, Math.min(x1, derivedTemp));
        
        // Interpolate the SD of the *parameter* at the derivedTemp
        // Recalculate t_ratio for the clamped derivedTemp to ensure consistency
        const clamped_t_ratio = (derivedTemp - x0) / temperatureDiff;
        const stdDevParameterAtTemp = s0 + clamped_t_ratio * (s1 - s0);
        
        const slope = parameterDiff / temperatureDiff;

        if (Math.abs(slope) < slopeThreshold) {
          tempUncertainty = veryHighUncertainty;
        } else {
          tempUncertainty = Math.abs(stdDevParameterAtTemp / slope);
        }
      }
      results.push({ temperature: derivedTemp, stdDev: tempUncertainty });
    }
  }
  return results;
}

/**
 * Find all temperature intervals where the archaeological value is within mean ± SD of the calibration curve.
 * Returns an array of {start, end} objects (temperature ranges).
 *
 * @param {number[]} temps - Array of calibration temperatures (sorted ascending)
 * @param {number[]} means - Array of mean parameter values at each temperature
 * @param {number[]} stds - Array of stdDev values at each temperature
 * @param {number} value - Archaeological sample's parameter value
 * @returns {Array<{start: number, end: number}>}
 */
function findTemperatureRangesWithinSD(temps, means, stds, value) {
    if (temps.length < 2) return []; // Need at least one segment

    const validSegments = [];

    // Helper to check if value is effectively in band at t_check for a given original segment
    function isEffectivelyInBand(t_check, segmentT0, segmentT1, segmentM0, segmentM1, segmentS0, segmentS1) {
        // Clamp t_check to the segment's bounds for interpolation
        const t_clamped = Math.max(segmentT0, Math.min(segmentT1, t_check));
        
        const factor = (segmentT1 === segmentT0) ? 0 : (t_clamped - segmentT0) / (segmentT1 - segmentT0);
        const m_check = segmentM0 + factor * (segmentM1 - segmentM0);
        const s_check = segmentS0 + factor * (segmentS1 - segmentS0);
        
        // Use a small epsilon for floating point comparisons
        const epsilon = 1e-9;
        return value >= m_check - s_check - epsilon && value <= m_check + s_check + epsilon;
    }

    // Helper to find temperature where 'value' intersects a line defined by (x0,y0)-(x1,y1)
    function getTemperatureForY(y_target, x0, y0, x1, y1) {
        const epsilon = 1e-9;
        if (Math.abs(y1 - y0) < epsilon) { // Line is nearly horizontal
            return (Math.abs(y_target - y0) < epsilon) ? x0 : null; // If value matches horizontal line, return start (or any point)
        }
        const t_intersect_ratio = (y_target - y0) / (y1 - y0);

        // Check if intersection is within or very close to segment bounds (using epsilon)
        if (t_intersect_ratio >= 0 - epsilon && t_intersect_ratio <= 1 + epsilon) {
            let temp = x0 + t_intersect_ratio * (x1 - x0);
            // Clamp to segment bounds to ensure interpolated point is valid for the segment
            return Math.max(x0, Math.min(x1, temp));
        }
        return null;
    }

    for (let i = 0; i < temps.length - 1; i++) {
        const t0 = temps[i], t1 = temps[i + 1];
        if (t1 <= t0 + 1e-9) continue; // Skip zero-length or invalid segments

        const m0 = means[i], m1 = means[i + 1];
        const s0 = stds[i], s1 = stds[i + 1];

        const y_lower_0 = m0 - s0, y_lower_1 = m1 - s1;
        const y_upper_0 = m0 + s0, y_upper_1 = m1 + s1;

        // Collect points of interest: segment boundaries and crossings with SD bands
        const pointsOfInterest = new Set();
        pointsOfInterest.add(t0);
        pointsOfInterest.add(t1);
        
        const crossLowerTemp = getTemperatureForY(value, t0, y_lower_0, t1, y_lower_1);
        if (crossLowerTemp !== null) pointsOfInterest.add(crossLowerTemp);

        const crossUpperTemp = getTemperatureForY(value, t0, y_upper_0, t1, y_upper_1);
        if (crossUpperTemp !== null) pointsOfInterest.add(crossUpperTemp);
        
        // Sort unique points and ensure they are strictly within the current segment [t0, t1]
        const sortedPoints = Array.from(pointsOfInterest)
            .map(p => Math.max(t0, Math.min(t1, p))) // Clamp points to the segment
            .sort((a, b) => a - b)
            .filter((p, index, arr) => index === 0 || p > arr[index-1] + 1e-9); // Keep unique points (epsilon for float)

        for (let j = 0; j < sortedPoints.length - 1; j++) {
            const p_start = sortedPoints[j];
            const p_end = sortedPoints[j + 1];

            if (p_end <= p_start + 1e-9) continue; // Skip zero-length or tiny sub-segments

            const mid_p = (p_start + p_end) / 2;
            // Check if the value is in the band at the midpoint of this sub-segment
            // using the original segment's m0,m1,s0,s1 for interpolation context.
            if (isEffectivelyInBand(mid_p, t0, t1, m0, m1, s0, s1)) {
                validSegments.push({ start: p_start, end: p_end });
            }
        }
    }

    if (validSegments.length === 0) return [];

    // Sort all found valid sub-segments by start time
    validSegments.sort((a, b) => a.start - b.start || a.end - b.end);

    // Merge overlapping or adjacent valid sub-segments
    const mergedRanges = [];
    if (validSegments.length > 0) {
        mergedRanges.push({ ...validSegments[0] }); // Start with the first segment

        for (let i = 1; i < validSegments.length; i++) {
            const current = validSegments[i];
            const previous = mergedRanges[mergedRanges.length - 1];

            // If current segment starts at or before previous one ends (within epsilon)
            if (current.start <= previous.end + 1e-9) {
                previous.end = Math.max(previous.end, current.end); // Merge
            } else {
                mergedRanges.push({ ...current }); // Add as a new range
            }
        }
    }
    
    // Filter out any ranges that are effectively points or have negligible length
    return mergedRanges.filter(range => range.end > range.start + 1e-9);
}

// NEW HELPER FUNCTION
function calculateSumOfPseudoVoigts(x, peakParamsArray) {
  let totalIntensity = 0;
  for (const params of peakParamsArray) {
    if (params) { // Ensure params object exists
      totalIntensity += pseudoVoigt(x, params.A, params.mu, params.sigma, params.gamma, params.eta);
    }
  }
  return totalIntensity;
}

// STUB function for Voigt (5D) fitting.
// REPLACE THE BODY WITH ACTUAL FITTING LOGIC LATER.
function fitDComplexAndGPeak_Voigt5D(xDataD_input, yDataD_input, xDataG_input, yDataG_input, canvasIdBase = "spectrumChart_voigt5d_stub") {
    if (!window.isVoigt5DTriggeredByButton) {
        console.warn(`fitDComplexAndGPeak_Voigt5D (${canvasIdBase}) called without button press. Aborting Voigt (5D) fit.`);
        // Return a structure that matches what the calling function expects, but with empty/default data.
        return {
            d1Peak: { wavelength: null, intensity: null, height: null, width: null, isD1: true },
            gPeak: { wavelength: null, intensity: null, height: null, width: null },
            fittedCurves: []
        };
    }
    console.log("Executing STUB fitDComplexAndGPeak_Voigt5D with D-data length:", xDataD_input.length, "G-data length:", xDataG_input.length);

    // --- Initial Parameter Estimation for all peaks --- 
    let gMuGuess = 1590, gAGuess = 15, d1MuGuess = 1350, d1AGuess = 18;
    const defaultSigma = 30, defaultGamma = 25, defaultEta = 0.5; // Increased default sigma and gamma
    const dSubPeakShapes = {
        d2: { sigma: 45, gamma: 40, eta: 0.5 },
        d3: { sigma: 50, gamma: 55, eta: 0.5 },
        d4: { sigma: 65, gamma: 55, eta: 0.5 },
        d5: { sigma: 42, gamma: 48, eta: 0.5 },
    };

    if (yDataG_input && yDataG_input.length > 0) {
        let maxGIntensity = -Infinity;
        let maxGIndex = -1;
        for (let i = 0; i < yDataG_input.length; i++) {
            if (yDataG_input[i] > maxGIntensity) {
                maxGIntensity = yDataG_input[i];
                maxGIndex = i;
            }
        }
        if (maxGIndex !== -1) {
            gMuGuess = xDataG_input[maxGIndex];
            gAGuess = maxGIntensity;
        }
    } else {
        console.warn("Voigt5D: yDataG_input is empty, using default G peak guesses.");
    }

    if (yDataD_input && yDataD_input.length > 0) {
        let maxD1Intensity = -Infinity;
        let maxD1Index = -1;
        for (let i = 0; i < yDataD_input.length; i++) {
            if (yDataD_input[i] > maxD1Intensity) {
                maxD1Intensity = yDataD_input[i];
                maxD1Index = i;
            }
        }
        if (maxD1Index !== -1) {
            d1MuGuess = xDataD_input[maxD1Index];
            d1AGuess = maxD1Intensity;
        }
    } else {
        console.warn("Voigt5D: yDataD_input is empty, using default D1 peak guesses.");
    }

    // Refined D1 initial guess
    let d1MuInitialGuess = 1350, d1AInitialGuess = 10;
    if (xDataD_input && xDataD_input.length > 0 && yDataD_input && yDataD_input.length === xDataD_input.length) {
        let maxD1IntensityLocal = -Infinity;
        let maxD1IndexLocal = -1;
        const d1RegionStart = 1320, d1RegionEnd = 1390;
        for (let i = 0; i < xDataD_input.length; i++) {
            if (xDataD_input[i] >= d1RegionStart && xDataD_input[i] <= d1RegionEnd) {
                if (yDataD_input[i] > maxD1IntensityLocal) {
                    maxD1IntensityLocal = yDataD_input[i];
                    maxD1IndexLocal = i;
                }
            }
        }
        if (maxD1IndexLocal !== -1) {
            d1MuInitialGuess = xDataD_input[maxD1IndexLocal];
            d1AInitialGuess = maxD1IntensityLocal;
            console.log(`Voigt5D (${canvasIdBase}): Refined D1 Initial Guess: mu=${d1MuInitialGuess.toFixed(2)}, A=${d1AInitialGuess.toFixed(2)} from range [${d1RegionStart}-${d1RegionEnd}]`);
        } else {
            console.warn(`Voigt5D (${canvasIdBase}): Could not find peak for D1 in range [${d1RegionStart}-${d1RegionEnd}], using defaults.`);
            // d1MuGuess and d1AGuess (broader search) will be used via currentPeakParams if this fails
        }
    } else {
        console.warn("Voigt5D: D-band data missing for refined D1 initial guess.");
    }

    let currentPeakParams = [
        { A: d1AInitialGuess * 0.80, mu: d1MuInitialGuess, sigma: 55, gamma: 45, eta: defaultEta, label: "D1 (Est.)", type: "D1" }, // Reduced initial A, sigma, and gamma for D1
        { A: d1AInitialGuess * 0.05, mu: 1620, sigma: dSubPeakShapes.d2.sigma, gamma: dSubPeakShapes.d2.gamma, eta: dSubPeakShapes.d2.eta, label: "D2 (Est.)", type: "D2" }, // Reduced D2 initial A
        { A: d1AInitialGuess * 0.01, mu: 1510, sigma: dSubPeakShapes.d3.sigma, gamma: dSubPeakShapes.d3.gamma, eta: dSubPeakShapes.d3.eta, label: "D3 (Est.)", type: "D3" }, // Reduced D3 initial A
        { A: d1AInitialGuess * 0.25, mu: 1200, sigma: dSubPeakShapes.d4.sigma, gamma: dSubPeakShapes.d4.gamma, eta: dSubPeakShapes.d4.eta, label: "D4 (Est.)", type: "D4" },
        { A: d1AInitialGuess * 0.01, mu: 1445, sigma: dSubPeakShapes.d5.sigma, gamma: dSubPeakShapes.d5.gamma, eta: dSubPeakShapes.d5.eta, label: "D5 (Est.)", type: "D5" },
        { A: gAGuess * 0.75, mu: gMuGuess, sigma: defaultSigma, gamma: defaultGamma, eta: defaultEta, label: "G (Est.)", type: "G" }
    ];

    console.log(`Voigt5D (${canvasIdBase}): Initial D1 params: ${JSON.stringify(currentPeakParams.find(p => p.type === "D1"))}`);
    console.log(`Voigt5D (${canvasIdBase}): Initial G params: ${JSON.stringify(currentPeakParams.find(p => p.type === "G"))}`);

    // --- Objective Function --- 
    function calculateModelError(peakParams, xd, yd, xg, yg) {
        let dBandError = 0;
        // const dParamsOnly = peakParams.filter(p => p.type.startsWith("D")); // No longer needed here
        if (xd && xd.length > 0 && yd && yd.length === xd.length) {
            for (let i = 0; i < xd.length; i++) {
                // Model for D-region data points now includes the sum of ALL peaks (D1-D5 + G)
                const model_y_d_region = calculateSumOfPseudoVoigts(xd[i], peakParams);
                dBandError += Math.pow(model_y_d_region - yd[i], 2);
            }
        } else {
            // console.warn("Voigt5D Error Calc: D-band data or params missing/mismatched for error calculation.");
        }

        let gBandError = 0;
        // const gParam = peakParams.find(p => p.type === "G"); // No longer needed here
        if (xg && xg.length > 0 && yg && yg.length === xg.length) {
            for (let i = 0; i < xg.length; i++) {
                // Model for G-region data points now also includes the sum of ALL peaks (D1-D5 + G)
                const model_y_g_region = calculateSumOfPseudoVoigts(xg[i], peakParams);
                gBandError += Math.pow(model_y_g_region - yg[i], 2);
            }
        } else {
             // console.warn("Voigt5D Error Calc: G-band data or param missing/mismatched for error calculation.");
        }
        return dBandError + gBandError;
    }
    // --- End of Objective Function ---

    // --- Modified Placeholder for Optimization Loop ---
    const optimizationIterations = 1; 
    console.log(`Starting Voigt (5D) fitting process for ${canvasIdBase} with ${optimizationIterations} iterations.`);

    const learningRateGradientDescent = 35e-5; 
    const convergenceThreshold = 15.0; 
    const patience = 2; 
    let stagnationCounter = 0;

    let bestPeakParamsOverall = JSON.parse(JSON.stringify(currentPeakParams)); // Initialize with initial params
    let lowestErrorOverall = calculateModelError(bestPeakParamsOverall, xDataD_input, yDataD_input, xDataG_input, yDataG_input); // Error of initial params
    console.log(`Initial Lowest Error Overall (${canvasIdBase}): ${lowestErrorOverall.toExponential(4)}`);


    // Placeholder for a real optimization loop
    for (let iter = 0; iter < optimizationIterations; iter++) {
        // const errorBeforeIteration = calculateModelError(currentPeakParams, xDataD_input, yDataD_input, xDataG_input, yDataG_input); // This is now calculated below as errorAfterUpdate
        // console.log(`Iteration ${iter} (${canvasIdBase}): Starting Error = ${errorBeforeIteration.toExponential(4)}`);


        const d1ParamsBeforeGrad = JSON.parse(JSON.stringify(currentPeakParams.find(p => p.type === "D1")));
        // console.log(`  Iter ${iter} (${canvasIdBase}) D1 PARAMS PRE-GRAD: A=${d1ParamsBeforeGrad.A.toFixed(2)}, mu=${d1ParamsBeforeGrad.mu.toFixed(2)}`);

        const allGradients = [];
        const paramKeysToOptimize = ['A', 'mu', 'sigma', 'gamma', 'eta'];

        // --- Calculate Gradients for ALL parameters ---
        for (let peakIndex = 0; peakIndex < currentPeakParams.length; peakIndex++) {
            // ... (gradient calculation logic remains the same) ...
// ... (inside the gradient calculation loop) ...
            for (const paramName of paramKeysToOptimize) {
                const originalValue = currentPeakParams[peakIndex][paramName];
                let delta = 0;

                // Define delta based on paramName
                if (paramName === 'A') delta = (Math.abs(originalValue) * 0.001) + 0.01;
                else if (paramName === 'mu') delta = 0.05;
                else if (paramName === 'sigma') delta = (Math.abs(originalValue) * 0.005) + 0.01;
                else if (paramName === 'gamma') delta = (Math.abs(originalValue) * 0.005) + 0.01;
                else if (paramName === 'eta') delta = 0.002;

                if (delta === 0) { 
                    allGradients.push({ peakIndex, paramName, gradientValue: 0 });
                    // console.warn(`  Delta for ${peakLabelForLog} - ${paramName} is zero. Gradient set to 0.`);
                    continue;
                }

                let paramsPlus = JSON.parse(JSON.stringify(currentPeakParams));
                paramsPlus[peakIndex][paramName] = originalValue + delta;
                if (paramName === 'A') paramsPlus[peakIndex][paramName] = Math.max(1e-9, paramsPlus[peakIndex][paramName]);
                if (paramName === 'sigma') paramsPlus[peakIndex][paramName] = Math.max(1e-9, paramsPlus[peakIndex][paramName]);
                if (paramName === 'gamma') paramsPlus[peakIndex][paramName] = Math.max(1e-9, paramsPlus[peakIndex][paramName]);
                if (paramName === 'eta') paramsPlus[peakIndex][paramName] = Math.max(0.001, Math.min(0.999, paramsPlus[peakIndex][paramName]));
                
                const errorPlusDelta = calculateModelError(paramsPlus, xDataD_input, yDataD_input, xDataG_input, yDataG_input);

                let paramsMinus = JSON.parse(JSON.stringify(currentPeakParams));
                paramsMinus[peakIndex][paramName] = originalValue - delta;
                if (paramName === 'A') paramsMinus[peakIndex][paramName] = Math.max(1e-9, paramsMinus[peakIndex][paramName]);
                if (paramName === 'sigma') paramsMinus[peakIndex][paramName] = Math.max(1e-9, paramsMinus[peakIndex][paramName]);
                if (paramName === 'gamma') paramsMinus[peakIndex][paramName] = Math.max(1e-9, paramsMinus[peakIndex][paramName]);
                if (paramName === 'eta') paramsMinus[peakIndex][paramName] = Math.max(0.001, Math.min(0.999, paramsMinus[peakIndex][paramName]));

                const errorMinusDelta = calculateModelError(paramsMinus, xDataD_input, yDataD_input, xDataG_input, yDataG_input);

                const gradientValue = (errorPlusDelta - errorMinusDelta) / (2 * delta);
                allGradients.push({ peakIndex, paramName, gradientValue });
                // if (peakIndex === 0 && paramName === 'A') { 
                //     console.log(`  Iter ${iter} (${canvasIdBase}) D1.A GRADIENT: ${gradientValue.toExponential(3)}`);
                // }
            }
        }
        // --- End Gradient Calculation ---
        
        const errorBeforeUpdateThisIteration = calculateModelError(currentPeakParams, xDataD_input, yDataD_input, xDataG_input, yDataG_input);
        // console.log(`Iter ${iter} (${canvasIdBase}) Pre-Update Error: ${errorBeforeUpdateThisIteration.toExponential(4)}`);


        // --- Gradient Descent Update Step for ALL parameters ---
        let totalGradientMagnitudeSq = 0;
        allGradients.forEach(({ peakIndex, paramName, gradientValue }) => {
            // ... (parameter update and clamping logic remains the same) ...
            if (isNaN(gradientValue) || !isFinite(gradientValue)) {
                // console.warn(`  Skipping update for ${currentPeakParams[peakIndex].label} - ${paramName} due to NaN/Infinite gradient.`);
                return;
            }
            totalGradientMagnitudeSq += gradientValue * gradientValue;

            const oldValue = currentPeakParams[peakIndex][paramName];
            let newValue = oldValue - learningRateGradientDescent * gradientValue;

            // Clamping after update
            if (paramName === 'A') {
                const peakType = currentPeakParams[peakIndex].type;
                if (peakType === 'D1') {
                    newValue = Math.max(0.1, newValue); 
                    newValue = Math.min(newValue, d1AInitialGuess * 1.0); 
                } else if (peakType === 'D2') { 
                    newValue = Math.max(1e-2, newValue);
                    newValue = Math.min(newValue, d1AInitialGuess * 0.20); 
                } else if (peakType === 'D3') { 
                    newValue = Math.max(1e-2, newValue);
                    newValue = Math.min(newValue, d1AInitialGuess * 0.45); 
                } else if (peakType === 'D4') {
                    newValue = Math.max(0.1, Math.min(newValue, d1AInitialGuess * 0.4)); 
                } else if (peakType === 'G') { 
                    newValue = Math.max(1e-2, newValue); 
                    newValue = Math.min(newValue, gAGuess * 1.02); 
                } else { 
                    newValue = Math.max(1e-2, newValue); 
                }
            }
            if (paramName === 'sigma') {
                const peakType = currentPeakParams[peakIndex].type;
                if (peakType === 'D1') {
                    newValue = Math.max(30, newValue); 
                } else {
                    newValue = Math.max(10, newValue); 
                }
            }
            if (paramName === 'gamma') {
                const peakType = currentPeakParams[peakIndex].type;
                if (peakType === 'D1') {
                    newValue = Math.max(30, newValue); 
                } else {
                    newValue = Math.max(10, newValue); 
                }
            }
            if (paramName === 'eta') newValue = Math.max(0.01, Math.min(0.99, newValue)); 
            if (paramName === 'mu') {
                const peakType = currentPeakParams[peakIndex].type;
                if (peakType === 'D1') newValue = Math.max(1320, Math.min(1390, newValue));      
                else if (peakType === 'D2') newValue = Math.max(1600, Math.min(1650, newValue)); // Adjusted D2 mu upper clamp
                else if (peakType === 'D3') newValue = Math.max(1498, Math.min(1550, newValue));
                else if (peakType === 'D4') newValue = Math.max(1150, Math.min(1250, newValue));
                else if (peakType === 'D5') newValue = Math.max(1400, Math.min(1490, newValue)); 
                else if (peakType === 'G') newValue = Math.max(1570, Math.min(1630, newValue));
            }
            currentPeakParams[peakIndex][paramName] = newValue;
        });

        // const d1ParamsAfterUpdate = JSON.parse(JSON.stringify(currentPeakParams.find(p => p.type === "D1")));
        // console.log(`  Iter ${iter} (${canvasIdBase}) D1 PARAMS POST-UPDATE: A=${d1ParamsAfterUpdate.A.toFixed(2)}, mu=${d1ParamsAfterUpdate.mu.toFixed(2)}`);
        // console.log(`  Gradient Mag.: ${(Math.sqrt(totalGradientMagnitudeSq)).toExponential(3)}. Updates applied with LR: ${learningRateGradientDescent}`);
        // --- End Gradient Descent Update Step ---
        
        const errorAfterUpdateThisIteration = calculateModelError(currentPeakParams, xDataD_input, yDataD_input, xDataG_input, yDataG_input);
        const errorChange = errorBeforeUpdateThisIteration - errorAfterUpdateThisIteration; // Error change from params *before* this iter's update
        
        console.log(`Iter ${iter} (${canvasIdBase}): Error Before: ${errorBeforeUpdateThisIteration.toExponential(4)}, Error After: ${errorAfterUpdateThisIteration.toExponential(4)} (Change: ${errorChange.toExponential(3)})`);

        // Check if this iteration produced the best result so far
        if (errorAfterUpdateThisIteration < lowestErrorOverall) {
            lowestErrorOverall = errorAfterUpdateThisIteration;
            bestPeakParamsOverall = JSON.parse(JSON.stringify(currentPeakParams)); // Deep copy
            console.log(`    New best error found: ${lowestErrorOverall.toExponential(4)} at iteration ${iter}`);
        }

        if (Math.abs(errorChange) < convergenceThreshold) {
            stagnationCounter++;
            // console.log(`  Stagnation counter: ${stagnationCounter}/${patience}`);
        } else {
            stagnationCounter = 0; 
        }

        if (stagnationCounter >= patience) {
            console.log(`  Convergence achieved after ${iter + 1} iterations (error change below threshold for ${patience} iterations).`);
            break;
        }
        // console.log("--------------------------------------------------");
    }
    // --- End of Placeholder for Optimization Loop ---

    console.log(`Optimization finished. Using best parameters found with error: ${lowestErrorOverall.toExponential(4)}`);
    currentPeakParams = JSON.parse(JSON.stringify(bestPeakParamsOverall)); // Ensure currentPeakParams is the best one found


    // Use the (potentially optimized) currentPeakParams to generate curves
    const d1Params = currentPeakParams.find(p => p.type === "D1");
    const d2Params = currentPeakParams.find(p => p.type === "D2");
    const d3Params = currentPeakParams.find(p => p.type === "D3");
    const d4Params = currentPeakParams.find(p => p.type === "D4");
    const d5Params = currentPeakParams.find(p => p.type === "D5");
    const gParams  = currentPeakParams.find(p => p.type === "G");

    const fittedCurvesOut = [];
    const fullXRange = [];
    for (let x = 1000; x <= 1900; x += 1) fullXRange.push(x); 

    // Add individual D sub-peak curves
    [d1Params, d2Params, d3Params, d4Params, d5Params].forEach(p => {
        if (p) { 
            const subPeakY = fullXRange.map(xVal => pseudoVoigt(xVal, p.A, p.mu, p.sigma, p.gamma, p.eta));
            fittedCurvesOut.push({
                x: [...fullXRange],
                y: subPeakY,
                label: p.label || `${p.type} (Fit)`,
                type: `d-subpeak-${p.type}` // e.g., d-subpeak-D1 for styling
            });
        }
    });

    // Add individual G peak curve (will be styled as a thinner line)
    if (gParams) {
        const gCurveY = fullXRange.map(xVal => pseudoVoigt(xVal, gParams.A, gParams.mu, gParams.sigma, gParams.gamma, gParams.eta));
        fittedCurvesOut.push({
            x: [...fullXRange],
            y: gCurveY,
            label: gParams.label || "G (Fit)", // Label for legend
            type: "g-peak-individual"         // Specific type for styling individual G
        });
    }

    // Add Total Fit Sum (D1-D5 + G)
    const allPeaksForTotalSum = [d1Params, d2Params, d3Params, d4Params, d5Params, gParams].filter(p => p); // Collect all valid peak params
    if (allPeaksForTotalSum.length > 0) {
        const totalFitSumY = fullXRange.map(x_val => calculateSumOfPseudoVoigts(x_val, allPeaksForTotalSum));
        fittedCurvesOut.push({
            x: [...fullXRange],
            y: totalFitSumY,
            label: "Total Fit (Sum)", // New label for the overall sum
            type: "total-fit-sum"     // New type for styling this sum curve
        });
    }

    const dBandWidthHeightPercentage = parseFloat(document.getElementById("dBandWidthHeight")?.value || 50) / 100;
    const gBandWidthHeightPercentage = parseFloat(document.getElementById("gBandWidthHeight")?.value || 50) / 100;
    
    let d1PeakForTable = { wavelength: null, intensity: null, height: null, width: null }; 
    if (d1Params) {
        const d1_FWHM_approx = approximateVoigtFWHM(d1Params.sigma, d1Params.gamma, d1Params.eta);
        d1PeakForTable = {
            wavelength: d1Params.mu,
            intensity: d1Params.A, 
            height: d1Params.A,     
            width: d1_FWHM_approx, 
            widthLeftX: d1Params.mu - d1_FWHM_approx / 2,
            widthRightX: d1Params.mu + d1_FWHM_approx / 2,
            widthHeight: d1Params.A * dBandWidthHeightPercentage, 
            isD1: true
        };
    }

    let gPeakForTable = { wavelength: null, intensity: null, height: null, width: null }; 
    if (gParams) {
        const g_FWHM_approx  = approximateVoigtFWHM(gParams.sigma, gParams.gamma, gParams.eta);
        gPeakForTable = {
            wavelength: gParams.mu,
            intensity: gParams.A, 
            height: gParams.A,     
            width: g_FWHM_approx, 
            widthLeftX: gParams.mu - g_FWHM_approx / 2,
            widthRightX: gParams.mu + g_FWHM_approx / 2,
            widthHeight: gParams.A * gBandWidthHeightPercentage
        };
    }

    return {
        d1Peak: d1PeakForTable,
        gPeak: gPeakForTable,
        fittedCurves: fittedCurvesOut
    };
}

// New function to calculate and store calibration statistics
function calculateAndStoreCalibrationStats(experimentalDataForCalibration, analysisMethodName /* currently "voigt" is implied */) {
    if (!experimentalDataForCalibration || experimentalDataForCalibration.length === 0) {
        console.warn("calculateAndStoreCalibrationStats: No experimental data provided for calibration.");
        window.calibrationStats = {}; // Clear or set to empty
        return;
    }

    // Filter data to only include checked samples from the experimental tab
    const filteredExperimentalData = experimentalDataForCalibration.filter(point => includedSamples.has(point.name));

    if (filteredExperimentalData.length === 0) {
        console.warn("calculateAndStoreCalibrationStats: No *included* experimental samples to build calibration stats.");
        window.calibrationStats = {};
        return;
    }
    
    const groupedData = {};
    filteredExperimentalData.forEach(point => {
        const tempStr = String(point.temperature).replace(" °C", ""); // Ensure it's a string then replace
        if (!groupedData[tempStr]) {
            groupedData[tempStr] = [];
        }
        groupedData[tempStr].push(point);
    });

    const parameters = ['hdHg', 'dWidth', 'gWidth', 'wdWg'];
    const newCalibStats = {};
    parameters.forEach(param => {
        newCalibStats[param] = Object.entries(groupedData).map(([temp, points]) => {
            const values = points.map(p => p[param]).filter(v => v != null && !isNaN(parseFloat(v)));
             if (values.length === 0) return null;

            const numericValues = values.map(parseFloat);
            const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            const stdDev = Math.sqrt(
                numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericValues.length
            );
            return { x: parseFloat(temp), y: mean, stdDev };
        }).filter(point => point != null);
        
        if (newCalibStats[param]) {
            newCalibStats[param].sort((a, b) => a.x - b.x); // Sort by temperature
        }
    });
    window.calibrationStats = newCalibStats;
    console.log("Updated window.calibrationStats:", window.calibrationStats);
}
