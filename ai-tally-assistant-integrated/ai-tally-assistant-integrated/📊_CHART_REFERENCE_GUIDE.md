# 📊 Complete Chart Reference Guide

## 🎯 Quick Chart Selection Guide

### **When to Use Each Chart Type**

---

## 📊 **BAR CHARTS** (5 Types)

### 1. **Vertical Bar Chart**
- **Best For:** Comparing categories, Monthly sales, Product rankings
- **Example:** "Which product sold the most?"
```javascript
<VerticalBarChart data={salesData} dataKey="sales" xKey="product" />
```

### 2. **Horizontal Bar Chart**
- **Best For:** Long category names, Top 10 lists, Rankings
- **Example:** "Top 10 customers by revenue"
```javascript
<HorizontalBarChart data={customerData} dataKey="revenue" yKey="customer" />
```

### 3. **Stacked Bar Chart**
- **Best For:** Part-to-whole over time, Revenue streams, Expense categories
- **Example:** "Revenue by product category over months"
```javascript
<StackedBarChart data={data} dataKeys={['productA', 'productB', 'productC']} />
```

### 4. **Grouped Bar Chart**
- **Best For:** Side-by-side comparisons, Year-over-year, Before/After
- **Example:** "This year vs last year sales"
```javascript
<GroupedBarChart data={data} dataKeys={['thisYear', 'lastYear']} />
```

### 5. **Bar Chart with Labels**
- **Best For:** Exact values needed, Small datasets, Presentations
- **Example:** "Quarterly performance with exact figures"
```javascript
<BarChartWithLabels data={data} dataKey="value" />
```

---

## 📈 **LINE CHARTS** (5 Types)

### 6. **Simple Line Chart**
- **Best For:** Trends over time, Stock prices, Temperature changes
- **Example:** "Daily revenue trend"
```javascript
<SimpleLineChart data={dailyData} dataKey="revenue" xKey="date" />
```

### 7. **Multi Line Chart**
- **Best For:** Comparing multiple trends, Multi-series data
- **Example:** "Revenue vs Expense vs Profit over time"
```javascript
<MultiLineChart data={data} dataKeys={['revenue', 'expense', 'profit']} />
```

### 8. **Dashed Line Chart**
- **Best For:** Projected/forecast data, Secondary metrics
- **Example:** "Actual vs Forecasted sales"
```javascript
<DashedLineChart data={forecastData} dataKey="forecast" />
```

### 9. **Step Line Chart**
- **Best For:** Stepwise changes, Status over time, Inventory levels
- **Example:** "Stock level changes"
```javascript
<StepLineChart data={stockData} dataKey="level" />
```

### 10. **Curved Line Chart**
- **Best For:** Smooth trends, Natural data, User growth
- **Example:** "User adoption curve"
```javascript
<CurvedLineChart data={userData} dataKey="users" />
```

---

## 🌊 **AREA CHARTS** (5 Types)

### 11. **Simple Area Chart**
- **Best For:** Volume over time, Cumulative data, Traffic
- **Example:** "Website traffic over time"
```javascript
<SimpleAreaChart data={trafficData} dataKey="visits" />
```

### 12. **Stacked Area Chart**
- **Best For:** Part-to-whole trends, Market share, Resource allocation
- **Example:** "Sales by region over time"
```javascript
<StackedAreaChart data={data} dataKeys={['north', 'south', 'east', 'west']} />
```

### 13. **Percentage Area Chart**
- **Best For:** Proportion changes, Market share evolution
- **Example:** "Product mix percentage over time"
```javascript
<PercentageAreaChart data={data} dataKeys={['productA', 'productB']} />
```

### 14. **Gradient Area Chart**
- **Best For:** Visual appeal, Presentations, Highlights
- **Example:** "Revenue trend with gradient"
```javascript
<GradientAreaChart data={data} dataKey="revenue" color="#3b82f6" />
```

### 15. **Multi Area Chart**
- **Best For:** Overlapping metrics, Comparative analysis
- **Example:** "Multiple revenue streams comparison"
```javascript
<MultiAreaChart data={data} dataKeys={['stream1', 'stream2']} />
```

---

## 🥧 **PIE & DONUT CHARTS** (5 Types)

### 16. **Simple Pie Chart**
- **Best For:** Market share, Budget breakdown, Category distribution
- **Example:** "Expense distribution by category"
```javascript
<SimplePieChart data={expenseData} dataKey="amount" nameKey="category" />
```

### 17. **Donut Chart**
- **Best For:** Modern look, Shows total in center, Percentage display
- **Example:** "Sales by product with total"
```javascript
<DonutChart data={salesData} dataKey="amount" />
```

### 18. **Semi-Circle Pie**
- **Best For:** Gauges, Progress indicators, Score displays
- **Example:** "Performance score out of 100"
```javascript
<SemiCirclePieChart data={scoreData} dataKey="score" />
```

### 19. **Two-Level Pie**
- **Best For:** Hierarchical data, Category & subcategories
- **Example:** "Sales by region and city"
```javascript
<TwoLevelPieChart innerData={regions} outerData={cities} />
```

### 20. **Pie with Custom Labels**
- **Best For:** Currency values, Specific formatting
- **Example:** "Revenue by product with rupee amounts"
```javascript
<PieChartWithCustomLabel data={revenueData} dataKey="revenue" />
```

---

## 🕸️ **RADAR & RADIAL CHARTS** (5 Types)

### 21. **Simple Radar Chart**
- **Best For:** Multi-dimensional analysis, Performance metrics, Skills assessment
- **Example:** "Employee performance across 5 dimensions"
```javascript
<SimpleRadarChart data={performanceData} dataKeys={['score']} />
```

### 22. **Radial Bar Chart**
- **Best For:** Progress tracking, Multiple metrics, Circular displays
- **Example:** "Department budgets utilization"
```javascript
<RadialBarChartSimple data={budgetData} dataKey="utilization" />
```

### 23. **Full Circle Radial**
- **Best For:** 360° data, Full cycle metrics
- **Example:** "Annual performance cycle"
```javascript
<FullCircleRadialBar data={annualData} />
```

### 24. **Multi Radar Chart**
- **Best For:** Comparing profiles, Team comparisons
- **Example:** "Team A vs Team B performance"
```javascript
<MultiRadarChart data={data} dataKeys={['teamA', 'teamB']} />
```

### 25. **Gauge Chart**
- **Best For:** KPI tracking, Score displays, Target progress
- **Example:** "Sales target achievement"
```javascript
<GaugeChart value={75} max={100} />
```

---

## 🎯 **SCATTER & COMPOSED CHARTS** (5 Types)

### 26. **Simple Scatter Chart**
- **Best For:** Correlation analysis, Outlier detection
- **Example:** "Price vs Sales volume"
```javascript
<SimpleScatterChart data={data} xKey="price" yKey="sales" />
```

### 27. **Multi Scatter Chart**
- **Best For:** Multiple data sets, Group comparisons
- **Example:** "Product performance across dimensions"
```javascript
<MultiScatterChart datasets={[{name: 'Group A', data: dataA}]} />
```

### 28. **Composed Line+Bar**
- **Best For:** Mixed metrics, Revenue vs Growth
- **Example:** "Sales amount and growth rate"
```javascript
<ComposedLineBarChart data={data} barKey="sales" lineKey="growth" />
```

### 29. **Multi Composed Chart**
- **Best For:** Complex analysis, Multiple metric types
- **Example:** "Revenue (area) + Orders (bar) + Margin (line)"
```javascript
<ComposedMultiChart data={data} dataKeys={['revenue', 'orders', 'margin']} />
```

### 30. **Bubble Chart**
- **Best For:** 3D data visualization, Size + X + Y metrics
- **Example:** "Market analysis: Size, Growth, Profitability"
```javascript
<BubbleChart data={marketData} />
```

---

## 🎨 **SPECIALIZED CHARTS** (5 Types)

### 31. **Waterfall Chart**
- **Best For:** Sequential changes, P&L analysis, Cash flow
- **Example:** "How profit changed from start to end"
```javascript
<WaterfallChart data={pnlData} />
```

### 32. **Candlestick Chart**
- **Best For:** Stock prices, OHLC data, Financial analysis
- **Example:** "Daily stock price movements"
```javascript
<CandlestickChart data={stockData} />
```

### 33. **Heatmap Chart**
- **Best For:** Correlation matrices, Time-based patterns
- **Example:** "Sales activity by day and hour"
```javascript
<HeatmapChart data={activityData} />
```

### 34. **Treemap Chart**
- **Best For:** Hierarchical data, Disk usage, Portfolio allocation
- **Example:** "Budget allocation by department and project"
```javascript
<TreemapChartCustom data={budgetTree} />
```

### 35. **Bullet Chart**
- **Best For:** KPI vs target, Performance tracking
- **Example:** "Actual performance vs target"
```javascript
<BulletChart value={85} target={100} max={120} />
```

---

## 🎯 **Decision Matrix**

| Need | Recommended Chart |
|------|-------------------|
| Compare categories | Vertical/Horizontal Bar |
| Show trend over time | Line, Area |
| Show composition | Pie, Donut |
| Compare multiple series | Grouped/Stacked Bar, Multi Line |
| Show correlation | Scatter, Bubble |
| Track KPI vs target | Gauge, Bullet |
| Show hierarchy | Treemap |
| Financial data | Candlestick, Waterfall |
| Multi-dimensional | Radar |
| Percentage/proportion | Pie, Donut, Percentage Area |

---

## 💡 **Pro Tips**

### **Chart Selection Tips:**
1. **Less is More** - Don't overcomplicate
2. **Know Your Audience** - Executives prefer simple charts
3. **Color Matters** - Use consistent color schemes
4. **Labels are Key** - Always label axes and data points
5. **Interactive > Static** - Use tooltips and drill-downs

### **Performance Tips:**
1. Limit data points (< 100 for smooth rendering)
2. Use memo for expensive calculations
3. Debounce real-time updates
4. Lazy load charts in tabs

### **Accessibility Tips:**
1. Use colorblind-safe palettes
2. Add text alternatives
3. Ensure sufficient contrast
4. Support keyboard navigation

---

## 🔥 **Most Popular Combinations**

### **Dashboard 1: Executive Summary**
```
- Gauge Chart (KPI score)
- Multi Line Chart (trends)
- Donut Chart (distribution)
- Bar Chart with Labels (key metrics)
```

### **Dashboard 2: Financial Analysis**
```
- Waterfall Chart (P&L)
- Stacked Area Chart (revenue streams)
- Candlestick Chart (stock performance)
- Bullet Chart (targets)
```

### **Dashboard 3: Sales Performance**
```
- Vertical Bar Chart (by product)
- Line Chart (trend)
- Pie Chart (by region)
- Composed Chart (volume + value)
```

---

## 📚 **Further Reading**

- [Recharts Documentation](https://recharts.org/)
- [Data Visualization Best Practices](https://www.tableau.com/learn/articles/data-visualization)
- [Chart Selection Guide](https://chartio.com/learn/charts/)

---

**🎉 You now have 35+ professional charts at your fingertips!**

**Use `/dashboards` to access all 20 pre-built dashboards with these charts integrated!**

---

*Happy charting! 📊*

