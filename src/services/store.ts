import * as React from "react";
import { toast } from "sonner";

import { TENANT_ID, getAiDataset, getDataset } from "@/types";

/**
 * Mutable in-memory store on top of the deterministic demo dataset.
 * Every module reads/writes through here, so CRUD in one module is visible in
 * the overview grids, timelines and lifecycle view immediately. Swapping this
 * for API calls later does not touch UI code.
 */

export type Row = Record<string, unknown> & { id: string };
export type CollectionKey = keyof Collections;

export interface Collections {
  tenants: Row[];
  locations: Row[];
  users: Row[];
  trainers: Row[];
  services: Row[];
  plans: Row[];
  members: Row[];
  leads: Row[];
  calls: Row[];
  trials: Row[];
  offers: Row[];
  coupons: Row[];
  classes: Row[];
  bookings: Row[];
  assessments: Row[];
  programs: Row[];
  nutritionPlans: Row[];
  products: Row[];
  invoices: Row[];
  complaints: Row[];
  campaigns: Row[];
  communications: Row[];
  workflows: Row[];
  approvals: Row[];
  auditLogs: Row[];
  integrations: Row[];
  tasks: Row[];
  aiCoachPlans: Row[];
  copilotInsights: Row[];
  biInsights: Row[];
  visionAnalyses: Row[];
  liveSessions: Row[];
  groupTracking: Row[];
  coaches: Row[];
  mlModels: Row[];
  supportTickets: Row[];
}

const ID_PREFIX: Partial<Record<CollectionKey, string>> = {
  members: "MEM",
  leads: "LEAD",
  calls: "CALL",
  trials: "TRL",
  invoices: "INV",
  bookings: "BKG",
  supportTickets: "TKT",
  aiCoachPlans: "AIC",
  copilotInsights: "CPI",
  biInsights: "BIQ",
  visionAnalyses: "CV",
  liveSessions: "LIVE",
  groupTracking: "GCT",
  coaches: "CCH",
  mlModels: "MDL",
};

export const BACKEND_COLLECTIONS = new Set<CollectionKey>([
  "leads",
  "members",
  "plans",
  "classes",
  "bookings",
  "trainers",
  "assessments",
  "programs",
  "nutritionPlans",
  "products",
  "invoices",
  "payments",
  "coupons",
  "integrations",
]);

let data: Collections | null = null;
const listeners = new Set<() => void>();
let version = 0;

function build(): Collections {
  const d = getDataset() as unknown as Record<string, Row[]>;
  const ai = getAiDataset() as unknown as Record<string, Row[]>;
  const next = {} as Record<string, Row[]>;
  
  for (const k of Object.keys({ ...d, ...ai })) {
    next[k] = []; // Clean empty array — ZERO dummy data! Only real DB data is loaded.
  }
  return next as unknown as Collections;
}

export function getCollections(): Collections {
  if (!data) data = build();
  return data;
}

export function collection(key: CollectionKey): Row[] {
  return getCollections()[key];
}

/** Read-only view of every collection — used by cross-module timelines. */
export function snapshot(): Collections {
  return getCollections();
}

export const COLLECTION_KEYS = Object.keys(getCollections()) as CollectionKey[];


function emit() {
  version += 1;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

import {
  createAssessmentApi,
  createBookingApi,
  createClassApi,
  createCouponApi,
  createFoodItemApi,
  createInvoiceApi,
  createLeadApi,
  createMemberApi,
  createNutritionPlanApi,
  createPaymentApi,
  createPlanApi,
  createProgramApi,
  createTrainerApi,
  deleteAssessmentApi,
  deleteBookingApi,
  deleteClassApi,
  deleteCouponApi,
  deleteFoodItemApi,
  deleteInvoiceApi,
  deleteLeadApi,
  deleteMemberApi,
  deleteNutritionPlanApi,
  deletePaymentApi,
  deletePlanApi,
  deleteProgramApi,
  deleteTrainerApi,
  fetchAssessments,
  fetchBookings,
  fetchClasses,
  fetchCoupons,
  fetchFoodDatabase,
  fetchIntegrationStatus,
  fetchInvoices,
  fetchLeads,
  fetchMembers,
  fetchNutritionPlans,
  fetchPayments,
  fetchPlans,
  fetchPrograms,
  fetchTrainers,
  updateAssessmentApi,
  updateBookingApi,
  updateClassApi,
  updateCouponApi,
  updateFoodItemApi,
  updateInvoiceApi,
  updateLeadApi,
  updateMemberApi,
  updateNutritionPlanApi,
  updatePaymentApi,
  updatePlanApi,
  updateProgramApi,
  updateTrainerApi,
} from "../api/endpoints/api-modules";

function nextId(key: CollectionKey) {
  const rows = collection(key);
  const prefix = ID_PREFIX[key] ?? key.slice(0, 3).toUpperCase();
  const width = key === "members" || key === "leads" ? 4 : 3;
  let max = 0;
  for (const r of rows) {
    const n = Number(String(r.id).replace(/\D+/g, ""));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

export function setCollectionRows(key: CollectionKey, rows: Row[]) {
  const c = getCollections();
  c[key] = rows;
  emit();
}

export function createRecord(key: CollectionKey, values: Record<string, unknown>) {
  const rows = collection(key);
  const row: Row = { tenantId: TENANT_ID, ...values, id: values["id"] ? String(values["id"]) : nextId(key) };
  rows.unshift(row);
  emit();

  if (key === "leads") {
    createLeadApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create lead on backend:", err);
        toast.error(`Backend sync failed: ${err?.message || "Lead could not be saved to server"}`);
      });
  } else if (key === "members") {
    createMemberApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create member on backend:", err);
        toast.error(`Backend sync failed: ${err?.message || "Member could not be saved to server"}`);
      });
  } else if (key === "plans") {
    createPlanApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create plan on backend:", err);
      });
  } else if (key === "classes") {
    createClassApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create class on backend:", err);
      });
  } else if (key === "bookings") {
    createBookingApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create booking on backend:", err);
      });
  } else if (key === "trainers") {
    createTrainerApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create trainer on backend:", err);
      });
  } else if (key === "assessments") {
    createAssessmentApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create assessment on backend:", err);
      });
  } else if (key === "programs") {
    createProgramApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create program on backend:", err);
      });
  } else if (key === "nutritionPlans") {
    createNutritionPlanApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create nutrition plan on backend:", err);
      });
  } else if (key === "products") {
    createFoodItemApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create food item on backend:", err);
      });
  } else if (key === "invoices") {
    createInvoiceApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create invoice on backend:", err);
      });
  } else if (key === "payments") {
    createPaymentApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create payment on backend:", err);
      });
  } else if (key === "coupons") {
    createCouponApi(values)
      .then((created) => {
        const idx = rows.findIndex((r) => r.id === row.id);
        if (idx !== -1) {
          rows[idx] = created;
          emit();
        }
      })
      .catch((err) => {
        console.error("Failed to create coupon on backend:", err);
      });
  }

  return row;
}

export function updateRecord(key: CollectionKey, id: string, values: Record<string, unknown>) {
  const rows = collection(key);
  const row = rows.find((r) => r.id === id);
  if (row) Object.assign(row, values);
  emit();

  if (key === "leads") {
    updateLeadApi(id, values).catch((err) => {
      console.error("Failed to update lead on backend:", err);
    });
  } else if (key === "members") {
    updateMemberApi(id, values).catch((err) => {
      console.error("Failed to update member on backend:", err);
    });
  } else if (key === "plans") {
    updatePlanApi(id, values).catch((err) => {
      console.error("Failed to update plan on backend:", err);
    });
  } else if (key === "classes") {
    updateClassApi(id, values).catch((err) => {
      console.error("Failed to update class on backend:", err);
    });
  } else if (key === "bookings") {
    updateBookingApi(id, values).catch((err) => {
      console.error("Failed to update booking on backend:", err);
    });
  } else if (key === "trainers") {
    updateTrainerApi(id, values).catch((err) => {
      console.error("Failed to update trainer on backend:", err);
    });
  } else if (key === "assessments") {
    updateAssessmentApi(id, values).catch((err) => {
      console.error("Failed to update assessment on backend:", err);
    });
  } else if (key === "programs") {
    updateProgramApi(id, values).catch((err) => {
      console.error("Failed to update program on backend:", err);
    });
  } else if (key === "nutritionPlans") {
    updateNutritionPlanApi(id, values).catch((err) => {
      console.error("Failed to update nutrition plan on backend:", err);
    });
  } else if (key === "products") {
    updateFoodItemApi(id, values).catch((err) => {
      console.error("Failed to update food item on backend:", err);
    });
  } else if (key === "invoices") {
    updateInvoiceApi(id, values).catch((err) => {
      console.error("Failed to update invoice on backend:", err);
    });
  } else if (key === "payments") {
    updatePaymentApi(id, values).catch((err) => {
      console.error("Failed to update payment on backend:", err);
    });
  } else if (key === "coupons") {
    updateCouponApi(id, values).catch((err) => {
      console.error("Failed to update coupon on backend:", err);
    });
  }

  return row;
}

export function deleteRecords(key: CollectionKey, ids: string[]) {
  const rows = collection(key);
  const set = new Set(ids);
  for (let i = rows.length - 1; i >= 0; i--) if (set.has(rows[i]!.id)) rows.splice(i, 1);
  emit();

  if (key === "leads") {
    for (const id of ids) {
      deleteLeadApi(id).catch((err) => {
        console.error("Failed to delete lead on backend:", err);
      });
    }
  } else if (key === "members") {
    for (const id of ids) {
      deleteMemberApi(id).catch((err) => {
        console.error("Failed to delete member on backend:", err);
      });
    }
  } else if (key === "plans") {
    for (const id of ids) {
      deletePlanApi(id).catch((err) => {
        console.error("Failed to delete plan on backend:", err);
      });
    }
  } else if (key === "classes") {
    for (const id of ids) {
      deleteClassApi(id).catch((err) => {
        console.error("Failed to delete class on backend:", err);
      });
    }
  } else if (key === "bookings") {
    for (const id of ids) {
      deleteBookingApi(id).catch((err) => {
        console.error("Failed to delete booking on backend:", err);
      });
    }
  } else if (key === "trainers") {
    for (const id of ids) {
      deleteTrainerApi(id).catch((err) => {
        console.error("Failed to delete trainer on backend:", err);
      });
    }
  } else if (key === "assessments") {
    for (const id of ids) {
      deleteAssessmentApi(id).catch((err) => {
        console.error("Failed to delete assessment on backend:", err);
      });
    }
  } else if (key === "programs") {
    for (const id of ids) {
      deleteProgramApi(id).catch((err) => {
        console.error("Failed to delete program on backend:", err);
      });
    }
  } else if (key === "nutritionPlans") {
    for (const id of ids) {
      deleteNutritionPlanApi(id).catch((err) => {
        console.error("Failed to delete nutrition plan on backend:", err);
      });
    }
  } else if (key === "products") {
    for (const id of ids) {
      deleteFoodItemApi(id).catch((err) => {
        console.error("Failed to delete food item on backend:", err);
      });
    }
  } else if (key === "invoices") {
    for (const id of ids) {
      deleteInvoiceApi(id).catch((err) => {
        console.error("Failed to delete invoice on backend:", err);
      });
    }
  } else if (key === "payments") {
    for (const id of ids) {
      deletePaymentApi(id).catch((err) => {
        console.error("Failed to delete payment on backend:", err);
      });
    }
  } else if (key === "coupons") {
    for (const id of ids) {
      deleteCouponApi(id).catch((err) => {
        console.error("Failed to delete coupon on backend:", err);
      });
    }
  }
}

/** Reactive read of one collection, scoped by tenant + location. */
export function useCollection(key: CollectionKey, locationId?: string): Row[] {
  const v = React.useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );

  React.useEffect(() => {
    if (key === "leads") {
      fetchLeads(locationId)
        .then((rows) => {
          setCollectionRows("leads", rows);
        })
        .catch(() => {});
    } else if (key === "members") {
      fetchMembers(locationId)
        .then((rows) => {
          setCollectionRows("members", rows);
        })
        .catch(() => {});
    } else if (key === "plans") {
      fetchPlans()
        .then((rows) => {
          setCollectionRows("plans", rows);
        })
        .catch(() => {});
    } else if (key === "classes") {
      fetchClasses(locationId)
        .then((rows) => {
          setCollectionRows("classes", rows);
        })
        .catch(() => {});
    } else if (key === "bookings") {
      fetchBookings(locationId)
        .then((rows) => {
          setCollectionRows("bookings", rows);
        })
        .catch(() => {});
    } else if (key === "trainers") {
      fetchTrainers()
        .then((rows) => {
          setCollectionRows("trainers", rows);
        })
        .catch(() => {});
    } else if (key === "assessments") {
      fetchAssessments()
        .then((rows) => {
          setCollectionRows("assessments", rows);
        })
        .catch(() => {});
    } else if (key === "programs") {
      fetchPrograms()
        .then((rows) => {
          setCollectionRows("programs", rows);
        })
        .catch(() => {});
    } else if (key === "nutritionPlans") {
      fetchNutritionPlans()
        .then((rows) => {
          setCollectionRows("nutritionPlans", rows);
        })
        .catch(() => {});
    } else if (key === "products") {
      fetchFoodDatabase()
        .then((rows) => {
          setCollectionRows("products", rows);
        })
        .catch(() => {});
    } else if (key === "invoices") {
      fetchInvoices(locationId)
        .then((rows) => {
          setCollectionRows("invoices", rows);
        })
        .catch(() => {});
    } else if (key === "payments") {
      fetchPayments()
        .then((rows) => {
          setCollectionRows("payments", rows);
        })
        .catch(() => {});
    } else if (key === "coupons") {
      fetchCoupons()
        .then((rows) => {
          setCollectionRows("coupons", rows);
        })
        .catch(() => {});
    } else if (key === "integrations") {
      fetchIntegrationStatus()
        .then((rows) => {
          setCollectionRows("integrations", rows);
        })
        .catch(() => {});
    }
  }, [key, locationId]);

  return React.useMemo(() => {
    void v;
    if (BACKEND_COLLECTIONS.has(key)) {
      return collection(key);
    }
    return collection(key).filter(
      (r) =>
        (r["tenantId"] === undefined || r["tenantId"] === TENANT_ID || key === "tenants") &&
        (!locationId || locationId === "all" || r["locationId"] === undefined || r["locationId"] === locationId),
    );
  }, [key, locationId, v]);
}

/** Reactive store version — use to re-render derived/aggregate views. */
export function useStoreVersion() {
  return React.useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}
