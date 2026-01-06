
import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Content-Type': 'application/json'
};

export const runtime = 'edge';







export async function DELETE(request) {
  let { name } = await request.json()
  const { env, cf, ctx } = getRequestContext();

  // 验证参数
  if (!name || typeof name !== 'string') {
    return Response.json({
      "code": 400,
      "success": false,
      "message": "无效的参数",
    }, {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // 使用参数化查询防止 SQL 注入
    const setData = await env.IMG.prepare(
      `DELETE FROM imginfo WHERE url = ?`
    ).bind(name).run();

    return Response.json({
      "code": 200,
      "success": true,
      "message": "删除成功",
      "affected": setData.meta.changes || 0,
    });

  } catch (error) {
    console.error('删除失败:', error);
    return Response.json({
      "code": 500,
      "success": false,
      "message": error.message,
    }, {
      status: 500,
      headers: corsHeaders,
    })
  }
}
