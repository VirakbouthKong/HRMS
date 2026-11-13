# 0002. Icon and Chart Library Selection

## Context
The HRMS dashboard requires expressive iconography for metric badge cards (projects, WFH balance, tasks, leaves, work hours) and visual charts for analytics (Leave Summary donut, Timesheet Summary donut, and Attendance Summary bar chart) as demonstrated in the Dribbble UI reference.

## Decision
1. **Icon Library**: We selected **Phosphor Icons** (`@phosphor-icons/react`) over Hugeicons and Lucide React.
2. **Chart Library**: We selected **React-ChartJS-2** (`react-chartjs-2` + `chart.js`).

## Considered Options
- **Phosphor Icons vs. Hugeicons**:
  - *Phosphor Icons*: Provides 9,000+ icons with 6 distinct weight styles: Thin, Light, Regular, Bold, Fill, and **Duotone**. The Duotone style natively delivers the two-tone tinted look featured in our Dribbble reference (e.g. translucent pastel background with solid foreground emblem). Furthermore, the entire Phosphor collection is 100% free and open-source with zero paywalled variations.
  - *Hugeicons*: Vast library (27,000+), but introduces commercial tier limitations and licensing friction for complete stroke/bulk styles in enterprise projects.
- **React-ChartJS-2 vs. Recharts**:
  - *React-ChartJS-2*: Canvas-rendered engine that excels at rounded cutouts, smooth animations, customizable center text for donut charts, and pill-shaped rounded bar charts (`borderRadius: 8`) matching the Dribbble UI design.

## Consequences
- Phosphor Duotone icons provide an instant cohesive enterprise look across the dashboard without writing manual SVG filters.
- Chart.js provides precise canvas control for smooth tooltips, cutouts, and legends matching the reference charts.
