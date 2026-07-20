import { useContext } from "react";
import { WorkbookContext, type WorkbookState } from "./workbook-context";

export function useWorkbook(): WorkbookState {
  return useContext(WorkbookContext);
}
