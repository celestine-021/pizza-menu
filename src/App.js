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
  const [authUser, setAuthUser] = React.useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("crust-user")) || null;
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = React.useState("signin");
  const [authForm, setAuthForm] = React.useState({
    firstName: "",
    secondName: "",
    deliveryAddress: "",
    email: "",
    password: "",
  });
  const [authMessage, setAuthMessage] = React.useState("");
  const [notification, setNotification] = React.useState("");
  const [adminOrders, setAdminOrders] = React.useState([]);
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

  const addPizza = (item) => {
    addToCart(item);
    setNotification(`${item.name} added to your cart`);
    window.setTimeout(() => setNotification(""), 2600);
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthMessage("Signing you in...");
    try {
      const response = await fetch(
        `/api/auth/${authMode === "register" ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(authForm),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Authentication failed.");
      window.localStorage.setItem("crust-token", result.token);
      window.localStorage.setItem("crust-user", JSON.stringify(result.user));
      setAuthUser(result.user);
      setCustomerName(result.user.name);
      setAuthMessage("");
    } catch (error) {
      setAuthMessage(error.message);
    }
  };

  const updateProfile = async (event) => {
    event.preventDefault();
    setAuthMessage("Saving profile...");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.localStorage.getItem("crust-token")}`,
        },
        body: JSON.stringify({
          firstName: authForm.firstName,
          secondName: authForm.secondName,
          email: authForm.email,
          deliveryAddress: authForm.deliveryAddress,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Unable to save profile.");
      setAuthUser(result.user);
      window.localStorage.setItem("crust-user", JSON.stringify(result.user));
      setAuthMessage("Profile saved.");
    } catch (error) {
      setAuthMessage(error.message);
    }
  };

  const signOut = () => {
    window.localStorage.removeItem("crust-token");
    window.localStorage.removeItem("crust-user");
    setAuthUser(null);
    setAuthMessage("");
  };

  React.useEffect(() => {
    if (authUser)
      setAuthForm({
        firstName: authUser.firstName || "",
        secondName: authUser.secondName || "",
        deliveryAddress: authUser.deliveryAddress || "",
        email: authUser.email || "",
        password: "",
      });
  }, [authUser]);

  React.useEffect(() => {
    if (
      activePanel !== "profile" ||
      profile !== "admin" ||
      authUser?.role !== "admin"
    )
      return;
    fetch("/api/admin/orders", {
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem("crust-token")}`,
      },
    })
      .then((response) => response.json())
      .then((result) => setAdminOrders(result.orders || []))
      .catch(() => setAdminOrders([]));
  }, [activePanel, profile, authUser]);

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
                <button className="add-button" onClick={() => addPizza(item)}>
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

      {notification && (
        <div className="cart-notification" role="status">
          {notification}
          <button onClick={() => setActivePanel("cart")}>View cart</button>
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
                {!authUser ? (
                  <>
                    <div className="profile-tabs">
                      <button
                        className={authMode === "signin" ? "selected" : ""}
                        onClick={() => setAuthMode("signin")}
                      >
                        Sign in
                      </button>
                      <button
                        className={authMode === "register" ? "selected" : ""}
                        onClick={() => setAuthMode("register")}
                      >
                        Register
                      </button>
                    </div>
                    <form
                      className="checkout-form auth-form"
                      onSubmit={submitAuth}
                    >
                      {authMode === "register" && (
                        <>
                          <label>
                            First name
                            <input
                              value={authForm.firstName}
                              onChange={(event) =>
                                setAuthForm({
                                  ...authForm,
                                  firstName: event.target.value,
                                })
                              }
                              required
                            />
                          </label>
                          <label>
                            Second name
                            <input
                              value={authForm.secondName}
                              onChange={(event) =>
                                setAuthForm({
                                  ...authForm,
                                  secondName: event.target.value,
                                })
                              }
                              required
                            />
                          </label>
                          <label>
                            Delivery address
                            <textarea
                              value={authForm.deliveryAddress}
                              onChange={(event) =>
                                setAuthForm({
                                  ...authForm,
                                  deliveryAddress: event.target.value,
                                })
                              }
                              rows="3"
                              required
                            />
                          </label>
                        </>
                      )}
                      <label>
                        Email
                        <input
                          type="email"
                          value={authForm.email}
                          onChange={(event) =>
                            setAuthForm({
                              ...authForm,
                              email: event.target.value,
                            })
                          }
                          required
                        />
                      </label>
                      <label>
                        Password
                        <input
                          type="password"
                          value={authForm.password}
                          onChange={(event) =>
                            setAuthForm({
                              ...authForm,
                              password: event.target.value,
                            })
                          }
                          minLength="6"
                          required
                        />
                      </label>
                      {authMessage && (
                        <p className="form-message">{authMessage}</p>
                      )}
                      <button className="primary-button full">
                        {authMode === "register" ? "Create account" : "Sign in"}
                        <span>↗</span>
                      </button>
                    </form>
                  </>
                ) : profile === "customer" ? (
                  <div className="profile-content">
                    <div className="avatar">
                      {authUser.name.charAt(0).toUpperCase()}
                    </div>
                    <h3>{authUser.name}</h3>
                    <p>{authUser.email}</p>
                    <form className="checkout-form" onSubmit={updateProfile}>
                      <label>
                        First name
                        <input
                          value={authForm.firstName}
                          onChange={(event) =>
                            setAuthForm({
                              ...authForm,
                              firstName: event.target.value,
                            })
                          }
                          required
                        />
                      </label>
                      <label>
                        Second name
                        <input
                          value={authForm.secondName}
                          onChange={(event) =>
                            setAuthForm({
                              ...authForm,
                              secondName: event.target.value,
                            })
                          }
                          required
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={authForm.email}
                          onChange={(event) =>
                            setAuthForm({
                              ...authForm,
                              email: event.target.value,
                            })
                          }
                          required
                        />
                      </label>
                      <label>
                        Delivery address
                        <textarea
                          value={authForm.deliveryAddress}
                          onChange={(event) =>
                            setAuthForm({
                              ...authForm,
                              deliveryAddress: event.target.value,
                            })
                          }
                          rows="3"
                          required
                        />
                      </label>
                      {authMessage && (
                        <p className="form-message">{authMessage}</p>
                      )}
                      <button className="primary-button full">
                        Save profile<span>↗</span>
                      </button>
                    </form>
                    <button className="sign-out-button" onClick={signOut}>
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="profile-content admin-profile">
                    <div className="avatar">A</div>
                    <h3>{authUser.name}</h3>
                    <p>{authUser.email} · Admin account</p>
                    <div className="admin-summary">
                      <div>
                        <span>Active orders</span>
                        <strong>{adminOrders.length || 6}</strong>
                      </div>
                      <div>
                        <span>Riders</span>
                        <strong>4</strong>
                      </div>
                      <div>
                        <span>Pending</span>
                        <strong>2</strong>
                      </div>
                    </div>
                    <div className="admin-board">
                      <h4>Quick actions</h4>
                      <ul>
                        <li>Review live orders</li>
                        <li>Assign delivery slots</li>
                        <li>Confirm M-Pesa payments</li>
                      </ul>
                    </div>
                    <button className="sign-out-button" onClick={signOut}>
                      Sign out
                    </button>
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
