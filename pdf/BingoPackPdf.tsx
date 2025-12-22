// pdf/BingoPackPdf.tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, pdf } from "@react-pdf/renderer";
import type { BingoGrid } from "@/lib/bingo";

export type BingoCard = {
  id: string;
  grid: BingoGrid; // (string|null)[][]
};

export type BingoPack = {
  title: string;
  sponsorName: string;
  bannerUrl?: string;
  logoUrl?: string;
  cards: BingoCard[];
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  bannerWrap: {
    marginBottom: 14,
  },
  banner: {
    height: 46,
    borderRadius: 6,
    backgroundColor: "#111",
    color: "#fff",
    padding: 10,
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 2,
  },
  bannerSub: {
    fontSize: 10,
    color: "#ddd",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardId: {
    fontSize: 9,
    color: "#111",
  },
  note: {
    fontSize: 9,
    color: "#555",
  },
  gridOuter: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: "20%",
    height: 62,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  cellText: {
    fontSize: 10,
    textAlign: "center",
    color: "#111",
  },
  freeCell: {
    backgroundColor: "#111",
  },
  freeTextTop: {
    fontSize: 10,
    color: "#fff",
    textAlign: "center",
    marginBottom: 2,
  },
  freeTextBottom: {
    fontSize: 9,
    color: "#fff",
    textAlign: "center",
  },
  footer: {
    marginTop: 8,
    fontSize: 9,
    color: "#444",
  },
  logo: {
    width: 42,
    height: 42,
    marginBottom: 4,
    borderRadius: 4,
  },
});

function safeCellText(cell: string | null) {
  if (cell == null) return "";
  return String(cell);
}

function BingoPackDoc({ pack }: { pack: BingoPack }) {
  return (
    <Document>
      {pack.cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          <View style={styles.bannerWrap}>
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>{pack.title}</Text>
              <Text style={styles.bannerSub}>Sponsor: {pack.sponsorName}</Text>
            </View>
          </View>

          <View style={styles.headerRow}>
            <Text style={styles.cardId}>Card ID: {card.id}</Text>
            <Text style={styles.note}>5×5 • Center is FREE</Text>
          </View>

          <View style={styles.gridOuter}>
            {card.grid.map((row, r) => (
              <View key={r} style={styles.row}>
                {row.map((cell, c) => {
                  const isLastCol = c === 4;
                  const isLastRow = r === 4;
                  const isFree = r === 2 && c === 2;

                  // remove borders on outer edges (looks cleaner)
                  const borderFix: any = {};
                  if (isLastCol) borderFix.borderRightWidth = 0;
                  if (isLastRow) borderFix.borderBottomWidth = 0;

                  if (isFree) {
                    return (
                      <View key={c} style={[styles.cell, styles.freeCell, borderFix]}>
                        {pack.logoUrl ? <Image style={styles.logo} src={pack.logoUrl} /> : null}
                        <Text style={styles.freeTextTop}>{pack.sponsorName.toUpperCase()}</Text>
                        <Text style={styles.freeTextBottom}>FREE</Text>
                      </View>
                    );
                  }

                  return (
                    <View key={c} style={[styles.cell, borderFix]}>
                      <Text style={styles.cellText}>{safeCellText(cell)}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            Verification: Screenshot your card with your Card ID visible when you claim bingo.
          </Text>
        </Page>
      ))}
    </Document>
  );
}

export async function renderBingoPackPdf(pack: BingoPack): Promise<Buffer> {
  const instance = pdf(<BingoPackDoc pack={pack} />);
  const buf = await instance.toBuffer();
  return buf as Buffer;
}
