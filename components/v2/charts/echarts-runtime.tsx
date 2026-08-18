"use client"

import * as React from "react"
import * as echarts from "echarts/core"
import { PieChart, BarChart, LineChart } from "echarts/charts"
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import ReactEChartsCore from "echarts-for-react/lib/core"

echarts.use([
  PieChart,
  BarChart,
  LineChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  TitleComponent,
  CanvasRenderer,
])

export default function EChartsRuntime(
  props: React.ComponentProps<typeof ReactEChartsCore>
) {
  return <ReactEChartsCore echarts={echarts} {...props} />
}
