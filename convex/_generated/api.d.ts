/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as blacklist from "../blacklist.js";
import type * as claim from "../claim.js";
import type * as codes from "../codes.js";
import type * as eligibleEmails from "../eligibleEmails.js";
import type * as events from "../events.js";
import type * as flaggedEmails from "../flaggedEmails.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  blacklist: typeof blacklist;
  claim: typeof claim;
  codes: typeof codes;
  eligibleEmails: typeof eligibleEmails;
  events: typeof events;
  flaggedEmails: typeof flaggedEmails;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
