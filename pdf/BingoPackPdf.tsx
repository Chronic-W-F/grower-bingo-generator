import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ICON_MAP } from "@/lib/iconMap";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  cards: BingoCard[];
  gridSize?: number;
  sponsorImage?: string; // keep for later
};

const PAGE_PADDING = 36;
const CONTENT_WIDTH = 540;
const CONTENT_HEIGHT = 720;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Only show icons if ICON_MAP provides an emoji-like value.
// If ICON_MAP returns a path like "/icons/joes.png", do NOT render it as text.
function getPrintableIcon(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  // If it looks like a path or filename, skip for now (we'll add real <Image/> later)
  if (v.includes("/") || v.includes(".") || v.startsWith("http")) return null;

  // Emoji-like: short, not a word
  if (v.length <= 3) return v;

  return null;
}

export default function BingoPackPdf({ cards, gridSize: gridSizeProp }: Props) {
  const inferred = cards?.[0]?.grid?.length ?? 5;
  const gridSize = (gridSizeProp ?? inferred) as number;

  const cellSize = clamp(Math.floor(CONTENT_WIDTH / gridSize), 70, 110);
  const gridWidth = cellSize * gridSize;
  const gridHeight = cellSize * gridSize;

  const topPad = Math.max(0, Math.floor((CONTENT_HEIGHT - 90 - gridHeight) / 2));

  const styles = StyleSheet.create({
    page: {
      paddingTop: PAGE_PADDING,
      paddingBottom: PAGE_PADDING,
      paddingLeft: PAGE_PADDING,
      paddingRight: PAGE_PADDING,
      fontSize: 10,
      fontFamily: "Helvetica",
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
    icon: {
      fontSize: 18,
      marginBottom: 4,
    },
    label: {
      fontSize: 10,
      textAlign: "center",
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
      {cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Grower Bingo</Text>
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

                    const cellStyle = [
                      styles.cell,
                      isLastCol ? styles.cellLastCol : null,
                      isLastRow ? styles.cellLastRow : null,
                    ];

                    const rawIcon = (ICON_MAP as any)?.[label];
                    const icon = getPrintableIcon(rawIcon);

                    return (
                      <View key={`c-${card.id}-${rIdx}-${cIdx}`} style={cellStyle as any}>
                        <View style={styles.cellInner}>
                          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
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
          </View>
        </Page>
      ))}
    </Document>
  );
}
