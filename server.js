const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;
const orders = [];

app.use(express.json());

const cleanPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("254")) return digits;
  return `254${digits}`;
};

const startMpesaCheckout = async ({ amount, phone, orderId }) => {
  const {
    MPESA_CONSUMER_KEY,
    MPESA_CONSUMER_SECRET,
    MPESA_SHORTCODE,
    MPESA_PASSKEY,
    MPESA_CALLBACK_URL,
  } = process.env;
  if (
    !MPESA_CONSUMER_KEY ||
    !MPESA_CONSUMER_SECRET ||
    !MPESA_SHORTCODE ||
    !MPESA_PASSKEY ||
    !MPESA_CALLBACK_URL
  ) {
    return { mode: "demo", checkoutRequestId: `DEMO-${orderId}` };
  }

  const auth = Buffer.from(
    `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`,
  ).toString("base64");
  const tokenResponse = await fetch(
    "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: { Authorization: `Basic ${auth}` },
    },
  );
  const { access_token: accessToken } = await tokenResponse.json();
  if (!accessToken) throw new Error("M-Pesa authentication failed.");

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const password = Buffer.from(
    `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`,
  ).toString("base64");
  const checkoutResponse = await fetch(
    "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.ceil(amount),
        PartyA: cleanPhone(phone),
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: cleanPhone(phone),
        CallBackURL: MPESA_CALLBACK_URL,
        AccountReference: orderId,
        TransactionDesc: "Crust and Co pizza order",
      }),
    },
  );
  const checkout = await checkoutResponse.json();
  if (!checkoutResponse.ok || checkout.ResponseCode !== "0")
    throw new Error(
      checkout.errorMessage ||
        checkout.ResponseDescription ||
        "M-Pesa checkout failed.",
    );
  return { mode: "live", checkoutRequestId: checkout.CheckoutRequestID };
};

app.post("/api/orders", async (req, res) => {
  const { customerName, phone, items } = req.body;
  if (
    !customerName ||
    !/^((07|01)\d{8})$/.test(String(phone || "")) ||
    !Array.isArray(items) ||
    !items.length
  ) {
    return res
      .status(400)
      .json({
        message:
          "Enter a name, a valid Kenyan M-Pesa number, and at least one pizza.",
      });
  }
  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0,
  );
  if (!Number.isFinite(total) || total <= 0)
    return res.status(400).json({ message: "Your cart total is invalid." });

  const order = {
    id: `CR-${Date.now().toString(36).toUpperCase()}`,
    customerName,
    phone: cleanPhone(phone),
    items,
    total,
    status: "payment_pending",
    createdAt: new Date().toISOString(),
  };
  try {
    const payment = await startMpesaCheckout({
      amount: total,
      phone,
      orderId: order.id,
    });
    order.payment = payment;
    orders.push(order);
    const message =
      payment.mode === "demo"
        ? `Order ${order.id} received. Demo M-Pesa request created for ${formatKes(total)}.`
        : `Order ${order.id} received. Check your phone to complete the M-Pesa payment.`;
    return res
      .status(201)
      .json({ orderId: order.id, message, paymentMode: payment.mode });
  } catch (error) {
    return res.status(502).json({ message: error.message });
  }
});

app.get("/api/orders", (req, res) => res.json(orders));
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", service: "crust-and-co-api" }),
);

if (process.env.NODE_ENV === "production")
  app.use(express.static(path.join(__dirname, "build")));

app.listen(port, () => console.log(`Crust & Co API listening on port ${port}`));

function formatKes(value) {
  return `KES ${Number(value).toLocaleString("en-KE")}`;
}
