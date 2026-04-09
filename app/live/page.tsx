"use client";
import dynamic from "next/dynamic";

const StockPredictionChart = dynamic(
  () => import("../../components/StockPredictionChart"),
  {
    ssr: false,
  },
);

export default function Page() {
  return <StockPredictionChart />;
}
