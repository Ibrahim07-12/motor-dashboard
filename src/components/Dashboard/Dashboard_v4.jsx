import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { dataAPI } from "../../services/api";
import "./Dashboard_v4.css";

const formatValueWithUnit = (value, unit) => `${Number(value).toFixed(1)} ${unit}`;

const buildHistoricalCsv = (date, rows) => {
  const header = ["date", "time", "vibration", "temperature", "power", "noise"];
  const csvRows = rows.map((row) => [
    date,
    row.time,
    Number(row.vibration).toFixed(1),
    Number(row.temperature).toFixed(1),
    Number(row.power).toFixed(1),
    Number(row.noise).toFixed(1),
  ]);

  return [header, ...csvRows].map((row) => row.join(",")).join("\n");
};

const HistoricalTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const itemsByKey = {};
  payload.forEach((item) => {
    itemsByKey[item.dataKey] = item;
  });

  const orderedKeys = ["vibration", "temperature", "noise", "power"];
  const shortLabel = {
    vibration: "Vib",
    temperature: "Temp",
    noise: "Noise",
    power: "Pow",
  };

  return (
    <div style={{ backgroundColor: "#1f2a44", padding: "8px 10px", borderRadius: "10px", color: "#fff", minWidth: 140 }}>
      <p style={{ margin: "0 0 6px 0", fontSize: "14px", fontWeight: "700" }}>{label}</p>
      {orderedKeys.map((key) => {
        const point = itemsByKey[key];
        if (!point) {
          return null;
        }

        const config = PARAMETER_CONFIGS[key];
        // historical line chart stores Level Relatif in percent (0-100)
        // convert percent -> real unit value using config.max
        const realValue = (Number(point.value) / 100) * config.max;
        return (
          <p key={key} style={{ margin: "2px 0", fontSize: "13px", color: config.color }}>
            {shortLabel[key]}: {formatValueWithUnit(realValue, config.unit)}
          </p>
        );
      })}
    </div>
  );
};

// Parameter configurations - warna dan range
const PARAMETER_CONFIGS = {
  noise: {
    name: "Noise (Suara)",
    color: "#10B981", // Hijau
    unit: "dB",
    max: 160,
    yAxisTicks: [0, 32, 64, 96, 128, 160],
  },
  temperature: {
    name: "Temperature (Suhu)",
    color: "#EF4444", // Merah
    unit: "°C",
    max: 1024,
    yAxisTicks: [0, 205, 410, 615, 820, 1024],
  },
  vibration: {
    name: "Vibration (Getaran)",
    color: "#3B82F6", // Biru
    unit: "m/s²",
    max: 100,
    yAxisTicks: [0, 20, 40, 60, 80, 100],
  },
  power: {
    name: "Power (Daya)",
    color: "#A855F7", // Ungu
    unit: "kW",
    max: 23,
    yAxisTicks: [0, 4, 8, 13, 17, 23],
  },
};

// Helper: Normalize value to percentage (0-100%)
const normalizeToPercentage = (value, max) => {
  return Math.min((value / max) * 100, 100);
};

// Helper: Empty historical data (real data only)
const generateHistoricalData = (hours = 24) => {
  return [];
};

const HISTORICAL_HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);

const formatISODateUTC = (date) => date.toISOString().split("T")[0];

const getMondayFromDate = (selectedDate) => {
  const date = new Date(`${selectedDate}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return formatISODateUTC(date);
};

const getWeekDatesMondayToFriday = (selectedDate) => {
  const monday = new Date(`${getMondayFromDate(selectedDate)}T00:00:00Z`);
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return formatISODateUTC(date);
  });
};

const aggregateDailyHistoryRows = (rows = []) => {
  const validRows = rows.filter((row) => row && typeof row === "object");
  if (!validRows.length) {
    return {
      vibration: 0,
      temperature: 0,
      power: 0,
      noise: 0,
      samples: 0,
    };
  }

  let vibrationSum = 0;
  let temperatureSum = 0;
  let powerSum = 0;
  let noiseSum = 0;
  let sampleWeight = 0;

  validRows.forEach((row) => {
    const weight = Number(row.readings || row.count || 1) || 1;
    vibrationSum += Number(row.vibration || 0) * weight;
    temperatureSum += Number(row.temperature || 0) * weight;
    powerSum += Number(row.power || 0) * weight;
    noiseSum += Number(row.noise || 0) * weight;
    sampleWeight += weight;
  });

  if (!sampleWeight) {
    return {
      vibration: 0,
      temperature: 0,
      power: 0,
      noise: 0,
      samples: 0,
    };
  }

  return {
    vibration: vibrationSum / sampleWeight,
    temperature: temperatureSum / sampleWeight,
    power: powerSum / sampleWeight,
    noise: noiseSum / sampleWeight,
    samples: sampleWeight,
  };
};

// Helper: Empty weekly data (real data only)
const generateWeeklyData = () => {
  return {
    noise: [],
    temperature: [],
    vibration: [],
    power: [],
  };
};

const POWER_PHASE_MAX_W = 23000;



const Dashboard = ({ sensorData = {}, motorId = "motor_main_shakeout", thresholds = {} }) => {
  // Real-time gauge values - update from sensorData prop
  const [gauges, setGauges] = useState({
    vibration: 0,
    temperature: 0,
    power: 0,
    noise: 0,
  });

  // Historical chart data
  const [historicalData, setHistoricalData] = useState(generateHistoricalData);
  const [historicalError, setHistoricalError] = useState("");

  // Weekly chart data
  const [weeklyData, setWeeklyData] = useState(generateWeeklyData);
  const [weeklyError, setWeeklyError] = useState("");
  const weeklyLabels = ["sen", "sel", "rab", "kam", "jum"];

  // Date pickers
  const [historicalDate, setHistoricalDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [averageMonth, setAverageMonth] = useState(new Date().toISOString().slice(0, 7));
  // Week selector as a calendar date (user picks any date within desired week)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [historicalExportInterval, setHistoricalExportInterval] = useState("1h");

  // Update gauge values from real sensorData prop
  useEffect(() => {
    if (sensorData && Object.keys(sensorData).length > 0) {
      setGauges({
        vibration: sensorData.vibration || 0,
        temperature: sensorData.temperature || 0,
        power: sensorData.power || 0,
        noise: sensorData.noise || 0,
      });
    }
  }, [sensorData]);

  // Fetch historical data when date changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        setHistoricalError("");
        const response = await dataAPI.getHistory(motorId, "daily", historicalDate);
        const rows = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        if (rows.length > 0) {
          const byHour = new Map();
          rows.forEach((row) => {
            const timestamp = new Date(row.timestamp || row.time);
            if (Number.isNaN(timestamp.getTime())) {
              return;
            }

            const hour = String(timestamp.getHours()).padStart(2, "0");
            byHour.set(`${hour}:00`, {
              time: `${hour}:00`,
              vibration: normalizeToPercentage(row.vibration || 0, PARAMETER_CONFIGS.vibration.max),
              temperature: normalizeToPercentage(row.temperature || 0, PARAMETER_CONFIGS.temperature.max),
              power: normalizeToPercentage((row.power || 0) / 1000, PARAMETER_CONFIGS.power.max),
              noise: normalizeToPercentage(row.noise || 0, PARAMETER_CONFIGS.noise.max),
            });
          });

          const formattedData = HISTORICAL_HOURS.map((time) =>
            byHour.get(time) || {
              time,
              vibration: 0,
              temperature: 0,
              power: 0,
              noise: 0,
            }
          );
          setHistoricalData(formattedData);
        } else {
          setHistoricalData(
            HISTORICAL_HOURS.map((time) => ({
              time,
              vibration: 0,
              temperature: 0,
              power: 0,
              noise: 0,
            }))
          );
          setHistoricalError(`Tidak ada data historis untuk ${historicalDate}.`);
        }
      } catch (error) {
        console.error(`Error fetching historical data for ${historicalDate}:`, error.message);
        setHistoricalData(
          HISTORICAL_HOURS.map((time) => ({
            time,
            vibration: 0,
            temperature: 0,
            power: 0,
            noise: 0,
          }))
        );
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          setHistoricalError("Akses data historis ditolak (token tidak valid/expired). Silakan login ulang.");
        } else {
          setHistoricalError("Gagal mengambil data historis dari server.");
        }
      }
    };
    fetchHistoricalData();
  }, [historicalDate, motorId]);

  // Re-fetch weekly when user changes selected date
  useEffect(() => {
    const fetchWeekly = async () => {
      try {
        setWeeklyError("");
        const weekDates = getWeekDatesMondayToFriday(selectedDate);
        const settledResponses = await Promise.allSettled(
          weekDates.map((date) => dataAPI.getHistory(motorId, "daily", date))
        );

        const dailyRows = weekDates.map((date, index) => {
          const response = settledResponses[index];
          const rows = response.status === "fulfilled"
            ? Array.isArray(response.value.data)
              ? response.value.data
              : Array.isArray(response.value.data?.data)
                ? response.value.data.data
                : []
            : [];
          const averaged = aggregateDailyHistoryRows(rows);

          return {
            date,
            name: weeklyLabels[index] || `day${index}`,
            vibration: averaged.vibration,
            temperature: averaged.temperature,
            power: averaged.power,
            noise: averaged.noise,
            samples: averaged.samples,
          };
        });

        const hasAnySamples = dailyRows.some((row) => Number(row.samples || 0) > 0);

        const formattedData = {
          noise: dailyRows.map((row) => ({
            name: row.name,
            date: row.date,
            value: normalizeToPercentage(row.noise || 0, PARAMETER_CONFIGS.noise.max),
            rawValue: row.noise || 0,
          })),
          temperature: dailyRows.map((row) => ({
            name: row.name,
            date: row.date,
            value: normalizeToPercentage(row.temperature || 0, PARAMETER_CONFIGS.temperature.max),
            rawValue: row.temperature || 0,
          })),
          vibration: dailyRows.map((row) => ({
            name: row.name,
            date: row.date,
            value: normalizeToPercentage(row.vibration || 0, PARAMETER_CONFIGS.vibration.max),
            rawValue: row.vibration || 0,
          })),
          power: dailyRows.map((row) => ({
            name: row.name,
            date: row.date,
            value: normalizeToPercentage((row.power || 0) / 1000, PARAMETER_CONFIGS.power.max),
            rawValue: row.power || 0,
          })),
        };

        setWeeklyData(formattedData);
        if (!hasAnySamples) {
          setWeeklyError("Tidak ada data weekly average pada periode ini.");
        }
      } catch (error) {
        console.error("Error fetching weekly data:", error.message);
        setWeeklyData({
          noise: weeklyLabels.map((name, index) => ({ name, date: getWeekDatesMondayToFriday(selectedDate)[index], value: 0, rawValue: 0 })),
          temperature: weeklyLabels.map((name, index) => ({ name, date: getWeekDatesMondayToFriday(selectedDate)[index], value: 0, rawValue: 0 })),
          vibration: weeklyLabels.map((name, index) => ({ name, date: getWeekDatesMondayToFriday(selectedDate)[index], value: 0, rawValue: 0 })),
          power: weeklyLabels.map((name, index) => ({ name, date: getWeekDatesMondayToFriday(selectedDate)[index], value: 0, rawValue: 0 })),
        });
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          setWeeklyError("Akses weekly average ditolak (token tidak valid/expired). Silakan login ulang.");
        } else {
          setWeeklyError("Gagal mengambil weekly average dari server.");
        }
      }
    };
    fetchWeekly();
  }, [selectedDate, motorId]);

  const handleExportWeekly = async () => {
    try {
      const mondayStr = getMondayFromDate(selectedDate);
      const weekDates = getWeekDatesMondayToFriday(selectedDate);
      const exportRows = weekDates.map((date, index) => {
        const noisePoint = weeklyData.noise?.[index] || {};
        const temperaturePoint = weeklyData.temperature?.[index] || {};
        const vibrationPoint = weeklyData.vibration?.[index] || {};
        const powerPoint = weeklyData.power?.[index] || {};

        return {
          date,
          day: formatTooltipLabel(weeklyLabels[index] || date),
          vibration: Number(vibrationPoint.rawValue || 0).toFixed(2),
          temperature: Number(temperaturePoint.rawValue || 0).toFixed(2),
          power: Number(powerPoint.rawValue || 0).toFixed(2),
          noise: Number(noisePoint.rawValue || 0).toFixed(2),
        };
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      worksheet["!cols"] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, "WeeklyAverage");
      XLSX.writeFile(workbook, `weekly-average-${mondayStr}-to-${weekDates[4]}.xlsx`);
    } catch (err) {
      console.error('Export weekly failed', err);
      const msg = err?.response?.data?.message || err?.message || 'Gagal export weekly.';
      alert(msg);
    }
  };

  const powerPhases = sensorData.powerPhases || { R: 0, S: 0, T: 0 };

  const renderMiniPhaseGauge = (phaseKey, value, phaseThresholdW, isUnbalanced = false) => {
    const displayValueW = Number(value || 0);
    const thresholdW = Number(phaseThresholdW || 8000); // Default 8000W if not set
    const percentage = Math.min((displayValueW / POWER_PHASE_MAX_W) * 100, 100);
    const dashOffset = 100 - percentage;
    
    // FIX: Gauge only RED jika value EXCEED threshold
    // Unbalance hanya affect color jika ada actual threshold exceed
    const exceedThreshold = displayValueW > thresholdW;
    let gaugeColor = exceedThreshold ? "#ef4444" : "#22c55e";

    return (
      <div className="mini-phase-gauge">
        <div className="mini-phase-label">{phaseKey}</div>
        <svg viewBox="0 0 100 70" className="mini-phase-dial">
          <path
            d="M 12 52 A 38 38 0 0 1 88 52"
            pathLength="100"
            stroke="#e5e7eb"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 12 52 A 38 38 0 0 1 88 52"
            pathLength="100"
            stroke={gaugeColor}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={dashOffset}
          />
          <circle cx="50" cy="52" r="2.5" fill={gaugeColor} />
          <text x="12" y="67" textAnchor="start" className="mini-phase-min-label">0</text>
          <text x="88" y="67" textAnchor="end" className="mini-phase-max-label">{POWER_PHASE_MAX_W}</text>
        </svg>
        <div className="mini-phase-value">
          {displayValueW.toFixed(0)} <span>W</span>
        </div>
      </div>
    );
  };

  const renderPhaseCard = () => {
    // FIX: Read thresholds correctly from state with proper Number conversion
    const phaseThresholdR = Number(thresholds?.power?.R) || 8000;
    const phaseThresholdS = Number(thresholds?.power?.S) || 8000;
    const phaseThresholdT = Number(thresholds?.power?.T) || 8000;

    // DEBUG: Log to verify thresholds loaded correctly
    console.log('[Dashboard Gauge] Power Thresholds:', { R: phaseThresholdR, S: phaseThresholdS, T: phaseThresholdT });
    console.log('[Dashboard Gauge] Power Values:', { R: powerPhases.R, S: powerPhases.S, T: powerPhases.T });

    return (
      <div className="gauge-container power-phase-card">
        <div className="gauge-label">Power Phase (R / S / T) - Set Threshold: {phaseThresholdR}W</div>
        <div className="mini-phase-row">
          {renderMiniPhaseGauge("R", powerPhases.R || 0, phaseThresholdR, sensorData.imbalancePhases?.R?.unbalanced)}
          {renderMiniPhaseGauge("S", powerPhases.S || 0, phaseThresholdS, sensorData.imbalancePhases?.S?.unbalanced)}
          {renderMiniPhaseGauge("T", powerPhases.T || 0, phaseThresholdT, sensorData.imbalancePhases?.T?.unbalanced)}
        </div>
      </div>
    );
  };

  // General gauge renderer for vibration / temperature / noise
  const renderGauge = (value, paramKey, config) => {
    const thresholdRaw = thresholds[paramKey] !== undefined ? thresholds[paramKey] : config.max;
    const displayValue = value;
    const percentage = Math.min((displayValue / config.max) * 100, 100);
    const dashOffset = 100 - percentage;
    const gaugeColor = displayValue <= thresholdRaw ? "#22c55e" : "#ef4444";

    return (
      <div className="gauge-container">
        <div className="gauge-label">{config.name}</div>
        <svg viewBox="0 0 120 88" className="gauge-dial">
          <path
            d="M 14 66 A 46 46 0 0 1 106 66"
            pathLength="100"
            stroke="#e5e7eb"
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 14 66 A 46 46 0 0 1 106 66"
            pathLength="100"
            stroke={gaugeColor}
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={dashOffset}
          />
          <circle cx="60" cy="66" r="3.2" fill={gaugeColor} />
          <text x="14" y="82" textAnchor="middle" className="gauge-min-label">0</text>
          <text x="106" y="82" textAnchor="middle" className="gauge-max-label">{config.max}</text>
        </svg>
        <div className="gauge-value">
          {displayValue.toFixed(1)} <span>{config.unit}</span>
        </div>
      </div>
    );
  };

  const currentData = weeklyData;

  // Tick definitions for chart axes
  const historicalTicks = HISTORICAL_HOURS;
  const weeklyTicks = ["sen", "sel", "rab", "kam", "jum"];

  // Charts only display when real data exists - no dummy fallback
  const displayHistorical = (historicalData && historicalData.length) ? historicalData : [];
  const displayNoise = (currentData.noise && currentData.noise.length) ? currentData.noise : [];
  const displayTemperature = (currentData.temperature && currentData.temperature.length) ? currentData.temperature : [];
  const displayVibration = (currentData.vibration && currentData.vibration.length) ? currentData.vibration : [];
  const displayPower = (currentData.power && currentData.power.length) ? currentData.power : [];

  const formatTooltipLabel = (label) => {
    const map = { sen: "Senin", sel: "Selasa", rab: "Rabu", kam: "Kamis", jum: "Jumat" };
    return map[label] || label;
  };

  const handleExportCsv = () => {
    if (historicalExportInterval === "5s") {
      dataAPI
        .exportRawByDateRange(motorId, historicalDate, historicalDate, "xlsx")
        .then((response) => {
          const blob = new Blob([
            response.data,
          ], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `grafik-historis-5detik-${historicalDate}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch((err) => {
          console.error("Export 5 detik gagal:", err);
          const msg = err?.response?.data?.error || err?.message || "Gagal export 5 detik.";
          alert(msg);
        });
      return;
    }

    if (!historicalData || historicalData.length === 0) {
      alert("Data tidak tersedia untuk di-export. Pilih tanggal dengan data yang ada.");
      return;
    }

    const rows = historicalData.map((row) => ({
      Date: historicalDate,
      Time: row.time || "00:00",
      Vibration_ms2: ((Number(row.vibration) / 100) * PARAMETER_CONFIGS.vibration.max).toFixed(2),
      Temperature_C: ((Number(row.temperature) / 100) * PARAMETER_CONFIGS.temperature.max).toFixed(2),
      Power_kW: ((Number(row.power) / 100) * PARAMETER_CONFIGS.power.max).toFixed(2),
      Noise_dB: ((Number(row.noise) / 100) * PARAMETER_CONFIGS.noise.max).toFixed(2),
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = [
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
    ];
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Historis");
    XLSX.writeFile(workbook, `grafik-historis-1jam-${historicalDate}.xlsx`);
  };

  return (
    <div className="dashboard-v4">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>MOTOR MONITORING</h1>
        </div>
        <div className="header-status">
          <span>● ONLINE</span>
        </div>
      </div>

      {/* Real-time Gauges */}
      <div className="gauges-section">
        {renderGauge(gauges.vibration, "vibration", PARAMETER_CONFIGS.vibration)}
        {renderGauge(gauges.temperature, "temperature", PARAMETER_CONFIGS.temperature)}
        {renderPhaseCard()}
        {renderGauge(gauges.noise, "noise", PARAMETER_CONFIGS.noise)}
      </div>

      {/* Historical Chart */}
      <div className="chart-section">
        <div className="section-header">
          <h2>Grafik Historis</h2>
          <div className="controls">
            <label>
              <input
                type="date"
                value={historicalDate}
                onChange={(e) => setHistoricalDate(e.target.value)}
              />
            </label>
            <select
              value={historicalExportInterval}
              onChange={(e) => setHistoricalExportInterval(e.target.value)}
              aria-label="Interval export historis"
              title="Pilih interval export"
            >
              <option value="1h">Export 1 Jam</option>
              <option value="5s">Export 5 Detik</option>
            </select>
            <button className="btn-export" onClick={handleExportCsv}>Export Excel</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={displayHistorical} margin={{ top: 8, right: 8, left: 44, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              type="category"
              allowDuplicatedCategory={false}
              ticks={historicalTicks}
              interval={0}
              minTickGap={0}
              stroke="#9CA3AF"
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => value}
              height={44}
              tickMargin={12}
            />
            <YAxis
              width={64}
              label={{ value: "Level Relatif (%)", angle: -90, position: "insideLeft", dx: -20, dy: 40 }}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              stroke="#9CA3AF"
            />
            <Tooltip content={<HistoricalTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="vibration"
              stroke={PARAMETER_CONFIGS.vibration.color}
              name="Vibration"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="temperature"
              stroke={PARAMETER_CONFIGS.temperature.color}
              name="Temperature"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="power"
              stroke={PARAMETER_CONFIGS.power.color}
              name="Power"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="noise"
              stroke={PARAMETER_CONFIGS.noise.color}
              name="Noise"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Average Section */}
      <div className="average-section">
        <div className="section-header">
          <h2>Weekly Average</h2>
          <div className="controls">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button className="btn-export" onClick={handleExportWeekly}>Export Excel</button>
          </div>
        </div>

        {/* 4 separate bar charts */}
        <div className="bar-charts-grid">
          {/* Noise Chart */}
          <div className="bar-chart-container">
            <h3 style={{ color: PARAMETER_CONFIGS.noise.color }}>
              {PARAMETER_CONFIGS.noise.name}
            </h3>
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayNoise} margin={{ top: 4, right: 0, bottom: 28, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  type="category"
                  allowDuplicatedCategory={false}
                  ticks={weeklyTicks}
                  interval={0}
                  minTickGap={0}
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 9 }}
                  angle={0}
                  textAnchor="middle"
                    tickMargin={10}
                    height={42}
                  tickFormatter={(value) => value}
                />
                <YAxis
                  ticks={PARAMETER_CONFIGS.noise.yAxisTicks}
                  domain={[0, PARAMETER_CONFIGS.noise.max]}
                  stroke="#9CA3AF"
                  tick={{ fontSize: 8 }}
                  width={42}
                  tickCount={6}
                  interval={0}
                  label={{ value: PARAMETER_CONFIGS.noise.unit, angle: -90, position: 'insideLeft', offset: -2, style: { fill: '#6b7280', fontSize: 10 } }}
                />
                <Tooltip
                  formatter={(value) => [formatValueWithUnit(value, PARAMETER_CONFIGS.noise.unit), "Noise"]}
                  labelFormatter={formatTooltipLabel}
                />
                <Bar dataKey="value" fill={PARAMETER_CONFIGS.noise.color}>
                  <LabelList dataKey="value" position="top" fill="#374151" style={{ fontSize: 10, fontWeight: 600 }} formatter={(v) => `${((v/100)*PARAMETER_CONFIGS.noise.max).toFixed(1)} ${PARAMETER_CONFIGS.noise.unit}`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Temperature Chart */}
          <div className="bar-chart-container">
            <h3 style={{ color: PARAMETER_CONFIGS.temperature.color }}>
              {PARAMETER_CONFIGS.temperature.name}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayTemperature} margin={{ top: 4, right: 0, bottom: 28, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  type="category"
                  allowDuplicatedCategory={false}
                  ticks={weeklyTicks}
                  interval={0}
                  minTickGap={0}
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 9 }}
                  angle={0}
                  textAnchor="middle"
                    tickMargin={10}
                    height={42}
                  tickFormatter={(value) => value}
                />
                <YAxis
                  ticks={PARAMETER_CONFIGS.temperature.yAxisTicks}
                  domain={[0, PARAMETER_CONFIGS.temperature.max]}
                  stroke="#9CA3AF"
                  tick={{ fontSize: 8 }}
                  width={42}
                  tickCount={6}
                  interval={0}
                  label={{ value: PARAMETER_CONFIGS.temperature.unit, angle: -90, position: 'insideLeft', offset: -2, style: { fill: '#6b7280', fontSize: 10 } }}
                />
                <Tooltip
                  formatter={(value) => [formatValueWithUnit(value, PARAMETER_CONFIGS.temperature.unit), "Temperature"]}
                  labelFormatter={formatTooltipLabel}
                />
                <Bar dataKey="value" fill={PARAMETER_CONFIGS.temperature.color}>
                  <LabelList dataKey="value" position="top" fill="#374151" style={{ fontSize: 10, fontWeight: 600 }} formatter={(v) => `${((v/100)*PARAMETER_CONFIGS.temperature.max).toFixed(1)} ${PARAMETER_CONFIGS.temperature.unit}`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vibration Chart */}
          <div className="bar-chart-container">
            <h3 style={{ color: PARAMETER_CONFIGS.vibration.color }}>
              {PARAMETER_CONFIGS.vibration.name}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayVibration} margin={{ top: 4, right: 0, bottom: 28, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  type="category"
                  allowDuplicatedCategory={false}
                  ticks={weeklyTicks}
                  interval={0}
                  minTickGap={0}
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 9 }}
                  angle={0}
                  textAnchor="middle"
                    tickMargin={10}
                    height={42}
                  tickFormatter={(value) => value}
                />
                <YAxis
                  ticks={PARAMETER_CONFIGS.vibration.yAxisTicks}
                  domain={[0, PARAMETER_CONFIGS.vibration.max]}
                  stroke="#9CA3AF"
                  tick={{ fontSize: 8 }}
                  width={42}
                  tickCount={6}
                  interval={0}
                  label={{ value: PARAMETER_CONFIGS.vibration.unit, angle: -90, position: 'insideLeft', offset: -2, style: { fill: '#6b7280', fontSize: 10 } }}
                />
                <Tooltip
                  formatter={(value) => [formatValueWithUnit(value, PARAMETER_CONFIGS.vibration.unit), "Vibration"]}
                  labelFormatter={formatTooltipLabel}
                />
                <Bar dataKey="value" fill={PARAMETER_CONFIGS.vibration.color}>
                  <LabelList dataKey="value" position="top" fill="#374151" style={{ fontSize: 10, fontWeight: 600 }} formatter={(v) => `${((v/100)*PARAMETER_CONFIGS.vibration.max).toFixed(1)} ${PARAMETER_CONFIGS.vibration.unit}`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Power Chart */}
          <div className="bar-chart-container">
            <h3 style={{ color: PARAMETER_CONFIGS.power.color }}>
              {PARAMETER_CONFIGS.power.name}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayPower} margin={{ top: 4, right: 0, bottom: 28, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  type="category"
                  allowDuplicatedCategory={false}
                  ticks={weeklyTicks}
                  interval={0}
                  minTickGap={0}
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 9 }}
                  angle={0}
                  textAnchor="middle"
                    tickMargin={10}
                    height={42}
                  tickFormatter={(value) => value}
                />
                <YAxis
                  ticks={PARAMETER_CONFIGS.power.yAxisTicks}
                  domain={[0, PARAMETER_CONFIGS.power.max]}
                  stroke="#9CA3AF"
                  tick={{ fontSize: 8 }}
                  width={42}
                  tickCount={6}
                  interval={0}
                  label={{ value: PARAMETER_CONFIGS.power.unit, angle: -90, position: 'insideLeft', offset: -2, style: { fill: '#6b7280', fontSize: 10 } }}
                />
                <Tooltip
                  formatter={(value) => [formatValueWithUnit(value, PARAMETER_CONFIGS.power.unit), "Power"]}
                  labelFormatter={formatTooltipLabel}
                />
                <Bar dataKey="value" fill={PARAMETER_CONFIGS.power.color}>
                  <LabelList dataKey="value" position="top" fill="#374151" style={{ fontSize: 10, fontWeight: 600 }} formatter={(v) => `${((v/100)*PARAMETER_CONFIGS.power.max).toFixed(1)} ${PARAMETER_CONFIGS.power.unit}`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
