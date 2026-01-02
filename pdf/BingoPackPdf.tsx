// pdf/BingoPackPdf.tsx
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { ICON_MAP } from "@/lib/iconMap";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  cards: BingoCard[];
};

const GRID_SIZE = 5;
const CELL_SIZE = 90;
const PAGE_PADDING = 36;

export default function BingoPackPdf({ cards }: Props) {
  return (
    <Document>
      {cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Grower Bingo</Text>
            <Text style={styles.sub}>Card ID: {card.id}</Text>
          </View>

          {/* GRID */}
          <View style={styles.grid}>
            {card.grid.map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((label, cIdx) => {
                  const hasIcon = Boolean(ICON_MAP[label]);

                  return (
                    <View key={cIdx} style={styles.cell}>
                      <View style={styles.cellInner}>
                        {hasIcon && (
                          <Text style={styles.icon}>■</Text>
                        )}
                        <Text style={styles.label}>{label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text>
              Text labels are the source of truth. Icons are decorative only.
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: PAGE_PADDING,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sub: {
    fontSize: 10,
    color: "#555",
  },
  grid: {
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  cellInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 16,
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    textAlign: "center",
  },
  footer: {
    marginTop: 16,
    alignItems: "center",
    fontSize: 9,
    color: "#666",
  },
});
