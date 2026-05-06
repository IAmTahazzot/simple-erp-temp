// app/[customerId].tsx
import {BaseLayout} from "@/components/core/BaseLayout";
import {MainHeader} from "@/components/core/MainHeader";
import {Select} from "@/components/ui/Select";
import {database} from "@/database";
import Customer from "@/database/models/Customer";
import Order, { OrderStatus } from "@/database/models/Order";
import Supplier from "@/database/models/Supplier";
import Product from "@/database/models/Product";
import Inventory from "@/database/models/Inventory";
import {Q} from "@nozbe/watermelondb";
import {withObservables} from "@nozbe/watermelondb/react";
import {
  Building2,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Package,
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
                          products,
                          inventory,
                        }: {
  orders: Order[];
  customers: Customer[];
  suppliers: Supplier[];
  products: any[];
  inventory: any[];
}) {
  const [period, setPeriod] = useState("today");
  const {t} = useCommonTranslation()

  const {revenue, orderCount, profit, receivable, payback} = useMemo(() => {
    const {start, end} = getPeriodRange(period);
    // Include order if it's within the time period AND it's either not canceled or it has a non-zero due balance
    const filtered = orders.filter(
      (o) => o.orderDate.getTime() >= start && o.orderDate.getTime() <= end && (o.status !== OrderStatus.CANCELED || (o.dueAmount !== 0 && o.dueAmount != null))
    );
    
    let revenue = 0;
    let profit = 0;
    
    for (const o of filtered) {
      revenue += o.totalAmount || 0;
      profit += o.profitAmount || 0;
    }
    
    let receivable = 0;
    let payback = 0;
    for (const o of orders) {
      // For general un-filtered overall dues: follow the exact same logic (skip 0-due canceled)
      if (o.status === OrderStatus.CANCELED && (o.dueAmount === 0 || o.dueAmount == null)) {
        continue;
      }
      const due = o.dueAmount || 0;
      if (due > 0) receivable += due;
      if (due < 0) payback += Math.abs(due);
    }
    
    return {revenue, orderCount: filtered.length, profit, receivable, payback};
  }, [orders, period]);

  const inventoryValue = useMemo(() => {
    const productCostMap = new Map<string, number>();
    for (const p of products) {
      productCostMap.set(p.id, p.cost || 0);
    }
    let total = 0;
    for (const inv of inventory) {
      // WatermelonDB relation properties or raw fallback
      const productId = inv.productId || (inv._raw && inv._raw.product_id);
      const cost = productCostMap.get(productId) || 0;
      total += cost * (inv.quantity || 0);
    }
    return total;
  }, [products, inventory]);

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
    <View style={s.container}>
      {/* ── Revenue Card ── */}
      <View style={s.revenueCardWrapper}>
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
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{
          marginBottom: 70,
        }}
      >
        <Text style={s.sectionTitle}>Inventory Inquiry</Text>
        <View style={s.grid}>
          <View style={[s.statCard,]}>
            <View style={[s.statIcon, {backgroundColor: "#f59e0b"}]}>
              <Package size={18} color="#fff"/>
            </View>
            <View>
              <Text style={[s.statValue, {color: "#b45309"}]}>
                ৳{inventoryValue >= 1000 ? `${(inventoryValue / 1000).toFixed(1)}k` : inventoryValue.toFixed(0)}
              </Text>
              <Text style={[s.statLabel, {color: "#b45309"}]}>{'Inventory Value'}</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>Income</Text>
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
        </View>

        <Text style={s.sectionTitle}>Others</Text>
        <View style={s.grid}>
          <View style={[s.statCard,]}>
            <View style={[s.statIcon, {backgroundColor: "#fee2e2"}]}>
              <TrendingUp size={18} color="#991b1b"/>
            </View>
            <View>
              <Text style={[s.statValue, {color: "#991b1b"}]}>
                ৳{receivable >= 1000 ? `${(receivable / 1000).toFixed(1)}k` : receivable.toFixed(0)}
              </Text>
              <Text style={[s.statLabel, {color: "#991b1b"}]}>{'Account Receivable'}</Text>
            </View>
          </View>

          {/*<View style={[s.statCard,]}>*/}
          {/*  <View style={[s.statIcon, {backgroundColor: "#c8ffed"}]}>*/}
          {/*    <TrendingDown size={18} color={"#06864a"}/>*/}
          {/*  </View>*/}
          {/*  <View>*/}
          {/*    <Text style={[s.statValue, {color: "#1b9952"}]}>*/}
          {/*      ৳{payback >= 1000 ? `${(payback / 1000).toFixed(1)}k` : payback.toFixed(0)}*/}
          {/*    </Text>*/}
          {/*    <Text style={[s.statLabel, {color: "#1b9952"}]}>{'Total Pay Back'}</Text>*/}
          {/*  </View>*/}
          {/*</View>*/}

          <View style={[s.statCard,]}>
            <View style={[s.statIcon, {backgroundColor: "#fee2e2"}]}>
              <TrendingDown size={18} color={"#991b1b"}/>
            </View>
            <View>
              <Text style={[s.statValue, {color: "#991b1b"}]}>0{/*{customers.length}*/}</Text>
              <Text style={[s.statLabel, {color: "#991b1b"}]}>{'Account Payable'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── withObservables ──────────────────────────────────────────────────────────
const EnhancedDashboardStats = withObservables([], () => ({
  orders: database.collections
    .get<Order>("orders")
    .query(Q.where("server_deleted_at", Q.eq(null)))
    .observeWithColumns(['total_amount', 'profit_amount', 'due_amount', 'status', 'order_date']),
  customers: database.collections
    .get<Customer>("customers")
    .query(Q.where("server_deleted_at", Q.eq(null)))
    .observe(),
  suppliers: database.collections
    .get<Supplier>("suppliers")
    .query(Q.where("server_deleted_at", Q.eq(null)))
    .observe(),
  products: database.collections
    .get<Product>("products")
    .query(Q.where("server_deleted_at", Q.eq(null)))
    .observeWithColumns(['cost']),
  inventory: database.collections
    .get<Inventory>("inventory")
    .query(Q.where("server_deleted_at", Q.eq(null)))
    .observeWithColumns(['quantity', 'product_id']),
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
  container: {
    flex: 1,
  },
  revenueCardWrapper: {
    padding: 16,
    paddingBottom: 0,
  },
  scroll: {
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "InterSemiBold",
    color: "#374151",
    paddingTop: 8,
    paddingBottom: 4,
    fontWeight: "600",
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
