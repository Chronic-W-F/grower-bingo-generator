// pdf/BingoPackPdf.tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { ICON_MAP } from "@/lib/iconMap";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  cards: BingoCard[];
  gridSize?: number;

  // Optional (weekly style)
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;
  sponsorLogoUrl?: string;
  backgroundImageUrl?: string;

  // REQUIRED if you use "/icons/..." or any "/public" path:
  // e.g. "https://grower-bingo-generator.vercel.app"
  assetBaseUrl?: string;
};

const PAGE_PADDING = 36;
const CONTENT_WIDTH = 540;
const CONTENT_HEIGHT = 720;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function resolveAsset(urlOrPath?: string, assetBaseUrl?: string) {
  if (!urlOrPath) return null;
  const v = urlOrPath.trim();
  if (!v) return null;

  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:")) return v;

  // /public path needs base url to become absolute for server PDF rendering
  if (v.startsWith("/")) {
    if (!assetBaseUrl) return null;
    return `${assetBaseUrl}${v}`;
  }

  return null;
}

// Optional: allow safe emoji if you ever put emoji values in ICON_MAP
function getPrintableEmoji(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  if (v.includes("/") || v.includes(".") || v.startsWith("http")) return null;

  // block “mystery characters”
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(v)) return null;

  if (/[\p{L}\p{N}]/u.test(v)) return null;

  if (v.length <= 4) return v;

  return null;
}

export default function BingoPackPdf({
  cards,
  gridSize: gridSizeProp,
  title = "Grower Bingo",
  sponsorName,
  bannerImageUrl,
  sponsorLogoUrl,
  backgroundImageUrl,
  assetBaseUrl,
}: Props) {
  const e = React.createElement;

  const inferred = cards?.[0]?.grid?.length ?? 5;
  const gridSize = (gridSizeProp ?? inferred) as number;

  const cellSize = clamp(Math.floor(CONTENT_WIDTH / gridSize), 70, 110);
  const gridWidth = cellSize * gridSize;
  const gridHeight = cellSize * gridSize;

  const topPad = Math.max(0, Math.floor((CONTENT_HEIGHT - 120 - gridHeight) / 2));

  const styles = StyleSheet.create({
    page: {
      paddingTop: PAGE_PADDING,
      paddingBottom: PAGE_PADDING,
      paddingLeft: PAGE_PADDING,
      paddingRight: PAGE_PADDING,
      fontSize: 10,
      fontFamily: "Helvetica",
      position: "relative",
    },

    pageBg: {
      position: "absolute",
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      opacity: 0.18,
    },

    header: {
      width: "100%",
      alignItems: "center",
      marginBottom: 10,
    },

    bannerWrap: {
      width: "100%",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 10,
    },

    banner: {
      width: "100%",
      height: 70,
      objectFit: "cover",
    },

    headerRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    titleBlock: {
      flexGrow: 1,
      paddingRight: 10,
    },

    title: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 2,
    },

    sub: {
      fontSize: 10,
      color: "#444",
    },

    sponsor: {
      fontSize: 10,
      color: "#111",
      marginTop: 2,
    },

    sponsorLogo: {
      width: 54,
      height: 54,
      objectFit: "contain",
    },

    spacer: {
      height: topPad,
    },

    gridWrap: {
      width: gridWidth,
      height: gridHeight,
      alignSelf: "center",
      borderWidth: 2,
      borderColor: "#000",
      backgroundColor: "rgba(255,255,255,0.88)",
    },

    row: {
      flexDirection: "row",
      width: gridWidth,
