document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("baselineFileInput");
  const subtractButton = document.getElementById("subtractBaselineButton");
  const downloadButton = document.getElementById("downloadCorrectedButton");
  const ctx = document.getElementById("baselineSpectrumChart").getContext("2d");
  let spectrumChart;
  let currentSpectrumData = null;
  let correctedSpectrumData = null; // To store the baseline-corrected data
  let originalFileName = "spectrum.txt"; // Default filename

  // Initially disable buttons until a file is loaded
  subtractButton.disabled = true;
  downloadButton.disabled = true;

  fileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      originalFileName = file.name; // Store the original filename
      const reader = new FileReader();
      reader.onload = function (e) {
        currentSpectrumData = parseSpectrumData(e.target.result);
        if (currentSpectrumData) {
          // Format for the new plotSpectrum function that expects an array of datasets
          const initialDataset = [
            {
              data: currentSpectrumData,
              label: "Original Spectrum",
              borderColor: "blue",
            },
          ];
          plotSpectrum(initialDataset);
          subtractButton.disabled = false; // Enable subtract button
          downloadButton.disabled = true; // Keep download disabled until subtraction
        } else {
          alert("Could not parse spectrum data from file.");
          subtractButton.disabled = true;
          downloadButton.disabled = true;
        }
      };
      reader.readAsText(file);
    }
  });

  function parseSpectrumData(text) {
    const lines = text.split('\n'); // Use simple newline split
    const wavelengths = [];
    const intensities = [];
    let parseError = false; // Keep track of lines that might not parse

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine === "") return; // Skip empty lines

      const parts = trimmedLine.split('\t'); // Split by tab
      
      if (parts.length === 2) {
        const wl = parseFloat(parts[0]);
        const intensity = parseFloat(parts[1]);
        
        if (!isNaN(wl) && !isNaN(intensity)) {
          wavelengths.push(wl);
          intensities.push(intensity);
        } else {
          // console.warn(`Could not parse numbers from line: "${trimmedLine}"`);
          parseError = true;
        }
      } else {
        // console.warn(`Line does not have two parts: "${trimmedLine}"`);
        parseError = true;
      }
    });
    
    if (parseError) {
        // You could alert the user here if desired, or just log to console
        console.warn("Some lines in the file may not have been parsed correctly. Please check file format.");
    }

    if (wavelengths.length === 0) { // Only fail if no data points were extracted
        console.error("No valid spectrum data points found in the file.");
        return null;
    }
    return { wavelengths, intensities };
  }

  function interpolateIntensity(targetWavelength, wavelengths, intensities) {
    // Check for exact match
    const exactIndex = wavelengths.indexOf(targetWavelength);
    if (exactIndex !== -1) {
      return intensities[exactIndex];
    }

    // Find insertion point or closest points for interpolation
    let i = 0;
    while (i < wavelengths.length && wavelengths[i] < targetWavelength) {
      i++;
    }

    // Handle edge cases: targetWavelength is outside the data range
    if (i === 0) { // Target is before the first data point
      console.warn(`Target wavelength ${targetWavelength} is below the data range. Using first point's intensity.`);
      return intensities[0];
    }
    if (i === wavelengths.length) { // Target is after the last data point
      console.warn(`Target wavelength ${targetWavelength} is above the data range. Using last point's intensity.`);
      return intensities[wavelengths.length - 1];
    }

    // Perform linear interpolation
    const x1 = wavelengths[i - 1];
    const y1 = intensities[i - 1];
    const x2 = wavelengths[i];
    const y2 = intensities[i];

    if (x2 === x1) { // Should not happen if wavelengths are unique and sorted
        return y1;
    }

    return y1 + (y2 - y1) * (targetWavelength - x1) / (x2 - x1);
  }

  function plotSpectrum(datasetsConfig) { // Modified to accept an array of dataset configurations
    if (spectrumChart) {
      spectrumChart.destroy();
    }

    // The datasetsConfig should be an array of objects,
    // each like: { data: { wavelengths: [], intensities: [] }, label: "", borderColor: "" }
    const chartDatasets = datasetsConfig.map(config => ({
      label: config.label,
      data: config.data.wavelengths.map((wl, index) => ({ x: wl, y: config.data.intensities[index] })),
      borderColor: config.borderColor,
      borderWidth: config.borderWidth || 1,
      pointRadius: config.pointRadius === undefined ? 0 : config.pointRadius, 
      tension: config.tension === undefined ? 0.1 : config.tension, 
      borderDash: config.borderDash || [], // For dashed lines like the baseline
      fill: config.fill === undefined ? false : config.fill, // For filled areas if needed
    }));

    spectrumChart = new Chart(ctx, {
      type: "line",
      data: { datasets: chartDatasets }, // Use the processed datasets
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "linear",
            title: {
              display: true,
              text: "Wavelength (cm⁻¹)",
            },
          },
          y: {
            title: {
              display: true,
              text: "Intensity",
            },
          },
        },
        plugins: {
          tooltip: {
            mode: "index",
            intersect: false,
          },
          annotation: { // Add this for the baseline visualization later
            annotations: {}
          }
        },
      },
    });
  }

  subtractButton.addEventListener("click", () => {
    if (!currentSpectrumData) {
      alert("Please load a spectrum file first.");
      return;
    }

    const wl1 = 850;
    const wl2 = 2150;

    const intensityAtWl1 = interpolateIntensity(wl1, currentSpectrumData.wavelengths, currentSpectrumData.intensities);
    const intensityAtWl2 = interpolateIntensity(wl2, currentSpectrumData.wavelengths, currentSpectrumData.intensities);

    if (intensityAtWl1 === undefined || intensityAtWl2 === undefined) {
      alert("Could not determine baseline points. Ensure 900cm-1 and 2000cm-1 are within your data range.");
      return;
    }

    // Calculate slope (m) and y-intercept (b) of the baseline
    // y = mx + b
    const m = (intensityAtWl2 - intensityAtWl1) / (wl2 - wl1);
    const b = intensityAtWl1 - m * wl1;

    const baselineIntensities = currentSpectrumData.wavelengths.map(wl => m * wl + b);

    // Calculate corrected intensities for the full range first
    const fullRangeCorrectedIntensities = currentSpectrumData.intensities.map((originalIntensity, index) => {
      return originalIntensity - baselineIntensities[index];
    });

    // Now, filter both wavelengths and these new corrected intensities for the 850-2150 cm-1 range
    const finalFilteredWavelengths = [];
    const finalFilteredIntensities = [];

    // Iterate over the original wavelengths to maintain correspondence with fullRangeCorrectedIntensities
    currentSpectrumData.wavelengths.forEach((wl, index) => {
      if (wl >= 850 && wl <= 2150) {
        finalFilteredWavelengths.push(wl);
        finalFilteredIntensities.push(fullRangeCorrectedIntensities[index]);
      }
    });

    correctedSpectrumData = {
      wavelengths: finalFilteredWavelengths,
      intensities: finalFilteredIntensities,
    };

    // Prepare datasets for plotting
    const datasetsToPlot = [
      // {
      //   data: currentSpectrumData,
      //   label: "Original Spectrum",
      //   borderColor: "blue",
      // },
      // {
      //   data: { wavelengths: currentSpectrumData.wavelengths, intensities: baselineIntensities },
      //   label: "Calculated Baseline",
      //   borderColor: "red",
      //   borderDash: [5, 5], // Dashed line for baseline
      // },
      {
        data: correctedSpectrumData,
        label: "Corrected Spectrum",
        borderColor: "green",
      },
    ];

    plotSpectrum(datasetsToPlot);
    downloadButton.disabled = false; // Enable download after subtraction
  });

  // Placeholder for downloadCorrectedData function
  downloadButton.addEventListener("click", () => {
    if (!correctedSpectrumData) { // Check for corrected data specifically
      alert("No corrected data to download. Please subtract the baseline first.");
      return;
    }
    generateAndDownloadFile(correctedSpectrumData, `corrected_${originalFileName}`);
  });

  // Helper function for downloading (will be expanded)
  function generateAndDownloadFile(dataToDownload, filename) { // Renamed first parameter for clarity
    let fileContent = "";
    for (let i = 0; i < dataToDownload.wavelengths.length; i++) {
      fileContent += `${dataToDownload.wavelengths[i]}\t${dataToDownload.intensities[i]}\n`;
    }
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
}); 