import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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

// Helper: Generate dummy data untuk historis
const generateHistoricalData = (hours = 24) => {
  const data = [];
  for (let i = 0; i < hours; i++) {
    data.push({
      time: `${String(i).padStart(2, "0")}:00`,
      vibration: normalizeToPercentage(Math.random() * 80, 100),
      temperature: normalizeToPercentage(Math.random() * 800, 1024),
      power: normalizeToPercentage(Math.random() * 20, 23),
      noise: normalizeToPercentage(Math.random() * 140, 160),
    });
  }
  return data;
};

// Helper: Generate dummy weekly data
const generateWeeklyData = () => {
  const days = ["sen", "sel", "rab", "kam", "jum"];
  return {
    noise: days.map((day) => ({
      name: day,
      value: Math.random() * 160,
    })),
    temperature: days.map((day) => ({
      name: day,
      value: Math.random() * 1024,
    })),
    vibration: days.map((day) => ({
      name: day,
      value: Math.random() * 100,
    })),
    power: days.map((day) => ({
      name: day,
      value: Math.random() * 23,
    })),
  };
};

// Helper: Generate dummy monthly data
const generateMonthlyData = () => {
  const days = ["5", "10", "15", "20", "25", "30"];
  return {
    noise: days.map((day) => ({
      name: day,
      value: Math.random() * 160,
    })),
    temperature: days.map((day) => ({
      name: day,
      value: Math.random() * 1024,
    })),
    vibration: days.map((day) => ({
      name: day,
      value: Math.random() * 100,
    })),
    power: days.map((day) => ({
      name: day,
      value: Math.random() * 23,
    })),
  };
};

const Dashboard = ({ sensorData = {}, motorId = "motor_main_shakeout" }) => {
  // Real-time gauge values
  const [gauges, setGauges] = useState({
    vibration: 0,
    temperature: 0,
    power: 0,
    noise: 0,
  });

  // Historical chart data
  const [historicalData, setHistoricalData] = useState(generateHistoricalData());

  // Weekly/Monthly chart data
  const [chartMode, setChartMode] = useState("weekly"); // "weekly" or "monthly"
  const [weeklyData, setWeeklyData] = useState(generateWeeklyData());
  const [monthlyData, setMonthlyData] = useState(generateMonthlyData());

  // Date pickers
  const [historicalDate, setHistoricalDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [averageMonth, setAverageMonth] = useState(new Date().toISOString().slice(0, 7));

  // Update gauge values (simulate real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      setGauges({
        vibration: Math.random() * 80,
        temperature: Math.random() * 800,
        power: Math.random() * 20,
        noise: Math.random() * 140,
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Render simple semicircle gauge
  const renderGauge = (value, config) => {
    const percentage = Math.min((value / config.max) * 100, 100);
    const dashOffset = 100 - percentage;

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
            stroke={config.color}
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={dashOffset}
          />
          <circle cx="60" cy="66" r="3.2" fill={config.color} />
          <text x="14" y="82" textAnchor="middle" className="gauge-min-label">0</text>
          <text x="106" y="82" textAnchor="middle" className="gauge-max-label">{config.max}</text>
        </svg>
        <div className="gauge-value">
          {value.toFixed(1)} <span>{config.unit}</span>
        </div>
      </div>
    );
  };

  const currentData = chartMode === "weekly" ? weeklyData : monthlyData;

  const formatTooltipLabel = (label) => {
    if (chartMode === "weekly") {
      const map = { sen: "Senin", sel: "Selasa", rab: "Rabu", kam: "Kamis", jum: "Jumat" };
      return map[label] || label;
    }
    if (chartMode === "monthly") {
      return `Hari ke -${label}`;
    }
    return label;
  };

  const handleExportCsv = () => {
    const csvContent = buildHistoricalCsv(historicalDate, historicalData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `grafik-historis-${historicalDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
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
        {renderGauge(gauges.vibration, PARAMETER_CONFIGS.vibration)}
        {renderGauge(gauges.temperature, PARAMETER_CONFIGS.temperature)}
        {renderGauge(gauges.power, PARAMETER_CONFIGS.power)}
        {renderGauge(gauges.noise, PARAMETER_CONFIGS.noise)}
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
            <button className="btn-export" onClick={handleExportCsv}>Export CSV</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={historicalData} margin={{ top: 8, right: 8, left: 44, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" stroke="#9CA3AF" />
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

      {/* Weekly/Monthly Average Section */}
      <div className="average-section">
        <div className="section-header">
          <h2>Weekly and Monthly Average</h2>
          <div className="controls">
            <select value={chartMode} onChange={(e) => setChartMode(e.target.value)}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {chartMode === "monthly" && (
              <label>
                Bulan:
                <input
                  type="month"
                  value={averageMonth}
                  onChange={(e) => setAverageMonth(e.target.value)}
                />
              </label>
            )}
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
              <BarChart data={currentData.noise} margin={{ top: 4, right: 0, bottom: 28, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 9 }}
                  angle={0}
                  textAnchor="middle"
                  tickMargin={8}
                  height={32}
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
                <Bar dataKey="value" fill={PARAMETER_CONFIGS.noise.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Temperature Chart */}
          <div className="bar-chart-container">
            <h3 style={{ color: PARAMETER_CONFIGS.temperature.color }}>
              {PARAMETER_CONFIGS.temperature.name}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentData.temperature} margin={{ top: 4, right: 0, bottom: 28, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 9 }}
                  angle={0}
                  textAnchor="middle"
                  tickMargin={8}
                  height={32}
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
                <Bar dataKey="value" fill={PARAMETER_CONFIGS.temperature.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vibration Chart */}
          <div className="bar-chart-container">
            <h3 style={{ color: PARAMETER_CONFIGS.vibration.color }}>
              {PARAMETER_CONFIGS.vibration.name}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentData.vibration} margin={{ top: 4, right: 0, bottom: 28, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 9 }}
                  angle={0}
                  textAnchor="middle"
                  tickMargin={8}
                  height={32}
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
                <Bar dataKey="value" fill={PARAMETER_CONFIGS.vibration.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Power Chart */}
          <div className="bar-chart-container">
            <h3 style={{ color: PARAMETER_CONFIGS.power.color }}>
              {PARAMETER_CONFIGS.power.name}
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentData.power} margin={{ top: 4, right: 0, bottom: 28, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF" 
                  tick={{ fontSize: 9 }}
                  angle={0}
                  textAnchor="middle"
                  tickMargin={8}
                  height={32}
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
                <Bar dataKey="value" fill={PARAMETER_CONFIGS.power.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
