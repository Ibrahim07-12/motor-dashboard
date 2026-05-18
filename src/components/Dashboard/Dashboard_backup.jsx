import React, { useState, useEffect } from "react";
import { dataAPI } from "../../services/api";
import {
  PARAMETERS_CONFIG,
  calculateArcConfig,
  generatePath,
} from "../../utils/chartUtils";
import "./Dashboard.css";

/**
 * Dashboard Component
 * - Real-time gauge display (4 sensors)
 * - Historical data chart (daily/weekly/monthly)
 * - Weekly average parameters
 * - Export CSV functionality
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
      // Create download link
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

  // Format date to Indonesian
  const formatDateID = (dateStr) => {
    const date = new Date(dateStr);
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Render gauge - simple and clean
  const renderGauge = (value, config) => {
    const percentage = Math.min((value / config.max) * 100, 100);
    const arcConfig = calculateArcConfig(percentage);

    return (
      <div className="gauge-card">
        <h3>{config.name}</h3>
        <svg viewBox="0 0 120 120" className="gauge-svg">
          <path d={generatePath(60, 60, 45, 0, 180)} stroke="#e0e0e0" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d={generatePath(60, 60, 45, arcConfig.startAngle, arcConfig.endAngle)} stroke={arcConfig.color} strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="60" r="8" fill={arcConfig.color} />
        </svg>
        <div className="gauge-value">{value.toFixed(2)}</div>
        <div className="gauge-unit">{config.unit}</div>
      </div>
    );
  };

  // Render chart - simple line chart with axes
  const renderChart = () => {
    if (loading) return <div className="loading">Loading...</div>;
    if (chartData.length === 0) return <div className="empty">No data available</div>;

    const W = 850, H = 300;
    const P = { t: 20, r: 20, b: 50, l: 60 };
    const IW = W - P.l - P.r;
    const IH = H - P.t - P.b;

    // Data processing
    const values = chartData.map(d => d.vibration || 0);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;

    // Calculate points
    const points = values.map((v, i) => ({
      x: P.l + (i / Math.max(chartData.length - 1, 1)) * IW,
      y: P.t + IH - ((v - minVal) / range) * IH,
    }));

    // Y-axis labels
    const yLabels = [];
    for (let i = 0; i <= 5; i++) {
      const val = minVal + (range / 5) * i;
      yLabels.push({ value: val.toFixed(1), y: P.t + IH - (i / 5) * IH });
    }

    // X-axis labels
    const xLabels = [];
    const step = Math.max(1, Math.floor(chartData.length / 5));
    for (let i = 0; i < chartData.length; i += step) {
      xLabels.push({ label: String(i + 1), x: P.l + (i / Math.max(chartData.length - 1, 1)) * IW });
    }

    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <div className="chart">
        <svg width={W} height={H}>
          {/* Grid lines */}
          {yLabels.map((l, i) => (
            <line key={i} x1={P.l} y1={l.y} x2={W - P.r} y2={l.y} stroke="#f0f0f0" strokeWidth="1" />
          ))}

          {/* Y-axis labels */}
          {yLabels.map((l, i) => (
            <text key={`y-${i}`} x={P.l - 10} y={l.y + 4} fontSize="11" fill="#666" textAnchor="end">{l.value}</text>
          ))}

          {/* X-axis labels */}
          {xLabels.map((l, i) => (
            <text key={`x-${i}`} x={l.x} y={H - 10} fontSize="11" fill="#666" textAnchor="middle">{l.label}</text>
          ))}

          {/* Axes */}
          <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + IH} stroke="#333" strokeWidth="2" />
          <line x1={P.l} y1={P.t + IH} x2={W - P.r} y2={P.t + IH} stroke="#333" strokeWidth="2" />

          {/* Chart line */}
          <path d={path} fill="none" stroke="#667eea" strokeWidth="2.5" strokeLinejoin="round" />

          {/* Data points */}
          {points.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r="3" fill="#667eea" />))}
        </svg>
      </div>
    );
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <h1>📊 DASHBOARD MONITORING MESIN SHAKEOUT</h1>
        <p>Motor Mainshakeout</p>
      </div>

      {/* Real-time Gauges */}
      <div className="section">
        <h2>Real-Time Sensor Data</h2>
        <div className="gauges">
          {renderGauge(sensorData.vibration || 0, PARAMETERS_CONFIG.vibration)}
          {renderGauge(sensorData.temperature || 0, PARAMETERS_CONFIG.temperature)}
          {renderGauge(sensorData.power || 0, PARAMETERS_CONFIG.power)}
          {renderGauge(sensorData.noise || 0, PARAMETERS_CONFIG.noise)}
        </div>
      </div>

      {/* Weekly Average */}
      {timeFilter === "weekly" && chartData.length > 0 && (
        <div className="section">
          <h2>Rata-Rata Mingguan</h2>
          <div className="avg-grid">
            <div className="avg-card">
              <span className="label">Vibration</span>
              <span className="value">{weeklyAvg.vibration.toFixed(2)} m/s²</span>
            </div>
            <div className="avg-card">
              <span className="label">Temperature</span>
              <span className="value">{weeklyAvg.temperature.toFixed(2)} °C</span>
            </div>
            <div className="avg-card">
              <span className="label">Power</span>
              <span className="value">{weeklyAvg.power.toFixed(0)} W</span>
            </div>
            <div className="avg-card">
              <span className="label">Noise</span>
              <span className="value">{weeklyAvg.noise.toFixed(2)} dB</span>
            </div>
          </div>
        </div>
      )}

      {/* Historical Chart */}
      <div className="section">
        <div className="chart-header">
          <h2>Grafik Historis</h2>
          <div className="controls">
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <button onClick={handleExportCSV} className="btn-export">Export CSV</button>
          </div>
        </div>
        {renderChart()}
      </div>
    </div>
  );
};

export default Dashboard;

