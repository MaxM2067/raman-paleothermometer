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

    // Only trigger the update button click
    document.getElementById("updateButton").click();
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
});

document.getElementById("dBandWidthHeight").addEventListener("input", () => {
  updateDisplayedFile();
});

document.getElementById("gBandWidthHeight").addEventListener("input", () => {
  updateDisplayedFile();
});

function updateDisplayedFile() {
  displayedFileIndex = parseInt(document.getElementById("fileSelector").value);
  if (allFilesData.length === 0 || !allFilesData[displayedFileIndex]) return;

  const spectrumData = allFilesData[displayedFileIndex].spectrumData;
  console.log(
    `Displaying file ${displayedFileIndex}:`,
    allFilesData[displayedFileIndex].name,
  );
  console.log(
    `Spectrum data intensities (first 5):`,
    spectrumData.intensities.slice(0, 5),
  );
  updatePlot(spectrumData);

  // Update archaeological tab's calibration charts if it's visible
  if (document.getElementById("archaeologicalSection").style.display !== "none") {
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

    const resultsByMethod = {
      simple: [],
      voigt: [],
    };

    allFilesData.forEach((fileData) => {
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

    // Update calibration charts with Voigt method data
    generateCalibrationCharts(resultsByMethod.voigt, "voigt");
  }
}

let archaeologicalFiles = [];
let selectedArchaeoIndex = 0;

document.getElementById("archaeoFileInput").addEventListener("change", (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  archaeologicalFiles = [];
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

    loaded.forEach((f, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = f.name;
      selector.appendChild(opt);
    });

    selectedArchaeoIndex = 0;
    selector.value = 0;
    updateArchaeoPlot();
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

  // Generate calibration charts using Voigt method data from experimental tab
  if (allFilesData.length > 0) {
    const resultsByMethod = {
      simple: [],
      voigt: [],
    };

    allFilesData.forEach((fileData) => {
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
    generateCalibrationCharts(resultsByMethod.voigt, "voigt");
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

  // Create table container HTML
  const tableContainer = document.createElement('div');
  tableContainer.innerHTML = `
    <h3>Derived Temperatures:</h3>
    <table border="1" style="border-collapse: collapse; width: 100%; max-width: 800px; font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 5px; text-align: left;">Name</th>
          <th style="padding: 5px; text-align: center;">HD/HG</th>
          <th style="padding: 5px; text-align: center;">D Peak (cm⁻¹)</th>
          <th style="padding: 5px; text-align: center;">G Peak (cm⁻¹)</th>
          <th>D width ${dBandWidthHeight + "%H"}</th>
          <th>G width ${gBandWidthHeight + "%H"}</th>
          <th style="padding: 5px; text-align: center;">WD/WG</th>
          <th style="padding: 5px; text-align: center;">Temperature</th>
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

    tbodyElement.innerHTML += `
      <tr>
        <td style="padding: 5px;">${file.name}</td>
        <td style="padding: 5px; text-align: center;">${hdHg}</td>
        <td style="padding: 5px; text-align: center;">${dPeak}</td>
        <td style="padding: 5px; text-align: center;">${gPeak}</td>
        <td style="padding: 5px; text-align: center;">${dWidth}</td>
        <td style="padding: 5px; text-align: center;">${gWidth}</td>
        <td style="padding: 5px; text-align: center;">${wdWg}</td>
        <td style="padding: 5px; text-align: center;">TBD</td>
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

    // Listener for "Select All" checkbox - ONLY update state and refresh
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            if (isChecked) {
                sampleNames.forEach(name => includedSamples.add(name));
            } else {
                sampleNames.forEach(name => includedSamples.delete(name));
            }
            updateDisplayedFile(); // Trigger re-render
        });
    }

    // Listeners for individual sample checkboxes - ONLY update state and refresh
    sampleCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        const sampleName = this.dataset.sampleName;
        if (this.checked) {
          includedSamples.add(sampleName);
        } else {
          includedSamples.delete(sampleName);
        }
        updateDisplayedFile(); // Trigger re-render
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
                return `Value: ${context.parsed.y.toFixed(3)}`;
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

  // Create container for all plots
  const container = document.getElementById('archaeoCalibrationPlots');
  container.innerHTML = '';

  // Create a flex container for the grid layout
  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;';
  container.appendChild(gridContainer);

  // Create individual chart containers
  parameters.forEach((param, index) => {
    const chartContainer = document.createElement('div');
    chartContainer.style.cssText = 'flex: 0 1 calc(50% - 10px); min-width: 300px; margin-bottom: 20px;';
    
    const title = document.createElement('h4');
    title.style.cssText = 'text-align: center; margin: 0 0 10px 0';
    title.textContent = param === 'hdHg' ? 'HD/HG Ratio' :
                       param === 'dWidth' ? 'D Width' :
                       param === 'gWidth' ? 'G Width' : 'WD/WG Ratio';
    
    const canvas = document.createElement('canvas');
    canvas.id = `archaeoCalibration_${param}`;
    canvas.width = 620;
    canvas.height = 400;
    canvas.style.cssText = 'width: 100%; height: 400px;';
    
    chartContainer.appendChild(title);
    chartContainer.appendChild(canvas);
    gridContainer.appendChild(chartContainer);

    // Create the chart after a short delay to ensure canvas is ready
    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      
      // Destroy previous chart if it exists
      if (window.statsCharts[canvas.id]) {
        window.statsCharts[canvas.id].destroy();
      }

      // Create new chart
      window.statsCharts[canvas.id] = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Calibration Data',
              data: stats[param].map(point => ({
                x: point.x,
                y: point.y
              })),
              borderColor: 'red',
              backgroundColor: 'red',
              pointRadius: 4,
              showLine: true,
              tension: 0.3,
              errorBars: {
                y: {
                  array: stats[param].map(point => point.stdDev),
                  color: 'rgba(255, 0, 0, 0.5)',
                  width: 2
                }
              }
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'linear',
              title: { display: true, text: 'Temperature' }
            },
            y: {
              type: 'linear',
              title: { display: true, text: title.textContent }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const index = context.dataIndex;
                  return [
                    `Average: ${stats[param][index].y.toFixed(3)}`,
                    `± SD: ${stats[param][index].stdDev.toFixed(3)}`
                  ];
                }
              }
            }
          }
        }
      });
    }, 100);
  });
}
