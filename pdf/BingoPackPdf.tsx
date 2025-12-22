// /pdf/BingoPackPdf.tsx

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { BingoGrid } from "@/lib/bingo";

type BingoCard = {
  id: string;
  grid: BingoGrid;
};

export type BingoPack = {
  packTitle: string;
  sponsorName: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  cards: BingoCard[];
};

const styles = StyleSheet.create({
  page: {
    padding: 18,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #222",
  },
  banner: {
    height: 60,
    width: "100%",
    objectFit: "cover",
  },
  headerInner: {
    padding: 10,
    backgroundColor: "#111",
    color: "white",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  sponsor: {
    fontSize: 12,
    opacity: 0.9,
  },
  cardWrap: {
    marginTop: 10,
    border: "1px solid #222",
    borderRadius: 10,
    overflow: "hidden",
  },
  cardTop: {
    padding: 8,
    backgroundColor: "#f3f3f3",
    borderBottom: "1px solid #222",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardId: {
    fontSize: 10,
    fontWeight: 700,
  },
  grid: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: "20%",
    height: 72,
    borderRight: "1px solid #222",
    borderBottom: "1px solid #222",
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  cellLastInRow: {
    borderRight: "0px",
  },
  cellText: {
    fontSize: 9,
    textAlign: "center",
  },
  freeCell: {
    backgroundColor: "#111",
    color: "white",
  },
  freeText: {
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 4,
  },
  freeLogo: {
    width: 46,
    height: 46,
    objectFit: "contain",
  },
  footerNote: {
    marginTop: 8,
    fontSize: 9,
    opacity: 0.75,
  },
});

function CardGrid({
  grid,
  logoUrl,
}: {
  grid: BingoGrid;
  logoUrl: string | null;
}) {
  const rows: BingoGrid[] = [
    grid.slice(0, 5),
    grid.slice(5, 10),
    grid.slice(10, 15),
    grid.slice(15, 20),
    grid.slice(20, 25),
  ];

  return (
    <View style={styles.grid}>
      {rows.map((r, ri) => (
        <View key={ri} style={styles.row}>
          {r.map((cell, ci) => {
            const isLast = ci === 4;
            const isFree = cell === null;

            // IMPORTANT: no null in style arrays (react-pdf TS types hate that)
            const cellStyles = [
              styles.cell,
              ...(isLast ? [styles.cellLastInRow] : []),
              ...(isFree ? [styles.freeCell] : []),
            ];

            return (
              <View key={ci} style={cellStyles}>
                {isFree ? (
                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.freeText}>JOE’S GROWS</Text>
                    {logoUrl ? (
                      <Image style={styles.freeLogo} src={logoUrl} />
                    ) : (
                      <Text style={[styles.cellText, { color: "white", opacity: 0.9 }]}>
                        FREE
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.cellText}>{String(cell)}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function BingoPackPdf({ pack }: { pack: BingoPack }) {
  return (
    <Document>
      {pack.cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          <View style={styles.header}>
            {pack.bannerUrl ? <Image style={styles.banner} src={pack.bannerUrl} /> : null}
            <View style={styles.headerInner}>
              <Text style={styles.title}>{pack.packTitle}</Text>
              <Text style={styles.sponsor}>Sponsor: {pack.sponsorName}</Text>
            </View>
          </View>

          <View style={styles.cardWrap}>
            <View style={styles.cardTop}>
              <Text style={styles.cardId}>Card ID: {card.id}</Text>
              <Text style={{ fontSize: 10, opacity: 0.8 }}>5×5 • Center is FREE</Text>
            </View>

            <CardGrid grid={card.grid} logoUrl={pack.logoUrl} />
          </View>

          <Text style={styles.footerNote}>
            Verification: Screenshot your card with your Card ID visible when you claim bingo.
          </Text>
        </Page>
      ))}
    </Document>
  );
}

export async function renderBingoPackPdf(pack: BingoPack): Promise<Buffer> {
  const buf = await renderToBuffer(<BingoPackPdf pack={pack} />);
  return buf as Buffer;
}
