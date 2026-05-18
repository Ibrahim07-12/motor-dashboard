import React, { useState, useEffect } from "react";
import { dataAPI } from "../../services/api";
import "./Dashboard_v2.css";

/**
 * Dashboard Component with multiple improvements:
 * 1. Circular gauges with needle (speedometer style) - COMPACT
 * 2. Line chart with relative % Y-axis (0-25-50-75-100)
 * 3. Bar chart with weekly/monthly date picker
 * 4. Export CSV functionality
 * 5. Single viewport layout - NO SCROLLING
 */

// Sensor Configuration with ranges
const SENSOR_CONFIG = {
  vibration: { name: "Vibration", unit: "m/s²", min: 0, max: 50, color: "#00d4ff" },
  temperature: { name: "Temperature", unit: "°C", min: 0, max: 100, color: "#ff6b6b" },
  power: { name: "Power", unit: "kW", min: 0, max: 23, color: "#4ecdc4" },
  noise: { name: "Noise", unit: "dB", min: 0, max: 120, color: "#ffd93d" },
};

// Circular Gauge Component with Needle
const CircularGauge = ({ value, config, size = 100 }) => {
  const radius = size / 2 - 5;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Convert value to angle (0 degrees = 225, 180 degrees = -45)
  const percentage = Math.min(Math.max(value / config.max, 0), 1);
  const angle = 225 - percentage * 270; // 225 to -45 degrees
  const angleRad = (angle * Math.PI) / 180;
  
  // Needle end point
  const needleLength = radius * 0.7;
  const needleX = centerX + needleLength * Math.cos(angleRad);
  const needleY = centerY + needleLength * Math.sin(angleRad);
  
  // Arc path for background
  const startAngle = 225;
  const endAngle = -45;
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  
  const startX = centerX + radius * Math.cos(startRad);
  const startY = centerY + radius * Math.sin(startRad);
  const endX = centerX + radius * Math.cos(endRad);
  const endY = centerY + radius * Math.sin(endRad);
  
  // Fill arc based on percentage
  const fillEndAngle = startAngle - percentage * 270;
  const fillEndRad = (fillEndAngle * Math.PI) / 180;
  const fillEndX = centerX + radius * Math.cos(fillEndRad);
  const fillEndY = centerY + radius * Math.sin(fillEndRad);
  
  const largeArc = percentage > 0.5 ? 1 : 0;
  const fillPath = `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${fillEndX} ${fillEndY} Z`;
  
  return (
    <div className="circular-gauge" style={{ width: `${size}px`, height: `${size}px` }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {/* Background arc */}
        <path
          d={`M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY} Z`}
          fill={config.color}
          opacity="0.15"
        />
        
        {/* Fill arc */}
        <path d={fillPath} fill={config.color} opacity="0.6" />
        
        {/* Needle */}
        <line x1={centerX} y1={centerY} x2={needleX} y2={needleY} stroke={config.color} strokeWidth="2" strokeLinecap="round" />
        
        {/* Center circle */}
        <circle cx={centerX} cy={centerY} r="3" fill={config.color} />
        
        {/* Value text */}
        <text x={centerX} y={centerY + 8} textAnchor="middle" fontSize={size * 0.2} fill={config.color} fontWeight="bold">
          {value.toFixed(1)}
        </text>
        
        {/* Unit text */}
        <text x={centerX} y={centerY + 18} textAnchor="middle" fontSize={size * 0.08} fill="#999">
          {config.unit}
        </text>
      </svg>
      <div className="gauge-label">{config.name}</div>
    </div>
  );
};

// Line Chart Component with Relative % Y-axis
const LineChart = ({ data, title, exportFn }) => {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data available</div>;
  }

  const width = 100;
  const height = 80;
  const padding = { top: 5, right: 5, bottom: 15, left: 15 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Get vibration data and normalize to 0-100%
  const vibrationMax = SENSOR_CONFIG.vibration.max;
  const values = data.map(d => (Math.min(d.vibration || 0, vibrationMax) / vibrationMax) * 100);
  
  if (values.length === 0) return <div className="chart-empty">No measurement data</div>;

  // Calculate points
  const points = values.map((v, i) => ({
    x: padding.left + (i / Math.max(values.length - 1, 1)) * plotWidth,
    y: padding.top + plotHeight - (v / 100) * plotHeight,
  }));

  // Generate path
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  
  // Y-axis labels (0, 25, 50, 75, 100)
  const yLabels = [
    { label: "0%", y: padding.top + plotHeight },
    { label: "25%", y: padding.top + plotHeight * 0.75 },
    { label: "50%", y: padding.top + plotHeight * 0.5 },
    { label: "75%", y: padding.top + plotHeight * 0.25 },
    { label: "100%", y: padding.top },
  ];

  // X-axis labels (every Nth point)
  const xStep = Math.max(1, Math.floor(data.length / 4));
  const xLabels = [];
  for (let i = 0; i < data.length; i += xStep) {
    xLabels.push({
      label: i + 1,
      x: padding.left + (i / Math.max(data.length - 1, 1)) * plotWidth,
    });
  }

  return (
    <div className="line-chart-container">
      <div className="chart-controls">
        <span>{title}</span>
        <button onClick={exportFn} className="export-btn">📥 Export CSV</button>
      </div>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="line-chart">
        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <g key={`y-${i}`}>
            <line x1={padding.left - 1} y1={label.y} x2={width - padding.right} y2={label.y} stroke="#333" strokeWidth="0.3" opacity="0.5" />
            <text x={padding.left - 2} y={label.y + 1} fontSize="2.2" fill="#888" textAnchor="end" fontWeight="500">
              {label.label}
            </text>
          </g>
        ))}

        {/* X-axis */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={width - padding.right} y2={padding.top + plotHeight} stroke="#555" strokeWidth="0.4" />

        {/* Y-axis */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#555" strokeWidth="0.4" />

        {/* Data line */}
        <path d={pathD} fill="none" stroke="#00d4ff" strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={`point-${i}`} cx={p.x} cy={p.y} r="0.4" fill="#00d4ff" opacity="0.7" />
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text key={`x-${i}`} x={label.x} y={padding.top + plotHeight + 4} fontSize="1.8" fill="#888" textAnchor="middle">
            {label.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

// Bar Chart Component for Weekly/Monthly Average
const BarChart = ({ weeklyData, monthlyData, timeMode, onTimeChange, onDateChange, selectedDate }) => {
  const data = timeMode === "weekly" ? weeklyData : monthlyData;
  
  const width = 100;
  const height = 80;
  const padding = { top: 5, right: 5, bottom: 15, left: 12 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (!data || data.length === 0) {
    return <div className="chart-empty">No data available for {timeMode}</div>;
  }

  // Get max value for Y-axis
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.vibration || 0, d.temperature || 0, (d.power || 0) / 1000, d.noise || 0))
  );

  const barWidth = plotWidth / (data.length * 4.5);
  const groupGap = barWidth * 0.5;

  return (
    <div className="bar-chart-container">
      <div className="chart-controls">
        <select value={timeMode} onChange={(e) => onTimeChange(e.target.value)} className="time-select">
          <option value="weekly">Weekly Average</option>
          <option value="monthly">Monthly Average</option>
        </select>
        <input type="date" value={selectedDate} onChange={(e) => onDateChange(e.target.value)} className="date-input" />
      </div>

      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="bar-chart">
        {/* Y-axis labels (0, 25%, 50%, 75%, 100%) */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <g key={`y-${i}`}>
            <line x1={padding.left - 1} y1={padding.top + plotHeight * (1 - pct)} x2={width - padding.right} y2={padding.top + plotHeight * (1 - pct)} stroke="#333" strokeWidth="0.2" opacity="0.3" />
            <text x={padding.left - 2} y={padding.top + plotHeight * (1 - pct) + 1} fontSize="1.8" fill="#888" textAnchor="end">
              {Math.round(pct * 100)}%
            </text>
          </g>
        ))}

        {/* X-axis */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={width - padding.right} y2={padding.top + plotHeight} stroke="#555" strokeWidth="0.4" />

        {/* Y-axis */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#555" strokeWidth="0.4" />

        {/* Bars */}
        {data.map((dayData, dayIdx) => {
          const groupX = padding.left + (dayIdx / data.length) * plotWidth;
          const dayLabel = dayIdx + 1;

          // Normalize and scale
          const vibPct = Math.min((dayData.vibration || 0) / SENSOR_CONFIG.vibration.max, 1);
          const tempPct = Math.min((dayData.temperature || 0) / SENSOR_CONFIG.temperature.max, 1);
          const pwrPct = Math.min(((dayData.power || 0) / 1000) / SENSOR_CONFIG.power.max, 1);
          const noisePct = Math.min((dayData.noise || 0) / SENSOR_CONFIG.noise.max, 1);

          const bars = [
            { pct: vibPct, color: "#00d4ff", offset: 0 },
            { pct: tempPct, color: "#ff6b6b", offset: 1 },
            { pct: pwrPct, color: "#4ecdc4", offset: 2 },
            { pct: noisePct, color: "#ffd93d", offset: 3 },
          ];

          return (
            <g key={`day-${dayIdx}`}>
              {bars.map((bar, barIdx) => {
                const barX = groupX + bar.offset * (barWidth + groupGap);
                const barHeight = bar.pct * plotHeight;
                const barY = padding.top + plotHeight - barHeight;

                return (
                  <rect
                    key={`bar-${dayIdx}-${barIdx}`}
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill={bar.color}
                    opacity="0.75"
                  />
                );
              })}

              {/* Day label */}
              <text
                x={groupX + barWidth * 2}
                y={padding.top + plotHeight + 4}
                fontSize="1.6"
                fill="#888"
                textAnchor="middle"
              >
                {dayLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="chart-legend">
        <span style={{ color: "#00d4ff" }}>■ Vib</span>
        <span style={{ color: "#ff6b6b" }}>■ Tmp</span>
        <span style={{ color: "#4ecdc4" }}>■ Pwr</span>
        <span style={{ color: "#ffd93d" }}>■ Noi</span>
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = ({ sensorData = {}, motorId = "motor_main_shakeout" }) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [chartMode, setChartMode] = useState("daily");
  const [avgMode, setAvgMode] = useState("weekly");
  const [loading, setLoading] = useState(false);

  // Fetch historical data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch daily history for line chart
        const histResponse = await dataAPI.getHistory(motorId, chartMode, selectedDate);
        setHistoricalData(histResponse.data.data || []);

        // Fetch weekly average
        const weekResponse = await dataAPI.getWeeklyAverage(motorId, selectedDate);
        setWeeklyData(weekResponse.data.data || []);

        // Fetch monthly average
        const monthResponse = await dataAPI.getMonthlyAverage(motorId, selectedDate);
        setMonthlyData(monthResponse.data.data || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [motorId, chartMode, selectedDate]);

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const response = await dataAPI.exportData(motorId, chartMode, selectedDate);
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sensor-data-${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export CSV");
    }
  };

  return (
    <div className="dashboard-v2">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>⚙️ MOTOR MONITORING</h1>
          <p>Real-time machine health</p>
        </div>
        <div className="header-right">
          <span className="status-online">● ONLINE</span>
          <span className="motor-id">{motorId}</span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="dashboard-grid">
        {/* Left: Compact Circular Gauges (4 stacked) */}
        <div className="gauges-panel">
          <CircularGauge value={sensorData.vibration || 0} config={SENSOR_CONFIG.vibration} size={90} />
          <CircularGauge value={sensorData.temperature || 0} config={SENSOR_CONFIG.temperature} size={90} />
          <CircularGauge value={(sensorData.power || 0) / 1000} config={SENSOR_CONFIG.power} size={90} />
          <CircularGauge value={sensorData.noise || 0} config={SENSOR_CONFIG.noise} size={90} />
        </div>

        {/* Center: Large Line Chart (Daily Trend with relative %) */}
        <div className="chart-panel">
          <div className="controls-row">
            <select value={chartMode} onChange={(e) => setChartMode(e.target.value)} className="select-control">
              <option value="daily">Daily (per hour)</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-control"
            />
          </div>
          <LineChart data={historicalData} title="Daily Trend - Vibration Level (%)" exportFn={handleExportCSV} />
        </div>

        {/* Right: Weekly/Monthly Bar Chart */}
        <div className="bar-panel">
          <BarChart
            weeklyData={weeklyData}
            monthlyData={monthlyData}
            timeMode={avgMode}
            onTimeChange={setAvgMode}
            onDateChange={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
