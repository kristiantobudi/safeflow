interface SensorChartPointInterface {
  time: number;
  value: number;
}

interface Timezone {
  timeZone: string;
}

export function getIndonesiaZone(timeZone: Timezone) {
  switch (timeZone.timeZone) {
    case "Asia/Jakarta":
      return "WIB";
    case "Asia/Makassar":
      return "WITA";
    case "Asia/Jayapura":
      return "WIT";
    default:
      return "WIB";
  }
}

export function getTimeSpan(data: SensorChartPointInterface[]) {
  if (data.length < 2) return 0;
  return data[data.length - 1].time - data[0].time;
}

export function formatTimeLabel(value: number, span: number) {
  const date = new Date(value);

  // ≤ 6 jam → jam:menit
  if (span <= 6 * 60 * 60 * 1000) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ≤ 48 jam → hari + jam
  if (span <= 48 * 60 * 60 * 1000) {
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
    });
  }

  // > 48 jam (7 hari)
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}
