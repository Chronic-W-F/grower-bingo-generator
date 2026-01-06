// pdf/SingleCardPdf.tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { ICON_MAP } from "@/lib/iconMap";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;   // can be "/banners/current.png" or full URL or data URI
  sponsorLogoUrl?: string;   // optional for center square
  card: BingoCard;
};

const CENTER_LABEL = "Joe’s Grows";

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 18,
    fontSize: 10,
    fontFamily: "Helvetica",
  },

  header: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  banner: {
    width: "100%",
    height: 70,
    objectFit: "cover",
  },

  headerTextWrap: {
    padding: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: 700,
  },

  subtitleRow: {
    marginTop: 4,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  subtitle: {
    fontSize: 10,
    color: "#374151",
  },

  grid: {
    display: "flex",
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 10,
    overflow: "hidden",
  },

  row: {
    display: "flex",
    flexDirection: "row",
  },

  cell: {
    width: "20%",
    aspectRatio: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111827",
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  cellLastInRow: {
    borderRightWidth: 0,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  cellText: {
    textAlign: "center",
    fontSize: 9,
    lineHeight: 1.15,
  },

  icon: {
    width: 22,
    height: 22,
    objectFit: "contain",
    marginBottom: 2,
  },

  footer: {
    marginTop: 10,
    fontSize: 9,
    color: "#6b7280",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function normKey(s: string) {
  return (s || "").trim().replace(/\s+/g, " ").replace(/[’‘]/g, "'").toLowerCase();
}

function isCenter(cell: string) {
  return normKey(cell) === normKey(CENTER_LABEL);
}

export default function SingleCardPdf(props: Props) {
  const title = props.title || "Bingo Card";
  const sponsorName = props.sponsorName || "";
  const bannerImageUrl = props.bannerImageUrl || "";
  const sponsorLogoUrl = props.sponsorLogoUrl || "";
  const card = props.card;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {bannerImageUrl ? <Image src={bannerImageUrl} style={styles.banner} /> : null}

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.subtitleRow}>
              <Text style={styles.subtitle}>Card ID: {card.id}</Text>
              <Text style={styles.subtitle}>{sponsorName ? `Sponsor: ${sponsorName}` : ""}</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          {card.grid.map((row, rIdx) => {
            const isLastRow = rIdx === card.grid.length - 1;

            return (
              <View key={rIdx} style={styles.row}>
                {row.map((cell, cIdx) => {
                  const isLastCol = cIdx === row.length - 1;

                  const cellStyles: any[] = [styles.cell];
                  if (isLastCol) cellStyles.push(styles.cellLastInRow);
                  if (isLastRow) cellStyles.push(styles.rowLast);

                  const cellNorm = normKey(cell);
                  const iconSrc = ICON_MAP?.[cellNorm];

                  const showSponsorLogo = isCenter(cell) && sponsorLogoUrl;

                  return (
                    <View key={cIdx} style={cellStyles}>
                      {showSponsorLogo ? (
                        <Image src={sponsorLogoUrl} style={styles.icon} />
                      ) : iconSrc ? (
                        <Image src={iconSrc} style={styles.icon} />
                      ) : null}

                      <Text style={styles.cellText}>{cell}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text>Grower Bingo</Text>
          <Text>Center is FREE</Text>
        </View>
      </Page>
    </Document>
  );
}
