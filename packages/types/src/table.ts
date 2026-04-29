import type { ID, Timestamps, Money } from "./common";

export type TableShape = "round" | "square" | "rectangle" | "booth" | "bar";
export type TableStatus = "available" | "reserved" | "occupied" | "maintenance";
export type TableSection = "indoor" | "outdoor" | "rooftop" | "private" | "bar";

export interface Table extends Timestamps {
  id: ID;
  restaurantId: ID;
  tableNumber: string;
  section: TableSection;
  shape: TableShape;
  minCapacity: number;
  maxCapacity: number;
  isActive: boolean;
  isBookable: boolean;
  currentStatus: TableStatus;
  floorPlanX?: number;
  floorPlanY?: number;
  notes?: string;
}

export interface CreateTableDto
  extends Omit<Table, "id" | "currentStatus" | "createdAt" | "updatedAt"> {}

export type UpdateTableDto = Partial<CreateTableDto>;
