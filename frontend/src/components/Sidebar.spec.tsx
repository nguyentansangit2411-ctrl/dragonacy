import React from "react";
import { render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

// Mock next/navigation
const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("Sidebar Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the branding name and user profile summary", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Sidebar />);

    expect(screen.getByText("Dragonacy AI")).toBeInTheDocument();
    expect(screen.getByText("Quản trị Liên kết")).toBeInTheDocument();
    expect(screen.getByText("active_session_01")).toBeInTheDocument();
  });

  it("renders all navigation items with correct labels", () => {
    mockUsePathname.mockReturnValue("/");
    render(<Sidebar />);

    expect(screen.getByText("Tổng quan")).toBeInTheDocument();
    expect(screen.getByText("Sản phẩm")).toBeInTheDocument();
    expect(screen.getByText("Bài viết nháp")).toBeInTheDocument();
    expect(screen.getByText("Hàng đợi đăng")).toBeInTheDocument();
    expect(screen.getByText("Tự động đăng")).toBeInTheDocument();
    expect(screen.getByText("Nhật ký hệ thống")).toBeInTheDocument();
    expect(screen.getByText("Cài đặt")).toBeInTheDocument();
  });

  it("highlights the active navigation link", () => {
    // Set active page to Posting Queue
    mockUsePathname.mockReturnValue("/queue");
    render(<Sidebar />);

    const dashboardLink = screen.getByText("Tổng quan").closest("a");
    const queueLink = screen.getByText("Hàng đợi đăng").closest("a");

    // Posting Queue link should have active styling
    expect(queueLink).toHaveClass("text-purple-500");
    expect(queueLink).toHaveClass("bg-purple-900/10");

    // Dashboard link should have inactive styling
    expect(dashboardLink).toHaveClass("text-muted-foreground");
    expect(dashboardLink).not.toHaveClass("bg-purple-900/10");
  });
});
