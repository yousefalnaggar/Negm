import "server-only";
import { cache } from "react";
import { db } from "./db";

const DEFAULTS = { storeNameAr: "بيت", storeNameEn: "Bayt", phone: "", shippingFee: 15000 };

export const getSettings = cache(async () => {
  return (await db.setting.findUnique({ where: { id: 1 } })) ?? { id: 1, ...DEFAULTS };
});
