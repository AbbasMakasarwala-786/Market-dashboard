import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Store } from "@/store/types";

function initStore(name: string) {
  return create<Store>()(
    persist(
      (set, get) => ({
        data: {},
        change: (stock, value) =>
          set((state) => ({ data: { ...state.data, [stock]: value } })),
        add: (stock, value) =>
          set((state) => ({
            data: { ...state.data, [stock]: (state.data[stock] ?? 0) + value },
          })),
        subtract: (stock, value) =>
          set((state) => ({
            data: { ...state.data, [stock]: (state.data[stock] ?? 0) - value },
          })),
        getStock: (stock) => get().data[stock] ?? 0
      }),
      {
        name,
        storage: createJSONStorage(() => localStorage)
      },
    ),
  );
}

export const useMoney = initStore("money-storage");

export const useStock = initStore("stock-storage");

export const useTrades = initStore("trade-storage");
