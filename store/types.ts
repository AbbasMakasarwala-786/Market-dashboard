import { STOCK_LIST } from "@/lib/constants";

export type Stock = (typeof STOCK_LIST)[number];

export type Stocks = { [key: Stock]: number };

/** Cash balance lives under this key in `useMoney` (not a listed ticker). */
export const CASH_KEY = "__BALANCE__" as const;

export type PortfolioKey = Stock | typeof CASH_KEY;

export interface Store {
  data: Partial<Record<PortfolioKey, number>>;

  change: (key: PortfolioKey, value: number) => void;
  add: (key: PortfolioKey, value: number) => void;
  subtract: (key: PortfolioKey, value: number) => void;
  getStock: (key: PortfolioKey) => number;
}