// pdf/BingoPackPdf.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";

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
  page: { padding: 28, fontSize: 11, fontFamily: "Helvetica" },

  headerWrap: { marginBottom: 10 },
  headerBar: {
    height: 38,
    backgroundColor: "#111",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  headerTitle: { color: "white", fontSize: 14, fontWeight: "bold" },
  headerSub: { color: "white", fontSize: 10, marginTop: 2 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  metaText: { color: "#222", fontSize: 9 },

  board: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
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
    height: 58,
    padding: 6,
  },
  lastCol: { borderRightWidth: 0 },
  lastRow: { borderBottomWidth: 0 },

  cellText: { textAlign: "center", fontSize: 9, color: "#111" },

  freeCell: { backgroundColor: "#111" },
  freeText: { color: "white", fontSize: 9, fontWeight: "bold" },
  freeSub: { color: "white", fontSize: 7, marginTop: 2 },

  verify: { marginTop: 10, fontSize: 8, color: "#444" },

  // optional logo inside FREE square if provided
  freeLogo: { width: 42, height: 42, marginBottom: 4 },
});

function BingoPackDoc({ pack }: { pack: BingoPack }) {
  return (
    <Document>
      {pack.cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          {/* Header */}
          <View style={styles.headerWrap}>
            <View style={styles.headerBar}>
              <Text style={styles.headerTitle}>{pack.packTitle}</Text>
              <Text style={styles.headerSub}>Sponsor: {pack.sponsorName}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Card ID: {card.id}</Text>
              <Text style={styles.metaText}>5×5 • Center is FREE</Text>
            </View>
          </View>

          {/* Board */}
          <View style={styles.board}>
            {card.grid.map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((cell, cIdx) => {
                  const isLastCol = cIdx === row.length - 1;
                  const isLastRow = rIdx === card.grid.length - 1;
                  const isFree = rIdx === 2 && cIdx === 2;

                  const cellStyle = [
                    styles.cell,
                    isLastCol ? styles.lastCol : ({} as any),
                    isLastRow ? styles.lastRow : ({} as any),
                    isFree ? styles.freeCell : ({} as any),
                  ];

                  return (
                    <View key={cIdx} style={cellStyle as any}>
                      {isFree ? (
                        <>
                          {pack.logoUrl ? (
                            <Image style={styles.freeLogo} src={pack.logoUrl} />
                          ) : null}
                          <Text style={styles.freeText}>{pack.sponsorName.toUpperCase()}</Text>
                          <Text style={styles.freeSub}>FREE</Text>
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

          <Text style={styles.verify}>
            Verification: Screenshot your card with your Card ID visible when you claim bingo.
          </Text>
        </Page>
      ))}
    </Document>
  );
}

/**
 * Converts whatever @react-pdf gives us into a Node Buffer.
 * Handles Buffer, Uint8Array, ArrayBuffer, and ReadableStream.
 */
async function toNodeBuffer(input: unknown): Promise<Buffer> {
  // Already Buffer
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) return input;

  // Uint8Array
  if (input instanceof Uint8Array) return Buffer.from(input);

  // ArrayBuffer
  if (input instanceof ArrayBuffer) return Buffer.from(new Uint8Array(input));

  // ReadableStream (Web)
  const maybeStream = input as any;
  if (maybeStream && typeof maybeStream.getReader === "function") {
    const reader = maybeStream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    return Buffer.from(merged);
  }

  // Fallback: try coercion
  return Buffer.from(String(input), "utf8");
}

export async function renderBingoPackPdf(pack: BingoPack): Promise<Buffer> {
  const doc = <BingoPackDoc pack={pack} />;
  const instance = pdf(doc);

  // @react-pdf/renderer may return Buffer OR ReadableStream depending on environment
  const out = await instance.toBuffer();
  return await toNodeBuffer(out);
}
