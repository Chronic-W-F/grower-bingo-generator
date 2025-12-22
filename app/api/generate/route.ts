// pdf/BingoPackPdf.tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

export type BingoGrid = string[][];
export type BingoCard = { id: string; grid: BingoGrid };

export type BingoPack = {
  packTitle: string;
  sponsorName: string;
  bannerUrl?: string;
  logoUrl?: string;
  cards: BingoCard[];
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica" },

  headerWrap: { marginBottom: 10 },
  headerBar: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 10,
    color: "#fff",
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  headerSub: { fontSize: 10, opacity: 0.9 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  metaLeft: { fontSize: 9 },
  metaRight: { fontSize: 9, opacity: 0.85 },

  cardWrap: {
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    overflow: "hidden",
  },

  grid: { flexDirection: "column" },
  row: { flexDirection: "row" },
  cell: {
    width: "20%",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#222",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    minHeight: 58,
  },
  lastCellInRow: { borderRightWidth: 0 },
  lastRow: { borderBottomWidth: 0 },

  cellText: { textAlign: "center" },

  freeCell: { backgroundColor: "#111" },
  freeTextTop: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  freeTextBottom: { color: "#fff", fontSize: 7, opacity: 0.9 },

  footer: { marginTop: 10, fontSize: 8, opacity: 0.8 },
});

function BingoPackDoc({ pack }: { pack: BingoPack }) {
  return (
    <Document>
      {pack.cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          <View style={styles.headerWrap}>
            <View style={styles.headerBar}>
              <Text style={styles.headerTitle}>{pack.packTitle}</Text>
              <Text style={styles.headerSub}>Sponsor: {pack.sponsorName}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLeft}>Card ID: {card.id}</Text>
            <Text style={styles.metaRight}>5×5 • Center is FREE</Text>
          </View>

          <View style={styles.cardWrap}>
            <View style={styles.grid}>
              {card.grid.map((row, rIdx) => (
                <View key={rIdx} style={styles.row}>
                  {row.map((cell, cIdx) => {
                    const isCenter = rIdx === 2 && cIdx === 2;
                    const isLastCell = cIdx === 4;
                    const isLastRow = rIdx === 4;

                    // Ensure the PDF only ever gets STRINGS (prevents [object Object])
                    const cellText = typeof cell === "string" ? cell : String(cell ?? "");

                    // ✅ NO nulls in style array (react-pdf typing hates null)
                    const cellStyle = [
                      styles.cell,
                      ...(isLastCell ? [styles.lastCellInRow] : []),
                      ...(isLastRow ? [styles.lastRow] : []),
                      ...(isCenter ? [styles.freeCell] : []),
                    ];

                    return (
                      <View key={cIdx} style={cellStyle}>
                        {isCenter ? (
                          <>
                            <Text style={styles.freeTextTop}>
                              {pack.sponsorName.toUpperCase()}
                            </Text>
                            <Text style={styles.freeTextBottom}>FREE</Text>
                          </>
                        ) : (
                          <Text style={styles.cellText}>{cellText}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.footer}>
            Verification: Screenshot your card with your Card ID visible when you claim bingo.
          </Text>
        </Page>
      ))}
    </Document>
  );
}

export async function renderBingoPackPdf(pack: BingoPack) {
  const doc = <BingoPackDoc pack={pack} />;
  const instance = pdf(doc);
  const buf = await instance.toBuffer();
  return buf;
}
