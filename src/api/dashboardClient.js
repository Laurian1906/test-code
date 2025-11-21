const DASHBOARD_WEBHOOK_URL =
  import.meta.env.VITE_DASHBOARD_WEBHOOK_URL ||
  "http://localhost:5678/webhook/dashboard-data";

const DEFAULT_METRICS = [
  "new_conversations_7d",
  "new_conversations_30d",
  "avg_severity",
  "avg_response_rate",
  "top_themes",
  "top_counties",
  "trend_categories",
  "county_severity",
  "recent_conversations",
];

export const DASHBOARD_DEFAULT_FILTERS = Object.freeze({
  category: null,
  subcategory: null,
  city: null,
  county: null,
  severity: null,
  status: null,
  date_from: null,
  date_to: null,
  trend_range_days: 30,
  date_range_days: null,
});

const normalizeFilters = (filters = {}) => {
  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  return {
    category: filters.category ?? null,
    subcategory: filters.subcategory ?? null,
    city: filters.city ?? null,
    county: filters.county ?? null,
    severity: filters.severity ?? null,
    status: filters.status ?? null,
    date_from: filters.date_from ?? null,
    date_to: filters.date_to ?? null,
    trend_range_days:
      toNumber(filters.trend_range_days) ??
      DASHBOARD_DEFAULT_FILTERS.trend_range_days,
    date_range_days: toNumber(filters.date_range_days),
  };
};

const buildRequestBody = (requestedMetrics, filters) => ({
  metrics:
    requestedMetrics && requestedMetrics.length > 0
      ? requestedMetrics
      : DEFAULT_METRICS,
  filters: normalizeFilters(filters),
});

export async function fetchDashboardMetrics(requestedMetrics, filters) {
  if (!DASHBOARD_WEBHOOK_URL) {
    throw new Error(
      "VITE_DASHBOARD_WEBHOOK_URL is not set. Please configure the webhook URL."
    );
  }

  const body = buildRequestBody(requestedMetrics, filters ?? {});

  const response = await fetch(DASHBOARD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Dashboard webhook error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();

  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }

  if (data?.metrics) {
    return data;
  }

  throw new Error("Dashboard webhook returned an unexpected response.");
}

export default {
  fetchDashboardMetrics,
};
