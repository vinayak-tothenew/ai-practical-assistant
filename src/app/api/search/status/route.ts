import {
  getCollectionName,
  getCollectionRecordCount,
} from "@/lib/vector-store/collection";
import { NextResponse } from "next/server";

export async function GET() {
  const collection = getCollectionName();
  const recordCount = await getCollectionRecordCount();

  return NextResponse.json({
    collection,
    recordCount,
  });
}
