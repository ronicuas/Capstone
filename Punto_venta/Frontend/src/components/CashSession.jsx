// src/components/CashSession.jsx
import { useEffect, useState } from "react";

export function useCashSession() {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cash_state") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem("cash_state", JSON.stringify(state || {}));
  }, [state]);

  function add(amount, key){
    setState(s => ({ ...s, [key]: (Number(s[key])||0) + Number(amount||0) }));
  }

  return {
    state,
    setState,
    open(opening_cash=0, note="", user="admin"){
      setState({
        open:true,
        opening_cash:Number(opening_cash)||0,
        note_open:note,
        user,
        cash_sales:0, card_sales:0, transfer_sales:0,
        cash_entries:0, cash_outs:0,
      });
    },
    close(close_note="", count_cash=0){
      const s = state || {};
      const expected =
        (Number(s.opening_cash)||0) +
        (Number(s.cash_sales)||0) +
        (Number(s.cash_entries)||0) -
        (Number(s.cash_outs)||0);
      const snapshot = {
        ...s,
        close_note,
        counted_cash:Number(count_cash||0),
        expected_cash:expected,
        diff:(Number(count_cash||0) - expected),
        closed_at:new Date().toISOString(),
      };
      const hist = JSON.parse(localStorage.getItem("cash_history") || "[]");
      hist.push(snapshot);
      localStorage.setItem("cash_history", JSON.stringify(hist));
      localStorage.removeItem("cash_state");
      setState({ open:false });
    },
    addCashSale(a){ add(a,"cash_sales"); },
    addCardSale(a){ add(a,"card_sales"); },
    addTransferSale(a){ add(a,"transfer_sales"); },
    addEntry(a){ add(a,"cash_entries"); },
    addOut(a){ add(a,"cash_outs"); },
  };
}
