import "./App.css";
import React from "react";

const menu = [
  {
    id: 1,
    name: "The Nairobi",
    description: "Spiced beef, red onion, coriander, and a smoky tomato base.",
    price: 950,
    tag: "Local favourite",
    accent: "red",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    name: "Garden Heat",
    description:
      "Roasted peppers, sweet corn, jalapeno, basil, and mozzarella.",
    price: 820,
    tag: "Vegetarian",
    accent: "yellow",
    image:
      "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    name: "Mombasa Gold",
    description: "Garlic prawns, pineapple, chilli oil, and fresh lime.",
    price: 1100,
    tag: "Chef pick",
    accent: "orange",
    image:
      "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    name: "Classic Margherita",
    description:
      "San Marzano tomato, buffalo mozzarella, basil, and olive oil.",
    price: 700,
    tag: "Simple & good",
    accent: "green",
    image:
      "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85",
  },
];

const formatKes = (value) => `KES ${value.toLocaleString()}`;

function App() {
  const [cart, setCart] = React.useState([]);
  const [activePanel, setActivePanel] = React.useState(null);
  const [profile, setProfile] = React.useState("customer");
  const [phone, setPhone] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [orderState, setOrderState] = React.useState({
    status: "idle",
    message: "",
  });

  const addToCart = (item) =>
    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      return existing
        ? current.map((entry) =>
            entry.id === item.id
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry,
          )
        : [...current, { ...item, quantity: 1 }];
    });

  const changeQuantity = (id, amount) =>
    setCart((current) =>
      current
        .map((entry) =>
          entry.id === id
            ? { ...entry, quantity: entry.quantity + amount }
            : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );

  const removeFromCart = (id) =>
    setCart((current) => current.filter((entry) => entry.id !== id));

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!cart.length) return;
    setOrderState({
      status: "loading",
      message: "Starting your M-Pesa checkout...",
    });
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, phone, items: cart }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Unable to create order.");
      setOrderState({ status: "success", message: result.message });
      setCart([]);
      setActivePanel(null);
    } catch (error) {
      setOrderState({
        status: "error",
        message: `${error.message} Start the backend with npm run server.`,
      });
    }
  };

  return (
    <div className="App">
      <header className="topbar">
        <a className="brand" href="#menu" aria-label="Crust & Co home">
          <span className="brand-mark">C</span>
          <span>
            CRUST <em>&amp;</em> CO.
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#menu">Menu</a>
          <a href="#story">Our story</a>
        </nav>
        <div className="top-actions">
          <button
            className="profile-button"
            onClick={() => setActivePanel("profile")}
          >
            Profile
          </button>
          <button
            className="cart-button"
            onClick={() => setActivePanel("cart")}
          >
            Cart <b>{itemCount}</b>
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="menu">
          <div className="hero-copy">
            <p className="eyebrow">Hand-stretched in Nairobi</p>
            <h1>
              Good pizza.
              <br />
              <i>Better mood.</i>
            </h1>
            <p className="hero-intro">
              Big flavour, bright ingredients, and a little bit of weekend
              energy in every box.
            </p>
            <a className="primary-button" href="#pizzas">
              Order now <span>↘</span>
            </a>
          </div>
          <div className="hero-art">
            <img
              src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=90"
              alt="Freshly baked pizza with basil and mozzarella"
            />
            <div className="sun">★</div>
            <div className="art-note">
              MADE
              <br />
              WITH
              <br />
              FEELING
            </div>
          </div>
        </section>

        <section className="menu-section" id="pizzas">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The good stuff</p>
              <h2>Pick your mood.</h2>
            </div>
            <p>
              Every pizza is made to order,
              <br />
              and always arrives hot.
            </p>
          </div>
          <div className="pizza-grid">
            {menu.map((item) => (
              <article className="pizza-card" key={item.id}>
                <div className={`pizza-visual ${item.accent}`}>
                  <img src={item.image} alt={`${item.name} pizza`} />
                  <span className="tag">{item.tag}</span>
                </div>
                <div className="pizza-details">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                  </div>
                  <strong>{formatKes(item.price)}</strong>
                </div>
                <button className="add-button" onClick={() => addToCart(item)}>
                  Add to cart <span>+</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="story" id="story">
          <p className="eyebrow">From our oven to your door</p>
          <h2>
            Keep it hot.
            <br />
            <i>Keep it human.</i>
          </h2>
          <p>
            We make pizza for the table, the couch, the late night, and the
            “just one slice” that turns into four.
          </p>
        </section>
      </main>

      {orderState.status !== "idle" && (
        <div className={`toast ${orderState.status}`} role="status">
          {orderState.message}
          <button
            onClick={() => setOrderState({ status: "idle", message: "" })}
          >
            ×
          </button>
        </div>
      )}

      {activePanel && (
        <div className="panel-backdrop" onClick={() => setActivePanel(null)}>
          <aside
            className="side-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-button"
              onClick={() => setActivePanel(null)}
              aria-label="Close"
            >
              ×
            </button>
            {activePanel === "cart" ? (
              <>
                <p className="eyebrow">Your order</p>
                <h2>
                  Cart <span className="count">{itemCount}</span>
                </h2>
                {cart.length ? (
                  <>
                    <div className="cart-toolbar">
                      <span>
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                      <button className="clear-cart" onClick={clearCart}>
                        Clear cart
                      </button>
                    </div>
                    <div className="cart-items">
                      {cart.map((item) => (
                        <div className="cart-row" key={item.id}>
                          <img src={item.image} alt="" />
                          <div>
                            <strong>{item.name}</strong>
                            <p>{formatKes(item.price)} each</p>
                          </div>
                          <div className="cart-actions">
                            <div className="quantity">
                              <button
                                aria-label={`Decrease ${item.name}`}
                                onClick={() => changeQuantity(item.id, -1)}
                              >
                                -
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                aria-label={`Increase ${item.name}`}
                                onClick={() => changeQuantity(item.id, 1)}
                              >
                                +
                              </button>
                            </div>
                            <button
                              className="remove-button"
                              aria-label={`Remove ${item.name}`}
                              onClick={() => removeFromCart(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="cart-total">
                      <span>Total</span>
                      <strong>{formatKes(total)}</strong>
                    </div>
                    <button
                      className="primary-button full"
                      onClick={() => setActivePanel("checkout")}
                    >
                      Checkout <span>↗</span>
                    </button>
                  </>
                ) : (
                  <div className="empty-cart">
                    <div className="empty-mark">+</div>
                    <p>Your cart is waiting for something delicious.</p>
                    <a href="#pizzas" onClick={() => setActivePanel(null)}>
                      Browse the menu
                    </a>
                  </div>
                )}
              </>
            ) : activePanel === "profile" ? (
              <>
                <p className="eyebrow">Account</p>
                <h2>Your profile</h2>
                <div className="profile-tabs">
                  <button
                    className={profile === "customer" ? "selected" : ""}
                    onClick={() => setProfile("customer")}
                  >
                    Customer
                  </button>
                  <button
                    className={profile === "admin" ? "selected" : ""}
                    onClick={() => setProfile("admin")}
                  >
                    Admin
                  </button>
                </div>
                {profile === "customer" ? (
                  <div className="profile-content">
                    <div className="avatar">C</div>
                    <h3>Guest customer</h3>
                    <p>
                      Save your details at checkout for a faster next order.
                    </p>
                    <span className="profile-label">Orders</span>
                    <strong>Ready for your first one</strong>
                  </div>
                ) : (
                  <div className="profile-content admin-profile">
                    <div className="avatar">A</div>
                    <h3>Crust &amp; Co. Admin</h3>
                    <p>Kitchen overview and order management.</p>
                    <div className="admin-stat">
                      <span>Today</span>
                      <strong>Orders are stored by the backend.</strong>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="eyebrow">M-Pesa checkout</p>
                <h2>Almost there.</h2>
                <form onSubmit={placeOrder} className="checkout-form">
                  <label>
                    Your name
                    <input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="e.g. Amina"
                      required
                    />
                  </label>
                  <label>
                    M-Pesa number
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="07XX XXX XXX"
                      pattern="(07|01)[0-9]{8}"
                      required
                    />
                  </label>
                  <div className="payment-note">
                    <span className="mpesa-badge">M</span>
                    <p>
                      <strong>Pay with M-Pesa</strong>
                      <br />
                      You will receive a prompt on your phone for{" "}
                      {formatKes(total)}.
                    </p>
                  </div>
                  <button
                    className="primary-button full"
                    disabled={orderState.status === "loading"}
                  >
                    {orderState.status === "loading"
                      ? "Connecting..."
                      : "Place order"}{" "}
                    <span>↗</span>
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
