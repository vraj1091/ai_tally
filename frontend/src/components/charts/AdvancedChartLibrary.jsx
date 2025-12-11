import React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  ScatterChart, Scatter, RadarChart, Radar, RadialBarChart, RadialBar,
  ComposedChart, Treemap, Sankey, FunnelChart, Funnel,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, LabelList, ReferenceLine, ReferenceArea, Brush, ErrorBar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#6366f1', '#a855f7',
  '#ec4899', '#f43f5e', '#8b5cf6', '#6366f1'
];

// ==================== CHART TYPE 1-5: BAR CHARTS ====================

export const VerticalBarChart = ({ data, dataKey, xKey = 'name', color = COLORS[0], height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export const HorizontalBarChart = ({ data, dataKey, yKey = 'name', color = COLORS[1], height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} layout="horizontal">
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis type="number" tick={{ fontSize: 12 }} />
      <YAxis type="category" dataKey={yKey} tick={{ fontSize: 11 }} width={100} />
      <Tooltip />
      <Legend />
      <Bar dataKey={dataKey} fill={color} radius={[0, 8, 8, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export const StackedBarChart = ({ data, dataKeys, xKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      {dataKeys.map((key, idx) => (
        <Bar key={key} dataKey={key} stackId="a" fill={COLORS[idx % COLORS.length]} radius={idx === dataKeys.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]} />
      ))}
    </BarChart>
  </ResponsiveContainer>
);

export const GroupedBarChart = ({ data, dataKeys, xKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      {dataKeys.map((key, idx) => (
        <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} radius={[8, 8, 0, 0]} />
      ))}
    </BarChart>
  </ResponsiveContainer>
);

export const BarChartWithLabels = ({ data, dataKey, xKey = 'name', color = COLORS[2], height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]}>
        <LabelList dataKey={dataKey} position="top" />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// ==================== CHART TYPE 6-10: LINE CHARTS ====================

export const SimpleLineChart = ({ data, dataKey, xKey = 'name', color = COLORS[0], height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
    </LineChart>
  </ResponsiveContainer>
);

export const MultiLineChart = ({ data, dataKeys, xKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      {dataKeys.map((key, idx) => (
        <Line key={key} type="monotone" dataKey={key} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

export const DashedLineChart = ({ data, dataKey, xKey = 'name', color = COLORS[1], height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} strokeDasharray="5 5" />
    </LineChart>
  </ResponsiveContainer>
);

export const StepLineChart = ({ data, dataKey, xKey = 'name', color = COLORS[2], height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Line type="step" dataKey={dataKey} stroke={color} strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export const CurvedLineChart = ({ data, dataKey, xKey = 'name', color = COLORS[3], height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Line type="natural" dataKey={dataKey} stroke={color} strokeWidth={3} />
    </LineChart>
  </ResponsiveContainer>
);

// ==================== CHART TYPE 11-15: AREA CHARTS ====================

export const SimpleAreaChart = ({ data, dataKey, xKey = 'name', color = COLORS[0], height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Area type="monotone" dataKey={dataKey} stroke={color} fill={`${color}40`} strokeWidth={2} />
    </AreaChart>
  </ResponsiveContainer>
);

export const StackedAreaChart = ({ data, dataKeys, xKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      {dataKeys.map((key, idx) => (
        <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.6} />
      ))}
    </AreaChart>
  </ResponsiveContainer>
);

export const PercentageAreaChart = ({ data, dataKeys, xKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} stackOffset="expand">
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} tick={{ fontSize: 12 }} />
      <Tooltip formatter={(value, name) => [`${(value * 100).toFixed(1)}%`, name]} />
      <Legend />
      {dataKeys.map((key, idx) => (
        <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} />
      ))}
    </AreaChart>
  </ResponsiveContainer>
);

export const GradientAreaChart = ({ data, dataKey, xKey = 'name', color = COLORS[4], height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
          <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Area type="monotone" dataKey={dataKey} stroke={color} fillOpacity={1} fill="url(#colorGradient)" strokeWidth={2} />
    </AreaChart>
  </ResponsiveContainer>
);

export const MultiAreaChart = ({ data, dataKeys, xKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      {dataKeys.map((key, idx) => (
        <Area key={key} type="monotone" dataKey={key} stroke={COLORS[idx % COLORS.length]} fill={`${COLORS[idx % COLORS.length]}30`} strokeWidth={2} />
      ))}
    </AreaChart>
  </ResponsiveContainer>
);

// ==================== CHART TYPE 16-20: PIE & DONUT CHARTS ====================

export const SimplePieChart = ({ data, dataKey = 'value', nameKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        outerRadius={100}
        fill="#8884d8"
        dataKey={dataKey}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
);

export const DonutChart = ({ data, dataKey = 'value', nameKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        innerRadius={60}
        outerRadius={100}
        fill="#8884d8"
        dataKey={dataKey}
        paddingAngle={2}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

export const SemiCirclePieChart = ({ data, dataKey = 'value', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="70%"
        startAngle={180}
        endAngle={0}
        innerRadius={60}
        outerRadius={100}
        fill="#8884d8"
        dataKey={dataKey}
        label
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

export const TwoLevelPieChart = ({ innerData, outerData, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={innerData}
        cx="50%"
        cy="50%"
        outerRadius={60}
        fill="#8884d8"
        dataKey="value"
      >
        {innerData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Pie
        data={outerData}
        cx="50%"
        cy="50%"
        innerRadius={70}
        outerRadius={100}
        fill="#82ca9d"
        dataKey="value"
        label
      >
        {outerData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
);

export const PieChartWithCustomLabel = ({ data, dataKey = 'value', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={true}
        label={(entry) => `₹${entry.value.toLocaleString()}`}
        outerRadius={100}
        fill="#8884d8"
        dataKey={dataKey}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

// ==================== CHART TYPE 21-25: RADAR & RADIAL CHARTS ====================

export const SimpleRadarChart = ({ data, dataKeys, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <RadarChart data={data}>
      <PolarGrid stroke="#e5e7eb" />
      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
      <PolarRadiusAxis angle={90} domain={[0, 100]} />
      <Tooltip />
      <Legend />
      {dataKeys.map((key, idx) => (
        <Radar key={key} name={key} dataKey={key} stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.5} />
      ))}
    </RadarChart>
  </ResponsiveContainer>
);

export const RadialBarChartSimple = ({ data, dataKey = 'value', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" barSize={10} data={data}>
      <RadialBar
        minAngle={15}
        label={{ position: 'insideStart', fill: '#fff' }}
        background
        clockWise
        dataKey={dataKey}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </RadialBar>
      <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
      <Tooltip />
    </RadialBarChart>
  </ResponsiveContainer>
);

export const FullCircleRadialBar = ({ data, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" data={data} startAngle={180} endAngle={-180}>
      <RadialBar minAngle={15} background clockWise dataKey="value">
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </RadialBar>
      <Tooltip />
      <Legend />
    </RadialBarChart>
  </ResponsiveContainer>
);

export const MultiRadarChart = ({ data, subjects, dataKeys, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <RadarChart data={data}>
      <PolarGrid strokeDasharray="3 3" />
      <PolarAngleAxis dataKey="metric" />
      <PolarRadiusAxis angle={90} domain={[0, 100]} />
      <Tooltip />
      <Legend />
      {dataKeys.map((key, idx) => (
        <Radar key={key} name={key} dataKey={key} stroke={COLORS[idx]} fill={COLORS[idx]} fillOpacity={0.3} />
      ))}
    </RadarChart>
  </ResponsiveContainer>
);

export const GaugeChart = ({ value, max = 100, height = 250 }) => {
  const data = [{ name: 'Score', value, fill: value > 70 ? COLORS[1] : value > 40 ? COLORS[2] : COLORS[3] }];
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart 
        cx="50%" 
        cy="70%" 
        innerRadius="80%" 
        outerRadius="100%" 
        barSize={20} 
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar
          background
          dataKey="value"
          cornerRadius={10}
        />
        <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold">
          {value}
        </text>
        <text x="50%" y="75%" textAnchor="middle" dominantBaseline="middle" className="text-sm text-gray-600">
          out of {max}
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
};

// ==================== CHART TYPE 26-30: SCATTER & COMPOSED CHARTS ====================

export const SimpleScatterChart = ({ data, xKey, yKey, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <ScatterChart>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} name={xKey} tick={{ fontSize: 12 }} />
      <YAxis dataKey={yKey} name={yKey} tick={{ fontSize: 12 }} />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      <Legend />
      <Scatter name="Data Points" data={data} fill={COLORS[0]} />
    </ScatterChart>
  </ResponsiveContainer>
);

export const MultiScatterChart = ({ datasets, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <ScatterChart>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="x" name="X" tick={{ fontSize: 12 }} />
      <YAxis dataKey="y" name="Y" tick={{ fontSize: 12 }} />
      <ZAxis dataKey="z" range={[60, 400]} name="Size" />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      <Legend />
      {datasets.map((dataset, idx) => (
        <Scatter key={dataset.name} name={dataset.name} data={dataset.data} fill={COLORS[idx % COLORS.length]} />
      ))}
    </ScatterChart>
  </ResponsiveContainer>
);

export const ComposedLineBarChart = ({ data, lineKey, barKey, xKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Bar dataKey={barKey} fill={COLORS[0]} radius={[8, 8, 0, 0]} />
      <Line type="monotone" dataKey={lineKey} stroke={COLORS[3]} strokeWidth={2} />
    </ComposedChart>
  </ResponsiveContainer>
);

export const ComposedMultiChart = ({ data, dataKeys, xKey = 'name', height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Area type="monotone" dataKey={dataKeys[0]} fill={`${COLORS[0]}30`} stroke={COLORS[0]} />
      <Bar dataKey={dataKeys[1]} fill={COLORS[1]} radius={[8, 8, 0, 0]} />
      <Line type="monotone" dataKey={dataKeys[2]} stroke={COLORS[3]} strokeWidth={2} />
    </ComposedChart>
  </ResponsiveContainer>
);

export const BubbleChart = ({ data, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <ScatterChart>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="x" name="Value" tick={{ fontSize: 12 }} />
      <YAxis dataKey="y" name="Count" tick={{ fontSize: 12 }} />
      <ZAxis dataKey="z" range={[100, 1000]} name="Size" />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      <Legend />
      <Scatter name="Bubbles" data={data} fill={COLORS[4]}>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Scatter>
    </ScatterChart>
  </ResponsiveContainer>
);

// ==================== CHART TYPE 31-35: SPECIALIZED CHARTS ====================

export const WaterfallChart = ({ data, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.value >= 0 ? COLORS[1] : COLORS[3]} />
        ))}
      </Bar>
      <ReferenceLine y={0} stroke="#666" />
    </BarChart>
  </ResponsiveContainer>
);

export const CandlestickChart = ({ data, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip />
      <Legend />
      <Bar dataKey="low" stackId="a" fill="transparent" />
      <Bar dataKey="high" stackId="a" fill={COLORS[0]} />
    </ComposedChart>
  </ResponsiveContainer>
);

export const HeatmapChart = ({ data, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <ScatterChart>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="x" tick={{ fontSize: 12 }} />
      <YAxis dataKey="y" tick={{ fontSize: 12 }} />
      <ZAxis dataKey="value" range={[100, 1000]} />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      <Scatter data={data}>
        {data.map((entry, index) => {
          const colorIdx = Math.floor((entry.value / 100) * COLORS.length);
          return <Cell key={`cell-${index}`} fill={COLORS[colorIdx % COLORS.length]} />;
        })}
      </Scatter>
    </ScatterChart>
  </ResponsiveContainer>
);

export const TreemapChartCustom = ({ data, height = 300 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <Treemap
      data={data}
      dataKey="size"
      aspectRatio={4 / 3}
      stroke="#fff"
      fill="#8884d8"
    >
      {data.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
      ))}
    </Treemap>
  </ResponsiveContainer>
);

export const BulletChart = ({ value, target, max, height = 150 }) => {
  const data = [
    { name: 'Performance', value, target }
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" domain={[0, max]} />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip />
        <Bar dataKey="value" fill={COLORS[1]} radius={[0, 8, 8, 0]} />
        <ReferenceLine x={target} stroke={COLORS[3]} strokeWidth={3} label="Target" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Export all charts
export const ChartLibrary = {
  // Bar Charts (1-5)
  VerticalBarChart,
  HorizontalBarChart,
  StackedBarChart,
  GroupedBarChart,
  BarChartWithLabels,
  
  // Line Charts (6-10)
  SimpleLineChart,
  MultiLineChart,
  DashedLineChart,
  StepLineChart,
  CurvedLineChart,
  
  // Area Charts (11-15)
  SimpleAreaChart,
  StackedAreaChart,
  PercentageAreaChart,
  GradientAreaChart,
  MultiAreaChart,
  
  // Pie & Donut (16-20)
  SimplePieChart,
  DonutChart,
  SemiCirclePieChart,
  TwoLevelPieChart,
  PieChartWithCustomLabel,
  
  // Radar & Radial (21-25)
  SimpleRadarChart,
  RadialBarChartSimple,
  FullCircleRadialBar,
  MultiRadarChart,
  GaugeChart,
  
  // Scatter & Composed (26-30)
  SimpleScatterChart,
  MultiScatterChart,
  ComposedLineBarChart,
  ComposedMultiChart,
  BubbleChart,
  
  // Specialized (31-35)
  WaterfallChart,
  CandlestickChart,
  HeatmapChart,
  TreemapChartCustom,
  BulletChart
};

export default ChartLibrary;

