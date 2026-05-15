import { supabase } from "./supabase";

export type OrderStatus = "pending" | "completed" | "failed";

export interface Order {
  id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_id: string;
  product_title: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  payment_id?: string;
  created_at?: string;
}

export async function createOrder(order: Order) {
  const { data, error } = await supabase
    .from("orders")
    .insert([
      {
        ...order,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating order:", error);
    throw error;
  }

  return data;
}

export async function updateOrderStatus(paymentId: string, status: OrderStatus, details?: any) {
  const { data, error } = await supabase
    .from("orders")
    .update({ 
      status,
      // You might want to store more details from the webhook
    })
    .eq("payment_id", paymentId)
    .select()
    .single();

  if (error) {
    console.error("Error updating order status:", error);
    throw error;
  }

  return data;
}

export async function getOrder(id: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching order:", error);
    throw error;
  }

  return data;
}
