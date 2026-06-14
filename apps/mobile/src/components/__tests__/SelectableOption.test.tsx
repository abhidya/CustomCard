import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { SelectableOption } from "../SelectableOption";

describe("SelectableOption", () => {
  it("exposes radio semantics and reflects the selected state", async () => {
    await render(
      <SelectableOption label="Walgreens Photo" selected detail="Pickup today" onPress={() => {}} />
    );
    const option = screen.getByLabelText("Walgreens Photo");
    expect(option.props.accessibilityRole).toBe("radio");
    expect(option.props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText("Pickup today")).toBeTruthy();
  });

  it("fires onPress when tapped", async () => {
    const onPress = jest.fn();
    await render(<SelectableOption label="CVS Photo" selected={false} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText("CVS Photo"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
