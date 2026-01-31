/**
 * Sample data for chart demos in documentation
 */

// Time series data for line, area, bar charts
export const timeSeriesData = [
  { date: "Jan", revenue: 4000, orders: 240, customers: 180 },
  { date: "Feb", revenue: 3000, orders: 198, customers: 150 },
  { date: "Mar", revenue: 5000, orders: 300, customers: 220 },
  { date: "Apr", revenue: 4500, orders: 278, customers: 200 },
  { date: "May", revenue: 6000, orders: 389, customers: 280 },
  { date: "Jun", revenue: 5500, orders: 349, customers: 250 },
];

// Category data for pie charts
export const categoryData = [
  { category: "Electronics", value: 4500 },
  { category: "Clothing", value: 3200 },
  { category: "Books", value: 1800 },
  { category: "Home", value: 2100 },
  { category: "Sports", value: 1400 },
];

// Scatter/correlation data
export const scatterData = [
  { x: 100, y: 200, category: "A" },
  { x: 120, y: 180, category: "A" },
  { x: 150, y: 240, category: "B" },
  { x: 180, y: 280, category: "B" },
  { x: 200, y: 300, category: "A" },
  { x: 220, y: 350, category: "B" },
  { x: 250, y: 320, category: "A" },
  { x: 280, y: 400, category: "B" },
  { x: 300, y: 380, category: "A" },
  { x: 320, y: 420, category: "B" },
];

// Bubble chart data (x, y, size)
export const bubbleData = [
  { x: 100, y: 200, z: 400, category: "Product A" },
  { x: 120, y: 180, z: 200, category: "Product B" },
  { x: 150, y: 240, z: 600, category: "Product C" },
  { x: 180, y: 280, z: 300, category: "Product A" },
  { x: 200, y: 300, z: 500, category: "Product B" },
  { x: 220, y: 350, z: 250, category: "Product C" },
  { x: 250, y: 320, z: 450, category: "Product A" },
  { x: 280, y: 400, z: 350, category: "Product B" },
];

// Radar chart data (multi-metric comparison)
export const radarData = [
  { metric: "Sales", A: 120, B: 110 },
  { metric: "Marketing", A: 98, B: 130 },
  { metric: "Development", A: 86, B: 95 },
  { metric: "Support", A: 99, B: 100 },
  { metric: "Operations", A: 85, B: 90 },
  { metric: "HR", A: 65, B: 85 },
];

// Radial bar data (progress/KPI)
export const radialBarData = [
  { name: "Q1 Target", value: 85, fill: "#8884d8" },
  { name: "Q2 Target", value: 72, fill: "#83a6ed" },
  { name: "Q3 Target", value: 91, fill: "#8dd1e1" },
  { name: "Q4 Target", value: 68, fill: "#82ca9d" },
];

// Treemap hierarchical data
export const treemapData = [
  { name: "Electronics", size: 4500, category: "Electronics" },
  { name: "Phones", size: 2200, category: "Electronics" },
  { name: "Laptops", size: 1800, category: "Electronics" },
  { name: "Clothing", size: 3200, category: "Clothing" },
  { name: "Shoes", size: 1500, category: "Clothing" },
  { name: "Books", size: 1800, category: "Books" },
  { name: "Home", size: 2100, category: "Home" },
  { name: "Sports", size: 1400, category: "Sports" },
];

// Funnel chart data
export const funnelData = [
  { stage: "Visitors", value: 5000 },
  { stage: "Signups", value: 2500 },
  { stage: "Trials", value: 1200 },
  { stage: "Purchases", value: 600 },
  { stage: "Renewals", value: 300 },
];

// Activity grid data (365 days of activity)
export const activityGridData = (() => {
  const data: Array<{ date: string; count: number }> = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split("T")[0],
      count: Math.floor(Math.random() * 10),
    });
  }
  return data;
})();

// Table data
export const tableData = [
  {
    id: 1,
    product: "Widget Pro",
    category: "Electronics",
    revenue: 12500,
    units: 150,
  },
  {
    id: 2,
    product: "Gadget Plus",
    category: "Electronics",
    revenue: 8900,
    units: 89,
  },
  {
    id: 3,
    product: "Smart Device",
    category: "Electronics",
    revenue: 15200,
    units: 120,
  },
  { id: 4, product: "Basic Tool", category: "Tools", revenue: 3400, units: 340 },
  {
    id: 5,
    product: "Premium Kit",
    category: "Bundles",
    revenue: 22100,
    units: 45,
  },
];

// KPI values
export const kpiNumberValue = 125430;
export const kpiDeltaData = [
  { period: "Week 1", value: 95000 },
  { period: "Week 2", value: 102000 },
  { period: "Week 3", value: 98000 },
  { period: "Week 4", value: 125430 },
];
export const kpiTextValue = "Enterprise";

// Markdown content
export const markdownContent = `
## Dashboard Notes

This dashboard provides an overview of key metrics:

- **Revenue**: Total sales across all channels
- **Orders**: Number of completed transactions
- **Customers**: Active customer count

> Updated daily at midnight UTC
`;

// Sankey/Flow data (nodes and links for flow visualization)
export const sankeyData = {
  nodes: [
    { id: "signup", name: "Sign Up", layer: 0, value: 1000 },
    { id: "onboarding", name: "Onboarding", layer: 1, value: 800 },
    { id: "first_action", name: "First Action", layer: 1, value: 600 },
    { id: "active", name: "Active User", layer: 2, value: 500 },
    { id: "churned", name: "Churned", layer: 2, value: 300 },
    { id: "power_user", name: "Power User", layer: 3, value: 200 },
  ],
  links: [
    { source: "signup", target: "onboarding", value: 800 },
    { source: "signup", target: "first_action", value: 200 },
    { source: "onboarding", target: "first_action", value: 400 },
    { source: "onboarding", target: "churned", value: 200 },
    { source: "first_action", target: "active", value: 500 },
    { source: "first_action", target: "churned", value: 100 },
    { source: "active", target: "power_user", value: 200 },
  ],
};

// Sunburst uses same data format as Sankey
export const sunburstData = sankeyData;

// Heatmap data (flat format with day, hour, and activity value)
export const heatmapData = [
  // Monday
  { day: "Monday", hour: "9am", activity: 12 },
  { day: "Monday", hour: "10am", activity: 25 },
  { day: "Monday", hour: "11am", activity: 38 },
  { day: "Monday", hour: "12pm", activity: 45 },
  { day: "Monday", hour: "1pm", activity: 32 },
  { day: "Monday", hour: "2pm", activity: 28 },
  { day: "Monday", hour: "3pm", activity: 35 },
  { day: "Monday", hour: "4pm", activity: 22 },
  // Tuesday
  { day: "Tuesday", hour: "9am", activity: 18 },
  { day: "Tuesday", hour: "10am", activity: 32 },
  { day: "Tuesday", hour: "11am", activity: 42 },
  { day: "Tuesday", hour: "12pm", activity: 55 },
  { day: "Tuesday", hour: "1pm", activity: 38 },
  { day: "Tuesday", hour: "2pm", activity: 35 },
  { day: "Tuesday", hour: "3pm", activity: 40 },
  { day: "Tuesday", hour: "4pm", activity: 28 },
  // Wednesday
  { day: "Wednesday", hour: "9am", activity: 22 },
  { day: "Wednesday", hour: "10am", activity: 35 },
  { day: "Wednesday", hour: "11am", activity: 48 },
  { day: "Wednesday", hour: "12pm", activity: 62 },
  { day: "Wednesday", hour: "1pm", activity: 45 },
  { day: "Wednesday", hour: "2pm", activity: 42 },
  { day: "Wednesday", hour: "3pm", activity: 38 },
  { day: "Wednesday", hour: "4pm", activity: 32 },
  // Thursday
  { day: "Thursday", hour: "9am", activity: 15 },
  { day: "Thursday", hour: "10am", activity: 28 },
  { day: "Thursday", hour: "11am", activity: 35 },
  { day: "Thursday", hour: "12pm", activity: 48 },
  { day: "Thursday", hour: "1pm", activity: 35 },
  { day: "Thursday", hour: "2pm", activity: 30 },
  { day: "Thursday", hour: "3pm", activity: 32 },
  { day: "Thursday", hour: "4pm", activity: 25 },
  // Friday
  { day: "Friday", hour: "9am", activity: 20 },
  { day: "Friday", hour: "10am", activity: 30 },
  { day: "Friday", hour: "11am", activity: 40 },
  { day: "Friday", hour: "12pm", activity: 50 },
  { day: "Friday", hour: "1pm", activity: 35 },
  { day: "Friday", hour: "2pm", activity: 25 },
  { day: "Friday", hour: "3pm", activity: 20 },
  { day: "Friday", hour: "4pm", activity: 15 },
];

// Retention data (cohort analysis) - RetentionChartData format
// rows are flat with optional breakdownValue for segmentation
export const retentionData = {
  rows: [
    // Jan 2024 cohort
    { period: 0, cohortSize: 1000, retainedUsers: 1000, retentionRate: 1.0, breakdownValue: "Jan 2024" },
    { period: 1, cohortSize: 1000, retainedUsers: 650, retentionRate: 0.65, breakdownValue: "Jan 2024" },
    { period: 2, cohortSize: 1000, retainedUsers: 520, retentionRate: 0.52, breakdownValue: "Jan 2024" },
    { period: 3, cohortSize: 1000, retainedUsers: 450, retentionRate: 0.45, breakdownValue: "Jan 2024" },
    { period: 4, cohortSize: 1000, retainedUsers: 400, retentionRate: 0.40, breakdownValue: "Jan 2024" },
    { period: 5, cohortSize: 1000, retainedUsers: 380, retentionRate: 0.38, breakdownValue: "Jan 2024" },
    // Feb 2024 cohort
    { period: 0, cohortSize: 1200, retainedUsers: 1200, retentionRate: 1.0, breakdownValue: "Feb 2024" },
    { period: 1, cohortSize: 1200, retainedUsers: 840, retentionRate: 0.70, breakdownValue: "Feb 2024" },
    { period: 2, cohortSize: 1200, retainedUsers: 660, retentionRate: 0.55, breakdownValue: "Feb 2024" },
    { period: 3, cohortSize: 1200, retainedUsers: 540, retentionRate: 0.45, breakdownValue: "Feb 2024" },
    { period: 4, cohortSize: 1200, retainedUsers: 480, retentionRate: 0.40, breakdownValue: "Feb 2024" },
    // Mar 2024 cohort
    { period: 0, cohortSize: 1500, retainedUsers: 1500, retentionRate: 1.0, breakdownValue: "Mar 2024" },
    { period: 1, cohortSize: 1500, retainedUsers: 1050, retentionRate: 0.70, breakdownValue: "Mar 2024" },
    { period: 2, cohortSize: 1500, retainedUsers: 825, retentionRate: 0.55, breakdownValue: "Mar 2024" },
    { period: 3, cohortSize: 1500, retainedUsers: 675, retentionRate: 0.45, breakdownValue: "Mar 2024" },
    // Apr 2024 cohort
    { period: 0, cohortSize: 1800, retainedUsers: 1800, retentionRate: 1.0, breakdownValue: "Apr 2024" },
    { period: 1, cohortSize: 1800, retainedUsers: 1260, retentionRate: 0.70, breakdownValue: "Apr 2024" },
    { period: 2, cohortSize: 1800, retainedUsers: 990, retentionRate: 0.55, breakdownValue: "Apr 2024" },
    // May 2024 cohort
    { period: 0, cohortSize: 2000, retainedUsers: 2000, retentionRate: 1.0, breakdownValue: "May 2024" },
    { period: 1, cohortSize: 2000, retainedUsers: 1400, retentionRate: 0.70, breakdownValue: "May 2024" },
  ],
  periods: [0, 1, 2, 3, 4, 5],
  breakdownValues: ["Jan 2024", "Feb 2024", "Mar 2024", "Apr 2024", "May 2024"],
  granularity: "month",
};
