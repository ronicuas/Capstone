import api from "./api";

export async function createOrder(payload) {
  const { data } = await api.post("/api/orders/", payload);
  return data;
}
