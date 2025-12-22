import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type BingoCard = {
  id: string;
  grid: string[][]; // 5x5 with "FREE" at center
};

export type BingoPackPdfProps = {
  packTitle: string;
  sponsorName: string;
  bannerUrl?: string;
  logoUrl?: string;
  cards: BingoCard[];
};

const styles = StyleSheet.create({
  page: { padding: 18 },

  headerWrap: { marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 10, marginTop: 2 },

  banner: { width: "100%", height: 70, objectFit: "cover" as any, marginBottom: 8 },

  cardId: { fontSize: 10, marginBottom: 8 },

  grid: { borderWidth: 2, borderColor: "#000" },
  row: { flexDirection: "row" },

  cellBase: {
    flex: 1,
    height: 72,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },

  lastCol: { borderRightWidth: 0 },
  lastRow: { borderBottomWidth: 0 },

  cellText: { fontSize: 10, textAlign: "center" },

  freeCell: { backgroundColor: "#eee" },
  freeLabel: { fontSize: 10, fontWeight: 700, marginTop: 4 },

  freeLogo: { width: 40, height: 40, objectFit: "contain" as any },
});

export default function BingoPackPdf(props: BingoPackPdfProps) {
  const { packTitle, sponsorName, bannerUrl, logoUrl, cards } = props;

  return (
    <Document>
      {cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          <View style={styles.headerWrap}>
            {bannerUrl ? <Image src={bannerUrl} style={styles.banner} /> : null}
            <Text style={styles.title}>{packTitle}</Text>
            <Text style={styles.subtitle}>Sponsor: {sponsorName}</Text>
          </View>

          <Text style={styles.cardId}>Card ID: {card.id}</Text>

          <View style={styles.grid}>
            {card.grid.map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((cell, cIdx) => {
                  const isFree = cell === "FREE";

                  // ✅ IMPORTANT: only push real style objects (no null/undefined)
                  const cellStyles: any[] = [styles.cellBase];
                  if (cIdx === 4) cellStyles.push(styles.lastCol);
                  if (rIdx === 4) cellStyles.push(styles.lastRow);
                  if (isFree) cellStyles.push(styles.freeCell);

                  return (
                    <View key={cIdx} style={cellStyles}>
                      {isFree ? (
                        <>
                          {logoUrl ? <Image src={logoUrl} style={styles.freeLogo} /> : null}
                          <Text style={styles.freeLabel}>{sponsorName}</Text>
                        </>
                      ) : (
                        <Text style={styles.cellText}>{cell}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
