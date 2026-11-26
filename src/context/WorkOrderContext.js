import { createContext, useContext } from "react";
export const WorkOrderContext = createContext(null);
export function useWorkOrder() {
    return useContext(WorkOrderContext);
}
