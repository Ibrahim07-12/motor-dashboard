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

// Helper: Empty weekly data (real data only)
const generateWeeklyData = () => {
  return {
    noise: [],
    temperature: [],
    vibration: [],
    power: [],
  };
};



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
          const formattedData = rows.map((row) => {
            // Parse timestamp to extract hour
            const timestamp = new Date(row.timestamp || row.time);
            const hour = String(timestamp.getHours()).padStart(2, '0');
            const time = `${hour}:00`;
            
            return {
              time: time,
              vibration: normalizeToPercentage(row.vibration || 0, PARAMETER_CONFIGS.vibration.max),
              temperature: normalizeToPercentage(row.temperature || 0, PARAMETER_CONFIGS.temperature.max),
              power: normalizeToPercentage((row.power || 0) / 1000, PARAMETER_CONFIGS.power.max), // Convert watts to kW
              noise: normalizeToPercentage(row.noise || 0, PARAMETER_CONFIGS.noise.max),
            };
          });
          setHistoricalData(formattedData);
        } else {
          setHistoricalData([]);
          setHistoricalError(`Tidak ada data historis untuk ${historicalDate}.`);
        }
      } catch (error) {
        console.error(`Error fetching historical data for ${historicalDate}:`, error.message);
        setHistoricalData([]);
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

  // Fetch weekly average data on mount and daily
  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        setWeeklyError("");
        // Convert selectedDate (calendar date) into the Monday date string YYYY-MM-DD for the week
        const sel = new Date(selectedDate);
        const day = sel.getDay();
        const diff = sel.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
        const monday = new Date(sel.setDate(diff));
        const weekStartStr = monday.toISOString().split('T')[0];
        const response = await dataAPI.getWeeklyAverage(motorId, weekStartStr);
        const rows = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        if (rows.length > 0) {
          // Backend returns daily aggregates for the week. Use last 5 business days (Mon-Fri)
          const recentData = rows.slice(-5);
          
          const formattedData = {
            noise: recentData.map((row, idx) => ({
              name: ["sen", "sel", "rab", "kam", "jum"][idx] || `day${idx}`,
              value: normalizeToPercentage(row.noise || 0, PARAMETER_CONFIGS.noise.max),
            })),
            temperature: recentData.map((row, idx) => ({
              name: ["sen", "sel", "rab", "kam", "jum"][idx] || `day${idx}`,
              value: normalizeToPercentage(row.temperature || 0, PARAMETER_CONFIGS.temperature.max),
            })),
            vibration: recentData.map((row, idx) => ({
              name: ["sen", "sel", "rab", "kam", "jum"][idx] || `day${idx}`,
              value: normalizeToPercentage(row.vibration || 0, PARAMETER_CONFIGS.vibration.max),
            })),
            power: recentData.map((row, idx) => ({
              name: ["sen", "sel", "rab", "kam", "jum"][idx] || `day${idx}`,
              value: normalizeToPercentage((row.power || 0) / 1000, PARAMETER_CONFIGS.power.max), // Convert watts to kW
            })),
          };
          setWeeklyData(formattedData);
        } else {
          setWeeklyData(generateWeeklyData());
          setWeeklyError("Tidak ada data weekly average pada periode ini.");
        }
      } catch (error) {
        console.error("Error fetching weekly data:", error.message);
        setWeeklyData(generateWeeklyData());
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          setWeeklyError("Akses weekly average ditolak (token tidak valid/expired). Silakan login ulang.");
        } else {
          setWeeklyError("Gagal mengambil weekly average dari server.");
        }
      }
    };
    fetchWeeklyData();
    
    // Refresh weekly data every 5 minutes
    const interval = setInterval(fetchWeeklyData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [motorId, selectedDate]);

  // Re-fetch weekly when user changes selected date
  useEffect(() => {
    const fetchWeekly = async () => {
      try {
        setWeeklyError("");
        const sel = new Date(selectedDate);
        const day = sel.getDay();
        const diff = sel.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(sel.setDate(diff));
        const weekStartStr = monday.toISOString().split('T')[0];
        const response = await dataAPI.getWeeklyAverage(motorId, weekStartStr);
        const rows = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        const paddedRows = weeklyLabels.map((label, index) => {
          const row = rows[index] || {};
          return {
            name: label,
            noise: row.noise || 0,
            temperature: row.temperature || 0,
            vibration: row.vibration || 0,
            power: row.power || 0,
          };
        });
        if (rows.length > 0) {
          const formattedData = {
            noise: paddedRows.map((row, idx) => ({
              name: weeklyLabels[idx] || `day${idx}`,
              value: normalizeToPercentage(row.noise || 0, PARAMETER_CONFIGS.noise.max),
            })),
            temperature: paddedRows.map((row, idx) => ({
              name: weeklyLabels[idx] || `day${idx}`,
              value: normalizeToPercentage(row.temperature || 0, PARAMETER_CONFIGS.temperature.max),
            })),
            vibration: paddedRows.map((row, idx) => ({
              name: weeklyLabels[idx] || `day${idx}`,
              value: normalizeToPercentage(row.vibration || 0, PARAMETER_CONFIGS.vibration.max),
            })),
            power: paddedRows.map((row, idx) => ({
              name: weeklyLabels[idx] || `day${idx}`,
              value: normalizeToPercentage((row.power || 0) / 1000, PARAMETER_CONFIGS.power.max),
            })),
          };
          setWeeklyData(formattedData);
        } else {
          setWeeklyData({
            noise: weeklyLabels.map((name) => ({ name, value: 0 })),
            temperature: weeklyLabels.map((name) => ({ name, value: 0 })),
            vibration: weeklyLabels.map((name) => ({ name, value: 0 })),
            power: weeklyLabels.map((name) => ({ name, value: 0 })),
          });
          setWeeklyError("Tidak ada data weekly average pada periode ini.");
        }
      } catch (error) {
        console.error("Error fetching weekly data:", error.message);
        setWeeklyData({
          noise: weeklyLabels.map((name) => ({ name, value: 0 })),
          temperature: weeklyLabels.map((name) => ({ name, value: 0 })),
          vibration: weeklyLabels.map((name) => ({ name, value: 0 })),
          power: weeklyLabels.map((name) => ({ name, value: 0 })),
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

  const weekStringToMondayDate = (weekStr) => {
    const parts = weekStr.split('-W');
    if (parts.length !== 2) return null;
    const y = parseInt(parts[0], 10);
    const w = parseInt(parts[1], 10);
    const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
    const dow = simple.getUTCDay();
    const monday = new Date(simple);
    const diff = (dow <= 4) ? (1 - dow) : (8 - dow);
    monday.setUTCDate(simple.getUTCDate() + diff);
    return monday.toISOString().split('T')[0];
  };

  const handleExportWeekly = async () => {
    try {
      const monday = weekStringToMondayDate(selectedWeek);
      if (!monday) {
        alert('Pilih minggu yang valid untuk export');
        return;
      }
      const resp = await dataAPI.exportData(motorId, 'weekly', monday);
      const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-average-${monday}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export weekly failed', err);
      alert('Gagal export weekly.');
    }
  };

  const powerPhases = sensorData.powerPhases || { R: 0, S: 0, T: 0 };

  const renderMiniPhaseGauge = (phaseKey, value, phaseThresholdW, isUnbalanced = false) => {
    const displayValue = value / 1000.0;
    const thresholdKw = phaseThresholdW / 1000.0;
    const percentage = Math.min((displayValue / PARAMETER_CONFIGS.power.max) * 100, 100);
    const dashOffset = 100 - percentage;
    let gaugeColor = displayValue <= thresholdKw ? "#22c55e" : "#ef4444";
    if (isUnbalanced) gaugeColor = "#ef4444";

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
          <text x="88" y="67" textAnchor="end" className="mini-phase-max-label">{PARAMETER_CONFIGS.power.max}</text>
        </svg>
        <div className="mini-phase-value">
          {displayValue.toFixed(1)} <span>kW</span>
        </div>
      </div>
    );
  };

  const renderPhaseCard = () => {
    const phaseThresholdR = thresholds.power && thresholds.power.R ? thresholds.power.R : 8000;
    const phaseThresholdS = thresholds.power && thresholds.power.S ? thresholds.power.S : 8000;
    const phaseThresholdT = thresholds.power && thresholds.power.T ? thresholds.power.T : 8000;

    return (
      <div className="gauge-container power-phase-card">
        <div className="gauge-label">Power Phase (R / S / T)</div>
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
  const historicalTicks = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:00"];
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
    if (!historicalData || historicalData.length === 0) {
      alert("Data tidak tersedia untuk di-export. Pilih tanggal dengan data yang ada.");
      return;
    }
    
    const rows = historicalData.map(row => ({
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
      { wch: 12 }, // Date
      { wch: 10 }, // Time
      { wch: 16 }, // Vibration
      { wch: 16 }, // Temperature
      { wch: 12 }, // Power
      { wch: 12 }, // Noise
    ];
    worksheet["!cols"] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historis");
    XLSX.writeFile(workbook, `grafik-historis-${historicalDate}.xlsx`);
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
