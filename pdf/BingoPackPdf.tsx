import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { ICON_MAP } from "@/lib/iconMap";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  cards: BingoCard[];
  gridSize?: number; // passed from API (pack.meta.gridSize)
  sponsorImage?: string; // keep for later
};

const PAGE_PADDING = 36;

// A safe, printable content box for Letter portrait.
// React-PDF uses "pt" units; these numbers are friendly and stable.
const CONTENT_WIDTH = 540;  // roughly 8.5" minus margins
const CONTENT_HEIGHT = 720; // roughly 11" minus margins

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function BingoPackPdf({ cards, gridSize: gridSizeProp }: Props) {
  // Prefer passed prop, otherwise infer from first card
  const inferred = cards?.[0]?.grid?.length ?? 5;
  const gridSize = (gridSizeProp ?? inferred) as number;

  // Compute cell size from available width.
  // Keep within reasonable bounds so 3x3 doesn't get comically huge.
  const cellSize = clamp(Math.floor(CONTENT_WIDTH / gridSize), 70, 110);

  const gridWidth = cellSize * gridSize;
  const gridHeight = cellSize * gridSize;

  // Center the grid vertically in the content area
  const topPad = Math.max(0, Math.floor((CONTENT_HEIGHT - 90 - gridHeight) / 2)); // 90 = header space

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
    // Remove right border on last cell in a row
    cellLastCol: {
      borderRightWidth: 0,
    },
    // Remove bottom border on last row
    rowLast: {},
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

                    const icon = ICON_MAP?.[label];

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
