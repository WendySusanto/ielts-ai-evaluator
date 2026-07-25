import { ApiError } from "@/lib/api";

// Maps an API/network error to a short, plain-language message safe to show
// users directly — many are ESL, so no HTTP codes or raw exception text.
export function friendlyError(error: ApiError): string {
  switch (error.status) {
    case 0:
      return "We couldn't reach the server. Please check your internet connection and try again.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You don't have access to this. If that seems wrong, contact support.";
    case 404:
      return "We couldn't find what you were looking for.";
    case 429:
      return "You're going a bit fast. Please wait a moment and try again.";
    default:
      return error.status >= 500
        ? "Something went wrong on our end. Please try again in a moment."
        : "Something went wrong while loading this page. Please try again.";
  }
}
