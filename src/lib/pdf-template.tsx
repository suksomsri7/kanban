import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  subtitle: { fontSize: 10, color: "#6b7280", marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: "#111827", marginTop: 20, marginBottom: 8, borderBottom: "1 solid #e5e7eb", paddingBottom: 4 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: "#f9fafb", borderRadius: 6, padding: 10, border: "1 solid #e5e7eb" },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  statLabel: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  table: { marginTop: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "1 solid #d1d5db", paddingVertical: 6, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #f3f4f6", paddingVertical: 5, paddingHorizontal: 4 },
  cellSm: { width: "10%", fontSize: 9 },
  cellMd: { width: "20%", fontSize: 9 },
  cellLg: { width: "25%", fontSize: 9 },
  cellXl: { width: "30%", fontSize: 9 },
  headerText: { fontSize: 8, fontWeight: "bold", color: "#374151", textTransform: "uppercase" as const },
  cellText: { fontSize: 9, color: "#374151" },
  redText: { fontSize: 9, color: "#dc2626" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" },
});

interface BoardRow {
  title: string;
  brand: string;
  members: number;
  totalCards: number;
  doneCards: number;
  progress: number;
}

interface OverdueRow {
  title: string;
  board: string;
  status: string;
  priority: string;
  dueDate: string;
  assignees: string;
}

interface Stats {
  totalCards: number;
  totalBrands: number;
  totalBoards: number;
  totalUsers: number;
  overdueCount: number;
}

interface ReportProps {
  boardRows: BoardRow[];
  overdueRows: OverdueRow[];
  stats: Stats;
  generatedBy: string;
}

export function ReportDocument({ boardRows, overdueRows, stats, generatedBy }: ReportProps) {
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Kanban Report</Text>
          <Text style={styles.subtitle}>Generated on {now} by {generatedBy}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalBrands}</Text>
            <Text style={styles.statLabel}>Brands</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalBoards}</Text>
            <Text style={styles.statLabel}>Boards</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalCards}</Text>
            <Text style={styles.statLabel}>Active Cards</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.overdueCount}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
        </View>

        {/* Board Summary */}
        <Text style={styles.sectionTitle}>Board Summary</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.cellXl}><Text style={styles.headerText}>Board</Text></View>
            <View style={styles.cellMd}><Text style={styles.headerText}>Brand</Text></View>
            <View style={styles.cellSm}><Text style={styles.headerText}>Members</Text></View>
            <View style={styles.cellSm}><Text style={styles.headerText}>Cards</Text></View>
            <View style={styles.cellSm}><Text style={styles.headerText}>Done</Text></View>
            <View style={styles.cellSm}><Text style={styles.headerText}>Progress</Text></View>
          </View>
          {boardRows.map((row, i) => (
            <View style={styles.tableRow} key={i}>
              <View style={styles.cellXl}><Text style={styles.cellText}>{row.title}</Text></View>
              <View style={styles.cellMd}><Text style={styles.cellText}>{row.brand}</Text></View>
              <View style={styles.cellSm}><Text style={styles.cellText}>{row.members}</Text></View>
              <View style={styles.cellSm}><Text style={styles.cellText}>{row.totalCards}</Text></View>
              <View style={styles.cellSm}><Text style={styles.cellText}>{row.doneCards}</Text></View>
              <View style={styles.cellSm}><Text style={styles.cellText}>{row.progress}%</Text></View>
            </View>
          ))}
        </View>

        {/* Overdue Tasks */}
        {overdueRows.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Overdue Tasks ({overdueRows.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={styles.cellXl}><Text style={styles.headerText}>Card</Text></View>
                <View style={styles.cellMd}><Text style={styles.headerText}>Board</Text></View>
                <View style={styles.cellSm}><Text style={styles.headerText}>Priority</Text></View>
                <View style={styles.cellMd}><Text style={styles.headerText}>Due Date</Text></View>
              </View>
              {overdueRows.map((row, i) => (
                <View style={styles.tableRow} key={i}>
                  <View style={styles.cellXl}><Text style={styles.cellText}>{row.title}</Text></View>
                  <View style={styles.cellMd}><Text style={styles.cellText}>{row.board}</Text></View>
                  <View style={styles.cellSm}><Text style={styles.cellText}>{row.priority}</Text></View>
                  <View style={styles.cellMd}><Text style={styles.redText}>{row.dueDate}</Text></View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Kanban System</Text>
          <Text>Page 1</Text>
        </View>
      </Page>
    </Document>
  );
}
