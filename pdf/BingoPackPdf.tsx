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
  sponsorImage?: string; // kept for later
  bannerImageUrl?: string;
  title?: string;
  sponsorName?: string;
};

const PAGE_PADDING = 36;
const CONTENT_WIDTH = 540;

// Banner tuning: keep readable and NEVER crop
const BANNER_HEIGHT = 70;
const BANNER_MARGIN_BOTTOM = 10;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeIconSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  if (v.startsWith("icons/")) return `/${v}`;

  return null;
}

export default function BingoPackPdf({
  cards,
  gridSize: gridSizeProp,
  bannerImageUrl,
  title,
  sponsorName,
}: Props) {
  const inferred = cards?.[0]?.grid?.length ?? 5;
  const gridSize = (gridSizeProp ?? inferred) as number;

  const cellSize = clamp(Math.floor(CONTENT_WIDTH / gridSize), 70, 110);
  const gridWidth = cellSize * gridSize;
  const gridHeight = cellSize * gridSize;

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
      marginBottom: 12,
    },

    // Wrap gives us a clean box for the banner
    bannerWrap: {
      width: "100%",
      height: BANNER_HEIGHT,
      marginBottom: BANNER_MARGIN_BOTTOM,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff",
    },

    // "contain" prevents cropping entirely
    banner: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
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

    label: {
      fontSize: 10,
      textAlign: "center",
      lineHeight: 1.15,
    },

    footer: {
      marginTop: 14,
      alignItems: "center",
      color: "#444",
      fontSize: 9,
    },
  });

  return (
    <Document>
      {cards.map((card) => {
        return (
          <Page key={card.id} size="LETTER" style={styles.page}>
            <View style={styles.header}>
              {bannerImageUrl ? (
                <View style={styles.bannerWrap}>
                  <Image src={bannerImageUrl} style={styles.banner as any} />
                </View>
              ) : null}

              <Text style={styles.title}>{title || "Harvest Heroes Bingo"}</Text>

              {sponsorName ? <Text style={styles.sub}>Sponsor: {sponsorName}</Text> : null}
            </View>

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

                      // Print-friendly PDF: NO icons rendered.
                      // (Keeping ICON_MAP import available if you re-enable later.)
                      // const iconSrc = safeIconSrc((ICON_MAP as any)[label]);

                      return (
                        <View key={`c-${card.id}-${rIdx}-${cIdx}`} style={cellStyle as any}>
                          <View style={styles.cellInner}>
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
              <Text>Card ID: {card.id}</Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
