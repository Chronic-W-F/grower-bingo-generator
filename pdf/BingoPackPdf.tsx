import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet
} from "@react-pdf/renderer";
import type { BingoGrid } from "@/lib/bingo";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10 },
  banner: { height: 80, width: "100%", marginBottom: 12, objectFit: "cover" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  grid: { borderWidth: 1, borderColor: "#111" },
  row: { flexDirection: "row" },
  cell: {
    width: "20%",
    height: 95,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111",
    padding: 6,
    justifyContent: "center"
  },
  cellText: { fontSize: 9, textAlign: "center" },
  footer: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  centerLogo: { width: 48, height: 48, marginTop: 6, alignSelf: "center", objectFit: "contain" }
});

export function BingoPackPdf(props: {
  packTitle: string;
  sponsorName: string;
  bannerUrl?: string;
  logoUrl?: string;
  cards: { id: string; grid: BingoGrid }[];
}) {
  const bannerUrl = props.bannerUrl ?? "";
  const logoUrl = props.logoUrl ?? "";

  return (
    <Document>
      {props.cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          {bannerUrl ? <Image src={bannerUrl} style={styles.banner} /> : null}

          <View style={styles.titleRow}>
            <Text>{props.packTitle}</Text>
            <Text>{props.sponsorName}</Text>
          </View>

          <View style={styles.grid}>
            {card.grid.map((row, r) => (
              <View key={r} style={styles.row}>
                {row.map((cell, c) => {
                  const isCenter = r === 2 && c === 2;
                  const isLastCol = c === 4;
                  const isLastRow = r === 4;

                  return (
                    <View
                      key={c}
                      style={[
                        styles.cell,
                        isLastCol && { borderRightWidth: 0 },
                        isLastRow && { borderBottomWidth: 0 }
                      ]}
                    >
                      <Text style={styles.cellText}>{cell}</Text>
                      {isCenter && logoUrl ? (
                        <Image src={logoUrl} style={styles.centerLogo} />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text>Card ID: {card.id}</Text>
            <Text>Center = FREE (Sponsored)</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
