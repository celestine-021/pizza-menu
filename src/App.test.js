import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

test("renders the pizza menu and order controls", () => {
  render(<App />);
  expect(screen.getByText(/good pizza/i)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /add to cart/i })).toHaveLength(
    4,
  );
});

test("adds a pizza, updates its quantity, and removes it", () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole("button", { name: /add to cart/i })[0]);
  fireEvent.click(screen.getByRole("button", { name: /cart 1/i }));
  expect(screen.getAllByText("The Nairobi")).toHaveLength(2);

  fireEvent.click(
    screen.getByRole("button", { name: /increase the nairobi/i }),
  );
  expect(
    screen.getByText("2", { selector: ".quantity span" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /remove the nairobi/i }));
  expect(screen.getByText(/your cart is waiting/i)).toBeInTheDocument();
});
