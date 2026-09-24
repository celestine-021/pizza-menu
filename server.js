const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;
const orders = [];
const users = new Map();
const sessions = new Map();

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
    throw new Error(
      "Live M-Pesa is not configured. Set the Daraja environment variables before taking payments.",
    );
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

const hashPassword = (
  password,
  salt = crypto.randomBytes(16).toString("hex"),
) => ({
  salt,
  hash: crypto.scryptSync(password, salt, 64).toString("hex"),
});

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});
const getUser = (req) =>
  sessions.get(req.headers.authorization?.replace("Bearer ", ""));
const requireUser = (req, res, next) => {
  const user = getUser(req);
  if (!user)
    return res.status(401).json({ message: "Please sign in to continue." });
  req.user = user;
  return next();
};

app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (
    !name ||
    !/^\S+@\S+\.\S+$/.test(normalizedEmail) ||
    String(password || "").length < 6
  )
    return res.status(400).json({
      message:
        "Enter a name, valid email, and password of at least 6 characters.",
    });
  if (users.has(normalizedEmail))
    return res
      .status(409)
      .json({ message: "An account with that email already exists." });
  const credentials = hashPassword(password);
  const user = {
    id: `USR-${Date.now().toString(36).toUpperCase()}`,
    name: String(name).trim(),
    email: normalizedEmail,
    role: "customer",
    ...credentials,
  };
  users.set(normalizedEmail, user);
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user);
  return res.status(201).json({ user: publicUser(user), token });
});

app.post("/api/auth/login", (req, res) => {
  const normalizedEmail = String(req.body.email || "")
    .trim()
    .toLowerCase();
  let user = users.get(normalizedEmail);
  if (
    !user &&
    normalizedEmail ===
      String(process.env.ADMIN_EMAIL || "admin@crust.co").toLowerCase() &&
    process.env.ADMIN_PASSWORD
  ) {
    const credentials = hashPassword(process.env.ADMIN_PASSWORD);
    user = {
      id: "ADMIN-1",
      name: "Crust & Co. Admin",
      email: normalizedEmail,
      role: "admin",
      ...credentials,
    };
    users.set(normalizedEmail, user);
  }
  const attemptedHash =
    user &&
    crypto
      .scryptSync(String(req.body.password || ""), user.salt, 64)
      .toString("hex");
  if (!user || attemptedHash !== user.hash)
    return res.status(401).json({ message: "Email or password is incorrect." });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user);
  return res.json({ user: publicUser(user), token });
});

app.get("/api/auth/me", requireUser, (req, res) =>
  res.json({ user: publicUser(req.user) }),
);

app.patch("/api/profile", requireUser, (req, res) => {
  const { name, email } = req.body;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(normalizedEmail))
    return res.status(400).json({ message: "Enter a valid name and email." });
  if (normalizedEmail !== req.user.email && users.has(normalizedEmail))
    return res.status(409).json({ message: "That email is already in use." });
  users.delete(req.user.email);
  req.user.name = String(name).trim();
  req.user.email = normalizedEmail;
  users.set(normalizedEmail, req.user);
  return res.json({ user: publicUser(req.user) });
});

app.get("/api/admin/orders", requireUser, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Admin access required." });
  return res.json({ orders });
});

app.post("/api/mpesa/callback", (req, res) => {
  const callback = req.body?.Body?.stkCallback;
  const order = orders.find(
    (entry) => entry.payment?.checkoutRequestId === callback?.CheckoutRequestID,
  );
  if (order)
    order.status = callback.ResultCode === 0 ? "paid" : "payment_failed";
  return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.post("/api/orders", async (req, res) => {
  const { customerName, phone, items } = req.body;
  if (
    !customerName ||
    !/^((07|01)\d{8})$/.test(String(phone || "")) ||
    !Array.isArray(items) ||
    !items.length
  ) {
    return res.status(400).json({
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
    const message = `Order ${order.id} received. Check your phone to complete the live M-Pesa payment.`;
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
