import "./App.css";

const pizzaData = [
  {
    name: "Focaccia",
    ingredients: "Bread with italian olive oil and rosemary",
    price: 6,
    photoName: "pizzas/focaccia.jpg",
    soldOut: false,
  },
  {
    name: "Pizza Margherita",
    ingredients: "Tomato and mozarella",
    price: 10,
    photoName: "pizzas/margherita.jpg",
    soldOut: false,
  },
  {
    name: "Pizza Spinaci",
    ingredients: "Tomato, mozarella, spinach, and ricotta cheese",
    price: 12,
    photoName: "pizzas/spinaci.jpg",
    soldOut: false,
  },
  {
    name: "Pizza Funghi",
    ingredients: "Tomato, mozarella, mushrooms, and onion",
    price: 12,
    photoName: "pizzas/funghi.jpg",
    soldOut: false,
  },
  {
    name: "Pizza Salamino",
    ingredients: "Tomato, mozarella, and pepperoni",
    price: 15,
    photoName: "pizzas/salamino.jpg",
    soldOut: true,
  },
  {
    name: "Pizza Prosciutto",
    ingredients: "Tomato, mozarella, ham, aragula, and burrata cheese",
    price: 18,
    photoName: "pizzas/prosciutto.jpg",
    soldOut: false,
  },
];

function App() {
  return (
    <div className="app-shell">
      <Header />
      <Menu />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="hero">
      <div className="brand-mark" aria-hidden="true">
        <span>FR</span>
      </div>
      <div>
        <p className="eyebrow">Since 1987 · Napoli inspired</p>
        <h1>Fast React Pizza Co.</h1>
        <p className="hero-copy">
          Hand-stretched dough, bright ingredients, and pizza worth slowing down
          for.
        </p>
      </div>
      <div className="hero-badge">
        Made fresh
        <br />
        every day
      </div>
    </header>
  );
}
function Menu() {
  return (
    <main className="menu">
      <div className="menu-heading">
        <div>
          <p className="eyebrow">The good stuff</p>
          <h2>Our menu</h2>
        </div>
        <p className="menu-note">
          Small menu. Big flavor.
          <br />
          Always made to order.
        </p>
      </div>
      <div className="pizza-grid">
        {pizzaData.map((pizza, index) => (
          <Pizza key={pizza.name} pizza={pizza} index={index} />
        ))}
      </div>
    </main>
  );
}

function Footer() {
  const hour = new Date().getHours();
  const openHour = 12;
  const closeHour = 22;
  const isOpen = hour >= openHour && hour < closeHour;

  return (
    <footer className="footer">
      <span
        className={`status-dot ${isOpen ? "is-open" : ""}`}
        aria-hidden="true"
      />
      <span>
        {isOpen ? "We're open until 10 pm" : "We're closed right now"}
      </span>
      <span className="footer-divider" aria-hidden="true" />
      <span>Pickup · Delivery · Good times</span>
    </footer>
  );
}

function Pizza({ pizza, index }) {
  return (
    <article
      className={`pizza ${pizza.soldOut ? "sold-out" : ""}`}
      style={{ "--delay": `${index * 80}ms` }}
    >
      <div className="pizza-image-wrap">
        <img src={`/${pizza.photoName}`} alt={pizza.name} />
        {pizza.soldOut && <span className="sold-out-label">Sold out</span>}
      </div>
      <div className="pizza-content">
        <div className="pizza-title-row">
          <h3>{pizza.name.replace("Pizza ", "")}</h3>
          <span className="price">
            {pizza.soldOut ? "—" : `$${pizza.price}`}
          </span>
        </div>
        <p>{pizza.ingredients}</p>
      </div>
    </article>
  );
}

export default App;
