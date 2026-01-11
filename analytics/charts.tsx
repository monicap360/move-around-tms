// Chart components for analytics dashboard
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
);

export function BarChart({ data, options }: any) {
  return <Bar data={data} options={options} />;
}

export function LineChart({ data, options }: any) {
  return <Line data={data} options={options} />;
}

export function PieChart({ data, options }: any) {
  return <Pie data={data} options={options} />;
}
