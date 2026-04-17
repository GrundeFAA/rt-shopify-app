import type { LoaderFunctionArgs } from "react-router";
import { verifyAppProxyRequest } from "../modules/auth/proxy.server";
import { toApiErrorResponse } from "../modules/auth/api-error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    verifyAppProxyRequest(request);

    return Response.json(
      {},
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
