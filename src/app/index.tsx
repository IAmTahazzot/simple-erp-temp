// app/index.tsx
import {BaseLayout} from "@/components/core/BaseLayout";
import {MainHeader} from "@/components/core/MainHeader";
import {Select} from "@/components/ui/Select";
import {database} from "@/database";
import Customer from "@/database/models/Customer";
import Order from "@/database/models/Order";
import Supplier from "@/database/models/Supplier";
import {Q} from "@nozbe/watermelondb";
import {withObservables} from "@nozbe/watermelondb/react";
import {
  Building2,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react-native";
import React, {useMemo, useState} from "react";
import {ScrollView, StyleSheet, Text, View} from "react-native";
import {useCommonTranslation} from '@/i18n/useTypedTranslation';


// ─── Time period helpers ──────────────────────────────────────────────────────
function getPeriodRange(period: string): { start: number; end: number } {
  const now = new Date();
  const start = new Date();
  const end = now.getTime();

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "this_week":
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "last_week": {
      const lastMon = new Date(now);
      lastMon.setDate(now.getDate() - now.getDay() - 7);
      lastMon.setHours(0, 0, 0, 0);
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastMon.getDate() + 6);
      lastSun.setHours(23, 59, 59, 999);
      return {start: lastMon.getTime(), end: lastSun.getTime()};
    }
    case "this_month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_month": {
      const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        start: firstLastMonth.getTime(),
        end: firstThisMonth.getTime() - 1,
      };
    }
    case "this_year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_year": {
      const firstThisYear = new Date(now.getFullYear(), 0, 1);
      const firstLastYear = new Date(now.getFullYear() - 1, 0, 1);
      return {
        start: firstLastYear.getTime(),
        end: firstThisYear.getTime() - 1,
      };
    }
    case "all_time":
    default:
      return {start: 0, end: end};
  }

  return {start: start.getTime(), end};
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardStats({
                          orders,
                          customers,
                          suppliers,
                        }: {
  orders: Order[];
  customers: Customer[];
  suppliers: Supplier[];
}) {
  const [period, setPeriod] = useState("today");
  const {t} = useCommonTranslation()

  const {revenue, orderCount, profit} = useMemo(() => {
    const {start, end} = getPeriodRange(period);
    const filtered = orders.filter(
      (o) => o.orderDate.getTime() >= start && o.orderDate.getTime() <= end,
    );
    const revenue = filtered.reduce((sum, o) => sum + o.totalAmount, 0);
    // Rough profit: revenue minus discounts (discountValue already factored into totalAmount)
    // For true profit you'd need product cost — using 30% margin estimate as placeholder
    const profit = revenue * 0.3;
    return {revenue, orderCount: filtered.length, profit};
  }, [orders, period]);

  const PERIOD_GROUPS = [
    {
      label: "Time Period",
      items: [
        {label: t('select.today'), value: "today"},
        {label: t('select.this_week'), value: "this_week"},
        {label: t("select.last_week"), value: "last_week"},
        {label: t('select.this_month'), value: "this_month"},
        {label: t('select.last_month'), value: "last_month"},
        {label: t('select.this_year'), value: "this_year"},
        {label: t("select.last_year"), value: "last_year"},
        {label: t('select.all_time'), value: "all_time"},
      ],
    },
  ];

  const [calendarVisible, setCalendarVisible] = useState(false)
  const [customRange, setCustomRange] = useState<{ start: number; end: number } | null>(null)

// Replace the useMemo range derivation:
  const {start, end} = customRange ?? getPeriodRange(period)

// Reset custom range when period changes:
  const handlePeriodChange = (val: string) => {
    setPeriod(val)
    setCustomRange(null)
  }

  return (
    <ScrollView
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Revenue Card ── */}
      <View style={s.revenueCard}>
        <View style={s.revenueTop}>
          <Select
            groups={PERIOD_GROUPS}
            value={period}
            onValueChange={setPeriod}
            triggerStyle={s.selectTrigger}
          />

        </View>
        <Text style={s.revenueLabel}>{t('totalRevenue')}</Text>
        <Text style={s.revenueAmount}>
          ৳ {revenue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        </Text>
      </View>

      {/* ── 2x2 Stat Grid ── */}
      <View style={s.grid}>
        <View style={[s.statCard,]}>
          <View style={[s.statIcon, {backgroundColor: "#0754fc"}]}>
            <ShoppingCart size={18} color="#fff"/>
          </View>
          <View>
            <Text style={[s.statValue, ]}>{orderCount}</Text>
            <Text style={[s.statLabel, {color: "#6b7280"}]}>{t('orders')}</Text>
          </View>
        </View>

        <View style={[s.statCard, ]}>
          <View style={[s.statIcon, {backgroundColor: "rgb(0 176 97)"}]}>
            <TrendingUp size={18} color="#fff"/>
          </View>
          <View>
            <Text style={[s.statValue,]}>
              ৳
              {profit >= 1000
                ? `${(profit / 1000).toFixed(1)}k`
                : profit.toFixed(0)}
            </Text>
            <Text style={[s.statLabel, {color: "#6b7280"}]}>{t('profit')}</Text>
          </View>
        </View>

        <View style={[s.statCard,]}>
          <View style={[s.statIcon, {backgroundColor: "#f3f4f6"}]}>
            <Users size={18} color="#111827"/>
          </View>
          <View>
            <Text style={[s.statValue, {color: "#111827"}]}>
              {customers.length}
            </Text>
            <Text style={[s.statLabel, {color: "#6b7280"}]}>{'Account Receivable'}</Text>
          </View>
        </View>

        <View style={[s.statCard,]}>
          <View style={[s.statIcon, {backgroundColor: "#f3f4f6"}]}>
            <Users size={18} color="#111827"/>
          </View>
          <View>
            <Text style={[s.statValue, {color: "#111827"}]}>
              {customers.length}
            </Text>
            <Text style={[s.statLabel, {color: "#6b7280"}]}>{'Account Payable'}</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

// ─── withObservables ──────────────────────────────────────────────────────────
const EnhancedDashboardStats = withObservables([], () => ({
  orders: database.collections
    .get<Order>("orders")
    .query(Q.where("server_deleted_at", Q.eq(null)))
    .observe(),
  customers: database.collections
    .get<Customer>("customers")
    .query(Q.where("server_deleted_at", Q.eq(null)))
    .observe(),
  suppliers: database.collections
    .get<Supplier>("suppliers")
    .query(Q.where("server_deleted_at", Q.eq(null)))
    .observe(),
}))(DashboardStats);

export default function Dashboard() {
  return (
    <BaseLayout head={<MainHeader/>} backgroundColor={'#F8F8F8'}>
      <EnhancedDashboardStats/>
    </BaseLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 16,
  },
  revenueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    gap: 6,
  },
  revenueTop: {
    marginBottom: 8,
    alignSelf: "flex-start",
    minWidth: 160,
  },
  selectTrigger: {
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    height: 36,
  },
  revenueLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: "InterMedium",
    marginTop: 4,
  },
  revenueAmount: {
    fontSize: 42,
    fontFamily: "InterBold",
    color: "#111827",
    letterSpacing: -1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    padding: 12,
    shadowRadius: 8,
    backgroundColor: 'white',
    minHeight: 165,
    justifyContent: 'space-between'
  },
  
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontFamily: "InterBold",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "InterMedium",
  },
});
