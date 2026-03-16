import { render, screen } from "@testing-library/react";
import PlayerAvatar from "./PlayerAvatar.jsx";

describe("PlayerAvatar", () => {
  it("renders player name and status", () => {
    const player = {
      id: "p1",
      name: "Nova",
      avatar: "🔥",
      alive: true
    };
    render(<PlayerAvatar player={player} isHolder={false} />);
    expect(screen.getByText("Nova")).toBeInTheDocument();
    expect(screen.getByText("Alive")).toBeInTheDocument();
  });
});
