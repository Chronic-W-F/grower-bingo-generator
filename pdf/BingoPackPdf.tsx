// pdf/BingoPackPdf.tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet, pdf } from "@react-pdf/renderer";
import type { BingoPack } from "@/lib/bingo";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica" },

  headerBar: {
    width: "100%",
    padding: 10,
    backgroundColor: "#111111",
    borderRadius: 6,
    marginBottom: 10,
  },
  headerTitle: { color: "#ffffff", fontSize: 14, fontWeight: 700 },
  headerSub: { color: "#d1d5db", marginTop: 2 },

  rowMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  metaText: { color: "#111827" },

  gridWrap: {
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 8,
    overflow: "hidden",
  },
  gridRow: { flexDirection: "row" },

  cell: {
    flex: 1,
    height: 58,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  cellLastCol: { borderRightWidth: 0 },
  cellLastRow: { borderBottomWidth: 0 },

  freeCell: { backgroundColor: "#111111" },
  freeText: { color: "#ffffff", fontWeight: 700 },

  cellText: { textAlign: "center" },

  footer: { marginTop: 8, color: "#374151" },
});

function BingoPackDoc({ pack }: { pack: BingoPack }) {
  return (
    <Document>
      {pack.cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          <View style={styles.headerBar}>
            <Text style={styles.headerTitle}>{pack.packTitle}</Text>
            <Text style={styles.headerSub}>Sponsor: {pack.sponsorName}</Text>
          </View>

          <View style={styles.rowMeta}>
            <Text style={styles.metaText}>Card ID: {card.id}</Text>
            <Text style={styles.metaText}>5×5 • Center is FREE</Text>
          </View>

          <View style={styles.gridWrap}>
            {card.grid.map((row, rIdx) => (
              <View key={rIdx} style={styles.gridRow}>
                {row.map((cell, cIdx) => {
                  const isFree = cell === "FREE";
                  // Build style array WITHOUT null/undefined
                  const cellStyle = ([
                    styles.cell,
                    cIdx === 4 ? styles.cellLastCol : null,
                    rIdx === 4 ? styles.cellLastRow : null,
                    isFree ? styles.freeCell : null,
                  ].filter(Boolean) as unknown) as any;

                  return (
                    <View key={cIdx} style={cellStyle}>
                      <Text style={isFree ? styles.freeText : styles.cellText}>
                        {isFree ? `${pack.sponsorName.toUpperCase()}\nFREE` : String(cell)}
                      </Text>
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

async function streamToBuffer(rs: any): Promise<Buffer> {
  // Handles ReadableStream or Node stream-ish outputs
  if (!rs) throw new Error("PDF renderer returned empty output.");

  // If Buffer already
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(rs)) return rs;

  // Uint8Array
  if (rs instanceof Uint8Array) return Buffer.from(rs);

  // ArrayBuffer
  if (rs instanceof ArrayBuffer) return Buffer.from(new Uint8Array(rs));

  // Web ReadableStream
  if (typeof rs.getReader === "function") {
    const reader = rs.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }

  // Node stream
  if (typeof rs.on === "function") {
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      rs.on("data", (d: any) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
      rs.on("end", () => resolve(Buffer.concat(chunks)));
      rs.on("error", reject);
    });
  }

  throw new Error("PDF renderer returned an unsupported type.");
}

export async function renderBingoPackPdf(pack: BingoPack): Promise<Buffer> {
  const doc = <BingoPackDoc pack={pack} />;
  const instance = pdf(doc) as any;

  // Different versions return different shapes; handle both
  const out = (await instance.toBuffer?.()) ?? (await instance.toStream?.());
  return await streamToBuffer(out);
}

export type { BingoPack };
