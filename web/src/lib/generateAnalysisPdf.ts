import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PlanFeatures } from "./feature-gate";

interface PdfData {
  projectName: string;
  businessInput: any;
  exec: any;
  psycho: any;
  offer: any;
  plan: any;
  strategicLocations: any[];
  blindSpots: any[];
  competitorAnalysis: any;
  commuteFlow: any;
  trafficItems: any[];
  economicData: any[];
  decisionData: any[];
  cachedScores: Record<string, any>;
  features: PlanFeatures;
}

const NAVY: [number, number, number] = [15, 23, 42];
const AMBER: [number, number, number] = [245, 158, 11];
const GREEN: [number, number, number] = [34, 197, 94];
const RED: [number, number, number] = [239, 68, 68];
const GRAY: [number, number, number] = [100, 116, 139];
const BLUE: [number, number, number] = [59, 130, 246];

const stripEmoji = (str: string) =>
  str.replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27BF}|\u{FE00}-\u{FEFF}|\u{1F900}-\u{1F9FF}|\u{200D}|\u{20E3}|\u{E0020}-\u{E007F}]/gu, "").trim();

function addHeader(doc: jsPDF, text: string, y: number): number {
  doc.setFillColor(...NAVY);
  doc.rect(0, y, doc.internal.pageSize.width, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(stripEmoji(text), 14, y + 7);
  doc.setTextColor(0, 0, 0);
  return y + 16;
}

function addSubHeader(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(stripEmoji(text), 14, y);
  doc.setTextColor(0, 0, 0);
  return y + 6;
}

function addParagraph(doc: jsPDF, text: string, y: number, maxWidth = 180): number {
  if (!text) return y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(stripEmoji(text), maxWidth);
  doc.text(lines, 14, y);
  doc.setTextColor(0, 0, 0);
  return y + lines.length * 4.5 + 2;
}

function checkPage(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > doc.internal.pageSize.height - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

function addBulletList(doc: jsPDF, items: string[], y: number, maxWidth = 175): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  for (const item of items) {
    y = checkPage(doc, y, 10);
    const lines = doc.splitTextToSize(`- ${stripEmoji(item)}`, maxWidth);
    doc.text(lines, 16, y);
    y += lines.length * 4.5 + 1;
  }
  doc.setTextColor(0, 0, 0);
  return y + 2;
}

function addKeyValue(doc: jsPDF, label: string, value: string, y: number): number {
  y = checkPage(doc, y, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(stripEmoji(label), 14, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.text(stripEmoji(value), 65, y);
  doc.setTextColor(0, 0, 0);
  return y + 5.5;
}

function fmtRp(n: number | null | undefined): string {
  if (!n && n !== 0) return "-";
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function generateAnalysisPdf(data: PdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.width;
  const feat = data.features;
  let y = 0;

  // ===== COVER PAGE =====
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("LAPORAN ANALISIS PASAR", pageW / 2, 28, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(...AMBER);
  doc.text(stripEmoji(data.projectName), pageW / 2, 40, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`Digenerate: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, pageW / 2, 52, { align: "center" });

  y = 70;

  // ===== PRODUCT INFO =====
  if (data.businessInput) {
    const bi = data.businessInput;
    y = addHeader(doc, "INFORMASI PRODUK & TARGET", y);

    const infoRows: string[][] = [
      ["Nama Produk", bi.product_name || "-"],
      ["Kategori", bi.product_category || "-"],
      ["Deskripsi", bi.product_description || "-"],
      ["Lokasi", `${bi.city}, ${bi.province}`],
      ["Kecamatan", (bi.districts || []).join(", ")],
    ];

    const genderLabel = bi.target_gender === "all" ? "Semua" : bi.target_gender === "male" ? "Pria" : bi.target_gender === "female" ? "Wanita" : bi.target_gender || "-";
    infoRows.push(["Target Gender", genderLabel]);
    if (bi.target_age_min || bi.target_age_max) infoRows.push(["Target Usia", `${bi.target_age_min || "?"}–${bi.target_age_max || "?"} tahun`]);
    if (bi.target_segments?.length) infoRows.push(["Segmen Target", bi.target_segments.join(", ")]);

    autoTable(doc, {
      startY: y, head: [], body: infoRows, theme: "plain",
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, textColor: GRAY }, 1: { cellWidth: 140 } },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ===== 1. KEPUTUSAN BISNIS (GO / NO-GO) =====
  if (data.decisionData.length > 0) {
    y = checkPage(doc, y, 50);
    y = addHeader(doc, "KEPUTUSAN BISNIS", y);

    for (const dec of data.decisionData) {
      y = checkPage(doc, y, 40);

      // Decision badge
      const decColor = dec.decision === "GO" ? GREEN : dec.decision === "NO" ? RED : AMBER;
      doc.setFillColor(...decColor);
      doc.roundedRect(14, y, 30, 10, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(dec.decision || "N/A", 29, y + 7, { align: "center" });

      // Market score
      doc.setFillColor(...NAVY);
      doc.roundedRect(48, y, 25, 10, 2, 2, "F");
      doc.setFontSize(10);
      doc.text(`${Number(dec.market_score || 0).toFixed(1)}/10`, 60.5, y + 7, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text(`Kec. ${stripEmoji(dec.district)}`, 78, y + 7);
      doc.setTextColor(0, 0, 0);
      y += 14;

      if (dec.decision_reason) {
        y = addParagraph(doc, `Alasan: ${dec.decision_reason}`, y);
      }
      if (dec.insight_summary) {
        y = addParagraph(doc, dec.insight_summary, y);
      }

      // Breakdown skor (Basic+)
      if (feat.show_breakdown) {
        y = checkPage(doc, y, 25);
        const scoreRows: string[][] = [
          ["Populasi", `${Number(dec.population_score || 0).toFixed(1)}`],
          ["Traffic", `${Number(dec.traffic_score || 0).toFixed(1)}`],
          ["Income", `${Number(dec.income_score || 0).toFixed(1)}`],
          ["Competitor Gap", `${Number(dec.competitor_gap_score || 0).toFixed(1)}`],
          ["Density", `${Number(dec.density_score || 0).toFixed(1)}`],
        ];
        autoTable(doc, {
          startY: y, head: [["Metrik", "Skor"]],
          body: scoreRows, theme: "striped",
          headStyles: { fillColor: NAVY, fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 25, halign: "center" } },
          margin: { left: 14, right: 14 },
          tableWidth: 80,
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }

      // Strengths/Weaknesses (Basic+)
      if (feat.show_breakdown) {
        if (dec.insight_strength) {
          y = checkPage(doc, y, 10);
          doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...GREEN);
          doc.text("Kekuatan:", 14, y); doc.setTextColor(0, 0, 0); y += 5;
          y = addParagraph(doc, dec.insight_strength, y);
        }
        if (dec.insight_weakness) {
          y = checkPage(doc, y, 10);
          doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...RED);
          doc.text("Kelemahan:", 14, y); doc.setTextColor(0, 0, 0); y += 5;
          y = addParagraph(doc, dec.insight_weakness, y);
        }
      }

      // Trade-off (Growth+)
      if (feat.bep_detail && dec.tradeoff_label) {
        y = checkPage(doc, y, 10);
        y = addSubHeader(doc, "Trade-off Analysis", y);
        y = addParagraph(doc, `${dec.tradeoff_label}: ${dec.tradeoff_detail || ""}`, y);
      }

      // Recommendation (Growth+)
      if (feat.bep_detail && dec.insight_recommendation) {
        y = addParagraph(doc, `Rekomendasi: ${dec.insight_recommendation}`, y);
      }

      y += 4;
    }
  }

  // ===== 2. POTENSI EKONOMI =====
  if (data.economicData.length > 0) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "POTENSI EKONOMI", y);

    for (const eco of data.economicData) {
      y = checkPage(doc, y, 50);
      y = addSubHeader(doc, `Kec. ${stripEmoji(eco.district)}`, y);

      // Always visible: omzet range, customer, BEP, pricing
      y = addKeyValue(doc, "Estimasi Omzet:", `${fmtRp(Number(eco.omzet_konservatif))} - ${fmtRp(Number(eco.omzet_optimistis))} /bulan`, y);
      y = addKeyValue(doc, "Customer/hari:", `${eco.estimated_daily_customers || "-"} orang`, y);
      y = addKeyValue(doc, "BEP:", eco.bep_days ? (eco.bep_days < 30 ? `${eco.bep_days} hari` : `${(eco.bep_days / 30).toFixed(1)} bulan`) : "-", y);
      y = addKeyValue(doc, "Rekomendasi Harga:", `${fmtRp(eco.recommended_price_min)} - ${fmtRp(eco.recommended_price_max)}`, y);
      y = addKeyValue(doc, "Strategi Harga:", eco.pricing_strategy || "-", y);

      // 3-bar omzet (Basic+)
      if (feat.omzet_range) {
        y = checkPage(doc, y, 20);
        const omzetRows: string[][] = [
          ["Konservatif", fmtRp(Number(eco.omzet_konservatif))],
          ["Moderat", fmtRp(Number(eco.omzet_moderat))],
          ["Optimistis", fmtRp(Number(eco.omzet_optimistis))],
        ];
        autoTable(doc, {
          startY: y, head: [["Skenario", "Omzet/bulan"]],
          body: omzetRows, theme: "striped",
          headStyles: { fillColor: AMBER, fontSize: 8, textColor: [255, 255, 255] },
          styles: { fontSize: 8, cellPadding: 2 },
          margin: { left: 14, right: 14 }, tableWidth: 100,
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }

      // Population & area info (Basic+)
      if (feat.show_breakdown) {
        y = checkPage(doc, y, 15);
        y = addKeyValue(doc, "Total Populasi:", `${Number(eco.population_total || 0).toLocaleString("id-ID")} jiwa`, y);
        y = addKeyValue(doc, "Jumlah Kelurahan:", `${eco.village_count || "-"} (Urban: ${eco.urban_village_count || 0}, Rural: ${eco.rural_village_count || 0})`, y);
        y = addKeyValue(doc, "Tipe Lokasi:", eco.location_type || "-", y);
        y = addKeyValue(doc, "Level Daya Beli:", eco.expenditure_level || "-", y);
      }

      // Profit breakdown (Growth+)
      if (feat.bep_detail) {
        y = checkPage(doc, y, 30);
        y = addSubHeader(doc, "Detail Profit & Modal", y);
        y = addKeyValue(doc, "Revenue Bulanan:", fmtRp(Number(eco.estimated_monthly_revenue)), y);
        y = addKeyValue(doc, "Biaya Bulanan:", fmtRp(Number(eco.estimated_monthly_cost)), y);
        y = addKeyValue(doc, "Profit Bulanan:", fmtRp(Number(eco.estimated_monthly_profit)), y);
        y = addKeyValue(doc, "Margin:", `${Number(eco.estimated_margin_pct || 0).toFixed(1)}%`, y);
        y = addKeyValue(doc, "Modal Awal:", fmtRp(Number(eco.initial_capital)), y);
      }

      // Raw data (Pro only)
      if (feat.show_raw_data) {
        y = checkPage(doc, y, 30);
        y = addSubHeader(doc, "Detail Perhitungan Engine", y);
        y = addKeyValue(doc, "Top-down:", fmtRp(Number(eco.omzet_topdown)), y);
        y = addKeyValue(doc, "Bottom-up:", fmtRp(Number(eco.omzet_bottomup)), y);
        y = addKeyValue(doc, "Target Ratio:", `${Number(eco.target_ratio || 0).toFixed(4)}`, y);
        y = addKeyValue(doc, "Category Spending:", `${Number(eco.category_spending_ratio || 0).toFixed(4)}`, y);
        y = addKeyValue(doc, "Conversion Rate:", `${Number(eco.conversion_rate || 0).toFixed(4)}`, y);
        y = addKeyValue(doc, "Competitor Factor:", `${Number(eco.competitor_quality_factor || 0).toFixed(2)}`, y);
        y = addKeyValue(doc, "Income Multiplier:", `${Number(eco.income_multiplier || 0).toFixed(2)}`, y);
        y = addKeyValue(doc, "Capture Rate:", `${Number(eco.capture_rate || 0).toFixed(4)}`, y);
        y = addKeyValue(doc, "Mobility Rate:", `${Number(eco.mobility_rate || 0).toFixed(2)}`, y);
        y = addKeyValue(doc, "Expenditure Avg:", fmtRp(Number(eco.city_expenditure_avg)), y);
      }

      y += 6;
    }
  }

  // ===== 3. RINGKASAN EKSEKUTIF =====
  if (data.exec) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "RINGKASAN EKSEKUTIF", y);

    // Score box
    doc.setFillColor(...AMBER);
    doc.roundedRect(14, y, 40, 16, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(`${data.exec.recommendation_score}/10`, 34, y + 11, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.text("Skor Rekomendasi", 60, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const scoreDesc = data.exec.recommendation_score >= 8 ? "Sangat layak untuk dieksekusi" : data.exec.recommendation_score >= 6 ? "Layak dengan catatan" : "Perlu pertimbangan ulang";
    doc.text(scoreDesc, 60, y + 11);
    y += 22;

    y = addSubHeader(doc, "Peluang Utama", y);
    y = addParagraph(doc, data.exec.main_opportunity, y);
    y = addSubHeader(doc, "Ancaman Terbesar", y);
    y = addParagraph(doc, data.exec.main_threat, y);

    if (data.exec.urgent_actions?.length) {
      y = checkPage(doc, y, 20);
      y = addSubHeader(doc, "Tindakan Darurat", y);
      y = addBulletList(doc, data.exec.urgent_actions.map((a: string) => stripEmoji(a)), y);
    }
  }

  // ===== 4. LOKASI STRATEGIS =====
  if (data.strategicLocations.length > 0) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "LOKASI STRATEGIS", y);

    const locRows = data.strategicLocations.map((loc) => [
      `#${loc.rank}`, stripEmoji(loc.location_name), loc.district || "-", `${loc.score || 0}/10`,
    ]);

    autoTable(doc, {
      startY: y, head: [["Rank", "Lokasi", "Kecamatan", "Skor"]],
      body: locRows, theme: "striped",
      headStyles: { fillColor: NAVY, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 15 }, 3: { cellWidth: 20, halign: "center" } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Detail per location
    for (const loc of data.strategicLocations) {
      y = checkPage(doc, y, 40);
      y = addSubHeader(doc, `#${loc.rank} ${stripEmoji(loc.location_name)} (${loc.score}/10)`, y);

      if (loc.reasoning) y = addParagraph(doc, `Alasan: ${loc.reasoning}`, y);
      if (loc.location_criteria) y = addParagraph(doc, `Kriteria: ${loc.location_criteria}`, y);
      if (loc.parking_ease) y = addParagraph(doc, `Parkir: ${loc.parking_ease}`, y);
      if (loc.traffic_summary) y = addParagraph(doc, `Traffic: ${loc.traffic_summary}`, y);

      // Score breakdown per location (Basic+)
      if (feat.show_breakdown && data.cachedScores[loc.location_name]) {
        const sb = data.cachedScores[loc.location_name];
        y = checkPage(doc, y, 20);
        const sbRows: string[][] = [
          ["Kompetitor Density", `${sb.competitor_density?.score?.toFixed(1) || "0"}`],
          ["Rating Gap", `${sb.rating_gap?.score?.toFixed(1) || "0"}`],
          ["Traffic Level", `${sb.traffic_level?.score?.toFixed(1) || "0"}`],
          ["Landmark Potential", `${sb.landmark_potential?.score?.toFixed(1) || "0"}`],
          ["Total", `${sb.total_score?.toFixed(1) || "0"}`],
        ];
        autoTable(doc, {
          startY: y, head: [["Metrik Lokasi", "Skor"]],
          body: sbRows, theme: "grid",
          headStyles: { fillColor: BLUE, fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          margin: { left: 14 }, tableWidth: 80,
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        // Competitor list (Basic+)
        if (feat.competitor_detail && sb.competitor_density?.competitors?.length) {
          y = checkPage(doc, y, 15);
          const compRows = sb.competitor_density.competitors.slice(0, 10).map((c: any) => [
            stripEmoji(c.name || ""), `${c.rating || "-"}`, `${c.review_count || "-"}`, `${c.distance_meters || "-"}m`,
          ]);
          autoTable(doc, {
            startY: y, head: [["Kompetitor", "Rating", "Review", "Jarak"]],
            body: compRows, theme: "striped",
            headStyles: { fillColor: NAVY, fontSize: 7 },
            styles: { fontSize: 7, cellPadding: 2 },
            margin: { left: 14, right: 14 },
          });
          y = (doc as any).lastAutoTable.finalY + 4;
        }
      }

      if (loc.weaknesses?.length) {
        y = checkPage(doc, y, 15);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...RED);
        doc.text("Kelemahan:", 14, y); doc.setTextColor(0, 0, 0); y += 5;
        y = addBulletList(doc, loc.weaknesses.map(stripEmoji), y);
      }
      if (loc.innovations?.length) {
        y = checkPage(doc, y, 15);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...GREEN);
        doc.text("Inovasi:", 14, y); doc.setTextColor(0, 0, 0); y += 5;
        y = addBulletList(doc, loc.innovations.map(stripEmoji), y);
      }
      y += 4;
    }
  }

  // ===== 5. BLIND SPOTS =====
  if (data.blindSpots.length > 0) {
    y = checkPage(doc, y, 30);
    y = addHeader(doc, "ZONA TERLARANG", y);
    for (const bs of data.blindSpots) {
      y = checkPage(doc, y, 12);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...RED);
      doc.text(`X ${stripEmoji(bs.location_name)}`, 14, y); doc.setTextColor(0, 0, 0); y += 5;
      if (bs.blind_spot_reason) y = addParagraph(doc, bs.blind_spot_reason, y);
    }
  }

  // ===== 6. PROFIL PASAR & PSIKOGRAFI =====
  if (data.psycho) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "PROFIL PASAR & PSIKOGRAFI", y);

    if (data.psycho.buying_window_lunch || data.psycho.buying_window_evening) {
      y = addSubHeader(doc, "Window Waktu Beli", y);
      if (data.psycho.buying_window_lunch) y = addParagraph(doc, `Siang (${data.psycho.buying_window_lunch.time}): ${data.psycho.buying_window_lunch.description}`, y);
      if (data.psycho.buying_window_evening) y = addParagraph(doc, `Malam (${data.psycho.buying_window_evening.time}): ${data.psycho.buying_window_evening.description}`, y);
    }

    if (data.psycho.primary_trigger) {
      y = checkPage(doc, y, 15);
      y = addSubHeader(doc, "Pemicu Beli Utama", y);
      y = addParagraph(doc, `"${data.psycho.primary_trigger.quote}"`, y);
      y = addParagraph(doc, data.psycho.primary_trigger.explanation, y);
    }

    if (data.psycho.pain_points?.length) {
      y = checkPage(doc, y, 15);
      y = addSubHeader(doc, "Masalah Utama Target Market", y);
      y = addBulletList(doc, data.psycho.pain_points.map(stripEmoji), y);
    }

    if (data.psycho.segments?.length) {
      y = checkPage(doc, y, 15);
      y = addSubHeader(doc, "Segmentasi Psikologis", y);
      const segRows = data.psycho.segments.map((s: any) => [
        stripEmoji(`${s.emoji || ""} ${s.name}`), stripEmoji(s.trigger || ""), s.peak_time || "",
      ]);
      autoTable(doc, {
        startY: y, head: [["Segmen", "Pemicu", "Peak Time"]],
        body: segRows, theme: "striped",
        headStyles: { fillColor: NAVY, fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ===== 7. PENAWARAN TAK TERTOLAK =====
  if (data.offer) {
    y = checkPage(doc, y, 30);
    y = addHeader(doc, "PENAWARAN TAK TERTOLAK", y);
    y = addSubHeader(doc, "Versi Spanduk", y);
    y = addParagraph(doc, data.offer.banner, y);
    y = addSubHeader(doc, "Versi WhatsApp", y);
    y = addParagraph(doc, data.offer.whatsapp, y);
  }

  // ===== 8. DATA KOMPETITOR =====
  if (feat.competitor_detail && data.competitorAnalysis?.districts?.length) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "DATA KOMPETITOR PER KECAMATAN", y);

    for (const d of data.competitorAnalysis.districts) {
      y = checkPage(doc, y, 20);
      y = addSubHeader(doc, `Kecamatan ${stripEmoji(d.district)}`, y);

      if (d.competitors?.length) {
        const compRows = d.competitors.map((c: any) => [
          stripEmoji(c.name || ""), stripEmoji(c.address || "-"), c.rating ? `${c.rating}` : "-", c.totalReviews ? `${c.totalReviews}` : "-",
        ]);
        autoTable(doc, {
          startY: y, head: [["Nama", "Alamat", "Rating", "Review"]],
          body: compRows, theme: "striped",
          headStyles: { fillColor: NAVY, fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 75 } },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }
    }
  }

  // ===== 9. TRAFFIC DATA =====
  if (data.trafficItems?.length) {
    y = checkPage(doc, y, 30);
    y = addHeader(doc, "DATA TRAFFIC HARIAN", y);

    for (const t of data.trafficItems) {
      y = checkPage(doc, y, 25);
      y = addSubHeader(doc, `Kec. ${stripEmoji(t.district)} — ${stripEmoji((t.overallTrafficLevel || "").toUpperCase())}`, y);
      if (t.avgDurationMinutes != null) y = addParagraph(doc, `Durasi rata-rata (5km): ${t.avgDurationMinutes} menit`, y);
      if (t.congestionPercent != null && t.congestionPercent > 0) y = addParagraph(doc, `Kemacetan vs normal: ${t.congestionPercent}%`, y);
      if (t.speedBreakdown) y = addParagraph(doc, `Kondisi jalan: Lancar ${t.speedBreakdown.normalPct}% | Lambat ${t.speedBreakdown.slowPct}% | Macet ${t.speedBreakdown.jamPct}%`, y);
      if (t.peakHours?.length) {
        const phText = t.peakHours.map((ph: any) => `${ph.time} (${ph.level})`).join(", ");
        y = addParagraph(doc, `Jam sibuk: ${phText}`, y);
      }
      y += 2;
    }
  }

  // ===== 10. RENCANA AKSI =====
  if (data.plan) {
    doc.addPage();
    y = 20;
    y = addHeader(doc, "RENCANA AKSI", y);

    const maxActions = feat.action_plan_count;

    if (data.plan.daily_actions?.length) {
      y = addSubHeader(doc, "Aksi Harian", y);
      const actions = data.plan.daily_actions.slice(0, maxActions);
      for (const da of actions) {
        y = checkPage(doc, y, 15);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...NAVY);
        doc.text(stripEmoji(da.day || ""), 14, y); doc.setTextColor(0, 0, 0); y += 5;
        if (da.tasks?.length) y = addBulletList(doc, da.tasks.map(stripEmoji), y);
      }
    }

    if (data.plan.weekly_kpi?.length) {
      const kpis = data.plan.weekly_kpi.slice(0, maxActions);
      y = checkPage(doc, y, 15);
      y = addSubHeader(doc, "KPI Mingguan", y);
      const kpiRows = kpis.map((k: any) => [stripEmoji(k.metric || ""), stripEmoji(k.target || "")]);
      autoTable(doc, {
        startY: y, head: [["Metrik", "Target"]],
        body: kpiRows, theme: "striped",
        headStyles: { fillColor: NAVY, fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (data.plan.week1?.length) { y = addSubHeader(doc, "Minggu 1", y); y = addBulletList(doc, data.plan.week1.map(stripEmoji), y); }
    if (data.plan.week2?.length) { y = addSubHeader(doc, "Minggu 2", y); y = addBulletList(doc, data.plan.week2.map(stripEmoji), y); }
    if (data.plan.month1?.length) { y = addSubHeader(doc, "Bulan 1", y); y = addBulletList(doc, data.plan.month1.map(stripEmoji), y); }
  }

  // ===== DISCLAIMER =====
  doc.addPage();
  y = 20;
  y = addHeader(doc, "DISCLAIMER", y);
  y = addParagraph(doc, "Semua angka dan estimasi dalam laporan ini bersifat perkiraan berdasarkan data publik yang tersedia dari BPS (Badan Pusat Statistik) dan Google Maps. Hasil analisis bukan merupakan jaminan finansial atau kepastian keberhasilan bisnis. Keputusan bisnis akhir sepenuhnya menjadi tanggung jawab pengguna.", y);
  y = addParagraph(doc, `Parameter terakhir dikalibrasi: April 2026. Sumber data: BPS Susenas 2024, Google Places API.`, y);
  y += 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("Laporan ini dihasilkan oleh MarketIntel - Platform Analisis Pasar Berbasis AI", pageW / 2, y, { align: "center" });

  // ===== FOOTER on all pages =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${stripEmoji(data.projectName)} — Halaman ${i}/${totalPages}`, pageW / 2, doc.internal.pageSize.height - 8, { align: "center" });
  }

  doc.save(`Analisis_${data.projectName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}
