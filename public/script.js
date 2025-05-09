let allFilesData = [];
let displayedFileIndex = 0;
let includedSamples = new Set(); // Track which samples are included in calculations

if (!window.statsCharts) window.statsCharts = {};

document.addEventListener("DOMContentLoaded", () => {
  updatePeak1Inputs();

  // Add event listeners for method and mode selectors in both tabs
  document.getElementById("analysisMethod").addEventListener("change", () => {
    // If Voigt is selected, set mode to broad and update intervals
    if (document.getElementById("analysisMethod").value === "voigt") {
      document.getElementById("peak1Mode").value = "broad";
      // This will update the D peak interval inputs to broad values
      updatePeak1Inputs();
    }

    // Update both tabs
    updateDisplayedFile();
  });

  // Add event listeners for smoothing/fitting checkboxes in both tabs
  ["showSmoothing", "showFitting", "archaeoShowSmoothing", "archaeoShowFitting"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        if (id.startsWith("archaeo")) {
          updateArchaeoPlot();
        } else {
          updateDisplayedFile();
        }
      });
    }
  });

  // Add event listeners for width height inputs in both tabs
  ["dBandWidthHeight", "gBandWidthHeight", "archaeoDBandWidthHeight", "archaeoGBandWidthHeight"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        if (id.startsWith("archaeo")) {
          updateArchaeoPlot();
        } else {
          updateDisplayedFile();
        }
      });
    }
  });

  document.getElementById("peak1Mode").addEventListener("change", () => {
    updatePeak1Inputs();
    updateDisplayedFile();
  });

  // Add event listeners for peak interval inputs
  ["peak1Start", "peak1End", "peak2Start", "peak2End"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        updateDisplayedFile();
      });
    }
  });

  // Add navigation button event listeners for experimental tab
  document.getElementById("prevFile").addEventListener("click", () => {
    const selector = document.getElementById("fileSelector");
    if (selector.selectedIndex > 0) {
      selector.selectedIndex--;
      updateDisplayedFile();
    }
  });

  document.getElementById("nextFile").addEventListener("click", () => {
    const selector = document.getElementById("fileSelector");
    if (selector.selectedIndex < selector.options.length - 1) {
      selector.selectedIndex++;
      updateDisplayedFile();
    }
  });

  // Add navigation button event listeners for archaeological tab
  document.getElementById("archaeoPrevFile").addEventListener("click", () => {
    const selector = document.getElementById("archaeoFileSelector");
    if (selector.selectedIndex > 0) {
      selector.selectedIndex--;
      updateArchaeoPlot();
    }
  });

  document.getElementById("archaeoNextFile").addEventListener("click", () => {
    const selector = document.getElementById("archaeoFileSelector");
    if (selector.selectedIndex < selector.options.length - 1) {
      selector.selectedIndex++;
      updateArchaeoPlot();
    }
  });

  // Add event listener for the Update Peaks button
  document.getElementById("updateButton").addEventListener("click", () => {
    updateDisplayedFile();
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
      updateArchaeoPlot();
    });
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
  fileSelector.innerHTML = "";

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
    displayedFileIndex = 0;
    fileSelector.value = displayedFileIndex;
    updateDisplayedFile();
  });
});

document.getElementById("updateButton").addEventListener("click", function () {
  updatePeak1Inputs();
  updateDisplayedFile();
  if (document.getElementById("archaeologicalSection").style.display !== "none") {
    updateArchaeoPlot();
  }
});

document.getElementById("dBandWidthHeight").addEventListener("input", () => {
  updateDisplayedFile();
});

document.getElementById("gBandWidthHeight").addEventListener("input", () => {
  updateDisplayedFile();
});

function updateDisplayedFile() {
  displayedFileIndex = parseInt(document.getElementById("fileSelector").value);
  if (allFilesData.length === 0) return;

  // Always update calibration stats using the first file (ensures stats are up-to-date)
  // updatePlot(allFilesData[0].spectrumData); // OLD LINE - Always uses the first file

  // Use the selected file's spectrum data to update the main plot
  if (allFilesData[displayedFileIndex]) {
    updatePlot(allFilesData[displayedFileIndex].spectrumData);
  }

  // Always update archaeological tab's calibration charts
  updateArchaeoPlot();
}

let archaeologicalFiles = [];
let selectedArchaeoIndex = 0;

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

    selectedArchaeoIndex = 0;
    selector.value = selectedArchaeoIndex;
    // Fix: ensure calibration stats are up-to-date before updating archaeological tab
    if (allFilesData.length > 0) {
      updateDisplayedFile(); // This will update both tabs and calibration
    } else {
      updateArchaeoPlot();
    }
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

  // Use experimental controls instead of archaeo ones
  const method = document.getElementById("analysisMethod").value;

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

  // Calculate division point for broad intervals
  const divisionPoint = getDivisionPoint(
    spectrumData.wavelengths,
    spectrumData.intensities,
    intervals,
    method
  );

  // Use broad intervals only for Voigt, otherwise use user intervals
  let plotIntervals;
  if (method === "voigt") {
    plotIntervals = [
      { start: 1150, end: divisionPoint },
      { start: divisionPoint, end: 1700 }
    ];
  } else {
    plotIntervals = intervals;
  }

  const { topPeaks, fittedCurves } = findTopPeaks(
    spectrumData.wavelengths,
    spectrumData.intensities,
    plotIntervals,
    widthPercentages,
    method,
    "archaeoSpectrumChart"
  );

  // Create the main spectrum chart
  const ctx = document.getElementById("archaeoSpectrumChart").getContext("2d");
  if (window.myCharts && window.myCharts["archaeoSpectrumChart"]) {
    window.myCharts["archaeoSpectrumChart"].destroy();
  }

  plotSpectrum(
    spectrumData,
    topPeaks,
    fittedCurves,
    intervals,
    widthPercentages,
    method,
    "archaeoSpectrumChart",
  );

  // Display derived temperatures table
  displayDerivedTemperatures(
    archaeologicalFiles.map(fileData => {
      const { topPeaks } = findTopPeaks(
        fileData.spectrumData.wavelengths,
        fileData.spectrumData.intensities,
        plotIntervals,
        widthPercentages,
        method,
        "archaeoSpectrumChart"
      );

      const d = topPeaks[0] || {};
      const g = topPeaks[1] || {};
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
      };
    }),
    method,
    dBandWidthHeight,
    gBandWidthHeight
  );

  // Always update calibration charts if we have experimental data
  if (allFilesData.length > 0) {
    const resultsByMethod = {
      simple: [],
      voigt: [],
    };

    allFilesData.forEach((fileData) => {
      // Skip if file is not included
      if (!includedSamples.has(fileData.name)) return;

      ["simple", "voigt"].forEach((method) => {
        const divisionPoint = getDivisionPoint(
          fileData.spectrumData.wavelengths,
          fileData.spectrumData.intensities,
          intervals,
          method
        );

        let plotIntervals;
        if (method === "voigt") {
          plotIntervals = [
            { start: 1150, end: divisionPoint },
            { start: divisionPoint, end: 1700 }
          ];
        } else {
          plotIntervals = intervals;
        }

        const { topPeaks } = findTopPeaks(
          fileData.spectrumData.wavelengths,
          fileData.spectrumData.intensities,
          plotIntervals,
          widthPercentages,
          method,
        );

        const d = topPeaks[0] || {};
        const g = topPeaks[1] || {};
        const hdHg = d.height && g.height && g.height !== 0 ? d.height / g.height : null;
        const wdWg = d.width && g.width && g.width !== 0 ? d.width / g.width : null;

        const match = fileData.name.match(/(^|[^0-9])\d{3,4}(?![0-9])/);
        const temperature = match ? `${match[0].replace(/[^0-9]/g, "")}` : "N/A";

        resultsByMethod[method].push({
          name: fileData.name,
          temperature,
          hdHg,
          dWidth: d.width || null,
          gWidth: g.width || null,
          wdWg,
        });
      });
    });

    // Generate calibration charts using Voigt method data
    const container = document.getElementById('archaeoCalibrationPlots');
    if (container) {
      container.innerHTML = '';
      generateCalibrationCharts(resultsByMethod.voigt, "voigt");
    }
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
          <th style="padding: 5px; text-align: left;">Name</th>
          <th style="padding: 5px; text-align: center;">HD/HG</th>
          <th style="padding: 5px; text-align: center;">D Peak (cm⁻¹)</th>
          <th style="padding: 5px; text-align: center;">G Peak (cm⁻¹)</th>
          <th>D width ${dBandWidthHeight + "%H"}</th>
          <th>G width ${gBandWidthHeight + "%H"}</th>
          <th style="padding: 5px; text-align: center;">WD/WG</th>
          <th style="padding: 5px; text-align: center;">HD/HG Temp (°C)</th>
          <th style="padding: 5px; text-align: center;">HD/HG Range (°C)</th>
          <th style="padding: 5px; text-align: center;">D Width Temp (°C)</th>
          <th style="padding: 5px; text-align: center;">D Width Range (°C)</th>
          <th style="padding: 5px; text-align: center;">G Width Temp (°C)</th>
          <th style="padding: 5px; text-align: center;">G Width Range (°C)</th>
          <th style="padding: 5px; text-align: center;">WD/WG Temp (°C)</th>
          <th style="padding: 5px; text-align: center;">WD/WG Range (°C)</th>
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
    const dWidth = file.dWidth != null ? file.dWidth.toFixed(2) : "N/A";
    const gWidth = file.gWidth != null ? file.gWidth.toFixed(2) : "N/A";
    const wdWg = file.wdWg != null ? file.wdWg.toFixed(2) : "N/A";
    const dPeak = file.dPeak != null ? file.dPeak.toFixed(1) : "N/A";
    const gPeak = file.gPeak != null ? file.gPeak.toFixed(1) : "N/A";

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
        <td style="padding: 5px;">${file.name}</td>
        <td style="padding: 5px; text-align: center;">${hdHg}</td>
        <td style="padding: 5px; text-align: center;">${dPeak}</td>
        <td style="padding: 5px; text-align: center;">${gPeak}</td>
        <td style="padding: 5px; text-align: center;">${dWidth}</td>
        <td style="padding: 5px; text-align: center;">${gWidth}</td>
        <td style="padding: 5px; text-align: center;">${wdWg}</td>
        <td style="padding: 5px; text-align: center;">${derivedTemps[0].best}</td>
        <td style="padding: 5px; text-align: center;">${derivedTemps[0].range}</td>
        <td style="padding: 5px; text-align: center;">${derivedTemps[1].best}</td>
        <td style="padding: 5px; text-align: center;">${derivedTemps[1].range}</td>
        <td style="padding: 5px; text-align: center;">${derivedTemps[2].best}</td>
        <td style="padding: 5px; text-align: center;">${derivedTemps[2].range}</td>
        <td style="padding: 5px; text-align: center;">${derivedTemps[3].best}</td>
        <td style="padding: 5px; text-align: center;">${derivedTemps[3].range}</td>
      </tr>
    `;
  });
  
  // Append the table container
  tableDiv.appendChild(tableContainer);
}

function updatePeak1Inputs() {
  const mode = document.getElementById("peak1Mode").value;
  const peak1StartInput = document.getElementById("peak1Start");
  const peak1EndInput = document.getElementById("peak1End");
  const peak2StartInput = document.getElementById("peak2Start");
  const peak2EndInput = document.getElementById("peak2End");

  if (mode === "broad") {
    peak1StartInput.value = 1300;
    peak1EndInput.value = 1450;
    peak2StartInput.value = 1585;
    peak2EndInput.value = 1620;
  } else if (mode === "conventional") {
    peak1StartInput.value = 1349;
    peak1EndInput.value = 1352;
    peak2StartInput.value = 1590;
    peak2EndInput.value = 1610;
  }

  // 👇 Apply default 50% height when using Voigt method
  const analysisMethod = document.getElementById("analysisMethod").value;
  if (analysisMethod === "voigt") {
    document.getElementById("dBandWidthHeight").value = 50;
    document.getElementById("gBandWidthHeight").value = 50;
  }

  if (allFilesData.length > 0) {
    updateDisplayedFile();
  }
}

function updatePlot(spectrumData) {
  if (!spectrumData || allFilesData.length === 0) return;

  const currentMethod = document.getElementById("analysisMethod").value;

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
  };

  allFilesData.forEach((fileData) => {
    ["simple", "voigt"].forEach((method) => {
      // Calculate division point for this file
      const divisionPoint = getDivisionPoint(
        fileData.spectrumData.wavelengths,
        fileData.spectrumData.intensities,
        intervals,
        method
      );

      // Use broad intervals for Voigt, user intervals for Simple
      let plotIntervals;
      if (method === "voigt") {
        plotIntervals = [
          { start: 1150, end: divisionPoint },
          { start: divisionPoint, end: 1700 }
        ];
      } else {
        plotIntervals = intervals;
      }

      const { topPeaks } = findTopPeaks(
        fileData.spectrumData.wavelengths,
        fileData.spectrumData.intensities,
        plotIntervals,
        widthPercentages,
        method,
      );

      const d = topPeaks[0] || {};
      const g = topPeaks[1] || {};
      const hdHg =
        d.height && g.height && g.height !== 0 ? d.height / g.height : null;
      const wdWg =
        d.width && g.width && g.width !== 0 ? d.width / g.width : null;

      const match = fileData.name.match(/(^|[^0-9])\d{3,4}(?![0-9])/);
      const temperature = match ? `${match[0].replace(/[^0-9]/g, "")}` : "N/A";

      resultsByMethod[method].push({
        name: fileData.name,
        temperature,
        hdHg,
        dWidth: d.width || null,
        gWidth: g.width || null,
        wdWg,
      });
    });
  });

  // Calculate divisionPoint for the current spectrum
  const divisionPoint = getDivisionPoint(
    spectrumData.wavelengths,
    spectrumData.intensities,
    intervals,
    currentMethod
  );

  // Use broad intervals only for Voigt, otherwise use user intervals
  let plotIntervals;
  if (currentMethod === "voigt") {
    plotIntervals = [
      { start: 1150, end: divisionPoint },
      { start: divisionPoint, end: 1700 }
    ];
  } else {
    plotIntervals = intervals;
  }

  const { topPeaks, fittedCurves } = findTopPeaks(
    spectrumData.wavelengths,
    spectrumData.intensities,
    plotIntervals,
    widthPercentages,
    currentMethod,
    "spectrumChart"
  );
  plotSpectrum(
    spectrumData,
    topPeaks,
    fittedCurves,
    intervals,
    widthPercentages,
    currentMethod,
  );

  // Display normal peak info table
  displayPeakInfo(
    resultsByMethod[currentMethod],
    currentMethod,
    dBandWidthHeight,
    gBandWidthHeight,
    resultsByMethod
  );

  // Compare results from both methods
  compareMethods(resultsByMethod.simple, resultsByMethod.voigt);
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

  // Only draw the solid fit lines for the fitted curves
  if (showFitting && method === "voigt" && fittedCurves.length > 0) {
    fittedCurves.forEach((curve, index) => {
      datasets.push({
        label: `Fitted Peak ${index + 1}`,
        data: curve.x.map((x, i) => ({ x, y: curve.y[i] })),
        borderColor: index === 0 ? "red" : "green",
        borderWidth: 2,
        pointRadius: 0,
        showLine: true,
        tension: 0,
        order: 1,
      });
    });
  }

  if (showSmoothing && method === "voigt") {
    const smoothed = savitzkyGolaySmooth(spectrumData.intensities, 11, 2);
    datasets.push({
      label: "Smoothed (SG)",
      data: spectrumData.wavelengths.map((x, i) => ({
        x,
        y: smoothed[i],
      })),
      borderColor: "rgba(0,0,0,1)",
      borderWidth: 2,
      pointRadius: 0,
      showLine: true,
      tension: 0,
      fill: false,
      order: 1,
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

  topPeaks.forEach((peak, index) => {
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
          `${index === 0 ? "D" : "G"} width: ${(peak.width).toFixed(1)}`
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
        `${index === 0 ? "D" : "G"}: ${peak.wavelength.toFixed(1)}`
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
          min: Math.min(...spectrumData.wavelengths),
          max: Math.max(...spectrumData.wavelengths),
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
  let processedIntensities = [...intensities];
  let fittedCurves = [];

  if (method === "voigt") {
    processedIntensities = savitzkyGolaySmooth(intensities, 11, 2);
  }

  // First find peaks using user intervals
  const approximatePeaks = intervals.map(({ start, end }, intervalIndex) => {
    const filteredIndices = wavelengths
      .map((wavelength, index) => ({ wavelength, index }))
      .filter((point) => point.wavelength >= start && point.wavelength <= end)
      .map((point) => point.index);

    if (filteredIndices.length === 0) return null;

    const filteredPoints = filteredIndices.map((idx) => ({
      wavelength: wavelengths[idx],
      intensity:
        method === "voigt" ? processedIntensities[idx] : intensities[idx],
    }));

    const peak = filteredPoints.reduce((max, point) =>
      point.intensity > max.intensity ? point : max,
    );
    return peak.wavelength;
  });

  // Calculate division point for broad intervals
  let divisionPoint = 1500;
  if (
    approximatePeaks.length === 2 &&
    approximatePeaks[0] &&
    approximatePeaks[1]
  ) {
    const dPeakCenter = approximatePeaks[0];
    const gPeakCenter = approximatePeaks[1];

    if (dPeakCenter < gPeakCenter) {
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

        const minDistance = 50;
        divisionPoint = Math.max(
          dPeakCenter + minDistance,
          Math.min(divisionPoint, gPeakCenter - minDistance),
        );
      }
    }
  }

  // Define broad intervals for fitting only
  const broadIntervals = [
    { start: 1150, end: divisionPoint },
    { start: divisionPoint, end: 1700 }
  ];

  // Find and fit peaks
  const peaks = intervals.map((interval, intervalIndex) => {
    // 1. Find peak center in user interval
    const filteredIndices = wavelengths
      .map((wavelength, index) => ({ wavelength, index }))
      .filter(
        (point) =>
          point.wavelength >= interval.start &&
          point.wavelength <= interval.end
      )
      .map((point) => point.index);

    if (filteredIndices.length === 0) return null;

    // Find peak center
    const xUser = filteredIndices.map((idx) => wavelengths[idx]);
    const yUser = filteredIndices.map((idx) =>
      method === "voigt" ? processedIntensities[idx] : intensities[idx]
    );
    let peakCenter = xUser[yUser.indexOf(Math.max(...yUser))];

    if (method === "voigt") {
      // 2. Fit using broad interval data
      const broad = broadIntervals[intervalIndex];
      const broadIndices = wavelengths
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => w >= broad.start && w <= broad.end)
        .map(({ i }) => i);
      const xBroad = broadIndices.map(i => wavelengths[i]);
      const yBroad = broadIndices.map(i => processedIntensities[i]);
      const fitResult = fitPseudoVoigt(xBroad, yBroad, intervalIndex, canvasId);
      const { A, mu, sigma, gamma, eta, fwhm, leftX, rightX } = fitResult;

      // Generate fitted curve over the full range 1000-1900 for both D and G
      const fullX = [];
      for (let x = 1000; x <= 1900; x += 1) {
        fullX.push(x);
      }
      const fullY = fullX.map((x) =>
        pseudoVoigt(x, A, mu, sigma, gamma, eta)
      );
      fittedCurves.push({ x: fullX, y: fullY });

      return { wavelength: mu, intensity: A, fwhm, leftX, rightX };
    } else {
      // Simple method: fit and width in user interval
      const filteredPoints = filteredIndices.map((idx) => ({
        wavelength: wavelengths[idx],
        intensity: intensities[idx],
      }));

      const peak = filteredPoints.reduce((max, point) =>
        point.intensity > max.intensity ? point : max,
      );
      return peak;
    }
  });

  const topPeaks = peaks
    .filter((peak) => peak !== null)
    .map((peak, index) => {
      if (method === "voigt") {
        const percentage = widthPercentages[index];
        const targetHeight = peak.intensity * percentage;

        return {
          wavelength: peak.wavelength,
          intensity: peak.intensity,
          height: peak.intensity,
          width: peak.rightX - peak.leftX,
          widthLeftX: peak.leftX,
          widthRightX: peak.rightX,
          widthHeight: targetHeight,
        };
      } else {
        const percentage = widthPercentages[index];
        const widthData = calculatePeakWidth(
          wavelengths,
          intensities,
          peak.wavelength,
          peak.intensity,
          percentage,
          index,
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
      }
    });

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
  const etaGuess = 0.7;

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
    <table border="1" style="border-collapse: collapse; width: 100%; max-width: 800px; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 5px; text-align: center;">
            <input type="checkbox" id="selectAllCheckbox" ${areAllSelected ? 'checked' : ''}>
          </th>
          <th style="padding: 5px; text-align: left;">Name</th>
          <th style="padding: 5px; text-align: center;">Temperature</th>
          <th style="padding: 5px; text-align: center;">D Peak (cm⁻¹)</th>
          <th style="padding: 5px; text-align: center;">G Peak (cm⁻¹)</th>
          <th style="padding: 5px; text-align: center;">HD/HG</th>
          <th>D width ${dBandWidthHeight + "%H"}</th>
          <th>G width ${gBandWidthHeight + "%H"}</th>
          <th style="padding: 5px; text-align: center;">WD/WG</th>
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
    const dWidth = file.dWidth != null ? file.dWidth.toFixed(2) : "N/A";
    const gWidth = file.gWidth != null ? file.gWidth.toFixed(2) : "N/A";
    const wdWg = file.wdWg != null ? file.wdWg.toFixed(2) : "N/A";
    const isChecked = includedSamples.has(file.name);

    // Find the corresponding file data from allFilesData
    const fileData = allFilesData.find(f => f.name === file.name);
    if (!fileData) return;

    // Get the user intervals
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

    // Calculate division point
    const divisionPoint = getDivisionPoint(
      fileData.spectrumData.wavelengths,
      fileData.spectrumData.intensities,
      intervals,
      method
    );

    // Use broad intervals for Voigt, user intervals for Simple
    let plotIntervals;
    if (method === "voigt") {
      plotIntervals = [
        { start: 1150, end: divisionPoint },
        { start: divisionPoint, end: 1700 }
      ];
    } else {
      plotIntervals = intervals;
    }

    // Get peak wavelengths from the topPeaks array using the same intervals as the plot
    const { topPeaks } = findTopPeaks(
      fileData.spectrumData.wavelengths,
      fileData.spectrumData.intensities,
      plotIntervals,
      [dBandWidthHeight / 100, gBandWidthHeight / 100],
      method
    );

    const dPeakWavelength = topPeaks[0] ? topPeaks[0].wavelength.toFixed(1) : "N/A";
    const gPeakWavelength = topPeaks[1] ? topPeaks[1].wavelength.toFixed(1) : "N/A";

    // Set individual checkbox state here
    tbodyElement.innerHTML += `
      <tr>
        <td style="padding: 5px; text-align: center;">
          <input type="checkbox" 
                 class="sample-checkbox" 
                 data-sample-name="${file.name}" 
                 ${isChecked ? 'checked' : ''}>
        </td>
        <td style="padding: 5px;">${file.name}</td>
        <td style="padding: 5px; text-align: center;">${temp}</td>
        <td style="padding: 5px; text-align: center;">${dPeakWavelength}</td>
        <td style="padding: 5px; text-align: center;">${gPeakWavelength}</td>
        <td style="padding: 5px; text-align: center;">${hdHg}</td>
        <td style="padding: 5px; text-align: center;">${dWidth}</td>
        <td style="padding: 5px; text-align: center;">${gWidth}</td>
        <td style="padding: 5px; text-align: center;">${wdWg}</td>
      </tr>
    `;

    // Only include in statistics if sample is checked
    if (isChecked) {
      if (temp !== "N/A") {
        if (file.hdHg != null)
          individualData.hdHg.push({ name: file.name, temperature: temp, value: file.hdHg });
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

  // Create stats container
  const statsContainer = document.createElement('div');
  statsContainer.style.cssText = 'margin-top: 20px;';

  // Get the other method's data based on current method
  const otherMethodData = method === 'simple' ? resultsByMethod.voigt : resultsByMethod.simple;
  const otherMethodName = method === 'simple' ? 'Voigt' : 'Simple';
  const currentMethodName = method === 'simple' ? 'Simple' : 'Voigt';

  // Create and append statistical plots (based on updated individualData)
  const hdHgPlot = generateStatsPlot(individualData.hdHg, "HD/HG Ratio", 
    otherMethodData ? otherMethodData.map(d => ({ name: d.name, temperature: d.temperature, value: d.hdHg })) : null,
    currentMethodName, otherMethodName);
  const dWidthPlot = generateStatsPlot(individualData.dWidth, "D Width", 
    otherMethodData ? otherMethodData.map(d => ({ name: d.name, temperature: d.temperature, value: d.dWidth })) : null,
    currentMethodName, otherMethodName);
  const gWidthPlot = generateStatsPlot(individualData.gWidth, "G Width", 
    otherMethodData ? otherMethodData.map(d => ({ name: d.name, temperature: d.temperature, value: d.gWidth })) : null,
    currentMethodName, otherMethodName);
  const wdWgPlot = generateStatsPlot(individualData.wdWg, "WD/WG Ratio", 
    otherMethodData ? otherMethodData.map(d => ({ name: d.name, temperature: d.temperature, value: d.wdWg })) : null,
    currentMethodName, otherMethodName);

  statsContainer.appendChild(hdHgPlot);
  statsContainer.appendChild(dWidthPlot);
  statsContainer.appendChild(gWidthPlot);
  statsContainer.appendChild(wdWgPlot);

  // Append the stats container to peakInfoDiv
  peakInfoDiv.appendChild(statsContainer);

  // Add event listeners after elements are in the DOM
  setTimeout(() => {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const sampleCheckboxes = document.querySelectorAll('.sample-checkbox');

    // Listener for "Select All" checkbox
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            if (isChecked) {
                sampleNames.forEach(name => includedSamples.add(name));
            } else {
                sampleNames.forEach(name => includedSamples.delete(name));
            }
            updateDisplayedFile(); // Trigger re-render
            // Also update archaeological tab if it's visible
            if (document.getElementById("archaeologicalSection").style.display !== "none") {
                updateArchaeoPlot();
            }
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
        updateDisplayedFile(); // Trigger re-render
        // Also update archaeological tab if it's visible
        if (document.getElementById("archaeologicalSection").style.display !== "none") {
            updateArchaeoPlot();
        }
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
          <th>Parameter</th>
          <th>Mean (Simple)</th>
          <th>Mean (Voigt)</th>
          <th>Mean Δ</th>
          <th>ST.DEV Δ</th>
          <th>ST.ERROR Δ</th>
          <th>t-stat</th>
          <th>p-value</th>
          <th>Significant?</th>
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
    x: parseFloat(temp),
    y: values.reduce((a, b) => a + b) / values.length
  }));

  const stdDevs = Object.entries(groupedData).map(([temp, values]) => {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squareDiffs.reduce((a, b) => a + b) / values.length;
    return {
      x: parseFloat(temp),
      y: Math.sqrt(variance)
    };
  });

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
  }

  // Sort data points by temperature for proper line connection
  means.sort((a, b) => a.x - b.x);
  stdDevs.sort((a, b) => a.x - b.x);
  if (otherMethodStats) {
    otherMethodStats.means.sort((a, b) => a.x - b.x);
    otherMethodStats.stdDevs.sort((a, b) => a.x - b.x);
  }

  // Create the plots container
  const plotsContainer = document.createElement('div');
  plotsContainer.style.cssText = 'margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px;';
  
  // Add title
  const title = document.createElement('h3');
  title.textContent = method;
  plotsContainer.appendChild(title);

  // Create flex container for plots
  const flexContainer = document.createElement('div');
  flexContainer.style.cssText = 'display: flex; gap: 40px; flex-wrap: wrap;';
  
  // Create table container
  const tableContainer = document.createElement('div');
  tableContainer.style.cssText = 'flex: 0 1 300px;';
  
  // Create and populate table
  const table = document.createElement('table');
  table.style.cssText = 'border-collapse: collapse; font-size: 14px; font-family: Arial; width: 100%;';
  table.setAttribute('border', '1');
  
  // Add table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background-color: #f2f2f2;">
      <th>Temp</th>
      <th>Avg</th>
      <th>ST.DEV</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Add table body
  const tbody = document.createElement('tbody');
  means.forEach((point, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="text-align:center">${point.x}</td>
      <td style="text-align:center">${point.y.toFixed(3)}</td>
      <td style="text-align:center">${stdDevs[index].y.toFixed(3)}</td>
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

  // Create the charts after a short delay to ensure the canvas elements are ready
  setTimeout(() => {
    const chartId = `${method.replace(/[^a-zA-Z0-9]/g, '')}_Chart`;
    const comparisonChartId = `${method.replace(/[^a-zA-Z0-9]/g, '')}_ComparisonChart`;

    const ctx = document.getElementById(chartId).getContext('2d');
    const ctxComparison = document.getElementById(comparisonChartId).getContext('2d');

    // Destroy previous chart instances if they exist
    if (window.statsCharts[chartId]) {
      window.statsCharts[chartId].destroy();
    }
    if (window.statsCharts[comparisonChartId]) {
      window.statsCharts[comparisonChartId].destroy();
    }

    // Create and store new chart instances
    window.statsCharts[chartId] = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Individual',
            data: filteredData.map(point => ({
              x: parseFloat(point.temperature),
              y: point.value
            })),
            backgroundColor: 'blue',
            pointRadius: 2,
            pointHoverRadius: 3,
            showLine: false,
          },
          {
            label: `${currentMethodName} Average ± SD`,
            data: means,
            borderColor: 'red',
            backgroundColor: 'red',
            pointRadius: 4,
            showLine: true,
            tension: 0.3,
            errorBars: {
              y: {
                array: stdDevs.map(point => point.y),
                color: 'rgba(255, 0, 0, 0.5)',
                width: 2
              }
            }
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Temperature' },
          },
          y: {
            type: 'linear',
            title: { display: true, text: 'Value' },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                if (context.dataset.label === `${currentMethodName} Average ± SD`) {
                  const index = context.dataIndex;
                  return [
                    `Average: ${means[index].y.toFixed(3)}`,
                    `± SD: ${stdDevs[index].y.toFixed(3)}`
                  ];
                }
                // For individual points, show name and value
                const pointData = filteredData[context.dataIndex];
                if (pointData) {
                  return `${pointData.name}: ${pointData.value.toFixed(3)}`;
                }
                return `Value: ${context.parsed.y.toFixed(3)}`; // Fallback
              }
            }
          }
        }
      },
    });
    window.statsCharts[chartId].resize();

    // Create comparison chart if other method data is available
    if (otherMethodStats) {
      window.statsCharts[comparisonChartId] = new Chart(ctxComparison, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: `${currentMethodName} Average`,
              data: means,
              borderColor: 'red',
              backgroundColor: 'red',
              pointRadius: 4,
              showLine: true,
              tension: 0.3,
              errorBars: {
                y: {
                  array: stdDevs.map(point => point.y),
                  color: 'rgba(255, 0, 0, 0.5)',
                  width: 2
                }
              }
            },
            {
              label: `${otherMethodName} Average`,
              data: otherMethodStats.means,
              borderColor: 'green',
              backgroundColor: 'green',
              pointRadius: 4,
              showLine: true,
              tension: 0.3,
              errorBars: {
                y: {
                  array: otherMethodStats.stdDevs.map(point => point.y),
                  color: 'rgba(0, 128, 0, 0.5)',
                  width: 2
                }
              }
            }
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'linear',
              title: { display: true, text: 'Temperature' },
            },
            y: {
              type: 'linear',
              title: { display: true, text: 'Value' },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const index = context.dataIndex;
                  const isCurrentMethod = context.dataset.label.includes(currentMethodName);
                  const meanValue = isCurrentMethod ? means[index].y : otherMethodStats.means[index].y;
                  const stdDevValue = isCurrentMethod ? stdDevs[index].y : otherMethodStats.stdDevs[index].y;
                  return [
                    `${context.dataset.label}: ${meanValue.toFixed(3)}`,
                    `± SD: ${stdDevValue.toFixed(3)}`
                  ];
                }
              }
            }
          }
        },
      });
      window.statsCharts[comparisonChartId].resize();
    }
  }, 100);

  return plotsContainer;
}

function getDivisionPoint(wavelengths, intensities, intervals, method) {
  // Find D and G peak centers in user intervals
  const processedIntensities = (method === "voigt")
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

function generateCalibrationCharts(data, method) {
  if (!data || data.length === 0) return;

  // Filter data to only include checked samples
  const filteredData = data.filter(point => includedSamples.has(point.name));

  // Group data by temperature
  const groupedData = {};
  filteredData.forEach(point => {
    if (!groupedData[point.temperature]) {
      groupedData[point.temperature] = [];
    }
    groupedData[point.temperature].push(point);
  });

  // Calculate means and standard deviations for each parameter
  const parameters = ['hdHg', 'dWidth', 'gWidth', 'wdWg'];
  const stats = {};
  
  parameters.forEach(param => {
    stats[param] = Object.entries(groupedData).map(([temp, points]) => {
      const values = points.map(p => p[param]).filter(v => v != null);
      if (values.length === 0) return null;
      
      const mean = values.reduce((a, b) => a + b) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      );
      
      return {
        x: parseFloat(temp),
        y: mean,
        stdDev
      };
    }).filter(point => point != null);
  });

  // Make stats globally accessible for archaeological temperature derivation
  window.calibrationStats = stats;

  // Create container for all plots
  const container = document.getElementById('archaeoCalibrationPlots');
  if (!container) return;
  container.innerHTML = '';

  // Create a flex container for the grid layout with fixed height
  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; height: 850px;';
  container.appendChild(gridContainer);

  // Create individual chart containers
  parameters.forEach((param, index) => {
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = 'flex: 0 1 calc(50% - 10px); min-width: 300px; height: 400px; margin-bottom: 20px;';
    
    const title = document.createElement('h4');
    title.style.cssText = 'text-align: center; margin: 0 0 10px 0';
    title.textContent = param === 'hdHg' ? 'HD/HG Ratio' :
                       param === 'dWidth' ? 'D Width' :
                       param === 'gWidth' ? 'G Width' : 'WD/WG Ratio';
    
    const canvas = document.createElement('canvas');
    canvas.id = `archaeoCalibration_${param}`;
    canvas.style.cssText = 'width: 100%; height: 350px;';
    
    chartContainer.appendChild(title);
    chartContainer.appendChild(canvas);
    gridContainer.appendChild(chartContainer);

    // Prepare archaeological overlay points
    let archOverlayPoints = [];
    if (window.archaeologicalFiles && window.archaeologicalFiles.length > 0) {
      // For each archaeological sample, get the value for this parameter and find all derived temperatures
      const statsArr = stats[param];
      const temps = statsArr.map(pt => pt.x);
      const means = statsArr.map(pt => pt.y);
      const stds = statsArr.map(pt => pt.stdDev);
      (window.archaeologicalFiles || []).forEach(fileData => {
        const name = fileData.name;
        let hdHg = null, dWidth = null, gWidth = null, wdWg = null;
        // Try to calculate using the same logic as displayDerivedTemperatures
        if (fileData.spectrumData && fileData.spectrumData.wavelengths && fileData.spectrumData.intensities) {
          // Use the same intervals and method as in updateArchaeoPlot
          const method = document.getElementById("analysisMethod").value;
          const dBandWidthHeight = parseFloat(document.getElementById("dBandWidthHeight").value);
          const gBandWidthHeight = parseFloat(document.getElementById("gBandWidthHeight").value);
          const widthPercentages = [dBandWidthHeight / 100, gBandWidthHeight / 100];
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
          const divisionPoint = getDivisionPoint(
            fileData.spectrumData.wavelengths,
            fileData.spectrumData.intensities,
            intervals,
            method
          );
          let plotIntervals;
          if (method === "voigt") {
            plotIntervals = [
              { start: 1150, end: divisionPoint },
              { start: divisionPoint, end: 1700 }
            ];
          } else {
            plotIntervals = intervals;
          }
          const { topPeaks } = findTopPeaks(
            fileData.spectrumData.wavelengths,
            fileData.spectrumData.intensities,
            plotIntervals,
            widthPercentages,
            method,
            "archaeoSpectrumChart"
          );
          const d = topPeaks[0] || {};
          const g = topPeaks[1] || {};
          hdHg = d.height && g.height && g.height !== 0 ? d.height / g.height : null;
          dWidth = d.width || null;
          gWidth = g.width || null;
          wdWg = d.width && g.width && g.width !== 0 ? d.width / g.width : null;
        }
        let archValue = null;
        if (param === 'hdHg') archValue = hdHg;
        else if (param === 'dWidth') archValue = dWidth;
        else if (param === 'gWidth') archValue = gWidth;
        else if (param === 'wdWg') archValue = wdWg;
        if (archValue == null || isNaN(archValue)) return;

        // Check if the archaeological value is out of range of the calibration curve (even with SD)
        const statsArr = stats[param];
        const temps = statsArr.map(pt => pt.x);
        const means = statsArr.map(pt => pt.y);
        const stds = statsArr.map(pt => pt.stdDev);
        const minY = Math.min(...statsArr.map(pt => pt.y - pt.stdDev));
        const maxY = Math.max(...statsArr.map(pt => pt.y + pt.stdDev));
        const isOutOfRange = archValue < minY || archValue > maxY;

        // Find the closest in-range temperature (edge of calibration curve)
        let closestTemp = null;
        if (isOutOfRange) {
          if (archValue < minY) {
            closestTemp = temps[0];
          } else {
            closestTemp = temps[temps.length - 1];
          }
        }

        // Find all derived temperatures for this value
        const results = findTemperaturesForValue(temps, means, stds, archValue);
        if (isOutOfRange) {
          // For out-of-range points, plot at the closest temperature
          archOverlayPoints.push({
            x: closestTemp,
            y: archValue,
            name,
            isOutOfRange: true,
            closestTemp
          });
        } else if (results.length > 0) {
          // For in-range points, plot at all derived temperatures
          results.forEach(r => {
            archOverlayPoints.push({
              x: r.temperature,
              y: archValue,
              name,
              isOutOfRange: false,
              closestTemp: null
            });
          });
        }
      });
    }

    // Prepare data for mean line and SD bands
    const meanCalibrationData = stats[param].map(point => ({
      x: point.x,
      y: point.y
    }));
    const sdValuesForErrorBars = stats[param].map(point => point.stdDev);

    const lowerBandData = stats[param].map(point => ({ x: point.x, y: point.y - point.stdDev }));
    const upperBandData = stats[param].map(point => ({ x: point.x, y: point.y + point.stdDev }));

    // Compute min/max Y to include full SD bars
    let minY = Math.min(...stats[param].map(point => point.y - point.stdDev));
    let maxY = Math.max(...stats[param].map(point => point.y + point.stdDev));

    // Add padding to Y-axis range to accommodate out-of-range points
    const yRange = maxY - minY;
    minY = minY - yRange * 0.1;  // Add 10% padding below
    maxY = maxY + yRange * 0.1;  // Add 10% padding above

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
              return context.raw.isOutOfRange ? 'white' : 'blue';
            },
            borderColor: 'blue',
            pointRadius: 7,
            showLine: false,
            pointStyle: function(context) {
              return context.raw.isOutOfRange ? 'circle' : 'rectRot';
            },
            borderDash: function(context) {
              return context.raw.isOutOfRange ? [5, 5] : [];
            },
            borderWidth: 2,
            hoverRadius: 9,
            parsing: false, // Assuming this is still needed from previous context
            datalabels: { // This plugin might not be active, but keeping structure
              align: 'top',
              anchor: 'end',
              color: 'blue',
              font: { weight: 'bold' },
              formatter: function(value, context) {
                return value.name || '';
              }
            },
            order: 0 // Drawn on top of everything
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
              title: { display: true, text: title.textContent },
              min: minY,
              max: maxY
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  if (context.dataset.label === 'Archaeological Sample(s)') {
                    if (context.raw.isOutOfRange) {
                      return `${context.raw.name || ''}: Out of range (closest: ${context.raw.closestTemp.toFixed(0)}°C)`;
                    }
                    return `${context.raw.name || ''}: (${context.raw.x.toFixed(0)}, ${context.raw.y.toFixed(2)})`;
                  }
                  // Tooltip for points on the mean line (original dataset)
                  if (context.dataset.label === 'Calibration Mean') { // Matches new label
                     const index = context.dataIndex;
                     // Ensure stats[param][index] is valid before accessing
                     if (stats[param] && stats[param][index]) {
                        return [
                          `Mean: ${stats[param][index].y.toFixed(3)} (Temp: ${stats[param][index].x.toFixed(0)})`,
                          `± SD: ${stats[param][index].stdDev.toFixed(3)}`
                        ];
                     }
                     return `Mean: ${context.parsed.y.toFixed(3)}`; // Fallback
                  }
                  // Tooltip for the band itself (upper SD line hover)
                  if (context.dataset.label === 'Calibration Range (Mean ± SD)') {
                    const index = context.dataIndex;
                     // Ensure stats[param][index] is valid before accessing
                    if (stats[param] && stats[param][index]) {
                        return `Upper SD: ${(stats[param][index].y + stats[param][index].stdDev).toFixed(3)} (Temp: ${stats[param][index].x.toFixed(0)})`;
                    }
                    return `Upper SD: ${context.parsed.y.toFixed(3)}`; // Fallback
                  }
                  // Fallback tooltip for other cases (e.g. lower bound if made visible)
                  const val = context.dataset.data[context.dataIndex];
                  if (val && typeof val.x !== 'undefined' && typeof val.y !== 'undefined') {
                    return `${context.dataset.label || 'Data'}: (${val.x.toFixed(0)}, ${val.y.toFixed(3)})`;
                  }
                  return `${context.dataset.label || 'Data'}: Y-value ${context.parsed.y.toFixed(3)}`;
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
