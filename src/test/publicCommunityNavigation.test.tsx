import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import SiteHeader from "@/components/SiteHeader";
import CommunityFooter from "@/components/ecosystem/CommunityFooter";

vi.mock("@/hooks/usePortalAuth", () => ({ usePortalAuth: () => ({ sessionUser: null, signOut: vi.fn() }) }));
vi.mock("@/components/GoogleTranslate", () => ({ default: () => null }));
afterEach(cleanup);

it("keeps chat out of public navigation while retaining external community destinations", () => {
  render(<MemoryRouter initialEntries={["/"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <SiteHeader />
    <CommunityFooter />
  </MemoryRouter>);

  expect(screen.queryByRole("link", { name: "Community" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Community chat" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Discord" })).toHaveAttribute("href", "https://discord.gg/GD5xxzteA");
  const creators = screen.getByRole("link", { name: "Creators Circuit" });
  expect(creators).toHaveAttribute("href", "https://www.creatorscircuit.tech");
  expect(creators).toHaveAttribute("target", "_blank");

  fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
  const mobileMenu = within(screen.getByRole("dialog", { name: "Navigation menu" }));
  expect(mobileMenu.getByRole("button", { name: "Hackathons" })).toBeVisible();
  expect(mobileMenu.queryByRole("button", { name: "Community" })).not.toBeInTheDocument();
});
