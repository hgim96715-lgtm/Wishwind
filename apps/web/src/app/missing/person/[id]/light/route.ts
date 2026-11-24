import { forwardAsVoter, forwardRead } from "@/lib/cases/voter-proxy";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){const {id}=await params;return forwardRead(`/missing/${encodeURIComponent(id)}/light`);}
export async function POST(request:Request,{params}:Context){
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin)return Response.json({message:"허용되지 않은 요청"},{status:403});
  const {id}=await params;return forwardAsVoter(`/missing/${encodeURIComponent(id)}/light`,"POST","{}");
}
