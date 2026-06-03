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
  transaction_id?: string;
  completed_at?: string;
  created_at?: string;
  coupon_code?: string;
  original_amount_usd?: number | null;
  charged_amount_egp?: number | null;
  exchange_rate?: number | null;
  gateway_fee_amount?: number;
  gateway_fee_enabled?: boolean;
  subtotal_price?: number;
  final_price?: number;
  gateway_fee_percentage?: number;
  country?: string;
  city?: string;
  timezone?: string;
  ip_address?: string;
  payment_provider?: string;
  payment_method?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  language?: string;
  country_code?: string;
  country_name?: string;
  invoice_id?: string;
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

export async function updateOrderStatus(paymentId: string, status: OrderStatus, transaction?: any) {
  const updateData: any = { status };
  
  console.log(`[ORDERS_LIB] Updating order ${paymentId} to ${status}`, updateData);

  const { data, error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("payment_id", paymentId)
    .select();

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
