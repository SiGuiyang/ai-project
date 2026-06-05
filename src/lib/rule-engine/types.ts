export interface ExecutorResult {
  orders: Array<{
    externalCode?: string;
    storeName?: string;
    receiverName?: string;
    receiverPhone?: string;
    receiverAddress?: string;
    remark?: string;
    items: Array<{
      skuCode: string;
      skuName: string;
      quantity: number;
      spec?: string;
    }>;
  }>;
  errors?: string[];
}
