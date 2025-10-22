// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, waitFor } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "TEACHER" } } }),
}));
vi.mock("@/lib/class-type-options", () => ({
  fetchClassTypeOptions: vi
    .fn()
    .mockResolvedValue([{ value: "a", label: "通常授業" }]),
}));

// Mock Faceted to immediately set a value on mount
vi.mock("@/components/ui/faceted", () => {
  return {
    Faceted: ({ multiple, value, onValueChange, children }: any) => {
      React.useEffect(() => {
        onValueChange?.(["a"]);
      }, []);
      return <div data-testid="faceted">{children}</div>;
    },
    FacetedTrigger: (props: any) => <button {...props} />,
    FacetedBadgeList: (props: any) => <div {...props} />,
    FacetedContent: (props: any) => <div {...props} />,
    FacetedInput: (props: any) => <input {...props} />,
    FacetedList: (props: any) => <div {...props} />,
    FacetedEmpty: (props: any) => <div {...props} />,
    FacetedGroup: (props: any) => <div {...props} />,
    FacetedItem: (props: any) => <div {...props} />,
  };
});

const teacherHookMock = vi
  .fn()
  .mockReturnValue({ data: { data: [] }, isPending: false });
vi.mock("@/hooks/useClassSessionQuery", async (orig) => {
  const actual: any = await (orig as any)();
  return {
    ...actual,
    useTeacherClassSessionsDateRange: (...args: any[]) =>
      teacherHookMock(...args),
  };
});

import TeacherPage from "@/app/teacher/page";

describe("Teacher Week/Month filter integration", () => {
  it("passes classTypeIds to useTeacherClassSessionsDateRange when selection changes", async () => {
    render(<TeacherPage />);
    await waitFor(() => {
      expect(teacherHookMock).toHaveBeenCalled();
    });
    const lastArgs = teacherHookMock.mock.calls.pop()?.[0];
    expect(lastArgs.classTypeIds).toEqual(["a"]);
  });
});
