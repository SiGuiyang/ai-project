"use client";

import { useState, useCallback, useEffect } from "react";

interface WaybillRecord {
  id: string;
  batchId: string;
  externalCode: string | null;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  weight: number;
  pieces: number;
  temperatureLevel: string;
  createdAt: string;
}

interface PageData {
  data: WaybillRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function HistoryPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [externalCode, setExternalCode] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (externalCode) params.set("externalCode", externalCode);
      if (receiverName) params.set("receiverName", receiverName);

      const res = await fetch(`/api/waybills?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [page, externalCode, receiverName, pageSize]);

  useEffect(() => {
    fetchData(); // eslint-disable-line
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-lg font-medium mb-4">已导入运单记录</h2>

        <div className="flex gap-3 mb-4">
          <input
            className="border rounded px-3 py-2 text-sm flex-1 max-w-xs"
            placeholder="搜索客户单号"
            value={externalCode}
            onChange={(e) => {
              setExternalCode(e.target.value);
              setPage(1);
            }}
          />
          <input
            className="border rounded px-3 py-2 text-sm flex-1 max-w-xs"
            placeholder="搜索收件人姓名"
            value={receiverName}
            onChange={(e) => {
              setReceiverName(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : !data || data.data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无记录</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-3 py-2">客户单号</th>
                    <th className="border px-3 py-2">发件人</th>
                    <th className="border px-3 py-2">发件人电话</th>
                    <th className="border px-3 py-2">收件人</th>
                    <th className="border px-3 py-2">收件人电话</th>
                    <th className="border px-3 py-2">重量</th>
                    <th className="border px-3 py-2">件数</th>
                    <th className="border px-3 py-2">温层</th>
                    <th className="border px-3 py-2">提交时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="border px-3 py-1">
                        {row.externalCode || "-"}
                      </td>
                      <td className="border px-3 py-1">{row.senderName}</td>
                      <td className="border px-3 py-1">{row.senderPhone}</td>
                      <td className="border px-3 py-1">{row.receiverName}</td>
                      <td className="border px-3 py-1">{row.receiverPhone}</td>
                      <td className="border px-3 py-1">{row.weight}</td>
                      <td className="border px-3 py-1">{row.pieces}</td>
                      <td className="border px-3 py-1">
                        {row.temperatureLevel}
                      </td>
                      <td className="border px-3 py-1 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-gray-500">
                共 {data.total} 条记录，第 {data.page}/{data.totalPages} 页
              </span>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </button>
                <button
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
