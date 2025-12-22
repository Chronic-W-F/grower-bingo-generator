import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, pdf } from "@react-pdf/renderer";

export type BingoCell = string;
export type BingoGrid = BingoCell[][];
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
    borderRadius: 8,
    padding: 10,
    color: "#fff",
  },
  headerTitle: { fontSize: 14, color: "#fff", marginBottom: 2 },
  headerSub: { fontSize: 10, color: "#d0d0d0" },

  metaRow: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#111",
  },

  gridWrap: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    overflow: "hidden",
  },
  row: { flexDirection: "row" },

  cell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    height: 70,
    padding: 6,
  },
  cellNoRight: { borderRightWidth: 0 },
  cellNoBottom: { borderBottomWidth: 0 },

  cellText: { textAlign: "center" },

  freeCell: { backgroundColor: "#111" },
  freeText: { color: "#fff", fontSize: 10, textAlign: "center" },

  footer: { marginTop: 10, fontSize: 9, color: "#555" },

  logo: { width: 28, height: 28, marginBottom: 4 },
  banner: { width: "100%", height: 50, objectFit: "cover", borderRadius: 8, marginBottom: 8 },
});

function BingoPackDoc({ pack }: { pack: BingoPack }) {
  return (
    <Document>
      {pack.cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          {pack.bannerUrl ? <Image src={pack.bannerUrl} style={styles.banner} /> : null}

          <View style={styles.headerWrap}>
            <View style={styles.headerBar}>
              <Text style={styles.headerTitle}>{pack.packTitle}</Text>
              <Text style={styles.headerSub}>Sponsor: {pack.sponsorName}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text>Card ID: {card.id}</Text>
              <Text>5×5 • Center is FREE</Text>
            </View>
          </View>

          <View style={styles.gridWrap}>
            {card.grid.map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((cell, cIdx) => {
                  const isLastCol = cIdx === row.length - 1;
                  const isLastRow = rIdx === card.grid.length - 1;
                  const isFree = cell === "FREE";

                  return (
                    <View
                      key={cIdx}
                      style={[
                        styles.cell,
                        isLastCol ? styles.cellNoRight : {},
                        isLastRow ? styles.cellNoBottom : {},
                        isFree ? styles.freeCell : {},
                      ]}
                    >
                      {isFree ? (
                        <>
                          {pack.logoUrl ? <Image src={pack.logoUrl} style={styles.logo} /> : null}
                          <Text style={styles.freeText}>{pack.sponsorName}</Text>
                          <Text style={styles.freeText}>FREE</Text>
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

          <Text style={styles.footer}>
            Verification: Screenshot your card with your Card ID visible when you claim bingo.
          </Text>
        </Page>
      ))}
    </Document>
  );
}

// Convert ReadableStream/Uint8Array/Buffer -> Buffer
async function toNodeBuffer(data: any): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;

  if (data instanceof Uint8Array) return Buffer.from(data);

  // ReadableStream (some @react-pdf versions)
  if (data && typeof data.getReader === "function") {
    const reader = data.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((u) => Buffer.from(u)));
  }

  // ArrayBuffer
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));

  throw new Error("PDF renderer returned an unsupported type.");
}

export async function renderBingoPackPdf(pack: BingoPack): Promise<Buffer> {
  const doc = <BingoPackDoc pack={pack} />;
  const instance = pdf(doc);

  // depending on version, this could be Buffer or ReadableStream
  const out = await instance.toBuffer();
  return await toNodeBuffer(out);
}
