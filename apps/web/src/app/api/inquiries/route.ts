import { forwardAsVoter, forwardRead } from "@/lib/cases/voter-proxy";

export async function GET() {
  return forwardRead("/inquiries/mine");
}

export async function POST(request: Request) {
  return forwardAsVoter("/inquiries", "POST", await request.text());
}
