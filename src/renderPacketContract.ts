import renderPacketContract from "../render-packet-contract.json";

export const renderPacketPanelIds = renderPacketContract.panelIds as [
  "front",
  "inside-left",
  "inside-right",
  "back"
];

export type RenderPacketPanelId = (typeof renderPacketPanelIds)[number];

export const renderPacketTarget = renderPacketContract.target as {
  product: "5x7-double-sided-card";
  widthPixels: 1500;
  heightPixels: 2100;
  dpi: 300;
};
export const renderPacketCopyLimits = renderPacketContract.copyLimits as {
  headlineMaxCharacters: 120;
  bodyMaxCharacters: 600;
  artDirectionMinCharacters: 10;
  artDirectionMaxCharacters: 400;
};
export const renderPacketSafeMargins = renderPacketContract.safeMargins as {
  top: 120;
  right: 120;
  bottom: 120;
  left: 120;
};

export function isRenderPacketPanelId(value: string): value is RenderPacketPanelId {
  return (renderPacketPanelIds as readonly string[]).includes(value);
}

export function hasOrderedRenderPacketPanels(panels: Array<{ id: string }>): boolean {
  return panels.map((panel) => panel.id).join(",") === renderPacketPanelIds.join(",");
}

export function panelMatchesRenderPacketTarget(panel: { width: number; height: number; dpi: number }): boolean {
  return (
    panel.width === renderPacketTarget.widthPixels &&
    panel.height === renderPacketTarget.heightPixels &&
    panel.dpi === renderPacketTarget.dpi
  );
}

export function renderPacketDimensionLabel(): string {
  return `${renderPacketTarget.widthPixels} x ${renderPacketTarget.heightPixels} px at ${renderPacketTarget.dpi} DPI`;
}

export function renderPacketCompactDimensionLabel(): string {
  return `${renderPacketTarget.widthPixels}x${renderPacketTarget.heightPixels}`;
}

export function renderPacketFileName(draftId: string, panelId: RenderPacketPanelId): string {
  return `${draftId}-${panelId}-${renderPacketCompactDimensionLabel()}.svg`;
}
