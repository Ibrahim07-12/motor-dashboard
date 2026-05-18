import React, { useState, useEffect } from "react";
import { dataAPI } from "../../services/api";
import {
  PARAMETERS_CONFIG,
  calculateArcConfig,
  generatePath,
} from "../../utils/chartUtils";
import "./Dashboard.css";

/**
 * Dashboard Component - Compact Zabbix-style Layout
 * Single viewport, no scrolling, all widgets visible simultaneously
 */
const Dashboard = ({ sensorData = {}, motorId = "motor_main_shakeout" }) => {
  const [timeFilter, setTimeFilter] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [chartData, setChartData] = useState([]);
  const [weeklyAvg, setWeeklyAvg] = useState({
    vibration: 0,
    temperature: 0,
    power: 0,
    noise: 0,
  });
  const [loading, setLoading] = useState(false);

  // Fetch historical data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        const response = await dataAPI.getHistory(motorId, timeFilter, selectedDate);
        setChartData(response.data.data || []);

        // Calculate weekly average if weekly view
        if (timeFilter === "weekly" && response.data.data?.length > 0) {
          const avgVibration =
            response.data.data.reduce((sum, d) => sum + (d.vibration || 0), 0) /
            response.data.data.length;
          const avgTemp =
            response.data.data.reduce((sum, d) => sum + (d.temperature || 0), 0) /
            response.data.data.length;
          const avgPower =
            response.data.data.reduce((sum, d) => sum + (d.power || 0), 0) /
            response.data.data.length;
          const avgNoise =
            response.data.data.reduce((sum, d) => sum + (d.noise || 0), 0) /
            response.data.data.length;

          setWeeklyAvg({
            vibration: avgVibration,
            temperature: avgTemp,
            power: avgPower,
            noise: avgNoise,
          });
        }
      } catch (error) {
        console.error("Failed to fetch historical data:", error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [timeFilter, selectedDate, motorId]);

  const handleExportCSV = async () => {
    try {
      const response = await dataAPI.exportData(motorId, timeFilter, selectedDate);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sensor-data-${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export CSV");
    }
  };

  // Render gauge - compact version
  const renderGauge = (value, config) => {
    const percentage = Math.min((value / config.max) * 100, 100);
    const arcConfig = calculateArcConfig(percentage);

    return (
      <div className="gauge-card">
        <h3>{config.name}</h3>
        <svg viewBox="0 0 80 80" className="gauge-svg">
          <path d={generatePath(40, 40, 30, 0, 180)} stroke="#333" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d={generatePath(40, 40, 30, arcConfig.startAngle, arcConfig.endAngle)} stroke={arcConfig.color} strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="40" cy="40" r="5" fill={arcConfig.color} />
        </svg>
        <div className="gauge-value">{value.toFixed(1)}</div>
        <div className="gauge-unit">{config.unit}</div>
      </div>
    );
  };

  // Render chart - compact version for single viewport
  const renderChart = () => {
    if (loading) return <div className="loading">⏳ Loading...</div>;
    if (chartData.length === 0) return <div className="empty">No data available</div>;

    const W = 100, H = 100;
    const P = { t: 10, r: 5, b: 15, l: 12 };
    const IW = W - P.l - P.r;
    const IH = H - P.t - P.b;

    const values = chartData.map(d => d.vibration || 0);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;

    const points = values.map((v, i) => ({
      x: P.l + (i / Math.max(chartData.length - 1, 1)) * IW,
      y: P.t + IH - ((v - minVal) / range) * IH,
    }));

    // Y-axis labels (compact)
    const yLabels = [];
    for (let i = 0; i <= 3; i++) {
      const val = minVal + (range / 3) * i;
      yLabels.push({ value: val.toFixed(1), y: P.t + IH - (i / 3) * IH });
    }

    // X-axis labels (minimal)
    const xLabels = [];
    const step = Math.max(1, Math.floor(chartData.length / 3));
    for (let i = 0; i < chartData.length; i += step) {
      xLabels.push({ label: String(i + 1), x: P.l + (i / Math.max(chartData.length - 1, 1)) * IW });
    }

    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* Light grid */}
        {yLabels.map((l, i) => (
          <line key={i} x1={P.l} y1={l.y} x2={W - P.r} y2={l.y} stroke="#333" strokeWidth="0.3" opacity="0.3" />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((l, i) => (
          <text key={`y-${i}`} x={P.l - 1} y={l.y + 1.5} fontSize="2.5" fill="#999" textAnchor="end">{l.value}</text>
        ))}

        {/* Axes */}
        <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + IH} stroke="#555" strokeWidth="0.5" />
        <line x1={P.l} y1={P.t + IH} x2={W - P.r} y2={P.t + IH} stroke="#555" strokeWidth="0.5" />

        {/* Chart line */}
        <path d={path} fill="none" stroke="#00d4ff" strokeWidth="0.8" strokeLinejoin="round" />
      </svg>
    );
  };

  // Render bar chart for weekly average
  const renderBarChart = () => {
    const W = 100, H = 100;
    const P = { t: 10, r: 5, b: 20, l: 10 };
    const IW = W - P.l - P.r;
    const IH = H - P.t - P.b;

    const parameters = [
      { name: "VIB", value: weeklyAvg.vibration, max: 50, color: "#00d4ff" },
      { name: "TMP", value: weeklyAvg.temperature, max: 100, color: "#ff6b6b" },
      { name: "PWR", value: weeklyAvg.power / 1000, max: 23, color: "#4ecdc4" },
      { name: "NO", value: weeklyAvg.noise, max: 120, color: "#ffd93d" },
    ];

    const barWidth = (IW / parameters.length) * 0.8;
    const barGap = (IW / parameters.length) * 0.2;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {parameters.map((param, idx) => {
          const percentage = Math.min(param.value / param.max, 1);
          const barHeight = percentage * IH;
          const barX = P.l + idx * (barWidth + barGap) + barGap / 2;
          const barY = P.t + IH - barHeight;

          return (
            <g key={idx}>
              {/* Bar background */}
              <rect x={barX} y={P.t} width={barWidth} height={IH} fill="transparent" stroke="#333" strokeWidth="0.3" />

              {/* Bar */}
              <rect x={barX} y={barY} width={barWidth} height={barHeight} fill={param.color} opacity="0.8" />

              {/* Label */}
              <text
                x={barX + barWidth / 2}
                y={P.t + IH + 5}
                textAnchor="middle"
                fontSize="2"
                fill="#999"
                fontWeight="500"
              >
                {param.name}
              </text>

              {/* Value at top of bar */}
              <text
                x={barX + barWidth / 2}
                y={barY - 1}
                textAnchor="middle"
                fontSize="2"
                fill={param.color}
                fontWeight="600"
              >
                {param.value.toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <div>
          <h1>⚙️ MOTOR MONITORING</h1>
          <p>Real-time machine health</p>
        </div>
        <div>
          <p style={{ margin: 0, color: "#16d9ff", fontWeight: 600, fontSize: "11px" }}>
            ● ONLINE &nbsp;|&nbsp; Motor: {motorId}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* LEFT: Real-time Gauges */}
        <div className="gauges">
          {renderGauge(sensorData.vibration || 0, PARAMETERS_CONFIG.vibration)}
          {renderGauge(sensorData.temperature || 0, PARAMETERS_CONFIG.temperature)}
          {renderGauge(sensorData.power || 0, PARAMETERS_CONFIG.power)}
          {renderGauge(sensorData.noise || 0, PARAMETERS_CONFIG.noise)}
        </div>

        {/* TOP CENTER: Historical Chart */}
        <div className="chart-section">
          <div className="section">
            <div className="chart-header">
              <h2>📊 Daily Trend</h2>
              <div className="controls">
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
            </div>
            <div className="chart">
              {renderChart()}
            </div>
          </div>
        </div>

        {/* TOP RIGHT: Bar Chart */}
        <div className="bar-chart-section">
          <div className="section">
            <h2>📈 Weekly Avg</h2>
            <div className="bar-chart">
              {renderBarChart()}
            </div>
          </div>
        </div>

        {/* BOTTOM: Summary Cards */}
        <div className="avg-grid">
          <div className="avg-card">
            <div className="label">Vibration</div>
            <div className="value">{(sensorData.vibration || 0).toFixed(1)}</div>
            <div style={{ fontSize: "8px", color: "#999" }}>m/s²</div>
          </div>

          <div className="avg-card">
            <div className="label">Temperature</div>
            <div className="value">{(sensorData.temperature || 0).toFixed(1)}</div>
            <div style={{ fontSize: "8px", color: "#999" }}>°C</div>
          </div>

          <div className="avg-card">
            <div className="label">Power</div>
            <div className="value">{((sensorData.power || 0) / 1000).toFixed(1)}</div>
            <div style={{ fontSize: "8px", color: "#999" }}>kW</div>
          </div>

          <div className="avg-card">
            <div className="label">Noise</div>
            <div className="value">{(sensorData.noise || 0).toFixed(1)}</div>
            <div style={{ fontSize: "8px", color: "#999" }}>dB</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
