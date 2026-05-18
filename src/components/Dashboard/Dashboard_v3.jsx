import React, { useState, useEffect } from "react";
import { dataAPI } from "../../services/api";
import { PARAMETERS_CONFIG } from "../../utils/chartUtils";
import "./Dashboard_v3.css";

/**
 * Dashboard V3 - Improved Layout
 * 1. Proper speedometer gauge with pointer needle
 * 2. Weekly/Monthly bar charts with separate calendar
 * 3. Historical chart daily only, wider
 * 4. Dummy data for visualization
 */
const Dashboard = ({ sensorData = {}, motorId = "motor_main_shakeout" }) => {
  const [chartsMode, setChartsMode] = useState("daily"); // daily, weekly, monthly
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedWeekStart, setSelectedWeekStart] = useState(
    getWeekStart(new Date()).toISOString().split("T")[0]
  );
  const [selectedMonth, setSelectedMonth] = useState("2026-05");
  const [historicalData, setHistoricalData] = useState([]);
  const [weeklyData, setWeeklyData] = useState({
    vibration: [],
    temperature: [],
    power: [],
    noise: [],
  });
  const [monthlyData, setMonthlyData] = useState({
    vibration: [],
    temperature: [],
    power: [],
    noise: [],
  });
  const [loading, setLoading] = useState(false);

  // Fetch historical data (daily only)
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        // Use dummy data
        const dummyData = generateDummyHistoricalData();
        setHistoricalData(dummyData);
      } catch (error) {
        console.error("Failed to fetch historical data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [selectedDate]);

  // Fetch weekly data
  useEffect(() => {
    const dummyWeekly = generateDummyWeeklyData();
    setWeeklyData(dummyWeekly);
  }, [selectedWeekStart]);

  // Fetch monthly data
  useEffect(() => {
    const dummyMonthly = generateDummyMonthlyData();
    setMonthlyData(dummyMonthly);
  }, [selectedMonth]);

  const handleExportCSV = () => {
    const header = "Timestamp,Vibration,Temperature,Power,Noise\n";
    const rows = historicalData
      .map((d) => `${d.timestamp},${d.vibration},${d.temperature},${d.power},${d.noise}`)
      .join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sensor-data-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentElement.removeChild(link);
  };

  // Render speedometer gauge with pointer needle
  const renderSpeedometer = (value, config) => {
    const percentage = Math.min((value / config.max) * 100, 100);
    const angle = (percentage / 100) * 180 - 90; // -90 to 90 degrees for semicircle
    
    let needleColor = "#10b981"; // Green
    if (percentage > 75) needleColor = "#ef4444"; // Red
    else if (percentage > 50) needleColor = "#f59e0b"; // Yellow

    return (
      <div className="speedometer-card">
        <h4>{config.name}</h4>
        <svg viewBox="0 0 200 120" className="speedometer-svg" preserveAspectRatio="xMidYMid meet">
          {/* Background arc (gray) */}
          <path
            d="M 40 100 A 60 60 0 0 1 160 100"
            fill="none"
            stroke="#333"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Colored arc based on percentage */}
          <path
            d={generateSemicirclePath(100, 100, 60, 0, (percentage / 100) * 180)}
            fill="none"
            stroke={needleColor}
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Needle pointer */}
          <g transform={`translate(100, 100) rotate(${angle})`}>
            <line x1="0" y1="0" x2="0" y2="-50" stroke={needleColor} strokeWidth="2" strokeLinecap="round" />
            <polygon points="0,0 -4,-8 4,-8" fill={needleColor} />
          </g>

          {/* Center circle */}
          <circle cx="100" cy="100" r="6" fill={needleColor} />

          {/* Min/Max labels */}
          <text x="50" y="115" fontSize="10" fill="#999" textAnchor="middle">
            0
          </text>
          <text x="150" y="115" fontSize="10" fill="#999" textAnchor="middle">
            {config.max}
          </text>

          {/* Value display */}
          <text x="100" y="65" fontSize="14" fontWeight="bold" fill={needleColor} textAnchor="middle">
            {value.toFixed(1)}
          </text>
          <text x="100" y="80" fontSize="9" fill="#999" textAnchor="middle">
            {config.unit}
          </text>
        </svg>
      </div>
    );
  };

  // Generate semicircle path
  const generateSemicirclePath = (cx, cy, r, startAngle, endAngle) => {
    const toRad = (angle) => (angle * Math.PI) / 180;
    const start = toRad(startAngle);
    const end = toRad(endAngle);

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Render historical chart (daily only)
  const renderHistoricalChart = () => {
    if (loading || historicalData.length === 0) {
      return <div className="chart-placeholder">Loading data...</div>;
    }

    const W = 100,
      H = 100;
    const P = { t: 10, r: 5, b: 15, l: 12 };
    const IW = W - P.l - P.r;
    const IH = H - P.t - P.b;

    // Use vibration as main chart
    const values = historicalData.map((d) => d.vibration || 0);
    const maxVal = 50; // Max vibration based on PARAMETERS_CONFIG
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const points = values.map((v, i) => ({
      x: P.l + (i / Math.max(historicalData.length - 1, 1)) * IW,
      y: P.t + IH - ((v - minVal) / range) * IH,
    }));

    // Y-axis ticks (0, 25%, 50%, 75%, 100% of range)
    const yTicks = 5;
    const yLabels = [];
    for (let i = 0; i < yTicks; i++) {
      yLabels.push({
        value: ((maxVal / (yTicks - 1)) * i).toFixed(0),
        y: P.t + IH - (i / (yTicks - 1)) * IH,
      });
    }

    // X-axis labels (every 3 hours)
    const xLabels = [];
    const xStep = Math.max(1, Math.floor(historicalData.length / 4));
    for (let i = 0; i < historicalData.length; i += xStep) {
      const time = historicalData[i].timestamp || `${i}:00`;
      xLabels.push({
        label: time.split(" ")[1] || time,
        x: P.l + (i / Math.max(historicalData.length - 1, 1)) * IW,
      });
    }

    const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* Grid lines */}
        {yLabels.map((l, i) => (
          <line
            key={`grid-${i}`}
            x1={P.l}
            y1={l.y}
            x2={W - P.r}
            y2={l.y}
            stroke="#333"
            strokeWidth="0.3"
            opacity="0.2"
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((l, i) => (
          <text
            key={`y-label-${i}`}
            x={P.l - 1}
            y={l.y + 1.5}
            fontSize="2.5"
            fill="#999"
            textAnchor="end"
          >
            {l.value}
          </text>
        ))}

        {/* Axes */}
        <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + IH} stroke="#555" strokeWidth="0.5" />
        <line x1={P.l} y1={P.t + IH} x2={W - P.r} y2={P.t + IH} stroke="#555" strokeWidth="0.5" />

        {/* X-axis labels */}
        {xLabels.map((l, i) => (
          <text
            key={`x-label-${i}`}
            x={l.x}
            y={P.t + IH + 4}
            fontSize="2"
            fill="#999"
            textAnchor="middle"
          >
            {l.label}
          </text>
        ))}

        {/* Chart line */}
        <path d={path} fill="none" stroke="#00d4ff" strokeWidth="0.8" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={`point-${i}`} cx={p.x} cy={p.y} r="0.5" fill="#00d4ff" opacity="0.6" />
        ))}
      </svg>
    );
  };

  // Render weekly bar chart (4 parameters separate)
  const renderWeeklyChart = () => {
    if (!weeklyData.vibration.length) return <div className="chart-placeholder">No data</div>;

    const W = 100,
      H = 100;
    const P = { t: 10, r: 5, b: 20, l: 10 };
    const IW = W - P.l - P.r;
    const IH = H - P.t - P.b;

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const colors = { vibration: "#00d4ff", temperature: "#ff6b6b", power: "#4ecdc4", noise: "#ffd93d" };
    const maxValues = { vibration: 50, temperature: 100, power: 23, noise: 120 };

    const days = weeklyData.vibration;
    const barWidth = IW / days.length / 1.3;
    const barGap = (IW / days.length - barWidth) / 2;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* Y-axis line */}
        <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + IH} stroke="#555" strokeWidth="0.5" />
        <line x1={P.l} y1={P.t + IH} x2={W - P.r} y2={P.t + IH} stroke="#555" strokeWidth="0.5" />

        {/* Y-axis labels (0%, 25%, 50%, 75%, 100%) */}
        {[0, 25, 50, 75, 100].map((label, i) => {
          const y = P.t + IH - (label / 100) * IH;
          return (
            <g key={`y-${i}`}>
              <text x={P.l - 1} y={y + 1} fontSize="2" fill="#999" textAnchor="end">
                {label}%
              </text>
              <line x1={P.l - 0.3} y1={y} x2={P.l} y2={y} stroke="#555" strokeWidth="0.3" />
            </g>
          );
        })}

        {/* Bars */}
        {days.map((vibValue, dayIdx) => {
          const xBase = P.l + dayIdx * (barWidth * 4 + barGap * 4) + barGap;
          const dayData = [
            { value: vibValue, key: "vibration", label: "V" },
            { value: weeklyData.temperature[dayIdx] || 0, key: "temperature", label: "T" },
            { value: (weeklyData.power[dayIdx] || 0) / 1000, key: "power", label: "P" },
            { value: weeklyData.noise[dayIdx] || 0, key: "noise", label: "N" },
          ];

          return (
            <g key={`day-${dayIdx}`}>
              {dayData.map((param, paramIdx) => {
                const percentage = Math.min((param.value / maxValues[param.key]) * 100, 100);
                const barHeight = (percentage / 100) * IH;
                const barX = xBase + paramIdx * (barWidth + barGap);
                const barY = P.t + IH - barHeight;

                return (
                  <rect
                    key={`bar-${dayIdx}-${paramIdx}`}
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill={colors[param.key]}
                    opacity="0.7"
                    stroke="none"
                  />
                );
              })}

              {/* Day label */}
              <text
                x={xBase + barWidth * 2 + barGap * 1.5}
                y={P.t + IH + 5}
                fontSize="1.8"
                fill="#999"
                textAnchor="middle"
                fontWeight="500"
              >
                {dayLabels[dayIdx]}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g fontSize="1.8" fill="#999">
          <text x={P.l} y="5" fill="#00d4ff">
            ■
          </text>
          <text x={P.l + 2} y="5">
            V
          </text>
          <text x={P.l + 5} y="5" fill="#ff6b6b">
            ■
          </text>
          <text x={P.l + 7} y="5">
            T
          </text>
          <text x={P.l + 10} y="5" fill="#4ecdc4">
            ■
          </text>
          <text x={P.l + 12} y="5">
            P
          </text>
          <text x={P.l + 15} y="5" fill="#ffd93d">
            ■
          </text>
          <text x={P.l + 17} y="5">
            N
          </text>
        </g>
      </svg>
    );
  };

  // Render monthly bar chart (averaged by week)
  const renderMonthlyChart = () => {
    if (!monthlyData.vibration.length) return <div className="chart-placeholder">No data</div>;

    const W = 100,
      H = 100;
    const P = { t: 10, r: 5, b: 20, l: 10 };
    const IW = W - P.l - P.r;
    const IH = H - P.t - P.b;

    const weekLabels = ["Week 1", "Week 2", "Week 3", "Week 4"];
    const colors = { vibration: "#00d4ff", temperature: "#ff6b6b", power: "#4ecdc4", noise: "#ffd93d" };
    const maxValues = { vibration: 50, temperature: 100, power: 23, noise: 120 };

    const weeks = monthlyData.vibration.slice(0, 4);
    const barWidth = IW / weeks.length / 1.3;
    const barGap = (IW / weeks.length - barWidth) / 2;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* Y-axis line */}
        <line x1={P.l} y1={P.t} x2={P.l} y2={P.t + IH} stroke="#555" strokeWidth="0.5" />
        <line x1={P.l} y1={P.t + IH} x2={W - P.r} y2={P.t + IH} stroke="#555" strokeWidth="0.5" />

        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((label, i) => {
          const y = P.t + IH - (label / 100) * IH;
          return (
            <g key={`y-${i}`}>
              <text x={P.l - 1} y={y + 1} fontSize="2" fill="#999" textAnchor="end">
                {label}%
              </text>
              <line x1={P.l - 0.3} y1={y} x2={P.l} y2={y} stroke="#555" strokeWidth="0.3" />
            </g>
          );
        })}

        {/* Bars */}
        {weeks.map((vibValue, weekIdx) => {
          const xBase = P.l + weekIdx * (barWidth * 4 + barGap * 4) + barGap;
          const weekData = [
            { value: vibValue, key: "vibration" },
            { value: monthlyData.temperature[weekIdx] || 0, key: "temperature" },
            { value: (monthlyData.power[weekIdx] || 0) / 1000, key: "power" },
            { value: monthlyData.noise[weekIdx] || 0, key: "noise" },
          ];

          return (
            <g key={`week-${weekIdx}`}>
              {weekData.map((param, paramIdx) => {
                const percentage = Math.min((param.value / maxValues[param.key]) * 100, 100);
                const barHeight = (percentage / 100) * IH;
                const barX = xBase + paramIdx * (barWidth + barGap);
                const barY = P.t + IH - barHeight;

                return (
                  <rect
                    key={`bar-${weekIdx}-${paramIdx}`}
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill={colors[param.key]}
                    opacity="0.7"
                    stroke="none"
                  />
                );
              })}

              {/* Week label */}
              <text
                x={xBase + barWidth * 2 + barGap * 1.5}
                y={P.t + IH + 5}
                fontSize="1.8"
                fill="#999"
                textAnchor="middle"
                fontWeight="500"
              >
                {weekLabels[weekIdx]}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="dashboard-v3">
      {/* Header */}
      <div className="header">
        <div>
          <h1>⚙️ MOTOR MONITORING</h1>
          <p>Real-time machine health</p>
        </div>
        <div>
          <p style={{ margin: 0, color: "#16d9ff", fontWeight: 600, fontSize: "11px" }}>
            ● ONLINE &nbsp;|&nbsp; {motorId}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* LEFT: Speedometers (4 parameters - compact) */}
        <div className="gauges-section">
          {renderSpeedometer(sensorData.vibration || 12.5, PARAMETERS_CONFIG.vibration)}
          {renderSpeedometer(sensorData.temperature || 45.0, PARAMETERS_CONFIG.temperature)}
          {renderSpeedometer(sensorData.power || 8900, PARAMETERS_CONFIG.power)}
          {renderSpeedometer(sensorData.noise || 78.5, PARAMETERS_CONFIG.noise)}
        </div>

        {/* CENTER: Historical Chart (Daily Only) */}
        <div className="chart-wrapper">
          <div className="chart-section">
            <div className="section-header">
              <h2>📊 Vibration Trend (Daily)</h2>
              <div className="controls">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="date-input"
                />
                <button onClick={handleExportCSV} className="export-btn">
                  📥 Export CSV
                </button>
              </div>
            </div>
            <div className="chart">{renderHistoricalChart()}</div>
          </div>
        </div>

        {/* RIGHT: Weekly/Monthly Average Charts */}
        <div className="avg-charts">
          {/* Weekly Average */}
          <div className="section">
            <div className="section-header">
              <h3>📈 Weekly Average</h3>
              <input
                type="date"
                value={selectedWeekStart}
                onChange={(e) => setSelectedWeekStart(e.target.value)}
                className="date-input-small"
              />
            </div>
            <div className="avg-chart">{renderWeeklyChart()}</div>
          </div>

          {/* Monthly Average */}
          <div className="section">
            <div className="section-header">
              <h3>📊 Monthly Average</h3>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="month-input-small"
              />
            </div>
            <div className="avg-chart">{renderMonthlyChart()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Generate dummy historical data (24 points for daily)
function generateDummyHistoricalData() {
  const data = [];
  for (let i = 0; i < 24; i++) {
    data.push({
      timestamp: `${String(i).padStart(2, "0")}:00`,
      vibration: 15 + Math.sin(i / 24 * Math.PI * 2) * 8 + Math.random() * 3,
      temperature: 45 + Math.sin((i + 6) / 24 * Math.PI * 2) * 10 + Math.random() * 2,
      power: 8000 + Math.sin((i + 12) / 24 * Math.PI * 2) * 3000 + Math.random() * 1000,
      noise: 75 + Math.sin((i + 18) / 24 * Math.PI * 2) * 8 + Math.random() * 3,
    });
  }
  return data;
}

// Generate dummy weekly data (7 days)
function generateDummyWeeklyData() {
  const data = {
    vibration: [],
    temperature: [],
    power: [],
    noise: [],
  };
  for (let i = 0; i < 7; i++) {
    data.vibration.push(12 + Math.random() * 15);
    data.temperature.push(40 + Math.random() * 20);
    data.power.push(7000 + Math.random() * 4000);
    data.noise.push(70 + Math.random() * 15);
  }
  return data;
}

// Generate dummy monthly data (4 weeks)
function generateDummyMonthlyData() {
  const data = {
    vibration: [],
    temperature: [],
    power: [],
    noise: [],
  };
  for (let i = 0; i < 4; i++) {
    data.vibration.push(13 + Math.random() * 12);
    data.temperature.push(42 + Math.random() * 18);
    data.power.push(7500 + Math.random() * 3500);
    data.noise.push(72 + Math.random() * 12);
  }
  return data;
}

export default Dashboard;
