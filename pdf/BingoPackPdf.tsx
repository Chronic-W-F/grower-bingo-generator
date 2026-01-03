// pdf/BingoPackPdf.tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { ICON_MAP } from "@/lib/iconMap";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  cards: BingoCard[];
  gridSize?: number;
  title?: string;
  bannerImageUrl?: string; // absolute URL preferred
};

const PAGE_PADDING = 36;
const CONTENT_WIDTH = 540;
const CONTENT_HEIGHT = 720;

const MAX_ICONS_PER_CARD = 10;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// deterministic hash + seeded shuffle
function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let x = seed || 1;

  for (let i = a.length - 1; i > 0; i--) {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;

    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safeIconSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  if (v.startsWith("icons/")) return `/${v}`;

  return null;
}

function safeBannerSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  // for react-pdf in node, absolute URL is best
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  // allow data URIs too
  if (v.startsWith("data:image/")) return v;

  return null;
}

export default function BingoPackPdf({ cards, gridSize: gridSizeProp, title, bannerImageUrl }: Props) {
  const inferred = cards?.[0]?.grid?.length ?? 5;
  const gridSize = (gridSizeProp ?? inferred) as number;

  const cellSize = clamp(Math.floor(CONTENT_WIDTH / gridSize), 70, 110);
  const gridWidth = cellSize * gridSize;
  const gridHeight = cellSize * gridSize;

  const bannerSrc = safeBannerSrc(bannerImageUrl);
  const hasBanner = Boolean(bannerSrc);

  const bannerHeight = hasBanner ? 130 : 0;

  // Leave room for banner + title block
  const headerBlockHeight = (hasBanner ? bannerHeight + 14 : 0) + 36;
  const topPad = Math.max(0, Math.floor((CONTENT_HEIGHT - headerBlockHeight - gridHeight) / 2));

  const styles = StyleSheet.create({
    page: {
      paddingTop: PAGE_PADDING,
      paddingBottom: PAGE_PADDING,
      paddingLeft: PAGE_PADDING,
      paddingRight: PAGE_PADDING,
      fontSize: 10,
      fontFamily: "Helvetica",
    },
    bannerWrap: {
      width: CONTENT_WIDTH,
      alignSelf: "center",
      marginBottom: 10,
    },
    bannerImg: {
      width: CONTENT_WIDTH,
      height: bannerHeight,
      objectFit: "cover",
      borderRadius: 6,
    },
    header: {
      alignItems: "center",
      marginBottom: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 4,
    },
    sub: {
      fontSize: 10,
      color: "#444",
    },
    spacer: {
      height: topPad,
    },
    gridWrap: {
      width: gridWidth,
      height: gridHeight,
      alignSelf: "center",
      borderWidth: 2,
      borderColor: "#000",
    },
    row: {
      flexDirection: "row",
      width: gridWidth,
      height: cellSize,
    },
    cell: {
      width: cellSize,
      height: cellSize,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#000",
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
    },
    cellLastCol: {
      borderRightWidth: 0,
    },
    cellLastRow: {
      borderBottomWidth: 0,
    },
    cellInner: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    iconImg: {
      width: Math.max(22, Math.floor(cellSize * 0.28)),
      height: Math.max(22, Math.floor(cellSize * 0.28)),
      marginBottom: 4,
    },
    label: {
      fontSize: 10,
      textAlign: "center",
      lineHeight: 1.15,
    },
    footer: {
      marginTop: 16,
      alignItems: "center",
      color: "#666",
      fontSize: 9,
    },
  });

  return (
    <Document>
      {cards.map((card) => {
        const flatLabels = card.grid.flat();

        const candidates = flatLabels.filter((label) => {
          const src = safeIconSrc((ICON_MAP as any)[label]);
          return Boolean(src);
        });

        const seed = hashString(card.id);
        const chosenLabels = new Set(
          seededShuffle(candidates, seed).slice(0, Math.min(MAX_ICONS_PER_CARD, candidates.length))
        );

        return (
          <Page key={card.id} size="LETTER" style={styles.page}>
            {hasBanner ? (
              <View style={styles.bannerWrap}>
                <Image src={bannerSrc as string} style={styles.bannerImg as any} />
              </View>
            ) : null}

            <View style={styles.header}>
              <Text style={styles.title}>{title || "Grower Bingo"}</Text>
              <Text style={styles.sub}>Card ID: {card.id}</Text>
            </View>

            <View style={styles.spacer} />

            <View style={styles.gridWrap}>
              {card.grid.map((row, rIdx) => {
                const isLastRow = rIdx === card.grid.length - 1;

                return (
                  <View key={`r-${card.id}-${rIdx}`} style={styles.row}>
                    {row.map((label, cIdx) => {
                      const isLastCol = cIdx === row.length - 1;

                      const iconSrc = safeIconSrc((ICON_MAP as any)[label]);
                      const showIcon = Boolean(iconSrc) && chosenLabels.has(label);

                      return (
                        <View
                          key={`c-${card.id}-${rIdx}-${cIdx}`}
                          style={[
                            styles.cell,
                            isLastCol ? styles.cellLastCol : null,
                            isLastRow ? styles.cellLastRow : null,
                          ] as any}
                        >
                          <View style={styles.cellInner}>
                            {showIcon ? <Image src={iconSrc as string} style={styles.iconImg as any} /> : null}
                            <Text style={styles.label}>{label}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            <View style={styles.footer}>
              <Text>Text labels are the source of truth. Icons are decorative only.</Text>
              <Text>Max icons per card: {MAX_ICONS_PER_CARD}</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
