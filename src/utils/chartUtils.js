/**
 * Utility functions for chart rendering and data manipulation
 * Adapted from existing chartUtils.js for MongoDB time-series data
 */

export const formatVibrationValue = (value) => {
  return { value: value.toFixed(2), unit: "m/s²" };
};

export const formatNumberWithSuffix = (num) => {
  if (num === 0) return "0";
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(0) + "G";
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(0) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(0) + "k";
  } else {
    return num.toString();
  }
};

/**
 * Parameters configuration
 * Vibration: 0-150 m/s² (Gravity Piezo Film sensor)
 * Temperature: -10-150 °C (MAX6675)
 * Power: 0-23000 W (3×PZEM-004T, 23kW total)
 * Noise: 0-130 dB (INMP441)
 */
export const PARAMETERS_CONFIG = {
  vibration: { min: 0, max: 50, unit: "m/s²", name: "Vibration" },
  temperature: { min: 0, max: 100, unit: "°C", name: "Temperature" },
  power: { min: 0, max: 23000, unit: "W", name: "Total Power" },
  noise: { min: 0, max: 120, unit: "dB", name: "Noise" },
};

export const DEFAULT_THRESHOLDS = {
  vibration: { min: 0.5, max: 150 },
  temperature: { min: 30, max: 100 },
  power: { min: 0, max: 11500 },
  noise: { min: 40, max: 90 },
};

/**
 * Calculate arc color based on percentage
 */
export const calculateArcConfig = (percentage) => {
  // Green: 0-50%, Yellow: 50-75%, Red: 75-100%
  let color = "#10b981"; // Green
  if (percentage > 75) color = "#ef4444"; // Red
  else if (percentage > 50) color = "#f59e0b"; // Yellow

  // Convert percentage to angle (0-180 degrees for semicircle)
  const angle = (percentage / 100) * 180;
  const startAngle = 0;
  const endAngle = angle;

  return { color, startAngle, endAngle, percentage };
};

/**
 * Generate SVG path for gauge arc
 */
export const generatePath = (cx, cy, r, startAngle, endAngle) => {
  const toRad = (angle) => (angle * Math.PI) / 180;
  const start = toRad(startAngle);
  const end = toRad(endAngle);

  const x1 = cx + r * Math.cos(start - Math.PI / 2);
  const y1 = cy + r * Math.sin(start - Math.PI / 2);
  const x2 = cx + r * Math.cos(end - Math.PI / 2);
  const y2 = cy + r * Math.sin(end - Math.PI / 2);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
};

export const generateChartPath = (
  normalizedData,
  key,
  padding,
  innerWidth,
  innerHeight,
) => {
  return normalizedData
    .map((point, i) => {
      const x = padding.left + (i / (normalizedData.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - (point[key] / 100) * innerHeight;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");
};
